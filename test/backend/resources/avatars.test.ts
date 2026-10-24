// =========================================================================================================
// AVATAR LISTING INTEGRATION TESTS
// =========================================================================================================
// Covers real migrations, visibility, faceted filters, search and route validation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createAvatar, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('avatar listings', () => {
	it('excludes unapproved avatars and filters repeated values without losing pagination', async () => {
		const { uuid } = await createUser();
		const first = await createAvatar(uuid, 'Forest fox', 'male');
		const second = await createAvatar(uuid, 'Forest cat', 'female');
		await createAvatar(uuid, 'Forest hidden', 'male', false);
		await createAvatar(uuid, 'Desert wolf', 'both');

		const response = await exports.default.fetch('http://localhost:8787/api/avatars?q=Forest&avatar_gender=male&avatar_gender=female&limit=1&page=1');
		expect(response.status).toBe(200);
		const result = (await response.json()) as { resources: { uuid: string }[]; pagination: { total: number; hasNextPage: boolean } };
		expect(result.pagination.total).toBe(2);
		expect(result.pagination.hasNextPage).toBe(true);
		expect([first, second]).toContain(result.resources[0]?.uuid);
	});

	it('escapes wildcard characters in name search and ignores unsupported filters', async () => {
		const { uuid } = await createUser();
		await createAvatar(uuid, '100% fox', 'male');
		await createAvatar(uuid, '100 cats', 'male');
		const response = await exports.default.fetch('http://localhost:8787/api/avatars?q=100%25');
		const result = (await response.json()) as { pagination: { total: number } };
		expect(result.pagination.total).toBe(1);
		const fallback = await exports.default.fetch('http://localhost:8787/api/avatars?avatar_gender=invalid');
		expect(fallback.status).toBe(200);
		expect(((await fallback.json()) as { pagination: { total: number } }).pagination.total).toBe(2);
	});
});
