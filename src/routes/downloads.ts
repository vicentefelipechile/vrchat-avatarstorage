// =========================================================================================================
// DOWNLOAD ROUTES
// =========================================================================================================
// File download endpoints
// Public media (images/videos) → Worker stream with inline Content-Disposition + cache headers
// Private files (zip/rar/etc.) → Worker stream with auth + attachment Content-Disposition from DB
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { Media } from '../types';

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Enforces a strict Content-Type allowlist for files served from R2.
 *
 * Only MIME types in the safe prefix list are returned as-is. Everything else
 * (including text/html, text/javascript, image/svg+xml, etc.) is coerced to
 * `application/octet-stream` so the browser will never execute the content.
 *
 * This prevents the attack chain: upload malicious .html/.svg → share R2 link
 * → victim opens link → XSS via R2 content.
 */
const SAFE_CONTENT_TYPE_PREFIXES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/ogg'];

function safeContentType(raw: string | undefined | null): string {
	const ct = (raw ?? '').toLowerCase().split(';')[0].trim();
	return SAFE_CONTENT_TYPE_PREFIXES.some((prefix) => ct === prefix) ? ct : 'application/octet-stream';
}

// =========================================================================================================
// Endpoints
// =========================================================================================================

const downloads = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /:key
// Serves a file from R2.
// - Public media → streamed directly from bucket, public cache headers
// - Private files  → auth check + streamed with attachment filename header
//                    + increments resource download_count via waitUntil
// =========================================================================================================

downloads.get('/:key', async (c) => {
	const key = c.req.param('key');

	const result = await c.env.DB.prepare('SELECT * FROM media WHERE r2_key = ?').bind(key).first<Media>();
	if (!result) return c.json({ error: 'Not found' }, 404);

	const isMedia: boolean = result.media_type === 'image' || result.media_type === 'video';

	if (!isMedia) {
		// Private files (archives) require authentication and need the original filename
		// set in Content-Disposition, which only exists in D1, not in R2 metadata.
		const user = await getAuthUser(c);
		if (!user) return c.json({ error: 'Unauthorized' }, 401);
	}

	const object = await c.env.BUCKET.get(key);
	if (!object) return c.json({ error: 'Not found' }, 404);

	const filename = result.file_name.replace(/"/g, '');

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('ETag', object.httpEtag);
	// Always enforce safe Content-Type to prevent R2-hosted HTML/SVG/JS execution
	headers.set('Content-Type', safeContentType(headers.get('Content-Type')));
	// Prevent MIME-type sniffing by the browser — must respect our Content-Type declaration
	headers.set('X-Content-Type-Options', 'nosniff');

	if (isMedia) {
		// Public media: inline disposition, long-lived cache
		headers.set('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
		headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	} else {
		// Private files: attachment disposition, no cache
		headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
		headers.set('Cache-Control', 'private, no-store');

		// Increment download_count on the parent resource after the response is sent.
		// We resolve the resource via the resource_media join table using the media UUID.
		c.executionCtx.waitUntil(
			c.env.DB.prepare(
				`UPDATE resources
				    SET download_count = download_count + 1
				  WHERE uuid = (
				      SELECT resource_uuid FROM resource_n_media WHERE media_uuid = ? LIMIT 1
				  )`,
			)
				.bind(result.uuid)
				.run(),
		);
	}

	return new Response(object.body, { headers });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default downloads;
