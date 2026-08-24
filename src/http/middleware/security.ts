import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { csrf } from 'hono/csrf';

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
				// cdn.vrcstorage.lat is https (prod) → covered by https:. Local dev CDN is http://localhost:8788 / 127.0.0.1:8788 → needs explicit http allow
				imgSrc: ["'self'", 'https:', 'data:', 'blob:', 'http://localhost:8788', 'http://127.0.0.1:8788', 'http://localhost:*', 'http://127.0.0.1:*'],
				mediaSrc: ["'self'", 'https:', 'data:', 'blob:', 'http://localhost:8788', 'http://127.0.0.1:8788', 'http://localhost:*', 'http://127.0.0.1:*'],
				objectSrc: ["'none'"],
			},
		}),
	);

	const origins = [
		'https://testing-vrchat-avatarstorage.vicentefelipechile.workers.dev',
		'https://vrchat-avatarstorage.vicentefelipechile.workers.dev',
		'https://vrcstorage.lat',
	];

	app.use(
		'*',
		cors({
			origin: origins,
			allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowHeaders: ['Content-Type', 'Authorization'],
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
