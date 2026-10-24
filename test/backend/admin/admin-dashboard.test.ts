// =========================================================================================================
// ADMIN DASHBOARD INTEGRATION TESTS
// =========================================================================================================
// Admin-only listings, orphan statistics and sensitive-action protections.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { AdminService } from '../../../src/services/admin-service';
import type { UploadQueueMessage } from '../../../src/types';
import { createAvatar, createMedia, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

async function createAdmin(): Promise<{ uuid: string; cookie: string; username: string }> {
	const user = await createUser('admin');
	await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(user.uuid).run();
	return { ...user, username: 'admin' };
}

function get(path: string, cookie: string): Promise<Response> {
	return exports.default.fetch(`http://localhost:8787/api/admin/${path}`, { headers: { Cookie: cookie } });
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('admin dashboard', () => {
	it('lists users and pending resources without exposing them in public listings', async () => {
		const admin = await createAdmin();
		const owner = await createUser('owner');
		const pending = await createAvatar(owner.uuid, 'Pending fox', 'male', false);
		const users = await get('users?q=owner', admin.cookie);
		expect((await users.json()) as { users: { uuid: string }[] }).toMatchObject({ users: [{ uuid: owner.uuid }] });
		const resources = await get('resources?status=pending', admin.cookie);
		expect((await resources.json()) as { resources: { uuid: string }[] }).toMatchObject({ resources: [expect.objectContaining({ uuid: pending })] });
		const pendingList = await get('pending', admin.cookie);
		expect(await pendingList.json()).toContainEqual(expect.objectContaining({ uuid: pending }));
	});

	it('reports orphan candidates without deleting fresh media or referenced thumbnails', async () => {
		const admin = await createAdmin();
		const old = await createMedia('file');
		await env.DB.prepare('UPDATE media SET created_at = ? WHERE uuid = ?').bind(Math.floor(Date.now() / 1000) - 30 * 3600, old).run();
		const stats = await get('stats/orphaned-media', admin.cookie);
		expect(stats.status).toBe(200);
		expect(await env.DB.prepare('SELECT uuid FROM media WHERE uuid = ?').bind(old).first()).not.toBeNull();
		const denied = await exports.default.fetch('http://localhost:8787/api/admin/cleanup/orphaned-media', {
			method: 'POST', headers: { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: '{}',
		});
		expect(denied.status).toBe(400);
		expect(await env.DB.prepare('SELECT uuid FROM media WHERE uuid = ?').bind(old).first()).not.toBeNull();
	});

	it('denies role changes without a 2FA confirmation, even for admins', async () => {
		const admin = await createAdmin();
		const owner = await createUser('owner');
		const change = await exports.default.fetch('http://localhost:8787/api/admin/users/owner/role', {
			method: 'POST', headers: { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ is_admin: 1, code: '123456' }),
		});
		expect(change.status).toBe(401);
		expect((await env.DB.prepare('SELECT is_admin FROM users WHERE uuid = ?').bind(owner.uuid).first<{ is_admin: number }>())?.is_admin).toBe(0);
	});

	it('keeps housekeeping endpoints read-only by default', async () => {
		const admin = await createAdmin();
		const oldKey = crypto.randomUUID();
		await env.DB.prepare('INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), oldKey, 'file', 'archive.zip').run();
		const dryRun = await exports.default.fetch('http://localhost:8787/api/admin/media/unify-keys', { method: 'POST', headers: { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat' } });
		expect(dryRun.status).toBe(200);
		expect(await dryRun.json()).toMatchObject({ dry_run: true, migrated: 0 });
	});

	it('requires 2FA before promoting accounts and prevents self-role changes or admin bans', async () => {
		const service = new AdminService(env.DB);
		const admin = await createAdmin();
		const ordinary = await createUser('ordinary');
		await expect(service.changeRole(admin.username, 'ordinary', 1)).rejects.toMatchObject({ status: 400 });
		await expect(service.changeRole(admin.username, admin.username, false)).rejects.toMatchObject({ status: 400 });
		await expect(service.banUser(admin.username, admin.username, true)).rejects.toMatchObject({ status: 400 });
		await expect(service.banUser(admin.username, admin.username + '-missing', true)).rejects.toMatchObject({ status: 404 });
		await expect(service.banUser(admin.username, admin.username, 'true')).rejects.toMatchObject({ status: 400 });
		await env.DB.prepare('UPDATE users SET two_factor_enabled = 1 WHERE uuid = ?').bind(ordinary.uuid).run();
		expect(await service.changeRole(admin.username, 'ordinary', true)).toBe(true);
		await expect(service.banUser(admin.username, 'ordinary', true)).rejects.toMatchObject({ status: 400 });
	});

	it('dry-runs and migrates media keys only after the old R2 object is present', async () => {
		const user = await createUser();
		const uuid = crypto.randomUUID();
		const oldKey = 'legacy-avatar-key';
		await env.DB.prepare('INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)').bind(uuid, oldKey, 'image', 'avatar.png').run();
		await env.DB.prepare('UPDATE users SET avatar_url = ? WHERE uuid = ?').bind(`/api/download/${oldKey}`, user.uuid).run();
		const service = new AdminService(env.DB);
		const bucket = env.BUCKET;
		const missing = await service.unifyMediaKeys(bucket, { dryRun: true });
		expect(missing.skipped_missing_original).toContainEqual({ uuid, r2_key: oldKey });
		await bucket.put(oldKey, 'original');
		const preview = await service.unifyMediaKeys(bucket, { dryRun: true });
		expect(preview).toMatchObject({ candidates: 1, would_migrate: 1, migrated: 0, remaining: 1 });
		expect(await bucket.head(uuid)).toBeNull();
		const migrated = await service.unifyMediaKeys(bucket, { dryRun: false, limit: 1 });
		expect(migrated).toMatchObject({ migrated: 1, remaining: 0 });
		expect(await bucket.head(oldKey)).toBeNull();
		expect(await bucket.head(uuid)).not.toBeNull();
		expect((await env.DB.prepare('SELECT r2_key FROM media WHERE uuid = ?').bind(uuid).first<{ r2_key: string }>())?.r2_key).toBe(uuid);
		expect((await env.DB.prepare('SELECT avatar_url FROM users WHERE uuid = ?').bind(user.uuid).first<{ avatar_url: string }>())?.avatar_url).toBe(`/api/download/${uuid}`);
	});

	it('rejects deleting yourself or another admin and deletes resources of an ordinary user', async () => {
		const service = new AdminService(env.DB);
		const admin = await createAdmin();
		const owner = await createUser('owner');
		const thumbnail = await createMedia('image');
		await env.BUCKET.put(thumbnail, 'original');
		await createAvatar(owner.uuid, 'Owned resource', 'male');
		await expect(service.deleteUser(admin.username, admin.username, env.BUCKET, env.MEDIA_BUCKET)).rejects.toMatchObject({ status: 400 });
		await expect(service.deleteUser('owner', admin.username, env.BUCKET, env.MEDIA_BUCKET)).rejects.toMatchObject({ status: 400 });
		expect(await service.deleteUser(admin.username, 'owner', env.BUCKET, env.MEDIA_BUCKET)).toBe(1);
		expect(await env.DB.prepare('SELECT uuid FROM users WHERE uuid = ?').bind(owner.uuid).first()).toBeNull();
	});

	it('rejects pending resources and removes their unreferenced variants from both buckets', async () => {
		const owner = await createUser('owner');
		const resourceUuid = await createAvatar(owner.uuid, 'Rejected', 'male', false);
		const thumbnail = await env.DB.prepare('SELECT thumbnail_uuid FROM resources WHERE uuid = ?').bind(resourceUuid).first<{ thumbnail_uuid: string }>();
		const mediaUuid = thumbnail!.thumbnail_uuid;
		const variantKey = `${mediaUuid}/low.webp`;
		await env.BUCKET.put(mediaUuid, 'original');
		await env.MEDIA_BUCKET.put(variantKey, 'variant');
		await env.DB.prepare('INSERT INTO media_variants (media_uuid, res, format, r2_key, file_size) VALUES (?, ?, ?, ?, ?)')
			.bind(mediaUuid, 'low', 'webp', variantKey, 7).run();
		await new AdminService(env.DB).rejectResource(resourceUuid, env.BUCKET, env.MEDIA_BUCKET);
		expect(await env.DB.prepare('SELECT uuid FROM resources WHERE uuid = ?').bind(resourceUuid).first()).toBeNull();
		expect(await env.DB.prepare('SELECT uuid FROM media WHERE uuid = ?').bind(mediaUuid).first()).toBeNull();
		expect(await env.BUCKET.head(mediaUuid)).toBeNull();
		expect(await env.MEDIA_BUCKET.head(variantKey)).toBeNull();
	});

	it('backfills only image rows with no existing variants', async () => {
		const pending = await createMedia('image', 'pending.png');
		const ready = await createMedia('image', 'ready.png');
		await env.DB.prepare('INSERT INTO media_variants (media_uuid, res, format, r2_key, file_size) VALUES (?, ?, ?, ?, ?)')
			.bind(ready, 'low', 'webp', `${ready}/low.webp`, 7).run();
		const messages: UploadQueueMessage[] = [];
		const queue = { send: async (message: UploadQueueMessage) => { messages.push(message); } } as unknown as Queue<UploadQueueMessage>;
		expect(await new AdminService(env.DB).backfillVariants(queue)).toBe(1);
		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ media_uuid: pending, r2_key: pending, media_type: 'image', file_name: 'backfill' });
	});

	it('clamps timeseries to 7..90 days and fills missing calendar dates with zeros', async () => {
		const service = new AdminService(env.DB);
		expect((await service.timeseries(1)).days).toHaveLength(7);
		const maximum = await service.timeseries(500);
		expect(maximum.days).toHaveLength(90);
		expect(maximum.uploads).toHaveLength(90);
		expect(maximum.registrations).toHaveLength(90);
		expect(maximum.uploads.every((value) => value === 0)).toBe(true);
	});
});
