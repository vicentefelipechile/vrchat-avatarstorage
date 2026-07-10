// =========================================================================================================
// COLLECTION ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for user favorite collections. Collections are named folders that
// group favorites. All business logic lives in CollectionService; domain errors map to
// HTTP via app.onError.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { CollectionService } from '../../services/collection-service';
import { CreateCollectionSchema, CollectionReorderSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const collections = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/collections
// Lists all collections for the authenticated user, each with its favorite count.
// =========================================================================================================

collections.get('/', requireAuth, async (c) => {
	const list = await new CollectionService(c.env.DB).list(c.get('user').uuid);
	return c.json({ collections: list });
});

// =========================================================================================================
// POST /api/collections
// Creates a new collection.
// =========================================================================================================

collections.post('/', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = CreateCollectionSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	const result = await new CollectionService(c.env.DB).create(c.get('user'), parsed.data.name);
	return c.json(result, 201);
});

// =========================================================================================================
// PUT /api/collections/:uuid
// Renames an existing collection.
// =========================================================================================================

collections.put('/:uuid', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = CreateCollectionSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	await new CollectionService(c.env.DB).rename(c.get('user'), c.req.param('uuid')!, parsed.data.name);
	return c.json({ success: true });
});

// =========================================================================================================
// DELETE /api/collections/:uuid
// Deletes a collection. Favorites in it become uncategorized.
// =========================================================================================================

collections.delete('/:uuid', requireAuth, async (c) => {
	await new CollectionService(c.env.DB).delete(c.get('user'), c.req.param('uuid')!);
	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/collections/reorder
// Batch-reorders collections by receiving the full ordered list of UUIDs.
// =========================================================================================================

collections.post('/reorder', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = CollectionReorderSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	await new CollectionService(c.env.DB).reorder(c.get('user'), parsed.data.ordered_uuids);
	return c.json({ success: true });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default collections;
