// =========================================================================================================
// FAVORITE ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for user favorites. Handlers only: resolve auth, parse/validate
// input, call the service, shape the response. Business logic and SQL live in
// FavoriteService / FavoriteRepository; domain errors map to HTTP via app.onError.
//
// Two endpoints (check, ids) are reachable anonymously and must return a benign body
// instead of 401 — they use optionalAuth. The rest require a session.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, optionalAuth, type AuthVariables } from '../middleware/auth';
import { FavoriteService } from '../../services/favorite-service';
import { AddFavoriteSchema, FavoriteReorderSchema, FavoriteMoveSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const favorites = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/favorites
// Returns favorites for the authenticated user, scoped to a collection.
// Query params: ?collection=<uuid> (specific collection), ?collection=all (all),
// omitted = uncategorized.
// =========================================================================================================

favorites.get('/', requireAuth, async (c) => {
	const collectionParam = c.req.query('collection');
	const collectionUuid: string | null | 'all' = collectionParam === 'all' ? 'all' : collectionParam ?? null;

	const result = await new FavoriteService(c.env.DB).list(c.get('user').uuid, collectionUuid);
	return c.json(result);
});

// =========================================================================================================
// GET /api/favorites/ids
// Returns only the UUIDs of the user's favorites (anonymous → empty list, not 401).
// =========================================================================================================

favorites.get('/ids', optionalAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ favorites: [] });

	const ids = await new FavoriteService(c.env.DB).listIds(user.uuid);
	return c.json({ favorites: ids });
});

// =========================================================================================================
// GET /api/favorites/check/:resourceUuid
// Checks if a resource is a favorite (anonymous → { is_favorite: false }, not 401).
// =========================================================================================================

favorites.get('/check/:resourceUuid', optionalAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ is_favorite: false });

	const isFavorite = await new FavoriteService(c.env.DB).isFavorite(user.uuid, c.req.param('resourceUuid')!);
	return c.json({ is_favorite: isFavorite });
});

// =========================================================================================================
// POST /api/favorites
// Adds a resource to favorites, optionally into a specific collection.
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

	const result = await new FavoriteService(c.env.DB).add(c.get('user'), parsed.data.resource_uuid, parsed.data.collection_uuid);
	return c.json(result);
});

// =========================================================================================================
// POST /api/favorites/reorder
// Batch-reorders favorites within a collection. Receives the full ordered list of UUIDs.
// =========================================================================================================

favorites.post('/reorder', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = FavoriteReorderSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	await new FavoriteService(c.env.DB).reorder(c.get('user'), parsed.data.ordered_uuids, parsed.data.collection_uuid);
	return c.json({ success: true });
});

// =========================================================================================================
// PUT /api/favorites/:resourceUuid/collection
// Moves a favorite to a different collection (or uncategorized if null).
// =========================================================================================================

favorites.put('/:resourceUuid/collection', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = FavoriteMoveSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	await new FavoriteService(c.env.DB).moveToCollection(c.get('user'), c.req.param('resourceUuid')!, parsed.data.collection_uuid);
	return c.json({ success: true });
});

// =========================================================================================================
// DELETE /api/favorites/:resourceUuid
// Removes a resource from favorites.
// =========================================================================================================

favorites.delete('/:resourceUuid', requireAuth, async (c) => {
	await new FavoriteService(c.env.DB).remove(c.get('user'), c.req.param('resourceUuid')!);
	return c.json({ success: true });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default favorites;
