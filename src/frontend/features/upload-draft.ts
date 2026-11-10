// =========================================================================================================
// UPLOAD DRAFT
// Keep completed files across publication retries without retaining their contents in memory.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { api, CHUNK_SIZE } from '../api';
import type { UploadResult } from '../api/types';

// =========================================================================================================
// Constants
// =========================================================================================================

const RESULT_TTL = 23 * 3600_000;

// =========================================================================================================
// Draft
// =========================================================================================================

export function createUploadDraft() {
	const completed = new WeakMap<File, { result: UploadResult; timestamp: number }>();
	return async (file: File, mediaType: string, onProgress: (percent: number) => void): Promise<UploadResult> => {
		const saved = completed.get(file);
		if (saved && Date.now() - saved.timestamp < RESULT_TTL) {
			onProgress(100);
			return saved.result;
		}
		let result: UploadResult;
		if (file.size > CHUNK_SIZE) result = await api.Uploads.Chunked(file, mediaType, onProgress);
		else {
			const body = new FormData();
			body.append('file', file);
			body.append('media_type', mediaType);
			result = await api.Uploads.WithProgress(body, (percent) => onProgress(Math.min(99, percent)));
			onProgress(100);
		}
		completed.set(file, { result, timestamp: Date.now() });
		return result;
	};
}
