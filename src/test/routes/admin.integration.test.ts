// ============================================================================
// Admin Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { Resource } from './../../types';
import {
    makeAuthCookie,
    request,
    getAdminUser,
    getNormalUser,
    getPendingResource,
    getActiveResource,
} from '../helpers';

// ============================================================================
// Setup
// ============================================================================

let adminCookie: string;
let normalCookie: string;
let normalUsername: string;
let pendingResourceUuid: string;
let activeResourceUuid: string;

beforeAll(async () => {
    const admin = await getAdminUser();
    const normal = await getNormalUser();

    adminCookie = await makeAuthCookie(admin.username, true);
    normalCookie = await makeAuthCookie(normal.username, false);
    normalUsername = normal.username;

    pendingResourceUuid = (await getPendingResource()).uuid;
    activeResourceUuid = (await getActiveResource()).uuid;
});

// ============================================================================
// GET /api/admin/pending
// ============================================================================

describe('GET /api/admin/pending', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('GET', '/api/admin/pending');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('GET', '/api/admin/pending', normalCookie);
        expect(res.status).toBe(403);
    });

    it('returns the list of pending resources for an admin', async () => {
        const res = await request('GET', '/api/admin/pending', adminCookie);
        expect(res.status).toBe(200);

        const body = await res.json() as Resource[];
        expect(Array.isArray(body)).toBe(true);

        for (const item of body) {
            expect(item.is_active).toBe(0);
        }
    });
});

// ============================================================================
// POST /api/admin/resource/:uuid/approve
// ============================================================================

describe('POST /api/admin/resource/:uuid/approve', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('POST', `/api/admin/resource/${pendingResourceUuid}/approve`);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('POST', `/api/admin/resource/${pendingResourceUuid}/approve`, normalCookie);
        expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent UUID', async () => {
        const res = await request('POST', '/api/admin/resource/00000000-0000-0000-0000-000000000000/approve', adminCookie);
        expect(res.status).toBe(404);
    });

    it('approves a pending resource and marks it as active', async () => {
        const res = await request('POST', `/api/admin/resource/${pendingResourceUuid}/approve`, adminCookie);
        expect(res.status).toBe(200);
        expect((await res.json() as { success: boolean }).success).toBe(true);

        const updated = await env.DB
            .prepare('SELECT is_active FROM resources WHERE uuid = ?')
            .bind(pendingResourceUuid)
            .first<Pick<Resource, 'is_active'>>();
        expect(updated?.is_active).toBe(1);
    });
});

// ============================================================================
// POST /api/admin/resource/:uuid/deactivate
// ============================================================================

describe('POST /api/admin/resource/:uuid/deactivate', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('POST', `/api/admin/resource/${activeResourceUuid}/deactivate`);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('POST', `/api/admin/resource/${activeResourceUuid}/deactivate`, normalCookie);
        expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent UUID', async () => {
        const res = await request('POST', '/api/admin/resource/00000000-0000-0000-0000-000000000001/deactivate', adminCookie);
        expect(res.status).toBe(404);
    });

    it('deactivates an active resource', async () => {
        const res = await request('POST', `/api/admin/resource/${activeResourceUuid}/deactivate`, adminCookie);
        expect(res.status).toBe(200);
        expect((await res.json() as { success: boolean }).success).toBe(true);

        const updated = await env.DB
            .prepare('SELECT is_active FROM resources WHERE uuid = ?')
            .bind(activeResourceUuid)
            .first<Pick<Resource, 'is_active'>>();
        expect(updated?.is_active).toBe(0);
    });
});

// ============================================================================
// POST /api/admin/resource/:uuid/reject
// ============================================================================

describe('POST /api/admin/resource/:uuid/reject', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('POST', `/api/admin/resource/${activeResourceUuid}/reject`);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('POST', `/api/admin/resource/${activeResourceUuid}/reject`, normalCookie);
        expect(res.status).toBe(403);
    });

    it('rejects and deletes a resource from the DB', async () => {
        // pendingResourceUuid was approved in the approve test, so it still exists
        const res = await request('POST', `/api/admin/resource/${pendingResourceUuid}/reject`, adminCookie);
        expect(res.status).toBe(200);
        expect((await res.json() as { success: boolean }).success).toBe(true);

        const gone = await env.DB
            .prepare('SELECT uuid FROM resources WHERE uuid = ?')
            .bind(pendingResourceUuid)
            .first();
        expect(gone).toBeNull();
    });
});

// ============================================================================
// GET /api/admin/stats/orphaned-media
// ============================================================================

describe('GET /api/admin/stats/orphaned-media', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('GET', '/api/admin/stats/orphaned-media');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('GET', '/api/admin/stats/orphaned-media', normalCookie);
        expect(res.status).toBe(403);
    });

    it('returns orphaned media statistics', async () => {
        const res = await request('GET', '/api/admin/stats/orphaned-media', adminCookie);
        expect(res.status).toBe(200);

        const body = await res.json() as {
            orphaned_count: number;
            orphaned_files: unknown[];
            total_media: number;
            total_resources: number;
            cutoff_hours: number;
        };

        expect(typeof body.orphaned_count).toBe('number');
        expect(Array.isArray(body.orphaned_files)).toBe(true);
        expect(typeof body.total_media).toBe('number');
        expect(typeof body.total_resources).toBe('number');
        expect(body.cutoff_hours).toBe(24);
    });
});

// ============================================================================
// POST /api/admin/cleanup/orphaned-media
// ============================================================================

describe('POST /api/admin/cleanup/orphaned-media', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('POST', '/api/admin/cleanup/orphaned-media');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('POST', '/api/admin/cleanup/orphaned-media', normalCookie);
        expect(res.status).toBe(403);
    });

    it('runs cleanup and returns the deleted count', async () => {
        const res = await request('POST', '/api/admin/cleanup/orphaned-media', adminCookie);
        expect(res.status).toBe(200);

        const body = await res.json() as { success: boolean; deleted: number; message: string };
        expect(body.success).toBe(true);
        expect(typeof body.deleted).toBe('number');
        expect(typeof body.message).toBe('string');
    });
});

// ============================================================================
// POST /api/admin/cache/clear/:username
// ============================================================================

describe('POST /api/admin/cache/clear/:username', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('POST', `/api/admin/cache/clear/${normalUsername}`);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('POST', `/api/admin/cache/clear/${normalUsername}`, normalCookie);
        expect(res.status).toBe(403);
    });

    it('clears the KV cache for the specified user', async () => {
        await env.VRCSTORAGE_KV.put(
            `user:${normalUsername}`,
            JSON.stringify({ username: normalUsername, is_admin: false }),
        );

        const res = await request('POST', `/api/admin/cache/clear/${normalUsername}`, adminCookie);
        expect(res.status).toBe(200);
        expect((await res.json() as { success: boolean }).success).toBe(true);

        const kv = await env.VRCSTORAGE_KV.get(`user:${normalUsername}`);
        expect(kv).toBeNull();
    });
});
