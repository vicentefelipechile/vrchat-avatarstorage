// =========================================================================================================
// CDN WORKER INTEGRATION TESTS
// =========================================================================================================
// Exercise the dedicated CDN handler against isolated MEDIA_BUCKET storage.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import cdn from '../../../src/cdn-worker';

// =========================================================================================================
// Helpers
// =========================================================================================================

function request(path: string, headers?: HeadersInit): Promise<Response> {
	return cdn.fetch(new Request(`https://cdn.vrcstorage.lat${path}`, { headers }), env);
}

async function body(response: Response): Promise<string> {
	return new TextDecoder().decode(await response.arrayBuffer());
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('CDN images', () => {
	it('rejects unsupported formats and missing IDs', async () => {
		expect((await request('/')).status).toBe(404);
		expect((await request('/uuid?format=html')).status).toBe(400);
		expect((await request('/uuid?res=huge')).status).toBe(400);
	});

	it('serves processed variants with immutable caching', async () => {
		await env.MEDIA_BUCKET.put('uuid/med.webp', 'image body');
		const response = await request('/uuid');
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('image/webp');
		expect(response.headers.get('Cache-Control')).toContain('immutable');
		expect(await body(response)).toBe('image body');
	});

	it('falls back to animated originals and localized processing placeholders', async () => {
		await env.MEDIA_BUCKET.put('animated/original.gif', 'gif body');
		const animated = await request('/animated?res=low&format=webp');
		expect(animated.headers.get('Content-Type')).toBe('image/gif');
		await env.MEDIA_BUCKET.put('_placeholder/processing.en.webp', 'english');
		await env.MEDIA_BUCKET.put('_placeholder/processing.es.webp', 'spanish');
		const missing = await request('/pending', { 'Accept-Language': 'en;q=0.3,es-MX;q=0.9' });
		expect(missing.status).toBe(200);
		expect(missing.headers.get('Cache-Control')).toBe('no-store');
		expect(await body(missing)).toBe('spanish');
	});
});

describe('CDN video', () => {
	it('never serves an image placeholder for an unprocessed video', async () => {
		await env.MEDIA_BUCKET.put('_placeholder/processing.en.webp', 'placeholder');
		expect((await request('/missing?format=video')).status).toBe(404);
	});

	it('supports full, bounded and suffix byte ranges', async () => {
		await env.MEDIA_BUCKET.put('video/video.mp4', 'abcdefghij');
		const full = await request('/video?format=video');
		expect(full.status).toBe(200);
		expect(full.headers.get('Accept-Ranges')).toBe('bytes');
		const bounded = await request('/video?format=video', { Range: 'bytes=2-5' });
		expect(bounded.status).toBe(206);
		expect(bounded.headers.get('Content-Range')).toBe('bytes 2-5/10');
		expect(await body(bounded)).toBe('cdef');
		const suffix = await request('/video?format=video', { Range: 'bytes=-3' });
		expect(await body(suffix)).toBe('hij');
		const invalid = await request('/video?format=video', { Range: 'bytes=20-' });
		expect(invalid.status).toBe(416);
		expect(invalid.headers.get('Content-Range')).toBe('bytes */10');
	});
});
