// =========================================================================================================
// BLOG ROUTES (v2)
// =========================================================================================================
// HTTP layer for the blog, mounted under /api/blog. Post CRUD is admin-only (requireAdmin); reading
// and commenting are open (comments require a session). Handlers own the KV caches (list + single
// post) and hand the R2 bucket to the service for cover-image cleanup; the slug/uniqueness rules,
// the comment rules, and all SQL live in BlogService / BlogPost·BlogComment repositories. Domain
// errors map to HTTP via app.onError.
//
// The JSON responses are identical to the legacy handlers so the existing frontend works unchanged.
//
// ENDPOINTS
// ---------
// GET    /                    — Paginated post list (KV-cached).
// GET    /:uuid               — Single post (KV-cached).
// POST   /                    — Create a post [admin].
// PUT    /:uuid               — Update a post [admin].
// DELETE /:uuid               — Delete a post + cover cleanup [admin].
// GET    /:uuid/comments      — Comments for a post.
// POST   /:uuid/comments      — Add a comment [auth + CAPTCHA].
// DELETE /comments/:commentId — Delete a comment [author or admin].
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, requireAdmin, type AuthVariables } from '../middleware/auth';
import { BlogService } from '../../services/blog-service';
import { BlogPostSchema, BlogPostUpdateSchema, BlogCommentSchema } from '../../validators';
import type { BlogPostWithAuthor } from '../../types';
import { fail } from '../responses';

// =========================================================================================================
// Constants
// =========================================================================================================

const CACHE_TTL = 60 * 60; // 1 hour

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Invalidate the blog list cache. We can't enumerate every page/limit combo, so we delete the most
 * common pages (matching the legacy behavior). A cache-key version bump would be more robust.
 */
async function invalidateBlogListCache(kv: KVNamespace): Promise<void> {
	const keys = ['blog:list:1:10', 'blog:list:1:20', 'blog:list:2:10', 'blog:list:2:20', 'blog:list:3:10'] as const;
	await Promise.all(keys.map((k) => kv.delete(k)));
}

// =========================================================================================================
// Endpoints
// =========================================================================================================

const blog = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/blog
// List posts (paginated), with cover image key and author info.
// =========================================================================================================

blog.get('/', async (c) => {
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
	const limit = Math.min(20, Math.max(1, parseInt(c.req.query('limit') || '10', 10)));
	const offset = (page - 1) * limit;

	const cacheKey = `blog:list:${page}:${limit}`;

	// Serve from KV cache when present.
	const cached = (await c.env.VRCSTORAGE_KV.get(cacheKey, 'json')) as { data: BlogPostWithAuthor[]; total: number } | null;
	if (cached) {
		return c.json({
			data: cached.data,
			pagination: { page, limit, total: cached.total, total_pages: Math.ceil(cached.total / limit) },
		});
	}

	const { data, total } = await new BlogService(c.env.DB).listPosts(limit, offset);

	// Cache the raw data + total (5 min in legacy comment, 1h TTL in code — kept as-is).
	c.env.VRCSTORAGE_KV.put(cacheKey, JSON.stringify({ data, total }), { expirationTtl: CACHE_TTL });

	return c.json({
		data,
		pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
	});
});

// =========================================================================================================
// GET /api/blog/:uuid
// Get single post by UUID (full content).
// =========================================================================================================

blog.get('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');

	const post = await new BlogService(c.env.DB).getPost(uuid);
	await c.env.VRCSTORAGE_KV.put(`blog:post:${uuid}`, JSON.stringify(post), { expirationTtl: CACHE_TTL });

	return c.json(post);
});

// =========================================================================================================
// POST /api/blog
// Create a new blog post (admin only).
// =========================================================================================================

blog.post('/', requireAdmin, async (c) => {
	const parsed = BlogPostSchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	const result = await new BlogService(c.env.DB).createPost(c.get('user').uuid, parsed.data, c.env.FEED);
	await invalidateBlogListCache(c.env.VRCSTORAGE_KV);

	return c.json(result);
});

// =========================================================================================================
// PUT /api/blog/:uuid
// Update a blog post (admin only).
// =========================================================================================================

blog.put('/:uuid', requireAdmin, async (c) => {
	const parsed = BlogPostUpdateSchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	const { uuid, slug } = await new BlogService(c.env.DB).updatePost(c.req.param('uuid')!, parsed.data);
	await invalidateBlogListCache(c.env.VRCSTORAGE_KV);

	return c.json({ success: true, uuid, slug });
});

// =========================================================================================================
// DELETE /api/blog/:uuid
// Delete a blog post (admin only).
// =========================================================================================================

blog.delete('/:uuid', requireAdmin, async (c) => {
	await new BlogService(c.env.DB).deletePost(c.req.param('uuid')!, c.env.BUCKET);
	await invalidateBlogListCache(c.env.VRCSTORAGE_KV);

	return c.json({ success: true });
});

// =========================================================================================================
// GET /api/blog/:uuid/comments
// Get comments for a blog post.
// =========================================================================================================

blog.get('/:uuid/comments', async (c) => {
	const postUuid = c.req.param('uuid');
	const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
	const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);

	const results = await new BlogService(c.env.DB).listComments(postUuid, limit, offset);
	return c.json(results);
});

// =========================================================================================================
// POST /api/blog/:uuid/comments
// Post a comment on a blog post (must be logged in).
// =========================================================================================================

blog.post('/:uuid/comments', requireAuth, async (c) => {
	const parsed = BlogCommentSchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	const result = await new BlogService(c.env.DB).createComment(
		c.get('user'),
		c.req.param('uuid')!,
		parsed.data.text,
		parsed.data.token || '',
		c.env.TURNSTILE_SECRET_KEY,
	);

	return c.json(result);
});

// =========================================================================================================
// DELETE /api/blog/comments/:commentId
// Delete a blog comment (own comment or admin).
// =========================================================================================================

blog.delete('/comments/:commentId', requireAuth, async (c) => {
	await new BlogService(c.env.DB).deleteComment(c.get('user'), c.req.param('commentId')!);
	return c.json({ success: true });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default blog;
