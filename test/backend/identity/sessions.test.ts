// =========================================================================================================
// SESSION INTEGRATION TESTS
// =========================================================================================================
// A signed session must resolve through D1/KV and honor bans and revocation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('sessions', () => {
	it('resolves a valid session, rejects an invalid cookie and a banned account', async () => {
		const { uuid, cookie } = await createUser();
		const url = 'http://localhost:8787/api/auth/status';
		expect((await (await exports.default.fetch(url)).json() as { loggedIn: boolean }).loggedIn).toBe(false);
		expect((await (await exports.default.fetch(url, { headers: { Cookie: cookie } })).json() as { username: string }).username).toBe('tester');
		expect((await (await exports.default.fetch(url, { headers: { Cookie: 'auth_token=invalid' } })).json() as { loggedIn: boolean }).loggedIn).toBe(false);
		await env.VRCSTORAGE_KV.delete('user:tester');
		await env.DB.prepare('UPDATE users SET is_banned = 1 WHERE uuid = ?').bind(uuid).run();
		expect((await (await exports.default.fetch(url, { headers: { Cookie: cookie } })).json() as { loggedIn: boolean }).loggedIn).toBe(false);
	});

	it('honors a revoked JWT even if the session is cached', async () => {
		const { cookie } = await createUser();
		const url = 'http://localhost:8787/api/auth/status';
		await exports.default.fetch(url, { headers: { Cookie: cookie } });
		const token = cookie.slice('auth_token='.length);
		const payload = JSON.parse(atob(token.split('.')[1]!)) as { jti: string };
		await env.VRCSTORAGE_KV.put(`deny:${payload.jti}`, '1');
		expect((await (await exports.default.fetch(url, { headers: { Cookie: cookie } })).json() as { loggedIn: boolean }).loggedIn).toBe(false);
	});
});
