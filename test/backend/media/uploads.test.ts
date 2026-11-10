// =========================================================================================================
// UPLOAD SERVICE AND ROUTE TESTS
// =========================================================================================================
// Validate signatures and ensure a private upload pairs its D1 row with its R2 object.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it, vi } from 'vitest';

import { UploadService } from '../../../src/services/upload-service';
import { MultipartUploadService, UPLOAD_CHUNK_SIZE } from '../../../src/services/multipart-upload-service';
import { MediaRepository } from '../../../src/repositories/media-repository';
import { UploadSessionRepository } from '../../../src/repositories/upload-session-repository';
import { SIZE_LIMITS } from '../../../src/helpers/file-validation';
import { MAX_IMAGE_DIMENSION } from '../../../src/helpers/image-validator';
import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('multipart upload validation', () => {
	it.each(['image', 'video', 'file'])('accepts the %s media type', (type) => {
		expect(new UploadService().isAllowedMultipartType(type)).toBe(true);
	});

	it('rejects unknown media types and mismatched magic bytes', () => {
		const service = new UploadService();
		expect(service.isAllowedMultipartType('text/html')).toBe(false);
		const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
		expect(service.firstPartSignatureMatches(zip, 'file')).toMatchObject({ ok: true, detectedType: 'file' });
		expect(service.firstPartSignatureMatches(zip, 'image')).toMatchObject({ ok: false, detectedType: 'file' });
	});
});

describe('admin upload size bypass', () => {
	it('allows oversized archives only for admins', async () => {
		const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'large.zip');
		// Simulate the size without allocating a multi-gigabyte buffer.
		Object.defineProperty(file, 'size', { value: SIZE_LIMITS.file + 1 });
		const service = new UploadService();
		await expect(service.validateFile(file)).rejects.toThrow('File too large');
		await expect(service.validateFile(file, false)).rejects.toThrow('File too large');
		await expect(service.validateFile(file, true)).resolves.toEqual({ mediaType: 'file', mimeType: 'application/octet-stream' });
	});

	it.each([
		['image', [0x89, 0x50, 0x4e, 0x47]],
		['video', [0x1a, 0x45, 0xdf]],
	] as const)('keeps the %s size limit for admins even with an archive name and MIME type', async (mediaType, bytes) => {
		const file = new File([new Uint8Array(bytes)], 'disguised.zip', { type: 'application/zip' });
		Object.defineProperty(file, 'size', { value: SIZE_LIMITS[mediaType] + 1 });
		await expect(new UploadService().validateFile(file, true)).rejects.toThrow(`File too large for ${mediaType}`);
	});

	it('keeps signature and image dimension validation for admins', async () => {
		const service = new UploadService();
		await expect(service.validateFile(new File(['<html>'], 'fake.zip'), true)).rejects.toThrow('Invalid file type');
		const png = new Uint8Array(24);
		png.set([0x89, 0x50, 0x4e, 0x47]);
		const header = new DataView(png.buffer);
		header.setUint32(16, MAX_IMAGE_DIMENSION + 1);
		header.setUint32(20, 20);
		await expect(service.validateFile(new File([png], 'large.png'), true)).rejects.toThrow();
	});
});

describe('single-shot uploads', () => {
	it('rejects unsupported files without creating a media row', async () => {
		const { cookie } = await createUser();
		const form = new FormData();
		form.append('file', new File(['<html>'], 'payload.zip', { type: 'application/zip' }));
		const response = await exports.default.fetch('http://localhost:8787/api/upload', {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat' }, body: form,
		});
		expect(response.status).toBe(400);
		const media = await env.DB.prepare('SELECT COUNT(*) AS total FROM media').first<{ total: number }>();
		expect(media?.total).toBe(0);
	});

	it('stores ZIP uploads with matching R2 key, media UUID and attachment policy', async () => {
		const { cookie } = await createUser();
		const form = new FormData();
		form.append('file', new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01])], 'sample.zip', { type: 'text/html' }));
		const response = await exports.default.fetch('http://localhost:8787/api/upload', {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat' }, body: form,
		});
		expect(response.status).toBe(200);
		const result = (await response.json()) as { media_uuid: string; r2_key: string; media_type: string };
		expect(result.media_uuid).toBe(result.r2_key);
		expect(result.media_type).toBe('file');
		const record = await env.DB.prepare('SELECT r2_key, media_type FROM media WHERE uuid = ?').bind(result.media_uuid).first<{ r2_key: string; media_type: string }>();
		expect(record).toMatchObject({ r2_key: result.r2_key, media_type: 'file' });
		expect((await env.BUCKET.head(result.r2_key))?.httpMetadata?.contentType).toBe('application/octet-stream');
	});
});

describe('multipart uploads', () => {
	it('binds every operation to its owner and trusts durable metadata, not the completion payload', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const jsonHeaders = { Cookie: owner.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' };
		const init = await exports.default.fetch('http://localhost:8787/api/upload/init', {
			method: 'POST', headers: jsonHeaders, body: JSON.stringify({ filename: 'archive.zip', media_type: 'file', size: 5 }),
		});
		expect(init.status).toBe(200);
		const { uploadId, key } = (await init.json()) as { uploadId: string; key: string };
		const partHeaders = { Origin: 'https://vrcstorage.lat', 'X-Upload-ID': uploadId, 'X-Key': key, 'X-Part-Number': '1' };
		const body = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
		const denied = await exports.default.fetch('http://localhost:8787/api/upload/part', {
			method: 'PUT', headers: { ...partHeaders, Cookie: other.cookie }, body,
		});
		expect(denied.status).toBe(403);
		const uploaded = await exports.default.fetch('http://localhost:8787/api/upload/part', {
			method: 'PUT', headers: { ...partHeaders, Cookie: owner.cookie }, body,
		});
		expect(uploaded.status).toBe(200);
		const part = (await uploaded.json()) as { partNumber: number; etag: string };
		const complete = await exports.default.fetch('http://localhost:8787/api/upload/complete', {
			method: 'POST', headers: jsonHeaders,
			body: JSON.stringify({ key, uploadId, parts: [part], filename: 'archive.zip', media_type: 'video' }),
		});
		expect(complete.status).toBe(200);
		expect(await complete.json()).toMatchObject({ media_uuid: key, r2_key: key, media_type: 'file' });
		expect(await env.DB.prepare('SELECT state FROM upload_sessions WHERE upload_id = ?').bind(uploadId).first()).toMatchObject({ state: 'complete' });
		expect((await env.BUCKET.head(key))?.size).toBe(body.length);
	});

	it('rejects an invalid first-part signature without persisting a media row', async () => {
		const { cookie } = await createUser();
		const init = await exports.default.fetch('http://localhost:8787/api/upload/init', {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename: 'archive.zip', media_type: 'file', size: 9 }),
		});
		const { uploadId, key } = (await init.json()) as { uploadId: string; key: string };
		const rejected = await exports.default.fetch('http://localhost:8787/api/upload/part', {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'X-Upload-ID': uploadId, 'X-Key': key, 'X-Part-Number': '1' }, body: 'fake file',
		});
		expect(rejected.status).toBe(400);
		expect(await env.DB.prepare('SELECT uuid FROM media WHERE uuid = ?').bind(key).first()).toBeNull();
	});
});

describe('durable multipart recovery', () => {
	it('checks only the signature prefix and batches a 30 MiB transfer into bounded native reads', async () => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		const session = await service.init(user.uuid, 'archive.zip', 'file', UPLOAD_CHUNK_SIZE + 1, env.BUCKET);
		const bytes = new Uint8Array(UPLOAD_CHUNK_SIZE);
		bytes.set([0x50, 0x4b, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
		const signature = vi.spyOn(UploadService.prototype, 'firstPartSignatureMatches');
		const reads = vi.spyOn(ReadableStreamBYOBReader.prototype, 'readAtLeast');
		const partList = vi.spyOn(UploadSessionRepository.prototype, 'parts');
		try {
			const first = await service.part(user.uuid, session.uploadId, session.key, 1, new Blob([bytes]).stream(), env.BUCKET);
			expect(signature.mock.calls[0]![0].byteLength).toBe(12);
			expect(reads.mock.calls.length).toBeLessThanOrEqual(32);
			expect(reads.mock.calls.every(([minimum, buffer]) => minimum <= 1024 * 1024 && buffer.byteLength <= 1024 * 1024)).toBe(true);
			const last = await service.part(user.uuid, session.uploadId, session.key, 2, new Blob(['z']).stream(), env.BUCKET);
			expect(partList).not.toHaveBeenCalled();
			await service.complete(user.uuid, session.uploadId, session.key, [first, last], env.BUCKET);
			const head = await env.BUCKET.get(session.key, { range: { offset: 0, length: 16 } });
			expect(new Uint8Array(await head!.arrayBuffer())).toEqual(bytes.slice(0, 16));
			const tail = await env.BUCKET.get(session.key, { range: { offset: UPLOAD_CHUNK_SIZE, length: 1 } });
			expect(await tail!.text()).toBe('z');
		} finally {
			signature.mockRestore();
			reads.mockRestore();
			partList.mockRestore();
		}
	});

	it('validates a signature fragmented across network reads without losing the consumed prefix', async () => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		const bytes = new Uint8Array([0x50, 0x4b, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
		const session = await service.init(user.uuid, 'archive.zip', 'file', bytes.length, env.BUCKET);
		const stream = new IdentityTransformStream();
		const send = async () => {
			const writer = stream.writable.getWriter();
			for (const byte of bytes) await writer.write(Uint8Array.of(byte));
			await writer.close();
		};
		const [part] = await Promise.all([service.part(user.uuid, session.uploadId, session.key, 1, stream.readable, env.BUCKET), send()]);
		await service.complete(user.uuid, session.uploadId, session.key, [part], env.BUCKET);
		expect(new Uint8Array(await (await env.BUCKET.get(session.key))!.arrayBuffer())).toEqual(bytes);
	});
	it('requires a live session on later parts and renews activity past the old one-hour deadline', async () => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		const session = await service.init(user.uuid, 'archive.zip', 'file', UPLOAD_CHUNK_SIZE + 1, env.BUCKET);
		await env.DB.prepare('UPDATE upload_sessions SET updated_at = ? WHERE upload_id = ?').bind(Date.now() - 70 * 60_000, session.uploadId).run();
		expect(await service.status(user.uuid, session.uploadId, session.key)).toMatchObject({ state: 'uploading' });
		const renewed = await env.DB.prepare('SELECT updated_at FROM upload_sessions WHERE upload_id = ?').bind(session.uploadId).first<{ updated_at: number }>();
		expect(renewed!.updated_at).toBeGreaterThan(Date.now() - 10_000);
		await env.DB.prepare('UPDATE upload_sessions SET updated_at = ? WHERE upload_id = ?').bind(Date.now() - 25 * 3600_000, session.uploadId).run();
		await expect(service.part(user.uuid, session.uploadId, session.key, 2, new Blob(['a']).stream(), env.BUCKET)).rejects.toMatchObject({ status: 410 });
		await expect(service.part(user.uuid, 'missing', session.key, 2, new Blob(['a']).stream(), env.BUCKET)).rejects.toMatchObject({ status: 410 });
	});

	it('rejects other owners, wrong keys and later parts before the signature is validated', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const service = new MultipartUploadService(env.DB);
		const session = await service.init(owner.uuid, 'archive.zip', 'file', UPLOAD_CHUNK_SIZE + 1, env.BUCKET);
		await expect(service.part(other.uuid, session.uploadId, session.key, 2, new Blob(['a']).stream(), env.BUCKET)).rejects.toMatchObject({ status: 403 });
		await expect(service.part(owner.uuid, session.uploadId, crypto.randomUUID(), 2, new Blob(['a']).stream(), env.BUCKET)).rejects.toMatchObject({ status: 400 });
		await expect(service.part(owner.uuid, session.uploadId, session.key, 2, new Blob(['a']).stream(), env.BUCKET)).rejects.toMatchObject({ status: 400 });
		await expect(service.abort(other.uuid, session.uploadId, session.key, env.BUCKET)).rejects.toMatchObject({ status: 403 });
	});

	it('retains a session and previously accepted parts when R2 temporarily fails', async () => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		const session = await service.init(user.uuid, 'archive.zip', 'file', UPLOAD_CHUNK_SIZE + 1, env.BUCKET);
		const bytes = new Uint8Array(UPLOAD_CHUNK_SIZE);
		bytes.set([0x50, 0x4b, 0x03, 0x04]);
		await service.part(user.uuid, session.uploadId, session.key, 1, new Blob([bytes]).stream(), env.BUCKET);
		const multipart = env.BUCKET.resumeMultipartUpload(session.key, session.uploadId);
		const uploadPart = vi.fn().mockRejectedValueOnce(new Error('temporary R2 failure'));
		const bucket = new Proxy(env.BUCKET, {
			get(target, property) {
				if (property === 'resumeMultipartUpload') return () => ({ key: session.key, uploadId: session.uploadId, uploadPart, complete: multipart.complete.bind(multipart), abort: multipart.abort.bind(multipart) });
				const value = Reflect.get(target, property);
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});
		// Replacing a part must not discard its previous acknowledgement on a temporary failure.
		await expect(service.part(user.uuid, session.uploadId, session.key, 1, new Blob([bytes]).stream(), bucket)).rejects.toThrow('temporary R2 failure');
		uploadPart.mockRejectedValueOnce(new Error('streaming R2 failure'));
		await expect(service.part(user.uuid, session.uploadId, session.key, 2, new Blob(['a']).stream(), bucket)).rejects.toThrow('streaming R2 failure');
		expect(await service.status(user.uuid, session.uploadId, session.key)).toMatchObject({ state: 'uploading', parts: [{ partNumber: 1 }] });
		const last = await service.part(user.uuid, session.uploadId, session.key, 2, new Blob(['a']).stream(), env.BUCKET);
		expect(last.partNumber).toBe(2);
		const first = (await service.status(user.uuid, session.uploadId, session.key)).parts[0]!;
		expect(await service.complete(user.uuid, session.uploadId, session.key, [last, first], env.BUCKET)).toMatchObject({ media_uuid: session.key });
	});

	it('recovers after R2 completion followed by a failed D1 write and returns one stable result', async () => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		const session = await service.init(user.uuid, 'archive.zip', 'file', 5, env.BUCKET);
		const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0]);
		const part = await service.part(user.uuid, session.uploadId, session.key, 1, new Blob([bytes]).stream(), env.BUCKET);
		const insert = vi.spyOn(MediaRepository.prototype, 'buildInsertOnce').mockImplementationOnce(() => { throw new Error('D1 temporarily unavailable'); });
		await expect(service.complete(user.uuid, session.uploadId, session.key, [part], env.BUCKET)).rejects.toThrow('D1 temporarily unavailable');
		expect((await env.BUCKET.head(session.key))?.size).toBe(5);
		insert.mockRestore();
		const result = await service.complete(user.uuid, session.uploadId, session.key, [part], env.BUCKET);
		expect(await service.complete(user.uuid, session.uploadId, session.key, [part], env.BUCKET)).toEqual(result);
		expect(await service.status(user.uuid, session.uploadId, session.key)).toMatchObject({ state: 'complete', result });
		expect(await env.DB.prepare('SELECT COUNT(*) AS total FROM media WHERE uuid = ?').bind(session.key).first()).toMatchObject({ total: 1 });
		await expect(service.abort(user.uuid, session.uploadId, session.key, env.BUCKET)).rejects.toMatchObject({ status: 409 });
	});

	it('rejects missing, duplicated and forged acknowledgements before completing R2', async () => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		const session = await service.init(user.uuid, 'archive.zip', 'file', 5, env.BUCKET);
		const part = await service.part(user.uuid, session.uploadId, session.key, 1, new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 0])]).stream(), env.BUCKET);
		for (const parts of [[], [part, part], [{ ...part, etag: 'forged' }]]) {
			await expect(service.complete(user.uuid, session.uploadId, session.key, parts, env.BUCKET)).rejects.toMatchObject({ status: 400 });
		}
		expect(await env.BUCKET.head(session.key)).toBeNull();
		await service.abort(user.uuid, session.uploadId, session.key, env.BUCKET);
		await expect(service.part(user.uuid, session.uploadId, session.key, 1, new Blob(['a']).stream(), env.BUCKET)).rejects.toMatchObject({ status: 410 });
	});

	it('enforces declared and actual byte sizes and the media-type maximum', async () => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		await expect(service.init(user.uuid, 'archive.zip', 'file', 1500 * 1024 * 1024 + 1, env.BUCKET)).rejects.toMatchObject({ status: 400 });
		await expect(service.init(user.uuid, 'archive.zip', 'file', 1500 * 1024 * 1024 + 1, env.BUCKET, true)).resolves.toHaveProperty('uploadId');
		await expect(service.init(user.uuid, 'video.mp4', 'video', 101 * 1024 * 1024, env.BUCKET)).rejects.toMatchObject({ status: 400 });
		const session = await service.init(user.uuid, 'archive.zip', 'file', 4, env.BUCKET);
		await expect(service.part(user.uuid, session.uploadId, session.key, 1, new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 0])]).stream(), env.BUCKET)).rejects.toMatchObject({ status: 400 });
		expect(await env.BUCKET.head(session.key)).toBeNull();
	});

	it.each(['ab', ''])('rejects wrong actual byte lengths (%j) on streaming parts without creating a completed object', async (body) => {
		const user = await createUser();
		const service = new MultipartUploadService(env.DB);
		const session = await service.init(user.uuid, 'archive.zip', 'file', UPLOAD_CHUNK_SIZE + 1, env.BUCKET);
		const bytes = new Uint8Array(UPLOAD_CHUNK_SIZE);
		bytes.set([0x50, 0x4b, 3, 4]);
		await service.part(user.uuid, session.uploadId, session.key, 1, new Blob([bytes]).stream(), env.BUCKET);
		await expect(service.part(user.uuid, session.uploadId, session.key, 2, new Blob([body]).stream(), env.BUCKET)).rejects.toMatchObject({ status: 400 });
		expect(await env.BUCKET.head(session.key)).toBeNull();
	});
});
