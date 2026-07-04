// =========================================================================================================
// COMMENT ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for resource comments, mounted under /api/comments. Handlers only:
// resolve auth, parse/validate input, call the service, shape the response. Business logic,
// the UUID/resource/CAPTCHA rules, and all SQL live in CommentService / CommentRepository;
// domain errors map to HTTP via app.onError.
//
// The JSON responses are identical to the legacy handlers so the existing frontend
// works unchanged.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { CommentService } from '../../services/comment-service';
import { CommentSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const comments = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/comments/:resourceId
// Returns all comments for a given resource.
// =========================================================================================================

comments.get('/:resourceId', async (c) => {
	try {
		const results = await new CommentService(c.env.DB).list(c.req.param('resourceId')!);
		return c.json(results);
	} catch (e) {
		console.error('Comments list error:', e);
		throw e;
	}
});

// =========================================================================================================
// POST /api/comments/:resourceId
// Creates a new comment on a resource.
// =========================================================================================================

comments.post('/:resourceId', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = CommentSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	try {
		const result = await new CommentService(c.env.DB).create(
			c.get('user'),
			c.req.param('resourceId')!,
			parsed.data.text,
			parsed.data.token || '',
			c.env.TURNSTILE_SECRET_KEY,
		);
		return c.json(result);
	} catch (e) {
		console.error('Comment create error:', e);
		throw e;
	}
});

// =========================================================================================================
// DELETE /api/comments/:commentId
// Deletes a comment. Only the author or an admin may do this.
// =========================================================================================================

comments.delete('/:commentId', requireAuth, async (c) => {
	try {
		await new CommentService(c.env.DB).delete(c.get('user'), c.req.param('commentId')!);
		return c.json({ success: true });
	} catch (e) {
		console.error('Comment delete error:', e);
		throw e;
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default comments;
