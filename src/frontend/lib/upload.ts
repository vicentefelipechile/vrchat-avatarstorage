// =========================================================================
// lib/upload.ts — Chunked multipart upload to R2
// =========================================================================

export const CHUNK_SIZE = 30 * 1024 * 1024;
const PART_MAX_ATTEMPTS = 3;
const PART_RETRY_BASE_DELAY = 1000;

export interface ChunkedUploadResult {
	r2_key: string;
	media_uuid: string;
}

/**
 * Reads a chunk into memory before sending so a mid-upload change to the file on disk
 * (antivirus scan, sync client, re-export) cannot abort the request with
 * ERR_UPLOAD_FILE_CHANGED. Retries transient part failures with exponential backoff.
 */
async function uploadPart(uploadId: string, key: string, partNumber: number, chunk: Blob): Promise<object> {
	const body = await chunk.arrayBuffer();

	for (let attempt = 1; ; attempt++) {
		try {
			const partRes = await fetch('/api/upload/part', {
				method: 'PUT',
				headers: {
					'X-Upload-ID': uploadId,
					'X-Key': key,
					'X-Part-Number': String(partNumber),
					'Content-Type': 'application/octet-stream',
				},
				body,
			});
			if (!partRes.ok) throw new Error(`Failed to upload part ${partNumber} (${partRes.status})`);
			return await partRes.json();
		} catch (err) {
			if (attempt >= PART_MAX_ATTEMPTS) throw err;
			console.error(`Part ${partNumber} attempt ${attempt} failed, retrying:`, err);
			await new Promise((resolve) => setTimeout(resolve, PART_RETRY_BASE_DELAY * attempt));
		}
	}
}

/** Uploads a file to R2 via the multipart init/part/complete flow, reporting progress 0-100. */
export async function uploadChunked(
	file: File,
	mediaType: string,
	onProgress: (p: number) => void,
): Promise<ChunkedUploadResult> {
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

	const initRes = await fetch('/api/upload/init', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ filename: file.name, media_type: mediaType }),
	});
	if (!initRes.ok) throw new Error('Failed to initialize upload');
	const { uploadId, key } = (await initRes.json()) as { uploadId: string; key: string };

	const parts: object[] = [];
	let loaded = 0;

	for (let i = 0; i < totalChunks; i++) {
		const start = i * CHUNK_SIZE;
		const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
		parts.push(await uploadPart(uploadId, key, i + 1, chunk));
		loaded += chunk.size;
		onProgress((loaded / file.size) * 100);
	}

	const completeRes = await fetch('/api/upload/complete', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ uploadId, key, parts, filename: file.name, media_type: mediaType }),
	});
	if (!completeRes.ok) throw new Error('Failed to complete upload');
	return completeRes.json() as Promise<ChunkedUploadResult>;
}
