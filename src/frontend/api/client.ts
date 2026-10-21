// =========================================================================================================
// API transport — the sole owner of API fetch/XHR, credentials and response parsing.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { DataCache } from '../core/cache';
import { VrcStorageApiError } from './errors';
import { resolveApiUrl } from './origin';
import type { RequestOptions } from './types';

// =========================================================================================================
// Types
// =========================================================================================================

interface BackendError {
	error?: unknown;
	details?: unknown;
}

// =========================================================================================================
// Helpers
// =========================================================================================================

function failure(status: number, body: unknown, method: string, url: string): VrcStorageApiError {
	const data = body && typeof body === 'object' ? (body as BackendError) : undefined;
	let message = typeof data?.error === 'string' ? data.error : `Request failed (${status})`;
	if (Array.isArray(data?.details)) {
		const messages = data.details.flatMap((detail: unknown) => {
			if (!detail || typeof detail !== 'object' || !('message' in detail) || typeof detail.message !== 'string') return [];
			const path = 'path' in detail && Array.isArray(detail.path) ? `${detail.path.join('.')}: ` : '';
			return [`${path}${detail.message}`];
		});
		if (messages.length) message += `: ${messages.join(', ')}`;
	}
	return new VrcStorageApiError(status, message, method, url, status === 429 ? 'rate-limit' : 'http', data?.details, body);
}

function transportFailure(error: unknown, method: string, url: string): VrcStorageApiError {
	if (error instanceof VrcStorageApiError) return error;
	const aborted = error instanceof Error && error.name === 'AbortError';
	return new VrcStorageApiError(0, aborted ? 'Request aborted' : 'Network error', method, url, aborted ? 'abort' : 'network');
}

async function parse(response: Response, method: string, url: string, type: RequestOptions['responseType']): Promise<unknown> {
	if (method === 'HEAD') {
		if (!response.ok) throw failure(response.status, undefined, method, url);
		return undefined;
	}
	if (response.status === 204 || response.status === 205) return undefined;
	if (response.ok && type === 'blob') return response.blob();
	if (response.ok && type === 'arrayBuffer') return response.arrayBuffer();
	const text = await response.text();
	let body: unknown = text || undefined;
	if (text && (type === 'json' || !response.ok)) {
		try {
			body = JSON.parse(text);
		} catch {
			if (response.ok) throw new VrcStorageApiError(response.status, 'Invalid JSON response', method, url, 'malformed', undefined, text);
		}
	}
	if (!response.ok) throw failure(response.status, body, method, url);
	return body;
}

// =========================================================================================================
// Transport
// =========================================================================================================

export class ApiClient {
	invalidate(...prefixes: string[]): void {
		for (const prefix of prefixes) DataCache.clearScope(prefix);
	}

	get<T>(path: string, options: RequestOptions = {}): Promise<T> {
		return this.request<T>('GET', path, undefined, options);
	}
	post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>('POST', path, body, options);
	}
	put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>('PUT', path, body, options);
	}
	delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>('DELETE', path, body, options);
	}

	async request<T>(method: string, path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
		const url = resolveApiUrl(path);
		const headers = new Headers(options.headers);
		let body: BodyInit | undefined;
		if (data !== undefined) {
			if (data instanceof FormData || data instanceof Blob || data instanceof ArrayBuffer || ArrayBuffer.isView(data) || data instanceof URLSearchParams || typeof data === 'string') body = data as BodyInit;
			else {
				headers.set('Content-Type', 'application/json');
				body = JSON.stringify(data);
			}
		}
		const load = async (): Promise<T> => {
			try {
				options.signal?.throwIfAborted();
				const response = await fetch(url, { method, body, headers, signal: options.signal, credentials: 'include' });
				const result = (await parse(response, method, url, options.responseType ?? 'json')) as T;
				if (method !== 'GET') this.invalidate(...(options.invalidate ?? []));
				return result;
			} catch (error) {
				throw transportFailure(error, method, url);
			}
		};
		if (method === 'GET' && options.cache && !options.signal) {
			return DataCache.load<T>(`${path}|${new URL(url, window.location.origin).origin}`, load, options.cache);
		}
		return load();
	}

	upload<T>(path: string, body: FormData | Blob | ArrayBuffer, onProgress: (percent: number) => void, options: RequestOptions = {}): Promise<T> {
		const url = resolveApiUrl(path);
		const method = 'PUT';
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			const cleanup = () => options.signal?.removeEventListener('abort', abort);
			const abort = () => xhr.abort();
			if (options.signal?.aborted) {
				reject(new VrcStorageApiError(0, 'Request aborted', method, url, 'abort'));
				return;
			}
			xhr.open(method, url);
			xhr.withCredentials = true;
			new Headers(options.headers).forEach((value, key) => xhr.setRequestHeader(key, value));
			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
			};
			xhr.onload = async () => {
				cleanup();
				try {
					const response = new Response(xhr.status === 204 ? null : xhr.responseText, { status: xhr.status });
					const result = (await parse(response, method, url, options.responseType ?? 'json')) as T;
					this.invalidate(...(options.invalidate ?? []));
					resolve(result);
				} catch (error) {
					reject(transportFailure(error, method, url));
				}
			};
			xhr.onerror = () => {
				cleanup();
				reject(new VrcStorageApiError(0, 'Network error', method, url, 'network'));
			};
			xhr.onabort = () => {
				cleanup();
				reject(new VrcStorageApiError(0, 'Request aborted', method, url, 'abort'));
			};
			options.signal?.addEventListener('abort', abort, { once: true });
			try {
				xhr.send(body);
			} catch (error) {
				cleanup();
				reject(transportFailure(error, method, url));
			}
		});
	}
}
