// =========================================================================================================
// VRCSTORAGE - API
// =========================================================================================================
// Este archivo define las interfaces TypeScript que reflejan la estructura
// de la base de datos definida en schema.sql
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import {
	Media,
	Resource,
	UploadQueueMessage,
	MediaResolution,
	MediaFormat
} from './types';
import { Hono } from 'hono';
import { z } from 'zod';

import { securityMiddleware } from './http/middleware/security';
import { rateLimit } from './http/middleware/rate-limit';
import { DomainError } from './domain/errors';

import resourceRoutes from './http/routes/resources';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import commentRoutes from './http/routes/comments';
import uploadRoutes from './routes/uploads';
import downloadRoutes from './http/routes/downloads';
import systemRoutes from './http/routes/system';
import wikiRoutes from './routes/wiki';
import favoritesRoutes from './http/routes/favorites';
import twoFactorRoutes from './routes/2fa';
import oauthRoutes from './routes/oauth';
import blogRoutes from './routes/blog';
import avatarsRoutes from './http/routes/avatars';
import assetsRoutes from './http/routes/assets';
import clothesRoutes from './http/routes/clothes';
import authorsRoutes from './http/routes/authors';
import llmsRoute from './routes/llms';

// =========================================================================================================
// Variables
// =========================================================================================================

const app = new Hono<{ Bindings: Env }>();

/**
 * Escapes HTML special characters to prevent injection when replacing meta tags.
 */
function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Public media (og:image) is served by the dedicated CDN worker, indexed by media uuid.
 * Mirrors the frontend `mediaUrl()` helper (src/frontend/utils.ts).
 */
const CDN_BASE = 'https://cdn.vrcstorage.lat';
function cdnMediaUrl(uuid: string, res: 'low' | 'med' | 'original' = 'med', format: 'webp' | 'png' = 'webp'): string {
	return `${CDN_BASE}/${uuid}?res=${res}&format=${format}`;
}

// Security Headers & CORS
securityMiddleware(app);

// =========================================================================================================
// Rate Limiting (Cloudflare native Rate Limiting binding)
// Limits and periods are configured in wrangler.jsonc:
//   RL_STRICT  → 1 req / 60s   (auth endpoints)
//   RL_MEDIUM  → 100 req / 60s (per-route sensitive endpoints)
//   RL_GLOBAL  → 500 req / 60s (catch-all)
// =========================================================================================================

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

// Central Error Handler
app.onError((err, c) => {
	// Typed domain errors thrown by the service layer map to their HTTP status.
	if (err instanceof DomainError) {
		return c.json(err.details === undefined ? { error: err.message } : { error: err.message, details: err.details }, err.status as 400);
	}
	if (err instanceof z.ZodError) {
		return c.json({ error: 'Validation error', details: err.issues }, 400);
	}
	console.error(err);
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
app.route('/api/download', downloadRoutes);
app.route('/api/favorites', favoritesRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', systemRoutes);
app.route('/api/avatars', avatarsRoutes);
app.route('/api/assets', assetsRoutes);
app.route('/api/clothes', clothesRoutes);
app.route('/api/authors', authorsRoutes);

// =========================================================================================================
// LLMs.txt — AI scraper context file (llmstxt.org spec)
// =========================================================================================================

app.route('/llms.txt', llmsRoute);

// =========================================================================================================
// SEO routes
// =========================================================================================================

function injectSEO(html: string, opts: { title: string; description: string; url: string; imageUrl: string }): string {
	let res = html;
	res = res.replace(/<title>[^<]*<\/title>/i, `<title>${opts.title}</title>`);

	// Remove the specific markdown block if it exists
	const cleanDescription = opts.description
		.replace(
			/\s*---\s*### Avatar Details\s*\* Platform:.*\s*\* SDK:.*\s*\* Version:.*\s*\* Contains \.blend:.*\s*\* Uses Poiyomi:.*\s*\* Uses VRCFury:.*/gi,
			'',
		)
		.trim();

	const tags = [
		{ type: 'name', key: 'description', val: cleanDescription },
		{ type: 'property', key: 'og:title', val: opts.title },
		{ type: 'property', key: 'og:description', val: cleanDescription },
		{ type: 'property', key: 'og:url', val: opts.url },
		{ type: 'property', key: 'og:image', val: opts.imageUrl },
		{ type: 'name', key: 'twitter:title', val: opts.title },
		{ type: 'name', key: 'twitter:description', val: cleanDescription },
		{ type: 'name', key: 'twitter:url', val: opts.url },
		{ type: 'name', key: 'twitter:image', val: opts.imageUrl },
	];

	for (const tag of tags) {
		const regex = new RegExp(`<meta\\s+${tag.type}="${tag.key}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
		if (regex.test(res)) {
			res = res.replace(regex, `<meta ${tag.type}="${tag.key}" content="${tag.val}" />`);
		} else {
			res = res.replace('</head>', `\t<meta ${tag.type}="${tag.key}" content="${tag.val}" />\n</head>`);
		}
	}
	return res;
}

app.get('/wiki', async (c) => {
	try {
		const topic = c.req.query('topic');
		const lang = c.req.query('lang') || 'es';

		// Validate lang against the supported locales only
		const VALID_LANGS = ['es', 'en', 'pt', 'fr', 'jp', 'ru', 'cn'];
		if (!VALID_LANGS.includes(lang)) {
			return c.json({ error: 'Invalid language' }, 400);
		}

		// Validate topic: only lowercase alphanumeric, hyphens, and underscores allowed
		if (topic && !/^[a-z0-9_-]{1,100}$/.test(topic)) {
			return c.json({ error: 'Invalid topic' }, 400);
		}

		// Fetch original index.html
		const indexResponse = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
		let html = await indexResponse.text();

		let title = 'VRCStorage - Wiki';
		let description = 'VRCStorage & Asset Storage - Guides and technical documentation.';
		const imageUrl = `${new URL(c.req.url).origin}/wiki.png`;
		const url = c.req.url;

		if (topic) {
			// Try to fetch the MD file to extract title
			const mdRes = await c.env.ASSETS.fetch(new URL(`/wiki/${lang}/${topic}.md`, c.req.url));
			if (mdRes.ok) {
				const text = await mdRes.text();
				const match = text.match(/^#\s+(.*)/m);
				if (match) {
					title = `${match[1]} - ${title}`;
					description = `VRCStorage Wiki Documentation: ${match[1]}`;
				} else {
					title = `${topic} - ${title}`;
					description = `VRCStorage Technical Guide: ${topic}`;
				}
			} else {
				title = `${topic} - ${title}`;
				description = `VRCStorage Technical Guide: ${topic}`;
			}
		}

		html = injectSEO(html, {
			title: escapeHtml(title),
			description: escapeHtml(description),
			url,
			imageUrl,
		});

		return c.html(html);
	} catch (e) {
		console.error('Error injecting Wiki OG tags:', e);
		return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
	}
});

// SEO route: /blog/:slug (served as SPA but with injected OG meta tags)
app.get('/blog/:slug', async (c) => {
	const slug = c.req.param('slug');
	if (slug === 'create') {
		// Don't try to SEO-inject the create page, serve as SPA
		return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
	}

	try {
		const post = await c.env.DB.prepare(
			`SELECT bp.uuid, bp.title, bp.excerpt, bp.cover_image_uuid
			FROM blog_posts bp
			WHERE bp.uuid = ?`,
		)
			.bind(slug)
			.first<{ uuid: string; title: string; excerpt: string | null; cover_image_uuid: string | null }>();

		if (post) {
			const indexResponse = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
			let html = await indexResponse.text();
			const urlOrigin = new URL(c.req.url).origin;

			const postTitle = escapeHtml(`${post.title} - VRCStorage Blog`);
			const postDesc = escapeHtml(post.excerpt || 'Read this article on the VRCStorage Blog.');
			const imageUrl = post.cover_image_uuid ? cdnMediaUrl(post.cover_image_uuid) : `${urlOrigin}/favicon.svg`;
			const postUrl = `${urlOrigin}/blog/${post.uuid}`;

			html = injectSEO(html, { title: postTitle, description: postDesc, url: postUrl, imageUrl });
			return c.html(html);
		}
	} catch (e) {
		console.error('Error injecting Blog OG tags:', e);
	}

	// Fallback: serve SPA shell
	return c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
});

// SEO route: /item/:uuid (served from resources module, needs to be mounted at root)
app.get('/item/:uuid', async (c) => {
	const uuid = c.req.param('uuid');
	if (!uuid) return c.json({ error: 'UUID is required' }, 400);

	try {
		const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE uuid = ?').bind(uuid).first<Resource>();

		if (resource && resource.is_active) {
			// Fetch original index.html
			const indexResponse = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
			let html = await indexResponse.text();
			const urlOrigin = new URL(c.req.url).origin;

			// Meta values — thumbnail served by the CDN, indexed by media uuid.
			const title = escapeHtml(resource.title);
			const description = escapeHtml(resource.description || 'VRCStorage & Asset Storage');
			const imageUrl = resource.thumbnail_uuid ? cdnMediaUrl(resource.thumbnail_uuid) : `${urlOrigin}/favicon.svg`;
			const url = `${urlOrigin}/item/${uuid}`;

			html = injectSEO(html, { title, description, url, imageUrl });

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
// Queue Processing — Image Variant Generation
// =========================================================================================================

const MEDIA_VARIANTS: Array<{ res: MediaResolution; format: MediaFormat; maxWidth?: number; quality: number }> = [
	{ res: 'low', format: 'webp', maxWidth: 400, quality: 75 },
	{ res: 'low', format: 'png', maxWidth: 400, quality: 75 },
	{ res: 'med', format: 'webp', maxWidth: 800, quality: 85 },
	{ res: 'med', format: 'png', maxWidth: 800, quality: 85 },
	{ res: 'original', format: 'webp', quality: 90 },
	{ res: 'original', format: 'png', quality: 90 },
];

async function processImageVariants(env: Env, media_uuid: string, r2_key: string): Promise<void> {
	const originalObj = await env.BUCKET.get(r2_key);
	if (!originalObj) throw new Error(`Original not found in BUCKET: ${r2_key}`);

	const originalBytes = new Uint8Array(await originalObj.arrayBuffer());
	const toStream = (): ReadableStream<Uint8Array> =>
		new ReadableStream({ start(c) { c.enqueue(originalBytes); c.close(); } });
	const statements: D1PreparedStatement[] = [];

	for (const v of MEDIA_VARIANTS) {
		const transformInput = env.IMAGES.input(toStream());
		const withTransform = v.maxWidth ? transformInput.transform({ width: v.maxWidth, fit: 'scale-down' }) : transformInput;
		const result = await withTransform.output({ format: `image/${v.format}` as `image/${MediaFormat}`, quality: v.quality });

		const variantKey = `${media_uuid}/${v.res}.${v.format}`;
		const variantBuffer = await result.response().arrayBuffer();

		await env.MEDIA_BUCKET.put(variantKey, variantBuffer, {
			httpMetadata: { contentType: `image/${v.format}` },
		});

		statements.push(
			env.DB.prepare(
				`INSERT OR REPLACE INTO media_variants (media_uuid, res, format, r2_key, file_size) VALUES (?, ?, ?, ?, ?)`,
			).bind(media_uuid, v.res, v.format, variantKey, variantBuffer.byteLength),
		);
	}

	const placeholderResult = await env.IMAGES.input(toStream())
		.transform({ width: 8, height: 8, fit: 'cover' })
		.output({ format: 'image/webp', quality: 10 });

	const placeholderBuffer = await placeholderResult.response().arrayBuffer();
	const placeholderBase64 = btoa(String.fromCharCode(...new Uint8Array(placeholderBuffer)));

	statements.push(
		env.DB.prepare('UPDATE media SET placeholder_blur = ? WHERE uuid = ?').bind(
			`data:image/webp;base64,${placeholderBase64}`,
			media_uuid,
		),
	);

	await env.DB.batch(statements);
}

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
		const orphanedMedia = await env.DB.prepare(
			`
			SELECT m.uuid, m.r2_key 
			FROM media m
			WHERE m.created_at < ?
			AND m.uuid NOT IN (
				SELECT thumbnail_uuid FROM resources WHERE thumbnail_uuid IS NOT NULL
				UNION
				SELECT reference_image_uuid FROM resources WHERE reference_image_uuid IS NOT NULL
				UNION
				SELECT media_uuid FROM resource_n_media
				UNION
				SELECT cover_image_uuid FROM blog_posts WHERE cover_image_uuid IS NOT NULL
			)
			AND NOT EXISTS (SELECT 1 FROM users         WHERE INSTR(users.avatar_url,     m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM comments      WHERE INSTR(comments.text,        m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM blog_comments WHERE INSTR(blog_comments.text,   m.r2_key) > 0)
			AND NOT EXISTS (SELECT 1 FROM blog_posts    WHERE INSTR(blog_posts.content,   m.r2_key) > 0)
		`,
		)
			.bind(cutoffTime)
			.all<Media>();

		let deletedCount = 0;

		for (const media of orphanedMedia.results) {
			const variants = await env.DB.prepare('SELECT r2_key FROM media_variants WHERE media_uuid = ?')
				.bind(media.uuid)
				.all<{ r2_key: string }>();
			await Promise.all(variants.results.map((v) => env.MEDIA_BUCKET.delete(v.r2_key)));
			await env.BUCKET.delete(media.r2_key);
			await env.DB.prepare('DELETE FROM media WHERE uuid = ?').bind(media.uuid).run();
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
	},
	queue: async (batch: MessageBatch<UploadQueueMessage>, env: Env, _ctx: ExecutionContext) => {
		for (const msg of batch.messages) {
			const { media_uuid, r2_key, media_type, file_name } = msg.body;
			try {
				if (media_type === 'image') {
					await processImageVariants(env, media_uuid, r2_key);
					console.log(`[QUEUE] Image variants generated: ${media_uuid} (${file_name})`);
				} else {
					console.log(`[QUEUE] Non-image upload acknowledged: ${media_uuid} (${media_type})`);
				}
				msg.ack();
			} catch (e) {
				console.error(`[QUEUE] Failed to process ${r2_key}:`, e);
				msg.retry();
			}
		}
	},
};
