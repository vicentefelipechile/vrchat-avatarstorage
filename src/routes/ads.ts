// =========================================================================================================
// ADS ROUTES
// =========================================================================================================
// Public and authenticated routes for the Community Ads system.
// All endpoints are mounted at /api/ads.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { CommunityAd, CommunityAdPublic, AdSlotConfig } from '../types';
import { AdSubmitSchema, AdUpdateSchema } from '../validators';

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Deterministic daily rotation seed.
 * Returns a pseudo-random number in [0, 1) that is stable for a given (date + slot) combination.
 * All users see the same ads on the same day.
 */
function dailySeed(slot: string): number {
	const today = new Date().toISOString().slice(0, 10); // "2026-04-25"
	const str = today + ':' + slot;
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = (h * 0x01000193) >>> 0;
	}
	return h / 0xffffffff;
}

/**
 * Deterministic shuffle using a seeded PRNG (Mulberry32).
 * Returns a new array — does not mutate the original.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
	const out = [...arr];
	let s = (seed * 0xffffffff) >>> 0;
	for (let i = out.length - 1; i > 0; i--) {
		s ^= s << 13;
		s ^= s >> 17;
		s ^= s << 5;
		const j = (s >>> 0) % (i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Returns today's date string in YYYY-MM-DD format (UTC). */
function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

// =========================================================================================================
// Endpoints
// =========================================================================================================

const ads = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/ads
// Fetch active ads for a given slot (?slot=sidebar_left) or all active ads (?slot=all).
// Uses deterministic daily rotation — same result for every user on the same day.
// =========================================================================================================

ads.get('/', async (c) => {
	const slot = c.req.query('slot') || '';
	const VALID_SLOTS = ['sidebar_left', 'featured_artist', 'grid_card', 'detail_banner', 'all'];

	if (!VALID_SLOTS.includes(slot)) {
		return c.json({ error: 'Invalid or missing slot parameter' }, 400);
	}

	try {
		// Get slot config (skip for 'all')
		let maxConcurrent = 999;
		if (slot !== 'all') {
			const config = await c.env.DB.prepare('SELECT max_concurrent, is_enabled FROM ad_slot_config WHERE slot_name = ?')
				.bind(slot)
				.first<Pick<AdSlotConfig, 'max_concurrent' | 'is_enabled'>>();

			if (!config || !config.is_enabled) {
				return c.json({ ads: [] });
			}
			maxConcurrent = config.max_concurrent;
		}

		// Fetch all approved and active ads
		const result = await c.env.DB.prepare(
			`SELECT
				ca.uuid, ca.title, ca.tagline, ca.service_type,
				ca.destination_type, ca.external_url, ca.display_weight,
				u.username as author_username,
				bm.r2_key as banner_r2_key,
				cm.r2_key as card_r2_key
			FROM community_ads ca
			LEFT JOIN users u ON ca.author_uuid = u.uuid
			LEFT JOIN media bm ON ca.banner_media_uuid = bm.uuid
			LEFT JOIN media cm ON ca.card_media_uuid = cm.uuid
			WHERE ca.is_active = 1 AND ca.is_approved = 1
			ORDER BY ca.display_weight DESC`,
		).all<CommunityAdPublic>();

		const pool = result.results;

		if (pool.length === 0) {
			return c.json({ ads: [] });
		}

		if (slot === 'all') {
			return c.json({ ads: pool });
		}

		// Deterministic daily shuffle — sort by weight first, then shuffle within each weight tier
		const seed = dailySeed(slot);
		const shuffled = seededShuffle(pool, seed);
		// Stable sort: keep higher-weight ads at the front after shuffle
		shuffled.sort((a, b) => b.display_weight - a.display_weight);

		const selected = shuffled.slice(0, maxConcurrent);
		return c.json({ ads: selected });
	} catch (e) {
		console.error('GET /api/ads error:', e);
		return c.json({ error: 'Failed to fetch ads' }, 500);
	}
});

// =========================================================================================================
// GET /api/ads/:uuid
// Get a single ad's public details (for internal advertiser page).
// =========================================================================================================

ads.get('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	try {
		const ad = await c.env.DB.prepare(
			`SELECT
				ca.uuid, ca.title, ca.tagline, ca.description, ca.service_type,
				ca.destination_type, ca.external_url, ca.display_weight,
				u.username as author_username,
				bm.r2_key as banner_r2_key,
				cm.r2_key as card_r2_key,
				ip.content as internal_page_content
			FROM community_ads ca
			LEFT JOIN users u ON ca.author_uuid = u.uuid
			LEFT JOIN media bm ON ca.banner_media_uuid = bm.uuid
			LEFT JOIN media cm ON ca.card_media_uuid = cm.uuid
			LEFT JOIN ad_internal_pages ip ON ip.ad_uuid = ca.uuid
			WHERE ca.uuid = ? AND ca.is_active = 1 AND ca.is_approved = 1`,
		)
			.bind(uuid)
			.first<CommunityAdPublic & { description: string | null; internal_page_content: string | null }>();

		if (!ad) return c.json({ error: 'Ad not found' }, 404);
		return c.json({ ad });
	} catch (e) {
		console.error('GET /api/ads/:uuid error:', e);
		return c.json({ error: 'Failed to fetch ad' }, 500);
	}
});

// =========================================================================================================
// POST /api/ads
// Submit a new ad for review. Requires authentication.
// =========================================================================================================

ads.post('/', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400);
	}

	const parsed = AdSubmitSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: 'Validation error', details: parsed.error.issues }, 400);

	const data = parsed.data;

	// If external destination, external_url is required
	if (data.destination_type === 'external' && !data.external_url) {
		return c.json({ error: 'external_url is required when destination_type is external' }, 400);
	}

	try {
		const uuid = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		await c.env.DB.prepare(
			`INSERT INTO community_ads (
				uuid,
				author_uuid,
				title,
				tagline,
				description,
				service_type,
				banner_media_uuid,
				card_media_uuid,
				destination_type,
				external_url,
				is_active,
				is_approved,
				display_weight,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?)`,
		)
			.bind(
				uuid,
				user.uuid,
				data.title,
				data.tagline,
				data.description ?? null,
				data.service_type,
				data.banner_media_uuid ?? null,
				data.card_media_uuid ?? null,
				data.destination_type,
				data.external_url ?? null,
				now,
				now,
			)
			.run();

		// Upsert internal page content if provided and destination is internal
		if (data.destination_type === 'internal' && data.description) {
			await c.env.DB.prepare(
				`INSERT INTO ad_internal_pages (ad_uuid, content)
				VALUES (?, ?)
				ON CONFLICT(ad_uuid) DO UPDATE SET content = excluded.content`,
			)
				.bind(uuid, data.description)
				.run();
		}

		return c.json({ success: true, uuid }, 201);
	} catch (e) {
		console.error('POST /api/ads error:', e);
		return c.json({ error: 'Failed to create ad' }, 500);
	}
});

// =========================================================================================================
// PUT /api/ads/:uuid
// Edit own ad. Re-triggers approval (sets is_approved=0) if content fields changed.
// =========================================================================================================

ads.put('/:uuid', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const uuid = c.req.param('uuid');

	const existing = await c.env.DB.prepare('SELECT * FROM community_ads WHERE uuid = ?').bind(uuid).first<CommunityAd>();
	if (!existing) return c.json({ error: 'Ad not found' }, 404);

	// Only owner or admin can edit
	if (existing.author_uuid !== user.uuid && !user.is_admin) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400);
	}

	const parsed = AdUpdateSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: 'Validation error', details: parsed.error.issues }, 400);

	const data = parsed.data;

	// Content changes require re-approval
	const contentChanged =
		(data.title !== undefined && data.title !== existing.title) ||
		(data.tagline !== undefined && data.tagline !== existing.tagline) ||
		(data.description !== undefined && data.description !== existing.description) ||
		(data.external_url !== undefined && data.external_url !== existing.external_url);

	try {
		const now = Math.floor(Date.now() / 1000);
		const sets: string[] = ['updated_at = ?'];
		const bindings: unknown[] = [now];

		if (data.title !== undefined) { sets.push('title = ?'); bindings.push(data.title); }
		if (data.tagline !== undefined) { sets.push('tagline = ?'); bindings.push(data.tagline); }
		if (data.description !== undefined) { sets.push('description = ?'); bindings.push(data.description ?? null); }
		if (data.service_type !== undefined) { sets.push('service_type = ?'); bindings.push(data.service_type); }
		if (data.destination_type !== undefined) { sets.push('destination_type = ?'); bindings.push(data.destination_type); }
		if (data.external_url !== undefined) { sets.push('external_url = ?'); bindings.push(data.external_url ?? null); }
		if (data.banner_media_uuid !== undefined) { sets.push('banner_media_uuid = ?'); bindings.push(data.banner_media_uuid ?? null); }
		if (data.card_media_uuid !== undefined) { sets.push('card_media_uuid = ?'); bindings.push(data.card_media_uuid ?? null); }

		if (contentChanged) {
			sets.push('is_approved = 0');
			sets.push('is_active = 0');
		}

		bindings.push(uuid);
		await c.env.DB.prepare(`UPDATE community_ads SET ${sets.join(', ')} WHERE uuid = ?`).bind(...bindings).run();

		// Update internal page if applicable
		if (data.description !== undefined) {
			const destType = data.destination_type ?? existing.destination_type;
			if (destType === 'internal' && data.description) {
				await c.env.DB.prepare(
					`INSERT INTO ad_internal_pages (ad_uuid, content)
					VALUES (?, ?)
					ON CONFLICT(ad_uuid) DO UPDATE SET content = excluded.content`,
				)
					.bind(uuid, data.description)
					.run();
			} else {
				await c.env.DB.prepare('DELETE FROM ad_internal_pages WHERE ad_uuid = ?').bind(uuid).run();
			}
		}

		return c.json({ success: true, re_approval_required: contentChanged });
	} catch (e) {
		console.error('PUT /api/ads/:uuid error:', e);
		return c.json({ error: 'Failed to update ad' }, 500);
	}
});

// =========================================================================================================
// DELETE /api/ads/:uuid
// Delete an ad. Owner or admin only.
// =========================================================================================================

ads.delete('/:uuid', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const uuid = c.req.param('uuid');
	const existing = await c.env.DB.prepare('SELECT author_uuid, banner_media_uuid, card_media_uuid FROM community_ads WHERE uuid = ?')
		.bind(uuid)
		.first<Pick<CommunityAd, 'author_uuid' | 'banner_media_uuid' | 'card_media_uuid'>>();

	if (!existing) return c.json({ error: 'Ad not found' }, 404);
	if (existing.author_uuid !== user.uuid && !user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	try {
		// Deleting the row cascades to ad_internal_pages and ad_stats via FK ON DELETE CASCADE
		await c.env.DB.prepare('DELETE FROM community_ads WHERE uuid = ?').bind(uuid).run();
		return c.json({ success: true });
	} catch (e) {
		console.error('DELETE /api/ads/:uuid error:', e);
		return c.json({ error: 'Failed to delete ad' }, 500);
	}
});

// =========================================================================================================
// POST /api/ads/:uuid/impression
// Register an anonymous impression for an ad (no PII collected).
// =========================================================================================================

ads.post('/:uuid/impression', async (c) => {
	const uuid = c.req.param('uuid');
	const today = todayUtc();
	try {
		await c.env.DB.prepare(
			`INSERT INTO ad_stats (uuid, ad_uuid, stat_date, impressions, clicks)
			VALUES (?, ?, ?, 1, 0)
			ON CONFLICT(ad_uuid, stat_date) DO UPDATE SET impressions = impressions + 1`,
		)
			.bind(crypto.randomUUID(), uuid, today)
			.run();
		return c.json({ success: true });
	} catch (e) {
		console.error('POST /api/ads/:uuid/impression error:', e);
		return c.json({ error: 'Failed to record impression' }, 500);
	}
});

// =========================================================================================================
// POST /api/ads/:uuid/click
// Register an anonymous click for an ad (no PII collected).
// =========================================================================================================

ads.post('/:uuid/click', async (c) => {
	const uuid = c.req.param('uuid');
	const today = todayUtc();
	try {
		await c.env.DB.prepare(
			`INSERT INTO ad_stats (uuid, ad_uuid, stat_date, impressions, clicks)
			VALUES (?, ?, ?, 0, 1)
			ON CONFLICT(ad_uuid, stat_date) DO UPDATE SET clicks = clicks + 1`,
		)
			.bind(crypto.randomUUID(), uuid, today)
			.run();
		return c.json({ success: true });
	} catch (e) {
		console.error('POST /api/ads/:uuid/click error:', e);
		return c.json({ error: 'Failed to record click' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default ads;
