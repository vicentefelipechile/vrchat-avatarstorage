// =========================================================================================================
// AUTHOR ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for avatar authors. Handlers only: parse/validate input, call the
// service, shape the response. All business logic and SQL live in AuthorService /
// AuthorRepository. Domain errors thrown by the service are mapped to HTTP by the central
// app.onError, so admin/not-found/conflict responses stay identical to the legacy shapes.
//
// The JSON responses are identical to the legacy handlers so the existing frontend
// works unchanged.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { AuthorService } from '../../services/author-service';
import { AvatarAuthorSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const authors = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/authors
// Paginated list of avatar authors (each row carries a resource_count).
// =========================================================================================================

authors.get('/', async (c) => {
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
	const limit = Math.min(60, Math.max(1, parseInt(c.req.query('limit') || '24', 10)));

	try {
		const result = await new AuthorService(c.env.DB).list(page, limit);
		return c.json(result);
	} catch (e) {
		console.error('Authors list error:', e);
		return fail(c, 'Failed to fetch authors', 500);
	}
});

// =========================================================================================================
// GET /api/authors/search?q=
// Autocomplete by name — returns max 10 results with uuid, name, slug.
// =========================================================================================================

authors.get('/search', async (c) => {
	try {
		const results = await new AuthorService(c.env.DB).searchByName(c.req.query('q') || '');
		return c.json(results);
	} catch (e) {
		console.error('Authors search error:', e);
		return fail(c, 'Search failed', 500);
	}
});

// =========================================================================================================
// GET /api/authors/:slug
// Public author profile + paginated list of their avatars.
// =========================================================================================================

authors.get('/:slug', async (c) => {
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));

	try {
		const result = await new AuthorService(c.env.DB).profile(c.req.param('slug')!, page);
		return c.json(result);
	} catch (e) {
		console.error('Author profile error:', e);
		throw e;
	}
});

// =========================================================================================================
// POST /api/authors
// Create a new author record [admin only].
// =========================================================================================================

authors.post('/', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = AvatarAuthorSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	try {
		const result = await new AuthorService(c.env.DB).create(c.get('user'), parsed.data);
		return c.json(result, 201);
	} catch (e) {
		console.error('Author create error:', e);
		throw e;
	}
});

// =========================================================================================================
// PUT /api/authors/:slug
// Edit an author record [admin only].
// =========================================================================================================

authors.put('/:slug', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = AvatarAuthorSchema.partial().safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	try {
		await new AuthorService(c.env.DB).update(c.get('user'), c.req.param('slug')!, parsed.data);
		return c.json({ success: true });
	} catch (e) {
		console.error('Author update error:', e);
		throw e;
	}
});

// =========================================================================================================
// DELETE /api/authors/:slug
// Delete an author — only if no avatars are linked to them [admin only].
// =========================================================================================================

authors.delete('/:slug', requireAuth, async (c) => {
	try {
		await new AuthorService(c.env.DB).delete(c.get('user'), c.req.param('slug')!);
		return c.json({ success: true });
	} catch (e) {
		console.error('Author delete error:', e);
		throw e;
	}
});

// =========================================================================================================
// POST /api/authors/:slug/link-resource
// Link an avatar resource to this author. Records a meta_edit history snapshot [admin only].
// Body: { resource_uuid: string }
// =========================================================================================================

authors.post('/:slug/link-resource', requireAuth, async (c) => {
	let body: { resource_uuid?: unknown };
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const resourceUuid = body.resource_uuid;
	if (typeof resourceUuid !== 'string' || !/^[0-9a-f-]{36}$/i.test(resourceUuid)) {
		return fail(c, 'Invalid resource_uuid', 400);
	}

	try {
		await new AuthorService(c.env.DB).linkResource(c.get('user'), c.req.param('slug')!, resourceUuid);
		return c.json({ success: true });
	} catch (e) {
		console.error('Author link-resource error:', e);
		throw e;
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default authors;
