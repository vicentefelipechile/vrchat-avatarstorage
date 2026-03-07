// ============================================================================
// Auth Module Tests
// ============================================================================
// Tests for getAuthUser(), createSession(), deleteSession() via the worker.
// All session logic is exercised through HTTP — no unit-mocking of internals.
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { makeAuthCookie, request, getAdminUser, getNormalUser } from '../helpers';

// ============================================================================
// Setup
// ============================================================================

let adminUsername: string;
let normalUsername: string;
let adminCookie: string;
let normalCookie: string;

beforeAll(async () => {
    const admin = await getAdminUser();
    const normal = await getNormalUser();

    adminUsername = admin.username;
    normalUsername = normal.username;
    adminCookie = await makeAuthCookie(admin.username, true);
    normalCookie = await makeAuthCookie(normal.username, false);
});

// ============================================================================
// getAuthUser — via GET /api/auth/status
// ============================================================================

describe('getAuthUser()', () => {
    it('returns loggedIn:false when no cookie is sent', async () => {
        const res = await request('GET', '/api/auth/status');
        expect(res.status).toBe(200);
        const body = await res.json() as { loggedIn: boolean };
        expect(body.loggedIn).toBe(false);
    });

    it('returns loggedIn:true and correct username for a valid admin cookie', async () => {
        const res = await request('GET', '/api/auth/status', adminCookie);
        expect(res.status).toBe(200);
        const body = await res.json() as { loggedIn: boolean; username: string; is_admin: boolean };
        expect(body.loggedIn).toBe(true);
        expect(body.username).toBe(adminUsername);
        expect(body.is_admin).toBe(true);
    });

    it('returns loggedIn:true and is_admin:false for a normal user cookie', async () => {
        const res = await request('GET', '/api/auth/status', normalCookie);
        expect(res.status).toBe(200);
        const body = await res.json() as { loggedIn: boolean; username: string; is_admin: boolean };
        expect(body.loggedIn).toBe(true);
        expect(body.username).toBe(normalUsername);
        expect(body.is_admin).toBe(false);
    });

    it('returns loggedIn:false for a malformed / tampered cookie', async () => {
        const res = await request('GET', '/api/auth/status', 'auth_token=this.is.not.a.valid.jwt');
        expect(res.status).toBe(200);
        const body = await res.json() as { loggedIn: boolean };
        expect(body.loggedIn).toBe(false);
    });

    it('returns 401 on protected routes when no cookie is sent', async () => {
        const res = await request('GET', '/api/admin/pending');
        expect(res.status).toBe(401);
    });

    it('returns 403 on admin routes when authenticated as a normal user', async () => {
        const res = await request('GET', '/api/admin/pending', normalCookie);
        expect(res.status).toBe(403);
    });
});

// ============================================================================
// createSession — via POST /api/logout + re-check
// ============================================================================

describe('createSession()', () => {
    it('produces a cookie that authenticates the user on subsequent requests', async () => {
        // We already have a signed cookie — prove it works end-to-end
        const res = await request('GET', '/api/auth/status', adminCookie);
        const body = await res.json() as { loggedIn: boolean };
        expect(body.loggedIn).toBe(true);
    });
});

// ============================================================================
// deleteSession — via POST /api/logout
// ============================================================================

describe('deleteSession()', () => {
    it('returns 200 and clears the session cookie', async () => {
        const res = await request('POST', '/api/logout', adminCookie);
        expect(res.status).toBe(200);

        const body = await res.json() as { success: boolean };
        expect(body.success).toBe(true);

        // The Set-Cookie header should clear the token (maxAge=0)
        const setCookie = res.headers.get('set-cookie') ?? '';
        expect(setCookie).toContain('auth_token=');
        expect(setCookie).toContain('Max-Age=0');
    });
});
