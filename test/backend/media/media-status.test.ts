// =========================================================================================================
// MEDIA STATUS INTEGRATION TESTS
// =========================================================================================================
// Check readiness against the variant table through the public API.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createMedia } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('media status', () => {
	it('tracks media readiness from the variant table', async () => {
		const key = await createMedia('image');
		const url = `http://localhost:8787/api/media/${key}/status`;
		expect(await (await exports.default.fetch(url)).json()).toEqual({ processed: false });
		await env.DB.prepare('INSERT INTO media_variants (media_uuid, res, format, r2_key, file_size) VALUES (?, ?, ?, ?, ?)')
			.bind(key, 'low', 'webp', `${key}/low.webp`, 50).run();
		expect(await (await exports.default.fetch(url)).json()).toEqual({ processed: true });
	});
});
