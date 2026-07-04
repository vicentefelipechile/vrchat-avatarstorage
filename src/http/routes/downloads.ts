// =========================================================================================================
// DOWNLOAD ROUTES (v2)
// =========================================================================================================
// Serves a PRIVATE file (archives) from R2 by its key. Unlike JSON routes, the success
// response is a raw R2 stream, so this handler keeps the streaming/context-bound bits
// (BUCKET.get, waitUntil) while DownloadService / MediaRepository own the SQL, the safe
// Content-Type policy, and the header construction.
//
// HARD CUT (media/download split): this route is now EXCLUSIVELY for private files —
// authenticated, streamed as an attachment, and it increments the parent resource's
// download_count. Public media (images/videos) is served by the dedicated CDN worker
// (cdn.vrcstorage.lat/{uuid}); requesting a media key here returns 404 (see DownloadService).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../../auth';
import { DownloadService } from '../../services/download-service';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const downloads = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/download/:key
// =========================================================================================================

downloads.get('/:key', async (c) => {
	const key = c.req.param('key');

	const service = new DownloadService(c.env.DB);
	const resolved = await service.resolve(key); // throws NotFoundError → 404 (unknown or media)

	// Private files always require authentication.
	const user = await getAuthUser(c);
	if (!user) return fail(c, 'Unauthorized', 401);

	const object = await c.env.BUCKET.get(key);
	if (!object) return fail(c, 'Not found', 404);

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('ETag', object.httpEtag);
	service.buildHeaders(resolved, headers);

	// Bump the parent resource's download_count after the response is sent.
	c.executionCtx.waitUntil(service.incrementDownloads(resolved.media.uuid));

	return new Response(object.body, { headers });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default downloads;
