// =========================================================================================================
// WORKER ENTRYPOINT INTEGRATION TESTS
// =========================================================================================================
// Check public HTTP endpoints and queue dispatch using the actual Worker export.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';
import { createExecutionContext, createMessageBatch, getQueueResult } from 'cloudflare:test';

import { describe, expect, it, vi } from 'vitest';

import worker from '../../../src/index';
import { createMedia, createUser } from '../../setup/fixtures';
import staticImage from '../../fixtures/static.png?inline';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('public Worker endpoints', () => {
	it('exposes machine-readable API docs without authentication', async () => {
		const response = await exports.default.fetch('http://localhost:8787/api/docs?tag=avatars');
		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		const result = (await response.json()) as { endpoints: { tag: string }[] };
		expect(result.endpoints.length).toBeGreaterThan(0);
		expect(result.endpoints.every((endpoint) => endpoint.tag === 'avatars')).toBe(true);
		expect((await exports.default.fetch('http://localhost:8787/api/docs?tag=nonexistent')).status).toBe(404);
	});

	it('responds to docs preflights without credentials', async () => {
		const response = await exports.default.fetch('http://localhost:8787/api/docs', { method: 'OPTIONS', headers: { Origin: 'https://unrelated.example' } });
		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});

describe('upload queue', () => {
	it('acknowledges archive uploads without image or video processing', async () => {
		const batch = createMessageBatch('vrcstorage-upload-processing', [{
			id: 'archive-message',
			attempts: 1,
			timestamp: new Date(),
			body: { media_uuid: crypto.randomUUID(), r2_key: crypto.randomUUID(), media_type: 'file', file_name: 'avatar.zip', uploaded_at: Date.now() },
		}]);
		const ctx = createExecutionContext();
		await worker.queue(batch, env, ctx);
		const result = await getQueueResult(batch, ctx);
		expect(result.explicitAcks).toEqual(['archive-message']);
		expect(result.retryMessages).toEqual([]);
	});

	it('preserves animated originals and records the CDN variant', async () => {
		const key = await createMedia('image', 'animated.gif');
		await env.BUCKET.put(key, 'GIF89a-example');
		const batch = createMessageBatch('vrcstorage-upload-processing', [{
			id: 'animated-message', attempts: 1, timestamp: new Date(),
			body: { media_uuid: key, r2_key: key, media_type: 'image', file_name: 'animated.gif', uploaded_at: Date.now() },
		}]);
		const ctx = createExecutionContext();
		await worker.queue(batch, env, ctx);
		expect((await getQueueResult(batch, ctx)).explicitAcks).toEqual(['animated-message']);
		expect(await env.MEDIA_BUCKET.head(`${key}/original.gif`)).not.toBeNull();
		expect(await env.DB.prepare('SELECT format FROM media_variants WHERE media_uuid = ?').bind(key).first()).toMatchObject({ format: 'gif' });
	});

	it('generates all six static image variants and the blur placeholder', async () => {
		const key = await createMedia('image', 'static.png');
		const base64 = staticImage.split(',')[1];
		await env.BUCKET.put(key, Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
		const batch = createMessageBatch('vrcstorage-upload-processing', [{
			id: 'static-message', attempts: 1, timestamp: new Date(),
			body: { media_uuid: key, r2_key: key, media_type: 'image', file_name: 'static.png', uploaded_at: Date.now() },
		}]);
		const ctx = createExecutionContext();
		await worker.queue(batch, env, ctx);
		expect((await getQueueResult(batch, ctx)).explicitAcks).toEqual(['static-message']);
		const rows = await env.DB.prepare('SELECT res, format FROM media_variants WHERE media_uuid = ?').bind(key).all<{ res: string; format: string }>();
		expect(rows.results).toHaveLength(6);
		for (const res of ['low', 'med', 'original']) {
			for (const format of ['webp', 'png']) expect(await env.MEDIA_BUCKET.head(`${key}/${res}.${format}`)).not.toBeNull();
		}
		const media = await env.DB.prepare('SELECT placeholder_blur FROM media WHERE uuid = ?').bind(key).first<{ placeholder_blur: string }>();
		expect(media?.placeholder_blur).toMatch(/^data:image\/webp;base64,/);
	}, 15_000);

	it('retries an image whose original is missing instead of acknowledging data loss', async () => {
		const key = crypto.randomUUID();
		const batch = createMessageBatch('vrcstorage-upload-processing', [{
			id: 'missing-message', attempts: 1, timestamp: new Date(),
			body: { media_uuid: key, r2_key: key, media_type: 'image', file_name: 'missing.png', uploaded_at: Date.now() },
		}]);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const ctx = createExecutionContext();
			await worker.queue(batch, env, ctx);
			const result = await getQueueResult(batch, ctx);
			expect(result.explicitAcks).toEqual([]);
			expect(result.retryMessages).toContainEqual(expect.objectContaining({ msgId: 'missing-message' }));
			expect(error).toHaveBeenCalled();
		} finally {
			error.mockRestore();
		}
	});

	it('marks a missing Drive source failed without retrying because its key contains 5s', async () => {
		const owner = await createUser();
		const jobUuid = crypto.randomUUID();
		const key = '55555555-5555-4555-8555-555555555555';
		expect(await env.BUCKET.head(key)).toBeNull();
		await env.DB.prepare('INSERT INTO drive_transfer_jobs (uuid, user_uuid, r2_key, file_name, status) VALUES (?, ?, ?, ?, ?)')
			.bind(jobUuid, owner.uuid, key, 'missing.zip', 'queued').run();
		const batch = createMessageBatch('vrcstorage-drive-transfer', [{
			id: 'drive-message', attempts: 1, timestamp: new Date(),
			body: { job_uuid: jobUuid, r2_key: key, user_uuid: owner.uuid, file_name: 'missing.zip', folder_id: null },
		}]);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const ctx = createExecutionContext();
			await worker.queue(batch, env, ctx);
			const result = await getQueueResult(batch, ctx);
			expect(result.explicitAcks).toEqual(['drive-message']);
			expect(result.retryMessages).toEqual([]);
			expect(await env.DB.prepare('SELECT status FROM drive_transfer_jobs WHERE uuid = ?').bind(jobUuid).first()).toMatchObject({ status: 'failed' });
		} finally {
			error.mockRestore();
		}
	});
});
