// =========================================================================================================
// ADMIN ROUTES
// =========================================================================================================
// Administrative endpoints for resource management and cleanup
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { Resource, Media } from '../types';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const admin = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/admin/pending
// Get all pending resources
// =========================================================================================================

admin.get('/pending', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	try {
		const resources = await c.env.DB.prepare(
			`
            SELECT 
                r.*, 
                m.r2_key as thumbnail_key,
                u.username as author_username,
                u.avatar_url as author_avatar
            FROM resources r 
            LEFT JOIN media m ON r.thumbnail_uuid = m.uuid 
            LEFT JOIN users u ON r.author_uuid = u.uuid
            WHERE r.is_active = 0 
            ORDER BY r.created_at DESC
        `,
		).all<Resource & { thumbnail_key: string | null; author_username: string | null; author_avatar: string | null }>();

		const mapped = resources.results.map((r) => ({
			...r,
			timestamp: r.created_at * 1000,
			author: r.author_username ? { username: r.author_username, avatar_url: r.author_avatar } : null,
		}));

		return c.json(mapped);
	} catch (e) {
		console.error('Admin pending fetch error:', e);
		return c.json({ error: 'Failed to fetch pending resources' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/resource/:uuid/approve
// Approve a pending resource
// =========================================================================================================

admin.post('/resource/:uuid/approve', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		// Get resource category before updating
		const resource = await c.env.DB.prepare('SELECT category FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();
		if (!resource) return c.json({ error: 'Resource not found' }, 404);

		// Approve the resource
		await c.env.DB.prepare('UPDATE resources SET is_active = 1 WHERE uuid = ?').bind(uuid).run();

		// Invalidate KV Caches to refresh the lists immediately
		await c.env.VRCSTORAGE_KV.delete('resource:latest');
		await c.env.VRCSTORAGE_KV.delete(`resource:category:${resource.category}`);

		return c.json({ success: true });
	} catch (e) {
		console.error('Admin approve error:', e);
		return c.json({ error: 'Failed to approve resource' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/resource/:uuid/reject
// Reject and delete a pending resource
// =========================================================================================================

admin.post('/resource/:uuid/reject', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		const mediaFiles = await c.env.DB.prepare(
			`SELECT m.r2_key FROM media m
			 JOIN resource_n_media rm ON m.uuid = rm.media_uuid
			 WHERE rm.resource_uuid = ?`,
		)
			.bind(uuid)
			.all<Media>();

		const thumbnail = await c.env.DB.prepare('SELECT m.r2_key FROM media m JOIN resources r ON m.uuid = r.thumbnail_uuid WHERE r.uuid = ?')
			.bind(uuid)
			.first<Media>();

		// Delete from R2
		if (thumbnail) await c.env.BUCKET.delete(thumbnail.r2_key);
		for (const media of mediaFiles.results) {
			await c.env.BUCKET.delete(media.r2_key);
		}

		await c.env.DB.prepare('DELETE FROM resources WHERE uuid = ?').bind(uuid).run();

		return c.json({ success: true });
	} catch (e) {
		console.error('Admin reject error:', e);
		return c.json({ error: 'Failed to reject resource' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/resource/:uuid/deactivate
// Deactivate an approved resource
// =========================================================================================================

admin.post('/resource/:uuid/deactivate', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		// Get resource category before updating
		const resource = await c.env.DB.prepare('SELECT category FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();
		if (!resource) return c.json({ error: 'Resource not found' }, 404);

		// Deactivate the resource
		await c.env.DB.prepare('UPDATE resources SET is_active = 0 WHERE uuid = ?').bind(uuid).run();

		// Invalidate KV Caches to refresh the lists immediately
		await c.env.VRCSTORAGE_KV.delete('resource:latest');
		await c.env.VRCSTORAGE_KV.delete(`resource:category:${resource.category}`);

		return c.json({ success: true });
	} catch (e) {
		console.error('Admin deactivate error:', e);
		return c.json({ error: 'Failed to deactivate resource' }, 500);
	}
});

// =========================================================================================================
// GET /api/admin/stats/orphaned-media
// Get statistics of orphaned media files without deleting them
// =========================================================================================================

admin.get('/stats/orphaned-media', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const TWENTY_FOUR_HOURS = 24 * 60 * 60;
	const cutoffTime = Math.floor(Date.now() / 1000) - TWENTY_FOUR_HOURS;

	try {
		// Contar archivos huérfanos
		const orphanedMedia = await c.env.DB.prepare(
			`
			SELECT m.uuid, m.r2_key, m.file_name, m.media_type, m.created_at
			FROM media m
			WHERE m.created_at < ?
			AND m.uuid NOT IN (
				SELECT thumbnail_uuid FROM resources WHERE thumbnail_uuid IS NOT NULL
				UNION
				SELECT reference_image_uuid FROM resources WHERE reference_image_uuid IS NOT NULL
				UNION
				SELECT media_uuid FROM resource_n_media
				UNION
				SELECT cover_image_uuid FROM blog_posts WHERE cover_image_uuid IS NOT NULL
			)
			AND NOT EXISTS (SELECT 1 FROM users        WHERE INSTR(users.avatar_url,      m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM comments     WHERE INSTR(comments.text,         m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM blog_comments WHERE INSTR(blog_comments.text,   m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM blog_posts    WHERE INSTR(blog_posts.content,   m.r2_key) > 0)
		`,
		)
			.bind(cutoffTime)
			.all<Media>();

		// Estadísticas generales
		const totalMedia = await c.env.DB.prepare('SELECT COUNT(*) as count FROM media').first<{ count: number }>();
		const totalResources = await c.env.DB.prepare('SELECT COUNT(*) as count FROM resources').first<{ count: number }>();

		return c.json({
			orphaned_count: orphanedMedia.results.length,
			orphaned_files: orphanedMedia.results.map((m) => ({
				uuid: m.uuid,
				filename: m.file_name,
				type: m.media_type,
				age_hours: Math.floor((Date.now() / 1000 - m.created_at) / 3600),
			})),
			total_media: totalMedia?.count || 0,
			total_resources: totalResources?.count || 0,
			cutoff_hours: 24,
		});
	} catch (e) {
		console.error('Stats error:', e);
		return c.json({ error: 'Failed to get stats' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/cleanup/orphaned-media
// Clean up orphaned media files that are not associated with any resource and are older than 24 hours
// =========================================================================================================

admin.post('/cleanup/orphaned-media', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const TWENTY_FOUR_HOURS = 24 * 60 * 60; // en segundos
	const cutoffTime = Math.floor(Date.now() / 1000) - TWENTY_FOUR_HOURS;

	try {
		// Encontrar media huérfanos (no asociados a recursos)
		const orphanedMedia = await c.env.DB.prepare(
			`
			SELECT m.uuid, m.r2_key 
			FROM media m
			WHERE m.created_at < ?
			AND m.uuid NOT IN (
				SELECT thumbnail_uuid FROM resources WHERE thumbnail_uuid IS NOT NULL
				UNION
				SELECT reference_image_uuid FROM resources WHERE reference_image_uuid IS NOT NULL
				UNION
				SELECT media_uuid FROM resource_n_media
				UNION
				SELECT cover_image_uuid FROM blog_posts WHERE cover_image_uuid IS NOT NULL
			)
			AND NOT EXISTS (SELECT 1 FROM users        WHERE INSTR(users.avatar_url,      m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM comments     WHERE INSTR(comments.text,         m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM blog_comments WHERE INSTR(blog_comments.text,   m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM blog_posts    WHERE INSTR(blog_posts.content,   m.r2_key) > 0)
		`,
		)
			.bind(cutoffTime)
			.all<Media>();

		let deletedCount = 0;

		for (const media of orphanedMedia.results) {
			// Eliminar de R2
			await c.env.BUCKET.delete(media.r2_key);

			// Eliminar de DB
			await c.env.DB.prepare('DELETE FROM media WHERE uuid = ?').bind(media.uuid).run();

			deletedCount++;
		}

		return c.json({
			success: true,
			deleted: deletedCount,
			message: `Cleaned up ${deletedCount} orphaned files`,
		});
	} catch (e) {
		console.error('Cleanup error:', e);
		return c.json({ error: 'Cleanup failed' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/cache/clear/:username
// Clear the cache for a specific user. Useful for refreshing admin permissions.
// =========================================================================================================

admin.post('/cache/clear/:username', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const targetUsername = c.req.param('username');
	try {
		await c.env.VRCSTORAGE_KV.delete(`user:${targetUsername}`);
		return c.json({ success: true, message: `Cache cleared for user ${targetUsername}` });
	} catch (e) {
		console.error('Cache clear error:', e);
		return c.json({ error: 'Failed to clear cache' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/users/:username/role
// Update the is_admin flag for a target user and immediately invalidate their KV session cache.
// Without KV invalidation, a demoted admin could retain elevated access for up to 7 days.
// =========================================================================================================

admin.post('/users/:username/role', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const targetUsername = c.req.param('username');

	let body: { is_admin?: unknown };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400);
	}

	if (typeof body.is_admin !== 'boolean') return c.json({ error: 'is_admin must be a boolean' }, 400);

	// An admin cannot demote themselves — prevents accidental lockout.
	if (targetUsername === user.username) return c.json({ error: 'Cannot change your own role' }, 400);

	try {
		const targetUser = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(targetUsername).first<{ uuid: string }>();
		if (!targetUser) return c.json({ error: 'User not found' }, 404);

		await c.env.DB.prepare('UPDATE users SET is_admin = ? WHERE uuid = ?')
			.bind(body.is_admin ? 1 : 0, targetUser.uuid)
			.run();

		// Critical: invalidate KV cache so the role change takes effect immediately.
		// Without this, the user would retain their old role for up to 7 days.
		await c.env.VRCSTORAGE_KV.delete(`user:${targetUsername}`);

		return c.json({ success: true, username: targetUsername, is_admin: body.is_admin });
	} catch (e) {
		console.error('Role change error:', e);
		return c.json({ error: 'Failed to update role' }, 500);
	}
});

// =========================================================================================================
// GET /api/admin/stats
// Consolidated metrics for the admin dashboard overview section.
// =========================================================================================================

admin.get('/stats', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const TWENTY_FOUR_HOURS = 24 * 60 * 60;
	const cutoffTime = Math.floor(Date.now() / 1000) - TWENTY_FOUR_HOURS;

	try {
		const [
			totalUsers,
			totalAvatars,
			totalAssets,
			totalClothes,
			totalPending,
			totalAuthors,
			totalMedia,
			orphanedMedia,
			latestUploads,
			latestRegistrations,
		] = await c.env.DB.batch([
			c.env.DB.prepare('SELECT COUNT(*) as count FROM users'),
			c.env.DB.prepare("SELECT COUNT(*) as count FROM resources WHERE category = 'avatars' AND is_active = 1"),
			c.env.DB.prepare("SELECT COUNT(*) as count FROM resources WHERE category = 'assets' AND is_active = 1"),
			c.env.DB.prepare("SELECT COUNT(*) as count FROM resources WHERE category = 'clothes' AND is_active = 1"),
			c.env.DB.prepare('SELECT COUNT(*) as count FROM resources WHERE is_active = 0'),
			c.env.DB.prepare('SELECT COUNT(*) as count FROM avatar_authors'),
			c.env.DB.prepare('SELECT COUNT(*) as count FROM media'),
			c.env.DB.prepare(
				`SELECT COUNT(*) as count FROM media m
				WHERE m.created_at < ?
				AND m.uuid NOT IN (
					SELECT thumbnail_uuid FROM resources WHERE thumbnail_uuid IS NOT NULL
					UNION SELECT reference_image_uuid FROM resources WHERE reference_image_uuid IS NOT NULL
					UNION SELECT media_uuid FROM resource_n_media
					UNION SELECT cover_image_uuid FROM blog_posts WHERE cover_image_uuid IS NOT NULL
				)
				AND NOT EXISTS (SELECT 1 FROM users WHERE INSTR(users.avatar_url, m.r2_key) > 0)
				AND NOT EXISTS (SELECT 1 FROM comments WHERE INSTR(comments.text, m.r2_key) > 0)
				AND NOT EXISTS (SELECT 1 FROM blog_comments WHERE INSTR(blog_comments.text, m.r2_key) > 0)
				AND NOT EXISTS (SELECT 1 FROM blog_posts WHERE INSTR(blog_posts.content, m.r2_key) > 0)`,
			).bind(cutoffTime),
			c.env.DB.prepare(
				`SELECT r.uuid, r.title, r.category, r.created_at, u.username as author_username
				FROM resources r LEFT JOIN users u ON r.author_uuid = u.uuid
				ORDER BY r.created_at DESC LIMIT 5`,
			),
			c.env.DB.prepare('SELECT uuid, username, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
		]);

		return c.json({
			users: (totalUsers.results[0] as { count: number })?.count ?? 0,
			avatars: (totalAvatars.results[0] as { count: number })?.count ?? 0,
			assets: (totalAssets.results[0] as { count: number })?.count ?? 0,
			clothes: (totalClothes.results[0] as { count: number })?.count ?? 0,
			pending: (totalPending.results[0] as { count: number })?.count ?? 0,
			authors: (totalAuthors.results[0] as { count: number })?.count ?? 0,
			media: (totalMedia.results[0] as { count: number })?.count ?? 0,
			orphaned_media: (orphanedMedia.results[0] as { count: number })?.count ?? 0,
			latest_uploads: latestUploads.results,
			latest_registrations: latestRegistrations.results,
		});
	} catch (e) {
		console.error('Admin stats error:', e);
		return c.json({ error: 'Failed to fetch stats' }, 500);
	}
});

// =========================================================================================================
// GET /api/admin/users?q=&page=
// List users with optional search by username. [admin only]
// =========================================================================================================

admin.get('/users', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const q = c.req.query('q') || '';
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
	const limit = 30;
	const offset = (page - 1) * limit;

	try {
		const whereStr = q ? 'WHERE username LIKE ?' : '';
		const bindings: unknown[] = q ? [`%${q}%`] : [];

		const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM users ${whereStr}`)
			.bind(...bindings)
			.first<{ total: number }>();
		const total = countResult?.total ?? 0;

		const rows = await c.env.DB.prepare(
			`SELECT uuid, username, avatar_url, is_admin, created_at FROM users ${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
		)
			.bind(...bindings, limit, offset)
			.all<{ uuid: string; username: string; avatar_url: string | null; is_admin: number; created_at: number }>();

		return c.json({
			users: rows.results,
			pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 },
		});
	} catch (e) {
		console.error('Admin users error:', e);
		return c.json({ error: 'Failed to fetch users' }, 500);
	}
});

// =========================================================================================================
// GET /api/admin/resources?category=&status=&q=&page=
// List all resources with optional filters. [admin only]
// =========================================================================================================

admin.get('/resources', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const q = c.req.query('q') || '';
	const categoryRaw = c.req.query('category') || '';
	const statusRaw = c.req.query('status') || '';
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
	const limit = 30;
	const offset = (page - 1) * limit;

	const VALID_CATEGORIES = ['avatars', 'assets', 'clothes', 'worlds'];
	const category = VALID_CATEGORIES.includes(categoryRaw) ? categoryRaw : null;
	const status = statusRaw === '0' ? 0 : statusRaw === '1' ? 1 : null;

	const clauses: string[] = [];
	const bindings: unknown[] = [];

	if (q) {
		clauses.push('r.title LIKE ?');
		bindings.push(`%${q}%`);
	}
	if (category) {
		clauses.push('r.category = ?');
		bindings.push(category);
	}
	if (status !== null) {
		clauses.push('r.is_active = ?');
		bindings.push(status);
	}

	const whereStr = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

	try {
		const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM resources r ${whereStr}`)
			.bind(...bindings)
			.first<{ total: number }>();
		const total = countResult?.total ?? 0;

		const rows = await c.env.DB.prepare(
			`SELECT r.uuid, r.title, r.category, r.is_active, r.download_count, r.created_at,
				u.username as author_username, m.r2_key as thumbnail_key
			FROM resources r
			LEFT JOIN users u ON r.author_uuid = u.uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			${whereStr}
			ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
		)
			.bind(...bindings, limit, offset)
			.all<Record<string, unknown>>();

		return c.json({
			resources: rows.results,
			pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 },
		});
	} catch (e) {
		console.error('Admin resources error:', e);
		return c.json({ error: 'Failed to fetch resources' }, 500);
	}
});

// =========================================================================================================
// GET /api/admin/ads
// List all community ads with optional status filter (?status=pending|active|all).
// =========================================================================================================

admin.get('/ads', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const status = c.req.query('status') || 'all';
	const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
	const limit = 30;
	const offset = (page - 1) * limit;

	const clauses: string[] = [];
	const clauseBindings: unknown[] = [];
	if (status === 'pending') {
		clauses.push('ca.is_approved = ? AND ca.is_active = ?');
		clauseBindings.push(0, 0);
	} else if (status === 'active') {
		clauses.push('ca.is_active = ? AND ca.is_approved = ?');
		clauseBindings.push(1, 1);
	}

	const whereStr = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

	try {
		const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM community_ads ca ${whereStr}`)
			.bind(...clauseBindings)
			.first<{ total: number }>();
		const total = countResult?.total ?? 0;

		const rows = await c.env.DB.prepare(
			`SELECT
				ca.uuid,
				ca.title,
				ca.tagline,
				ca.service_type,
				ca.destination_type,
				ca.is_active,
				ca.is_approved,
				ca.rejected_reason,
				ca.display_weight,
				ca.created_at,
				u.username as author_username,
				bm.r2_key as banner_r2_key,
				cm.r2_key as card_r2_key,
				ca.external_url
			FROM community_ads ca
			LEFT JOIN users u ON ca.author_uuid = u.uuid
			LEFT JOIN media bm ON ca.banner_media_uuid = bm.uuid
			LEFT JOIN media cm ON ca.card_media_uuid = cm.uuid
			${whereStr}
			ORDER BY ca.created_at DESC LIMIT ? OFFSET ?`,
		)
			.bind(...clauseBindings, limit, offset)
			.all<Record<string, unknown>>();

		return c.json({
			ads: rows.results,
			pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 },
		});
	} catch (e) {
		console.error('Admin GET /ads error:', e);
		return c.json({ error: 'Failed to fetch ads' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/ads/:uuid/approve
// Approve a pending community ad.
// =========================================================================================================

admin.post('/ads/:uuid/approve', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		const ad = await c.env.DB.prepare('SELECT uuid FROM community_ads WHERE uuid = ?').bind(uuid).first<{ uuid: string }>();
		if (!ad) return c.json({ error: 'Ad not found' }, 404);

		await c.env.DB.prepare(
			'UPDATE community_ads SET is_approved = 1, is_active = 1, rejected_reason = NULL, updated_at = ? WHERE uuid = ?',
		)
			.bind(Math.floor(Date.now() / 1000), uuid)
			.run();

		return c.json({ success: true });
	} catch (e) {
		console.error('Admin approve ad error:', e);
		return c.json({ error: 'Failed to approve ad' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/ads/:uuid/reject
// Reject a community ad with a reason.
// =========================================================================================================

admin.post('/ads/:uuid/reject', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400);
	}

	const { AdRejectSchema } = await import('../validators');
	const parsed = AdRejectSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: 'Validation error', details: parsed.error.issues }, 400);

	try {
		const ad = await c.env.DB.prepare('SELECT uuid FROM community_ads WHERE uuid = ?').bind(uuid).first<{ uuid: string }>();
		if (!ad) return c.json({ error: 'Ad not found' }, 404);

		await c.env.DB.prepare(
			'UPDATE community_ads SET is_approved = 0, is_active = 0, rejected_reason = ?, updated_at = ? WHERE uuid = ?',
		)
			.bind(parsed.data.reason, Math.floor(Date.now() / 1000), uuid)
			.run();

		return c.json({ success: true });
	} catch (e) {
		console.error('Admin reject ad error:', e);
		return c.json({ error: 'Failed to reject ad' }, 500);
	}
});

// =========================================================================================================
// POST /api/admin/ads/:uuid/deactivate
// Deactivate an approved community ad.
// =========================================================================================================

admin.post('/ads/:uuid/deactivate', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');
	try {
		const ad = await c.env.DB.prepare('SELECT uuid FROM community_ads WHERE uuid = ?').bind(uuid).first<{ uuid: string }>();
		if (!ad) return c.json({ error: 'Ad not found' }, 404);

		await c.env.DB.prepare('UPDATE community_ads SET is_active = 0, updated_at = ? WHERE uuid = ?')
			.bind(Math.floor(Date.now() / 1000), uuid)
			.run();

		return c.json({ success: true });
	} catch (e) {
		console.error('Admin deactivate ad error:', e);
		return c.json({ error: 'Failed to deactivate ad' }, 500);
	}
});

// =========================================================================================================
// PUT /api/admin/ads/:uuid/weight
// Update display_weight for an ad.
// =========================================================================================================

admin.put('/ads/:uuid/weight', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const uuid = c.req.param('uuid');

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400);
	}

	const { AdWeightUpdateSchema } = await import('../validators');
	const parsed = AdWeightUpdateSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: 'Validation error', details: parsed.error.issues }, 400);

	try {
		await c.env.DB.prepare('UPDATE community_ads SET display_weight = ?, updated_at = ? WHERE uuid = ?')
			.bind(parsed.data.display_weight, Math.floor(Date.now() / 1000), uuid)
			.run();
		return c.json({ success: true });
	} catch (e) {
		console.error('Admin weight update error:', e);
		return c.json({ error: 'Failed to update weight' }, 500);
	}
});

// =========================================================================================================
// GET /api/admin/ads/slots
// Get all slot configurations.
// =========================================================================================================

admin.get('/ads/slots', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	try {
		const slots = await c.env.DB.prepare('SELECT * FROM ad_slot_config ORDER BY slot_name').all();
		return c.json({ slots: slots.results });
	} catch (e) {
		console.error('Admin GET slots error:', e);
		return c.json({ error: 'Failed to fetch slot config' }, 500);
	}
});

// =========================================================================================================
// PUT /api/admin/ads/slots/:slot_name
// Update a slot configuration.
// =========================================================================================================

admin.put('/ads/slots/:slot_name', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	const slotName = c.req.param('slot_name');
	const VALID_SLOTS = ['sidebar_left', 'featured_artist', 'grid_card', 'detail_banner'];
	if (!VALID_SLOTS.includes(slotName)) return c.json({ error: 'Invalid slot name' }, 400);

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400);
	}

	const { AdSlotConfigUpdateSchema } = await import('../validators');
	const parsed = AdSlotConfigUpdateSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: 'Validation error', details: parsed.error.issues }, 400);

	const data = parsed.data;
	const sets: string[] = ['updated_at = ?'];
	const bindings: unknown[] = [Math.floor(Date.now() / 1000)];

	if (data.max_concurrent !== undefined) { sets.push('max_concurrent = ?'); bindings.push(data.max_concurrent); }
	if (data.rotation_hours !== undefined) { sets.push('rotation_hours = ?'); bindings.push(data.rotation_hours); }
	if (data.is_enabled !== undefined) { sets.push('is_enabled = ?'); bindings.push(data.is_enabled); }

	bindings.push(slotName);

	try {
		await c.env.DB.prepare(`UPDATE ad_slot_config SET ${sets.join(', ')} WHERE slot_name = ?`).bind(...bindings).run();
		return c.json({ success: true });
	} catch (e) {
		console.error('Admin PUT slot error:', e);
		return c.json({ error: 'Failed to update slot config' }, 500);
	}
});

// =========================================================================================================
// GET /api/admin/ads/stats
// Aggregated 7-day stats per ad (impressions, clicks, CTR).
// =========================================================================================================

admin.get('/ads/stats', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);
	if (!user.is_admin) return c.json({ error: 'Forbidden' }, 403);

	// Last 7 days
	const cutoffDate = new Date();
	cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 7);
	const cutoffStr = cutoffDate.toISOString().slice(0, 10);

	try {
		const rows = await c.env.DB.prepare(
			`SELECT
				ca.uuid, ca.title, ca.service_type, ca.is_active,
				COALESCE(SUM(s.impressions), 0) as total_impressions,
				COALESCE(SUM(s.clicks), 0) as total_clicks
			FROM community_ads ca
			LEFT JOIN ad_stats s ON s.ad_uuid = ca.uuid AND s.stat_date >= ?
			GROUP BY ca.uuid
			ORDER BY total_impressions DESC`,
		)
			.bind(cutoffStr)
			.all<{
				uuid: string;
				title: string;
				service_type: string;
				is_active: number;
				total_impressions: number;
				total_clicks: number;
			}>();

		const stats = rows.results.map((r) => ({
			...r,
			ctr: r.total_impressions > 0 ? ((r.total_clicks / r.total_impressions) * 100).toFixed(2) + '%' : '0%',
		}));

		return c.json({ stats });
	} catch (e) {
		console.error('Admin GET ads stats error:', e);
		return c.json({ error: 'Failed to fetch ad stats' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default admin;

