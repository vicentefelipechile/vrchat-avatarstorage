// =========================================================================================================
// FRONTEND API HELPER TESTS
// =========================================================================================================
// Verify API URL resolution, repeated query parameters and download-link helpers.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it, vi } from 'vitest';

import { ApiClient } from '../../../src/frontend/api/client';
import { ResourcesApi } from '../../../src/frontend/api/resources';
import { resolveApiUrl } from '../../../src/frontend/api/origin';
import { query } from '../../../src/frontend/api/types';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('API URL helpers', () => {
	it('rewrites only API paths for the exact Pages hostname', () => {
		expect(resolveApiUrl('/api/resources?q=fox', 'vrcstorage.pages.dev')).toBe('https://vrcstorage.lat/api/resources?q=fox');
		expect(resolveApiUrl('/api/resources', 'vrcstorage.lat')).toBe('/api/resources');
		expect(resolveApiUrl('/api/resources', 'preview.vrcstorage.pages.dev')).toBe('/api/resources');
		expect(() => resolveApiUrl('/resources')).toThrow(TypeError);
		expect(() => resolveApiUrl('/api/../share/token')).toThrow(TypeError);
		expect(() => resolveApiUrl('/api\\resources')).toThrow(TypeError);
		expect(() => resolveApiUrl('/api/resources\n')).toThrow(TypeError);
	});

	it('serializes repeated array filters and preserves URLSearchParams duplicates', () => {
		expect(query({ tag: ['one', 'two'], page: 2, ignored: null, absent: undefined })).toBe('?tag=one&tag=two&page=2');
		expect(query(new URLSearchParams('tag=one&tag=two'))).toBe('?tag=one&tag=two');
		expect(query({})).toBe('');
	});

	it('recognizes only local download URLs and rewrites only canonical downloads on Pages', () => {
		const resources = new ResourcesApi(new ApiClient());
		expect(resources.DownloadPath('key/with space')).toBe('/api/download/key%2Fwith%20space');
		expect(resources.DownloadUrl('key-1')).toBe('/api/download/key-1');
		expect(resources.DownloadKey('/api/download/key-1')).toBe('key-1');
		expect(resources.DownloadKey('https://vrcstorage.lat/api/download/key-2/')).toBe('key-2');
		expect(resources.DownloadKey('https://cdn.example/api/download/key-3')).toBeNull();
		expect(resources.DownloadKey('/api/download/key/extra')).toBeNull();

		vi.stubGlobal('window', { location: { hostname: 'vrcstorage.pages.dev', origin: 'https://vrcstorage.pages.dev' } });
		expect(resources.DownloadUrl('key-4')).toBe('https://vrcstorage.lat/api/download/key-4');
		expect(resources.ResolveDownloadUrl('/api/download/key-5?download=1#file')).toBe('https://vrcstorage.lat/api/download/key-5?download=1#file');
		expect(resources.ResolveDownloadUrl('https://cdn.example/api/download/key-6')).toBe('https://cdn.example/api/download/key-6');
	});
});
