// =========================================================================================================
// FAVORITE ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for user favorites. Handlers only: resolve auth, parse/validate
// input, call the service, shape the response. Business logic and SQL live in
// FavoriteService / FavoriteRepository; domain errors map to HTTP via app.onError.
//
// Two endpoints (check, ids) are reachable anonymously and must return a benign body
// instead of 401 — they use optionalAuth. The rest require a session.
//
// The JSON responses are identical to the legacy handlers so the existing frontend
// works unchanged.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, optionalAuth, type AuthVariables } from '../middleware/auth';
import { FavoriteService } from '../../services/favorite-service';
import { AddFavoriteSchema, FavoriteOrderSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const favorites = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/favorites
// Returns all favorites of the authenticated user (paginated).
// =========================================================================================================

favorites.get('/', requireAuth, async (c) => {
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
	const limit = Math.min(60, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));

	try {
		const result = await new FavoriteService(c.env.DB).list(c.get('user').uuid, page, limit);
		return c.json(result);
	} catch (e) {
		console.error('Favorites list error:', e);
		return fail(c, 'Failed to fetch favorites', 500);
	}
});

// =========================================================================================================
// GET /api/favorites/ids
// Returns only the UUIDs of the user's favorites (anonymous → empty list, not 401).
// =========================================================================================================

favorites.get('/ids', optionalAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ favorites: [] });

	try {
		const ids = await new FavoriteService(c.env.DB).listIds(user.uuid);
		return c.json({ favorites: ids });
	} catch (e) {
		console.error('Favorites ids error:', e);
		return fail(c, 'Failed to fetch favorites', 500);
	}
});

// =========================================================================================================
// GET /api/favorites/check/:resourceUuid
// Checks if a resource is a favorite (anonymous → { is_favorite: false }, not 401).
// =========================================================================================================

favorites.get('/check/:resourceUuid', optionalAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ is_favorite: false });

	try {
		const isFavorite = await new FavoriteService(c.env.DB).isFavorite(user.uuid, c.req.param('resourceUuid')!);
		return c.json({ is_favorite: isFavorite });
	} catch (e) {
		console.error('Favorites check error:', e);
		return fail(c, 'Failed to check favorite', 500);
	}
});

// =========================================================================================================
// POST /api/favorites
// Adds a resource to favorites.
// =========================================================================================================

favorites.post('/', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = AddFavoriteSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	try {
		const result = await new FavoriteService(c.env.DB).add(c.get('user'), parsed.data.resource_uuid);
		return c.json(result);
	} catch (e) {
		console.error('Favorites add error:', e);
		throw e;
	}
});

// =========================================================================================================
// POST /api/favorites/reorder
// Moves a favorite to the top (reorder).
// =========================================================================================================

favorites.post('/reorder', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = FavoriteOrderSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	try {
		await new FavoriteService(c.env.DB).reorder(c.get('user'), parsed.data.resource_uuid, parsed.data.move_to_top);
		return c.json({ success: true });
	} catch (e) {
		console.error('Favorites reorder error:', e);
		throw e;
	}
});

// =========================================================================================================
// DELETE /api/favorites/:resourceUuid
// Removes a resource from favorites.
// =========================================================================================================

favorites.delete('/:resourceUuid', requireAuth, async (c) => {
	try {
		await new FavoriteService(c.env.DB).remove(c.get('user'), c.req.param('resourceUuid')!);
		return c.json({ success: true });
	} catch (e) {
		console.error('Favorites delete error:', e);
		throw e;
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default favorites;
