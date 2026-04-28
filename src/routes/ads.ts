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

/** Returns today's date string in YYYY-MM-DD format (UTC). Used by stats endpoints. */
function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Weighted random sample without replacement.
 *
 * Performs `count` draws from `pool` using each item's `display_weight` as its
 * relative probability. An item with weight 10 is ~10× more likely to be drawn
 * than one with weight 1, but the outcome is genuinely random on every request.
 * Already-drawn items are excluded from subsequent draws (no duplicates).
 *
 * Falls back to the full pool (in weight-descending order) if count >= pool.length.
 */
function weightedSample<T extends { display_weight: number }>(pool: T[], count: number): T[] {
	if (count >= pool.length) return [...pool];

	const remaining = pool.map((item, idx) => ({ item, idx }));
	const result: T[] = [];

	for (let draw = 0; draw < count; draw++) {
		const totalWeight = remaining.reduce((sum, r) => sum + Math.max(r.item.display_weight, 1), 0);
		let pick = Math.random() * totalWeight;

		let chosen = remaining.length - 1; // fallback to last
		for (let i = 0; i < remaining.length; i++) {
			pick -= Math.max(remaining[i].item.display_weight, 1);
			if (pick <= 0) {
				chosen = i;
				break;
			}
		}

		result.push(remaining[chosen].item);
		remaining.splice(chosen, 1);
	}

	return result;
}

// =========================================================================================================
// Endpoints
// =========================================================================================================

const ads = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/ads
// Fetch active ads for a given slot (?slot=sidebar_left) or all active ads (?slot=all).
// Uses weighted random selection — higher display_weight ads appear more often but not exclusively.
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

		// Fetch all approved and active ads (DB order doesn't matter — selection is random)
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
			WHERE ca.is_active = 1 AND ca.is_approved = 1`,
		).all<CommunityAdPublic>();

		const pool = result.results;

		if (pool.length === 0) {
			return c.json({ ads: [] });
		}

		if (slot === 'all') {
			return c.json({ ads: pool });
		}

		// Weighted random selection: probability proportional to display_weight.
		const selected = weightedSample(pool, maxConcurrent);
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
	const cache = await c.env.VRCSTORAGE_KV.get(`ads:${uuid}`);
	if (cache) {
		return c.json({ ad: JSON.parse(cache) });
	}

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
		await c.env.VRCSTORAGE_KV.put(`ads:${uuid}`, JSON.stringify(ad), { expirationTtl: 60 * 60 * 24 });

		return c.json({ ad });
	} catch (e) {
		console.error('GET item-detail-ad-zone:uuid error:', e);
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
