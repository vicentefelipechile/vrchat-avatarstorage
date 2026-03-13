// ============================================================================
// 2FA Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { makeAuthCookie, request, getNormalUser } from '../helpers';

// Unique IP per suite to isolate rate limiter counters.
const TEST_IP = '10.0.0.7';

// ============================================================================
// Setup
// ============================================================================

let normalCookie: string;

beforeAll(async () => {
	const normal = await getNormalUser();
	normalCookie = await makeAuthCookie(normal.username, false);
});

// ============================================================================
// GET /api/2fa/status
// ============================================================================

describe('GET /api/2fa/status', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('GET', '/api/2fa/status', undefined, undefined, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 200 with enabled=false for a seeded user without 2FA', async () => {
		const res = await request('GET', '/api/2fa/status', normalCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { enabled: boolean };
		expect(body.enabled).toBe(false);
	});
});

// ============================================================================
// POST /api/2fa/setup
// NOTE: The route calls `verifyPassword()` without `await` (known bug in
// src/routes/2fa.ts line 37), so any password is currently accepted. The
// test reflects actual behavior and includes a comment about the bug.
// ============================================================================

describe('POST /api/2fa/setup', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', '/api/2fa/setup', undefined, { password: 'password' }, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 400 when body is missing password field', async () => {
		const res = await request('POST', '/api/2fa/setup', normalCookie, {}, '10.0.7.1');
		expect(res.status).toBe(400);
	});

	it('returns 200 and a TOTP secret (password check not awaited — known bug)', async () => {
		// The route does not `await verifyPassword(...)`, so any string passes.
		// When the bug is fixed this test should change to expect 401 for a wrong password
		// and a separate test should cover the correct password → 200 path.
		const res = await request('POST', '/api/2fa/setup', normalCookie, { password: 'any-string' }, '10.0.7.2');
		expect(res.status).toBe(200);

		const body = await res.json() as { secret: string; otpauthUrl: string };
		expect(typeof body.secret).toBe('string');
		expect(typeof body.otpauthUrl).toBe('string');
	});
});

// ============================================================================
// POST /api/2fa/verify — requires a 2FA secret to already be set
// ============================================================================

describe('POST /api/2fa/verify', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', '/api/2fa/verify', undefined, { code: '123456' }, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 400 when code is missing', async () => {
		const res = await request('POST', '/api/2fa/verify', normalCookie, {}, '10.0.7.3');
		expect(res.status).toBe(400);
	});

	it('returns 400 when 2FA is not fully enabled (setup called but verify not confirmed yet)', async () => {
		// After calling setup, `temp_two_factor_secret` is stored but
		// `two_factor_enabled` is still 0. The verify endpoint checks for
		// `two_factor_enabled = 1` before validating the code, so it returns
		// 400 ("2FA not set up") at this stage, not 401 ("Invalid code").
		const res = await request('POST', '/api/2fa/verify', normalCookie, { code: '000000' }, '10.0.7.4');
		expect(res.status).toBe(400);
	});
});

// ============================================================================
// POST /api/2fa/disable
// ============================================================================

describe('POST /api/2fa/disable', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', '/api/2fa/disable', undefined, { password: 'password' }, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 400 when body is missing password', async () => {
		const res = await request('POST', '/api/2fa/disable', normalCookie, {}, '10.0.7.5');
		expect(res.status).toBe(400);
	});

	it('returns 400 when 2FA is not enabled for the user', async () => {
		// normalUser had setup called above but NOT verify, so two_factor_enabled = 0 still
		const res = await request('POST', '/api/2fa/disable', normalCookie, {
			password: 'doesnt-matter-2fa-not-enabled',
		}, '10.0.7.6');
		expect(res.status).toBe(400);
	});
});
