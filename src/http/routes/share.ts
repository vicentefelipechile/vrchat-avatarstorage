// =========================================================================================================
// SHARE LINK ROUTES (v2)
// =========================================================================================================
// Temporary, bearer-token download links for PRIVATE files (one link = one local file).
// Two surfaces live in this file:
//   - `share` (mounted at /api/share): authenticated management — create, list mine, revoke.
//   - `sharePublic` (mounted at /share): anonymous consumption — GET /share/:token streams
//     the file while the link is live (not revoked, not expired, under max_uses) and 404s
//     otherwise. The token IS the authorization; no session is required or checked.
//
// Crawler guard: link-preview fetchers (Discord/Telegram/...) GET the URL to build an embed
// card. They get a small OG HTML page and never consume a use (see isCrawler). HEAD never
// consumes either. The file bytes only flow to non-crawler GETs with a live token.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { ShareLinkService, isCrawler } from '../../services/share-link-service';
import { DownloadService } from '../../services/download-service';
import { MediaRepository } from '../../repositories/media-repository';
import { CreateShareLinkSchema } from '../../validators';
import { fail } from '../responses';

// =========================================================================================================
// Helpers
// =========================================================================================================

/** Escape a string for use inside an HTML attribute (file names are uploader-controlled). */
function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Fixed UTC rendering for the preview card (crawlers send no reliable locale). */
function formatExpiryUtc(expiresAt: number): string {
	return new Date(expiresAt * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

// =========================================================================================================
// Authenticated management (/api/share)
// =========================================================================================================

const share = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// POST /api/share
// Creates a temporary link for a local file. Returns the token and absolute URL.
// =========================================================================================================

share.post('/', requireAuth, async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return fail(c, 'Invalid JSON', 400);
	}

	const parsed = CreateShareLinkSchema.safeParse(body);
	if (!parsed.success) return fail(c, 'Validation error', 400, parsed.error.issues);

	const link = await new ShareLinkService(c.env.DB).create(c.get('user').uuid, parsed.data.r2_key, parsed.data.expires_in, parsed.data.max_uses);
	return c.json(
		{
			uuid: link.uuid,
			token: link.token,
			url: new URL(`/share/${link.token}`, c.req.url).toString(),
			expires_at: link.expires_at,
			max_uses: link.max_uses,
		},
		201,
	);
});

// =========================================================================================================
// GET /api/share/mine
// Lists the caller's links, newest first. Registered before /:uuid-free routes by mount order.
// =========================================================================================================

share.get('/mine', requireAuth, async (c) => {
	const links = await new ShareLinkService(c.env.DB).listMine(c.get('user').uuid);
	return c.json({
		links: links.map((l) => ({
			uuid: l.uuid,
			file_name: l.file_name,
			uses: l.uses,
			max_uses: l.max_uses,
			expires_at: l.expires_at,
			revoked: l.revoked,
			created_at: l.created_at,
		})),
	});
});

// =========================================================================================================
// DELETE /api/share/:uuid
// Revokes an owned link (force-expire). Throws 403 for other owners' links.
// =========================================================================================================

share.delete('/:uuid', requireAuth, async (c) => {
	await new ShareLinkService(c.env.DB).revoke(c.req.param('uuid')!, c.get('user').uuid);
	return c.json({ success: true });
});

// =========================================================================================================
// Anonymous consumption (/share/:token)
// =========================================================================================================

const sharePublic = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET|HEAD /share/:token
// Streams the file while the link is live, serves the OG preview to crawlers, else 404.
// =========================================================================================================

sharePublic.on(['GET', 'HEAD'], '/:token', async (c) => {
	const token = c.req.param('token')!;
	const svc = new ShareLinkService(c.env.DB);

	// HEAD probes (and any crawler preview fetch) must never consume a use.
	if (c.req.method === 'HEAD') return new Response(null, { status: 200 });

	if (isCrawler(c.req.header('user-agent'))) {
		const link = await svc.preview(token); // throws NotFoundError → 404 when dead
		const media = await new MediaRepository(c.env.DB).findByKey(link.r2_key);
		const fileName = escapeAttr(media?.file_name ?? 'Shared file');
		const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
			`<meta property="og:type" content="website">` +
			`<meta property="og:site_name" content="VRCStorage">` +
			`<meta property="og:title" content="${fileName}">` +
			`<meta property="og:description" content="Shared file · available until ${formatExpiryUtc(link.expires_at)}">` +
			`<meta name="theme-color" content="#333333">` +
			`<title>${fileName} — VRCStorage</title></head><body></body></html>`;
		return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
	}

	// Bearer path: atomic consume, then stream exactly like /api/download/:key.
	const link = await svc.consume(token); // throws NotFoundError → 404 when dead
	const downloads = new DownloadService(c.env.DB);
	const resolved = await downloads.resolve(link.r2_key);

	const object = await c.env.BUCKET.get(link.r2_key);
	if (!object) return fail(c, 'Not found', 404);

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('ETag', object.httpEtag);
	downloads.buildHeaders(resolved, headers);

	c.executionCtx.waitUntil(downloads.incrementDownloads(resolved.media.uuid));

	return new Response(object.body, { headers });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default share;
export { sharePublic };
