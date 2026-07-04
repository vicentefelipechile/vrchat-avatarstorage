// =========================================================================================================
// UPLOAD ROUTES (v2)
// =========================================================================================================
// HTTP layer for file uploads (single-shot + multipart), mounted under /api/upload. Handlers own the
// env collaborators that can't leave the request — R2 (BUCKET), KV (upload session metadata), the
// UPLOAD_QUEUE post-processing enqueue, and the raw request stream — while the pure validation /
// mime rules live in UploadService and the single media INSERT lives in MediaRepository.
//
// The JSON responses are identical to the legacy handlers so the existing frontend works unchanged.
//
// ENDPOINTS
// ---------
// PUT  /            — Single-shot upload; validate → store to R2 → media row → enqueue post-processing.
// POST /init        — Begin a multipart upload for large files (stores expected media_type in KV).
// PUT  /part        — Upload one part; part 1 is signature-checked against the declared media_type.
// POST /complete    — Finish a multipart upload; media_type is taken from KV (server-authoritative).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { UploadService } from '../../services/upload-service';
import { MediaRepository } from '../../repositories/media-repository';
import { fail } from '../responses';

// =========================================================================================================
// Constants
// =========================================================================================================

const UPLOAD_META_TTL = 3600; // 1 hour

// =========================================================================================================
// Endpoints
// =========================================================================================================

const upload = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// PUT /api/upload
// Upload a new file and create a media record.
// =========================================================================================================

upload.put('/', requireAuth, async (c) => {
	const formData = await c.req.parseBody();
	const file = formData['file'];
	if (!(file instanceof File)) return fail(c, 'No file uploaded', 400);

	// Validation + mime derivation live in the service; failures bubble as ValidationError → 400.
	const { mediaType, mimeType } = await new UploadService().validateFile(file);

	const filename = file.name;
	const r2Key = crypto.randomUUID();
	const mediaUuid = crypto.randomUUID();

	try {
		// Upload to R2 with a strict Content-Type.
		await c.env.BUCKET.put(r2Key, file, { httpMetadata: { contentType: mimeType } });

		// Persist the media record.
		await new MediaRepository(c.env.DB).insert(mediaUuid, r2Key, mediaType, filename);

		// Enqueue async post-processing (runs after the response is sent).
		c.executionCtx.waitUntil(
			c.env.UPLOAD_QUEUE.send({
				media_uuid: mediaUuid,
				r2_key: r2Key,
				media_type: mediaType,
				file_name: filename,
				uploaded_at: Date.now(),
			}),
		);

		return c.json({ media_uuid: mediaUuid, r2_key: r2Key, media_type: mediaType, file_name: filename });
	} catch (e) {
		console.error('Upload error:', e);
		return fail(c, 'Upload failed', 500);
	}
});

// =========================================================================================================
// POST /api/upload/init
// Begin a multipart upload for large files.
// =========================================================================================================

upload.post('/init', requireAuth, async (c) => {
	const { filename, media_type } = await c.req.json();

	if (!filename || !media_type) return fail(c, 'Missing filename or media_type', 400);

	const service = new UploadService();
	if (!service.isAllowedMultipartType(media_type)) {
		return fail(c, 'Invalid media_type. Must be one of: image, video, file', 400);
	}

	const r2Key = crypto.randomUUID();
	try {
		const multipartUpload = await c.env.BUCKET.createMultipartUpload(r2Key, {
			httpMetadata: { contentType: service.initMimeType(media_type) },
		});

		// Remember the expected media type for this upload (validated on part 1, trusted on complete).
		await c.env.VRCSTORAGE_KV.put(`upload_meta:${multipartUpload.uploadId}`, media_type, { expirationTtl: UPLOAD_META_TTL });

		return c.json({ uploadId: multipartUpload.uploadId, key: r2Key });
	} catch (e) {
		console.error('Init multipart upload error:', e);
		return fail(c, 'Failed to init upload', 500);
	}
});

// =========================================================================================================
// PUT /api/upload/part
// Upload one part of a large file. Part 1 is signature-checked against the declared media_type.
// =========================================================================================================

upload.put('/part', requireAuth, async (c) => {
	const uploadId = c.req.header('X-Upload-ID');
	const key = c.req.header('X-Key');
	const partNumberStr = c.req.header('X-Part-Number');

	if (!uploadId || !key || !partNumberStr) return fail(c, 'Missing upload headers', 400);

	const partNumber = parseInt(partNumberStr);
	if (isNaN(partNumber)) return fail(c, 'Invalid part number', 400);

	if (!c.req.raw.body) return fail(c, 'Missing request body', 400);

	const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
	try {
		let bodyToUpload: ReadableStream | ArrayBuffer = c.req.raw.body;

		// First part: enforce the magic-byte signature against the media_type declared at init.
		if (partNumber === 1) {
			const expectedMediaType = await c.env.VRCSTORAGE_KV.get(`upload_meta:${uploadId}`);
			if (!expectedMediaType) return fail(c, 'Upload session expired or invalid', 400);

			// We must buffer the part in memory to read its signature (R2 parts are ~5MB, fits in 128MB).
			const buffer = await c.req.arrayBuffer();
			const check = new UploadService().firstPartSignatureMatches(buffer, expectedMediaType);

			if (!check.ok) {
				await multipartUpload.abort();
				return fail(
					c,
					`Invalid file signature. Expected ${expectedMediaType}, but detected ${check.detectedType} (${check.detectedName}).`,
					400,
				);
			}

			bodyToUpload = buffer;
		}

		const uploadedPart = await multipartUpload.uploadPart(partNumber, bodyToUpload);
		return c.json(uploadedPart);
	} catch (e) {
		await multipartUpload.abort();
		console.error('Upload part error:', e);
		return fail(c, 'Failed to upload part', 500);
	}
});

// =========================================================================================================
// POST /api/upload/complete
// Finish a multipart upload. media_type is taken from KV (server-authoritative), not the client.
// =========================================================================================================

upload.post('/complete', requireAuth, async (c) => {
	const { key, uploadId, parts, filename } = await c.req.json();

	if (!key || !uploadId || !parts || !Array.isArray(parts) || !filename) return fail(c, 'Missing required fields', 400);

	// Use the media_type stored in KV during /init (already validated against magic bytes in /part).
	const media_type = await c.env.VRCSTORAGE_KV.get(`upload_meta:${uploadId}`);
	if (!media_type) return fail(c, 'Upload session expired or invalid', 400);

	if (!new UploadService().isAllowedMultipartType(media_type)) return fail(c, 'Invalid media type', 400);

	try {
		const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
		await multipartUpload.complete(parts);

		// Clean up the KV session entry.
		await c.env.VRCSTORAGE_KV.delete(`upload_meta:${uploadId}`);

		const mediaUuid = crypto.randomUUID();
		await new MediaRepository(c.env.DB).insert(mediaUuid, key, media_type, filename);

		return c.json({ media_uuid: mediaUuid, r2_key: key, media_type, file_name: filename });
	} catch (e) {
		console.error('Complete multipart upload error:', e);
		return fail(c, 'Failed to complete upload', 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default upload;
