// =========================================================================================================
// INTEGRATION TESTS — Favorites Routes
// =========================================================================================================
// Tests for GET /api/favorites, POST /api/favorites, DELETE, /ids, /check, /reorder
//
// Strategy: Tests that need a favorite to already exist use `seedFavorite()` to
// insert it directly into D1 — this avoids making multiple SELF.fetch() calls
// to the same rate-limited endpoints.
// =========================================================================================================

import { SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici';
import {
    seedUser,
    seedMedia,
    seedResource,
    seedFavorite,
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

// ── GET /api/favorites ────────────────────────────────────────────────────────
describe('GET /api/favorites', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/favorites`);
        expect(res.status).toBe(401);
    });

    it('returns paginated favorites list when authenticated', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites`, {
            headers: { Cookie: cookie },
        });
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json).toHaveProperty('favorites');
        expect(json).toHaveProperty('pagination');
        expect(Array.isArray(json.favorites)).toBe(true);
    });

    it('returns seeded favorites in list', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);
        // Seed favorite directly into D1 — no extra API call needed
        await seedFavorite(TEST_USER_UUID, TEST_RESOURCE_UUID);
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites`, {
            headers: { Cookie: cookie },
        });
        const json = await res.json() as any;
        expect(json.favorites.length).toBeGreaterThan(0);
    });
});

// ── GET /api/favorites/ids ────────────────────────────────────────────────────
describe('GET /api/favorites/ids', () => {
    it('returns empty favorites array when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/favorites/ids`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json).toHaveProperty('favorites');
        expect(Array.isArray(json.favorites)).toBe(true);
        expect(json.favorites.length).toBe(0);
    });

    it('returns UUIDs of seeded favorites', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);
        // Use seed helper to avoid rate limiting from a POST /api/favorites call
        await seedFavorite(TEST_USER_UUID, TEST_RESOURCE_UUID);
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites/ids`, {
            headers: { Cookie: cookie },
        });
        const json = await res.json() as any;
        expect(json.favorites).toContain(TEST_RESOURCE_UUID);
    });
});

// ── GET /api/favorites/check/:resourceUuid ────────────────────────────────────
describe('GET /api/favorites/check/:resourceUuid', () => {
    it('returns is_favorite: false when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/favorites/check/${TEST_RESOURCE_UUID}`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.is_favorite).toBe(false);
    });

    it('returns is_favorite: false for non-favorited resource', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(
            `${BASE}/api/favorites/check/${TEST_RESOURCE_UUID}`,
            { headers: { Cookie: cookie } },
        );
        const json = await res.json() as any;
        expect(json.is_favorite).toBe(false);
    });

    it('returns is_favorite: true for a seeded favorite', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);
        // Seed directly — no extra API call
        await seedFavorite(TEST_USER_UUID, TEST_RESOURCE_UUID);
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(
            `${BASE}/api/favorites/check/${TEST_RESOURCE_UUID}`,
            { headers: { Cookie: cookie } },
        );
        const json = await res.json() as any;
        expect(json.is_favorite).toBe(true);
    });
});

// ── POST /api/favorites ────────────────────────────────────────────────────────
describe('POST /api/favorites', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resource_uuid: TEST_RESOURCE_UUID }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 404 when resource does not exist', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ resource_uuid: '123e4567-e89b-12d3-a456-426614174999' }),
        });
        expect(res.status).toBe(404);
    });

    it('adds a resource to favorites successfully', async () => {
        // Unique UUIDs for this test to avoid conflicts with other tests using DEFAULT constants
        const USER_UUID = '123e4567-e89b-12d3-a456-426614175001';
        const MEDIA_UUID = '123e4567-e89b-12d3-a456-426614175010';
        const RES_UUID = '123e4567-e89b-12d3-a456-426614175020';
        await seedUser('favadduser', USER_UUID);
        await seedMedia(MEDIA_UUID);
        await seedResource(USER_UUID, MEDIA_UUID, RES_UUID, 1);
        const cookie = await makeAuthCookie('favadduser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ resource_uuid: RES_UUID }),
        });
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.success).toBe(true);
    });

    it('returns 400 when resource is already in favorites (seeded directly)', async () => {
        // Unique UUIDs for this test
        const USER_UUID = '123e4567-e89b-12d3-a456-426614176001';
        const MEDIA_UUID = '123e4567-e89b-12d3-a456-426614176010';
        const RES_UUID = '123e4567-e89b-12d3-a456-426614176020';
        await seedUser('favdupuser', USER_UUID);
        await seedMedia(MEDIA_UUID);
        await seedResource(USER_UUID, MEDIA_UUID, RES_UUID, 1);
        await seedFavorite(USER_UUID, RES_UUID);
        const cookie = await makeAuthCookie('favdupuser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ resource_uuid: RES_UUID }),
        });
        expect(res.status).toBe(400);
    });
});


// ── DELETE /api/favorites/:resourceUuid ────────────────────────────────────────
describe('DELETE /api/favorites/:resourceUuid', () => {
    it('returns 401 or 429 when not authenticated (rate-limited endpoint)', async () => {
        const res = await SELF.fetch(
            `${BASE}/api/favorites/${TEST_RESOURCE_UUID}`,
            { method: 'DELETE' },
        );
        // RL_MEDIUM applies to /api/favorites/* — 429 may fire before 401
        expect([401, 429]).toContain(res.status);
    });
    it('returns 404 when favorite does not exist', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(
            `${BASE}/api/favorites/123e4567-e89b-12d3-a456-426614174999`,
            { method: 'DELETE', headers: { Cookie: cookie } },
        );
        expect(res.status).toBe(404);
    });

    it('removes a seeded favorite successfully', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);
        // Seed directly to avoid 2 API calls
        await seedFavorite(TEST_USER_UUID, TEST_RESOURCE_UUID);
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(
            `${BASE}/api/favorites/${TEST_RESOURCE_UUID}`,
            { method: 'DELETE', headers: { Cookie: cookie } },
        );
        expect(res.status).toBe(200);
    });
});

// ── POST /api/favorites/reorder ────────────────────────────────────────────────
describe('POST /api/favorites/reorder', () => {
    it('returns 401 or 429 when not authenticated (rate-limited endpoint)', async () => {
        const res = await SELF.fetch(`${BASE}/api/favorites/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resource_uuid: TEST_RESOURCE_UUID, move_to_top: true }),
        });
        // RL_MEDIUM applies to /api/favorites/* — 429 may fire before 401
        expect([401, 429]).toContain(res.status);
    });
    it('returns 404 when favorite does not exist for reorder', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ resource_uuid: '123e4567-e89b-12d3-a456-426614174999', move_to_top: true }),
        });
        expect(res.status).toBe(404);
    });

    it('reorders a seeded favorite to top successfully', async () => {
        await seedUser();
        await seedMedia();
        await seedResource(TEST_USER_UUID, TEST_MEDIA_UUID, TEST_RESOURCE_UUID, 1);
        // Seed favorite directly
        await seedFavorite(TEST_USER_UUID, TEST_RESOURCE_UUID);
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/favorites/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ resource_uuid: TEST_RESOURCE_UUID, move_to_top: true }),
        });
        expect(res.status).toBe(200);
    });
});
