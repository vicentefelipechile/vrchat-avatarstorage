// =========================================================================================================
// UPLOAD ROUTES
// =========================================================================================================
// File upload endpoints (single and multipart)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { isValidFileType, isValidSignature, validateFileSize } from '../helpers/file-validation';
import { validateImageDimensions } from '../helpers/image-validator';

// =========================================================================================================
// Endpoint
// =========================================================================================================

const upload = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// PUT /api/upload
// Upload a new file and create a media record
// =========================================================================================================

upload.put('/', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const formData = await c.req.parseBody();
	const file = formData['file'];
	if (file instanceof File) {
		// Step 1: Validate Magic Bytes (file type)
		const validation = await isValidFileType(file);
		if (!validation.isValidFile || validation.mediaType === 'unknown') {
			return c.json(
				{
					error:
						'Invalid file type. Only images (PNG, JPEG, GIF, WEBP, AVIF), videos (MP4, WEBM), and archives (ZIP, RAR, 7Z, GZIP, BLEND) are allowed.',
				},
				400,
			);
		}

		// Step 2: Validate File Size based on detected media type
		const sizeValidation = validateFileSize(file.size, validation.mediaType);
		if (!sizeValidation.isValid) {
			return c.json({ error: sizeValidation.error }, 400);
		}

		// Step 3: Additional validation for images (dimensions)
		if (validation.mediaType === 'image') {
			const imageValidation = await validateImageDimensions(file);
			if (!imageValidation.isValid) {
				return c.json(
					{
						error: imageValidation.error,
						details: {
							width: imageValidation.width,
							height: imageValidation.height,
							fileSize: imageValidation.fileSize,
						},
					},
					400,
				);
			}
		}

		const filename = file.name;
		const r2Key = crypto.randomUUID();
		const mediaUuid = crypto.randomUUID();

		try {
			// Map mediaType to a default generic safe mime type
			let mimeType = 'application/octet-stream';
			if (validation.mediaType === 'image') {
				mimeType = `image/${validation.mediaName.toLowerCase()}`;
			} else if (validation.mediaType === 'video') {
				mimeType = `video/${validation.mediaName.toLowerCase()}`;
			}

			// Upload to R2 with strict Content-Type
			await c.env.BUCKET.put(r2Key, file, {
				httpMetadata: { contentType: mimeType },
			});

			// Create media record
			await c.env.DB.prepare('INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)')
				.bind(mediaUuid, r2Key, validation.mediaType, filename)
				.run();

			// Enqueue async post-processing job (runs after response is sent)
			// Currently logs the upload; extend here for virus scanning, thumbnail gen, etc.
			c.executionCtx.waitUntil(
				c.env.UPLOAD_QUEUE.send({
					media_uuid: mediaUuid,
					r2_key: r2Key,
					media_type: validation.mediaType,
					file_name: filename,
					uploaded_at: Date.now(),
				}),
			);

			return c.json({
				media_uuid: mediaUuid,
				r2_key: r2Key,
				media_type: validation.mediaType,
				file_name: filename,
			});
		} catch (e) {
			console.error('Upload error:', e);
			return c.json({ error: 'Upload failed' }, 500);
		}
	}
	return c.json({ error: 'No file uploaded' }, 400);
});

// =========================================================================================================
// POST /api/upload/init
// Inicia una carga multiparte para archivos grandes.
// =========================================================================================================

upload.post('/init', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { filename, media_type } = body;

	if (!filename || !media_type) {
		return c.json({ error: 'Missing filename or media_type' }, 400);
	}

	// Validate media_type against a strict allowlist
	const ALLOWED_INIT_TYPES = ['image', 'video', 'file'] as const;
	if (!ALLOWED_INIT_TYPES.includes(media_type as (typeof ALLOWED_INIT_TYPES)[number])) {
		return c.json({ error: 'Invalid media_type. Must be one of: image, video, file' }, 400);
	}

	const r2Key = crypto.randomUUID();
	try {
		let mimeType = 'application/octet-stream';
		if (media_type === 'image' || media_type === 'video') {
			mimeType = `${media_type}/mp4`; // generic fallback, actual type is validated in /part 1
		}

		const multipartUpload = await c.env.BUCKET.createMultipartUpload(r2Key, {
			httpMetadata: { contentType: mimeType },
		});

		// Store expected media type for this upload
		await c.env.VRCSTORAGE_KV.put(`upload_meta:${multipartUpload.uploadId}`, media_type, { expirationTtl: 3600 });

		return c.json({
			uploadId: multipartUpload.uploadId,
			key: r2Key,
		});
	} catch (e) {
		console.error('Init multipart upload error:', e);
		return c.json({ error: 'Failed to init upload' }, 500);
	}
});

// =========================================================================================================
// PUT /api/upload/part
// Sube una parte de un archivo grande.
// =========================================================================================================

upload.put('/part', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const uploadId = c.req.header('X-Upload-ID');
	const key = c.req.header('X-Key');
	const partNumberStr = c.req.header('X-Part-Number');

	if (!uploadId || !key || !partNumberStr) {
		return c.json({ error: 'Missing upload headers' }, 400);
	}

	const partNumber = parseInt(partNumberStr);
	if (isNaN(partNumber)) {
		return c.json({ error: 'Invalid part number' }, 400);
	}

	if (!c.req.raw.body) {
		return c.json({ error: 'Missing request body' }, 400);
	}

	const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
	try {
		let bodyToUpload: ReadableStream | ArrayBuffer = c.req.raw.body;

		// Step 1: Validation for the first part
		if (partNumber === 1) {
			const expectedMediaType = await c.env.VRCSTORAGE_KV.get(`upload_meta:${uploadId}`);
			if (!expectedMediaType) {
				return c.json({ error: 'Upload session expired or invalid' }, 400);
			}

			// We must read the body into memory to validate the signature
			// R2 multipart parts are usually 5MB+, which fits in Worker memory (128MB)
			const buffer = await c.req.arrayBuffer();
			const validation = isValidSignature(buffer);

			if (!validation.isValidFile || validation.mediaType !== expectedMediaType) {
				await multipartUpload.abort();
				return c.json(
					{
						error: `Invalid file signature. Expected ${expectedMediaType}, but detected ${validation.mediaType} (${validation.mediaName}).`,
					},
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
		return c.json({ error: 'Failed to upload part' }, 500);
	}
});

// =========================================================================================================
// POST /api/upload/complete
// Completa una carga multiparte.
// =========================================================================================================

upload.post('/complete', async (c) => {
	const user = await getAuthUser(c);
	if (!user) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { key, uploadId, parts, filename } = body;

	if (!key || !uploadId || !parts || !Array.isArray(parts) || !filename) {
		return c.json({ error: 'Missing required fields' }, 400);
	}

	// Use the media_type stored in KV during /init (validated against magic bytes in /part)
	// instead of trusting the client-supplied value.
	const media_type = await c.env.VRCSTORAGE_KV.get(`upload_meta:${uploadId}`);
	if (!media_type) {
		return c.json({ error: 'Upload session expired or invalid' }, 400);
	}

	const ALLOWED_MEDIA_TYPES = ['image', 'video', 'file'] as const;
	if (!ALLOWED_MEDIA_TYPES.includes(media_type as (typeof ALLOWED_MEDIA_TYPES)[number])) {
		return c.json({ error: 'Invalid media type' }, 400);
	}

	try {
		const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
		await multipartUpload.complete(parts);

		// Clean up KV entry
		await c.env.VRCSTORAGE_KV.delete(`upload_meta:${uploadId}`);

		const mediaUuid = crypto.randomUUID();

		// Create media record using the server-authoritative media_type from KV
		await c.env.DB.prepare('INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)')
			.bind(mediaUuid, key, media_type, filename)
			.run();

		return c.json({
			media_uuid: mediaUuid,
			r2_key: key,
			media_type: media_type,
			file_name: filename,
		});
	} catch (e) {
		console.error('Complete multipart upload error:', e);
		return c.json({ error: 'Failed to complete upload' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default upload;
