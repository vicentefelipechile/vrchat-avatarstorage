// =========================================================================================================
// VRCSTORAGE - API
// =========================================================================================================
// Este archivo define las interfaces TypeScript que reflejan la estructura
// de la base de datos definida en schema.sql
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from './auth';
import { Media } from './types';
import { z } from 'zod';
import { securityMiddleware } from './middleware/security';
import { rateLimit } from './middleware/rate-limit';
import resourceRoutes from './routes/resources';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import commentRoutes from './routes/comments';
import uploadRoutes from './routes/uploads';
import downloadRoutes from './routes/downloads';
import utilRoutes from './routes/utils';
import wikiRoutes from './routes/wiki';

// =========================================================================================================
// Variables
// =========================================================================================================

const app = new Hono<{ Bindings: Env }>();

// Security Headers & CORS
securityMiddleware(app);

// =========================================================================================================
// Rate Limiting
// =========================================================================================================

// Auth Rate Limits (Stricter)
app.use('/api/login', rateLimit({ limit: 10, windowSeconds: 60 * 15, keyPrefix: 'auth_login' }));
app.use('/api/register', rateLimit({ limit: 5, windowSeconds: 60 * 60, keyPrefix: 'auth_register' }));
app.use('/api/comments/*', async (c, next) => {
	if (c.req.method === 'POST') {
		return rateLimit({ limit: 10, windowSeconds: 60 * 5, keyPrefix: 'comments_post' })(c, next);
	}
	return rateLimit({ limit: 50, windowSeconds: 60 * 5, keyPrefix: 'comments_get' })(c, next);
});
app.use('/api/wiki/comments', async (c, next) => {
	if (c.req.method === 'POST') {
		return rateLimit({ limit: 5, windowSeconds: 60 * 5, keyPrefix: 'wiki_comments_post' })(c, next);
	}
	return rateLimit({ limit: 100, windowSeconds: 60 * 1, keyPrefix: 'wiki_comments_get' })(c, next);
});

// Global Rate Limit
app.use('*', rateLimit({ limit: 500, windowSeconds: 60 * 5 })); // 100 req / 5 min

// Error Handler for Zod
app.onError((err, c) => {
	if (err instanceof z.ZodError) {
		return c.json({ error: 'Validation error', details: err.issues }, 400);
	}
	console.error(err);
	return c.json({ error: 'Internal Server Error' }, 500);
});


// =========================================================================================================
// Middleware
// =========================================================================================================
// Simple auth check for download links
// Simple auth check for download links
app.use('/download/*', async (c, next) => {
	const user = await getAuthUser(c);
	if (!user) {
		return c.redirect('/login');
	}
	await next();
});


// =========================================================================================================
// Mount Routes
// =========================================================================================================

app.route('/api/resources', resourceRoutes);
app.route('/api', userRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/resources', commentRoutes);
app.route('/api/comments', commentRoutes);
app.route('/api/wiki', wikiRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/download', downloadRoutes);
app.route('/api', utilRoutes);

// SEO route: /item/:uuid (served from resources module, needs to be mounted at root)
app.get('/item/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	if (!uuid) return c.json({ error: 'UUID is required' }, 400);

	try {
		const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE uuid = ?').bind(uuid).first();

		if (resource && resource.is_active) {
			// Get thumbnail
			const thumbnail = await c.env.DB.prepare('SELECT * FROM media WHERE uuid = ?').bind(resource.thumbnail_uuid).first();

			// Fetch original index.html
			const indexResponse = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
			let html = await indexResponse.text();

			// Replace Meta Tags
			const title = resource.title;
			const description = resource.description || 'VRCStorage & Asset Storage';
			const imageUrl = thumbnail ? `${new URL(c.req.url).origin}/api/download/${thumbnail.r2_key}` : `${new URL(c.req.url).origin}/favicon.svg`;
			const url = `${new URL(c.req.url).origin}/item/${uuid}`;

			// Simple replacements
			html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
			html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
			html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
			html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${imageUrl}">`);
			html = html.replace(/<title>[^<]*<\/title>/, `<title>${title} - VRCStorage</title>`);

			return c.html(html);
		}
	} catch (e) {
		console.error('Error injecting OG tags:', e);
	}

	// Fallback to normal serving if not found or error
	return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
});

// =========================================================================================================
// Serve Static Files (SPA Fallback)
// =========================================================================================================


app.get('/*', async (c) => {
	const asset = await c.env.ASSETS.fetch(c.req.raw);
	if (asset.status === 404) {
		return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
	}
	return asset;
});

// =========================================================================================================
// Scheduled Tasks (Cron Jobs)
// =========================================================================================================

/**
 * Scheduled task: Daily cleanup of orphaned media files
 * Runs every day at 3 AM UTC
 */
async function cleanupOrphanedMedia(env: Env) {
	const TWENTY_FOUR_HOURS = 24 * 60 * 60;
	const cutoffTime = Math.floor(Date.now() / 1000) - TWENTY_FOUR_HOURS;

	try {
		const orphanedMedia = await env.DB.prepare(`
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
		`).bind(cutoffTime).all<Media>();

		let deletedCount = 0;

		for (const media of orphanedMedia.results) {
			await env.BUCKET.delete(media.r2_key);
			await env.DB.prepare('DELETE FROM media WHERE uuid = ?')
				.bind(media.uuid).run();
			deletedCount++;
		}

		console.log(`[CRON] Cleanup completed: ${deletedCount} orphaned files deleted`);
		return deletedCount;
	} catch (e) {
		console.error('[CRON] Cleanup error:', e);
		return 0;
	}
}

export default {
	fetch: app.fetch,
	scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
		console.log('[CRON] Running scheduled cleanup task');
		ctx.waitUntil(cleanupOrphanedMedia(env));
	}
};
