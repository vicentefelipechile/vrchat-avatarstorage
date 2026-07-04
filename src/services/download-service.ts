// =========================================================================================================
// DOWNLOAD SERVICE
// =========================================================================================================
// Business rules for serving a PRIVATE file (archives: zip/rar/...) from R2 by its key:
//   - resolve the media row (404 if unknown)
//   - enforce a strict Content-Type allowlist so R2-hosted HTML/SVG/JS can never execute
//   - build the attachment/no-store response headers
//
// HARD CUT (media/download split): public media (image/video) is NO LONGER served here — it
// goes through the dedicated CDN worker (cdn.vrcstorage.lat/{uuid}). If a media key reaches
// this service it is treated as not-found (404), so any un-migrated consumer breaks loudly and
// visibly instead of silently keeping the two domains coupled. This route is now exclusively
// the authenticated, download-counted path for private files.
//
// The route still owns the raw R2 stream and the deferred download_count increment
// (waitUntil), because those need the Hono execution context — but the *decision* of what a
// file is and what headers it gets lives here.
//
// Error mapping:
//   - key unknown / key is public media → NotFoundError (404)
//   - private file, no user             → the route returns 401 (auth gate) before streaming
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { MediaRepository } from '../repositories/media-repository';
import { NotFoundError } from '../domain/errors';
import type { MediaRow } from '../db/schema';

// =========================================================================================================
// Content-Type allowlist
// =========================================================================================================
// Only these exact MIME types are served as-is. Everything else (text/html,
// text/javascript, image/svg+xml, ...) is coerced to application/octet-stream so the
// browser will never execute R2-hosted content. Prevents: upload malicious .html/.svg →
// share R2 link → victim opens link → XSS via R2 content.

const SAFE_CONTENT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'video/mp4',
	'video/webm',
	'video/ogg',
];

function safeContentType(raw: string | undefined | null): string {
	const ct = (raw ?? '').toLowerCase().split(';')[0].trim();
	return SAFE_CONTENT_TYPES.includes(ct) ? ct : 'application/octet-stream';
}

// =========================================================================================================
// Types
// =========================================================================================================

/** A resolved private file ready to be streamed by the route. */
export interface ResolvedDownload {
	media: MediaRow;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class DownloadService {
	private readonly repo: MediaRepository;

	constructor(db: DB) {
		this.repo = new MediaRepository(db);
	}

	/**
	 * Resolve a PRIVATE file by R2 key. Throws NotFoundError if the key is unknown OR if it
	 * points to public media (image/video) — that content is served by the CDN, not here.
	 * The caller must gate the returned file behind authentication.
	 */
	async resolve(r2Key: string): Promise<ResolvedDownload> {
		const media = await this.repo.findByKey(r2Key);
		if (!media) throw new NotFoundError('Not found');

		// Hard cut: public media no longer flows through /api/download. Treat as not-found.
		if (media.media_type === 'image' || media.media_type === 'video') {
			throw new NotFoundError('Not found');
		}

		return { media };
	}

	/**
	 * Build the response headers for a resolved private file. `objectHeaders` are the headers
	 * R2 wrote via `writeHttpMetadata`, plus the ETag; this applies the safe Content-Type,
	 * nosniff, and the attachment/no-store policy.
	 */
	buildHeaders(resolved: ResolvedDownload, objectHeaders: Headers): Headers {
		const filename = resolved.media.file_name.replace(/"/g, '');
		const encoded = encodeURIComponent(filename);

		// Always enforce a safe Content-Type to prevent R2-hosted HTML/SVG/JS execution,
		// and forbid MIME sniffing so the browser respects our declaration.
		objectHeaders.set('Content-Type', safeContentType(objectHeaders.get('Content-Type')));
		objectHeaders.set('X-Content-Type-Options', 'nosniff');

		// Private archive: attachment disposition, never cached.
		objectHeaders.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);
		objectHeaders.set('Cache-Control', 'private, no-store');

		return objectHeaders;
	}

	/** Increment the parent resource's download_count (deferred by the route via waitUntil). */
	incrementDownloads(mediaUuid: string): Promise<void> {
		return this.repo.incrementResourceDownloads(mediaUuid);
	}
}
