// =========================================================================================================
// DOCS ROUTE — /api/docs
// =========================================================================================================
// Serves the machine-readable JSON manifest rendered from the single source of truth at
// src/docs/registry.ts. The markdown artefacts /llms.txt and /llms-full.txt are NOT served
// by the Worker — they are static files in public/ (generated at build time via
// `npm run docs:build` and uploaded as ASSETS). Keeping them static avoids per-request
// Worker CPU for content that only changes on deploy, and lets the edge cache them as
// immutable assets.
//
// This route remains a Worker handler because it supports dynamic filtering via ?tag=
// (e.g. /api/docs?tag=avatars) which cannot be expressed as a static file.
// Public, unauthenticated, Cache-Control: public, max-age=3600.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { buildApiJson } from '../../docs/generator';
import { buildManifest } from '../../docs/registry';

// =========================================================================================================
// Endpoints
// =========================================================================================================

export const apiDocs = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/docs
// Machine-readable manifest. Optional ?tag= filter narrows to one section.
// =========================================================================================================

apiDocs.get('/', (c) => {
	const tag = c.req.query('tag');
	const manifest = buildManifest();
	if (tag) {
		const filtered = manifest.endpoints.filter((e) => e.tag === tag);
		if (!filtered.length) {
			return c.json({ error: `Unknown tag "${tag}"` }, 404);
		}
		return c.json({ ...manifest, endpoints: filtered }, 200, {
			'Cache-Control': 'public, max-age=3600',
		});
	}
	return c.json(buildApiJson(manifest), 200, {
		'Cache-Control': 'public, max-age=3600',
	});
});

// =========================================================================================================
// Export
// =========================================================================================================

export default apiDocs;
