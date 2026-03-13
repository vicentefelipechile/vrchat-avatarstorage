// ============================================================================
// Comment Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { Comment } from './../../types';
import {
	makeAuthCookie,
	request,
	getAdminUser,
	getNormalUser,
	getAnotherNormalUser,
	getAnyComment,
	getActiveResource,
} from '../helpers';

// Unique IP per suite to isolate rate limiter counters.
const TEST_IP = '10.0.0.4';

// ============================================================================
// Setup
// ============================================================================

let adminCookie: string;
let normalCookie: string;
let anotherNormalCookie: string;
let normalUserUuid: string;
let activeResourceUuid: string;
let ownCommentUuid: string;
let otherCommentUuid: string;

beforeAll(async () => {
	const admin = await getAdminUser();
	const normal = await getNormalUser();
	const anotherNormal = await getAnotherNormalUser();

	adminCookie = await makeAuthCookie(admin.username, true);
	normalCookie = await makeAuthCookie(normal.username, false);
	anotherNormalCookie = await makeAuthCookie(anotherNormal.username, false);

	const normalUser = await env.DB
		.prepare('SELECT uuid FROM users WHERE username = ?')
		.bind(normal.username)
		.first<{ uuid: string }>();
	normalUserUuid = normalUser!.uuid;

	const anotherUser = await env.DB
		.prepare('SELECT uuid FROM users WHERE username = ?')
		.bind(anotherNormal.username)
		.first<{ uuid: string }>();

	activeResourceUuid = (await getActiveResource()).uuid;

	// Get a comment owned by normalUser for the owner-delete happy path
	const ownComment = await getAnyComment(normalUserUuid);
	ownCommentUuid = ownComment.uuid;

	// Get a comment NOT owned by anotherNormal (to verify 403)
	const otherComment = await env.DB
		.prepare('SELECT uuid FROM comments WHERE author_uuid != ? LIMIT 1')
		.bind(anotherUser!.uuid)
		.first<Pick<Comment, 'uuid'>>();
	otherCommentUuid = otherComment?.uuid ?? ownCommentUuid;
});

// ============================================================================
// GET /api/resources/:uuid/comments
// ============================================================================

describe('GET /api/resources/:uuid/comments', () => {
	it('returns 200 with an array (public endpoint)', async () => {
		const res = await request('GET', `/api/resources/${activeResourceUuid}/comments`, undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as unknown[];
		expect(Array.isArray(body)).toBe(true);
	});

	it('each comment has expected fields', async () => {
		const res = await request('GET', `/api/resources/${activeResourceUuid}/comments`, undefined, undefined, TEST_IP);
		const body = await res.json() as { uuid: string; text: string; timestamp: number; author: string }[];

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
// POST /api/resources/:uuid/comments
// NOTE: Turnstile always passes in test env (always-pass key). We test: auth
// guard (401), body validation (400), and successful creation (200 + DB verify).
// ============================================================================

describe('POST /api/resources/:uuid/comments', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('POST', `/api/resources/${activeResourceUuid}/comments`, undefined, {
			text: 'Hello',
			token: 'any',
		}, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 400 when body is invalid (missing text)', async () => {
		const res = await request('POST', `/api/resources/${activeResourceUuid}/comments`, normalCookie, {
			token: 'any',
		}, '10.0.4.10'); // fresh sub-IP so RL_STRICT is unused
		expect(res.status).toBe(400);
	});

	it('creates a comment successfully and it appears in the list', async () => {
		const res = await request('POST', `/api/resources/${activeResourceUuid}/comments`, normalCookie, {
			text: 'Integration test comment',
			token: 'any',
		}, '10.0.4.11');
		expect(res.status).toBe(200);

		const body = await res.json() as { commentUuid: string; text: string; author: string };
		expect(typeof body.commentUuid).toBe('string');
		expect(body.text).toBe('Integration test comment');

		// Verify it exists in DB
		const row = await env.DB
			.prepare('SELECT uuid FROM comments WHERE uuid = ?')
			.bind(body.commentUuid)
			.first<{ uuid: string }>();
		expect(row).not.toBeNull();
	});
});

// ============================================================================
// DELETE /api/comments/:commentId
// ============================================================================

describe('DELETE /api/comments/:commentId', () => {
	it('returns 401 when unauthenticated', async () => {
		const res = await request('DELETE', `/api/comments/${ownCommentUuid}`, undefined, undefined, TEST_IP);
		expect(res.status).toBe(401);
	});

	it('returns 403 when user is not the author and not admin', async () => {
		const res = await request('DELETE', `/api/comments/${otherCommentUuid}`, anotherNormalCookie, undefined, TEST_IP);
		expect(res.status).toBe(403);
	});

	it('returns 404 for a non-existent comment UUID', async () => {
		const res = await request('DELETE', '/api/comments/00000000-0000-0000-0000-000000000000', adminCookie, undefined, TEST_IP);
		expect(res.status).toBe(404);
	});

	it('allows the comment author to delete their own comment', async () => {
		const res = await request('DELETE', `/api/comments/${ownCommentUuid}`, normalCookie, undefined, TEST_IP);
		expect(res.status).toBe(200);
		expect((await res.json() as { success: boolean }).success).toBe(true);

		const gone = await env.DB
			.prepare('SELECT uuid FROM comments WHERE uuid = ?')
			.bind(ownCommentUuid)
			.first();
		expect(gone).toBeNull();
	});
});
