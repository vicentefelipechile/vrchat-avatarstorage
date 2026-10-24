// =========================================================================================================
// COMMENTS AND BLOG INTEGRATION TESTS
// =========================================================================================================
// Read paths, author-only deletion, schema checks and authenticated writing rules.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createAvatar, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

function remove(path: string, cookie: string): Promise<Response> {
	return exports.default.fetch(`http://localhost:8787${path}`, { method: 'DELETE', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat' } });
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('resource comments', () => {
	it('creates and broadcasts a comment only for an active resource', async () => {
		const owner = await createUser();
		const resourceUuid = await createAvatar(owner.uuid, 'Public', 'male');
		const hidden = await createAvatar(owner.uuid, 'Pending', 'female', false);
		const headers = { Cookie: owner.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' };
		const denied = await exports.default.fetch(`http://localhost:8787/api/comments/${hidden}`, { method: 'POST', headers, body: JSON.stringify({ text: 'Not public' }) });
		expect(denied.status).toBe(404);
		const created = await exports.default.fetch(`http://localhost:8787/api/comments/${resourceUuid}`, { method: 'POST', headers, body: JSON.stringify({ text: 'Hello world' }) });
		expect(created.status).toBe(200);
		const comment = (await created.json()) as { uuid: string; text: string };
		expect(comment.text).toBe('Hello world');
		expect(await env.DB.prepare('SELECT uuid FROM comments WHERE uuid = ?').bind(comment.uuid).first()).not.toBeNull();
		const updates = await exports.default.fetch('http://localhost:8787/api/updates?since=0');
		expect(((await updates.json()) as { changes: { scope: string }[] }).changes).toContainEqual(expect.objectContaining({ scope: 'comments' }));
	});

	it('lists persisted comments and enforces author ownership on deletion', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const resourceUuid = await createAvatar(owner.uuid, 'Visible', 'male');
		const commentUuid = crypto.randomUUID();
		await env.DB.prepare('INSERT INTO comments (uuid, resource_uuid, author_uuid, text) VALUES (?, ?, ?, ?)')
			.bind(commentUuid, resourceUuid, owner.uuid, 'Hello').run();
		const listed = await exports.default.fetch(`http://localhost:8787/api/comments/${resourceUuid}`);
		expect(listed.status).toBe(200);
		expect(await listed.json()).toContainEqual(expect.objectContaining({ uuid: commentUuid }));
		expect((await remove(`/api/comments/${commentUuid}`, other.cookie)).status).toBe(403);
		expect((await remove(`/api/comments/${commentUuid}`, owner.cookie)).status).toBe(200);
		expect(await (await exports.default.fetch(`http://localhost:8787/api/comments/${resourceUuid}`)).json()).toEqual([]);
	});

	it('validates resource IDs and comment bodies before creating records', async () => {
		const { cookie } = await createUser();
		expect((await exports.default.fetch('http://localhost:8787/api/comments/not-a-uuid')).status).toBe(400);
		const response = await exports.default.fetch('http://localhost:8787/api/comments/not-a-uuid', {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x' }),
		});
		expect(response.status).toBe(400);
	});
});

describe('wiki wall', () => {
	it('creates a wiki comment from an authenticated account', async () => {
		const { cookie } = await createUser();
		const response = await exports.default.fetch('http://localhost:8787/api/wiki/comments', {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: 'Documented step' }),
		});
		expect(response.status).toBe(200);
		expect((await env.DB.prepare('SELECT COUNT(*) AS total FROM wiki_comments').first<{ total: number }>())?.total).toBe(1);
	});

	it('lists public entries but deletes them only for their author', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const uuid = crypto.randomUUID();
		await env.DB.prepare('INSERT INTO wiki_comments (uuid, author_uuid, text) VALUES (?, ?, ?)').bind(uuid, owner.uuid, 'Hello').run();
		const listed = await exports.default.fetch('http://localhost:8787/api/wiki/comments');
		expect(listed.status).toBe(200);
		expect(await listed.json()).toContainEqual(expect.objectContaining({ uuid }));
		expect((await remove(`/api/wiki/comments/${uuid}`, other.cookie)).status).toBe(403);
		expect((await remove(`/api/wiki/comments/${uuid}`, owner.cookie)).status).toBe(200);
	});
});

describe('blog permissions', () => {
	it('shows an empty public list and prevents non-admin post creation', async () => {
		const listed = await exports.default.fetch('http://localhost:8787/api/blog');
		expect(listed.status).toBe(200);
		expect((await listed.json()) as { data: unknown[] }).toMatchObject({ data: [] });
		expect(await env.VRCSTORAGE_KV.get('blog:list:1:10')).not.toBeNull();
	});

	it('prevents non-admin post creation', async () => {
		const { cookie } = await createUser();
		const denied = await exports.default.fetch('http://localhost:8787/api/blog', {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat' },
		});
		expect(denied.status).toBe(403);
	});

	it('lets admins publish, edit and remove posts with matching public reads', async () => {
		const admin = await createUser('admin');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const headers = { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' };
		const created = await exports.default.fetch('http://localhost:8787/api/blog', {
			method: 'POST', headers, body: JSON.stringify({ title: 'First article', content: 'The article body' }),
		});
		expect(created.status).toBe(200);
		const { uuid } = (await created.json()) as { uuid: string };
		const read = await exports.default.fetch(`http://localhost:8787/api/blog/${uuid}`);
		expect((await read.json()) as { title: string }).toMatchObject({ title: 'First article' });
		const updated = await exports.default.fetch(`http://localhost:8787/api/blog/${uuid}`, {
			method: 'PUT', headers, body: JSON.stringify({ title: 'Updated article' }),
		});
		expect(updated.status).toBe(200);
		const edited = await exports.default.fetch(`http://localhost:8787/api/blog/${uuid}`);
		expect((await edited.json()) as { title: string }).toMatchObject({ title: 'Updated article' });
		expect((await exports.default.fetch(`http://localhost:8787/api/blog/${uuid}`, { method: 'DELETE', headers })).status).toBe(200);
		expect((await exports.default.fetch(`http://localhost:8787/api/blog/${uuid}`)).status).toBe(404);
	});

	it('creates blog comments and restricts deletion to the author or admin', async () => {
		const admin = await createUser('admin');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const post = await exports.default.fetch('http://localhost:8787/api/blog', {
			method: 'POST', headers: { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Commentable', content: 'Post body' }),
		});
		const { uuid } = (await post.json()) as { uuid: string };
		const author = await createUser('commenter');
		const other = await createUser('other');
		const created = await exports.default.fetch(`http://localhost:8787/api/blog/${uuid}/comments`, {
			method: 'POST', headers: { Cookie: author.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Useful article' }),
		});
		expect(created.status).toBe(200);
		const comment = (await created.json()) as { uuid: string };
		expect((await exports.default.fetch(`http://localhost:8787/api/blog/${uuid}/comments`)).status).toBe(200);
		expect((await remove(`/api/blog/comments/${comment.uuid}`, other.cookie)).status).toBe(403);
		expect((await remove(`/api/blog/comments/${comment.uuid}`, author.cookie)).status).toBe(200);
	});
});
