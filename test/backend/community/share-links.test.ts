// =========================================================================================================
// SHARE LINK INTEGRATION TESTS
// =========================================================================================================
// Exercise the HTTP route, service, D1 atomic consumption and local R2 together.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createMedia, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('private share links', () => {
	it('requires authentication and rejects public media or invalid expiry options', async () => {
		const key = await createMedia('image');
		const payload = { r2_key: key, expires_in: 300, max_uses: 1 };
		const anonymous = await exports.default.fetch('http://localhost:8787/api/share', { method: 'POST', headers: { Origin: 'https://vrcstorage.lat' } });
		expect(anonymous.status).toBe(401);

		const { cookie } = await createUser();
		const invalid = await exports.default.fetch('http://localhost:8787/api/share', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, expires_in: 301 }) });
		expect(invalid.status).toBe(400);

		const publicMedia = await exports.default.fetch('http://localhost:8787/api/share', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		expect(publicMedia.status).toBe(404);
	});

	it('does not spend a use on preview or HEAD and serves a private file only once', async () => {
		const { cookie } = await createUser();
		const key = await createMedia('file', 'example<&".zip');
		await env.BUCKET.put(key, 'private contents', { httpMetadata: { contentType: 'text/html' } });
		const created = await exports.default.fetch('http://localhost:8787/api/share', {
			method: 'POST',
			headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ r2_key: key, expires_in: 300, max_uses: 1 }),
		});
		expect(created.status).toBe(201);
		const link = (await created.json()) as { url: string; uuid: string; token: string };

		const preview = await exports.default.fetch(link.url, { headers: { 'User-Agent': 'Discordbot/2.0' } });
		expect(preview.status).toBe(200);
		expect(await preview.text()).toContain('example&lt;&amp;&quot;.zip');
		expect((await exports.default.fetch(link.url, { method: 'HEAD' })).status).toBe(200);

		const downloaded = await exports.default.fetch(link.url);
		expect(downloaded.status).toBe(200);
		expect(new TextDecoder().decode(await downloaded.arrayBuffer())).toBe('private contents');
		expect(downloaded.headers.get('Content-Type')).toBe('application/octet-stream');
		expect(downloaded.headers.get('Content-Disposition')).toContain('attachment;');
		expect((await exports.default.fetch(link.url)).status).toBe(404);
		expect((await exports.default.fetch(link.url, { headers: { 'User-Agent': 'Discordbot' } })).status).toBe(404);
		const stored = await env.DB.prepare('SELECT uses FROM share_links WHERE uuid = ?').bind(link.uuid).first<{ uses: number }>();
		expect(stored?.uses).toBe(1);
	});

	it('only the owner can revoke a link', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const key = await createMedia();
		const created = await exports.default.fetch('http://localhost:8787/api/share', {
			method: 'POST', headers: { Cookie: owner.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ r2_key: key, expires_in: 300 }),
		});
		expect(created.status).toBe(201);
		const link = (await created.json()) as { uuid: string; url: string };
		expect((await exports.default.fetch(`http://localhost:8787/api/share/${link.uuid}`, { method: 'DELETE', headers: { Cookie: other.cookie, Origin: 'https://vrcstorage.lat' } })).status).toBe(403);
		expect((await exports.default.fetch(`http://localhost:8787/api/share/${link.uuid}`, { method: 'DELETE', headers: { Cookie: owner.cookie, Origin: 'https://vrcstorage.lat' } })).status).toBe(200);
		expect((await exports.default.fetch(link.url, { headers: { 'User-Agent': 'Discordbot' } })).status).toBe(404);
	});

	it('cannot consume a one-use token twice under concurrent requests', async () => {
		const { cookie } = await createUser();
		const key = await createMedia();
		await env.BUCKET.put(key, 'archive');
		const created = await exports.default.fetch('http://localhost:8787/api/share', {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ r2_key: key, expires_in: 300, max_uses: 1 }),
		});
		expect(created.status).toBe(201);
		const { url } = (await created.json()) as { url: string };
		const responses = await Promise.all([exports.default.fetch(url), exports.default.fetch(url)]);
		expect(responses.map((response) => response.status).sort()).toEqual([200, 404]);
	});

	it('treats expired and unknown tokens alike without incrementing usage', async () => {
		const { cookie } = await createUser();
		const key = await createMedia();
		await env.BUCKET.put(key, 'archive');
		const created = await exports.default.fetch('http://localhost:8787/api/share', {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ r2_key: key, expires_in: 300 }),
		});
		const { token } = (await created.json()) as { token: string };
		await env.DB.prepare('UPDATE share_links SET expires_at = ? WHERE token = ?').bind(Math.floor(Date.now() / 1000) - 1, token).run();
		for (const value of [token, 'not-a-token']) {
			expect((await exports.default.fetch(`http://localhost:8787/share/${value}`)).status).toBe(404);
		}
		const link = await env.DB.prepare('SELECT uses FROM share_links WHERE token = ?').bind(token).first<{ uses: number }>();
		expect(link?.uses).toBe(0);
	});
});
