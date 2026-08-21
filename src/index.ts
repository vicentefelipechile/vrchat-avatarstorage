// =========================================================================================================
// VRCSTORAGE - API
// =========================================================================================================
// Composition root for the main Worker: builds the Hono app, applies middleware + rate limits, mounts
// the /api routers, registers the crawler-facing SEO routes, serves the SPA, and exports the Worker
// entrypoints. All logic lives in the http/service/repository layers — this file only wires them.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { UploadQueueMessage } from './types';
import { Hono } from 'hono';
import { z } from 'zod';

import { securityMiddleware } from './http/middleware/security';
import { registerRateLimits } from './http/rate-limits';
import { registerSeoRoutes } from './http/seo';
import { DomainError } from './domain/errors';
import { handleQueue } from './http/queue';
import { handleScheduled } from './http/scheduled';
import { FeedRoom } from './durable-objects/feed-room';
import { ChatRoom } from './durable-objects/chat-room';

import resourceRoutes from './http/routes/resources';
import userRoutes from './http/routes/users';
import adminRoutes from './http/routes/admin';
import commentRoutes from './http/routes/comments';
import mediaRoutes from './http/routes/media';
import uploadRoutes from './http/routes/uploads';
import downloadRoutes from './http/routes/downloads';
import systemRoutes from './http/routes/system';
import wikiRoutes from './http/routes/wiki';
import favoritesRoutes from './http/routes/favorites';
import twoFactorRoutes from './http/routes/two-factor';
import oauthRoutes from './http/routes/oauth';
import blogRoutes from './http/routes/blog';
import avatarsRoutes from './http/routes/avatars';
import assetsRoutes from './http/routes/assets';
import clothesRoutes from './http/routes/clothes';
import authorsRoutes from './http/routes/authors';
import updatesRoutes from './http/routes/updates';
import feedRoutes from './http/routes/feed';
import chatRoutes from './http/routes/chat';
import collectionsRoutes from './http/routes/collections';
import notificationsRoutes from './http/routes/notifications';
import { apiDocs } from './http/routes/docs';

// =========================================================================================================
// App
// =========================================================================================================

const app = new Hono<{ Bindings: Env }>();

// Permissive CORS for public docs — must run BEFORE the restrictive CORS in
// securityMiddleware so OPTIONS preflight is answered with * before the whitelist
// short-circuits. For actual GETs it runs outermost → after next() it overwrites
// the restrictive header with *.
app.use('*', async (c, next) => {
	const path = c.req.path;
	const isPermissive =
		path === '/llms.txt' ||
		path === '/llms-full.txt' ||
		path === '/api/docs' ||
		path === '/api-docs.json' ||
		path.startsWith('/api/docs/');
	if (!isPermissive) {
		await next();
		return;
	}
	if (c.req.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Allow-Headers': '*',
				'Access-Control-Max-Age': '86400',
				'Access-Control-Expose-Headers': '*',
				Vary: 'Origin',
			},
		});
	}
	await next();
	c.header('Access-Control-Allow-Origin', '*');
	c.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
	c.header('Access-Control-Allow-Headers', '*');
	c.header('Access-Control-Expose-Headers', '*');
	c.header('Vary', 'Origin');
});

// Security Headers & CORS
securityMiddleware(app);

// Rate Limiting (Cloudflare native Rate Limiting bindings) — see src/http/rate-limits.ts
registerRateLimits(app);

// Central Error Handler
app.onError((err, c) => {
	// Typed domain errors thrown by the service layer map to their HTTP status.
	if (err instanceof DomainError) {
		return c.json(err.details === undefined ? { error: err.message } : { error: err.message, details: err.details }, err.status as 400);
	}
	if (err instanceof z.ZodError) {
		return c.json({ error: 'Validation error', details: err.issues }, 400);
	}
	// Log the message and stack (not the bare Error object, which tail renders as just "Error").
	console.error('Unhandled error:', err instanceof Error ? err.stack ?? err.message : String(err));
	return c.json({ error: 'Internal Server Error' }, 500);
});

// =========================================================================================================
// Mount Routes
// =========================================================================================================

app.route('/api/auth', userRoutes);
app.route('/api/auth', oauthRoutes);
app.route('/api/2fa', twoFactorRoutes);
app.route('/api/resources', resourceRoutes);
app.route('/api/comments', commentRoutes);
app.route('/api/blog', blogRoutes);
app.route('/api/wiki', wikiRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/download', downloadRoutes);
app.route('/api/favorites', favoritesRoutes);
app.route('/api/collections', collectionsRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', systemRoutes);
app.route('/api/avatars', avatarsRoutes);
app.route('/api/assets', assetsRoutes);
app.route('/api/clothes', clothesRoutes);
app.route('/api/authors', authorsRoutes);
app.route('/api/updates', updatesRoutes);
app.route('/api/feed', feedRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/notifications', notificationsRoutes);

// API docs — machine-readable JSON manifest at /api/docs (?tag=avatars to filter).
// The markdown artefacts /llms.txt and /llms-full.txt are static files in public/
// (see src/tools/generate-llms.mjs, `npm run docs:build`). They are served directly
// from ASSETS via the catch-all below — no Worker route, no per-request CPU.
app.route('/api/docs', apiDocs);

// SEO / SSR — crawler-facing routes with injected OG meta tags (see src/http/seo.ts).
// Registered after the /api routers and before the static SPA fallback so they take precedence.
registerSeoRoutes(app);

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
// Durable Objects
// =========================================================================================================
// Re-exported so the runtime can instantiate the classes named in wrangler.jsonc's durable_objects
// bindings. FeedRoom is the transport for real-time feed events (see src/durable-objects/feed-room.ts);
// ChatRoom is the global chat (see src/durable-objects/chat-room.ts).
// =========================================================================================================

export { FeedRoom, ChatRoom };

// =========================================================================================================
// Worker Entrypoints
// =========================================================================================================
// `fetch` is the Hono app. `scheduled` (daily orphan cleanup) and `queue` (upload post-processing /
// image variants) are thin handlers in src/http/; their logic lives in the service + repository
// layers. See src/http/scheduled.ts and src/http/queue.ts.
// =========================================================================================================

export default {
	fetch: app.fetch,
	scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
		ctx.waitUntil(handleScheduled(event, env));
	},
	queue: async (batch: MessageBatch<UploadQueueMessage>, env: Env, _ctx: ExecutionContext) => {
		await handleQueue(batch, env);
	},
};
