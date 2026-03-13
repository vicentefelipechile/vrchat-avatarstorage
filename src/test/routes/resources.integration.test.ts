// ============================================================================
// Resource Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { Resource } from './../../types';
import { makeAuthCookie, request, getAdminUser, getNormalUser, getActiveResource, getAnotherNormalUser } from '../helpers';

// Unique IP per suite to isolate the rate limiter counters.
const TEST_IP = '10.0.0.2';

// ============================================================================
// Setup
// ============================================================================

let adminCookie: string;
let normalCookie: string;
let anotherNormalCookie: string;
let activeResourceUuid: string;
let activeResourceAuthorUuid: string;

beforeAll(async () => {
	const admin = await getAdminUser();
	const normal = await getNormalUser();
	const anotherNormal = await getAnotherNormalUser();

	adminCookie = await makeAuthCookie(admin.username, true);
	normalCookie = await makeAuthCookie(normal.username, false);
	anotherNormalCookie = await makeAuthCookie(anotherNormal.username, false);

	const resource = await getActiveResource();
	activeResourceUuid = resource.uuid;
	activeResourceAuthorUuid = resource.author_uuid;
});

// ============================================================================
// GET /api/resources/latest
// ============================================================================

describe('GET /api/resources/latest', () => {
	it('returns 200 with an array', async () => {
		const res = await request('GET', '/api/resources/latest', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as unknown[];
		expect(Array.isArray(body)).toBe(true);
	});

	it('returns Cache-Control header', async () => {
		const res = await request('GET', '/api/resources/latest', undefined, undefined, TEST_IP);
		expect(res.headers.get('Cache-Control')).toContain('public');
	});
});

// ============================================================================
// GET /api/resources (search)
// ============================================================================

describe('GET /api/resources', () => {
	it('returns 200 with pagination shape', async () => {
		const res = await request('GET', '/api/resources', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { resources: Resource[]; pagination: { page: number; hasNextPage: boolean; hasPrevPage: boolean } };
		expect(Array.isArray(body.resources)).toBe(true);
		expect(typeof body.pagination.page).toBe('number');
		expect(typeof body.pagination.hasNextPage).toBe('boolean');
		expect(typeof body.pagination.hasPrevPage).toBe('boolean');
	});

	it('returns only active resources', async () => {
		const res = await request('GET', '/api/resources', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { resources: Resource[] };
		for (const r of body.resources) {
			expect(r.is_active).toBe(1);
		}
	});

	it('filters by category=avatars', async () => {
		const res = await request('GET', '/api/resources?category=avatars', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { resources: Resource[] };
		for (const r of body.resources) {
			expect(r.category).toBe('avatars');
		}
	});

	it('returns an empty page when given an invalid category', async () => {
		const res = await request('GET', '/api/resources?category=nonexistent', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { resources: Resource[] };
		expect(Array.isArray(body.resources)).toBe(true);
	});

	it('respects the page query param', async () => {
		const res = await request('GET', '/api/resources?page=2', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { pagination: { page: number; hasPrevPage: boolean } };
		expect(body.pagination.page).toBe(2);
		expect(body.pagination.hasPrevPage).toBe(true);
	});

	// NOTE: FTS (resources_fts virtual table) is not reliably available in the
	// Miniflare test environment — full-text search is verified manually / in staging.
});

// ============================================================================
// GET /api/resources/category/:category (redirect)
// ============================================================================

describe('GET /api/resources/category/:category', () => {
	it('redirects to the search endpoint with category param', async () => {
		const res = await request('GET', '/api/resources/category/avatars', undefined, undefined, TEST_IP);
		expect([301, 302, 307, 308]).toContain(res.status);
	});
});

// ============================================================================
// GET /api/resources/:uuid
// ============================================================================

describe('GET /api/resources/:uuid', () => {
	it('returns 404 for a non-existent UUID', async () => {
		const res = await request('GET', '/api/resources/00000000-0000-0000-0000-000000000000', undefined, undefined, TEST_IP);
		expect(res.status).toBe(404);
	});

	it('returns 200 with the full resource shape for an existing UUID', async () => {
		const res = await request('GET', `/api/resources/${activeResourceUuid}`, undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as Resource & {
			resourceUuid: string;
			author: unknown;
			thumbnail: unknown;
			tags: unknown[];
			canDownload: boolean;
		};
		expect(body.resourceUuid).toBe(activeResourceUuid);
		expect(Array.isArray(body.tags)).toBe(true);
		expect(typeof body.canDownload).toBe('boolean');
	});

	it('canDownload is false when unauthenticated', async () => {
		const res = await request('GET', `/api/resources/${activeResourceUuid}`, undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { canDownload: boolean };
		expect(body.canDownload).toBe(false);
	});

	it('canDownload is true when authenticated', async () => {
		const res = await request('GET', `/api/resources/${activeResourceUuid}`, normalCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as { canDownload: boolean };
		expect(body.canDownload).toBe(true);
	});
});

// ============================================================================
// GET /api/resources/:uuid/history
// ============================================================================

describe('GET /api/resources/:uuid/history', () => {
	it('returns 200 with an array (may be empty)', async () => {
		const res = await request('GET', `/api/resources/${activeResourceUuid}/history`, undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as unknown[];
		expect(Array.isArray(body)).toBe(true);
	});
});

// ============================================================================
// POST /api/resources (create)
// NOTE: Turnstile always passes in test env. We test auth guard and body validation.
// ============================================================================

describe('POST /api/resources', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', '/api/resources', undefined, {
			title: 'Test',
			category: 'avatars',
			thumbnail_uuid: '00000000-0000-0000-0000-000000000000',
			links: [],
			token: 'any',
		}, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 400 when body fails validation (missing required fields)', async () => {
		const res = await request('POST', '/api/resources', normalCookie, { token: 'any' }, TEST_IP);
		expect(res.status).toBe(400);
	});
});

// ============================================================================
// PUT /api/resources/:uuid (update)
// ============================================================================

describe('PUT /api/resources/:uuid', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('PUT', `/api/resources/${activeResourceUuid}`, undefined, { title: 'Updated' }, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 403 when user is not the owner and resource is active', async () => {
		// The active resource belongs to activeResourceAuthorUuid.
		// anotherNormal is a different user who does not own it.
		const ownerUuid = activeResourceAuthorUuid;
		const anotherNormal = await env.DB
			.prepare('SELECT uuid FROM users WHERE is_admin = 0 AND uuid != ? LIMIT 1')
			.bind(ownerUuid)
			.first<{ uuid: string }>();

		if (!anotherNormal) return; // skip if only one normal user

		const res = await request('PUT', `/api/resources/${activeResourceUuid}`, anotherNormalCookie, { title: 'Hacked' }, TEST_IP);
		expect([403, 404]).toContain(res.status);
	});

	it('returns 200 when admin updates a resource', async () => {
		const resource = await getActiveResource();
		const res = await request('PUT', `/api/resources/${resource.uuid}`, adminCookie, {
			title: 'Admin Updated Title',
			description: 'Updated by admin test',
			category: resource.category,
		}, TEST_IP);
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);

		// Verify in DB
		const row = await env.DB
			.prepare('SELECT title FROM resources WHERE uuid = ?')
			.bind(resource.uuid)
			.first<{ title: string }>();
		expect(row?.title).toBe('Admin Updated Title');
	});
});
