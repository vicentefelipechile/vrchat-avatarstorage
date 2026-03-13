// ============================================================================
// User Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { makeAuthCookie, request, getAdminUser, getNormalUser } from '../helpers';

// Each test file uses a distinct IP so the rate limiter (keyed on CF-Connecting-IP)
// never bleeds between suites. RL_STRICT = 1 req/60s per IP — unique IPs guarantee
// the first request in each describe always reaches the route logic, not the limiter.
const TEST_IP = '10.0.0.3';

// ============================================================================
// Setup
// ============================================================================

let adminCookie: string;
let normalCookie: string;
let normalUsername: string;

beforeAll(async () => {
	const admin = await getAdminUser();
	const normal = await getNormalUser();

	adminCookie = await makeAuthCookie(admin.username, true);
	normalCookie = await makeAuthCookie(normal.username, false);
	normalUsername = normal.username;
});

// ============================================================================
// GET /api/auth/status
// ============================================================================

describe('GET /api/auth/status', () => {
	it('returns loggedIn=false when unauthenticated', async () => {
		const res = await request('GET', '/api/auth/status', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { loggedIn: boolean; username: string | null; is_admin: boolean };
		expect(body.loggedIn).toBe(false);
		expect(body.username).toBeNull();
		expect(body.is_admin).toBe(false);
	});

	it('returns loggedIn=true with username for a normal user', async () => {
		const res = await request('GET', '/api/auth/status', normalCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { loggedIn: boolean; username: string; is_admin: boolean };
		expect(body.loggedIn).toBe(true);
		expect(body.username).toBe(normalUsername);
		expect(body.is_admin).toBe(false);
	});

	it('returns is_admin=true for an admin user', async () => {
		const admin = await getAdminUser();
		const res = await request('GET', '/api/auth/status', adminCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { loggedIn: boolean; username: string; is_admin: boolean };
		expect(body.loggedIn).toBe(true);
		expect(body.username).toBe(admin.username);
		expect(body.is_admin).toBe(true);
	});
});

// ============================================================================
// POST /api/logout
// ============================================================================

describe('POST /api/logout', () => {
	it('returns success even when unauthenticated', async () => {
		const res = await request('POST', '/api/logout', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);
	});

	it('returns success when authenticated', async () => {
		const res = await request('POST', '/api/logout', normalCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);
	});
});

// ============================================================================
// POST /api/register
// NOTE: The test env uses TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'
// (Cloudflare's official always-pass test key), so token validation always succeeds.
// We test: body validation (400), duplicate username (409), and successful registration.
// The Turnstile 403 rejection path is not testable in this configuration by design.
// ============================================================================

describe('POST /api/register', () => {
	it('returns 400 when body is empty', async () => {
		const res = await request('POST', '/api/register', undefined, {}, TEST_IP);
		expect(res.status).toBe(400);
	});

	it('returns 400 when password is too short', async () => {
		const res = await request('POST', '/api/register', undefined, {
			username: 'validuser',
			password: 'short',
			token: 'any',
		}, '10.0.5.1');
		expect(res.status).toBe(400);
	});

	it('returns 409 when username is already taken', async () => {
		const res = await request('POST', '/api/register', undefined, {
			username: normalUsername, // already exists in seed data
			password: 'validPassword123',
			token: 'any',
		}, '10.0.5.2');
		expect(res.status).toBe(409);
	});

	it('registers a new user successfully', async () => {
		const newUser = `testuser_${Date.now()}`;
		const res = await request('POST', '/api/register', undefined, {
			username: newUser,
			password: 'validPassword123',
			token: 'any',
		}, '10.0.5.3');
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);

		// Verify it's in DB
		const row = await env.DB.prepare('SELECT username FROM users WHERE username = ?').bind(newUser).first<{ username: string }>();
		expect(row?.username).toBe(newUser);
	});
});

// ============================================================================
// POST /api/login
// NOTE: Same Turnstile caveat as /api/register above.
// ============================================================================

describe('POST /api/login', () => {
	it('returns 400 when body is empty', async () => {
		const res = await request('POST', '/api/login', undefined, {}, TEST_IP);
		expect(res.status).toBe(400);
	});

	it('returns 401 for invalid credentials', async () => {
		const res = await request('POST', '/api/login', undefined, {
			username: normalUsername,
			password: 'completely-wrong-password',
			token: 'any',
		}, '10.0.6.1');
		expect(res.status).toBe(401);
	});

	it('returns 401 for a non-existent user', async () => {
		const res = await request('POST', '/api/login', undefined, {
			username: 'userThatDoesNotExist999',
			password: 'somepassword123',
			token: 'any',
		}, '10.0.6.2');
		expect(res.status).toBe(401);
	});
});

// ============================================================================
// PUT /api/user
// ============================================================================

describe('PUT /api/user', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('PUT', '/api/user', undefined, { avatar_url: 'https://example.com/avatar.png' }, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('updates avatar_url successfully', async () => {
		const newAvatarUrl = 'https://example.com/new-avatar.png';
		const res = await request('PUT', '/api/user', normalCookie, { avatar_url: newAvatarUrl }, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { success: boolean; avatar_url: string };
		expect(body.success).toBe(true);
		expect(body.avatar_url).toBe(newAvatarUrl);
	});

	it('returns 409 when the new username is already taken', async () => {
		const admin = await getAdminUser();
		const res = await request('PUT', '/api/user', normalCookie, { username: admin.username }, TEST_IP);
		expect(res.status).toBe(409);
	});
});
