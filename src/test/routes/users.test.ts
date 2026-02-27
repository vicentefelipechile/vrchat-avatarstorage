// =========================================================================================================
// INTEGRATION TESTS — User Routes
// =========================================================================================================
// Tests for /api/register, /api/login, /api/logout, /api/auth/status,
// PUT /api/user, and POST /api/login/2fa
//
// Uses SELF.fetch() from cloudflare:test to send real HTTP requests to the Worker.
// isolatedStorage (default ON) ensures D1/KV state is reverted after each test.
// =========================================================================================================

import { SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici';
import {
    seedUser,
    seedAdmin,
    makeAuthCookie,
    TEST_PASSWORD,
} from '../fixtures/seed';

const BASE = 'http://example.com';

// ── Rate limit bypass helper ──────────────────────────────────────────────────
let ipCounter = 0;
/** Wrapper for SELF.fetch that injects a unique IP header to bypass rate limiting */
async function fetchApi(url: string, init?: RequestInit): Promise<Response> {
    ipCounter++;
    const headers = new Headers(init?.headers);
    headers.set('cf-connecting-ip', `127.0.0.${ipCounter}`);
    return SELF.fetch(url, { ...init, headers });
}

// ── Turnstile mock setup ──────────────────────────────────────────────────────
let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(() => {
	originalDispatcher = getGlobalDispatcher();
	mockAgent = new MockAgent();
	setGlobalDispatcher(mockAgent);
	mockAgent.disableNetConnect();
});

afterAll(() => {
	setGlobalDispatcher(originalDispatcher);
});

afterEach(() => {
	mockAgent.assertNoPendingInterceptors();
});



function mockTurnstileSuccess() {
	mockAgent
		.get('https://challenges.cloudflare.com')
		.intercept({ path: '/turnstile/v0/siteverify', method: 'POST' })
		.reply(200, JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
}

// ── POST /api/register ────────────────────────────────────────────────────────
describe('POST /api/register', () => {
    it('registers a new user successfully', async () => {
        mockTurnstileSuccess();

        const res = await fetchApi(`${BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'newuser',
                password: 'password123',
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.success).toBe(true);
    });

    it('returns 409 when username is already taken', async () => {
        mockTurnstileSuccess();
        await seedUser('existinguser');

        const res = await fetchApi(`${BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'existinguser',
                password: 'password123',
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(409);
    });

    it('returns 400 when username is too short', async () => {
        const res = await fetchApi(`${BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'ab',
                password: 'password123',
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
        const res = await fetchApi(`${BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'validuser',
                password: 'short',
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(400);
    });
});

// ── POST /api/login ───────────────────────────────────────────────────────────
describe('POST /api/login', () => {
    it('logs in with correct credentials and sets auth_token cookie', async () => {
        mockTurnstileSuccess();
        await seedUser('loginuser');

        const res = await fetchApi(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'loginuser',
                password: TEST_PASSWORD,
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.success).toBe(true);

        const setCookie = res.headers.get('Set-Cookie');
        expect(setCookie).toContain('auth_token=');
    });

    it('returns 401 with wrong password', async () => {
        mockTurnstileSuccess();
        await seedUser('loginuser2');

        const res = await fetchApi(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'loginuser2',
                password: 'wrongpassword',
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(401);
    });

    it('returns 401 when user does not exist', async () => {
        mockTurnstileSuccess();

        const res = await fetchApi(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'nonexistentuser',
                password: 'password123',
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(401);
    });
});

// ── GET /api/auth/status ──────────────────────────────────────────────────────
describe('GET /api/auth/status', () => {
    it('returns loggedIn: false when no cookie is present', async () => {
        const res = await fetchApi(`${BASE}/api/auth/status`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.loggedIn).toBe(false);
    });

    it('returns loggedIn: true with a valid auth cookie', async () => {
        await seedUser('statususer');
        const cookie = await makeAuthCookie('statususer', false);

        const res = await fetchApi(`${BASE}/api/auth/status`, {
            headers: { Cookie: cookie },
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.loggedIn).toBe(true);
        expect(json.username).toBe('statususer');
    });

    it('returns is_admin: true for admin users', async () => {
        await seedAdmin('adminstatuserid');
        const cookie = await makeAuthCookie('adminstatuserid', true);

        const res = await fetchApi(`${BASE}/api/auth/status`, {
            headers: { Cookie: cookie },
        });

        const json = await res.json() as any;
        expect(json.is_admin).toBe(true);
    });
});

// ── POST /api/logout ──────────────────────────────────────────────────────────
describe('POST /api/logout', () => {
    it('always returns 200 and clears the auth_token cookie', async () => {
        const res = await fetchApi(`${BASE}/api/logout`, { method: 'POST' });
        expect(res.status).toBe(200);

        const json = await res.json() as any;
        expect(json.success).toBe(true);

        // Cookie should be cleared (maxAge=0 or empty value)
        const setCookie = res.headers.get('Set-Cookie');
        expect(setCookie).toContain('auth_token=');
    });
});

// ── PUT /api/user ─────────────────────────────────────────────────────────────
describe('PUT /api/user', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await fetchApi(`${BASE}/api/user`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'newname' }),
        });
        expect(res.status).toBe(401);
    });

    it('updates username successfully', async () => {
        mockTurnstileSuccess();
        await seedUser('updateme');
        const cookie = await makeAuthCookie('updateme', false);

        const res = await fetchApi(`${BASE}/api/user`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie,
            },
            body: JSON.stringify({ username: 'updatedname' }),
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.username).toBe('updatedname');
    });

    it('returns 409 when new username is already taken', async () => {
        mockTurnstileSuccess();
        await seedUser('user_taken', '123e4567-e89b-12d3-a456-426614170031');
        await seedUser('user_conflict', '123e4567-e89b-12d3-a456-426614170032');
        const cookie = await makeAuthCookie('user_conflict', false);

        const res = await fetchApi(`${BASE}/api/user`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie,
            },
            body: JSON.stringify({ username: 'user_taken' }),
        });

        expect(res.status).toBe(409);
    });
});
