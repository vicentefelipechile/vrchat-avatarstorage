// =========================================================================================================
// DOWNLOAD ROUTES
// =========================================================================================================
// File download endpoints
// Public media (images/videos) → Worker stream with inline Content-Disposition + cache headers
// Private files (zip/rar/etc.) → Worker stream with auth + attachment Content-Disposition from DB
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { Media } from '../types';

const downloads = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /:key
 * Serves a file from R2.
 * - Public media → streamed directly from bucket, public cache headers
 * - Private files  → auth check + streamed with attachment filename header
 */
downloads.get('/:key', async (c) => {
    const key = c.req.param('key');

    const stmt = c.env.DB.prepare('SELECT * FROM media WHERE r2_key = ?').bind(key);
    const result = await stmt.first<Media>();

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
    headers.set('etag', object.httpEtag);
    
    if (isMedia) {
        // Public media: inline disposition, long-lived cache
        headers.set('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
        // Private files: attachment disposition, no cache
        headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        headers.set('Cache-Control', 'private, no-store');
    }

    return new Response(object.body, { headers });
});

export default downloads;
