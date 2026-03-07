// ============================================================================
// Test Helpers Tests
// ============================================================================
// Verifies that all helper functions return valid, seeded data and that
// the request() dispatcher correctly reaches the worker.
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import {
    makeAuthCookie,
    request,
    getAdminUser,
    getNormalUser,
    getAnotherNormalUser,
    getPendingResource,
    getActiveResource,
    getActiveResourceByOwner,
    getAnyComment,
    getAnyWikiComment,
    getAnyTag,
} from './helpers';

// ============================================================================
// makeAuthCookie
// ============================================================================

describe('makeAuthCookie', () => {
    it('returns a string in the form auth_token=<jwt>', async () => {
        const cookie = await makeAuthCookie('testuser', false);
        expect(cookie).toMatch(/^auth_token=[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it('generates different tokens for admin vs non-admin', async () => {
        const user = await makeAuthCookie('x', false);
        const admin = await makeAuthCookie('x', true);
        expect(user).not.toBe(admin);
    });
});

// ============================================================================
// request()
// ============================================================================

describe('request()', () => {
    it('reaches the worker and returns a Response', async () => {
        // /api/auth/status is a lightweight, always-available endpoint
        const res = await request('GET', '/api/auth/status');
        expect(res).toBeInstanceOf(Response);
        expect(res.status).toBeGreaterThanOrEqual(200);
    });

    it('forwards the Cookie header correctly', async () => {
        const admin = await getAdminUser();
        const cookie = await makeAuthCookie(admin.username, true);
        const res = await request('GET', '/api/auth/status', cookie);
        expect(res.status).toBe(200);
        const body = await res.json() as { loggedIn: boolean };
        expect(body.loggedIn).toBe(true);
    });

    it('sends a JSON body when provided', async () => {
        // Posting to an endpoint that validates a body (register requires Turnstile,
        // so we just check that the request doesn't explode at the transport level)
        const res = await request('POST', '/api/register', undefined, {
            username: 'test',
            password: 'test',
            token: 'dummy',
        });
        // Any non-5xx response means the body was received and parsed
        expect(res.status).not.toBe(500);
    });
});

// ============================================================================
// DB query helpers — Users
// ============================================================================

describe('getAdminUser()', () => {
    it('returns a user with uuid and username', async () => {
        const user = await getAdminUser();
        expect(typeof user.uuid).toBe('string');
        expect(user.uuid.length).toBeGreaterThan(0);
        expect(typeof user.username).toBe('string');
    });

    it('returned user is actually an admin in the DB', async () => {
        const user = await getAdminUser();
        const row = await env.DB
            .prepare('SELECT is_admin FROM users WHERE uuid = ?')
            .bind(user.uuid)
            .first<{ is_admin: number }>();
        expect(row?.is_admin).toBe(1);
    });
});

describe('getNormalUser()', () => {
    it('returns a user with uuid and username', async () => {
        const user = await getNormalUser();
        expect(typeof user.uuid).toBe('string');
        expect(typeof user.username).toBe('string');
    });

    it('returned user is not an admin in the DB', async () => {
        const user = await getNormalUser();
        const row = await env.DB
            .prepare('SELECT is_admin FROM users WHERE uuid = ?')
            .bind(user.uuid)
            .first<{ is_admin: number }>();
        expect(row?.is_admin).toBe(0);
    });
});

describe('getAnotherNormalUser()', () => {
    it('returns a different user than getNormalUser()', async () => {
        const first = await getNormalUser();
        const second = await getAnotherNormalUser();
        expect(second.uuid).not.toBe(first.uuid);
    });
});

// ============================================================================
// DB query helpers — Resources
// ============================================================================

describe('getPendingResource()', () => {
    it('returns a resource with uuid and category', async () => {
        const r = await getPendingResource();
        expect(typeof r.uuid).toBe('string');
        expect(typeof r.category).toBe('string');
    });

    it('returned resource is inactive in the DB', async () => {
        const r = await getPendingResource();
        const row = await env.DB
            .prepare('SELECT is_active FROM resources WHERE uuid = ?')
            .bind(r.uuid)
            .first<{ is_active: number }>();
        expect(row?.is_active).toBe(0);
    });
});

describe('getActiveResource()', () => {
    it('returns a resource with uuid, category and author_uuid', async () => {
        const r = await getActiveResource();
        expect(typeof r.uuid).toBe('string');
        expect(typeof r.category).toBe('string');
        expect(typeof r.author_uuid).toBe('string');
    });

    it('returned resource is active in the DB', async () => {
        const r = await getActiveResource();
        const row = await env.DB
            .prepare('SELECT is_active FROM resources WHERE uuid = ?')
            .bind(r.uuid)
            .first<{ is_active: number }>();
        expect(row?.is_active).toBe(1);
    });
});

describe('getActiveResourceByOwner()', () => {
    it('returns null for a UUID that owns no active resources', async () => {
        const result = await getActiveResourceByOwner('00000000-0000-0000-0000-000000000000');
        expect(result).toBeNull();
    });

    it('returns a resource whose author_uuid matches the given UUID', async () => {
        const active = await getActiveResource();
        const result = await getActiveResourceByOwner(active.author_uuid);
        expect(result).not.toBeNull();
        // Verify in DB
        const row = await env.DB
            .prepare('SELECT author_uuid, is_active FROM resources WHERE uuid = ?')
            .bind(result!.uuid)
            .first<{ author_uuid: string; is_active: number }>();
        expect(row?.author_uuid).toBe(active.author_uuid);
        expect(row?.is_active).toBe(1);
    });
});

// ============================================================================
// DB query helpers — Comments
// ============================================================================

describe('getAnyComment()', () => {
    it('returns a comment with uuid, resource_uuid and author_uuid', async () => {
        const c = await getAnyComment();
        expect(typeof c.uuid).toBe('string');
        expect(typeof c.resource_uuid).toBe('string');
        expect(typeof c.author_uuid).toBe('string');
    });

    it('filters by author_uuid when provided', async () => {
        const c = await getAnyComment(); // get one to know a valid author
        const filtered = await getAnyComment(c.author_uuid);
        expect(filtered.author_uuid).toBe(c.author_uuid);
    });
});

// ============================================================================
// DB query helpers — Wiki Comments
// ============================================================================

describe('getAnyWikiComment()', () => {
    it('returns a wiki comment with uuid and author_uuid', async () => {
        const wc = await getAnyWikiComment();
        expect(typeof wc.uuid).toBe('string');
        expect(typeof wc.author_uuid).toBe('string');
    });

    it('filters by author_uuid when provided', async () => {
        const wc = await getAnyWikiComment();
        const filtered = await getAnyWikiComment(wc.author_uuid);
        expect(filtered.author_uuid).toBe(wc.author_uuid);
    });
});

// ============================================================================
// DB query helpers — Tags
// ============================================================================

describe('getAnyTag()', () => {
    it('returns a tag with id and name', async () => {
        const tag = await getAnyTag();
        expect(typeof tag.id).toBe('number');
        expect(typeof tag.name).toBe('string');
        expect(tag.name.length).toBeGreaterThan(0);
    });
});
