// =========================================================================================================
// COMMENT ROUTES
// =========================================================================================================
// All comment endpoints live exclusively under /api/comments.
// No double-mounting with /api/resources.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { CommentSchema } from '../validators';
import { verifyTurnstile } from '../helpers/turnstile';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const comments = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/comments/:resourceId
// Returns all comments for a given resource.
// =========================================================================================================

comments.get('/:resourceId', async (c) => {
	const resourceId = c.req.param('resourceId');

	// Basic UUID format guard — prepared statements prevent SQL injection but avoid unnecessary queries
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
		return c.json({ error: 'Invalid resource ID' }, 400);
	}

	const { results } = await c.env.DB.prepare(
		`SELECT
			c.uuid,
			c.text,
			(c.created_at * 1000) as timestamp,
			u.username as author,
			u.avatar_url as author_avatar
		FROM comments c
		JOIN users u ON c.author_uuid = u.uuid
		WHERE c.resource_uuid = ?
		ORDER BY c.created_at ASC`,
	)
		.bind(resourceId)
		.all<any>();

	return c.json(results);
});

// =========================================================================================================
// POST /api/comments/:resourceId
// Creates a new comment on a resource.
// =========================================================================================================

comments.post('/:resourceId', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const user = await c.env.DB.prepare('SELECT uuid, avatar_url FROM users WHERE username = ?')
		.bind(authUser.username)
		.first<{ uuid: string; avatar_url: string }>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const resourceId = c.req.param('resourceId');

	// UUID format guard
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
		return c.json({ error: 'Invalid resource ID' }, 400);
	}

	// Verify resource exists
	const resource = await c.env.DB.prepare('SELECT 1 FROM resources WHERE uuid = ? AND is_active = 1').bind(resourceId).first();
	if (!resource) return c.json({ error: 'Resource not found' }, 404);

	const body = await c.req.json();
	const { text, token } = CommentSchema.parse(body);

	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const commentUuid = crypto.randomUUID();

	try {
		await c.env.DB.prepare('INSERT INTO comments (uuid, resource_uuid, author_uuid, text) VALUES (?, ?, ?, ?)')
			.bind(commentUuid, resourceId, user.uuid, text)
			.run();

		return c.json({
			uuid: commentUuid,
			resourceUuid: resourceId,
			author: authUser.username,
			author_avatar: user.avatar_url,
			text,
			timestamp: Date.now(),
		});
	} catch (e) {
		console.error('Comment create error:', e);
		return c.json({ error: 'Failed to post comment' }, 500);
	}
});

// =========================================================================================================
// DELETE /api/comments/:commentId
// Deletes a comment. Only the author or an admin may do this.
// =========================================================================================================

comments.delete('/:commentId', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const commentId = c.req.param('commentId');

	const comment = await c.env.DB.prepare('SELECT author_uuid FROM comments WHERE uuid = ?')
		.bind(commentId)
		.first<{ author_uuid: string }>();
	if (!comment) return c.json({ error: 'Comment not found' }, 404);

	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<{ uuid: string }>();

	if (!authUser.is_admin && user?.uuid !== comment.author_uuid) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	try {
		await c.env.DB.prepare('DELETE FROM comments WHERE uuid = ?').bind(commentId).run();
		return c.json({ success: true });
	} catch (e) {
		console.error('Comment delete error:', e);
		return c.json({ error: 'Failed to delete comment' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default comments;
