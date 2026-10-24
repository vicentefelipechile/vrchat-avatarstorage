// =========================================================================================================
// RESOURCE SERVICE TESTS
// =========================================================================================================
// Cover ownership gates, history snapshots, link ordering and reference-safe R2 deletion.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { ResourceService } from '../../../src/services/resource-service';
import type { AuthUser } from '../../../src/auth';
import { createMedia, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

function authUser(uuid: string, username: string, isAdmin = false): AuthUser {
	return { uuid, username, is_admin: isAdmin, is_anonymous: false, is_banned: false };
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('resource edits', () => {
	it('restricts edits to owners/admins and snapshots admin changes', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const thumbnail = await createMedia('image');
		const service = new ResourceService(env.DB);
		const { uuid } = await service.create(authUser(owner.uuid, 'owner'), { title: 'Draft', category: 'assets', thumbnail_uuid: thumbnail });
		await expect(service.update(authUser(other.uuid, 'other'), uuid, { title: 'Stolen' })).rejects.toMatchObject({ status: 403 });
		await service.update(authUser(owner.uuid, 'owner'), uuid, { title: 'Owner edit' });
		await env.DB.prepare('UPDATE resources SET is_active = 1 WHERE uuid = ?').bind(uuid).run();
		await expect(service.update(authUser(owner.uuid, 'owner'), uuid, { title: 'Public edit' })).rejects.toMatchObject({ status: 403 });
		await service.update(authUser(other.uuid, 'admin', true), uuid, { title: 'Admin edit', is_active: 1 });
		const row = await env.DB.prepare('SELECT title, is_active FROM resources WHERE uuid = ?').bind(uuid).first<{ title: string; is_active: number }>();
		expect(row).toEqual({ title: 'Admin edit', is_active: 1 });
		const history = await env.DB.prepare('SELECT change_type, previous_data FROM resource_history WHERE resource_uuid = ?').bind(uuid).all<{ change_type: string; previous_data: string }>();
		expect(history.results.map(({ change_type }) => change_type)).toContain('content_edit');
		expect(JSON.parse(history.results[0]!.previous_data)).toHaveProperty('after.title', 'Admin edit');
	});

	it('enforces exact link reorder sets and allows owners to update links', async () => {
		const owner = await createUser();
		const thumbnail = await createMedia('image');
		const service = new ResourceService(env.DB);
		const { uuid } = await service.create(authUser(owner.uuid, 'tester'), {
			title: 'With links', category: 'assets', thumbnail_uuid: thumbnail,
			links: [{ link_url: 'https://one.example' }, { link_url: 'https://two.example' }],
		});
		const links = await env.DB.prepare('SELECT uuid, display_order FROM resource_links WHERE resource_uuid = ? ORDER BY display_order').bind(uuid).all<{ uuid: string; display_order: number }>();
		const ordered = links.results.map(({ uuid }) => uuid);
		await expect(service.reorderLinks(authUser(owner.uuid, 'tester'), uuid, [ordered[0]!])).rejects.toMatchObject({ status: 400 });
		await service.reorderLinks(authUser(owner.uuid, 'tester'), uuid, [...ordered].reverse());
		await service.updateLink(authUser(owner.uuid, 'tester'), uuid, ordered[0]!, { link_title: 'Updated' });
		const changed = await env.DB.prepare('SELECT link_title, display_order FROM resource_links WHERE uuid = ?').bind(ordered[0]).first<{ link_title: string; display_order: number }>();
		expect(changed).toMatchObject({ link_title: 'Updated', display_order: 1 });
		await expect(service.updateLink(authUser(owner.uuid, 'tester'), uuid, ordered[0]!, {})).rejects.toMatchObject({ status: 400 });
	});
});

describe('resource deletion and media references', () => {
	it('preserves a shared thumbnail until the final referencing resource is deleted', async () => {
		const owner = await createUser();
		const admin = authUser(crypto.randomUUID(), 'admin', true);
		const thumbnail = await createMedia('image');
		const r2Key = thumbnail;
		const variantKey = `${thumbnail}/low.webp`;
		await env.BUCKET.put(r2Key, 'original');
		await env.MEDIA_BUCKET.put(variantKey, 'variant');
		await env.DB.prepare('INSERT INTO media_variants (media_uuid, res, format, r2_key, file_size) VALUES (?, ?, ?, ?, ?)')
			.bind(thumbnail, 'low', 'webp', variantKey, 7).run();
		const service = new ResourceService(env.DB);
		const input = { title: 'Shared', category: 'assets', thumbnail_uuid: thumbnail };
		const first = await service.create(authUser(owner.uuid, 'tester'), input);
		const second = await service.create(authUser(owner.uuid, 'tester'), input);
		await service.delete(admin, first.uuid, env.BUCKET, env.MEDIA_BUCKET);
		expect(await env.BUCKET.head(r2Key)).not.toBeNull();
		expect(await env.MEDIA_BUCKET.head(variantKey)).not.toBeNull();
		await service.delete(admin, second.uuid, env.BUCKET, env.MEDIA_BUCKET);
		expect(await env.BUCKET.head(r2Key)).toBeNull();
		expect(await env.MEDIA_BUCKET.head(variantKey)).toBeNull();
		expect(await env.DB.prepare('SELECT uuid FROM media WHERE uuid = ?').bind(thumbnail).first()).toBeNull();
	});
});
