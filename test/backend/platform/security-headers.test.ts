// =========================================================================================================
// SECURITY HEADER TESTS
// Local development CSP exceptions must never leak into production responses.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { securityMiddleware } from '../../../src/http/middleware/security';

// =========================================================================================================
// Helpers
// =========================================================================================================

function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	securityMiddleware(app);
	app.get('/test', (c) => c.text('ok'));
	return app;
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('production and local media CSP', () => {
	it.each([
		'https://vrcstorage.lat/test',
		'https://vrcstorage.pages.dev/test',
		'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/test',
		'https://localhost.example.com/test',
		'https://127.0.0.1.example.com/test',
		'https://vrcstorage.lat/test?q=localhost',
	])('omits loopback exceptions on %s', async (url) => {
		const response = await createApp().request(url);
		const csp = response.headers.get('Content-Security-Policy')!;
		expect(response.status).toBe(200);
		expect(csp).not.toMatch(/localhost|127\.0\.0\.1/);
		expect(csp).toContain("img-src 'self' https: data: blob:");
		expect(csp).toContain("media-src 'self' https: data: blob:");
		expect(csp).toContain("object-src 'none'");
		expect(csp).toContain('https://challenges.cloudflare.com');
	});

	it.each(['http://localhost:8787/test', 'http://127.0.0.1:8787/test'])('keeps the local CDN working on %s', async (url) => {
		const csp = (await createApp().request(url)).headers.get('Content-Security-Policy')!;
		for (const directive of ['img-src', 'media-src']) {
			const value = csp.split(';').find((entry) => entry.trim().startsWith(`${directive} `))!;
			expect(value).toContain('http://localhost:8788');
			expect(value).toContain('http://127.0.0.1:8788');
		}
	});

	it('does not let local requests or a spoofed Host header change the production policy', async () => {
		const app = createApp();
		await app.request('http://localhost:8787/test');
		const response = await app.request('https://vrcstorage.lat/test', { headers: { Host: 'localhost:8787' } });
		expect(response.headers.get('Content-Security-Policy')).not.toMatch(/localhost|127\.0\.0\.1/);
	});
});
