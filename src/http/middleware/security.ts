// =========================================================================================================
// SECURITY MIDDLEWARE
// Security headers, exact CORS origins and development-only local media sources.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { cors } from 'hono/cors';
import { secureHeaders, type ContentSecurityPolicyOptionHandler } from 'hono/secure-headers';
import { csrf } from 'hono/csrf';

// =========================================================================================================
// Helpers
// =========================================================================================================

const mediaSources: ContentSecurityPolicyOptionHandler = (c) => {
	const sources = ["'self'", 'https:', 'data:', 'blob:'];
	const hostname = new URL(c.req.url).hostname;
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		sources.push('http://localhost:8788', 'http://127.0.0.1:8788', 'http://localhost:*', 'http://127.0.0.1:*');
	}
	return sources.join(' ');
};

// =========================================================================================================
// Registration
// =========================================================================================================

export const securityMiddleware = (app: any) => {
	// M-1: Permissive CSP — blocks the most dangerous vectors (unknown-origin scripts, plugin embeds)
	// while preserving inline styles, Cloudflare Turnstile, and standard CDN integrations.
	// `blob:` is required on img/media: local file previews (UploadView, SettingsView, EditResourceView)
	// use URL.createObjectURL() before anything is uploaded to the server.
	app.use(
		'*',
		secureHeaders({
			contentSecurityPolicy: {
				defaultSrc: ["'self'", 'https:', 'data:', "'unsafe-inline'"],
				scriptSrc: ["'self'", 'https://challenges.cloudflare.com', "'unsafe-inline'", "'unsafe-eval'"],
				imgSrc: [mediaSources],
				mediaSrc: [mediaSources],
				objectSrc: ["'none'"],
			},
		}),
	);

	const origins = ['https://testing-vrchat-avatarstorage.vicentefelipechile.workers.dev', 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev', 'https://vrcstorage.lat', 'https://vrcstorage.pages.dev'];

	app.use(
		'*',
		cors({
			origin: origins,
			allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowHeaders: ['Content-Type', 'Authorization', 'X-Upload-ID', 'X-Key', 'X-Part-Number'],
			exposeHeaders: ['Content-Length'],
			maxAge: 600,
			credentials: true,
		}),
	);

	app.use(
		'*',
		csrf({
			origin: origins,
		}),
	);
};
