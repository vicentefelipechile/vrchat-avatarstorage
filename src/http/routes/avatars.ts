// =========================================================================================================
// AVATAR ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for the avatars category. Handlers only: parse/validate input,
// call the service, shape the response, and manage HTTP-only concerns (KV cache).
// All business logic and SQL live in AvatarService / AvatarRepository.
//
// The JSON responses are identical to the legacy handlers so the existing frontend
// works unchanged.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, requireAdmin, type AuthVariables } from '../middleware/auth';
import { AvatarService } from '../../services/avatar-service';
import { ResourceSchema, AvatarMetaSchema, AvatarFilterSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const avatars = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/avatars
// List avatars with faceted filtering (INNER JOIN avatar_meta — only avatars with metadata).
// =========================================================================================================

avatars.get('/', async (c) => {
	const parsed = AvatarFilterSchema.safeParse(c.req.query());
	if (!parsed.success) return fail(c, 'Invalid filters', 400, parsed.error.issues);

	try {
		const result = await new AvatarService(c.env.DB).list(parsed.data);
		return c.json(result);
	} catch (e) {
		console.error('Avatars list error:', e);
		return fail(c, 'Failed to fetch avatars', 500);
	}
});

// =========================================================================================================
// GET /api/avatars/search
// Lightweight avatar name search for autocomplete fields (e.g. clothes base avatar selector).
// Query params: q (required, min 2 chars), limit (default 10, max 20).
// =========================================================================================================

avatars.get('/search', async (c) => {
	const limit = Math.min(20, Math.max(1, parseInt(c.req.query('limit') || '10', 10) || 10));

	try {
		const results = await new AvatarService(c.env.DB).searchByName(c.req.query('q'), limit);
		return c.json(results);
	} catch (e) {
		console.error('[GET /api/avatars/search] error:', e);
		return fail(c, 'Search failed', 500);
	}
});

// =========================================================================================================
// GET /api/avatars/:uuid
// Get a single avatar with its metadata (used by HistoryView for diff calculation).
// =========================================================================================================

avatars.get('/:uuid', async (c) => {
	try {
		const row = await new AvatarService(c.env.DB).detail(c.req.param('uuid')!);
		return c.json(row);
	} catch (e) {
		console.error('Avatar fetch error:', e);
		throw e;
	}
});

// =========================================================================================================
// POST /api/avatars
// Create a resource + avatar_meta (+ links + media) in one batch — no history entry on creation.
// =========================================================================================================

avatars.post('/', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const resourceParsed = ResourceSchema.safeParse(body);
	if (!resourceParsed.success) return fail(c, 'Validation error', 400, resourceParsed.error.issues);

	const metaParsed = AvatarMetaSchema.safeParse((body as Record<string, unknown>).meta);
	if (!metaParsed.success) return fail(c, 'Metadata validation error', 400, metaParsed.error.issues);

	const d = resourceParsed.data;

	try {
		const { uuid } = await new AvatarService(c.env.DB).create(c.get('user'), {
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
		console.error('Avatar create error:', e);
		return fail(c, 'Failed to create avatar', 500);
	}
});

// =========================================================================================================
// PUT /api/avatars/:uuid
// Edit avatar metadata — snapshot previous state, record meta_edit in history, update in one batch.
// =========================================================================================================

avatars.put('/:uuid', requireAdmin, async (c) => {
	const uuid = c.req.param('uuid')!;

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const metaParsed = AvatarMetaSchema.partial().safeParse(body);
	if (!metaParsed.success) return fail(c, 'Validation error', 400, metaParsed.error.issues);

	try {
		await new AvatarService(c.env.DB).update(c.get('user'), uuid, metaParsed.data);
		await c.env.VRCSTORAGE_KV.delete(`resource:${uuid}`); // Invalidate cached diff
		return c.json({ success: true });
	} catch (e) {
		console.error('Avatar update error:', e);
		throw e;
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default avatars;
