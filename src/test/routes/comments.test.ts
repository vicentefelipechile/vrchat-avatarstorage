// =========================================================================================================
// INTEGRATION TESTS — Comment Routes
// =========================================================================================================
// Tests for GET /:uuid/comments, POST /:uuid/comments, DELETE /:commentId
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
    TEST_ADMIN_UUID,
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

// ── GET /api/resources/:uuid/comments ────────────────────────────────────────
describe('GET /api/resources/:uuid/comments', () => {
    it('returns empty array when no comments exist', async () => {
        await seedUser();
        await seedMedia();
        await seedResource();

        const res = await SELF.fetch(
            `${BASE}/api/resources/${TEST_RESOURCE_UUID}/comments`,
        );
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBe(0);
    });
});

// ── POST /api/resources/:uuid/comments ───────────────────────────────────────
describe('POST /api/resources/:uuid/comments', () => {
    it('returns 401 when not authenticated', async () => {
        await seedUser();
        await seedMedia();
        await seedResource();

        const res = await SELF.fetch(
            `${BASE}/api/resources/${TEST_RESOURCE_UUID}/comments`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Nice avatar!' }),
            },
        );
        expect(res.status).toBe(401);
    });

    it('returns 400 when comment text is too short', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(
            `${BASE}/api/resources/${TEST_RESOURCE_UUID}/comments`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: cookie,
                },
                body: JSON.stringify({ text: 'Hi' }), // too short
            },
        );
        expect(res.status).toBe(400);
    });

    it('creates a comment when authenticated', async () => {
        mockTurnstileSuccess();
        await seedUser();
        await seedMedia();
        await seedResource();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(
            `${BASE}/api/resources/${TEST_RESOURCE_UUID}/comments`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: cookie,
                },
                body: JSON.stringify({ text: 'This is a nice avatar!', token: 'test-token' }),
            },
        );

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.text).toBe('This is a nice avatar!');
        expect(json.author).toBe('testuser');
    });
});

// ── DELETE /api/comments/:commentId ──────────────────────────────────────────
describe('DELETE /api/comments/:commentId', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(
            `${BASE}/api/comments/00000000-0000-0000-0000-000000000099`,
            { method: 'DELETE' },
        );
        expect(res.status).toBe(401);
    });

    it('returns 404 when comment does not exist', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(
            `${BASE}/api/comments/00000000-0000-0000-0000-000000000099`,
            {
                method: 'DELETE',
                headers: { Cookie: cookie },
            },
        );
        expect(res.status).toBe(404);
    });

    it('author can delete their own comment', async () => {
        mockTurnstileSuccess();
        await seedUser();
        await seedMedia();
        await seedResource();
        const cookie = await makeAuthCookie('testuser', false);

        // First, create a comment
        const createRes = await SELF.fetch(
            `${BASE}/api/resources/${TEST_RESOURCE_UUID}/comments`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: cookie,
                },
                body: JSON.stringify({ text: 'Comment to delete!', token: 'test-token' }),
            },
        );
        const created = await createRes.json() as any;
        const commentId = created.commentUuid;

        // Then delete it
        const deleteRes = await SELF.fetch(`${BASE}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
        });
        expect(deleteRes.status).toBe(200);
    });

    it('other user (non-admin) cannot delete comment', async () => {
        mockTurnstileSuccess();
        await seedUser('authoruser', '00000000-0000-0000-0000-000000000071');
        await seedUser('otheruser', '00000000-0000-0000-0000-000000000072');
        await seedMedia();
        await seedResource('00000000-0000-0000-0000-000000000071');
        const authorCookie = await makeAuthCookie('authoruser', false);
        const otherCookie = await makeAuthCookie('otheruser', false);

        // Create comment as author
        const createRes = await SELF.fetch(
            `${BASE}/api/resources/${TEST_RESOURCE_UUID}/comments`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: authorCookie,
                },
                body: JSON.stringify({ text: 'Comment by author!', token: 'test-token' }),
            },
        );
        const created = await createRes.json() as any;
        const commentId = created.commentUuid;

        // Try to delete as other user
        const deleteRes = await SELF.fetch(`${BASE}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { Cookie: otherCookie },
        });
        expect(deleteRes.status).toBe(403);
    });
});
