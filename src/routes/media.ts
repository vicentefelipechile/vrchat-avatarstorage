// =========================================================================================================
// MEDIA ROUTES
// =========================================================================================================
// Serves transformed image variants from MEDIA_BUCKET (or legacy BUCKET) via the Cloudflare Images binding.
// Cache API is used to avoid re-billing the same transformation twice.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { serveImage, type ImageVariant } from '../lib/image-transform';

// =========================================================================================================
// Helpers
// =========================================================================================================

const VALID_VARIANTS: ReadonlySet<string> = new Set(['thumbnail', 'preview', 'avatar', 'banner']);

// =========================================================================================================
// Endpoints
// =========================================================================================================

const media = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /media/:uuid/:variant
// Serves a transformed image variant (thumbnail, preview, avatar, banner).
// Reads image_media from D1 to resolve r2_key + r2_bucket discriminator, then calls serveImage().
// Cache-first: cached variants are served directly without a new transformation.
// =========================================================================================================

media.get('/:uuid/:variant', async (c) => {
	const uuid = c.req.param('uuid');
	const variant = c.req.param('variant');

	if (!VALID_VARIANTS.has(variant)) {
		return c.json({ error: 'Invalid variant. Must be one of: thumbnail, preview, avatar, banner' }, 400);
	}

	const row = await c.env.DB.prepare('SELECT r2_key, r2_bucket FROM image_media WHERE uuid = ?')
		.bind(uuid)
		.first<{ r2_key: string; r2_bucket: string }>();

	if (!row) return c.json({ error: 'Not found' }, 404);

	const origin = new URL(c.req.url).origin;
	const cacheKey = `${origin}/media/${uuid}/${variant}`;

	return serveImage(c.env, row.r2_key, row.r2_bucket, variant as ImageVariant, cacheKey);
});

// =========================================================================================================
// Export
// =========================================================================================================

export default media;
