// =========================================================================================================
// FAVORITES ROUTES
// =========================================================================================================
// User favorites management
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { AddFavoriteSchema, FavoriteOrderSchema } from '../validators';

const favorites = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: GET /api/favorites
 * Obtiene la lista de favoritos del usuario autenticado.
 */
favorites.get('/', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const page = parseInt(c.req.query('page') || '1');
	const limit = parseInt(c.req.query('limit') || '20');
	const offset = (page - 1) * limit;

	const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM user_favorites WHERE user_uuid = ?')
		.bind(user.uuid)
		.first<any>();

	const total = countResult?.total || 0;

	const { results } = await c.env.DB.prepare(
		`SELECT 
            uf.display_order,
            uf.created_at as favorite_created_at,
            r.uuid as resource_uuid,
            r.title,
            r.description,
            r.category,
            r.download_count,
            r.created_at,
            r.updated_at,
            m.r2_key as thumbnail_key,
            u.username as author_username,
            u.avatar_url as author_avatar
         FROM user_favorites uf
         JOIN resources r ON uf.resource_uuid = r.uuid
         JOIN media m ON r.thumbnail_uuid = m.uuid
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
		},
	});
});

/**
 * Endpoint: GET /api/favorites/check/:resourceUuid
 * Verifica si un recurso es favorito del usuario.
 */
favorites.get('/check/:resourceUuid', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ is_favorite: false });

	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ is_favorite: false });

	const resourceUuid = c.req.param('resourceUuid');

	const favorite = await c.env.DB.prepare('SELECT 1 FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resourceUuid)
		.first<any>();

	return c.json({ is_favorite: !!favorite });
});

/**
 * Endpoint: POST /api/favorites
 * Añade un recurso a favoritos.
 */
favorites.post('/', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const body = await c.req.json();
	const { resource_uuid } = AddFavoriteSchema.parse(body);

	const resource = await c.env.DB.prepare('SELECT uuid, is_active FROM resources WHERE uuid = ?').bind(resource_uuid).first<any>();
	if (!resource) return c.json({ error: 'Resource not found' }, 404);

	const existing = await c.env.DB.prepare('SELECT 1 FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resource_uuid)
		.first<any>();

	if (existing) {
		return c.json({ error: 'Already in favorites' }, 400);
	}

	const maxOrderResult = await c.env.DB.prepare('SELECT MAX(display_order) as max_order FROM user_favorites WHERE user_uuid = ?')
		.bind(user.uuid)
		.first<any>();

	const newOrder = (maxOrderResult?.max_order || 0) + 1;

	await c.env.DB.prepare('INSERT INTO user_favorites (user_uuid, resource_uuid, display_order) VALUES (?, ?, ?)')
		.bind(user.uuid, resource_uuid, newOrder)
		.run();

	return c.json({ success: true, resource_uuid });
});

/**
 * Endpoint: DELETE /api/favorites/:resourceUuid
 * Elimina un recurso de favoritos.
 */
favorites.delete('/:resourceUuid', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const resourceUuid = c.req.param('resourceUuid');

	const result = await c.env.DB.prepare('DELETE FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resourceUuid)
		.run();

	if (result.success && result.meta.changes === 0) {
		return c.json({ error: 'Favorite not found' }, 404);
	}

	return c.json({ success: true });
});

/**
 * Endpoint: POST /api/favorites/reorder
 * Mueve un favorito arriba (reordenar).
 */
favorites.post('/reorder', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	const body = await c.req.json();
	console.log('Reorder body:', body);

	const { resource_uuid, move_to_top } = FavoriteOrderSchema.parse(body);
	console.log('Parsed:', { resource_uuid, move_to_top });

	const favorite = await c.env.DB.prepare('SELECT display_order FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?')
		.bind(user.uuid, resource_uuid)
		.first<any>();

	if (!favorite) {
		return c.json({ error: 'Favorite not found' }, 404);
	}

	if (move_to_top) {
		const maxOrderResult = await c.env.DB.prepare('SELECT MAX(display_order) as max_order FROM user_favorites WHERE user_uuid = ?')
			.bind(user.uuid)
			.first<any>();

		const newOrder = (maxOrderResult?.max_order || 0) + 1;
		console.log('New order:', newOrder);

		await c.env.DB.prepare('UPDATE user_favorites SET display_order = ? WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(newOrder, user.uuid, resource_uuid)
			.run();
	}

	return c.json({ success: true });
});

/**
 * Endpoint: GET /api/favorites/ids
 * Obtiene solo los UUIDs de favoritos del usuario (para UI).
 */
favorites.get('/ids', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ favorites: [] });

	const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
	if (!user) return c.json({ favorites: [] });

	const { results } = await c.env.DB.prepare('SELECT resource_uuid FROM user_favorites WHERE user_uuid = ?').bind(user.uuid).all<any>();

	return c.json({ favorites: results.map((r: any) => r.resource_uuid) });
});

export default favorites;
