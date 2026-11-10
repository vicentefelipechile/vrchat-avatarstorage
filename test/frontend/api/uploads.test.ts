// =========================================================================================================
// FRONTEND CHUNKED UPLOAD TESTS
// Bounded concurrency, retries, cancellation, progress and reload recovery without a browser DOM.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../src/frontend/api/client';
import { VrcStorageApiError } from '../../../src/frontend/api/errors';
import { CHUNK_SIZE, UploadsApi } from '../../../src/frontend/api/uploads';
import type { RequestOptions, UploadPart, UploadSession, UploadStatus } from '../../../src/frontend/api/types';

// =========================================================================================================
// Constants
// =========================================================================================================

const SESSION: UploadSession = { uploadId: 'upload-1', key: 'object-1' };
const RESULT = { media_uuid: 'media-1', r2_key: 'object-1' };

// =========================================================================================================
// Helpers
// =========================================================================================================

function fileOfSize(size: number, marker = 1): File {
	return {
		name: 'large.zip', size,
		slice: (start: number, end: number) => ({ size: end - start, arrayBuffer: async () => new Uint8Array([marker, start / CHUNK_SIZE]).buffer }) as Blob,
	} as File;
}

function uploadsClient() {
	const post = vi.fn(async (path: string, _body?: unknown, _options?: RequestOptions) => path.endsWith('/init') ? SESSION : path.endsWith('/abort') ? { success: true } : RESULT);
	const get = vi.fn(async (_path: string, _options?: RequestOptions): Promise<UploadStatus> => ({ state: 'uploading', parts: [] }));
	const upload = vi.fn(async (_path: string, _body: unknown, progress: (percent: number) => void, options: RequestOptions): Promise<UploadPart> => {
		const partNumber = Number(new Headers(options.headers).get('X-Part-Number'));
		progress(50);
		progress(100);
		return { partNumber, etag: `etag-${partNumber}` };
	});
	const client = { post, get, upload } as unknown as ApiClient;
	return { uploads: new UploadsApi(client), client, post, get, upload };
}

function httpError(status: number, retryAfterMs?: number) {
	return new VrcStorageApiError(status, `Failure ${status}`, 'PUT', '/api/upload/part', 'http', undefined, undefined, retryAfterMs);
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('UploadsApi.Chunked', () => {
	it('validates part one alone, fills vacant slots immediately and completes in file order', async () => {
		const { uploads, upload, post } = uploadsClient();
		const pending = new Map<number, () => void>();
		let active = 0;
		let peak = 0;
		upload.mockImplementation(async (_path, _body, progress, options) => {
			const partNumber = Number(new Headers(options.headers).get('X-Part-Number'));
			active++;
			peak = Math.max(peak, active);
			await new Promise<void>((resolve) => pending.set(partNumber, resolve));
			progress(100);
			active--;
			return { partNumber, etag: `etag-${partNumber}` };
		});
		const progress = vi.fn();
		const task = uploads.Chunked(fileOfSize(CHUNK_SIZE * 5 + 1), 'file', progress);
		await vi.waitFor(() => expect([...pending.keys()]).toEqual([1]));
		pending.get(1)!();
		await vi.waitFor(() => expect([...pending.keys()]).toEqual([1, 2, 3, 4]));
		pending.get(3)!();
		await vi.waitFor(() => expect(pending.has(5)).toBe(true));
		pending.get(5)!();
		await vi.waitFor(() => expect(pending.has(6)).toBe(true));
		pending.get(6)!(); pending.get(4)!(); pending.get(2)!();
		expect(await task).toEqual(RESULT);
		expect(peak).toBe(3);
		expect(post.mock.calls.find(([path]) => path.endsWith('/complete'))?.[1]).toMatchObject({
			parts: Array.from({ length: 6 }, (_, index) => ({ partNumber: index + 1, etag: `etag-${index + 1}` })),
		});
		expect(progress.mock.calls[progress.mock.calls.length - 1]).toEqual([100]);
		expect(progress.mock.calls.slice(0, -1).every(([percent]) => percent <= 99)).toBe(true);
	});

	it('reports intra-part progress and does not count retried bytes twice', async () => {
		vi.useFakeTimers();
		const { uploads, upload, post } = uploadsClient();
		upload.mockImplementationOnce(async (_path, _body, progress) => { progress(80); throw httpError(503); });
		const progress = vi.fn();
		const task = uploads.Chunked(fileOfSize(10), 'file', progress);
		await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
		await vi.runAllTimersAsync();
		expect(await task).toEqual(RESULT);
		expect(upload).toHaveBeenCalledTimes(2);
		expect(progress.mock.calls.map(([percent]) => percent)).toContain(80);
		expect(progress.mock.calls.map(([percent]) => percent)).toContain(50);
		expect(progress.mock.calls.every(([percent]) => percent >= 0 && percent <= 100)).toBe(true);
		expect(post.mock.calls.filter(([path]) => path.endsWith('/abort'))).toHaveLength(0);
	});

	it('honors Retry-After and retries completion without resending accepted parts', async () => {
		vi.useFakeTimers();
		const { uploads, upload, post } = uploadsClient();
		upload.mockRejectedValueOnce(httpError(429, 60_000));
		let confirmations = 0;
		post.mockImplementation(async (path) => {
			if (path.endsWith('/init')) return SESSION;
			if (++confirmations === 1) throw httpError(502);
			return RESULT;
		});
		const task = uploads.Chunked(fileOfSize(1), 'file', () => {});
		await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
		await vi.advanceTimersByTimeAsync(59_000);
		expect(upload).toHaveBeenCalledTimes(1);
		await vi.runAllTimersAsync();
		expect(await task).toEqual(RESULT);
		expect(upload).toHaveBeenCalledTimes(2);
		expect(confirmations).toBe(2);
	});

	it('does not start other parts after an invalid first part', async () => {
		const { uploads, upload, post } = uploadsClient();
		upload.mockRejectedValue(httpError(400));
		await expect(uploads.Chunked(fileOfSize(CHUNK_SIZE * 5), 'file', () => {})).rejects.toMatchObject({ status: 400 });
		expect(upload).toHaveBeenCalledTimes(1);
		expect(post.mock.calls.some(([path]) => path.endsWith('/complete'))).toBe(false);
		expect(post.mock.calls.some(([path]) => path.endsWith('/abort'))).toBe(true);
	});

	it('cancels and settles active requests before reporting a definitive failure', async () => {
		const { uploads, upload, post } = uploadsClient();
		let fail: () => void = () => {};
		let settled = 0;
		upload.mockImplementation(async (_path, _body, _progress, options) => {
			const partNumber = Number(new Headers(options.headers).get('X-Part-Number'));
			if (partNumber === 1) return { partNumber, etag: 'etag-1' };
			await new Promise<void>((_resolve, reject) => {
				if (partNumber === 2) fail = () => reject(httpError(403));
				options.signal!.addEventListener('abort', () => { settled++; reject(new VrcStorageApiError(0, 'Cancelled', 'PUT', '', 'abort')); }, { once: true });
			});
			throw new Error('unreachable');
		});
		const task = uploads.Chunked(fileOfSize(CHUNK_SIZE * 8), 'file', () => {});
		const failure = expect(task).rejects.toMatchObject({ status: 403 });
		await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(4));
		fail();
		await failure;
		expect(settled).toBe(3);
		expect(upload).toHaveBeenCalledTimes(4);
		expect(post.mock.calls.some(([path]) => path.endsWith('/complete'))).toBe(false);
	});

	it('recovers server acknowledgements after reload, including a completed response', async () => {
		const { uploads, upload, get, client, post } = uploadsClient();
		const file = fileOfSize(CHUNK_SIZE + 1);
		await uploads.Chunked(file, 'file', () => {});
		upload.mockClear(); post.mockClear();
		get.mockResolvedValue({ state: 'uploading', parts: [{ partNumber: 1, etag: 'etag-1' }] });
		await new UploadsApi(client).Chunked(fileOfSize(CHUNK_SIZE + 1), 'file', () => {});
		expect(upload).toHaveBeenCalledTimes(1);
		expect(new Headers(upload.mock.calls[0]?.[3].headers).get('X-Part-Number')).toBe('2');
		expect(post.mock.calls.some(([path]) => path.endsWith('/init'))).toBe(false);
		upload.mockClear(); post.mockClear();
		get.mockResolvedValue({ state: 'complete', parts: [], result: RESULT });
		expect(await new UploadsApi(client).Chunked(file, 'file', () => {})).toEqual(RESULT);
		expect(upload).not.toHaveBeenCalled();
		expect(post).not.toHaveBeenCalled();
	});

	it('starts a new session for changed content or an expired/foreign checkpoint', async () => {
		const { uploads, post, get } = uploadsClient();
		await uploads.Chunked(fileOfSize(1), 'file', () => {});
		get.mockRejectedValueOnce(httpError(410));
		await uploads.Chunked(fileOfSize(1), 'file', () => {});
		await uploads.Chunked(fileOfSize(1, 2), 'file', () => {});
		expect(post.mock.calls.filter(([path]) => path.endsWith('/init'))).toHaveLength(3);
		expect(get).toHaveBeenCalledTimes(1);
	});

	it('rejects empty and oversized files before creating a session', async () => {
		const { uploads, post } = uploadsClient();
		await expect(uploads.Chunked(fileOfSize(0), 'file', () => {})).rejects.toThrow('Invalid file size');
		await expect(uploads.Chunked(fileOfSize(10000 * CHUNK_SIZE + 1), 'file', () => {})).rejects.toThrow('Invalid file size');
		expect(post).not.toHaveBeenCalled();
	});

	it('keeps its checkpoint after exhausted transient retries and resumes without a new init', async () => {
		vi.useFakeTimers();
		const { uploads, upload, get, post } = uploadsClient();
		upload.mockRejectedValue(httpError(503));
		const task = uploads.Chunked(fileOfSize(1), 'file', () => {});
		const failure = expect(task).rejects.toMatchObject({ status: 503 });
		await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
		await vi.runAllTimersAsync();
		await failure;
		expect(upload).toHaveBeenCalledTimes(3);
		expect(post.mock.calls.some(([path]) => path.endsWith('/abort'))).toBe(false);
		get.mockResolvedValue({ state: 'uploading', parts: [{ partNumber: 1, etag: 'etag-1' }] });
		expect(await uploads.Chunked(fileOfSize(1), 'file', () => {})).toEqual(RESULT);
		expect(post.mock.calls.filter(([path]) => path.endsWith('/init'))).toHaveLength(1);
		expect(upload).toHaveBeenCalledTimes(3);
	});

	it('explicit cancellation aborts active requests and abandons the server session', async () => {
		const { uploads, upload, post } = uploadsClient();
		const controller = new AbortController();
		upload.mockImplementation(async (_path, _body, _progress, options) => new Promise((_resolve, reject) => {
			options.signal!.addEventListener('abort', () => reject(new VrcStorageApiError(0, 'Cancelled', 'PUT', '', 'abort')), { once: true });
		}));
		const task = uploads.Chunked(fileOfSize(CHUNK_SIZE * 3), 'file', () => {}, { signal: controller.signal });
		const failure = expect(task).rejects.toMatchObject({ kind: 'abort' });
		await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
		controller.abort();
		await failure;
		expect(post.mock.calls.some(([path]) => path.endsWith('/abort'))).toBe(true);
		expect(post.mock.calls.some(([path]) => path.endsWith('/complete'))).toBe(false);
	});
});
