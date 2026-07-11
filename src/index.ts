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
import collectionsRoutes from './http/routes/collections';
import llmsRoute from './http/routes/llms';

// =========================================================================================================
// App
// =========================================================================================================

const app = new Hono<{ Bindings: Env }>();

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

// LLMs.txt — AI scraper context file (llmstxt.org spec)
app.route('/llms.txt', llmsRoute);

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
// Re-exported so the runtime can instantiate the class named in wrangler.jsonc's durable_objects
// binding. FeedRoom is the transport for real-time feed events (see src/durable-objects/feed-room.ts).
// =========================================================================================================

export { FeedRoom };

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
