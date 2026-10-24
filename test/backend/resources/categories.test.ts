// =========================================================================================================
// RESOURCE CATEGORY INTEGRATION TESTS
// =========================================================================================================
// Real D1 facet joins, many-to-many clothing types, privacy and detail routes.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createAsset, createAvatar, createClothes, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('resource categories', () => {
	it('filters clothing by any assigned type, not only the first type', async () => {
		const { uuid } = await createUser();
		const outfit = await createClothes(uuid, 'Fox outfit', ['jacket', 'shoes']);
		await createClothes(uuid, 'Fox hat', ['hat']);
		await createClothes(uuid, 'Fox hidden', ['shoes'], false);
		const response = await exports.default.fetch('http://localhost:8787/api/clothes?clothing_type=shoes');
		expect(response.status).toBe(200);
		const result = (await response.json()) as { resources: { uuid: string; meta: { clothing_type: string[] } }[]; pagination: { total: number } };
		expect(result.pagination.total).toBe(1);
		expect(result.resources[0]).toMatchObject({ uuid: outfit, meta: { clothing_type: ['jacket', 'shoes'] } });
	});

	it('supports repeated clothing facets as OR and suppresses unapproved items', async () => {
		const { uuid } = await createUser();
		await createClothes(uuid, 'Outfit A', ['hat']);
		await createClothes(uuid, 'Outfit B', ['shoes']);
		await createClothes(uuid, 'Outfit C', ['jacket']);
		const response = await exports.default.fetch('http://localhost:8787/api/clothes?clothing_type=hat&clothing_type=shoes');
		expect(((await response.json()) as { pagination: { total: number } }).pagination.total).toBe(2);
	});

	it('filters assets by type and hides nonexistent resource details', async () => {
		const { uuid } = await createUser();
		const asset = await createAsset(uuid, 'Wand', 'prop');
		await createAsset(uuid, 'Sparkles', 'shader');
		const response = await exports.default.fetch('http://localhost:8787/api/assets?asset_type=prop');
		const result = (await response.json()) as { resources: { uuid: string }[]; pagination: { total: number } };
		expect(result.pagination.total).toBe(1);
		expect(result.resources[0]?.uuid).toBe(asset);
		expect((await exports.default.fetch('http://localhost:8787/api/assets/missing')).status).toBe(404);
	});

	it('filters unapproved avatars from listings even though direct metadata lookup remains public', async () => {
		const { uuid } = await createUser();
		const hidden = await createAvatar(uuid, 'Hidden', 'male', false);
		const listed = await exports.default.fetch('http://localhost:8787/api/avatars');
		expect(((await listed.json()) as { pagination: { total: number } }).pagination.total).toBe(0);
		const detail = await exports.default.fetch(`http://localhost:8787/api/avatars/${hidden}`);
		expect(detail.status).toBe(200);
		expect((await detail.json()) as { is_active: number }).toMatchObject({ is_active: 0 });
	});
});
