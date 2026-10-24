// =========================================================================================================
// CATEGORY WRITE INTEGRATION TESTS
// =========================================================================================================
// Validate-only preflight must not write; real creates are pending until staff approval.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createAsset, createAvatar, createMedia, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

function write(path: string, cookie: string, payload: unknown, method = 'POST'): Promise<Response> {
	return exports.default.fetch(`http://localhost:8787${path}`, {
		method, headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
	});
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('resource category creation', () => {
	it.each([
		['avatars', { gender: 'male', avatar_size: 'medium', avatar_type: 'human' }, 'avatar_meta'],
		['assets', { asset_type: 'prop' }, 'asset_meta'],
		['clothes', { gender_fit: 'unisex', clothing_type: ['hat', 'shoes'] }, 'clothes_meta'],
	] as const)('creates a pending %s resource only after successful preflight', async (category, meta, table) => {
		const { cookie } = await createUser();
		const thumbnail_uuid = await createMedia('image');
		const payload = { title: 'New creation', category, thumbnail_uuid, meta };
		const preflight = await write(`/api/${category}?validate_only=true`, cookie, payload);
		expect(preflight.status).toBe(200);
		expect(await preflight.json()).toEqual({ valid: true });
		expect((await env.DB.prepare('SELECT COUNT(*) AS count FROM resources').first<{ count: number }>())?.count).toBe(0);
		const created = await write(`/api/${category}`, cookie, payload);
		expect(created.status).toBe(201);
		const { uuid } = (await created.json()) as { uuid: string };
		const row = await env.DB.prepare('SELECT is_active FROM resources WHERE uuid = ?').bind(uuid).first<{ is_active: number }>();
		expect(row?.is_active).toBe(0);
		expect(await env.DB.prepare(`SELECT resource_uuid FROM ${table} WHERE resource_uuid = ?`).bind(uuid).first()).not.toBeNull();
		if (category === 'clothes') {
			const types = await env.DB.prepare('SELECT clothing_type FROM clothes_clothing_types WHERE resource_uuid = ? ORDER BY clothing_type').bind(uuid).all<{ clothing_type: string }>();
			expect(types.results.map((row) => row.clothing_type)).toEqual(['hat', 'shoes']);
		}
	});

	it('rejects duplicate clothing types before any resource is stored', async () => {
		const { cookie } = await createUser();
		const thumbnail_uuid = await createMedia('image');
		const response = await write('/api/clothes', cookie, { title: 'Bad clothes', category: 'clothes', thumbnail_uuid, meta: { gender_fit: 'unisex', clothing_type: ['hat', 'hat'] } });
		expect(response.status).toBe(400);
		expect((await env.DB.prepare('SELECT COUNT(*) AS count FROM resources').first<{ count: number }>())?.count).toBe(0);
	});

	it('replaces clothes metadata atomically and saves a revision snapshot', async () => {
		const owner = await createUser('owner');
		const admin = await createUser('admin');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const thumbnail_uuid = await createMedia('image');
		const created = await write('/api/clothes', owner.cookie, { title: 'Hat', category: 'clothes', thumbnail_uuid, meta: { gender_fit: 'unisex', clothing_type: ['hat', 'shoes'] } });
		const { uuid } = (await created.json()) as { uuid: string };
		const updated = await write(`/api/clothes/${uuid}`, admin.cookie, { clothing_type: ['jacket'] }, 'PUT');
		expect(updated.status).toBe(200);
		const types = await env.DB.prepare('SELECT clothing_type FROM clothes_clothing_types WHERE resource_uuid = ?').bind(uuid).all<{ clothing_type: string }>();
		expect(types.results.map((row) => row.clothing_type)).toEqual(['jacket']);
		const history = await env.DB.prepare('SELECT change_type FROM resource_history WHERE resource_uuid = ?').bind(uuid).first<{ change_type: string }>();
		expect(history?.change_type).toBe('meta_edit');
	});

	it('restricts metadata edits to admins and records avatar and asset revisions', async () => {
		const owner = await createUser('owner');
		const admin = await createUser('admin');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const avatar = await createAvatar(owner.uuid, 'Avatar', 'male');
		const asset = await createAsset(owner.uuid, 'Asset', 'prop');
		const endpoint = (path: string, cookie: string, body: unknown) => exports.default.fetch(`http://localhost:8787${path}`, {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
		});
		expect((await endpoint(`/api/avatars/${avatar}`, owner.cookie, { gender: 'female' })).status).toBe(403);
		expect((await endpoint(`/api/avatars/${avatar}`, admin.cookie, { gender: 'female' })).status).toBe(200);
		expect((await endpoint(`/api/assets/${asset}`, admin.cookie, { asset_type: 'shader' })).status).toBe(200);
		const avatarHistory = await env.DB.prepare('SELECT previous_data FROM resource_history WHERE resource_uuid = ?').bind(avatar).first<{ previous_data: string }>();
		const assetHistory = await env.DB.prepare('SELECT previous_data FROM resource_history WHERE resource_uuid = ?').bind(asset).first<{ previous_data: string }>();
		expect(JSON.parse(avatarHistory!.previous_data)).toHaveProperty('after.gender', 'female');
		expect(JSON.parse(assetHistory!.previous_data)).toHaveProperty('after.asset_type', 'shader');
	});
});
