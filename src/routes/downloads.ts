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
const SAFE_CONTENT_TYPE_PREFIXES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'video/mp4',
	'video/webm',
	'video/ogg',
];

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

	// Check image_media first; fall back to asset_files for binary downloads.
	const imgRow = await c.env.DB.prepare('SELECT uuid, media_type, file_name, r2_bucket FROM image_media WHERE r2_key = ?')
		.bind(key)
		.first<{ uuid: string; media_type: string; file_name: string; r2_bucket: string }>();

	const assetRow = imgRow
		? null
		: await c.env.DB.prepare('SELECT uuid, mime_type, file_name FROM asset_files WHERE r2_key = ?')
			.bind(key)
			.first<{ uuid: string; mime_type: string; file_name: string }>();

	if (!imgRow && !assetRow) return c.json({ error: 'Not found' }, 404);

	// Determine whether this is public media or a private binary asset
	const isMedia: boolean = imgRow ? (imgRow.media_type === 'image' || imgRow.media_type === 'video') : false;

	if (!isMedia) {
		const user = await getAuthUser(c);
		if (!user) return c.json({ error: 'Unauthorized' }, 401);
	}

	// Route R2 read to the correct bucket
	let object: R2ObjectBody | null;
	if (imgRow) {
		const bucket = imgRow.r2_bucket === 'media' ? c.env.MEDIA_BUCKET : c.env.BUCKET;
		object = await bucket.get(key);
	} else {
		object = await c.env.BUCKET.get(key);
	}
	if (!object) return c.json({ error: 'Not found' }, 404);

	const filename = (imgRow?.file_name ?? assetRow!.file_name).replace(/"/g, '');

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('ETag', object.httpEtag);
	headers.set('Content-Type', safeContentType(headers.get('Content-Type')));
	headers.set('X-Content-Type-Options', 'nosniff');

	if (isMedia) {
		headers.set('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
		headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	} else {
		headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
		headers.set('Cache-Control', 'private, no-store');

		const mediaUuid = imgRow?.uuid ?? assetRow!.uuid;
		c.executionCtx.waitUntil(
			c.env.DB.prepare(
				`UPDATE resources
				    SET download_count = download_count + 1
				  WHERE uuid = (
				      SELECT resource_uuid FROM resource_n_media WHERE media_uuid = ? LIMIT 1
				  )`,
			)
				.bind(mediaUuid)
				.run(),
		);
	}

	return new Response(object.body, { headers });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default downloads;
