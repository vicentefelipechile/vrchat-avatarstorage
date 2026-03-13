// ============================================================================
// Wiki Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { makeAuthCookie, request, getAdminUser, getNormalUser, getAnotherNormalUser } from '../helpers';

// Unique IP so RL_STRICT does not bleed between suites.
const TEST_IP = '10.0.0.6';

// ============================================================================
// Setup
// ============================================================================

let adminCookie: string;
let normalCookie: string;
let anotherNormalCookie: string;
let normalUserUuid: string;
let anotherUserUuid: string;
let ownWikiCommentUuid: string;   // owned by normalUser — for DELETE author test
let otherWikiCommentUuid: string; // owned by normalUser but tested by anotherNormal — for 403 test

beforeAll(async () => {
	const admin = await getAdminUser();
	const normal = await getNormalUser();
	const another = await getAnotherNormalUser();

	adminCookie = await makeAuthCookie(admin.username, true);
	normalCookie = await makeAuthCookie(normal.username, false);
	anotherNormalCookie = await makeAuthCookie(another.username, false);

	const normalUser = await env.DB
		.prepare('SELECT uuid FROM users WHERE username = ?')
		.bind(normal.username)
		.first<{ uuid: string }>();
	normalUserUuid = normalUser!.uuid;

	const anotherUser = await env.DB
		.prepare('SELECT uuid FROM users WHERE username = ?')
		.bind(another.username)
		.first<{ uuid: string }>();
	anotherUserUuid = anotherUser!.uuid;

	// Create a dedicated wiki comment owned by normalUser for the DELETE-author test.
	// We don't rely on seed data because previous runs may have already consumed it.
	const ownUuid = crypto.randomUUID();
	await env.DB
		.prepare('INSERT INTO wiki_comments (uuid, author_uuid, text) VALUES (?, ?, ?)')
		.bind(ownUuid, normalUserUuid, 'Test comment for deletion by author')
		.run();
	ownWikiCommentUuid = ownUuid;

	// Create a second comment (also owned by normalUser) to test the 403 path:
	// anotherNormal will try to delete a comment they don't own.
	const otherUuid = crypto.randomUUID();
	await env.DB
		.prepare('INSERT INTO wiki_comments (uuid, author_uuid, text) VALUES (?, ?, ?)')
		.bind(otherUuid, normalUserUuid, 'Test comment for 403 check')
		.run();
	otherWikiCommentUuid = otherUuid;
});

// ============================================================================
// GET /api/wiki/comments
// ============================================================================

describe('GET /api/wiki/comments', () => {
	it('returns 200 with an array (public endpoint)', async () => {
		const res = await request('GET', '/api/wiki/comments', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as unknown[];
		expect(Array.isArray(body)).toBe(true);
	});

	it('each comment has expected fields', async () => {
		const res = await request('GET', '/api/wiki/comments', undefined, undefined, TEST_IP);
		const body = await res.json() as { uuid: string; text: string; timestamp: number; author: string; author_avatar: string | null }[];

		if (body.length > 0) {
			const comment = body[0];
			expect(typeof comment.uuid).toBe('string');
			expect(typeof comment.text).toBe('string');
			expect(typeof comment.timestamp).toBe('number');
			expect(typeof comment.author).toBe('string');
		}
	});
});

// ============================================================================
// POST /api/wiki/comments
// NOTE: TURNSTILE_SECRET_KEY = always-pass test key in vitest.config.mts, so
// Turnstile validation always passes. The 403 path is not testable in this env.
// We test: auth guard (401), body validation (400), and successful creation (200).
// ============================================================================

describe('POST /api/wiki/comments', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', '/api/wiki/comments', undefined, {
			text: 'Hello wiki',
			token: 'any',
		}, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 400 when body is invalid (missing text)', async () => {
		const res = await request('POST', '/api/wiki/comments', normalCookie, {
			token: 'any',
		}, '10.0.6.10'); // fresh IP so RL_STRICT is not exhausted
		expect(res.status).toBe(400);
	});

	it('creates a wiki comment successfully when authenticated', async () => {
		const res = await request('POST', '/api/wiki/comments', normalCookie, {
			text: 'Hello from integration test',
			token: 'any',
		}, '10.0.6.11'); // fresh IP
		expect(res.status).toBe(200);

		const body = await res.json() as { uuid: string; text: string; author: string };
		expect(typeof body.uuid).toBe('string');
		expect(body.text).toBe('Hello from integration test');

		// Verify in DB
		const row = await env.DB
			.prepare('SELECT uuid FROM wiki_comments WHERE uuid = ?')
			.bind(body.uuid)
			.first<{ uuid: string }>();
		expect(row).not.toBeNull();
	});
});

// ============================================================================
// DELETE /api/wiki/comments/:uuid
// ============================================================================

describe('DELETE /api/wiki/comments/:uuid', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('DELETE', `/api/wiki/comments/${ownWikiCommentUuid}`, undefined, undefined, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 403 when user is not the author and not admin', async () => {
		// anotherNormal tries to delete a comment owned by normalUser
		const res = await request('DELETE', `/api/wiki/comments/${otherWikiCommentUuid}`, anotherNormalCookie, undefined, TEST_IP);
		expect(res.status).toBe(403);
	});

	it('returns 404 for a non-existent comment UUID', async () => {
		const res = await request('DELETE', '/api/wiki/comments/00000000-0000-0000-0000-000000000000', adminCookie, undefined, TEST_IP);
		expect(res.status).toBe(404);
	});

	it('allows the comment author to delete their own wiki comment', async () => {
		const res = await request('DELETE', `/api/wiki/comments/${ownWikiCommentUuid}`, normalCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);

		// Verify it's gone from DB
		const gone = await env.DB
			.prepare('SELECT uuid FROM wiki_comments WHERE uuid = ?')
			.bind(ownWikiCommentUuid)
			.first();
		expect(gone).toBeNull();
	});

	it('allows an admin to delete any wiki comment', async () => {
		// otherWikiCommentUuid still exists (403 test didn't delete it)
		const res = await request('DELETE', `/api/wiki/comments/${otherWikiCommentUuid}`, adminCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);
	});
});
