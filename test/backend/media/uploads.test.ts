// =========================================================================================================
// UPLOAD SERVICE AND ROUTE TESTS
// =========================================================================================================
// Validate signatures and ensure a private upload pairs its D1 row with its R2 object.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { UploadService } from '../../../src/services/upload-service';
import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('multipart upload validation', () => {
	it.each(['image', 'video', 'file'])('accepts the %s media type', (type) => {
		expect(new UploadService().isAllowedMultipartType(type)).toBe(true);
	});

	it('rejects unknown media types and mismatched magic bytes', () => {
		const service = new UploadService();
		expect(service.isAllowedMultipartType('text/html')).toBe(false);
		const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
		expect(service.firstPartSignatureMatches(zip, 'file')).toMatchObject({ ok: true, detectedType: 'file' });
		expect(service.firstPartSignatureMatches(zip, 'image')).toMatchObject({ ok: false, detectedType: 'file' });
	});
});

describe('single-shot uploads', () => {
	it('rejects unsupported files without creating a media row', async () => {
		const { cookie } = await createUser();
		const form = new FormData();
		form.append('file', new File(['<html>'], 'payload.zip', { type: 'application/zip' }));
		const response = await exports.default.fetch('http://localhost:8787/api/upload', {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat' }, body: form,
		});
		expect(response.status).toBe(400);
		const media = await env.DB.prepare('SELECT COUNT(*) AS total FROM media').first<{ total: number }>();
		expect(media?.total).toBe(0);
	});

	it('stores ZIP uploads with matching R2 key, media UUID and attachment policy', async () => {
		const { cookie } = await createUser();
		const form = new FormData();
		form.append('file', new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01])], 'sample.zip', { type: 'text/html' }));
		const response = await exports.default.fetch('http://localhost:8787/api/upload', {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat' }, body: form,
		});
		expect(response.status).toBe(200);
		const result = (await response.json()) as { media_uuid: string; r2_key: string; media_type: string };
		expect(result.media_uuid).toBe(result.r2_key);
		expect(result.media_type).toBe('file');
		const record = await env.DB.prepare('SELECT r2_key, media_type FROM media WHERE uuid = ?').bind(result.media_uuid).first<{ r2_key: string; media_type: string }>();
		expect(record).toMatchObject({ r2_key: result.r2_key, media_type: 'file' });
		expect((await env.BUCKET.head(result.r2_key))?.httpMetadata?.contentType).toBe('application/octet-stream');
	});
});

describe('multipart uploads', () => {
	it('binds the session to its owner and trusts the KV media type, not the completion payload', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const jsonHeaders = { Cookie: owner.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' };
		const init = await exports.default.fetch('http://localhost:8787/api/upload/init', {
			method: 'POST', headers: jsonHeaders, body: JSON.stringify({ filename: 'archive.zip', media_type: 'file' }),
		});
		expect(init.status).toBe(200);
		const { uploadId, key } = (await init.json()) as { uploadId: string; key: string };
		const partHeaders = { Origin: 'https://vrcstorage.lat', 'X-Upload-ID': uploadId, 'X-Key': key, 'X-Part-Number': '1' };
		const body = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
		const denied = await exports.default.fetch('http://localhost:8787/api/upload/part', {
			method: 'PUT', headers: { ...partHeaders, Cookie: other.cookie }, body,
		});
		expect(denied.status).toBe(403);
		const uploaded = await exports.default.fetch('http://localhost:8787/api/upload/part', {
			method: 'PUT', headers: { ...partHeaders, Cookie: owner.cookie }, body,
		});
		expect(uploaded.status).toBe(200);
		const part = (await uploaded.json()) as { partNumber: number; etag: string };
		const complete = await exports.default.fetch('http://localhost:8787/api/upload/complete', {
			method: 'POST', headers: jsonHeaders,
			body: JSON.stringify({ key, uploadId, parts: [part], filename: 'archive.zip', media_type: 'video' }),
		});
		expect(complete.status).toBe(200);
		expect(await complete.json()).toMatchObject({ media_uuid: key, r2_key: key, media_type: 'file' });
		expect(await env.VRCSTORAGE_KV.get(`upload_meta:${uploadId}`)).toBeNull();
		expect((await env.BUCKET.head(key))?.size).toBe(body.length);
	});

	it('rejects an invalid first-part signature without persisting a media row', async () => {
		const { cookie } = await createUser();
		const init = await exports.default.fetch('http://localhost:8787/api/upload/init', {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename: 'archive.zip', media_type: 'file' }),
		});
		const { uploadId, key } = (await init.json()) as { uploadId: string; key: string };
		const rejected = await exports.default.fetch('http://localhost:8787/api/upload/part', {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'X-Upload-ID': uploadId, 'X-Key': key, 'X-Part-Number': '1' }, body: 'fake file',
		});
		expect(rejected.status).toBe(400);
		expect(await env.DB.prepare('SELECT uuid FROM media WHERE uuid = ?').bind(key).first()).toBeNull();
	});
});
