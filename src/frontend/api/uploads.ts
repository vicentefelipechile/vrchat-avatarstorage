// =========================================================================================================
// Uploads — multipart protocol and retries stay out of views.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { ApiClient } from './client';
import { VrcStorageApiError } from './errors';
import type { ApiOptions, UploadResult, UploadSession, UploadPart } from './types';

// =========================================================================================================
// Constants
// =========================================================================================================

const CHUNK_SIZE = 30 * 1024 * 1024;
const PART_MAX_ATTEMPTS = 3;
const PART_RETRY_BASE_DELAY = 1000;

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
	Init(filename: string, mediaType: string, options?: ApiOptions) {
		return this.client.post<UploadSession>('/api/upload/init', { filename, media_type: mediaType }, options);
	}
	Part(session: UploadSession, partNumber: number, body: ArrayBuffer, options?: ApiOptions) {
		return this.client.put<UploadPart>('/api/upload/part', body, { ...options, headers: { 'X-Upload-ID': session.uploadId, 'X-Key': session.key, 'X-Part-Number': String(partNumber), 'Content-Type': 'application/octet-stream' } });
	}
	Complete(session: UploadSession, parts: UploadPart[], filename: string, mediaType: string, options?: ApiOptions) {
		return this.client.post<UploadResult>('/api/upload/complete', { ...session, parts, filename, media_type: mediaType }, options);
	}
	async Chunked(file: File, mediaType: string, onProgress: (percent: number) => void, options: ApiOptions = {}): Promise<UploadResult> {
		const session = await this.Init(file.name, mediaType, options);
		const parts: UploadPart[] = [];
		let loaded = 0;
		for (let start = 0; start < file.size; start += CHUNK_SIZE) {
			const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
			// Snapshot each part before sending to tolerate files changed by sync clients on disk.
			const body = await chunk.arrayBuffer();
			for (let attempt = 1; ; attempt++) {
				try {
					parts.push(await this.Part(session, parts.length + 1, body, options));
					break;
				} catch (error) {
					if (options.signal?.aborted || (error instanceof VrcStorageApiError && error.kind === 'abort') || attempt >= PART_MAX_ATTEMPTS) throw error;
					console.error(`Upload part attempt ${attempt} failed, retrying`, error);
					await new Promise((resolve) => setTimeout(resolve, PART_RETRY_BASE_DELAY * attempt));
				}
			}
			loaded += chunk.size;
			onProgress((loaded / file.size) * 100);
		}
		return this.Complete(session, parts, file.name, mediaType, options);
	}
}

// =========================================================================================================
// Export
// =========================================================================================================

export { CHUNK_SIZE };
