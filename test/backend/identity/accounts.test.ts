// =========================================================================================================
// ACCOUNT REGISTRATION AND SESSION TESTS
// =========================================================================================================
// Exercise password hashing, login, secure session cookies and logout against local D1/KV.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

// =========================================================================================================
// Helpers
// =========================================================================================================

function post(path: string, body: unknown, cookie?: string): Promise<Response> {
	return exports.default.fetch(`http://localhost:8787${path}`, {
		method: 'POST',
		headers: { Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
		body: JSON.stringify(body),
	});
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('account lifecycle', () => {
	it('registers, hashes the password and issues an HTTP-only session', async () => {
		const registered = await post('/api/auth/register', { username: 'newuser', password: 'strong-password-123' });
		expect(registered.status).toBe(200);
		const cookie = registered.headers.get('Set-Cookie') ?? '';
		expect(cookie).toContain('auth_token=');
		expect(cookie).toContain('HttpOnly');
		const user = await env.DB.prepare('SELECT password_hash FROM users WHERE username = ?').bind('newuser').first<{ password_hash: string }>();
		expect(user?.password_hash).not.toBe('strong-password-123');
		const status = await exports.default.fetch('http://localhost:8787/api/auth/status', { headers: { Cookie: cookie } });
		expect(await status.json()).toMatchObject({ loggedIn: true, username: 'newuser' });
	}, 15_000);

	it('rejects invalid passwords and unknown usernames without issuing a session', async () => {
		await post('/api/auth/register', { username: 'newuser', password: 'strong-password-123' });
		for (const [username, password] of [['newuser', 'incorrect'], ['missing', 'strong-password-123']]) {
			const response = await post('/api/auth/login', { username, password });
			expect(response.status).toBe(401);
			expect(response.headers.get('Set-Cookie')).toBeNull();
		}
	}, 15_000);

	it('denylists a logged-out cookie so it cannot be replayed', async () => {
		const registered = await post('/api/auth/register', { username: 'newuser', password: 'strong-password-123' });
		const cookie = (registered.headers.get('Set-Cookie') ?? '').split(';')[0];
		const logout = await post('/api/auth/logout', {}, cookie);
		expect(logout.status).toBe(200);
		const status = await exports.default.fetch('http://localhost:8787/api/auth/status', { headers: { Cookie: cookie } });
		expect(await status.json()).toMatchObject({ loggedIn: false });
	}, 15_000);
});
