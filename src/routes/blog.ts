// =========================================================================================================
// BLOG ROUTES
// =========================================================================================================
// Blog post CRUD and blog comment operations.
// Only admins can create/edit/delete posts. All users can read and comment.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { BlogPost, BlogPostWithAuthor } from '../types';
import { BlogPostSchema, BlogPostUpdateSchema, BlogCommentSchema } from '../validators';
import { verifyTurnstile } from '../helpers/turnstile';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const blog = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Converts a title into a URL-friendly slug.
 * e.g. "Hello World! (2026)" → "hello-world-2026"
 */
function slugify(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // strip accents
		.replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric
		.trim()
		.replace(/[\s]+/g, '-') // spaces to hyphens
		.replace(/-+/g, '-') // collapse multiple hyphens
		.slice(0, 100);
}

/**
 * Ensures the slug is unique in the database.
 * Appends a numeric suffix if needed (e.g. hello-world-2).
 */
async function uniqueSlug(db: D1Database, base: string, excludeUuid?: string): Promise<string> {
	let candidate = base;
	let attempts = 0;
	while (true) {
		const query = excludeUuid
			? 'SELECT uuid FROM blog_posts WHERE slug = ? AND uuid != ? LIMIT 1'
			: 'SELECT uuid FROM blog_posts WHERE slug = ? LIMIT 1';
		const existing = excludeUuid
			? await db.prepare(query).bind(candidate, excludeUuid).first()
			: await db.prepare(query).bind(candidate).first();
		if (!existing) return candidate;
		attempts++;
		candidate = `${base}-${attempts + 1}`;
	}
}

/**
 * Invalidates the blog list cache.
 */
async function invalidateBlogListCache(kv: KVNamespace): Promise<void> {
	// We can't enumerate all page/limit combinations, so we use a suffix pattern approach:
	// Delete the most common pages. For production, a cache key version bump could be used.
	const keys = ['blog:list:1:10', 'blog:list:1:20', 'blog:list:2:10', 'blog:list:2:20', 'blog:list:3:10'] as const;
	await Promise.all(keys.map((k) => kv.delete(k)));
}

// =========================================================================================================
// GET /api/blog
// List posts (paginated), with cover image key and author info
// =========================================================================================================

blog.get('/', async (c) => {
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
	const limit = Math.min(20, Math.max(1, parseInt(c.req.query('limit') || '10', 10)));
	const offset = (page - 1) * limit;

	const cacheKey = `blog:list:${page}:${limit}`;

	// Check KV cache
	const cached = (await c.env.VRCSTORAGE_KV.get(cacheKey, 'json')) as { data: BlogPostWithAuthor[]; total: number } | null;
	if (cached) {
		return c.json({
			data: cached.data,
			pagination: {
				page,
				limit,
				total: cached.total,
				total_pages: Math.ceil(cached.total / limit),
			},
		});
	}

	try {
		const [postsResult, countResult] = await Promise.all([
			c.env.DB.prepare(
				`SELECT
					bp.*,
					bp.created_at,
					u.username as author_username,
					u.avatar_url as author_avatar,
					m.r2_key as cover_image_key,
					m.uuid as cover_image_media_uuid
				FROM blog_posts bp
				JOIN users u ON bp.author_uuid = u.uuid
				LEFT JOIN image_media m ON bp.cover_image_uuid = m.uuid
				ORDER BY bp.created_at DESC
				LIMIT ? OFFSET ?`,
			)
				.bind(limit, offset)
				.all<BlogPostWithAuthor>(),
			c.env.DB.prepare('SELECT COUNT(*) as count FROM blog_posts').first<{ count: number }>(),
		]);

		const total = countResult?.count || 0;
		const result = {
			data: postsResult.results,
			pagination: {
				page,
				limit,
				total,
				total_pages: Math.ceil(total / limit),
			},
		};

		// Cache for 5 minutes
		c.env.VRCSTORAGE_KV.put(cacheKey, JSON.stringify({ data: postsResult.results, total }), { expirationTtl: 1 * 60 * 60 });

		return c.json(result);
	} catch (e) {
		console.error('Blog list error:', e);
		return c.json({ error: 'Failed to fetch blog posts' }, 500);
	}
});

// =========================================================================================================
// GET /api/blog/:uuid
// Get single post by UUID (full content)
// =========================================================================================================

blog.get('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');

	try {
		const post = await c.env.DB.prepare(
			`SELECT
				bp.*,
				bp.created_at,
				u.username as author_username,
				u.avatar_url as author_avatar,
				m.r2_key as cover_image_key,
				m.uuid as cover_image_media_uuid
			FROM blog_posts bp
			JOIN users u ON bp.author_uuid = u.uuid
			LEFT JOIN image_media m ON bp.cover_image_uuid = m.uuid
			WHERE bp.uuid = ?`,
		)
			.bind(uuid)
			.first<BlogPostWithAuthor>();

		if (!post) return c.json({ error: 'Post not found' }, 404);
		await c.env.VRCSTORAGE_KV.put(`blog:post:${uuid}`, JSON.stringify(post), { expirationTtl: 1 * 60 * 60 }); // Cache for 1 hour

		return c.json(post);
	} catch (e) {
		console.error('Blog get error:', e);
		return c.json({ error: 'Failed to fetch blog post' }, 500);
	}
});

// =========================================================================================================
// POST /api/blog
// Create a new blog post (admin only)
// =========================================================================================================

blog.post('/', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const body = await c.req.json();
	const parseResult = BlogPostSchema.safeParse(body);
	if (!parseResult.success) {
		return c.json({ error: 'Validation error', details: parseResult.error.issues }, 400);
	}

	const { title, content, excerpt, cover_image_uuid, author_display } = parseResult.data;

	const uuid = crypto.randomUUID();
	const baseSlug = slugify(title);
	const slug = await uniqueSlug(c.env.DB, baseSlug);
	const now = Math.floor(Date.now() / 1000);

	try {
		await c.env.DB.prepare(
			`INSERT INTO blog_posts (uuid, slug, title, content, excerpt, cover_image_uuid, author_uuid, author_display, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(uuid, slug, title, content, excerpt ?? null, cover_image_uuid ?? null, user.uuid, author_display, now, now)
			.run();

		// Invalidate blog list cache
		await invalidateBlogListCache(c.env.VRCSTORAGE_KV);

		return c.json({ uuid, slug, title, author_display, created_at: now });
	} catch (e) {
		console.error('Blog create error:', e);
		return c.json({ error: 'Failed to create blog post' }, 500);
	}
});

// =========================================================================================================
// PUT /api/blog/:uuid
// Update a blog post (admin only)
// =========================================================================================================

blog.put('/:uuid', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
	if (!authUser.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');

	const existing = await c.env.DB.prepare('SELECT uuid, slug FROM blog_posts WHERE uuid = ?').bind(uuid).first<BlogPost>();
	if (!existing) return c.json({ error: 'Post not found' }, 404);

	const body = await c.req.json();
	const parseResult = BlogPostUpdateSchema.safeParse(body);
	if (!parseResult.success) {
		return c.json({ error: 'Validation error', details: parseResult.error.issues }, 400);
	}

	const updates = parseResult.data;
	const now = Math.floor(Date.now() / 1000);

	// Recalculate slug if title changed
	let slug = existing.slug;
	if (updates.title) {
		const baseSlug = slugify(updates.title);
		slug = await uniqueSlug(c.env.DB, baseSlug, uuid);
	}

	try {
		await c.env.DB.prepare(
			`UPDATE blog_posts SET
				slug = COALESCE(?, slug),
				title = COALESCE(?, title),
				content = COALESCE(?, content),
				excerpt = COALESCE(?, excerpt),
				cover_image_uuid = CASE WHEN ? = 1 THEN ? ELSE cover_image_uuid END,
				author_display = COALESCE(?, author_display),
				updated_at = ?
			WHERE uuid = ?`,
		)
			.bind(
				updates.title ? slug : null,
				updates.title ?? null,
				updates.content ?? null,
				updates.excerpt ?? null,
				updates.cover_image_uuid !== undefined ? 1 : 0,
				updates.cover_image_uuid ?? null,
				updates.author_display ?? null,
				now,
				uuid,
			)
			.run();

		await invalidateBlogListCache(c.env.VRCSTORAGE_KV);

		return c.json({ success: true, uuid, slug });
	} catch (e) {
		console.error('Blog update error:', e);
		return c.json({ error: 'Failed to update blog post' }, 500);
	}
});

// =========================================================================================================
// DELETE /api/blog/:uuid
// Delete a blog post (admin only)
// =========================================================================================================

blog.delete('/:uuid', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
	if (!authUser.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');

	const existing = await c.env.DB.prepare('SELECT uuid FROM blog_posts WHERE uuid = ?').bind(uuid).first();
	if (!existing) return c.json({ error: 'Post not found' }, 404);

	try {
		// Clean up cover image from R2 and media table before deleting the post.
		// The blog_posts FK uses ON DELETE SET NULL (post → media direction doesn't cascade),
		// so the media record would become orphaned without this explicit cleanup.
		const postToDelete = await c.env.DB.prepare('SELECT cover_image_uuid FROM blog_posts WHERE uuid = ?')
			.bind(uuid)
			.first<{ cover_image_uuid: string | null }>();

		if (postToDelete?.cover_image_uuid) {
			const coverMedia = await c.env.DB.prepare('SELECT r2_key, r2_bucket FROM image_media WHERE uuid = ?')
				.bind(postToDelete.cover_image_uuid)
				.first<{ r2_key: string; r2_bucket: string }>();

			if (coverMedia) {
				const bucket = coverMedia.r2_bucket === 'media' ? c.env.MEDIA_BUCKET : c.env.BUCKET;
				await bucket.delete(coverMedia.r2_key);
				await c.env.DB.prepare('DELETE FROM image_media WHERE uuid = ?').bind(postToDelete.cover_image_uuid).run();
			}
		}

		await c.env.DB.prepare('DELETE FROM blog_posts WHERE uuid = ?').bind(uuid).run();
		await invalidateBlogListCache(c.env.VRCSTORAGE_KV);
		return c.json({ success: true });
	} catch (e) {
		console.error('Blog delete error:', e);
		return c.json({ error: 'Failed to delete blog post' }, 500);
	}
});

// =========================================================================================================
// GET /api/blog/:uuid/comments
// Get comments for a blog post
// =========================================================================================================

blog.get('/:uuid/comments', async (c) => {
	const postUuid = c.req.param('uuid');
	const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
	const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);

	try {
		const { results } = await c.env.DB.prepare(
			`SELECT
				bc.uuid,
				bc.text,
				(bc.created_at * 1000) as timestamp,
				u.username as author,
				u.avatar_url as author_avatar
			FROM blog_comments bc
			JOIN users u ON bc.author_uuid = u.uuid
			WHERE bc.post_uuid = ?
			ORDER BY bc.created_at ASC
			LIMIT ? OFFSET ?`,
		)
			.bind(postUuid, limit, offset)
			.all<any>();

		return c.json(results);
	} catch (e) {
		console.error('Blog comments fetch error:', e);
		return c.json({ error: 'Failed to fetch comments' }, 500);
	}
});

// =========================================================================================================
// POST /api/blog/:uuid/comments
// Post a comment on a blog post (must be logged in)
// =========================================================================================================

blog.post('/:uuid/comments', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const postUuid = c.req.param('uuid');

	// Verify post exists
	const post = await c.env.DB.prepare('SELECT uuid FROM blog_posts WHERE uuid = ?').bind(postUuid).first();
	if (!post) return c.json({ error: 'Post not found' }, 404);

	// Fetch author UUID
	const user = await c.env.DB.prepare('SELECT uuid, avatar_url FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const body = await c.req.json();
	const parseResult = BlogCommentSchema.safeParse(body);
	if (!parseResult.success) {
		return c.json({ error: 'Validation error', details: parseResult.error.issues }, 400);
	}
	const { text, token } = parseResult.data;

	// Turnstile verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const commentUuid = crypto.randomUUID();
	const now = Math.floor(Date.now() / 1000);

	try {
		await c.env.DB.prepare('INSERT INTO blog_comments (uuid, post_uuid, author_uuid, text, created_at) VALUES (?, ?, ?, ?, ?)')
			.bind(commentUuid, postUuid, user.uuid, text, now)
			.run();

		return c.json({
			uuid: commentUuid,
			text,
			timestamp: now * 1000,
			author: authUser.username,
			author_avatar: user.avatar_url,
		});
	} catch (e) {
		console.error('Blog comment create error:', e);
		return c.json({ error: 'Failed to post comment' }, 500);
	}
});

// =========================================================================================================
// DELETE /api/blog/comments/:commentId
// Delete a blog comment (own comment or admin)
// =========================================================================================================

blog.delete('/comments/:commentId', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const commentId = c.req.param('commentId');

	const comment = await c.env.DB.prepare('SELECT author_uuid FROM blog_comments WHERE uuid = ?').bind(commentId).first<any>();
	if (!comment) return c.json({ error: 'Comment not found' }, 404);

	if (!user.is_admin && user.uuid !== comment.author_uuid) return c.json({ error: 'Forbidden' }, 403);

	try {
		await c.env.DB.prepare('DELETE FROM blog_comments WHERE uuid = ?').bind(commentId).run();
		return c.json({ success: true });
	} catch (e) {
		console.error('Blog comment delete error:', e);
		return c.json({ error: 'Failed to delete comment' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default blog;
