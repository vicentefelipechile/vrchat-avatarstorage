// =========================================================================================================
// Uploads — bounded parallel multipart transfers, persistent recovery and progress.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { UploadCheckpoints } from '../core/upload-checkpoints';
import { ApiClient } from './client';
import { VrcStorageApiError } from './errors';
import { resolveApiUrl } from './origin';
import type { ApiOptions, UploadResult, UploadSession, UploadPart, UploadStatus } from './types';

// =========================================================================================================
// Constants
// =========================================================================================================

const CHUNK_SIZE = 30 * 1024 * 1024;
const PART_CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1000;
// Archive role limits are enforced by /init; this is the multipart protocol ceiling.
const SIZE_LIMITS: Record<string, number> = { image: 20 * 1024 * 1024, video: 100 * 1024 * 1024, file: 10000 * CHUNK_SIZE };

// =========================================================================================================
// Helpers
// =========================================================================================================

function recoverable(error: unknown): boolean {
	return error instanceof VrcStorageApiError && (error.kind === 'network' || error.status === 408 || error.status === 429 || error.status >= 500);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const abort = () => {
			clearTimeout(timer);
			reject(new VrcStorageApiError(0, 'Request aborted', 'PUT', '/api/upload/part', 'abort'));
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', abort);
			resolve();
		}, ms);
		if (signal?.aborted) abort();
		else signal?.addEventListener('abort', abort, { once: true });
	});
}

async function retry<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		signal?.throwIfAborted();
		try {
			return await operation();
		} catch (error) {
			if (signal?.aborted || !recoverable(error) || attempt >= MAX_ATTEMPTS) throw error;
			console.error(`Upload attempt ${attempt} failed, retrying`, error);
			await delay(error instanceof VrcStorageApiError ? (error.retryAfterMs ?? RETRY_BASE_DELAY * attempt) : RETRY_BASE_DELAY * attempt, signal);
		}
	}
}

async function fingerprint(file: File, mediaType: string, signal?: AbortSignal): Promise<string> {
	// Hash every byte in bounded chunks so reselecting a different file cannot mix old and new parts.
	const hashes: string[] = [file.name, String(file.size), mediaType, resolveApiUrl('/api/upload')];
	for (let start = 0; start < file.size; start += CHUNK_SIZE) {
		signal?.throwIfAborted();
		const digest = await crypto.subtle.digest('SHA-256', await file.slice(start, Math.min(start + CHUNK_SIZE, file.size)).arrayBuffer());
		hashes.push(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''));
	}
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(hashes)));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// =========================================================================================================
// Domain
// =========================================================================================================

export class UploadsApi {
	constructor(private readonly client: ApiClient) {}
	Single(data: FormData, options?: ApiOptions) {
		return this.client.put<UploadResult>('/api/upload', data, options);
	}
	WithProgress(data: FormData, onProgress: (percent: number) => void, options?: ApiOptions) {
		return this.client.upload<UploadResult>('/api/upload', data, onProgress, options);
	}
	Init(filename: string, mediaType: string, size: number, options?: ApiOptions) {
		return this.client.post<UploadSession>('/api/upload/init', { filename, media_type: mediaType, size }, options);
	}
	Part(session: UploadSession, partNumber: number, body: Blob | ArrayBuffer, options?: ApiOptions, onProgress?: (percent: number) => void) {
		const request = { ...options, headers: { 'X-Upload-ID': session.uploadId, 'X-Key': session.key, 'X-Part-Number': String(partNumber), 'Content-Type': 'application/octet-stream' } };
		return onProgress ? this.client.upload<UploadPart>('/api/upload/part', body, onProgress, request) : this.client.put<UploadPart>('/api/upload/part', body, request);
	}
	Complete(session: UploadSession, parts: UploadPart[], filename: string, mediaType: string, options?: ApiOptions) {
		return this.client.post<UploadResult>('/api/upload/complete', { ...session, parts, filename, media_type: mediaType }, options);
	}
	Status(session: UploadSession, options?: ApiOptions) {
		return this.client.get<UploadStatus>(`/api/upload/status?${new URLSearchParams({ ...session })}`, options);
	}
	Abort(session: UploadSession, options?: ApiOptions) {
		return this.client.post<{ success: boolean }>('/api/upload/abort', session, options);
	}
	async Chunked(file: File, mediaType: string, onProgress: (percent: number) => void, options: ApiOptions = {}): Promise<UploadResult> {
		if (!file.size || !SIZE_LIMITS[mediaType] || file.size > SIZE_LIMITS[mediaType]) throw new Error('Invalid file size or media type');
		const identity = await fingerprint(file, mediaType, options.signal);
		let session = UploadCheckpoints.get(identity);
		let accepted: UploadPart[] = [];
		let confirming = false;
		if (session) {
			try {
				const status = await retry(() => this.Status(session!, options), options.signal);
				if (status.result) {
					onProgress(100);
					return status.result;
				}
				accepted = status.parts;
				confirming = status.state === 'completing';
			} catch (error) {
				if (!(error instanceof VrcStorageApiError) || ![403, 404, 410].includes(error.status)) throw error;
				UploadCheckpoints.delete(identity);
				session = null;
			}
		}
		if (!session) {
			session = await this.Init(file.name, mediaType, file.size, options);
			UploadCheckpoints.set(identity, session);
		}
		const activeSession = session;
		const controller = new AbortController();
		const abort = () => controller.abort();
		options.signal?.addEventListener('abort', abort, { once: true });
		if (options.signal?.aborted) abort();
		const request = { ...options, signal: controller.signal };
		const count = Math.ceil(file.size / CHUNK_SIZE);
		const parts: UploadPart[] = new Array(count);
		const loaded = new Array<number>(count).fill(0);
		const partSize = (index: number) => Math.min(CHUNK_SIZE, file.size - index * CHUNK_SIZE);
		for (const part of accepted) {
			parts[part.partNumber - 1] = part;
			loaded[part.partNumber - 1] = partSize(part.partNumber - 1);
		}
		const progress = () => onProgress(Math.min(99, (loaded.reduce((sum, bytes) => sum + bytes, 0) / file.size) * 100));
		const send = async (index: number) => {
			if (parts[index]) return;
			// Only active workers read chunks; the same snapshot is reused for retries.
			const body = await file.slice(index * CHUNK_SIZE, index * CHUNK_SIZE + partSize(index)).arrayBuffer();
			const part = await retry(() => {
				loaded[index] = 0;
				progress();
				return this.Part(activeSession, index + 1, body, request, (percent) => {
					loaded[index] = (partSize(index) * Math.min(100, Math.max(0, percent))) / 100;
					progress();
				});
			}, controller.signal);
			if (part.partNumber !== index + 1 || !part.etag) throw new Error('Invalid upload part acknowledgement');
			parts[index] = part;
			loaded[index] = partSize(index);
			progress();
		};
		let failure: unknown;
		try {
			if (!confirming) {
				await send(0);
				let next = 1;
				const worker = async () => {
					try {
						while (next < count && !controller.signal.aborted) await send(next++);
					} catch (error) {
						failure ??= error;
						controller.abort();
					}
				};
				await Promise.allSettled(Array.from({ length: Math.min(PART_CONCURRENCY, count - 1) }, worker));
				if (failure) throw failure;
			}
			controller.signal.throwIfAborted();
			if (parts.filter(Boolean).length !== count) throw new Error('Missing confirmed upload parts');
			confirming = true;
			const result = await retry(() => this.Complete(activeSession, parts, file.name, mediaType, request), controller.signal);
			onProgress(100);
			return result;
		} catch (error) {
			controller.abort();
			// Exhausted transient failures retain the checkpoint; explicit cancellation abandons it.
			if (!confirming && (options.signal?.aborted || !recoverable(error))) {
				UploadCheckpoints.delete(identity);
				await this.Abort(activeSession).catch((abortError) => console.error('Could not abort upload session', abortError));
			}
			throw error;
		} finally {
			options.signal?.removeEventListener('abort', abort);
		}
	}
}

// =========================================================================================================
// Export
// =========================================================================================================

export { CHUNK_SIZE };
