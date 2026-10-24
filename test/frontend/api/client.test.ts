// =========================================================================================================
// FRONTEND API CLIENT TESTS
// =========================================================================================================
// Cover fetch/XHR serialization, response parsing, failures, cache behavior and invalidation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it, vi } from 'vitest';

import { DataCache } from '../../../src/frontend/core/cache';
import { ApiClient } from '../../../src/frontend/api/client';
import { VrcStorageApiError } from '../../../src/frontend/api/errors';

// =========================================================================================================
// Constants
// =========================================================================================================

const xhrInstances: FakeXMLHttpRequest[] = [];

// =========================================================================================================
// Types
// =========================================================================================================

interface XhrProgress {
	lengthComputable: boolean;
	loaded: number;
	total: number;
}

// =========================================================================================================
// Helpers
// =========================================================================================================

function stubFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
	const fetchMock = vi.fn();
	for (const response of responses) fetchMock.mockResolvedValueOnce(response);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

function cacheKey(path: string): string {
	return `${path}|https://vrcstorage.lat`;
}

class FakeXMLHttpRequest {
	readonly upload: { onprogress: ((event: XhrProgress) => void) | null } = { onprogress: null };
	readonly headers = new Map<string, string>();
	method = '';
	url = '';
	withCredentials = false;
	status = 200;
	responseText = '{"success":true}';
	sentBody: Document | XMLHttpRequestBodyInit | null = null;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onabort: (() => void) | null = null;
	abortCount = 0;

	open(method: string, url: string): void {
		this.method = method;
		this.url = url;
	}

	setRequestHeader(name: string, value: string): void {
		this.headers.set(name.toLowerCase(), value);
	}

	send(body: Document | XMLHttpRequestBodyInit | null): void {
		this.sentBody = body;
	}

	abort(): void {
		this.abortCount++;
		this.onabort?.();
	}
}

class FakeXMLHttpRequestConstructor extends FakeXMLHttpRequest {
	constructor() {
		super();
		xhrInstances.push(this);
	}
}

// =========================================================================================================
// Fetch transport
// =========================================================================================================

describe('ApiClient fetch transport', () => {
	it('sends JSON with credentials, preserves supplied headers and returns parsed JSON', async () => {
		const fetchMock = stubFetch(Response.json({ success: true }));
		const result = await new ApiClient().post('/api/test', { value: 1 }, { headers: { 'X-Trace': 'trace-1' } });
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(result).toEqual({ success: true });
		expect(url).toBe('/api/test');
		expect(init).toMatchObject({ method: 'POST', credentials: 'include', body: '{"value":1}' });
		expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
		expect(new Headers(init.headers).get('X-Trace')).toBe('trace-1');
	});

	it.each([
		['FormData', () => new FormData()],
		['Blob', () => new Blob(['blob'])],
		['ArrayBuffer', () => new Uint8Array([1, 2]).buffer],
		['typed array', () => new Uint8Array([1, 2])],
		['URLSearchParams', () => new URLSearchParams('a=1')],
		['string', () => 'plain text'],
	])('passes %s bodies without JSON re-encoding', async (_label, makeBody) => {
		const body = makeBody();
		const fetchMock = stubFetch(Response.json({ ok: true }));
		await new ApiClient().put('/api/body', body);
		const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(init.body).toBe(body);
		expect(new Headers(init.headers).has('Content-Type')).toBe(false);
	});

	it('parses text, Blob and ArrayBuffer responses and treats 204/205/HEAD as empty', async () => {
		stubFetch(
			new Response('plain'),
			new Response('blob-data'),
			new Response(new Uint8Array([1, 2, 3])),
			new Response(null, { status: 204 }),
			new Response(null, { status: 205 }),
			new Response(null, { status: 200 }),
		);
		const client = new ApiClient();
		expect(await client.request('GET', '/api/text', undefined, { responseType: 'text' })).toBe('plain');
		expect(await client.request('GET', '/api/blob', undefined, { responseType: 'blob' })).toBeInstanceOf(Blob);
		expect([...new Uint8Array((await client.request('GET', '/api/binary', undefined, { responseType: 'arrayBuffer' })) as ArrayBuffer)]).toEqual([1, 2, 3]);
		expect(await client.get('/api/no-content')).toBeUndefined();
		expect(await client.get('/api/reset-content')).toBeUndefined();
		expect(await client.request('HEAD', '/api/head')).toBeUndefined();
	});

	it('normalizes validation, rate-limit, non-JSON HTTP and malformed JSON failures', async () => {
		stubFetch(
			Response.json({ error: 'Validation error', details: [{ path: ['title'], message: 'Required' }] }, { status: 400 }),
			Response.json({ error: 'Slow down' }, { status: 429 }),
			new Response('upstream failure', { status: 502 }),
			new Response('{broken', { status: 200 }),
		);
		const client = new ApiClient();
		await expect(client.post('/api/invalid', {})).rejects.toMatchObject({
			name: 'VrcStorageApiError',
			kind: 'http',
			status: 400,
			message: 'Validation error: title: Required',
			body: { error: 'Validation error', details: [{ path: ['title'], message: 'Required' }] },
		});
		await expect(client.get('/api/limited')).rejects.toMatchObject({ status: 429, kind: 'rate-limit', message: 'Slow down' });
		await expect(client.get('/api/upstream')).rejects.toMatchObject({ status: 502, kind: 'http', message: 'Request failed (502)', body: 'upstream failure' });
		await expect(client.get('/api/malformed')).rejects.toMatchObject({ status: 200, kind: 'malformed', message: 'Invalid JSON response', body: '{broken' });
	});

	it('distinguishes network errors and aborts, including a pre-aborted signal', async () => {
		const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient();
		await expect(client.get('/api/offline')).rejects.toMatchObject({ status: 0, method: 'GET', kind: 'network', message: 'Network error' });
		await expect(client.get('/api/aborted')).rejects.toMatchObject({ status: 0, kind: 'abort', name: 'AbortError', message: 'Request aborted' });
		const controller = new AbortController();
		controller.abort();
		await expect(client.get('/api/pre-aborted', { signal: controller.signal })).rejects.toMatchObject({ kind: 'abort' });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('caches and deduplicates concurrent GETs, including persistent storage reads', async () => {
		const fetchMock = stubFetch(Response.json({ value: 1 }), Response.json({ value: 2 }));
		const client = new ApiClient();
		const options = { cache: { ttl: 60_000, persistent: true } };
		const [first, concurrent] = await Promise.all([client.get('/api/cached', options), client.get('/api/cached', options)]);
		expect(first).toEqual({ value: 1 });
		expect(concurrent).toEqual(first);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(`cache:${cacheKey('/api/cached')}`)).not.toBeNull();
		DataCache.cache.clear();
		expect(await client.get('/api/cached', options)).toEqual({ value: 1 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('skips GET caching when an AbortSignal is supplied', async () => {
		const fetchMock = stubFetch(Response.json({ value: 1 }), Response.json({ value: 2 }));
		const client = new ApiClient();
		const options = { cache: { ttl: 60_000 }, signal: new AbortController().signal };
		expect(await client.get('/api/signal', options)).toEqual({ value: 1 });
		expect(await client.get('/api/signal', options)).toEqual({ value: 2 });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('invalidates only after a successful mutation and does not let retired reads repopulate cache', async () => {
		const client = new ApiClient();
		DataCache.cache.set(cacheKey('/api/resources?page=1'), { data: ['old'], timestamp: Date.now() });
		DataCache.cache.set(cacheKey('/api/avatars?page=1'), { data: ['keep'], timestamp: Date.now() });
		localStorage.setItem(`cache:${cacheKey('/api/resources?page=1')}`, JSON.stringify({ data: ['old'], timestamp: Date.now() }));
		stubFetch(Response.json({ error: 'failed' }, { status: 500 }), Response.json({ success: true }));
		await expect(client.post('/api/write', {}, { invalidate: ['/api/resources'] })).rejects.toBeInstanceOf(VrcStorageApiError);
		expect(DataCache.cache.has(cacheKey('/api/resources?page=1'))).toBe(true);
		expect(localStorage.getItem(`cache:${cacheKey('/api/resources?page=1')}`)).not.toBeNull();
		await client.post('/api/write', {}, { invalidate: ['/api/resources'] });
		expect(DataCache.cache.has(cacheKey('/api/resources?page=1'))).toBe(false);
		expect(localStorage.getItem(`cache:${cacheKey('/api/resources?page=1')}`)).toBeNull();
		expect(DataCache.cache.has(cacheKey('/api/avatars?page=1'))).toBe(true);

		let resolveResponse!: (response: Response) => void;
		const deferredFetch = vi.fn(() => new Promise<Response>((resolve) => { resolveResponse = resolve; }));
		vi.stubGlobal('fetch', deferredFetch);
		const pending = client.get('/api/resources/in-flight', { cache: { ttl: 60_000 } });
		await Promise.resolve();
		await Promise.resolve();
		client.invalidate('/api/resources');
		resolveResponse(Response.json({ stale: true }));
		await pending;
		expect(DataCache.cache.has(cacheKey('/api/resources/in-flight'))).toBe(false);
	});
});

// =========================================================================================================
// XMLHttpRequest transport
// =========================================================================================================

describe('ApiClient XHR upload transport', () => {
	it('sends credentials and headers, reports computable progress and parses success', async () => {
		xhrInstances.length = 0;
		vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequestConstructor);
		const progress = vi.fn();
		const body = new Blob(['file-data']);
		DataCache.cache.set(cacheKey('/api/resources?page=1'), { data: ['old'], timestamp: Date.now() });
		const promise = new ApiClient().upload('/api/upload', body, progress, {
			headers: { 'X-Upload': 'token' },
			invalidate: ['/api/resources'],
		});
		const xhr = xhrInstances[0]!;
		expect(xhr.method).toBe('PUT');
		expect(xhr.url).toBe('/api/upload');
		expect(xhr.withCredentials).toBe(true);
		expect(xhr.headers.get('x-upload')).toBe('token');
		expect(xhr.sentBody).toBe(body);
		xhr.upload.onprogress?.({ lengthComputable: true, loaded: 3, total: 4 });
		xhr.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 });
		expect(progress).toHaveBeenCalledTimes(1);
		expect(progress).toHaveBeenCalledWith(75);
		xhr.onload?.();
		expect(await promise).toEqual({ success: true });
		expect(DataCache.cache.has(cacheKey('/api/resources?page=1'))).toBe(false);
	});

	it('normalizes HTTP, network and abort failures and respects pre-aborted signals', async () => {
		xhrInstances.length = 0;
		vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequestConstructor);
		const client = new ApiClient();
		const limited = client.upload('/api/upload', new Blob(), () => {});
		const xhr = xhrInstances[xhrInstances.length - 1]!;
		xhr.status = 429;
		xhr.responseText = '{"error":"Slow down"}';
		xhr.onload?.();
		await expect(limited).rejects.toMatchObject({ kind: 'rate-limit', status: 429 });

		const network = client.upload('/api/upload', new Blob(), () => {});
		xhrInstances[xhrInstances.length - 1]!.onerror?.();
		await expect(network).rejects.toMatchObject({ kind: 'network', status: 0 });

		const controller = new AbortController();
		const aborted = client.upload('/api/upload', new Blob(), () => {}, { signal: controller.signal });
		const abortXhr = xhrInstances[xhrInstances.length - 1]!;
		controller.abort();
		await expect(aborted).rejects.toMatchObject({ kind: 'abort', name: 'AbortError' });
		expect(abortXhr.abortCount).toBe(1);

		controller.abort();
		const callsBefore = xhrInstances.length;
		await expect(client.upload('/api/upload', new Blob(), () => {}, { signal: controller.signal })).rejects.toMatchObject({ kind: 'abort' });
		expect(xhrInstances).toHaveLength(callsBefore + 1);
		expect(xhrInstances[xhrInstances.length - 1]?.method).toBe('');
	});
});
