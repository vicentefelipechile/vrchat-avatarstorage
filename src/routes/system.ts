// =========================================================================================================
// SYSTEM ROUTES
// =========================================================================================================
// Public system/configuration endpoints.
// Mounted at /api in index.ts → /api/config, /api/version
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const system = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/config
// Returns public site configuration (Turnstile site key, etc.).
// =========================================================================================================

system.get('/config', (c) => {
	return c.json({
		turnstileSiteKey: (c.env.TURNSTILE_SITE_KEY || '').trim(),
	});
});

// =========================================================================================================
// GET /api/version
// Returns worker version metadata for debugging and monitoring.
// =========================================================================================================

system.get('/version', async (c) => {
	const meta = c.env.CF_VERSION_METADATA;

	// CF supplies timestamp as an ISO 8601 string, e.g. "2026-04-01T17:59:41.286Z".
	// Never parseInt() an ISO string — it only pulls the year.
	const deployedAt = meta.timestamp ? new Date(meta.timestamp).toISOString() : 'unknown';
	const deployedAtTimestamp = meta.timestamp ? new Date(meta.timestamp).getTime() : 0;
	const commitHash = meta.id ? meta.id.substring(0, 7) : 'unknown';

	// CF-Ray / CF-IPCountry are set by Cloudflare on every inbound request.
	const cfRay = c.req.header('CF-Ray') ?? null;
	const cfCountry = c.req.header('CF-IPCountry') ?? null;
	const cfRequestId = c.req.header('CF-Request-Id') ?? null;

	return c.json({
		worker: {
			versionId: meta.id || 'unknown',
			versionTag: meta.tag || null,
			commitHash,
			deployedAt,
			deployedAtTimestamp,
			compatibilityDate: '2026-02-12',
		},
		runtime: {
			name: 'Cloudflare Workers',
			engine: 'V8 isolate',
		},
		request: {
			rayId: cfRay,
			requestId: cfRequestId,
			country: cfCountry,
			colo: cfRay ? cfRay.split('-')[1] : null,
		},
	});
});

// =========================================================================================================
// Export
// =========================================================================================================

export default system;
