// =========================================================================================================
// OAUTH ACCOUNT INTEGRATION TESTS
// =========================================================================================================
// New identities require a one-time username selection; existing links resolve without email auto-linking.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';
import { createExecutionContext } from 'cloudflare:test';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { OAuthService } from '../../../src/services/oauth-service';
import worker from '../../../src/index';
import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

function oauthRequest(path: string, init?: RequestInit): Promise<Response> {
	return worker.fetch(new Request(`http://localhost:8787/api/auth${path}`, init), env, createExecutionContext());
}

// =========================================================================================================
// Tests
// =========================================================================================================

afterEach(() => vi.unstubAllGlobals());

describe('OAuth registration', () => {
	it('issues a pending token instead of auto-linking accounts by email', async () => {
		await createUser('existing');
		const service = new OAuthService(env.DB, env.VRCSTORAGE_KV);
		const resolved = await service.resolveIdentity({ provider: 'google', providerId: 'google-user-1', email: 'existing@example.com', avatarUrl: null });
		expect(resolved.status).toBe('pending');
		if (resolved.status !== 'pending') throw new Error('Expected pending registration');
		expect(await env.VRCSTORAGE_KV.get(`oauth_pending:${resolved.pendingToken}`)).toContain('google-user-1');
		await expect(service.completeRegistration(resolved.pendingToken, 'existing')).rejects.toMatchObject({ status: 409 });
		await expect(service.completeRegistration(resolved.pendingToken, 'another')).rejects.toMatchObject({ status: 410 });
	});

	it('creates one linked OAuth account and consumes the pending token', async () => {
		const service = new OAuthService(env.DB, env.VRCSTORAGE_KV);
		const identity = { provider: 'google' as const, providerId: 'google-user-2', email: 'new@example.com', avatarUrl: null };
		const pending = await service.resolveIdentity(identity);
		if (pending.status !== 'pending') throw new Error('Expected pending registration');
		const registered = await service.completeRegistration(pending.pendingToken, 'newuser');
		expect(registered).toMatchObject({ username: 'newuser', is_admin: 0 });
		await expect(service.completeRegistration(pending.pendingToken, 'second')).rejects.toMatchObject({ status: 410 });
		expect(await service.resolveIdentity(identity)).toMatchObject({ status: 'existing', user_uuid: registered.user_uuid, username: 'newuser' });
	});

	it('redirects to Google with one-time state and handles denied or expired callbacks', async () => {
		const start = await oauthRequest('/google');
		expect(start.status).toBe(302);
		const authorization = new URL(start.headers.get('Location')!);
		expect(authorization.hostname).toBe('accounts.google.com');
		const state = authorization.searchParams.get('state')!;
		expect(await env.VRCSTORAGE_KV.get(`oauth_state:${state}`)).toBe('1');
		expect((await oauthRequest('/google/callback?error=access_denied')).headers.get('Location')).toBe('/login?error=oauth_denied');
		expect((await oauthRequest('/google/callback')).status).toBe(400);
		expect((await oauthRequest('/google/callback?code=x&state=expired')).status).toBe(400);
	});

	it('completes username registration from the body token for older clients', async () => {
		const pending = await new OAuthService(env.DB, env.VRCSTORAGE_KV).resolveIdentity({ provider: 'google', providerId: 'legacy-client', email: null, avatarUrl: null });
		if (pending.status !== 'pending') throw new Error('Expected pending registration');
		const response = await oauthRequest('/complete', {
			method: 'POST', headers: { Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: pending.pendingToken, username: 'legacyuser' }),
		});
		expect(response.status).toBe(200);
		expect(response.headers.get('Set-Cookie')).toContain('auth_token=');
		expect(response.headers.get('Set-Cookie')).toContain('oauth_pending_token=');
		const authCookie = response.headers.get('Set-Cookie')!.match(/auth_token=[^;,]+/)![0];
		expect(await (await exports.default.fetch('http://localhost:8787/api/auth/status', { headers: { Cookie: authCookie } })).json()).toMatchObject({ loggedIn: true, username: 'legacyuser' });
	});

	it('validates completion credentials before consuming pending registration', async () => {
		const valid = await oauthRequest('/complete', {
			method: 'POST', headers: { Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'validname' }),
		});
		expect(valid.status).toBe(401);
		const invalid = await oauthRequest('/complete', {
			method: 'POST', headers: { Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'x', username: 'invalid name' }),
		});
		expect(invalid.status).toBe(400);
	});

	it('consumes OAuth state before handling token exchange errors', async () => {
		await env.VRCSTORAGE_KV.put('oauth_state:test-state', '1');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ access_token: 'no-id-token' })));
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const response = await oauthRequest('/google/callback?code=code&state=test-state');
			expect(response.status).toBe(302);
			expect(response.headers.get('Location')).toBe('/login?error=oauth_failed');
			expect(await env.VRCSTORAGE_KV.get('oauth_state:test-state')).toBeNull();
		} finally {
			error.mockRestore();
		}
	});
});
