// =========================================================================================================
// MEDIA ROUTES (v2)
// =========================================================================================================
// Thin HTTP layer for per-media reads, mounted under /api/media. Currently one endpoint: the processing
// status a freshly uploaded image polls until its CDN variants exist. No auth — the status of a media
// that's already rendered on a page is not sensitive. Business logic lives in MediaService; the SQL in
// MediaVariantRepository.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { MediaService } from '../../services/media-service';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const media = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/media/:uuid/status
// Whether this media has finished processing (its CDN variants exist). Polled by the frontend while the
// "processing" placeholder is showing, so it can swap in the real image without a reload.
// =========================================================================================================

media.get('/:uuid/status', async (c) => {
	const processed = await new MediaService(c.env.DB).isProcessed(c.req.param('uuid')!);
	return c.json({ processed });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default media;
