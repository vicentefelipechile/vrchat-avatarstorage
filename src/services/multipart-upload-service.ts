// =========================================================================================================
// MULTIPART UPLOAD SERVICE
// Ownership, bounded parts, recoverable finalization and explicit cancellation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { batch, type DB } from '../db/client';
import type { UploadSessionRow } from '../db/schema';
import { ConflictError, ForbiddenError, GoneError, ValidationError } from '../domain/errors';
import { validateFileSize } from '../helpers/file-validation';
import { MediaRepository } from '../repositories/media-repository';
import { UploadSessionRepository } from '../repositories/upload-session-repository';
import { UploadService } from './upload-service';

// =========================================================================================================
// Constants
// =========================================================================================================

export const UPLOAD_CHUNK_SIZE = 30 * 1024 * 1024;
const UPLOAD_IDLE_TTL = 24 * 3600_000;
const UPLOAD_MAX_AGE = 6 * 86400_000;
const SIGNATURE_BYTES = 12;
const STREAM_READ_SIZE = 1024 * 1024;

// =========================================================================================================
// Helpers
// =========================================================================================================

function result(session: UploadSessionRow) {
	return { media_uuid: session.r2_key, r2_key: session.r2_key, media_type: session.media_type, file_name: session.filename };
}

async function readSignature(body: ReadableStream<Uint8Array>, size: number): Promise<Uint8Array> {
	const reader = body.getReader({ mode: 'byob' });
	try {
		const length = Math.min(SIGNATURE_BYTES, size);
		const { value } = await reader.readAtLeast(length, new Uint8Array(length));
		return value ?? new Uint8Array();
	} finally {
		reader.releaseLock();
	}
}

async function storePart(multipart: R2MultipartUpload, partNumber: number, body: ReadableStream<Uint8Array>, size: number, prefix?: Uint8Array): Promise<R2UploadedPart> {
	const fixed = new FixedLengthStream(size);
	const reader = body.getReader({ mode: 'byob' });
	const writer = fixed.writable.getWriter();
	let storageFailure: unknown;
	const forward = async () => {
		let loaded = prefix?.byteLength ?? 0;
		try {
			if (prefix?.byteLength) await writer.write(prefix);
			while (true) {
				if (storageFailure) throw storageFailure;
				// Native batching avoids a JS callback for every small network chunk; one extra byte detects overflow.
				const length = Math.min(STREAM_READ_SIZE, size - loaded + 1);
				const chunk = await reader.readAtLeast(length, new Uint8Array(length));
				if (storageFailure) throw storageFailure;
				if (chunk.done) break;
				loaded += chunk.value.byteLength;
				if (loaded > size) throw new ValidationError('Part exceeds expected size');
				await writer.write(chunk.value);
			}
			if (loaded !== size) throw new ValidationError('Part size mismatch');
			await writer.close();
		} catch (error) {
			await Promise.allSettled([writer.abort(), reader.cancel()]);
			throw error;
		}
	};
	const storing = multipart.uploadPart(partNumber, fixed.readable).catch(async (error) => {
		storageFailure = error;
		// The forwarder cancels its reader only after pending native reads settle.
		await Promise.allSettled([writer.abort(), ...(fixed.readable.locked ? [] : [fixed.readable.cancel()])]);
		throw error;
	});
	const operations = await Promise.allSettled([forward(), storing, reader.closed, writer.closed]);
	for (const operation of operations) if (operation.status === 'rejected' && operation.reason instanceof ValidationError) throw operation.reason;
	if (storageFailure) throw storageFailure;
	for (const operation of operations) if (operation.status === 'rejected') throw operation.reason;
	const stored = operations[1];
	if (stored.status !== 'fulfilled') throw new Error('Part was not stored');
	return stored.value;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class MultipartUploadService {
	private readonly sessions: UploadSessionRepository;
	private readonly media: MediaRepository;

	constructor(private readonly db: DB) {
		this.sessions = new UploadSessionRepository(db);
		this.media = new MediaRepository(db);
	}

	async session(userUuid: string, uploadId: string, key: string) {
		const session = await this.sessions.find(uploadId);
		if (!session) throw new GoneError('Upload session expired or invalid');
		if (session.user_uuid !== userUuid) throw new ForbiddenError('Upload session does not belong to you');
		if (session.r2_key !== key) throw new ValidationError('Upload key mismatch');
		if (session.state === 'aborted' || Date.now() - session.updated_at > UPLOAD_IDLE_TTL || Date.now() - session.created_at > UPLOAD_MAX_AGE) throw new GoneError('Upload session expired or invalid');
		return session;
	}

	async init(userUuid: string, filename: string, mediaType: 'image' | 'video' | 'file', size: number, bucket: R2Bucket, isAdmin = false) {
		const check = validateFileSize(size, mediaType);
		if ((!isAdmin || mediaType !== 'file') && !check.isValid) throw new ValidationError(check.error);
		if (!Number.isSafeInteger(size) || size <= 0 || size > 10000 * UPLOAD_CHUNK_SIZE) throw new ValidationError('Invalid multipart file size');
		const key = crypto.randomUUID();
		const multipart = await bucket.createMultipartUpload(key, { httpMetadata: { contentType: new UploadService().initMimeType(mediaType) } });
		try {
			await this.sessions.insert(multipart.uploadId, key, userUuid, filename, mediaType, size);
		} catch (error) {
			await multipart.abort();
			throw error;
		}
		return { uploadId: multipart.uploadId, key };
	}

	async status(userUuid: string, uploadId: string, key: string) {
		const session = await this.session(userUuid, uploadId, key);
		if (session.state === 'complete') {
			if (!(await this.media.findByKey(key))) throw new GoneError('Uploaded file no longer exists');
			return { state: session.state, parts: [], result: result(session) };
		}
		await this.sessions.touch(uploadId);
		const parts = await this.sessions.parts(uploadId);
		return { state: session.state, parts: parts.map((part) => ({ partNumber: part.part_number, etag: part.etag })) };
	}

	async part(userUuid: string, uploadId: string, key: string, partNumber: number, body: ReadableStream<Uint8Array>, bucket: R2Bucket) {
		const session = await this.session(userUuid, uploadId, key);
		if (session.state !== 'uploading') throw new ConflictError('Upload is no longer accepting parts');
		const size = Math.min(UPLOAD_CHUNK_SIZE, session.file_size - (partNumber - 1) * UPLOAD_CHUNK_SIZE);
		if (size <= 0) throw new ValidationError('Invalid part number');
		if (partNumber !== 1 && !(await this.sessions.hasFirstPart(uploadId))) throw new ValidationError('Upload the first part before other parts');
		await this.sessions.touch(uploadId);
		const multipart = bucket.resumeMultipartUpload(key, uploadId);
		try {
			let prefix: Uint8Array | undefined;
			if (partNumber === 1) {
				prefix = await readSignature(body, size);
				if (!new UploadService().firstPartSignatureMatches(prefix.slice().buffer, session.media_type).ok) {
					await body.cancel();
					throw new ValidationError('Invalid file signature');
				}
			}
			const uploaded = await storePart(multipart, partNumber, body, size, prefix);
			await this.sessions.acknowledge(uploadId, uploaded, size);
			if ((await this.sessions.find(uploadId))?.state !== 'uploading') throw new ConflictError('Upload is no longer accepting parts');
			return uploaded;
		} catch (error) {
			if (error instanceof ValidationError) await this.abort(userUuid, uploadId, key, bucket);
			throw error;
		}
	}

	async complete(userUuid: string, uploadId: string, key: string, submitted: R2UploadedPart[], bucket: R2Bucket) {
		const session = await this.session(userUuid, uploadId, key);
		if (session.state === 'complete') {
			if (!(await this.media.findByKey(key))) throw new GoneError('Uploaded file no longer exists');
			return result(session);
		}
		const parts = await this.sessions.parts(uploadId);
		const count = Math.ceil(session.file_size / UPLOAD_CHUNK_SIZE);
		const ordered = [...submitted].sort((a, b) => a.partNumber - b.partNumber);
		if (
			parts.length !== count ||
			ordered.length !== count ||
			parts.reduce((sum, part) => sum + part.byte_size, 0) !== session.file_size ||
			parts.some((part, i) => part.part_number !== i + 1 || ordered[i]?.partNumber !== part.part_number || ordered[i]?.etag !== part.etag)
		) {
			throw new ValidationError('Missing or mismatched upload parts');
		}
		if (session.state === 'uploading' && !(await this.sessions.transition(uploadId, 'uploading', 'completing'))) throw new ConflictError('Upload state changed; retry confirmation');
		let object = await bucket.head(key);
		if (!object) {
			try {
				object = await bucket.resumeMultipartUpload(key, uploadId).complete(ordered);
			} catch (error) {
				// Another confirmation may have completed R2, or its response may have been lost.
				object = await bucket.head(key);
				if (!object) throw error;
			}
		}
		// The exact total was authorized at init, including the admin-only archive size bypass.
		if (object.size !== session.file_size) throw new ValidationError('Completed file size mismatch');
		if (session.media_type === 'image') {
			const image = await bucket.get(key);
			if (!image) throw new Error('Completed image is unavailable');
			await new UploadService().validateFile(new File([await image.arrayBuffer()], session.filename));
		}
		// shortcut: abandoned confirmations need a client retry before session expiry; add cron reconciliation for unattended recovery.
		await batch(this.db, [this.media.buildInsertOnce(key, session.media_type, session.filename), this.sessions.buildComplete(uploadId)]);
		return result(session);
	}

	async abort(userUuid: string, uploadId: string, key: string, bucket: R2Bucket) {
		const session = await this.session(userUuid, uploadId, key);
		if (session.state !== 'uploading') throw new ConflictError('Cannot cancel a confirming or completed upload');
		if (!(await this.sessions.transition(uploadId, 'uploading', 'aborted'))) throw new ConflictError('Upload state changed');
		await bucket.resumeMultipartUpload(key, uploadId).abort();
		return { success: true };
	}
}

// =========================================================================================================
// Export
// =========================================================================================================
