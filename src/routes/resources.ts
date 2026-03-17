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
import { QueryBuilder } from '../helpers/query-constructor';

// =========================================================================================================
// EndPoint
// =========================================================================================================

const resources = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /latest
 * Este endpoint existe para que la pagina principal "/" pueda mostrar los ultimos 6 recursos subidos.
 */
resources.get('/latest', async (c) => {
    // Always declare CDN caching intent regardless of cache source
    c.header('Cache-Control', 'public, max-age=60');

    // 1. Try KV
    const cached = await c.env.VRCSTORAGE_KV.get('resource:latest', 'json');
    if (cached) {
        return c.json(cached);
    }

    const queryConstructor = new QueryBuilder('resources', 'r')
        .select([
            'r.category',
            'r.uuid',
            'r.title',
            'r.description',
            'r.thumbnail_uuid',
            'r.created_at * 1000 as timestamp',
            'r.download_count',
            'm.r2_key as thumbnail_key'
        ])
        .join('INNER JOIN media m ON r.thumbnail_uuid = m.uuid')
        .join('LEFT JOIN users u ON r.author_uuid = u.uuid')
        .where('r.is_active = 1')
        .orderBy('r.created_at', 'DESC')
        .paginate(1, 10);

    const { sql, params } = queryConstructor.build();

    const { results } = await c.env.DB.prepare(sql).bind(...params).all<any>();
    c.header('Cache-Control', 'public, max-age=60');

    // 2. Update KV
    await c.env.VRCSTORAGE_KV.put('resource:latest', JSON.stringify(results), { expirationTtl: 60 });

    return c.json(results);
});

// Sortable column whitelist.
// Never interpolate user input directly into ORDER BY — use this map instead.
const SORT_COLUMNS: Record<string, string> = {
    created_at: 'r.created_at',
    download_count: 'r.download_count',
    title: 'r.title',
};

/**
 * Endpoint: / (Search)
 * General resource search with filters, pagination, and full-text search (FTS).
 *
 * Query params:
 *   q          Free-text search (FTS5 MATCH against title and description)
 *   category   Category filter (avatars | worlds | assets | clothes)
 *   tags       Comma-separated tag names (e.g. "unity,quest")
 *   sort_by    Sort column (created_at | download_count | title) — default: created_at
 *   sort_order Sort direction (asc | desc) — default: desc
 *   page       Page number, 1-indexed — default: 1
 *   limit      Results per page — default: 15, max: 60
 */
resources.get('/', async (c) => {
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '30')), 60);

    const query = c.req.query('q')?.trim();
    const category = c.req.query('category');
    const tagsParam = c.req.query('tags');
    const sortBy = c.req.query('sort_by');
    const sortOrder = (c.req.query('sort_order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const orderColumn = SORT_COLUMNS[sortBy ?? ''] ?? 'r.created_at';
    const tagsList = tagsParam
        ? tagsParam.split(',').map(t => t.trim()).filter(Boolean)
        : [];

    try {
        const qb = new QueryBuilder('resources', 'r')
            .select([
                'r.uuid',
                'r.title',
                'r.description',
                'r.category',
                'r.thumbnail_uuid',
                'r.download_count',
                'r.created_at * 1000 AS timestamp',
                'm.r2_key AS thumbnail_key',
            ])
            .join('INNER JOIN media m ON r.thumbnail_uuid = m.uuid')
            .where('r.is_active = 1')
            .whereIf(
                !!category && RESOURCE_CATEGORIES.includes(category as ResourceCategory),
                'r.category = ?',
                category
            )
            .tags(tagsList)
            .orderBy(orderColumn, sortOrder)
            .paginate(page, limit + 1);

        // Only enable FTS when the user typed something — falls back to standard filter + sort otherwise.
        /*
        if (query) {
            qb.withFts('resources_fts', 'fts', query, 'r.uuid');
        }
        */

        const { sql, params } = qb.build();

        const { results } = await c.env.DB.prepare(sql).bind(...params).all<any>();

        const hasNextPage = results.length > limit;

        return c.json({
            resources: hasNextPage ? results.slice(0, limit) : results,
            pagination: {
                page,
                hasNextPage,
                hasPrevPage: page > 1,
            },
        });

    } catch (e) {
        console.error('[GET /resources] search error:', e);
        return c.json({ error: 'Search failed' }, 500);
    }
});

/**
 * Endpoint: /category/:category
 * Deprecated but kept for compatibility - redirect logic or reuse search?
 * Keeping it simple as alias to search with category param.
 */
resources.get('/category/:category', async (c) => {
    const category = c.req.param('category');
    const page = c.req.query('page') || '1';
    return c.redirect(`/api/resources?category=${category}&page=${page}`);
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
                let tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{ id: number }>();
                if (!tag) {
                    // Create tag
                    const newTag = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING id').bind(tagName).first<{ id: number }>();
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
            `).bind(uuid).all<{ name: string }>();

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
                let tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{ id: number }>();
                if (!tag) {
                    // Create tag
                    const res = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING id').bind(tagName).first<{ id: number }>();
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
            `).bind(uuid).all<{ name: string }>();

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
                let tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{ id: number }>();
                if (!tag) {
                    // We must await this, so we can't be in a sync batch builder loop if we want true atomicity?
                    // D1 doesn't support "INSERT OR IGNORE returning ID" easily across all SQLite versions seamlessly or valid syntax for D1's specific quirks sometimes.
                    // But we can just run this separate.
                    const newTag = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING id').bind(tagName).first<{ id: number }>();
                    tagId = newTag!.id;
                } else {
                    tagId = tag.id;
                }
                operations.push(c.env.DB.prepare('INSERT INTO resource_tags (resource_uuid, tag_id) VALUES (?, ?)').bind(uuid, tagId));
            }
        }

        // 4. Update Links (New Files)
        if (body.new_links && Array.isArray(body.new_links)) {
            const lastLink = await c.env.DB.prepare('SELECT display_order FROM resource_links WHERE resource_uuid = ? ORDER BY display_order DESC LIMIT 1').bind(uuid).first<{ display_order: number }>();
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

export default resources;