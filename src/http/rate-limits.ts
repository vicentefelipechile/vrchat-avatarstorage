// =========================================================================================================
// RATE LIMITING — Cloudflare native Rate Limiting bindings
// =========================================================================================================
// All rate-limit wiring for the main Worker. Limits and periods are configured in wrangler.jsonc:
//   RL_STRICT  → 1 req / 60s   (auth / write endpoints)
//   RL_LOGIN   → login-specific (see wrangler.jsonc)
//   RL_MEDIUM  → 100 req / 60s (per-route sensitive endpoints)
//   RL_GLOBAL  → 500 req / 60s (catch-all)
// registerRateLimits(app) applies them in order; the global catch-all is intentionally registered
// before the per-route medium overrides so the more specific keyPrefix wins for those paths.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { Hono } from 'hono';
import { rateLimit } from './middleware/rate-limit';

// =========================================================================================================
// Registration
// =========================================================================================================

/** Wires every rate-limit rule onto the app. Call once, before mounting the routers. */
export function registerRateLimits(app: Hono<{ Bindings: Env }>): void {
	// Auth — strict (1 req / 60s per IP)
	app.use('/api/auth/register', async (c, next) => rateLimit({ binding: c.env.RL_STRICT, keyPrefix: 'register' })(c, next));
	app.use('/api/auth/login', async (c, next) => rateLimit({ binding: c.env.RL_LOGIN, keyPrefix: 'login' })(c, next));
	app.use('/api/auth/login/2fa', async (c, next) => rateLimit({ binding: c.env.RL_LOGIN, keyPrefix: 'login_2fa' })(c, next));

	// Comments — differentiate POST (strict) from GET (medium)
	app.use('/api/comments/*', async (c, next) => {
		if (c.req.method === 'POST') {
			return rateLimit({ binding: c.env.RL_STRICT, keyPrefix: 'comments_post' })(c, next);
		}
		return rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'comments_get' })(c, next);
	});
	app.use('/api/wiki/comments', async (c, next) => {
		if (c.req.method === 'POST') {
			return rateLimit({ binding: c.env.RL_STRICT, keyPrefix: 'wiki_comments_post' })(c, next);
		}
		return rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'wiki_comments_get' })(c, next);
	});
	app.use('/api/blog/:uuid/comments', async (c, next) => {
		if (c.req.method === 'POST') {
			return rateLimit({ binding: c.env.RL_STRICT, keyPrefix: 'blog_comments_post' })(c, next);
		}
		return rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'blog_comments_get' })(c, next);
	});

	// Global catch-all (500 req / 60s)
	app.use('*', async (c, next) => rateLimit({ binding: c.env.RL_GLOBAL })(c, next));

	// Sensitive endpoint overrides — medium binding, route-specific key prefix
	app.use('/api/upload/*', async (c, next) => rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'upload' })(c, next));
	app.use('/api/auth/me', async (c, next) => rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'user_update' })(c, next));
	app.use('/api/admin/*', async (c, next) => rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'admin' })(c, next));
	app.use('/api/favorites/*', async (c, next) => rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'favorites' })(c, next));
	app.use('/api/2fa/*', async (c, next) => rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: '2fa' })(c, next));

	// OAuth — medium rate limit (100/min). Callbacks are one-shot, not brute-forceable.
	app.use('/api/auth/*', async (c, next) => rateLimit({ binding: c.env.RL_MEDIUM, keyPrefix: 'oauth' })(c, next));

	// OAuth registration completion — strict rate limit to prevent username enumeration
	app.use('/api/auth/complete', async (c, next) => rateLimit({ binding: c.env.RL_STRICT, keyPrefix: 'oauth_complete' })(c, next));
}
