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
        const resources = await c.env.DB.prepare(`
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
        `).all<Resource & { thumbnail_key: string | null; author_username: string | null; author_avatar: string | null }>();

        const mapped = resources.results.map(r => ({
            ...r,
            timestamp: r.created_at * 1000,
            author: r.author_username ? { username: r.author_username, avatar_url: r.author_avatar } : null
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
			 WHERE rm.resource_uuid = ?`
        ).bind(uuid).all<Media>();

        const thumbnail = await c.env.DB.prepare('SELECT m.r2_key FROM media m JOIN resources r ON m.uuid = r.thumbnail_uuid WHERE r.uuid = ?').bind(uuid).first<Media>();

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
        const orphanedMedia = await c.env.DB.prepare(`
			SELECT m.uuid, m.r2_key, m.file_name, m.media_type, m.created_at
			FROM media m
			WHERE m.created_at < ?
			AND m.uuid NOT IN (
				SELECT thumbnail_uuid FROM resources WHERE thumbnail_uuid IS NOT NULL
				UNION
				SELECT reference_image_uuid FROM resources WHERE reference_image_uuid IS NOT NULL
				UNION
				SELECT media_uuid FROM resource_n_media
			)
			AND NOT EXISTS (
				SELECT 1 FROM users WHERE INSTR(users.avatar_url, m.r2_key) > 0
			)
		`).bind(cutoffTime).all<Media>();

        // Estadísticas generales
        const totalMedia = await c.env.DB.prepare('SELECT COUNT(*) as count FROM media').first<{ count: number }>();
        const totalResources = await c.env.DB.prepare('SELECT COUNT(*) as count FROM resources').first<{ count: number }>();

        return c.json({
            orphaned_count: orphanedMedia.results.length,
            orphaned_files: orphanedMedia.results.map(m => ({
                uuid: m.uuid,
                filename: m.file_name,
                type: m.media_type,
                age_hours: Math.floor((Date.now() / 1000 - m.created_at) / 3600)
            })),
            total_media: totalMedia?.count || 0,
            total_resources: totalResources?.count || 0,
            cutoff_hours: 24
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
        const orphanedMedia = await c.env.DB.prepare(`
			SELECT m.uuid, m.r2_key 
			FROM media m
			WHERE m.created_at < ?
			AND m.uuid NOT IN (
				SELECT thumbnail_uuid FROM resources WHERE thumbnail_uuid IS NOT NULL
				UNION
				SELECT reference_image_uuid FROM resources WHERE reference_image_uuid IS NOT NULL
				UNION
				SELECT media_uuid FROM resource_n_media
			)
			AND NOT EXISTS (
				SELECT 1 FROM users WHERE INSTR(users.avatar_url, m.r2_key) > 0
			)
		`).bind(cutoffTime).all<Media>();

        let deletedCount = 0;

        for (const media of orphanedMedia.results) {
            // Eliminar de R2
            await c.env.BUCKET.delete(media.r2_key);

            // Eliminar de DB
            await c.env.DB.prepare('DELETE FROM media WHERE uuid = ?')
                .bind(media.uuid).run();

            deletedCount++;
        }

        return c.json({
            success: true,
            deleted: deletedCount,
            message: `Cleaned up ${deletedCount} orphaned files`
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
// Export
// =========================================================================================================

export default admin;
