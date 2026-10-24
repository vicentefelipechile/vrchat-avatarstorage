// =========================================================================================================
// GOOGLE OAUTH CRYPTO AND TOKEN TESTS
// =========================================================================================================
// Verify authorization scopes and real RS256 signatures without contacting Google.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildGoogleAuthUrl, buildGoogleDriveAuthUrl, exchangeGoogleCode, refreshGoogleAccessToken, verifyGoogleIdToken } from '../../../src/auth/google';

// =========================================================================================================
// Helpers
// =========================================================================================================

function base64url(data: Uint8Array): string {
	return btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signedToken(privateKey: CryptoKey, overrides: Record<string, unknown> = {}): Promise<string> {
	const header = base64url(new TextEncoder().encode(JSON.stringify({ kid: 'test-key', alg: 'RS256' })));
	const payload = base64url(new TextEncoder().encode(JSON.stringify({ sub: 'google-id', email: 'tester@example.com', email_verified: true, name: 'Tester', picture: '', iss: 'https://accounts.google.com', aud: 'local-client', exp: Math.floor(Date.now() / 1000) + 300, ...overrides })));
	const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${header}.${payload}`));
	return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
}

// =========================================================================================================
// Tests
// =========================================================================================================

afterEach(() => vi.unstubAllGlobals());

describe('Google OAuth', () => {
	it('requests identity only at login, with separate Drive consent and offline access', () => {
		const login = new URL(buildGoogleAuthUrl('local-client', 'https://vrcstorage.lat/callback', 'csrf-token'));
		const drive = new URL(buildGoogleDriveAuthUrl('local-client', 'https://vrcstorage.lat/drive-callback', 'csrf-token'));
		expect(login.searchParams.get('scope')).toBe('openid email profile');
		expect(login.searchParams.get('state')).toBe('csrf-token');
		expect(login.searchParams.get('access_type')).toBe('online');
		expect(drive.searchParams.get('scope')).toContain('drive.file');
		expect(drive.searchParams.get('access_type')).toBe('offline');
	});

	it('exchanges a code and handles refresh failures without using the real Google API', async () => {
		const fakeFetch = vi.fn().mockResolvedValueOnce(Response.json({ id_token: 'signed-token' }))
			.mockResolvedValueOnce(new Response('denied', { status: 400 }));
		vi.stubGlobal('fetch', fakeFetch);
		expect(await exchangeGoogleCode('code', 'client', 'secret', 'https://vrcstorage.lat/callback')).toEqual({ id_token: 'signed-token' });
		expect(fakeFetch.mock.calls[0][1].body.get('grant_type')).toBe('authorization_code');
		await expect(refreshGoogleAccessToken('expired', 'client', 'secret')).rejects.toThrow('Google refresh failed');
	});

	it('accepts a valid locally signed Google ID token and rejects wrong audience and expiry', async () => {
		const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
		const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
		await env.VRCSTORAGE_KV.put('jwks:google', JSON.stringify({ keys: [{ kid: 'test-key', n: jwk.n, e: jwk.e, use: 'sig', alg: 'RS256' }] }));
		const valid = await signedToken(keys.privateKey);
		expect(await verifyGoogleIdToken(valid, 'local-client', env.VRCSTORAGE_KV)).toMatchObject({ sub: 'google-id', email: 'tester@example.com' });
		await expect(verifyGoogleIdToken(await signedToken(keys.privateKey, { aud: 'another-client' }), 'local-client', env.VRCSTORAGE_KV)).rejects.toThrow();
		await expect(verifyGoogleIdToken(await signedToken(keys.privateKey, { exp: 1 }), 'local-client', env.VRCSTORAGE_KV)).rejects.toThrow();
		await expect(verifyGoogleIdToken(valid, 'local-client', env.VRCSTORAGE_KV)).resolves.toMatchObject({ sub: 'google-id' });
	});

	it('rejects missing, malformed and non-RS256 tokens before key lookup', async () => {
		await expect(verifyGoogleIdToken('', 'client', env.VRCSTORAGE_KV)).rejects.toThrow('Missing id_token');
		await expect(verifyGoogleIdToken('invalid', 'client', env.VRCSTORAGE_KV)).rejects.toThrow('Invalid JWT structure');
		const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'none' })));
		await expect(verifyGoogleIdToken(`${header}.e30.invalid`, 'client', env.VRCSTORAGE_KV)).rejects.toThrow('Unexpected JWT algorithm');
	});
});
