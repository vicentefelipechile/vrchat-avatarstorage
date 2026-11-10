// =========================================================================================================
// UPLOAD ROUTES (v2)
// HTTP parsing, request-scoped storage and post-processing. Multipart state lives in D1, not KV.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';

import { requireAuth, type AuthVariables } from '../middleware/auth';
import { UploadService } from '../../services/upload-service';
import { MultipartUploadService } from '../../services/multipart-upload-service';
import { MediaRepository } from '../../repositories/media-repository';
import { UploadCompleteSchema, UploadInitSchema, UploadPartSchema, UploadSessionSchema } from '../../validators';
import { fail } from '../responses';

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
	const { mediaType, mimeType } = await new UploadService().validateFile(file, !!c.get('user').is_admin);
	const filename = file.name;
	const mediaUuid = crypto.randomUUID();
	try {
		await c.env.BUCKET.put(mediaUuid, file, { httpMetadata: { contentType: mimeType } });
		await new MediaRepository(c.env.DB).insert(mediaUuid, mediaUuid, mediaType, filename);
		c.executionCtx.waitUntil(c.env.UPLOAD_QUEUE.send({ media_uuid: mediaUuid, r2_key: mediaUuid, media_type: mediaType, file_name: filename, uploaded_at: Date.now() }));
		return c.json({ media_uuid: mediaUuid, r2_key: mediaUuid, media_type: mediaType, file_name: filename });
	} catch (error) {
		console.error('Upload error:', error);
		return fail(c, 'Upload failed', 500);
	}
});

// =========================================================================================================
// POST /api/upload/init
// Begin a durable multipart session with a server-enforced size limit.
// =========================================================================================================

upload.post('/init', requireAuth, async (c) => {
	const input = await c.req.json().catch(() => null);
	const parsed = UploadInitSchema.safeParse(input);
	if (!parsed.success) return fail(c, 'Invalid upload metadata', 400, parsed.error.issues);
	const { filename, media_type, size } = parsed.data;
	return c.json(await new MultipartUploadService(c.env.DB).init(c.get('user').uuid, filename, media_type, size, c.env.BUCKET, !!c.get('user').is_admin));
});

// =========================================================================================================
// GET /api/upload/status
// Read acknowledged parts or recover a completed response after reconnecting.
// =========================================================================================================

upload.get('/status', requireAuth, async (c) => {
	const parsed = UploadSessionSchema.safeParse(c.req.query());
	if (!parsed.success) return fail(c, 'Invalid upload session', 400, parsed.error.issues);
	c.header('Cache-Control', 'no-store');
	return c.json(await new MultipartUploadService(c.env.DB).status(c.get('user').uuid, parsed.data.uploadId, parsed.data.key));
});

// =========================================================================================================
// PUT /api/upload/part
// Validate ownership on every part; storage failures leave acknowledged parts intact.
// =========================================================================================================

upload.put('/part', requireAuth, async (c) => {
	const parsed = UploadPartSchema.safeParse({ uploadId: c.req.header('X-Upload-ID'), key: c.req.header('X-Key'), partNumber: c.req.header('X-Part-Number') });
	if (!parsed.success) return fail(c, 'Invalid upload headers', 400, parsed.error.issues);
	if (!c.req.raw.body) return fail(c, 'Missing request body', 400);
	const { uploadId, key, partNumber } = parsed.data;
	return c.json(await new MultipartUploadService(c.env.DB).part(c.get('user').uuid, uploadId, key, partNumber, c.req.raw.body, c.env.BUCKET));
});

// =========================================================================================================
// POST /api/upload/complete
// Retryable confirmation recovers R2 success even when the D1 write previously failed.
// =========================================================================================================

upload.post('/complete', requireAuth, async (c) => {
	const input = await c.req.json().catch(() => null);
	const parsed = UploadCompleteSchema.safeParse(input);
	if (!parsed.success) return fail(c, 'Invalid completion payload', 400, parsed.error.issues);
	const { uploadId, key, parts } = parsed.data;
	const result = await new MultipartUploadService(c.env.DB).complete(c.get('user').uuid, uploadId, key, parts, c.env.BUCKET);
	if (result.media_type !== 'file') {
		// Processing is idempotent; retrying confirmation can safely re-enqueue it.
		c.executionCtx.waitUntil(c.env.UPLOAD_QUEUE.send({ ...result, uploaded_at: Date.now() }));
	}
	return c.json(result);
});

// =========================================================================================================
// POST /api/upload/abort
// Cancel only the caller's active session, never a confirming or completed object.
// =========================================================================================================

upload.post('/abort', requireAuth, async (c) => {
	const input = await c.req.json().catch(() => null);
	const parsed = UploadSessionSchema.safeParse(input);
	if (!parsed.success) return fail(c, 'Invalid upload session', 400, parsed.error.issues);
	return c.json(await new MultipartUploadService(c.env.DB).abort(c.get('user').uuid, parsed.data.uploadId, parsed.data.key, c.env.BUCKET));
});

// =========================================================================================================
// Export
// =========================================================================================================

export default upload;
