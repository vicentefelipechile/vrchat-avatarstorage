// =========================================================================================================
// WIKI ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for the global wiki comment wall, mounted under /api/wiki. Handlers only:
// resolve auth, parse/validate input, call the service, shape the response. Business logic, the
// author/CAPTCHA rules, and all SQL live in WikiCommentService / WikiCommentRepository; domain
// errors map to HTTP via app.onError.
//
// The JSON responses are identical to the legacy handlers so the existing frontend works unchanged.
//
// ENDPOINTS
// ---------
// GET    /comments        — The 50 most recent global wiki comments.
// POST   /comments        — Create a wiki comment (auth + CAPTCHA).
// DELETE /comments/:uuid   — Delete a wiki comment (author or admin).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { WikiCommentService } from '../../services/wiki-comment-service';
import { CommentSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const wiki = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/wiki/comments
// Get global wiki comments.
// =========================================================================================================

wiki.get('/comments', async (c) => {
	const results = await new WikiCommentService(c.env.DB).list();
	return c.json(results);
});

// =========================================================================================================
// POST /api/wiki/comments
// Create a new global wiki comment.
// =========================================================================================================

wiki.post('/comments', requireAuth, async (c) => {
	const parsed = CommentSchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Validation failed', 400, parsed.error.issues);

	try {
		const result = await new WikiCommentService(c.env.DB).create(
			c.get('user'),
			parsed.data.text,
			parsed.data.token || '',
			c.env.TURNSTILE_SECRET_KEY,
		);
		return c.json(result);
	} catch (e) {
		console.error('Wiki comment error:', e);
		throw e;
	}
});

// =========================================================================================================
// DELETE /api/wiki/comments/:uuid
// Delete a specific comment.
// =========================================================================================================

wiki.delete('/comments/:uuid', requireAuth, async (c) => {
	try {
		await new WikiCommentService(c.env.DB).delete(c.get('user'), c.req.param('uuid')!);
		return c.json({ success: true });
	} catch (e) {
		console.error('Wiki comment delete error:', e);
		throw e;
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default wiki;
