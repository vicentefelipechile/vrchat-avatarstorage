// =========================================================================================================
// FAVORITES ROUTES
// =========================================================================================================
// User favorites management
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { AddFavoriteSchema, FavoriteOrderSchema } from '../validators';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const favorites = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/favorites
// Returns all favorites of the authenticated user.
// =========================================================================================================

favorites.get('/', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const page = Math.max(1, parseInt(c.req.query('page') || '1'));
	const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '20')), 60);
	const offset = (page - 1) * limit;

	const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM user_favorites WHERE user_uuid = ?')
		.bind(user.uuid)
		.first<{ total: number }>();

	const total = countResult?.total || 0;

	const { results } = await c.env.DB.prepare(
		`SELECT
			r.uuid,
			r.title,
			r.description,
			r.category,
			r.thumbnail_uuid,
			r.download_count,
			r.created_at,
			r.updated_at,
			m.r2_key AS thumbnail_key,
			m.uuid AS thumbnail_media_uuid,
			u.username AS author_username,
			u.avatar_url AS author_avatar,
			uf.display_order,
			uf.created_at AS favorite_created_at
		FROM user_favorites uf
		JOIN resources r ON uf.resource_uuid = r.uuid
		JOIN image_media m ON r.thumbnail_uuid = m.uuid
		JOIN users u ON r.author_uuid = u.uuid
		WHERE uf.user_uuid = ? AND r.is_active = 1
		ORDER BY uf.display_order DESC, uf.created_at DESC
		LIMIT ? OFFSET ?`,
	)
		.bind(user.uuid, limit, offset)
		.all<any>();

	return c.json({
		favorites: results,
		pagination: {
			page,
			limit,
			total,
			total_pages: Math.ceil(total / limit),
			hasNextPage: offset + limit < total,
			hasPrevPage: page > 1,
		},
	});
});

// =========================================================================================================
// GET /api/favorites/check/:resourceUuid
// Checks if a resource is a favorite of the authenticated user.
// =========================================================================================================

favorites.get('/check/:resourceUuid', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ is_favorite: false });

	const resourceUuid = c.req.param('resourceUuid');

	const favorite = await c.env.DB.prepare('SELECT 1 FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resourceUuid)
		.first<any>();

	return c.json({ is_favorite: !!favorite });
});

// =========================================================================================================
// POST /api/favorites
// Adds a resource to favorites.
// =========================================================================================================

favorites.post('/', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { resource_uuid } = AddFavoriteSchema.parse(body);

	const resource = await c.env.DB.prepare('SELECT uuid, is_active FROM resources WHERE uuid = ?')
		.bind(resource_uuid)
		.first<{ uuid: string; is_active: number }>();
	if (!resource) return c.json({ error: 'Resource not found' }, 404);
	if (resource.is_active !== 1) return c.json({ error: 'Resource is not available' }, 403);

	const existing = await c.env.DB.prepare('SELECT 1 FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resource_uuid)
		.first<any>();

	if (existing) {
		return c.json({ error: 'Already in favorites' }, 400);
	}

	const maxOrderResult = await c.env.DB.prepare('SELECT MAX(display_order) as max_order FROM user_favorites WHERE user_uuid = ?')
		.bind(user.uuid)
		.first<{ max_order: number }>();

	const newOrder = (maxOrderResult?.max_order || 0) + 1;

	await c.env.DB.prepare('INSERT INTO user_favorites (user_uuid, resource_uuid, display_order) VALUES (?, ?, ?)')
		.bind(user.uuid, resource_uuid, newOrder)
		.run();

	return c.json({ success: true, resource_uuid });
});

// =========================================================================================================
// DELETE /api/favorites/:resourceUuid
// Removes a resource from favorites.
// =========================================================================================================

favorites.delete('/:resourceUuid', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const resourceUuid = c.req.param('resourceUuid');

	const result = await c.env.DB.prepare('DELETE FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resourceUuid)
		.run();

	if (!result.success || result.meta.changes === 0) {
		return c.json({ error: 'Favorite not found or could not be deleted' }, 404);
	}

	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/favorites/reorder
// Moves a favorite up (reorder).
// =========================================================================================================

favorites.post('/reorder', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { resource_uuid, move_to_top } = FavoriteOrderSchema.parse(body);

	const favorite = await c.env.DB.prepare('SELECT display_order FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resource_uuid)
		.first<any>();

	if (!favorite) {
		return c.json({ error: 'Favorite not found' }, 404);
	}

	if (move_to_top) {
		const maxOrderResult = await c.env.DB.prepare('SELECT MAX(display_order) as max_order FROM user_favorites WHERE user_uuid = ?')
			.bind(user.uuid)
			.first<{ max_order: number }>();

		const newOrder = (maxOrderResult?.max_order || 0) + 1;

		await c.env.DB.prepare('UPDATE user_favorites SET display_order = ? WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(newOrder, user.uuid, resource_uuid)
			.run();
	}

	return c.json({ success: true });
});

// =========================================================================================================
// GET /api/favorites/ids
// Returns only the UUIDs of the user's favorites (for UI).
// =========================================================================================================

favorites.get('/ids', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ favorites: [] });

	const { results } = await c.env.DB.prepare('SELECT resource_uuid FROM user_favorites WHERE user_uuid = ?')
		.bind(user.uuid)
		.all<{ resource_uuid: string }>();

	return c.json({ favorites: results.map((r) => r.resource_uuid) });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default favorites;
