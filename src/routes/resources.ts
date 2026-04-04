// =========================================================================================================
// RESOURCE ROUTES
// =========================================================================================================
// Resource browsing, creation, and SEO endpoints
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { getAuthUser } from '../auth';
import { Resource, ResourceCategory, RESOURCE_CATEGORIES, User, Media, ResourceLink, ResourceHistory, Tag } from '../types';
import { ResourceSchema, LinkSchema } from '../validators';
import { verifyTurnstile } from '../helpers/turnstile';
import { QueryBuilder } from '../helpers/query-constructor';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const resources = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/resources/latest
// Returns the latest resources uploaded.
// =========================================================================================================

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
			'r.created_at * 1000 as created_at',
			'r.download_count',
			'm.r2_key as thumbnail_key',
		])
		.join('INNER JOIN media m ON r.thumbnail_uuid = m.uuid')
		.join('LEFT JOIN users u ON r.author_uuid = u.uuid')
		.where('r.is_active = 1')
		.orderBy('r.created_at', 'DESC')
		.paginate(1, 10);

	const { sql, params } = queryConstructor.build();

	const { results } = await c.env.DB.prepare(sql)
		.bind(...params)
		.all<any>();
	c.header('Cache-Control', 'public, max-age=60');

	// 2. Update KV
	await c.env.VRCSTORAGE_KV.put('resource:latest', JSON.stringify(results), { expirationTtl: 60 });

	return c.json(results);
});

// =========================================================================================================
// GET /api/resources/ (Search)
// Returns all resources.
// Query params:
//   q          Free-text search (FTS5 MATCH against title and description)
//   category   Category filter (avatars | worlds | assets | clothes)
//   tags       Comma-separated tag names (e.g. "unity,quest")
//   sort_by    Sort column (created_at | download_count | title) — default: created_at
//   sort_order Sort direction (asc | desc) — default: desc
//   page       Page number, 1-indexed — default: 1
//   limit      Results per page — default: 15, max: 60
// =========================================================================================================

// Sortable column whitelist.
// Never interpolate user input directly into ORDER BY — use this map instead.
const SORT_COLUMNS: Record<string, string> = {
	created_at: 'r.created_at',
	download_count: 'r.download_count',
	title: 'r.title',
};

resources.get('/', async (c) => {
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
	const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '30', 10) || 30), 60);

	const query = c.req.query('q')?.trim();
	const category = c.req.query('category');
	const tagsParam = c.req.query('tags');
	const sortBy = c.req.query('sort_by');
	const sortOrder = (c.req.query('sort_order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

	const orderColumn = SORT_COLUMNS[sortBy ?? ''] ?? 'r.created_at';
	const tagsList = tagsParam
		? tagsParam
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
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
				'r.created_at * 1000 as created_at',
				'm.r2_key AS thumbnail_key',
			])
			.join('INNER JOIN media m ON r.thumbnail_uuid = m.uuid')
			.where('r.is_active = 1')
			.whereIf(!!category && RESOURCE_CATEGORIES.includes(category as ResourceCategory), 'r.category = ?', category)
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

		const { results } = await c.env.DB.prepare(sql)
			.bind(...params)
			.all<any>();

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

// =========================================================================================================
// GET /api/resources/:uuid
// Returns the details of a specific resource.
// =========================================================================================================

resources.get('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	if (!uuid) return c.json({ error: 'Missing uuid' }, 400);

	const row = await c.env.DB.prepare(
		`
        SELECT
            r.uuid,
            r.title,
            r.description,
            r.category,
            r.download_count,
            r.is_active,
            r.created_at,
            r.updated_at,
            u.username        AS author_username,
            tm.r2_key         AS thumbnail_key,
            rm_ref.r2_key     AS reference_image_key,
            COALESCE((
                SELECT json_group_array(json_object(
                    'uuid',       m.uuid,
                    'r2_key',     m.r2_key,
                    'media_type', m.media_type
                ))
                FROM media m
                JOIN resource_n_media rnm ON m.uuid = rnm.media_uuid
                WHERE rnm.resource_uuid = r.uuid
            ), '[]') AS media_files_json,
            COALESCE((
                SELECT json_group_array(json_object(
                    'uuid',          rl.uuid,
                    'link_url',      rl.link_url,
                    'link_title',    rl.link_title,
                    'link_type',     rl.link_type,
                    'display_order', rl.display_order
                ))
                FROM resource_links rl
                WHERE rl.resource_uuid = r.uuid
                ORDER BY rl.display_order ASC
            ), '[]') AS links_json,
            COALESCE((
                SELECT json_group_array(json_object('id', t.id, 'name', t.name))
                FROM tags t
                JOIN resource_tags rt ON t.id = rt.tag_id
                WHERE rt.resource_uuid = r.uuid
            ), '[]') AS tags_json
        FROM resources r
        LEFT JOIN users  u      ON r.author_uuid          = u.uuid
        LEFT JOIN media  tm     ON r.thumbnail_uuid        = tm.uuid
        LEFT JOIN media  rm_ref ON r.reference_image_uuid  = rm_ref.uuid
        WHERE r.uuid = ?
    `,
	)
		.bind(uuid)
		.first<Record<string, unknown>>();

	if (!row) return c.json({ error: 'Not found' }, 404);

	const isLoggedIn = !!(await getAuthUser(c));

	const mediaFiles = JSON.parse(row.media_files_json as string) as Pick<Media, 'uuid' | 'r2_key' | 'media_type'>[];
	const allLinks = JSON.parse(row.links_json as string) as Omit<ResourceLink, 'resource_uuid' | 'created_at'>[];
	const tags = JSON.parse(row.tags_json as string) as Tag[];

	const downloadLinks = allLinks.filter((l) => l.link_type === 'download');
	const publicLinks = allLinks.filter((l) => l.link_type !== 'download');

	return c.json({
		uuid: row.uuid,
		title: row.title,
		description: row.description,
		category: row.category,
		download_count: row.download_count,
		is_active: row.is_active,
		created_at: row.created_at,
		updated_at: row.updated_at,
		// Author: only username, never UUID or avatar
		author: row.author_username ? { username: row.author_username } : null,
		// Gallery
		thumbnail_key: row.thumbnail_key ?? null,
		reference_image_key: row.reference_image_key ?? null,
		mediaFiles,
		// Tags always public
		tags,
		// Download access — gated behind auth
		canDownload: isLoggedIn,
		links: isLoggedIn ? allLinks : publicLinks,
		downloadUrl: isLoggedIn ? (downloadLinks[0]?.link_url ?? null) : null,
		backupUrls: isLoggedIn ? downloadLinks.slice(1).map((l) => l.link_url) : [],
	});
});

// =========================================================================================================
// GET /api/resources/:uuid/history
// Returns the history of changes for a specific resource.
// =========================================================================================================

resources.get('/:uuid/history', async (c) => {
	const uuid = c.req.param('uuid');

	// Edit history is only available to authenticated users
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	try {
		const history = await c.env.DB.prepare(
			`
            SELECT h.*, u.username, u.avatar_url 
            FROM resource_history h
            LEFT JOIN users u ON h.actor_uuid = u.uuid
            WHERE h.resource_uuid = ?
            ORDER BY h.created_at DESC
        `,
		)
			.bind(uuid)
			.all<ResourceHistory & { username: string; avatar_url: string }>();

		const mapped = history.results.map((h) => ({
			...h,
			actor: {
				username: h.username,
				avatar_url: h.avatar_url,
			},
			previous_data: JSON.parse(h.previous_data),
		}));

		return c.json(mapped);
	} catch (e) {
		console.error('History error:', e);
		return c.json({ error: 'Failed to fetch history' }, 500);
	}
});

// =========================================================================================================
// POST /api/resources/
// Uploads a new resource.
// =========================================================================================================

resources.post('/', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	// Get author
	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<User>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const body = await c.req.json();

	// Validation
	const { title, description, category, thumbnail_uuid, reference_image_uuid, links, media_files, tags, token } =
		ResourceSchema.parse(body);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const resourceUuid = crypto.randomUUID();
	try {
		// Insert resource
		await c.env.DB.prepare(
			'INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid) VALUES (?, ?, ?, ?, ?, ?, ?)',
		)
			.bind(resourceUuid, title, description || null, category, thumbnail_uuid, reference_image_uuid || null, user.uuid)
			.run();

		// Insert Tags (max 10 to prevent DoS)
		if (tags && Array.isArray(tags)) {
			const limitedTags = tags.slice(0, 10);
			for (const tagName of limitedTags) {
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
					'INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order) VALUES (?, ?, ?, ?, ?, ?)',
				)
					.bind(linkUuid, resourceUuid, link.link_url, link.link_title || null, link.link_type || 'general', link.display_order ?? i)
					.run();
			}
		}

		// Insert media file associations if provided
		if (media_files && Array.isArray(media_files)) {
			for (const mediaUuid of media_files) {
				const relationUuid = crypto.randomUUID();
				await c.env.DB.prepare('INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid) VALUES (?, ?, ?)')
					.bind(relationUuid, resourceUuid, mediaUuid)
					.run();
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

// =========================================================================================================
// PUT /api/resources/:uuid
// Updates a specific resource.
// =========================================================================================================

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

	const body = await c.req.json();

	// Validate and sanitize all user-supplied fields with Zod before touching the DB
	const ResourceUpdateSchema = ResourceSchema.partial().omit({
		token: true,
		thumbnail_uuid: true,
		reference_image_uuid: true,
		links: true,
		media_files: true,
	});
	const parsed = ResourceUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
	}

	const title = parsed.data.title ?? resource.title;
	const description = parsed.data.description ?? resource.description;
	const category = parsed.data.category ?? resource.category;
	const isActive =
		isAdmin && typeof body.is_active === 'number' && (body.is_active === 0 || body.is_active === 1)
			? body.is_active
			: resource.is_active;
	const tags: string[] = parsed.data.tags ?? [];

	if (isAdmin && tags.length > 20) {
		return c.json({ error: 'Too many tags (max 20)' }, 400);
	}

	if (resource.is_active === 1 && !isAdmin) {
		return c.json({ error: 'Only admins can edit approved resources' }, 403);
	}

	try {
		const operations = [];

		// 1. Create History Snapshot if Admin is editing
		if (isAdmin) {
			// Fetch current tags for snapshot
			const currentTags = await c.env.DB.prepare(
				`
                SELECT t.name FROM tags t 
                JOIN resource_tags rt ON t.id = rt.tag_id 
                WHERE rt.resource_uuid = ?
            `,
			)
				.bind(uuid)
				.all<{ name: string }>();

			const previousData = {
				title: resource.title,
				description: resource.description,
				category: resource.category,
				tags: currentTags.results.map((t: { name: string }) => t.name),
			};

			const historyUuid = crypto.randomUUID();
			operations.push(
				c.env.DB.prepare(
					`
                    INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data)
                    VALUES (?, ?, ?, ?, ?)
                `,
				).bind(historyUuid, uuid, currentUser.uuid, 'content_edit', JSON.stringify(previousData)),
			);
		}

		// 2. Update Resource
		operations.push(
			c.env.DB.prepare(
				`
                UPDATE resources 
                SET title = ?, description = ?, category = ?, is_active = ?, updated_at = unixepoch()
                WHERE uuid = ?
            `,
			).bind(title, description, category, isActive, uuid),
		);

		// 3. Update Tags (admin only)
		if (isAdmin && parsed.data.tags !== undefined) {
			operations.push(c.env.DB.prepare('DELETE FROM resource_tags WHERE resource_uuid = ?').bind(uuid));

			for (const tagName of tags) {
				let tagId: number;
				let tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{ id: number }>();
				if (!tag) {
					const newTag = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING id').bind(tagName).first<{ id: number }>();
					tagId = newTag!.id;
				} else {
					tagId = tag.id;
				}
				operations.push(c.env.DB.prepare('INSERT INTO resource_tags (resource_uuid, tag_id) VALUES (?, ?)').bind(uuid, tagId));
			}
		}

		// 4. Update Links (New Files) — validated through Zod to prevent injection
		const NewLinksSchema = z.array(LinkSchema).optional();
		const validatedNewLinks = NewLinksSchema.parse(body.new_links);
		if (validatedNewLinks && validatedNewLinks.length > 0) {
			const lastLink = await c.env.DB.prepare(
				'SELECT display_order FROM resource_links WHERE resource_uuid = ? ORDER BY display_order DESC LIMIT 1',
			)
				.bind(uuid)
				.first<{ display_order: number }>();
			let nextOrder = (lastLink?.display_order || 0) + 1;

			for (const link of validatedNewLinks) {
				const linkUuid = crypto.randomUUID();
				operations.push(
					c.env.DB.prepare(
						'INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order) VALUES (?, ?, ?, ?, ?, ?)',
					).bind(linkUuid, uuid, link.link_url, link.link_title || null, link.link_type || 'general', nextOrder++),
				);
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

// =========================================================================================================
// DELETE /api/resources/:uuid
// Deletes a specific resource.
// =========================================================================================================

resources.delete('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
	if (!authUser.is_admin) return c.json({ error: 'Unauthorized' }, 403);

	try {
		const resource = await c.env.DB.prepare('SELECT author_uuid, is_active FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();
		if (!resource) return c.json({ error: 'Resource not found' }, 404);

		await c.env.DB.prepare('DELETE FROM resources WHERE uuid = ?').bind(uuid).run();

		// Invalidate Cache
		await c.env.VRCSTORAGE_KV.delete(`resource:${uuid}`);
		await c.env.VRCSTORAGE_KV.delete('resource:latest');

		return c.json({ success: true });
	} catch (e) {
		console.error('Delete resource error:', e);
		return c.json({ error: 'Failed to delete resource' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default resources;
