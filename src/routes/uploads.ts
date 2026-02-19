// =========================================================================================================
// UPLOAD ROUTES
// =========================================================================================================
// File upload endpoints (single and multipart)
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { isValidFileType, validateFileSize } from '../helpers/file-validation';
import { validateImageDimensions } from '../helpers/image-validator';

const uploads = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /
 * Sube un nuevo archivo y crea un registro en la tabla media.
 */
uploads.put('/', async (c) => {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const formData = await c.req.parseBody();
    const file = formData['file'];
    if (file instanceof File) {
        // Step 1: Validate Magic Bytes (file type)
        const validation = await isValidFileType(file);
        if (!validation.isValidFile || validation.mediaType === 'unknown') {
            return c.json({
                error: 'Invalid file type. Only images (PNG, JPEG, GIF, WEBP, AVIF), videos (MP4, WEBM), and archives (ZIP, RAR, 7Z, GZIP) are allowed.'
            }, 400);
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
                return c.json({
                    error: imageValidation.error,
                    details: {
                        width: imageValidation.width,
                        height: imageValidation.height,
                        fileSize: imageValidation.fileSize
                    }
                }, 400);
            }
        }

        const filename = file.name;
        const r2Key = crypto.randomUUID();
        const mediaUuid = crypto.randomUUID();

        try {
            // Upload to R2
            await c.env.BUCKET.put(r2Key, file);

            // Create media record
            await c.env.DB.prepare(
                'INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)'
            ).bind(mediaUuid, r2Key, validation.mediaType, filename).run();

            return c.json({
                media_uuid: mediaUuid,
                r2_key: r2Key,
                media_type: validation.mediaType,
                file_name: filename
            });
        } catch (e) {
            console.error('Upload error:', e);
            return c.json({ error: 'Upload failed' }, 500);
        }
    }
    return c.json({ error: 'No file uploaded' }, 400);
});

/**
 * Endpoint: /init
 * Inicia una carga multiparte para archivos grandes.
 */
uploads.post('/init', async (c) => {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { filename, media_type } = body;

    if (!filename || !media_type) {
        return c.json({ error: 'Missing filename or media_type' }, 400);
    }

    const r2Key = crypto.randomUUID();
    try {
        const multipartUpload = await c.env.BUCKET.createMultipartUpload(r2Key);
        return c.json({
            uploadId: multipartUpload.uploadId,
            key: r2Key
        });
    } catch (e) {
        console.error('Init multipart upload error:', e);
        return c.json({ error: 'Failed to init upload' }, 500);
    }
});

/**
 * Endpoint: /part
 * Sube una parte de un archivo grande.
 */
uploads.put('/part', async (c) => {
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
        const uploadedPart = await multipartUpload.uploadPart(partNumber, c.req.raw.body);
        return c.json(uploadedPart);
    } catch (e) {
        await multipartUpload.abort();
        console.error('Upload part error:', e);
        return c.json({ error: 'Failed to upload part' }, 500);
    }
});

/**
 * Endpoint: /complete
 * Completa una carga multiparte.
 */
uploads.post('/complete', async (c) => {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { key, uploadId, parts, filename, media_type } = body;

    if (!key || !uploadId || !parts || !Array.isArray(parts) || !filename || !media_type) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        const multipartUpload = c.env.BUCKET.resumeMultipartUpload(key, uploadId);
        await multipartUpload.complete(parts);

        const mediaUuid = crypto.randomUUID();

        // Create media record
        await c.env.DB.prepare(
            'INSERT INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)'
        ).bind(mediaUuid, key, media_type, filename).run();

        return c.json({
            media_uuid: mediaUuid,
            r2_key: key,
            media_type: media_type,
            file_name: filename
        });

    } catch (e) {
        console.error('Complete multipart upload error:', e);
        return c.json({ error: 'Failed to complete upload' }, 500);
    }
});

export default uploads;
