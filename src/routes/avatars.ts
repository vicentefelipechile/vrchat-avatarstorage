// =========================================================================================================
// AVATARS ROUTES
// =========================================================================================================
// Category-specific routes for avatars with faceted filtering via INNER JOIN avatar_meta.
// POST creates both resources + avatar_meta in a single batch (no history entry on creation).
// PUT updates avatar_meta and records a meta_edit snapshot in resource_history atomically.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { ResourceSchema, AvatarMetaSchema } from '../validators';
import { AvatarMeta } from '../types';
import z from 'zod';

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Build a parameterised WHERE clause + bindings from a URLSearchParams object.
 * Only includes supported filter keys to prevent SQL injection.
 */
function buildAvatarFilters(params: URLSearchParams): { clauses: string[]; bindings: unknown[] } {
	const clauses: string[] = [];
	const bindings: unknown[] = [];

	const str = (key: string, col: string, allowed: string[]) => {
		const v = params.get(key);
		if (v && allowed.includes(v)) {
			clauses.push(`am.${col} = ?`);
			bindings.push(v);
		}
	};
	const bool = (key: string, col: string) => {
		const v = params.get(key);
		if (v === '0' || v === '1') {
			clauses.push(`am.${col} = ?`);
			bindings.push(Number(v));
		}
	};

	str('avatar_gender', 'gender', ['male', 'female', 'androgynous', 'undefined']);
	str('avatar_size', 'avatar_size', ['tiny', 'small', 'medium', 'tall', 'giant']);
	str('avatar_type', 'avatar_type', [
		'anime',
		'kemono',
		'furry',
		'human',
		'semi-realistic',
		'chibi',
		'mecha',
		'monster',
		'fantasy',
		'sci-fi',
		'vtuber',
		'other',
	]);
	str('platform', 'platform', ['pc', 'quest', 'cross']);
	str('sdk_version', 'sdk_version', ['sdk3', 'sdk2']);
	bool('is_nsfw', 'is_nsfw');
	bool('has_physbones', 'has_physbones');
	bool('has_face_tracking', 'has_face_tracking');
	bool('has_dps', 'has_dps');
	bool('has_gogoloco', 'has_gogoloco');
	bool('has_toggles', 'has_toggles');
	bool('is_quest_optimized', 'is_quest_optimized');

	const authorUuid = params.get('author_uuid');
	if (authorUuid && z.uuid().safeParse(authorUuid)) {
		clauses.push('am.author_uuid = ?');
		bindings.push(authorUuid);
	}

	return { clauses, bindings };
}

// =========================================================================================================
// Endpoints
// =========================================================================================================

const avatars = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/avatars
// List avatars with faceted filtering (INNER JOIN avatar_meta — only resources with metadata).
// =========================================================================================================

avatars.get('/', async (c) => {
	const params = new URLSearchParams(c.req.url.split('?')[1] || '');

	const page = Math.max(1, parseInt(params.get('page') || '1', 10));
	const limit = Math.min(60, Math.max(1, parseInt(params.get('limit') || '24', 10)));
	const offset = (page - 1) * limit;

	const sortByRaw = params.get('sort_by') || 'created_at';
	const sortBy = ['created_at', 'download_count', 'title'].includes(sortByRaw) ? sortByRaw : 'created_at';
	const sortOrder = params.get('sort_order') === 'asc' ? 'ASC' : 'DESC';

	const { clauses, bindings } = buildAvatarFilters(params);
	const whereStr = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

	try {
		const countResult = await c.env.DB.prepare(
			`SELECT COUNT(*) as total
			FROM resources r
			INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			WHERE r.is_active = 1 ${whereStr}`,
		)
			.bind(...bindings)
			.first<{ total: number }>();

		const total = countResult?.total ?? 0;

		const rows = await c.env.DB.prepare(
			`SELECT r.uuid, r.title, r.download_count, r.created_at,
				m.r2_key as thumbnail_key,
				am.gender, am.avatar_size, am.avatar_type, am.is_nsfw,
				am.has_physbones, am.has_face_tracking, am.has_dps,
				am.has_gogoloco, am.has_toggles, am.is_quest_optimized,
				am.sdk_version, am.platform, am.author_uuid, am.author_name_raw,
				aa.name as author_name, aa.slug as author_slug
			FROM resources r
			INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			LEFT JOIN avatar_authors aa ON am.author_uuid = aa.uuid
			WHERE r.is_active = 1 ${whereStr}
			ORDER BY r.${sortBy} ${sortOrder}
			LIMIT ? OFFSET ?`,
		)
			.bind(...bindings, limit, offset)
			.all<Record<string, unknown>>();

		const resources = rows.results.map((row) => ({
			uuid: row.uuid,
			title: row.title,
			thumbnail_key: row.thumbnail_key,
			download_count: row.download_count,
			created_at: row.created_at,
			meta: {
				avatar_gender: row.gender,
				avatar_size: row.avatar_size,
				avatar_type: row.avatar_type,
				is_nsfw: row.is_nsfw,
				has_physbones: row.has_physbones,
				has_face_tracking: row.has_face_tracking,
				has_dps: row.has_dps,
				has_gogoloco: row.has_gogoloco,
				has_toggles: row.has_toggles,
				is_quest_optimized: row.is_quest_optimized,
				sdk_version: row.sdk_version,
				platform: row.platform,
				author_uuid: row.author_uuid,
				author_name_raw: row.author_name_raw,
				author_name: row.author_name,
				author_slug: row.author_slug,
			},
		}));

		return c.json({
			resources,
			pagination: {
				page,
				limit,
				total,
				hasNextPage: offset + limit < total,
				hasPrevPage: page > 1,
			},
		});
	} catch (e) {
		console.error('Avatars list error:', e);
		return c.json({ error: 'Failed to fetch avatars' }, 500);
	}
});

// =========================================================================================================
// GET /api/avatars/:uuid
// Get a single avatar with its metadata (used by HistoryView for diff calculation).
// =========================================================================================================

avatars.get('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	try {
		const row = await c.env.DB.prepare(
			`SELECT r.uuid, r.title, r.is_active,
				am.gender, am.avatar_size, am.avatar_type, am.is_nsfw,
				am.has_physbones, am.has_face_tracking, am.has_dps,
				am.has_gogoloco, am.has_toggles, am.is_quest_optimized,
				am.sdk_version, am.platform, am.author_uuid, am.author_name_raw
			FROM resources r
			INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			WHERE r.uuid = ?`,
		)
			.bind(uuid)
			.first<Record<string, unknown>>();

		if (!row) return c.json({ error: 'Not found' }, 404);
		return c.json(row);
	} catch (e) {
		console.error('Avatar fetch error:', e);
		return c.json({ error: 'Failed to fetch avatar' }, 500);
	}
});

// =========================================================================================================
// POST /api/avatars
// Create a resource + avatar_meta in one db.batch() — no history entry on creation.
// =========================================================================================================

avatars.post('/', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON' }, 400);
	}

	const resourceParsed = ResourceSchema.safeParse(body);
	if (!resourceParsed.success) return c.json({ error: 'Validation error', details: resourceParsed.error.issues }, 400);

	const metaParsed = AvatarMetaSchema.safeParse((body as Record<string, unknown>).meta);
	if (!metaParsed.success) return c.json({ error: 'Metadata validation error', details: metaParsed.error.issues }, 400);

	const d = resourceParsed.data;
	const m = metaParsed.data;
	const resourceUuid = crypto.randomUUID();
	const now = Math.floor(Date.now() / 1000);

	try {
		const dbUser = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(user.username).first<{ uuid: string }>();
		if (!dbUser) return c.json({ error: 'User not found' }, 404);

		const insertResource = c.env.DB.prepare(
			`INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid, is_active, created_at, updated_at)
			VALUES (?, ?, ?, 'avatars', ?, ?, ?, 0, ?, ?)`,
		).bind(resourceUuid, d.title, d.description ?? null, d.thumbnail_uuid, d.reference_image_uuid ?? null, dbUser.uuid, now, now);

		const insertMeta = c.env.DB.prepare(
			`INSERT INTO avatar_meta (resource_uuid, author_uuid, author_name_raw, gender, avatar_size, avatar_type,
				is_nsfw, has_physbones, has_face_tracking, has_dps, has_gogoloco, has_toggles, is_quest_optimized, sdk_version, platform)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).bind(
			resourceUuid,
			m.author_uuid ?? null,
			m.author_name_raw ?? null,
			m.avatar_gender,
			m.avatar_size,
			m.avatar_type,
			m.is_nsfw,
			m.has_physbones,
			m.has_face_tracking,
			m.has_dps,
			m.has_gogoloco,
			m.has_toggles,
			m.is_quest_optimized,
			m.sdk_version,
			m.platform,
		);

		// Insert tags if provided
		const tags = d.tags ?? [];
		const tagStatements = tags.map((tag: string) =>
			c.env.DB.prepare(
				`INSERT OR IGNORE INTO tags (name) VALUES (?); INSERT OR IGNORE INTO resource_tags (resource_uuid, tag_id) SELECT ?, id FROM tags WHERE name = ?`,
			).bind(tag, resourceUuid, tag),
		);

		await c.env.DB.batch([insertResource, insertMeta, ...tagStatements]);

		return c.json({ uuid: resourceUuid }, 201);
	} catch (e) {
		console.error('Avatar create error:', e);
		return c.json({ error: 'Failed to create avatar' }, 500);
	}
});

// =========================================================================================================
// PUT /api/avatars/:uuid
// Edit avatar metadata — snapshot previous state, record meta_edit in history, update in db.batch().
// =========================================================================================================

avatars.put('/:uuid', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON' }, 400);
	}

	const metaParsed = AvatarMetaSchema.partial().safeParse(body);
	if (!metaParsed.success) return c.json({ error: 'Validation error', details: metaParsed.error.issues }, 400);

	try {
		const existing = await c.env.DB.prepare('SELECT * FROM avatar_meta WHERE resource_uuid = ?').bind(uuid).first<AvatarMeta>();
		if (!existing) return c.json({ error: 'Avatar metadata not found' }, 404);

		const m = metaParsed.data;
		const historyUuid = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		const dbUser = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(user.username).first<{ uuid: string }>();
		if (!dbUser) return c.json({ error: 'User not found' }, 404);

		const previousData = JSON.stringify({ meta_type: 'avatar_meta', fields: existing });

		const insertHistory = c.env.DB.prepare(
			`INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data, created_at)
			VALUES (?, ?, ?, 'meta_edit', ?, ?)`,
		).bind(historyUuid, uuid, dbUser.uuid, previousData, now);

		const fields = [
			'avatar_gender',
			'avatar_size',
			'avatar_type',
			'is_nsfw',
			'has_physbones',
			'has_face_tracking',
			'has_dps',
			'has_gogoloco',
			'has_toggles',
			'is_quest_optimized',
			'sdk_version',
			'platform',
			'author_uuid',
			'author_name_raw',
		] as const;
		const setClauses: string[] = [];
		const setBindings: unknown[] = [];
		for (const f of fields) {
			if (m[f] !== undefined) {
				setClauses.push(`${f} = ?`);
				setBindings.push(m[f] ?? null);
			}
		}
		if (setClauses.length === 0) return c.json({ error: 'No fields to update' }, 400);

		const updateMeta = c.env.DB.prepare(`UPDATE avatar_meta SET ${setClauses.join(', ')} WHERE resource_uuid = ?`).bind(
			...setBindings,
			uuid,
		);

		await c.env.DB.batch([insertHistory, updateMeta]);

		return c.json({ success: true });
	} catch (e) {
		console.error('Avatar update error:', e);
		return c.json({ error: 'Failed to update avatar' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default avatars;
