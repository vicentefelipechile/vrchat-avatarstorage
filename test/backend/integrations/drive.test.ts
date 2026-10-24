// =========================================================================================================
// GOOGLE DRIVE JOB INTEGRATION TESTS
// =========================================================================================================
// Drive transfers require explicit linking, private local files and owner-scoped jobs.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DriveService } from '../../../src/services/drive-service';
import { DriveTransferService } from '../../../src/services/drive-transfer-service';
import driveRoutes from '../../../src/http/routes/drive';
import { createMedia, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

function drive(): DriveService {
	return new DriveService(env.DB, env.VRCSTORAGE_KV, env.BUCKET, env.DRIVE_QUEUE, 'local-client', 'local-secret', env.JWT_SECRET);
}

function route(path: string, init?: RequestInit): Promise<Response> {
	return driveRoutes.fetch(new Request(`http://localhost${path}`, init), env);
}

async function link(userUuid: string): Promise<void> {
	await env.DB.prepare('INSERT INTO user_oauth_providers (user_uuid, provider, provider_id, refresh_token_encrypted) VALUES (?, ?, ?, ?)')
		.bind(userUuid, 'google', userUuid, 'encrypted-refresh-token').run();
}

// =========================================================================================================
// Tests
// =========================================================================================================

afterEach(() => vi.unstubAllGlobals());

describe('Drive account and job ownership', () => {
	it('serves status, folder validation, job reads and authorization redirects', async () => {
		const user = await createUser();
		const headers = { Cookie: user.cookie };
		expect(await (await route('/status', { headers })).json()).toEqual({ linked: false, folder_id: null, folder_name: null });
		expect((await route('/jobs', { headers })).status).toBe(200);
		expect(await (await route('/jobs', { headers })).json()).toEqual([]);
		expect((await route('/folders', { headers })).status).toBe(403);
		expect((await route('/folder', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(400);
		const authorization = await route('/auth', { headers });
		expect(authorization.status).toBe(302);
		expect(new URL(authorization.headers.get('Location')!).searchParams.get('scope')).toContain('drive.file');
	});

	it('handles consent denial, invalid state and refresh-token omission without linking users', async () => {
		const user = await createUser();
		expect((await route('/callback?error=access_denied')).headers.get('Location')).toBe('/settings?drive=denied');
		expect((await route('/callback?code=code&state=bad')).status).toBe(400);
		await env.VRCSTORAGE_KV.put('drive_state:valid', user.uuid);
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ access_token: 'access-only' })));
		const callback = await route('/callback?code=code&state=valid');
		expect(callback.status).toBe(302);
		expect(callback.headers.get('Location')).toBe('/settings?drive=linked');
		expect((await drive().getLinkStatus(user.uuid)).linked).toBe(false);
	});

	it('returns an unlinked status and rejects transfer requests at the HTTP boundary', async () => {
		const { cookie } = await createUser();
		const base = 'http://localhost:8787/api/drive';
		expect((await exports.default.fetch(`${base}/status`)).status).toBe(401);
		expect(await (await exports.default.fetch(`${base}/status`, { headers: { Cookie: cookie } })).json()).toEqual({ linked: false, folder_id: null, folder_name: null });
		const invalid = await exports.default.fetch(`${base}/transfer`, {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: '{}',
		});
		expect(invalid.status).toBe(400);
		const unlinked = await exports.default.fetch(`${base}/transfer`, {
			method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify({ r2_key: 'missing' }),
		});
		expect(unlinked.status).toBe(403);
	});
	it('requires explicit Drive linking before folder preferences or transfers', async () => {
		const { uuid } = await createUser();
		expect(await drive().getLinkStatus(uuid)).toEqual({ linked: false, folder_id: null, folder_name: null });
		await expect(drive().setDefaultFolder(uuid, 'id', 'name')).rejects.toMatchObject({ status: 401 });
		await expect(drive().createTransfer(uuid, 'missing')).rejects.toMatchObject({ status: 401 });
	});

	it('only enqueues existing private files and keeps jobs scoped to the owner', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		await link(owner.uuid);
		await drive().setDefaultFolder(owner.uuid, 'folder-id', 'My folder');
		const image = await createMedia('image');
		const file = await createMedia('file');
		await env.BUCKET.put(file, 'archive-bytes');
		await expect(drive().createTransfer(owner.uuid, image)).rejects.toMatchObject({ status: 400 });
		await expect(drive().createTransfer(owner.uuid, 'missing')).rejects.toMatchObject({ status: 404 });
		const created = await drive().createTransfer(owner.uuid, file);
		const job = await drive().getJob(owner.uuid, created.job_uuid);
		expect(job).toMatchObject({ status: 'queued', file_name: 'archive.zip', total_bytes: 13, bytes_uploaded: 0 });
		expect((await drive().listJobs(owner.uuid))).toHaveLength(1);
		await expect(drive().getJob(other.uuid, created.job_uuid)).rejects.toMatchObject({ status: 404 });
	});
});

describe('Drive API calls', () => {
	it('escapes folder queries and uses the user-scoped cached access token', async () => {
		const { uuid } = await createUser();
		await env.VRCSTORAGE_KV.put(`drive_access:${uuid}`, 'cached-token');
		const fakeFetch = vi.fn().mockResolvedValue(Response.json({ files: [{ id: 'folder', name: 'Named' }] }));
		vi.stubGlobal('fetch', fakeFetch);
		expect(await drive().listFolders(uuid, "folder'\\id")).toEqual([{ id: 'folder', name: 'Named' }]);
		const url = new URL(fakeFetch.mock.calls[0][0]);
		expect(url.searchParams.get('q')).toContain("folder\\'\\\\id");
		expect(fakeFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer cached-token');
	});

	it('reuses existing Drive folders and creates only when none are found', async () => {
		const { uuid } = await createUser();
		await env.VRCSTORAGE_KV.put(`drive_access:${uuid}`, 'cached-token');
		const fakeFetch = vi.fn()
			.mockResolvedValueOnce(Response.json({ files: [{ id: 'existing', name: 'Archive' }] }))
			.mockResolvedValueOnce(Response.json({ files: [] }))
			.mockResolvedValueOnce(Response.json({ id: 'created', name: 'New folder' }));
		vi.stubGlobal('fetch', fakeFetch);
		const service = drive();
		expect(await service.ensureFolder(uuid, 'Archive')).toEqual({ id: 'existing', name: 'Archive' });
		expect(await service.ensureFolder(uuid, 'New folder', 'parent')).toEqual({ id: 'created', name: 'New folder' });
		expect(fakeFetch).toHaveBeenCalledTimes(3);
		expect(JSON.parse(fakeFetch.mock.calls[2][1].body)).toMatchObject({ name: 'New folder', parents: ['parent'] });
	});

	it('rejects insufficient folder scope and ignores trashed or non-folder IDs', async () => {
		const { uuid } = await createUser();
		await env.VRCSTORAGE_KV.put(`drive_access:${uuid}`, 'cached-token');
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce(new Response('insufficientPermissions', { status: 403 }))
			.mockResolvedValueOnce(Response.json({ id: 'file', name: 'Not a folder', mimeType: 'text/plain', trashed: false }))
			.mockResolvedValueOnce(Response.json({ id: 'trash', name: 'Deleted folder', mimeType: 'application/vnd.google-apps.folder', trashed: true })));
		await expect(drive().listFolders(uuid)).rejects.toThrow('scope insufficient');
		expect(await drive().getFolder(uuid, 'file-id')).toBeNull();
		expect(await drive().getFolder(uuid, 'trashed-id')).toBeNull();
	});

	it('clears Drive tokens, folder preferences and cached credentials when unlinking', async () => {
		const { uuid } = await createUser();
		await link(uuid);
		await env.DB.prepare('UPDATE user_oauth_providers SET drive_default_folder_id = ?, drive_default_folder_name = ? WHERE user_uuid = ?')
			.bind('folder-id', 'Folder', uuid).run();
		await env.VRCSTORAGE_KV.put(`drive_access:${uuid}`, 'cached-token');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
		await drive().clearLink(uuid, 'raw-refresh-token');
		expect(await env.VRCSTORAGE_KV.get(`drive_access:${uuid}`)).toBeNull();
		expect(await drive().getLinkStatus(uuid)).toEqual({ linked: false, folder_id: null, folder_name: null });
	});

	it('streams a queued R2 file into the Google resumable endpoint', async () => {
		const { uuid } = await createUser();
		await env.VRCSTORAGE_KV.put(`drive_access:${uuid}`, 'cached-token');
		const key = await createMedia('file');
		await env.BUCKET.put(key, 'file-body');
		const jobUuid = crypto.randomUUID();
		await env.DB.prepare('INSERT INTO drive_transfer_jobs (uuid, user_uuid, r2_key, file_name, status) VALUES (?, ?, ?, ?, ?)').bind(jobUuid, uuid, key, 'archive.zip', 'queued').run();
		const fakeFetch = vi.fn()
			.mockResolvedValueOnce(new Response(null, { status: 200, headers: { Location: 'https://upload.example/session' } }))
			.mockResolvedValueOnce(Response.json({ id: 'google-file-id' }));
		vi.stubGlobal('fetch', fakeFetch);
		await new DriveTransferService(env.DB, env.BUCKET, env.VRCSTORAGE_KV, 'local-client', 'local-secret', env.JWT_SECRET)
			.process({ job_uuid: jobUuid, r2_key: key, user_uuid: uuid, file_name: 'archive.zip', folder_id: null });
		expect(fakeFetch.mock.calls[1][1].headers['Content-Range']).toBe('bytes 0-8/9');
		expect(await drive().getJob(uuid, jobUuid)).toMatchObject({ status: 'completed', google_file_id: 'google-file-id', bytes_uploaded: 9 });
	});

	it('leaves retryable Google 5xx failures queued for the Queue retry policy', async () => {
		const { uuid } = await createUser();
		await env.VRCSTORAGE_KV.put(`drive_access:${uuid}`, 'cached-token');
		const key = await createMedia('file');
		await env.BUCKET.put(key, 'file-body');
		const jobUuid = crypto.randomUUID();
		await env.DB.prepare('INSERT INTO drive_transfer_jobs (uuid, user_uuid, r2_key, file_name, status) VALUES (?, ?, ?, ?, ?)')
			.bind(jobUuid, uuid, key, 'archive.zip', 'queued').run();
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('temporary unavailable', { status: 503 })));
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			await expect(new DriveTransferService(env.DB, env.BUCKET, env.VRCSTORAGE_KV, 'client', 'secret', env.JWT_SECRET)
				.process({ job_uuid: jobUuid, r2_key: key, user_uuid: uuid, file_name: 'archive.zip', folder_id: null })).rejects.toThrow('Drive init failed 503');
			expect(await drive().getJob(uuid, jobUuid)).toMatchObject({ status: 'processing' });
		} finally {
			error.mockRestore();
		}
	});
});
