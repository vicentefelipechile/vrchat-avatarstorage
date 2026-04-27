// =========================================================================================================
// ASSETS ROUTES
// =========================================================================================================
// Category-specific routes for assets with faceted filtering via INNER JOIN asset_meta.
// POST creates both resources + asset_meta in a single batch (no history entry on creation).
// PUT updates asset_meta and records a meta_edit snapshot in resource_history atomically.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { ResourceSchema, AssetMetaSchema } from '../validators';
import { AssetMeta } from '../types';

// =========================================================================================================
// Helpers
// =========================================================================================================

function buildAssetFilters(params: URLSearchParams): { clauses: string[]; bindings: unknown[] } {
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

	str('asset_type', 'asset_type', [
		'prop',
		'shader',
		'particle',
		'vfx',
		'prefab',
		'script',
		'animation',
		'avatar-base',
		'texture-pack',
		'sound',
		'tool',
		'hud',
		'other',
	]);
	str('platform', 'platform', ['pc', 'quest', 'cross']);
	str('sdk_version', 'sdk_version', ['sdk3', 'sdk2']);
	str('unity_version', 'unity_version', ['2019', '2022']);
	bool('is_nsfw', 'is_nsfw');

	return { clauses, bindings };
}

// =========================================================================================================
// Endpoints
// =========================================================================================================

const assets = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/assets
// List assets with faceted filtering (INNER JOIN asset_meta — only resources with metadata).
// =========================================================================================================

assets.get('/', async (c) => {
	const params = new URLSearchParams(c.req.url.split('?')[1] || '');

	const page = Math.max(1, parseInt(params.get('page') || '1', 10));
	const limit = Math.min(60, Math.max(1, parseInt(params.get('limit') || '24', 10)));
	const offset = (page - 1) * limit;

	const sortByRaw = params.get('sort_by') || 'created_at';
	const sortBy = ['created_at', 'download_count', 'title'].includes(sortByRaw) ? sortByRaw : 'created_at';
	const sortOrder = params.get('sort_order') === 'asc' ? 'ASC' : 'DESC';

	const { clauses, bindings } = buildAssetFilters(params);
	const whereStr = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

	try {
		const countResult = await c.env.DB.prepare(
			`SELECT COUNT(*) as total
			FROM resources r
			INNER JOIN asset_meta am ON r.uuid = am.resource_uuid
			WHERE r.is_active = 1 ${whereStr}`,
		)
			.bind(...bindings)
			.first<{ total: number }>();

		const total = countResult?.total ?? 0;

		const rows = await c.env.DB.prepare(
			`SELECT
				r.uuid,
				r.title,
				r.download_count,
				r.created_at * 1000 AS created_at,
				m.r2_key as thumbnail_key,
				am.asset_type,
				am.is_nsfw,
				am.unity_version,
				am.platform,
				am.sdk_version
			FROM resources r
			INNER JOIN asset_meta am ON r.uuid = am.resource_uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
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
				asset_type: row.asset_type,
				is_nsfw: row.is_nsfw,
				unity_version: row.unity_version,
				platform: row.platform,
				sdk_version: row.sdk_version,
			},
		}));

		return c.json({
			resources,
			pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 },
		});
	} catch (e) {
		console.error('Assets list error:', e);
		return c.json({ error: 'Failed to fetch assets' }, 500);
	}
});

// =========================================================================================================
// GET /api/assets/:uuid
// Get a single asset with its metadata.
// =========================================================================================================

assets.get('/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	try {
		const row = await c.env.DB.prepare(
			`SELECT r.uuid, r.title, r.is_active,
				am.asset_type, am.is_nsfw, am.unity_version, am.platform, am.sdk_version
			FROM resources r
			INNER JOIN asset_meta am ON r.uuid = am.resource_uuid
			WHERE r.uuid = ?`,
		)
			.bind(uuid)
			.first<Record<string, unknown>>();

		if (!row) return c.json({ error: 'Not found' }, 404);
		return c.json(row);
	} catch (e) {
		console.error('Asset fetch error:', e);
		return c.json({ error: 'Failed to fetch asset' }, 500);
	}
});

// =========================================================================================================
// POST /api/assets
// Create a resource + asset_meta in one db.batch() — no history entry on creation.
// =========================================================================================================

assets.post('/', async (c) => {
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

	const metaParsed = AssetMetaSchema.safeParse((body as Record<string, unknown>).meta);
	if (!metaParsed.success) return c.json({ error: 'Metadata validation error', details: metaParsed.error.issues }, 400);

	const d = resourceParsed.data;
	const m = metaParsed.data;
	const resourceUuid = crypto.randomUUID();
	const now = Math.floor(Date.now() / 1000);

	try {
		const insertResource = c.env.DB.prepare(
			`INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid, is_active, created_at, updated_at)
			VALUES (?, ?, ?, 'assets', ?, ?, ?, 0, ?, ?)`,
		).bind(resourceUuid, d.title, d.description ?? null, d.thumbnail_uuid, d.reference_image_uuid ?? null, user.uuid, now, now);

		const insertMeta = c.env.DB.prepare(
			`INSERT INTO asset_meta (resource_uuid, asset_type, is_nsfw, unity_version, platform, sdk_version)
			VALUES (?, ?, ?, ?, ?, ?)`,
		).bind(resourceUuid, m.asset_type, m.is_nsfw, m.unity_version, m.platform, m.sdk_version);

		await c.env.DB.batch([insertResource, insertMeta]);

		// Insert download links
		const links = (body as Record<string, unknown>).links as Array<Record<string, unknown>> ?? [];
		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			await c.env.DB.prepare(
				'INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order) VALUES (?, ?, ?, ?, ?, ?)',
			).bind(crypto.randomUUID(), resourceUuid, link.link_url, link.link_title ?? null, link.link_type ?? 'general', link.display_order ?? i).run();
		}

		// Insert media associations
		const mediaFiles = (body as Record<string, unknown>).media_files as string[] ?? [];
		for (const mediaUuid of mediaFiles) {
			await c.env.DB.prepare(
				'INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid) VALUES (?, ?, ?)',
			).bind(crypto.randomUUID(), resourceUuid, mediaUuid).run();
		}

		return c.json({ uuid: resourceUuid }, 201);
	} catch (e) {
		console.error('Asset create error:', e);
		return c.json({ error: 'Failed to create asset' }, 500);
	}
});

// =========================================================================================================
// PUT /api/assets/:uuid
// Edit asset metadata — snapshot previous state, record meta_edit in history, update in db.batch().
// =========================================================================================================

assets.put('/:uuid', async (c) => {
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

	const metaParsed = AssetMetaSchema.partial().safeParse(body);
	if (!metaParsed.success) return c.json({ error: 'Validation error', details: metaParsed.error.issues }, 400);

	try {
		const existing = await c.env.DB.prepare('SELECT * FROM asset_meta WHERE resource_uuid = ?').bind(uuid).first<AssetMeta>();
		if (!existing) return c.json({ error: 'Asset metadata not found' }, 404);

		const m = metaParsed.data;
		const historyUuid = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		const previousData = JSON.stringify({ meta_type: 'asset_meta', fields: existing });

		const insertHistory = c.env.DB.prepare(
			`INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data, created_at)
			VALUES (?, ?, ?, 'meta_edit', ?, ?)`,
		).bind(historyUuid, uuid, user.uuid, previousData, now);

		const fields = ['asset_type', 'is_nsfw', 'unity_version', 'platform', 'sdk_version'] as const;
		const setClauses: string[] = [];
		const setBindings: unknown[] = [];
		for (const f of fields) {
			if (m[f] !== undefined) {
				setClauses.push(`${f} = ?`);
				setBindings.push(m[f] ?? null);
			}
		}
		if (setClauses.length === 0) return c.json({ error: 'No fields to update' }, 400);

		const updateMeta = c.env.DB.prepare(`UPDATE asset_meta SET ${setClauses.join(', ')} WHERE resource_uuid = ?`).bind(
			...setBindings,
			uuid,
		);

		await c.env.DB.batch([insertHistory, updateMeta]);

		return c.json({ success: true });
	} catch (e) {
		console.error('Asset update error:', e);
		return c.json({ error: 'Failed to update asset' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default assets;
