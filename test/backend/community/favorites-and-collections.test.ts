// =========================================================================================================
// FAVORITES AND COLLECTIONS INTEGRATION TESTS
// =========================================================================================================
// Authorization, owner isolation, validation, duplicate guards and deletion behavior.
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

function write(path: string, method: string, cookie: string, body?: unknown): Promise<Response> {
	return exports.default.fetch(`http://localhost:8787${path}`, {
		method,
		headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('favorites', () => {
	it('returns benign results for anonymous reads and protects private lists', async () => {
		expect(await (await exports.default.fetch('http://localhost:8787/api/favorites/ids')).json()).toEqual({ favorites: [] });
		expect(await (await exports.default.fetch(`http://localhost:8787/api/favorites/check/${crypto.randomUUID()}`)).json()).toEqual({ is_favorite: false });
		expect((await exports.default.fetch('http://localhost:8787/api/favorites')).status).toBe(401);
	});

	it('adds only active resources, prevents duplicates and isolates users', async () => {
		const user = await createUser('owner');
		const other = await createUser('other');
		const visible = await createAvatar(user.uuid, 'Public', 'male');
		const hidden = await createAvatar(user.uuid, 'Pending', 'male', false);
		expect((await write('/api/favorites', 'POST', user.cookie, { resource_uuid: hidden })).status).toBe(403);
		expect((await write('/api/favorites', 'POST', user.cookie, { resource_uuid: visible })).status).toBe(200);
		expect((await write('/api/favorites', 'POST', user.cookie, { resource_uuid: visible })).status).toBe(400);
		expect(await (await exports.default.fetch('http://localhost:8787/api/favorites/ids', { headers: { Cookie: user.cookie } })).json()).toEqual({ favorites: [visible] });
		expect(await (await exports.default.fetch('http://localhost:8787/api/favorites/ids', { headers: { Cookie: other.cookie } })).json()).toEqual({ favorites: [] });
		expect((await write(`/api/favorites/${visible}`, 'DELETE', other.cookie)).status).toBe(404);
		expect((await write(`/api/favorites/${visible}`, 'DELETE', user.cookie)).status).toBe(200);
	});

	it('reorders the global tab without overwriting collection order', async () => {
		const owner = await createUser();
		const first = await createAvatar(owner.uuid, 'First', 'male');
		const second = await createAvatar(owner.uuid, 'Second', 'female');
		const created = await write('/api/collections', 'POST', owner.cookie, { name: 'Selected' });
		const collection = (await created.json()) as { uuid: string };
		for (const resource_uuid of [first, second]) {
			expect((await write('/api/favorites', 'POST', owner.cookie, { resource_uuid, collection_uuid: collection.uuid })).status).toBe(200);
		}
		const before = await env.DB.prepare('SELECT resource_uuid, display_order FROM user_favorites WHERE user_uuid = ? ORDER BY resource_uuid').bind(owner.uuid).all<{ resource_uuid: string; display_order: number }>();
		expect((await write('/api/favorites/reorder', 'POST', owner.cookie, { ordered_uuids: [second, first], collection_uuid: 'all' })).status).toBe(200);
		const after = await env.DB.prepare('SELECT resource_uuid, display_order, global_order FROM user_favorites WHERE user_uuid = ? ORDER BY resource_uuid').bind(owner.uuid).all<{ resource_uuid: string; display_order: number; global_order: number }>();
		expect(after.results.map(({ display_order }) => display_order)).toEqual(before.results.map(({ display_order }) => display_order));
		expect(after.results.find(({ resource_uuid }) => resource_uuid === second)!.global_order).toBeGreaterThan(after.results.find(({ resource_uuid }) => resource_uuid === first)!.global_order);
	});
});

describe('collections', () => {
	it('creates, lists, renames and deletes without allowing cross-owner changes', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const created = await write('/api/collections', 'POST', owner.cookie, { name: 'Outfits' });
		expect(created.status).toBe(201);
		const collection = (await created.json()) as { uuid: string };
		const ownerList = await exports.default.fetch('http://localhost:8787/api/collections', { headers: { Cookie: owner.cookie } });
		expect((await ownerList.json()) as { collections: { uuid: string }[] }).toMatchObject({ collections: [{ uuid: collection.uuid }] });
		expect((await write(`/api/collections/${collection.uuid}`, 'PUT', other.cookie, { name: 'Stolen' })).status).toBe(403);
		expect((await write(`/api/collections/${collection.uuid}`, 'PUT', owner.cookie, { name: 'Updated' })).status).toBe(200);
		expect((await write(`/api/collections/${collection.uuid}`, 'DELETE', other.cookie)).status).toBe(403);
		expect((await write(`/api/collections/${collection.uuid}`, 'DELETE', owner.cookie)).status).toBe(200);
	});

	it('moves favorites between collections and preserves them when a collection is deleted', async () => {
		const owner = await createUser();
		const resource = await createAvatar(owner.uuid, 'Saved', 'male');
		const first = (await (await write('/api/collections', 'POST', owner.cookie, { name: 'First' })).json()) as { uuid: string };
		const second = (await (await write('/api/collections', 'POST', owner.cookie, { name: 'Second' })).json()) as { uuid: string };
		expect((await write('/api/favorites', 'POST', owner.cookie, { resource_uuid: resource, collection_uuid: first.uuid })).status).toBe(200);
		expect((await write(`/api/favorites/${resource}/collection`, 'PUT', owner.cookie, { collection_uuid: second.uuid })).status).toBe(200);
		expect((await env.DB.prepare('SELECT collection_uuid FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?').bind(owner.uuid, resource).first<{ collection_uuid: string }>())?.collection_uuid).toBe(second.uuid);
		expect((await write(`/api/collections/${second.uuid}`, 'DELETE', owner.cookie)).status).toBe(200);
		expect((await env.DB.prepare('SELECT collection_uuid FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?').bind(owner.uuid, resource).first<{ collection_uuid: string | null }>())?.collection_uuid).toBeNull();
	});

	it('validates names before writing to D1', async () => {
		const { cookie } = await createUser();
		expect((await write('/api/collections', 'POST', cookie, { name: '' })).status).toBe(400);
		expect((await write('/api/collections', 'POST', cookie, { name: 'x'.repeat(51) })).status).toBe(400);
	});
});
