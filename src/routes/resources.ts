// =========================================================================================================
// RESOURCE ROUTES
// =========================================================================================================
// Resource browsing, creation, and SEO endpoints
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { Resource, ResourceCategory, RESOURCE_CATEGORIES, User, Media, ResourceLink } from '../types';
import { ResourceSchema } from '../validators';
import { verifyTurnstile } from './utils';

const resources = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /latest
 * Este endpoint existe para que la pagina principal "/" pueda mostrar los ultimos 6 recursos subidos.
 * 
 * Solo enviar:
 * - r.category
 * - r.uuid
 * - r.title
 * - m.r2_key => r.thumbnail_key
 * - r.created_at
 * - r.download_count
 */
resources.get('/latest', async (c) => {
    // 1. Try KV
    const cached = await c.env.VRCSTORAGE_KV.get('resource:latest', 'json');
    if (cached) {
        return c.json(cached);
    }

    const stmt = c.env.DB.prepare(`
        SELECT
            r.category,
            r.uuid,
            r.title,
            r.thumbnail_uuid,
            r.created_at,
            r.download_count,
            m.r2_key as thumbnail_key
        FROM resources r
        INNER JOIN media m ON r.thumbnail_uuid = m.uuid
        WHERE r.is_active = 1
        ORDER BY r.created_at DESC
        LIMIT 6
    `);

    const { results } = await stmt.all();
    c.header('Cache-Control', 'public, max-age=60');

    // 2. Update KV
    await c.env.VRCSTORAGE_KV.put('resource:latest', JSON.stringify(results), { expirationTtl: 60 });

    return c.json(results);
});

/**
 * Endpoint: /category/:category
 * Solo muestra los ultimos 25 recursos de la categoria solicitada.
 */
resources.get('/category/:category', async (c) => {
    const category = c.req.param('category');
    if (!category) return c.json({ error: 'Missing category' }, 400);

    if (!RESOURCE_CATEGORIES.includes(category as ResourceCategory)) return c.json({ error: 'Invalid category' }, 400);

    // 1. Try KV
    const cached = await c.env.VRCSTORAGE_KV.get(`resource:category:${category}`, 'json');
    if (cached) {
        return c.json(cached);
    }

    const stmt = c.env.DB.prepare(`
		SELECT r.*, m.r2_key as thumbnail_key 
		FROM resources r 
		LEFT JOIN media m ON r.thumbnail_uuid = m.uuid 
		WHERE r.category = ? AND r.is_active = 1 
		ORDER BY r.created_at DESC
	`).bind(category);
    const { results } = await stmt.all<Resource & { thumbnail_key: string | null }>();

    const mapped = results.map(r => ({
        ...r,
        timestamp: r.created_at * 1000
    }));

    const response = { resources: mapped };

    // 2. Update KV
    await c.env.VRCSTORAGE_KV.put(`resource:category:${category}`, JSON.stringify(response), { expirationTtl: 300 }); // 5 mins

    return c.json(response);
});

/**
 * Endpoint: /:uuid
 * Muestra en detalle la informacion de un recurso para su descarga.
 */
resources.get('/:uuid', async (c) => {
    const uuid = c.req.param('uuid');
    if (!uuid) return c.json({ error: 'Missing uuid' }, 400);

    // 1. Try KV
    const cached = await c.env.VRCSTORAGE_KV.get(`resource:${uuid}`, 'json');
    if (cached) {
        return c.json(cached);
    }

    const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();
    if (!resource) return c.json({ error: 'Not found' }, 404);

    // Get author
    const author = await c.env.DB.prepare('SELECT uuid, username, avatar_url FROM users WHERE uuid = ?')
        .bind(resource.author_uuid).first<User>();

    // Get thumbnail media
    const thumbnail = await c.env.DB.prepare('SELECT * FROM media WHERE uuid = ?')
        .bind(resource.thumbnail_uuid).first<Media>();

    // Get reference image if exists
    let referenceImage: Media | null = null;
    if (resource.reference_image_uuid) {
        referenceImage = await c.env.DB.prepare('SELECT * FROM media WHERE uuid = ?')
            .bind(resource.reference_image_uuid).first<Media>();
    }

    // Get all associated media files
    const mediaFiles = await c.env.DB.prepare(
        `SELECT m.* FROM media m
		 JOIN resource_n_media rm ON m.uuid = rm.media_uuid
		 WHERE rm.resource_uuid = ?`
    ).bind(uuid).all<Media>();

    // Get all resource links
    const links = await c.env.DB.prepare(
        'SELECT * FROM resource_links WHERE resource_uuid = ? ORDER BY display_order ASC'
    ).bind(uuid).all<ResourceLink>();

    const isLoggedIn = !!(await getAuthUser(c));

    // Construct download URLs from links
    const downloadLinks = links.results.filter(l => l.link_type === 'download');
    const downloadUrl = downloadLinks.length > 0 ? downloadLinks[0].link_url : null;
    const backupUrls = downloadLinks.slice(1).map(l => l.link_url);

    return c.json({
        ...resource,
        resourceUuid: resource.uuid,
        timestamp: resource.created_at * 1000,
        author: author ? { uuid: author.uuid, username: author.username, avatar_url: author.avatar_url } : null,
        thumbnail: thumbnail ? { uuid: thumbnail.uuid, r2_key: thumbnail.r2_key, media_type: thumbnail.media_type } : null,
        referenceImage: referenceImage,
        mediaFiles: mediaFiles.results,
        links: links.results,
        canDownload: isLoggedIn,
        downloadUrl,
        backupUrls
    });
});

/**
 * Endpoint: /
 * Sube un nuevo recurso.
 */
resources.post('/', async (c) => {
    const authUser = await getAuthUser(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    // Get author
    const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<User>();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const body = await c.req.json();

    // Validation
    const { title, description, category, thumbnail_uuid, reference_image_uuid, links, media_files, token } = ResourceSchema.parse(body);

    // Turnstile Verification
    const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
    if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

    const resourceUuid = crypto.randomUUID();
    try {
        // Insert resource
        await c.env.DB.prepare(
            'INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(resourceUuid, title, description || null, category, thumbnail_uuid, reference_image_uuid || null, user.uuid).run();

        // Insert resource links if provided
        if (links && Array.isArray(links)) {
            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                const linkUuid = crypto.randomUUID();
                await c.env.DB.prepare(
                    'INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order) VALUES (?, ?, ?, ?, ?, ?)'
                ).bind(
                    linkUuid,
                    resourceUuid,
                    link.link_url,
                    link.link_title || null,
                    link.link_type || 'general',
                    link.display_order ?? i
                ).run();
            }
        }

        // Insert media file associations if provided
        if (media_files && Array.isArray(media_files)) {
            for (const mediaUuid of media_files) {
                const relationUuid = crypto.randomUUID();
                await c.env.DB.prepare(
                    'INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid) VALUES (?, ?, ?)'
                ).bind(relationUuid, resourceUuid, mediaUuid).run();
            }
        }

        // Invalidate KV Caches
        await c.env.VRCSTORAGE_KV.delete('resource:latest');
        await c.env.VRCSTORAGE_KV.delete(`resource:category:${category}`);

        return c.json({ success: true, uuid: resourceUuid });
    } catch (e) {
        console.error('Create resource error:', e);
        return c.json({ error: 'Failed to create resource' }, 500);
    }
});

/**
 * Endpoint: /item/:uuid
 * Sirve el HTML principal pero con los metadatos OG inyectados para el recurso especifico.
 */
resources.get('/item/:uuid', async (c) => {
    const uuid = c.req.param('uuid');
    if (!uuid) return c.json({ error: 'UUID is required' }, 400);

    try {
        const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();

        if (resource && resource.is_active) {
            // Get thumbnail
            const thumbnail = await c.env.DB.prepare('SELECT * FROM media WHERE uuid = ?').bind(resource.thumbnail_uuid).first<Media>();

            // Fetch original index.html
            const indexResponse = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
            let html = await indexResponse.text();

            // Replace Meta Tags
            const title = resource.title;
            const description = resource.description || 'VRCStorage & Asset Storage';
            const imageUrl = thumbnail ? `${new URL(c.req.url).origin}/api/download/${thumbnail.r2_key}` : `${new URL(c.req.url).origin}/favicon.svg`;
            const url = `${new URL(c.req.url).origin}/item/${uuid}`;

            // Simple replacements (asegurandose que coincidan con lo que hay en public/index.html)
            html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
            html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
            html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
            html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${imageUrl}">`);
            html = html.replace(/<title>[^<]*<\/title>/, `<title>${title} - VRCStorage</title>`);

            return c.html(html);
        }
    } catch (e) {
        console.error('Error injecting OG tags:', e);
    }

    // Fallback to normal serving if not found or error
    return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
});

export default resources;
