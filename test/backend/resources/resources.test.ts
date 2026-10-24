// =========================================================================================================
// GENERIC RESOURCE INTEGRATION TESTS
// =========================================================================================================
// Search, pagination, cached public reads and authentication-gated download links.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import * as OTPAuth from 'otpauth';
import { describe, expect, it } from 'vitest';

import { generateTwoFactorSecret } from '../../../src/auth/2fa';
import { createAsset, createAvatar, createClothes, createMedia, createUser } from '../../setup/fixtures';
import { ResourceService } from '../../../src/services/resource-service';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('public resources', () => {
	it('searches active titles with parameterized filters and paginates results', async () => {
		const { uuid } = await createUser();
		await createAvatar(uuid, 'Fox warrior', 'male');
		await createAvatar(uuid, 'Fox mage', 'female');
		await createAvatar(uuid, 'Unapproved fox', 'both', false);
		await createAsset(uuid, 'Fox prop', 'prop');
		const response = await exports.default.fetch('http://localhost:8787/api/resources?q=Fox&category=avatars&limit=1&page=2');
		expect(response.status).toBe(200);
		const result = (await response.json()) as { resources: { category: string }[]; pagination: { page: number; hasPrevPage: boolean; hasNextPage: boolean } };
		expect(result.resources).toHaveLength(1);
		expect(result.resources[0]?.category).toBe('avatars');
		expect(result.pagination).toMatchObject({ page: 2, hasPrevPage: true, hasNextPage: false });
	});

	it('does not disclose private file links until an authenticated user requests the detail', async () => {
		const user = await createUser();
		const uuid = await createAvatar(user.uuid, 'Resource with link', 'male');
		await env.DB.prepare('INSERT INTO resource_links (uuid, resource_uuid, link_url, link_type) VALUES (?, ?, ?, ?)')
			.bind(crypto.randomUUID(), uuid, '/api/download/private-key', 'download').run();
		const url = `http://localhost:8787/api/resources/${uuid}`;
		const anonymous = (await (await exports.default.fetch(url)).json()) as { downloadUrl: string | null; links: unknown[]; canDownload: boolean };
		expect(anonymous).toMatchObject({ downloadUrl: null, links: [], canDownload: false });
		const authorized = (await (await exports.default.fetch(url, { headers: { Cookie: user.cookie } })).json()) as { downloadUrl: string | null; canDownload: boolean };
		expect(authorized).toMatchObject({ downloadUrl: '/api/download/private-key', canDownload: true });
	});

	it('returns a cacheable latest list and records it in KV', async () => {
		const { uuid } = await createUser();
		await createAvatar(uuid, 'First', 'male');
		const response = await exports.default.fetch('http://localhost:8787/api/resources/latest');
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
		expect(await response.json()).toHaveLength(1);
		expect(await env.VRCSTORAGE_KV.get('resource:latest')).not.toBeNull();
	});

	it('maps metadata for every category and preserves gallery references in resource details', async () => {
		const owner = await createUser();
		const asset = await createAsset(owner.uuid, 'Shader', 'shader');
		const clothes = await createClothes(owner.uuid, 'Jacket', ['jacket', 'accessory']);
		const gallery = await createMedia('image', 'gallery.png');
		await env.DB.prepare('INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid) VALUES (?, ?, ?)').bind(crypto.randomUUID(), asset, gallery).run();
		const service = new ResourceService(env.DB);
		expect((await service.detail(asset, false)).meta).toMatchObject({ asset_type: 'shader' });
		expect((await service.detail(clothes, false)).meta).toMatchObject({ clothing_type: ['accessory', 'jacket'] });
		expect((await service.detail(asset, false)).mediaFiles).toMatchObject([expect.objectContaining({ uuid: gallery })]);
	});

	it('creates a generic resource through the HTTP route and keeps it pending', async () => {
		const user = await createUser();
		const thumbnail_uuid = await createMedia('image');
		const response = await exports.default.fetch('http://localhost:8787/api/resources', {
			method: 'POST', headers: { Cookie: user.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'New generic', description: 'A description', category: 'assets', thumbnail_uuid }),
		});
		expect(response.status).toBe(200);
		const { uuid } = (await response.json()) as { uuid: string };
		expect(await env.DB.prepare('SELECT is_active FROM resources WHERE uuid = ?').bind(uuid).first()).toMatchObject({ is_active: 0 });
	});

	it('returns history snapshots and resolves referenced resource labels', async () => {
		const owner = await createUser('owner');
		const referenced = await createAsset(owner.uuid, 'Referenced asset', 'prop');
		const resource = await createAvatar(owner.uuid, 'History avatar', 'male');
		const actorUuid = owner.uuid;
		await env.DB.prepare('INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data) VALUES (?, ?, ?, ?, ?)')
			.bind(crypto.randomUUID(), resource, actorUuid, 'meta_edit', JSON.stringify({ meta_type: 'avatar_meta', fields: { author_uuid: referenced }, after: { author_uuid: referenced } })).run();
		const response = await exports.default.fetch(`http://localhost:8787/api/resources/${resource}/history`, { headers: { Cookie: owner.cookie } });
		expect(response.status).toBe(200);
		expect(await response.json()).toContainEqual(expect.objectContaining({ reference_labels: { [referenced]: 'Referenced asset' } }));
	});

	it('deletes a resource only for an admin with a valid sensitive action code', async () => {
		const admin = await createUser('admin');
		await env.DB.prepare('UPDATE users SET is_admin = 1, two_factor_enabled = 1 WHERE uuid = ?').bind(admin.uuid).run();
		const resource = await createAvatar(admin.uuid, 'Delete me', 'male');
		const thumbnail = await env.DB.prepare('SELECT thumbnail_uuid FROM resources WHERE uuid = ?').bind(resource).first<{ thumbnail_uuid: string }>();
		await env.BUCKET.put(thumbnail!.thumbnail_uuid, 'image bytes');
		const { secret } = generateTwoFactorSecret('admin');
		const keyBytes = new TextEncoder().encode(env.JWT_SECRET);
		const encrypted = btoa([...secret].map((char, index) => String.fromCharCode(char.charCodeAt(0) ^ keyBytes[index % keyBytes.length])).join(''));
		await env.DB.prepare('UPDATE users SET two_factor_secret = ? WHERE uuid = ?').bind(encrypted, admin.uuid).run();
		const code = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30, algorithm: 'SHA1' }).generate();
		const response = await exports.default.fetch(`http://localhost:8787/api/resources/${resource}`, {
			method: 'DELETE', headers: { Cookie: admin.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
		});
		expect(response.status).toBe(200);
		expect(await env.DB.prepare('SELECT uuid FROM resources WHERE uuid = ?').bind(resource).first()).toBeNull();
		expect(await env.BUCKET.head(thumbnail!.thumbnail_uuid)).toBeNull();
	});
});
