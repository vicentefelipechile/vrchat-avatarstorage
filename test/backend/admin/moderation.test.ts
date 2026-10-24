// =========================================================================================================
// RESOURCE MODERATION INTEGRATION TESTS
// =========================================================================================================
// Approval is the publication boundary for listings, KV caches and the change feed.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createAvatar, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('admin publication', () => {
	it('publishes a pending avatar exactly at approval and clears stale cache keys', async () => {
		const owner = await createUser('owner');
		const admin = await createUser('admin');
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const uuid = await createAvatar(owner.uuid, 'Pending fox', 'female', false);
		await env.VRCSTORAGE_KV.put('resource:latest', 'stale');
		await env.VRCSTORAGE_KV.put('resource:category:avatars', 'stale');
		const before = await exports.default.fetch('http://localhost:8787/api/updates');
		expect(((await before.json()) as { changes: unknown[] }).changes).toHaveLength(0);
		const approved = await exports.default.fetch(`http://localhost:8787/api/admin/resource/${uuid}/approve`, {
			method: 'POST', headers: { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: '{}',
		});
		expect(approved.status).toBe(200);
		expect(await env.VRCSTORAGE_KV.get('resource:latest')).toBeNull();
		expect(await env.VRCSTORAGE_KV.get('resource:category:avatars')).toBeNull();
		const listed = await exports.default.fetch('http://localhost:8787/api/avatars');
		expect(((await listed.json()) as { pagination: { total: number } }).pagination.total).toBe(1);
		const updated = await exports.default.fetch('http://localhost:8787/api/updates?since=0');
		expect(((await updated.json()) as { changes: { scope: string }[] }).changes).toContainEqual(expect.objectContaining({ scope: 'avatars' }));
	});

	it('does not let unprivileged users approve pending resources', async () => {
		const owner = await createUser('owner');
		const uuid = await createAvatar(owner.uuid, 'Pending', 'male', false);
		const response = await exports.default.fetch(`http://localhost:8787/api/admin/resource/${uuid}/approve`, {
			method: 'POST', headers: { Cookie: owner.cookie, Origin: 'https://vrcstorage.lat' },
		});
		expect(response.status).toBe(403);
		const record = await env.DB.prepare('SELECT is_active FROM resources WHERE uuid = ?').bind(uuid).first<{ is_active: number }>();
		expect(record?.is_active).toBe(0);
	});
});
