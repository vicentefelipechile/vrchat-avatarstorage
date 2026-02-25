// =========================================================================================================
// DOWNLOAD ROUTES
// =========================================================================================================
// File download endpoints
// Public media (images/videos) → 302 redirect to CDN (cdn.vrcstorage.lat)
// Private files (zip/rar/etc.) → Worker stream with auth + Content-Disposition from DB
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { Media } from '../types';

const downloads = new Hono<{ Bindings: Env }>();

// The public CDN domain attached to the R2 bucket.
// Images/videos are redirected here directly — no Worker CPU used.
const CDN_DOMAIN = 'https://cdn.vrcstorage.lat';

/**
 * Endpoint: /:key
 * Serves a file from R2.
 * - Public media → 302 redirect to CDN (bypasses Worker)
 * - Private files  → auth check + streamed with original filename header
 */
downloads.get('/:key', async (c) => {
    const key = c.req.param('key');

    const stmt = c.env.DB.prepare('SELECT * FROM media WHERE r2_key = ?').bind(key);
    const result = await stmt.first<Media>();

    if (!result) return c.json({ error: 'Not found' }, 404);

    const isMedia: boolean = result.media_type === 'image' || result.media_type === 'video';

    if (isMedia) {
        // Images and videos are public — redirect to CDN to skip Worker overhead.
        // The CDN serves them with long-lived cache headers from R2 metadata.
        return c.redirect(`${CDN_DOMAIN}/${key}`, 302);
    }

    // Private files (archives) require authentication and need the original filename
    // set in Content-Disposition, which only exists in D1, not in R2 metadata.
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const object = await c.env.BUCKET.get(key);
    if (!object) return c.json({ error: 'Not found' }, 404);

    const filename = result.file_name.replace(/"/g, '');

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Cache-Control', 'private, no-store');

    return new Response(object.body, { headers });
});

export default downloads;
