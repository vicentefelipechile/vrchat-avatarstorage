// =========================================================================================================
// RESOURCE ROUTES
// =========================================================================================================
// Resource browsing, creation, and SEO endpoints
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { Resource, ResourceCategory, RESOURCE_CATEGORIES, User, Media, ResourceLink, ResourceHistory, Tag } from '../types';
import { ResourceSchema } from '../validators';
import { verifyTurnstile } from './utils';
import { z } from 'zod';

const resources = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /latest
 * Este endpoint existe para que la pagina principal "/" pueda mostrar los ultimos 6 recursos subidos.
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
            m.r2_key as thumbnail_key,
            u.username as author_username,
            u.avatar_url as author_avatar
        FROM resources r
        INNER JOIN media m ON r.thumbnail_uuid = m.uuid
        LEFT JOIN users u ON r.author_uuid = u.uuid
        WHERE r.is_active = 1
        ORDER BY r.created_at DESC
        LIMIT 10
    `);

    const { results } = await stmt.all<any>();
    c.header('Cache-Control', 'public, max-age=60');

    const mapped = results.map(r => ({
        ...r,
        timestamp: r.created_at * 1000,
        author: r.author_username ? { username: r.author_username, avatar_url: r.author_avatar } : null
    }));

    // 2. Update KV
    await c.env.VRCSTORAGE_KV.put('resource:latest', JSON.stringify(mapped), { expirationTtl: 60 });

    return c.json(mapped);
});

/**
 * Endpoint: / (Search)
 * Búsqueda general con filtros, paginación y búsqueda de texto completo (FTS).
 */
resources.get('/', async (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const limit = 15;
    const offset = (page - 1) * limit;
    
    const query = c.req.query('q');
    const category = c.req.query('category');
    const tagsParam = c.req.query('tags'); // Comma separated tags
    
    // Base params
    const params: any[] = [];
    let whereClauses = ['r.is_active = 1'];
    let joinClauses = [
        'LEFT JOIN media m ON r.thumbnail_uuid = m.uuid',
        'LEFT JOIN users u ON r.author_uuid = u.uuid'
    ];

    // 1. Full Text Search
    if (query) {
        joinClauses.push('INNER JOIN resources_fts fts ON r.rowid = fts.rowid');
        whereClauses.push('fts MATCH ?');
        params.push(query);
    }

    // 2. Category Filter
    if (category && RESOURCE_CATEGORIES.includes(category as ResourceCategory)) {
        whereClauses.push('r.category = ?');
        params.push(category);
    }

    // 3. Tags Filter
    if (tagsParam) {
        const tagsList = tagsParam.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (tagsList.length > 0) {
            // This checks if the resource has ANY of the provided tags (OR logic)
            // For AND logic, we'd need COUNT(DISTINCT tag_id) = tagsList.length
            // D1 doesn't support complex IN clause easily with binding arrays, so we construct placeholders
            const placeholders = tagsList.map(() => '?').join(',');
            whereClauses.push(`EXISTS (
                SELECT 1 FROM resource_tags rt 
                JOIN tags t ON rt.tag_id = t.id 
                WHERE rt.resource_uuid = r.uuid AND t.name IN (${placeholders})
            )`);
            params.push(...tagsList);
        }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const joinSql = joinClauses.join(' ');

    const sql = `
        SELECT 
            r.*, 
            m.r2_key as thumbnail_key,
            u.username as author_username,
            u.avatar_url as author_avatar
        FROM resources r 
        ${joinSql}
        ${whereSql}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
    `;

    // Add pagination params
    params.push(limit + 1, offset);

    try {
        const { results } = await c.env.DB.prepare(sql).bind(...params).all<Resource & { thumbnail_key: string | null; author_username: string | null; author_avatar: string | null }>();

        const hasNextPage = results.length > limit;
        const paginatedResults = hasNextPage ? results.slice(0, limit) : results;

        const mapped = paginatedResults.map(r => ({
            ...r,
            timestamp: r.created_at * 1000,
            author: r.author_username ? { username: r.author_username, avatar_url: r.author_avatar } : null
        }));

        return c.json({
            resources: mapped,
            pagination: {
                page,
                hasNextPage,
                hasPrevPage: page > 1
            }
        });
    } catch (e) {
        console.error('Search error:', e);
        return c.json({ error: 'Search failed' }, 500);
    }
});

/**
 * Endpoint: /category/:category
 * Deprecated but kept for compatibility - redirect logic or reuse search?
 * Keeping it simple as alias to search with category param.
 */
resources.get('/category/:category', async (c) => {
    // Redirect to new search endpoint format internally or client side?
    // Let's just forward logic, but simpler to just use the code above. 
    // For now, I'll copy the minimal logic to keep it working as is.
    const category = c.req.param('category');
    return c.redirect(`/api/resources?category=${category}`);
});

/**
 * Endpoint: /:uuid
 * Muestra en detalle la informacion de un recurso.
 */
resources.get('/:uuid', async (c) => {
    const uuid = c.req.param('uuid');
    if (!uuid) return c.json({ error: 'Missing uuid' }, 400);

    // Try KV? Maybe skip for now to ensure tags are fresh, or handle cache invalidation carefully.
    
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

    // Get Tags
    const tags = await c.env.DB.prepare(`
        SELECT t.id, t.name 
        FROM tags t
        JOIN resource_tags rt ON t.id = rt.tag_id
        WHERE rt.resource_uuid = ?
    `).bind(uuid).all<Tag>();

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
        tags: tags.results, // Added tags
        canDownload: isLoggedIn,
        downloadUrl,
        backupUrls
    });
});

/**
 * Endpoint: /:uuid/history
 * Muestra el historial de cambios de un recurso (Git-like view)
 */
resources.get('/:uuid/history', async (c) => {
    const uuid = c.req.param('uuid');
    
    try {
        const history = await c.env.DB.prepare(`
            SELECT h.*, u.username, u.avatar_url 
            FROM resource_history h
            LEFT JOIN users u ON h.actor_uuid = u.uuid
            WHERE h.resource_uuid = ?
            ORDER BY h.created_at DESC
        `).bind(uuid).all<ResourceHistory & { username: string, avatar_url: string }>();

        const mapped = history.results.map(h => ({
            ...h,
            actor: {
                username: h.username,
                avatar_url: h.avatar_url
            },
            previous_data: JSON.parse(h.previous_data)
        }));

        return c.json(mapped);
    } catch (e) {
        console.error('History error:', e);
        return c.json({ error: 'Failed to fetch history' }, 500);
    }
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
    const { title, description, category, thumbnail_uuid, reference_image_uuid, links, media_files, tags, token } = ResourceSchema.parse(body);

    // Turnstile Verification
    const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
    if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

    const resourceUuid = crypto.randomUUID();
    try {
        // Insert resource
        await c.env.DB.prepare(
            'INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(resourceUuid, title, description || null, category, thumbnail_uuid, reference_image_uuid || null, user.uuid).run();

        // Insert Tags
        if (tags && Array.isArray(tags)) {
            for (const tagName of tags) {
                // Try to find tag
                let tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{id: number}>();
                if (!tag) {
                    // Create tag
                    const newTag = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING id').bind(tagName).first<{id: number}>();
                    if (newTag) tag = newTag;
                }
                
                if (tag) {
                    await c.env.DB.prepare('INSERT INTO resource_tags (resource_uuid, tag_id) VALUES (?, ?)').bind(resourceUuid, tag.id).run();
                }
            }
        }

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
 * Endpoint: /:uuid
 * PUT - Actualiza un recurso (con historial si es admin)
 */
resources.put('/:uuid', async (c) => {
    const uuid = c.req.param('uuid');
    const authUser = await getAuthUser(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    const currentUser = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(authUser.username).first<User>();
    if (!currentUser) return c.json({ error: 'User not found' }, 404);

    const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();
    if (!resource) return c.json({ error: 'Resource not found' }, 404);

    // Permission check
    const isOwner = resource.author_uuid === currentUser.uuid;
    const isAdmin = currentUser.is_admin === 1;

    if (!isOwner && !isAdmin) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    // Parse body
    const body = await c.req.json();
    // Validate only partial fields? Or full schema? 
    // Using partial validation for flexibility or full? Let's assume updates allow changing standard fields.
    // Also Admin can send 'tags' (array of strings) and 'is_active'
    
    const title = body.title !== undefined ? body.title : resource.title;
    const description = body.description !== undefined ? body.description : resource.description;
    const category = body.category !== undefined ? body.category : resource.category;
    const isActive = isAdmin && body.is_active !== undefined ? body.is_active : resource.is_active;
    const tags: string[] = body.tags || []; // Array of tag names

    // If resource is approved (is_active=1) and user is NOT admin -> Forbidden (Only admin can edit approved posts)
    if (resource.is_active === 1 && !isAdmin) {
        return c.json({ error: 'Only admins can edit approved resources' }, 403);
    }

    try {
        const batch = [];

        // 1. Create History Snapshot if Admin is editing
        if (isAdmin) {
            // Fetch current tags for snapshot
            const currentTags = await c.env.DB.prepare(`
                SELECT t.name FROM tags t 
                JOIN resource_tags rt ON t.id = rt.tag_id 
                WHERE rt.resource_uuid = ?
            `).bind(uuid).all<{name: string}>();
            
            const previousData = {
                title: resource.title,
                description: resource.description,
                category: resource.category,
                tags: currentTags.results.map(t => t.name)
            };

            const historyUuid = crypto.randomUUID();
            batch.push(c.env.DB.prepare(`
                INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data)
                VALUES (?, ?, ?, ?, ?)
            `).bind(historyUuid, uuid, currentUser.uuid, 'content_edit', JSON.stringify(previousData)));
        }

        // 2. Update Resource
        batch.push(c.env.DB.prepare(`
            UPDATE resources 
            SET title = ?, description = ?, category = ?, is_active = ?, updated_at = unixepoch()
            WHERE uuid = ?
        `).bind(title, description, category, isActive, uuid));

        // 3. Update Tags (Admin Only usually, or if allowed for users?)
        // Let's allow admins to set tags.
        if (isAdmin && body.tags !== undefined) {
            // Delete old tags
            batch.push(c.env.DB.prepare('DELETE FROM resource_tags WHERE resource_uuid = ?').bind(uuid));
            
            // Insert new tags (ensure they exist first or create them?)
            // For simplicity, we assume tags must be created/exist? Or create on fly?
            // "el administrador puede agregar los tags que sean necesarios" -> create on fly implies better UX.
            // But doing logic inside batch is hard. We need to resolve tag IDs first.
        }

        // Execute batch so far? No, we need tag IDs.
        // Let's do tag logic before batch or separate.
        
        if (isAdmin && body.tags !== undefined) {
             // Resolve IDs
             for (const tagName of tags) {
                 // Try to find tag
                 let tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{id: number}>();
                 if (!tag) {
                     // Create tag
                     const res = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING id').bind(tagName).first<{id: number}>();
                     if (res) tag = res;
                 }
                 
                 if (tag) {
                     batch.push(c.env.DB.prepare('INSERT INTO resource_tags (resource_uuid, tag_id) VALUES (?, ?)').bind(uuid, tag.id));
                 }
             }
        }
        
        // Note: We cannot put async logic (finding/creating tags) inside the batch array directly if we want a single atomic transaction easily with D1 batch() 
        // because we need the IDs.
        // So we will run the batch update/history/delete_tags first, then insert new tags?
        // Or run everything sequentially. D1 isn't strict SQL transaction in batch() same as `BEGIN TRANSACTION`.
        // `db.batch()` executes them in order.
        
        // Let's restructure:
        // 1. Prepare history insert (if admin)
        // 2. Prepare resource update
        // 3. Prepare tag delete (if admin)
        // 4. Resolve tag IDs (async)
        // 5. Prepare tag inserts
        // 6. Execute all in one batch
        
        const operations = [];

        if (isAdmin) {
             const currentTags = await c.env.DB.prepare(`
                SELECT t.name FROM tags t 
                JOIN resource_tags rt ON t.id = rt.tag_id 
                WHERE rt.resource_uuid = ?
            `).bind(uuid).all<{name: string}>();
            
            const previousData = {
                title: resource.title,
                description: resource.description,
                category: resource.category,
                tags: currentTags.results.map(t => t.name)
            };

            const historyUuid = crypto.randomUUID();
            operations.push(c.env.DB.prepare(`
                INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data)
                VALUES (?, ?, ?, ?, ?)
            `).bind(historyUuid, uuid, currentUser.uuid, 'content_edit', JSON.stringify(previousData)));
        }

        operations.push(c.env.DB.prepare(`
            UPDATE resources 
            SET title = ?, description = ?, category = ?, is_active = ?, updated_at = unixepoch()
            WHERE uuid = ?
        `).bind(title, description, category, isActive, uuid));

        if (isAdmin && body.tags !== undefined) {
            operations.push(c.env.DB.prepare('DELETE FROM resource_tags WHERE resource_uuid = ?').bind(uuid));
            
            for (const tagName of tags) {
                 let tagId: number;
                 let tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{id: number}>();
                 if (!tag) {
                     // We must await this, so we can't be in a sync batch builder loop if we want true atomicity?
                     // D1 doesn't support "INSERT OR IGNORE returning ID" easily across all SQLite versions seamlessly or valid syntax for D1's specific quirks sometimes.
                     // But we can just run this separate.
                     const newTag = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING id').bind(tagName).first<{id: number}>();
                     tagId = newTag!.id;
                 } else {
                     tagId = tag.id;
                 }
                 operations.push(c.env.DB.prepare('INSERT INTO resource_tags (resource_uuid, tag_id) VALUES (?, ?)').bind(uuid, tagId));
            }
        }

        // 4. Update Links (New Files)
        if (body.new_links && Array.isArray(body.new_links)) {
            const lastLink = await c.env.DB.prepare('SELECT display_order FROM resource_links WHERE resource_uuid = ? ORDER BY display_order DESC LIMIT 1').bind(uuid).first<{display_order: number}>();
            let nextOrder = (lastLink?.display_order || 0) + 1;

            for (const link of body.new_links) {
                const linkUuid = crypto.randomUUID();
                operations.push(c.env.DB.prepare(
                    'INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order) VALUES (?, ?, ?, ?, ?, ?)'
                ).bind(
                    linkUuid,
                    uuid,
                    link.link_url,
                    link.link_title || null,
                    link.link_type || 'general',
                    nextOrder++
                ));
            }
        }

        await c.env.DB.batch(operations);

        // Invalidate Cache
        await c.env.VRCSTORAGE_KV.delete(`resource:${uuid}`);
        await c.env.VRCSTORAGE_KV.delete('resource:latest');

        return c.json({ success: true });

    } catch (e) {
        console.error('Update resource error:', e);
        return c.json({ error: 'Failed to update resource' }, 500);
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
