// =========================================================================================================
// AVATAR AUTHOR INTEGRATION TESTS
// =========================================================================================================
// Admin CRUD, unique slugs, public profiles and linked-avatar deletion protection.
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

function adminRequest(path: string, cookie: string, method: string, body?: unknown): Promise<Response> {
	return exports.default.fetch(`http://localhost:8787${path}`, {
		method, headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
	});
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('avatar authors', () => {
	it('creates a unique slug, lists and searches it, and permits admin edits', async () => {
		const admin = await createUser();
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const created = await adminRequest('/api/authors', admin.cookie, 'POST', { name: 'Fox Creator' });
		expect(created.status).toBe(201);
		const author = (await created.json()) as { slug: string; uuid: string };
		expect(author.slug).toBe('fox-creator');
		expect((await adminRequest('/api/authors', admin.cookie, 'POST', { name: 'Fox Creator' })).status).toBe(409);
		const list = await exports.default.fetch('http://localhost:8787/api/authors');
		expect(((await list.json()) as { pagination: { total: number } }).pagination.total).toBe(1);
		const search = await exports.default.fetch('http://localhost:8787/api/authors/search?q=Fox');
		expect(await search.json()).toContainEqual(expect.objectContaining({ uuid: author.uuid }));
		expect((await adminRequest(`/api/authors/${author.slug}`, admin.cookie, 'PUT', { description: 'Updated' })).status).toBe(200);
		const profile = await exports.default.fetch(`http://localhost:8787/api/authors/${author.slug}`);
		expect((await profile.json()) as { author: { description: string } }).toMatchObject({ author: { description: 'Updated' } });
		expect((await adminRequest(`/api/authors/${author.slug}`, admin.cookie, 'DELETE')).status).toBe(200);
	});

	it('does not delete an author while an avatar is linked', async () => {
		const admin = await createUser('admin');
		const owner = await createUser('owner');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const { slug } = (await (await adminRequest('/api/authors', admin.cookie, 'POST', { name: 'Foxy' })).json()) as { slug: string };
		const resource_uuid = await createAvatar(owner.uuid, 'Foxy avatar', 'male');
		const linked = await adminRequest(`/api/authors/${slug}/link-resource`, admin.cookie, 'POST', { resource_uuid });
		expect(linked.status).toBe(200);
		expect((await adminRequest(`/api/authors/${slug}`, admin.cookie, 'DELETE')).status).toBe(409);
	});

	it('rejects ordinary users before reading author mutation payloads', async () => {
		const { cookie } = await createUser();
		const response = await adminRequest('/api/authors', cookie, 'POST');
		expect(response.status).toBe(403);
	});
});
