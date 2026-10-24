// =========================================================================================================
// FRONTEND CHUNKED UPLOAD TESTS
// =========================================================================================================
// Exercise multipart chunk boundaries, ordered completion, progress and retry/abort behavior.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../src/frontend/api/client';
import { VrcStorageApiError } from '../../../src/frontend/api/errors';
import { CHUNK_SIZE, UploadsApi } from '../../../src/frontend/api/uploads';
import type { UploadPart, UploadSession } from '../../../src/frontend/api/types';

// =========================================================================================================
// Helpers
// =========================================================================================================

const SESSION: UploadSession = { uploadId: 'upload-1', key: 'object-1' };
const RESULT = { media_uuid: 'media-1', r2_key: 'object-1' };

function fileOfSize(size: number): File {
	return {
		name: 'large.bin',
		size,
		slice: (start: number, end: number) => ({
			size: end - start,
			arrayBuffer: async () => new ArrayBuffer(0),
		}) as Blob,
	} as unknown as File;
}

function uploadsClient(
	put: (...args: unknown[]) => Promise<unknown> = async () => ({ partNumber: 1, etag: 'etag-1' }),
): { uploads: UploadsApi; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> } {
	const post = vi.fn((path: string) => Promise.resolve(path.endsWith('/init') ? SESSION : RESULT));
	const putMock = vi.fn(put);
	const client = { post, put: putMock } as unknown as ApiClient;
	return { uploads: new UploadsApi(client), post, put: putMock };
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('UploadsApi.Chunked', () => {
	it('sends sequential chunks and reports cumulative progress before completing', async () => {
		let partNumber = 0;
		const { uploads, post, put } = uploadsClient(async () => {
			partNumber++;
			return { partNumber, etag: `etag-${partNumber}` };
		});
		const progress = vi.fn();
		const upload = await uploads.Chunked(fileOfSize(CHUNK_SIZE + 1), 'file', progress);
		expect(upload).toEqual(RESULT);
		expect(put).toHaveBeenCalledTimes(2);
		expect(put.mock.calls.map((call) => call[2])).toEqual([
			{ headers: { 'X-Upload-ID': 'upload-1', 'X-Key': 'object-1', 'X-Part-Number': '1', 'Content-Type': 'application/octet-stream' } },
			{ headers: { 'X-Upload-ID': 'upload-1', 'X-Key': 'object-1', 'X-Part-Number': '2', 'Content-Type': 'application/octet-stream' } },
		]);
		expect(progress).toHaveBeenNthCalledWith(1, (CHUNK_SIZE / (CHUNK_SIZE + 1)) * 100);
		expect(progress).toHaveBeenNthCalledWith(2, 100);
		expect(post.mock.calls).toEqual([
			['/api/upload/init', { filename: 'large.bin', media_type: 'file' }, {}],
			['/api/upload/complete', { ...SESSION, parts: [{ partNumber: 1, etag: 'etag-1' }, { partNumber: 2, etag: 'etag-2' }], filename: 'large.bin', media_type: 'file' }, {}],
		]);
	});

	it('retries a failed part, but stops after the configured maximum attempts', async () => {
		vi.useFakeTimers();
		let attempts = 0;
		const { uploads, put } = uploadsClient(async () => {
			attempts++;
			if (attempts === 1) throw new Error('temporary failure');
			return { partNumber: 1, etag: 'etag-1' } satisfies UploadPart;
		});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const successful = uploads.Chunked(fileOfSize(1), 'file', () => {});
		await vi.runAllTimersAsync();
		expect(await successful).toEqual(RESULT);
		expect(put).toHaveBeenCalledTimes(2);

		attempts = 0;
		put.mockImplementation(async () => {
			attempts++;
			throw new Error('persistent failure');
		});
		const failed = uploads.Chunked(fileOfSize(1), 'file', () => {});
		const failure = expect(failed).rejects.toThrow('persistent failure');
		await vi.runAllTimersAsync();
		await failure;
		expect(put).toHaveBeenCalledTimes(5);
		error.mockRestore();
	});

	it('does not retry abort failures and still completes empty files with no parts', async () => {
		const abort = new VrcStorageApiError(0, 'Request aborted', 'PUT', '/api/upload/part', 'abort');
		const { uploads, post, put } = uploadsClient(async () => { throw abort; });
		await expect(uploads.Chunked(fileOfSize(1), 'file', () => {})).rejects.toBe(abort);
		expect(put).toHaveBeenCalledTimes(1);

		const empty = uploadsClient();
		const progress = vi.fn();
		expect(await empty.uploads.Chunked(fileOfSize(0), 'file', progress)).toEqual(RESULT);
		expect(progress).not.toHaveBeenCalled();
		expect(empty.put).not.toHaveBeenCalled();
		expect(empty.post.mock.calls[1]?.[1]).toMatchObject({ parts: [] });
	});
});
