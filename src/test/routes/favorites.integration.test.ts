// ============================================================================
// Favorites Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { makeAuthCookie, request, getNormalUser, getActiveResource } from '../helpers';

// Unique IP per suite to isolate rate limiter counters.
const TEST_IP = '10.0.0.8';

// ============================================================================
// Setup
// ============================================================================

let normalCookie: string;
let normalUserUuid: string;
let activeResourceUuid: string;
let secondResourceUuid: string;

beforeAll(async () => {
	const normal = await getNormalUser();
	normalCookie = await makeAuthCookie(normal.username, false);

	const user = await env.DB
		.prepare('SELECT uuid FROM users WHERE username = ?')
		.bind(normal.username)
		.first<{ uuid: string }>();
	normalUserUuid = user!.uuid;

	// Grab two different active resources to avoid inter-test state conflicts
	const res1 = await env.DB
		.prepare('SELECT uuid FROM resources WHERE is_active = 1 LIMIT 1')
		.first<{ uuid: string }>();
	const res2 = await env.DB
		.prepare('SELECT uuid FROM resources WHERE is_active = 1 AND uuid != ? LIMIT 1')
		.bind(res1!.uuid)
		.first<{ uuid: string }>();

	activeResourceUuid = res1!.uuid;
	secondResourceUuid = res2!.uuid;

	// Start clean — remove any pre-existing favorites for this user
	await env.DB.prepare('DELETE FROM user_favorites WHERE user_uuid = ?').bind(normalUserUuid).run();
});

// ============================================================================
// GET /api/favorites
// ============================================================================

describe('GET /api/favorites', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('GET', '/api/favorites');
		expect(res.status).toBe(401);
	});

	it('returns 200 with pagination shape when authenticated', async () => {
		const res = await request('GET', '/api/favorites', normalCookie);
		expect(res.status).toBe(200);

		const body = await res.json() as {
			favorites: unknown[];
			pagination: { page: number; limit: number; total: number; total_pages: number };
		};
		expect(Array.isArray(body.favorites)).toBe(true);
		expect(typeof body.pagination.page).toBe('number');
		expect(typeof body.pagination.total).toBe('number');
	});
});

// ============================================================================
// GET /api/favorites/ids
// ============================================================================

describe('GET /api/favorites/ids', () => {
	it('returns { favorites: [] } when unauthenticated', async () => {
		const res = await request('GET', '/api/favorites/ids');
		expect(res.status).toBe(200);

		const body = await res.json() as { favorites: unknown[] };
		expect(Array.isArray(body.favorites)).toBe(true);
	});

	it('returns an array of UUIDs for an authenticated user', async () => {
		const res = await request('GET', '/api/favorites/ids', normalCookie);
		expect(res.status).toBe(200);

		const body = await res.json() as { favorites: string[] };
		expect(Array.isArray(body.favorites)).toBe(true);
	});
});

// ============================================================================
// GET /api/favorites/check/:resourceUuid
// ============================================================================

describe('GET /api/favorites/check/:resourceUuid', () => {
	it('returns { is_favorite: false } when unauthenticated', async () => {
		const res = await request('GET', `/api/favorites/check/${activeResourceUuid}`);
		expect(res.status).toBe(200);

		const body = await res.json() as { is_favorite: boolean };
		expect(body.is_favorite).toBe(false);
	});

	it('returns { is_favorite: false } when resource is not in favorites', async () => {
		const res = await request('GET', `/api/favorites/check/${activeResourceUuid}`, normalCookie);
		expect(res.status).toBe(200);

		const body = await res.json() as { is_favorite: boolean };
		expect(body.is_favorite).toBe(false);
	});
});

// ============================================================================
// POST /api/favorites
// ============================================================================

describe('POST /api/favorites', () => {
	beforeEach(async () => {
		// Ensure the target resource is NOT in favorites before each test
		await env.DB
			.prepare('DELETE FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(normalUserUuid, activeResourceUuid)
			.run();
	});

	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', '/api/favorites', undefined, { resource_uuid: activeResourceUuid });
		expect(res.status).toBe(401);
	});

	it('returns 400 when body is missing resource_uuid', async () => {
		const res = await request('POST', '/api/favorites', normalCookie, {});
		expect(res.status).toBe(400);
	});

	it('returns 404 when resource does not exist', async () => {
		const res = await request('POST', '/api/favorites', normalCookie, {
			resource_uuid: '00000000-0000-0000-0000-000000000000',
		});
		expect(res.status).toBe(404);
	});

	it('adds a resource to favorites successfully', async () => {
		const res = await request('POST', '/api/favorites', normalCookie, { resource_uuid: activeResourceUuid });
		expect(res.status).toBe(200);

		const body = await res.json() as { success: boolean; resource_uuid: string };
		expect(body.success).toBe(true);
		expect(body.resource_uuid).toBe(activeResourceUuid);

		// Verify it's in DB
		const row = await env.DB
			.prepare('SELECT 1 FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(normalUserUuid, activeResourceUuid)
			.first();
		expect(row).not.toBeNull();
	});

	it('returns 400 when resource is already in favorites', async () => {
		// Insert it first
		await env.DB
			.prepare('INSERT INTO user_favorites (user_uuid, resource_uuid, display_order) VALUES (?, ?, 1)')
			.bind(normalUserUuid, activeResourceUuid)
			.run();

		const res = await request('POST', '/api/favorites', normalCookie, { resource_uuid: activeResourceUuid });
		expect(res.status).toBe(400);
	});
});

// ============================================================================
// POST /api/favorites/reorder
// ============================================================================

describe('POST /api/favorites/reorder', () => {
	beforeAll(async () => {
		// Ensure secondResourceUuid is in favorites for the reorder tests
		await env.DB
			.prepare('DELETE FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(normalUserUuid, secondResourceUuid)
			.run();
		await env.DB
			.prepare('INSERT INTO user_favorites (user_uuid, resource_uuid, display_order) VALUES (?, ?, 1)')
			.bind(normalUserUuid, secondResourceUuid)
			.run();
	});

	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', '/api/favorites/reorder', undefined, {
			resource_uuid: secondResourceUuid,
			move_to_top: true,
		});
		expect(res.status).toBe(401);
	});

	it('returns 404 when the resource is not in favorites', async () => {
		// This UUID exists as a valid UUID in Zod but is not in user_favorites
		const res = await request('POST', '/api/favorites/reorder', normalCookie, {
			resource_uuid: '00000000-0000-0000-0000-000000000000',
			move_to_top: true,
		});
		expect(res.status).toBe(404);
	});

	it('reorders a favorite to the top successfully', async () => {
		const res = await request('POST', '/api/favorites/reorder', normalCookie, {
			resource_uuid: secondResourceUuid,
			move_to_top: true,
		});
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);
	});
});

// ============================================================================
// DELETE /api/favorites/:resourceUuid
// ============================================================================

describe('DELETE /api/favorites/:resourceUuid', () => {
	beforeAll(async () => {
		// Ensure the resource is in favorites before these tests
		await env.DB
			.prepare('DELETE FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(normalUserUuid, activeResourceUuid)
			.run();
		await env.DB
			.prepare('INSERT INTO user_favorites (user_uuid, resource_uuid, display_order) VALUES (?, ?, 1)')
			.bind(normalUserUuid, activeResourceUuid)
			.run();
	});

	it('returns 401 when unauthenticated', async () => {
		const res = await request('DELETE', `/api/favorites/${activeResourceUuid}`);
		expect(res.status).toBe(401);
	});

	it('removes a favorite successfully', async () => {
		const res = await request('DELETE', `/api/favorites/${activeResourceUuid}`, normalCookie);
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);

		// Verify it's gone from DB
		const gone = await env.DB
			.prepare('SELECT 1 FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(normalUserUuid, activeResourceUuid)
			.first();
		expect(gone).toBeNull();
	});

	it('returns 404 when trying to delete a non-existent favorite', async () => {
		const res = await request('DELETE', '/api/favorites/00000000-0000-0000-0000-000000000000', normalCookie);
		expect(res.status).toBe(404);
	});
});
