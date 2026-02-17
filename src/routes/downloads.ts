// =========================================================================================================
// DOWNLOAD ROUTES
// =========================================================================================================
// File download endpoints
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { Media } from '../types';

const downloads = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /:key
 * Descarga un archivo.
 */
downloads.get('/:key', async (c) => {
    const key = c.req.param('key');

    const stmt = c.env.DB.prepare('SELECT * FROM media WHERE r2_key = ?').bind(key);
    const result = await stmt.first<Media>();

    if (!result) return c.json({ error: 'Not found' }, 404);
    const isMedia: boolean = result.media_type === 'image' || result.media_type === 'video';

    if (!isMedia) {
        const user = await getAuthUser(c);
        if (!user) return c.json({ error: 'Unauthorized' }, 401);
    }

    const object = await c.env.BUCKET.get(key);
    if (!object) return c.json({ error: 'Not found' }, 404);

    const disposition = isMedia ? 'inline' : 'attachment';
    const filename = result.file_name.replace(/"/g, '');

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Disposition', `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);

    if (isMedia) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return new Response(object.body, {
        headers,
    });
});

export default downloads;
