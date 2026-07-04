// =========================================================================================================
// SEO / SSR — Open Graph meta-tag injection
// =========================================================================================================
// The crawler-facing routes (/wiki, /blog/:slug, /item/:uuid) are served as the SPA shell but with
// their <title>/<meta og:*> tags rewritten so link previews (Discord, Twitter, etc.) show the right
// title, description, and image. All three fetch the SPA's index.html from ASSETS, patch the head via
// injectSEO(), and fall back to the untouched shell on any error. DB lookups go through the repository
// layer (no raw SQL here); public images resolve to the dedicated CDN worker by media uuid.
//
// registerSeoRoutes(app) is called from src/index.ts after the /api routers are mounted and before the
// static SPA fallback, so these paths win over the catch-all.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { Hono } from 'hono';
import { BlogPostRepository } from '../repositories/blog-post-repository';
import { ResourceRepository } from '../repositories/resource-repository';

// =========================================================================================================
// Helpers
// =========================================================================================================

/** The dedicated CDN worker that serves public media, indexed by media uuid. Mirrors the frontend
 *  `mediaUrl()` helper (src/frontend/utils.ts). */
const CDN_BASE = 'https://cdn.vrcstorage.lat';

/** Public media (og:image) URL by media uuid. */
function cdnMediaUrl(uuid: string, res: 'low' | 'med' | 'original' = 'med', format: 'webp' | 'png' = 'webp'): string {
	return `${CDN_BASE}/${uuid}?res=${res}&format=${format}`;
}

/** Escapes HTML special characters to prevent injection when replacing meta tags. */
function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Rewrites (or inserts) the SEO/OG meta tags in an index.html string. Existing tags are replaced in
 * place; missing ones are appended before </head>. The description is stripped of the machine-readable
 * "Avatar Details" markdown block before use.
 */
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

// =========================================================================================================
// Routes
// =========================================================================================================

/**
 * Registers the three crawler-facing SSR routes onto the app. Mount after the /api routers and before
 * the static SPA catch-all so these paths take precedence.
 */
export function registerSeoRoutes(app: Hono<{ Bindings: Env }>): void {
	// SEO route: /wiki (served as SPA but with injected OG meta tags derived from the wiki article)
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
			const post = await new BlogPostRepository(c.env.DB).findForSeo(slug);

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
			const resource = await new ResourceRepository(c.env.DB).findByUuid(uuid);

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
}
