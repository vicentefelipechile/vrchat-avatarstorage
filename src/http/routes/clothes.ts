// =========================================================================================================
// CLOTHES ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for the clothes category. Handlers only: parse/validate input,
// call the service, shape the response, and manage HTTP-only concerns (KV cache).
// All business logic and SQL live in ClothesService / ClothesRepository.
//
// The JSON responses are identical to the legacy handlers so the existing frontend
// works unchanged.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, requireAdmin, type AuthVariables } from '../middleware/auth';
import { ClothesService } from '../../services/clothes-service';
import { ResourceSchema, ClothesMetaSchema, ClothesFilterSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const clothes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/clothes
// List clothes with faceted filtering (INNER JOIN clothes_meta — only clothes with metadata).
// =========================================================================================================

clothes.get('/', async (c) => {
	const parsed = ClothesFilterSchema.safeParse(c.req.query());
	if (!parsed.success) return fail(c, 'Invalid filters', 400, parsed.error.issues);

	try {
		const result = await new ClothesService(c.env.DB).list(parsed.data);
		return c.json(result);
	} catch (e) {
		console.error('Clothes list error:', e);
		return fail(c, 'Failed to fetch clothes', 500);
	}
});

// =========================================================================================================
// GET /api/clothes/:uuid
// Get a single clothes item with its metadata.
// =========================================================================================================

clothes.get('/:uuid', async (c) => {
	try {
		const row = await new ClothesService(c.env.DB).detail(c.req.param('uuid')!);
		return c.json(row);
	} catch (e) {
		console.error('Clothes fetch error:', e);
		throw e;
	}
});

// =========================================================================================================
// POST /api/clothes
// Create a resource + clothes_meta (+ links + media) in one batch — no history entry on creation.
// =========================================================================================================

clothes.post('/', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const resourceParsed = ResourceSchema.safeParse(body);
	if (!resourceParsed.success) return fail(c, 'Validation error', 400, resourceParsed.error.issues);

	const metaParsed = ClothesMetaSchema.safeParse((body as Record<string, unknown>).meta);
	if (!metaParsed.success) return fail(c, 'Metadata validation error', 400, metaParsed.error.issues);

	const d = resourceParsed.data;

	try {
		const { uuid } = await new ClothesService(c.env.DB).create(c.get('user'), {
			title: d.title,
			description: d.description ?? null,
			thumbnail_uuid: d.thumbnail_uuid,
			reference_image_uuid: d.reference_image_uuid ?? null,
			links: d.links,
			media_files: d.media_files,
			meta: metaParsed.data,
		});
		return c.json({ uuid }, 201);
	} catch (e) {
		console.error('Clothes create error:', e);
		return fail(c, 'Failed to create clothes item', 500);
	}
});

// =========================================================================================================
// PUT /api/clothes/:uuid
// Edit clothes metadata — snapshot previous state, record meta_edit in history, update in one batch.
// =========================================================================================================

clothes.put('/:uuid', requireAdmin, async (c) => {
	const uuid = c.req.param('uuid')!;

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const metaParsed = ClothesMetaSchema.partial().safeParse(body);
	if (!metaParsed.success) return fail(c, 'Validation error', 400, metaParsed.error.issues);

	try {
		await new ClothesService(c.env.DB).update(c.get('user'), uuid, metaParsed.data);
		await c.env.VRCSTORAGE_KV.delete(`resource:${uuid}`); // Invalidate cached diff
		return c.json({ success: true });
	} catch (e) {
		console.error('Clothes update error:', e);
		throw e;
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default clothes;
