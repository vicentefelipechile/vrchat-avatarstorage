// =========================================================================================================
// SCHEDULED ORPHAN CLEANUP TESTS
// =========================================================================================================
// The cron removes only unreferenced media in its 24h–48h age window, from R2 and D1.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';

import { describe, expect, it } from 'vitest';

import worker from '../../../src/index';
import { createAvatar, createMedia, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('orphan cleanup cron', () => {
	it('removes only eligible orphans and all of their variant objects', async () => {
		const { uuid } = await createUser();
		const referenced = await createAvatar(uuid, 'Active', 'male');
		const orphan = await createMedia('image');
		const fresh = await createMedia('image');
		const tooOld = await createMedia('file');
		const now = Math.floor(Date.now() / 1000);
		await env.DB.prepare('UPDATE media SET created_at = ? WHERE uuid = ?').bind(now - 30 * 3600, orphan).run();
		await env.DB.prepare('UPDATE media SET created_at = ? WHERE uuid = ?').bind(now - 50 * 3600, tooOld).run();
		await env.DB.prepare('INSERT INTO media_variants (media_uuid, res, format, r2_key, file_size) VALUES (?, ?, ?, ?, ?)')
			.bind(orphan, 'low', 'webp', `${orphan}/low.webp`, 5).run();
		for (const key of [orphan, fresh, tooOld]) await env.BUCKET.put(key, 'original');
		await env.MEDIA_BUCKET.put(`${orphan}/low.webp`, 'variant');

		const ctx = createExecutionContext();
		await worker.scheduled(createScheduledController({ cron: '0 3 * * *', scheduledTime: new Date() }), env, ctx);
		await waitOnExecutionContext(ctx);

		expect(await env.DB.prepare('SELECT uuid FROM media WHERE uuid = ?').bind(orphan).first()).toBeNull();
		expect(await env.BUCKET.head(orphan)).toBeNull();
		expect(await env.MEDIA_BUCKET.head(`${orphan}/low.webp`)).toBeNull();
		for (const key of [fresh, tooOld]) expect(await env.BUCKET.head(key)).not.toBeNull();
		expect((await env.DB.prepare('SELECT uuid FROM resources WHERE uuid = ?').bind(referenced).first())).not.toBeNull();
	});
});
