// =========================================================================================================
// RESOURCE ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for the resources domain. Handlers only: parse/validate input,
// call the service, shape the response, and manage HTTP-only concerns (KV cache,
// Turnstile, cache headers). All business logic and SQL live in the service/repository.
//
// The JSON responses are identical to the legacy handlers so the existing frontend
// works unchanged.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { getAuthUser } from '../../auth';
import { requireAuth, requireAdmin, type AuthVariables } from '../middleware/auth';
import { ResourceService } from '../../services/resource-service';
import { ResourceSchema, LinkSchema, LinkUpdateSchema } from '../../validators';
import { verifyTurnstile } from '../../helpers/turnstile';
import { ForbiddenError, NotFoundError } from '../../domain/errors';
import { fail } from '../responses';

// =========================================================================================================
// Helpers
// =========================================================================================================

/** Invalidates the KV caches touched by a resource mutation. */
async function invalidateResourceCache(env: Env, uuid?: string, category?: string) {
	const keys = ['resource:latest'];
	if (uuid) keys.push(`resource:${uuid}`);
	if (category) keys.push(`resource:category:${category}`);
	await Promise.all(keys.map((k) => env.VRCSTORAGE_KV.delete(k)));
}

// =========================================================================================================
// Endpoints
// =========================================================================================================

const resources = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/resources/latest
// Returns the latest active resources (KV-cached for 60s).
// =========================================================================================================

resources.get('/latest', async (c) => {
	c.header('Cache-Control', 'public, max-age=60');

	const cached = await c.env.VRCSTORAGE_KV.get('resource:latest', 'json');
	if (cached) return c.json(cached);

	const results = await new ResourceService(c.env.DB).latest(10);

	await c.env.VRCSTORAGE_KV.put('resource:latest', JSON.stringify(results), { expirationTtl: 60 });
	return c.json(results);
});

// =========================================================================================================
// GET /api/resources/ (search)
// Query params: q, category, sort_by, sort_order, page, limit (max 60).
// =========================================================================================================

resources.get('/', async (c) => {
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
	const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '30', 10) || 30), 60);
	const category = c.req.query('category');
	const sortBy = c.req.query('sort_by');
	const sortOrder = (c.req.query('sort_order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

	try {
		const result = await new ResourceService(c.env.DB).search({ page, limit, category, sortBy, sortOrder });
		return c.json(result);
	} catch (e) {
		console.error('[GET /resources] search error:', e);
		return fail(c, 'Search failed', 500);
	}
});

// =========================================================================================================
// GET /api/resources/:uuid
// Resource detail. Download links gated behind auth.
// =========================================================================================================

resources.get('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	if (!uuid) return fail(c, 'Missing uuid', 400);

	const isLoggedIn = !!(await getAuthUser(c));
	const detail = await new ResourceService(c.env.DB).detail(uuid, isLoggedIn);
	return c.json(detail);
});

// =========================================================================================================
// GET /api/resources/:uuid/history
// Edit history. Authenticated users only.
// =========================================================================================================

resources.get('/:uuid/history', requireAuth, async (c) => {
	const uuid = c.req.param('uuid')!;
	try {
		const history = await new ResourceService(c.env.DB).history(uuid);
		return c.json(history);
	} catch (e) {
		console.error('History error:', e);
		return fail(c, 'Failed to fetch history', 500);
	}
});

// =========================================================================================================
// POST /api/resources/
// Creates a new resource. Turnstile-gated.
// =========================================================================================================

resources.post('/', requireAuth, async (c) => {
	const user = c.get('user');
	const body = await c.req.json();

	const { token, ...input } = ResourceSchema.parse(body);

	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return fail(c, 'Invalid CAPTCHA', 403);

	try {
		const { uuid } = await new ResourceService(c.env.DB).create(user, input);
		await invalidateResourceCache(c.env, undefined, input.category);
		return c.json({ success: true, uuid });
	} catch (e) {
		console.error('Create resource error:', e);
		return fail(c, 'Failed to create resource', 500);
	}
});

// =========================================================================================================
// PUT /api/resources/:uuid
// Updates a resource. Owner or admin; approved resources are admin-only.
// =========================================================================================================

resources.put('/:uuid', requireAuth, async (c) => {
	const uuid = c.req.param('uuid')!;
	const user = c.get('user');
	const body = await c.req.json();

	// Validate the core resource fields; link/media/gallery arrays are validated inline below.
	const ResourceUpdateSchema = ResourceSchema.partial().omit({ token: true, links: true, media_files: true });
	const parsed = ResourceUpdateSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Invalid input', 400, parsed.error.issues);

	const newLinks = z.array(LinkSchema).optional().parse(body.new_links);
	const gallery = body.gallery_media_uuids !== undefined ? z.array(z.uuid()).parse(body.gallery_media_uuids) : undefined;

	try {
		await new ResourceService(c.env.DB).update(user, uuid, {
			...parsed.data,
			is_active: typeof body.is_active === 'number' ? body.is_active : undefined,
			new_links: newLinks,
			gallery_media_uuids: gallery,
		});
		await invalidateResourceCache(c.env, uuid);
		return c.json({ success: true });
	} catch (e) {
		if (e instanceof NotFoundError || e instanceof ForbiddenError) throw e;
		console.error('Update resource error:', e);
		return fail(c, 'Failed to update resource', 500);
	}
});

// =========================================================================================================
// DELETE /api/resources/:uuid
// Deletes a resource. Admin only.
// =========================================================================================================

resources.delete('/:uuid', requireAdmin, async (c) => {
	const uuid = c.req.param('uuid')!;
	const user = c.get('user');
	try {
		await new ResourceService(c.env.DB).delete(user, uuid);
		await invalidateResourceCache(c.env, uuid);
		return c.json({ success: true });
	} catch (e) {
		if (e instanceof NotFoundError || e instanceof ForbiddenError) throw e;
		console.error('Delete resource error:', e);
		return fail(c, 'Failed to delete resource', 500);
	}
});

// =========================================================================================================
// DELETE /api/resources/:uuid/links/:linkUuid
// Deletes a single link. Owner or admin.
// =========================================================================================================

resources.delete('/:uuid/links/:linkUuid', requireAuth, async (c) => {
	const user = c.get('user');
	const resourceUuid = c.req.param('uuid')!;
	const linkUuid = c.req.param('linkUuid')!;

	await new ResourceService(c.env.DB).deleteLink(user, resourceUuid, linkUuid);
	await invalidateResourceCache(c.env, resourceUuid);
	return c.json({ ok: true });
});

// =========================================================================================================
// PUT /api/resources/:uuid/links/:linkUuid
// Updates a single link (title, url, type, order). Owner or admin.
// =========================================================================================================

resources.put('/:uuid/links/:linkUuid', requireAuth, async (c) => {
	const user = c.get('user');
	const resourceUuid = c.req.param('uuid')!;
	const linkUuid = c.req.param('linkUuid')!;

	const parsed = LinkUpdateSchema.safeParse(await c.req.json());
	if (!parsed.success) return fail(c, 'Invalid input', 400, parsed.error.issues);

	await new ResourceService(c.env.DB).updateLink(user, resourceUuid, linkUuid, parsed.data);
	await invalidateResourceCache(c.env, resourceUuid);
	return c.json({ ok: true });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default resources;
