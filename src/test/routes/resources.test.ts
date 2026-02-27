// =========================================================================================================
// INTEGRATION TESTS — Resource Routes
// =========================================================================================================
// Tests for /api/resources endpoints (search, detail, create, update)
// =========================================================================================================

import { SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici';
import {
    seedUser,
    seedAdmin,
    seedMedia,
    seedResource,
    makeAuthCookie,
    TEST_USER_UUID,
    TEST_MEDIA_UUID,
    TEST_RESOURCE_UUID,
} from '../fixtures/seed';

const BASE = 'http://example.com';

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

// ── GET /api/resources/latest ─────────────────────────────────────────────────
describe('GET /api/resources/latest', () => {
    it('returns an array (empty when no active resources exist)', async () => {
        const res = await SELF.fetch(`${BASE}/api/resources/latest`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(Array.isArray(json)).toBe(true);
    });

    it('includes active resources in the response', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);

        const res = await SELF.fetch(`${BASE}/api/resources/latest`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBeGreaterThan(0);
        expect(json[0].uuid).toBe(TEST_RESOURCE_UUID);
    });

    it('does NOT include inactive (pending) resources', async () => {
        await seedUser();
        await seedMedia();
        // Seed with is_active = 0
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 0);

        const res = await SELF.fetch(`${BASE}/api/resources/latest`);
        const json = await res.json() as any;
        // Should not contain the inactive resource
        const found = json.find((r: any) => r.uuid === TEST_RESOURCE_UUID);
        expect(found).toBeUndefined();
    });
});

// ── GET /api/resources ────────────────────────────────────────────────────────
describe('GET /api/resources (search)', () => {
    it('returns pagination object', async () => {
        const res = await SELF.fetch(`${BASE}/api/resources`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json).toHaveProperty('resources');
        expect(json).toHaveProperty('pagination');
        expect(Array.isArray(json.resources)).toBe(true);
    });

    it('filters by category', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);

        const res = await SELF.fetch(`${BASE}/api/resources?category=avatars`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        // All returned resources should be in the 'avatars' category
        for (const r of json.resources) {
            expect(r.category).toBe('avatars');
        }
    });

    it('pagination hasPrevPage is false on page 1', async () => {
        const res = await SELF.fetch(`${BASE}/api/resources?page=1`);
        const json = await res.json() as any;
        expect(json.pagination.hasPrevPage).toBe(false);
    });
});

// ── GET /api/resources/:uuid ──────────────────────────────────────────────────
describe('GET /api/resources/:uuid', () => {
    it('returns 404 for non-existent UUID', async () => {
        const res = await SELF.fetch(
            `${BASE}/api/resources/00000000-0000-0000-0000-999999999999`,
        );
        expect(res.status).toBe(404);
    });

    it('returns resource details for an existing resource', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);

        const res = await SELF.fetch(`${BASE}/api/resources/${TEST_RESOURCE_UUID}`);
        expect(res.status).toBe(200);

        const json = await res.json() as any;
        expect(json.uuid).toBe(TEST_RESOURCE_UUID);
        expect(json.title).toBe('Test Resource');
        expect(json.category).toBe('avatars');
        expect(json).toHaveProperty('author');
        expect(json).toHaveProperty('thumbnail');
        expect(json).toHaveProperty('tags');
        expect(Array.isArray(json.tags)).toBe(true);
    });

    it('canDownload is false when not authenticated', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);

        const res = await SELF.fetch(`${BASE}/api/resources/${TEST_RESOURCE_UUID}`);
        const json = await res.json() as any;
        expect(json.canDownload).toBe(false);
    });

    it('canDownload is true when authenticated', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/resources/${TEST_RESOURCE_UUID}`, {
            headers: { Cookie: cookie },
        });
        const json = await res.json() as any;
        expect(json.canDownload).toBe(true);
    });
});

// ── GET /api/resources/category/:category ─────────────────────────────────────
describe('GET /api/resources/category/:category', () => {
    it('redirects to /api/resources?category=...', async () => {
        const res = await SELF.fetch(`${BASE}/api/resources/category/avatars`, {
            redirect: 'manual',
        });
        // Should be a redirect (301 or 302)
        expect([301, 302, 307, 308]).toContain(res.status);
        const location = res.headers.get('Location');
        expect(location).toContain('category=avatars');
    });
});

// ── POST /api/resources ────────────────────────────────────────────────────────
describe('POST /api/resources', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'New Resource',
                category: 'avatars',
                thumbnail_uuid: '123e4567-e89b-12d3-a456-426614174000',
            }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 400 for invalid resource body (Zod validation)', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/resources`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie,
            },
            body: JSON.stringify({
                title: 'Hi', // too short
                category: 'avatars',
                thumbnail_uuid: '123e4567-e89b-12d3-a456-426614174000',
            }),
        });
        expect(res.status).toBe(400);
    });

    it('creates a resource and returns a UUID', async () => {
        mockTurnstileSuccess();
        await seedUser();
        await seedMedia();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/resources`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie,
            },
            body: JSON.stringify({
                title: 'My Cool Avatar',
                description: 'A cool avatar',
                category: 'avatars',
                thumbnail_uuid: TEST_MEDIA_UUID,
                token: 'test-token',
            }),
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.success).toBe(true);
        expect(typeof json.uuid).toBe('string');
    });
});

// ── PUT /api/resources/:uuid ──────────────────────────────────────────────────
describe('PUT /api/resources/:uuid', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/resources/${TEST_RESOURCE_UUID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Updated' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 403 for non-owner, non-admin user', async () => {
        await seedUser('owner', '00000000-0000-0000-0000-000000000041');
        await seedUser('other', '00000000-0000-0000-0000-000000000042');
        await seedMedia();
        await seedResource(
            '00000000-0000-0000-0000-000000000041',
            TEST_MEDIA_UUID,
            TEST_RESOURCE_UUID,
            0,
        );
        const cookie = await makeAuthCookie('other', false);

        const res = await SELF.fetch(`${BASE}/api/resources/${TEST_RESOURCE_UUID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie,
            },
            body: JSON.stringify({ title: 'Hacked Title' }),
        });
        expect(res.status).toBe(403);
    });

    it('owner can update their own un-approved resource', async () => {
        await seedUser('resourceowner', '00000000-0000-0000-0000-000000000051');
        await seedMedia();
        await seedResource(
            '00000000-0000-0000-0000-000000000051',
            TEST_MEDIA_UUID,
            TEST_RESOURCE_UUID,
            0, // Not yet approved
        );
        const cookie = await makeAuthCookie('resourceowner', false);

        const res = await SELF.fetch(`${BASE}/api/resources/${TEST_RESOURCE_UUID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie,
            },
            body: JSON.stringify({ title: 'Updated Title' }),
        });
        expect(res.status).toBe(200);
    });

    it('non-admin owner cannot edit approved (is_active=1) resource', async () => {
        await seedUser('approvedowner', '00000000-0000-0000-0000-000000000061');
        await seedMedia();
        await seedResource(
            '00000000-0000-0000-0000-000000000061',
            TEST_MEDIA_UUID,
            TEST_RESOURCE_UUID,
            1, // Approved
        );
        const cookie = await makeAuthCookie('approvedowner', false);

        const res = await SELF.fetch(`${BASE}/api/resources/${TEST_RESOURCE_UUID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: cookie,
            },
            body: JSON.stringify({ title: 'Sneaky Edit' }),
        });
        expect(res.status).toBe(403);
    });
});
