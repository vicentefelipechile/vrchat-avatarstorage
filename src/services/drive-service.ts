// =========================================================================================================
// DRIVE SERVICE
// =========================================================================================================
// Business logic for Google Drive incremental auth and R2->Drive transfer jobs.
// The R2->Drive resumable upload itself lives in the queue handler, this service owns
// job creation, folder preference, and token/bearer resolution for the request path.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { OAuthRepository } from '../repositories/oauth-repository';
import { DriveTransferRepository } from '../repositories/drive-transfer-repository';
import { decryptSecret, encryptSecret } from '../auth/2fa';
import { refreshGoogleAccessToken, DRIVE_FILE_SCOPE } from '../auth/google';
import { NotFoundError, ValidationError, UnauthorizedError } from '../domain/errors';
import { queryOne } from '../db/client';

// =========================================================================================================
// Constants
// =========================================================================================================

const DRIVE_KV_PREFIX = 'drive_access:';
const DRIVE_KV_TTL = 60 * 50; // 50 min (Google expires in 3600s, refresh a bit early)

// =========================================================================================================
// Service
// =========================================================================================================

export class DriveService {
	private readonly oauthRepo: OAuthRepository;
	private readonly driveRepo: DriveTransferRepository;

	constructor(
		private readonly db: DB,
		private readonly kv: KVNamespace,
		private readonly bucket: R2Bucket,
		private readonly driveQueue: Queue,
		private readonly googleClientId: string,
		private readonly googleSecret: string,
		private readonly jwtSecret: string,
	) {
		this.oauthRepo = new OAuthRepository(db);
		this.driveRepo = new DriveTransferRepository(db);
	}

	// -------------------------------------------------------------------------
	// Drive link status (for Settings / ItemView)
	// -------------------------------------------------------------------------

	async getLinkStatus(userUuid: string): Promise<{ linked: boolean; folder_id: string | null; folder_name: string | null }> {
		const row = await this.oauthRepo.findProviderByUser(userUuid, 'google');
		if (!row?.refresh_token_encrypted) return { linked: false, folder_id: null, folder_name: null };
		return { linked: true, folder_id: row.drive_default_folder_id ?? null, folder_name: row.drive_default_folder_name ?? null };
	}

	// -------------------------------------------------------------------------
	// Persist Drive refresh token after incremental consent
	// -------------------------------------------------------------------------

	async persistDriveTokens(userUuid: string, refreshToken: string): Promise<void> {
		const encrypted = await encryptSecret(refreshToken, this.jwtSecret);
		await this.oauthRepo.updateDriveTokens(userUuid, 'google', encrypted, DRIVE_FILE_SCOPE);
	}

	// -------------------------------------------------------------------------
	// Folder preference (optional)
	// -------------------------------------------------------------------------

	async setDefaultFolder(userUuid: string, folderId: string | null, folderName: string | null): Promise<void> {
		if (folderId && folderId.length > 256) throw new ValidationError('Invalid folder id');
		if (folderName && folderName.length > 256) throw new ValidationError('Invalid folder name');
		// Verify user has Drive linked
		const status = await this.getLinkStatus(userUuid);
		if (!status.linked) throw new UnauthorizedError('Drive not linked');
		await this.oauthRepo.updateDriveFolder(userUuid, 'google', folderId, folderName);
	}

	async clearLink(userUuid: string, rawRefreshToken?: string): Promise<void> {
		// Best-effort revoke at Google if we have the raw token
		if (rawRefreshToken) {
			try {
				const { revokeGoogleToken } = await import('../auth/google');
				await revokeGoogleToken(rawRefreshToken);
			} catch {
				// ignore
			}
		}
		await this.oauthRepo.clearDriveLink(userUuid, 'google');
		await this.kv.delete(`${DRIVE_KV_PREFIX}${userUuid}`);
	}

	async getDecryptedRefreshToken(userUuid: string): Promise<string | null> {
		const row = await this.oauthRepo.findProviderByUser(userUuid, 'google');
		if (!row?.refresh_token_encrypted) return null;
		return decryptSecret(row.refresh_token_encrypted, this.jwtSecret);
	}

	// -------------------------------------------------------------------------
	// Access token resolution (KV cache + refresh)
	// -------------------------------------------------------------------------

	async getAccessToken(userUuid: string): Promise<string> {
		const cached = await this.kv.get<string>(`${DRIVE_KV_PREFIX}${userUuid}`);
		if (cached) return cached;

		const row = await this.oauthRepo.findProviderByUser(userUuid, 'google');
		if (!row?.refresh_token_encrypted) throw new UnauthorizedError('Drive not linked');
		const refreshToken = await decryptSecret(row.refresh_token_encrypted, this.jwtSecret);
		if (!refreshToken) throw new UnauthorizedError('Drive token invalid');

		const { access_token, expires_in } = await refreshGoogleAccessToken(refreshToken, this.googleClientId, this.googleSecret);
		await this.kv.put(`${DRIVE_KV_PREFIX}${userUuid}`, access_token, { expirationTtl: Math.min(expires_in - 60, DRIVE_KV_TTL) });
		return access_token;
	}

	// -------------------------------------------------------------------------
	// List folders in user's Drive (for picker)
	// -------------------------------------------------------------------------

	async listFolders(userUuid: string, parentId: string | null = null): Promise<Array<{ id: string; name: string }>> {
		const accessToken = await this.getAccessToken(userUuid);
		const parentClause = parentId ? `'${parentId.replace(/'/g, "\\'")}' in parents` : `'root' in parents`;
		const q = encodeURIComponent(`${parentClause} and mimeType='application/vnd.google-apps.folder' and trashed=false`);
		const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=100&fields=files(id,name)&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;
		const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
		if (!res.ok) {
			const err = await res.text();
			if (res.status === 403 && err.includes('insufficientPermissions')) throw new Error('Drive scope insufficient — reconecta Drive');
			throw new Error(`Drive list failed ${res.status}: ${err}`);
		}
		const data = (await res.json()) as { files?: Array<{ id: string; name: string }> };
		return data.files ?? [];
	}

	async getFolder(userUuid: string, folderId: string): Promise<{ id: string; name: string } | null> {
		const accessToken = await this.getAccessToken(userUuid);
		const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { id: string; name: string; mimeType: string; trashed: boolean };
		if (data.trashed || data.mimeType !== 'application/vnd.google-apps.folder') return null;
		return { id: data.id, name: data.name };
	}

	async ensureFolder(userUuid: string, name: string, parentId: string | null = null): Promise<{ id: string; name: string }> {
		const accessToken = await this.getAccessToken(userUuid);
		const parentClause = parentId ? ` and '${parentId.replace(/'/g, "\\'")}' in parents` : ` and 'root' in parents`;
		const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and trashed=false and name='${name.replace(/'/g, "\\'")}'${parentClause}`);
		const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=10&fields=files(id,name)`;
		const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
		if (listRes.ok) {
			const listData = (await listRes.json()) as { files?: Array<{ id: string; name: string }> };
			const found = listData.files?.[0];
			if (found) return found;
		}
		const body: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' };
		if (parentId) body.parents = [parentId];
		const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
			method: 'POST',
			headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		if (!createRes.ok) {
			const err = await createRes.text();
			throw new Error(`Drive create folder failed ${createRes.status}: ${err}`);
		}
		return (await createRes.json()) as { id: string; name: string };
	}

	// -------------------------------------------------------------------------
	// Create transfer job (R2 -> Drive via Queue)
	// -------------------------------------------------------------------------

	async createTransfer(userUuid: string, r2Key: string, folderIdOverride: string | null = null): Promise<{ job_uuid: string }> {
		// Must be linked
		const status = await this.getLinkStatus(userUuid);
		if (!status.linked) throw new UnauthorizedError('Drive not linked. Connect Drive first.');

		// Validate R2 object exists and is a local file (resolve via DownloadService semantics)
		const media = await queryOne<{ uuid: string; r2_key: string; media_type: string; file_name: string }>(this.db, 'SELECT uuid, r2_key, media_type, file_name FROM media WHERE r2_key = ?', [r2Key]);
		if (!media) throw new NotFoundError('File not found');
		if (media.media_type === 'image' || media.media_type === 'video') throw new ValidationError('Use the CDN for images/videos; Drive transfer is for local files only');

		// Verify R2 object actually exists
		const obj = await this.bucket.head(r2Key);
		if (!obj) throw new NotFoundError('File not found in storage');

		const jobUuid = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);
		const folderId = folderIdOverride ?? status.folder_id ?? null;

		await this.driveRepo.create({
			uuid: jobUuid,
			user_uuid: userUuid,
			r2_key: r2Key,
			file_name: media.file_name,
			folder_id: folderId,
			status: 'queued',
			google_file_id: null,
			error: null,
			created_at: now,
			updated_at: now,
		});

		// Enqueue — fire-and-forget via waitUntil at the route, but await here for type safety; route will waitUntil.
		await this.driveQueue.send({ job_uuid: jobUuid, r2_key: r2Key, user_uuid: userUuid, file_name: media.file_name, folder_id: folderId });

		return { job_uuid: jobUuid };
	}

	async getJob(userUuid: string, jobUuid: string): Promise<{ uuid: string; status: string; google_file_id: string | null; error: string | null; file_name: string }> {
		const job = await this.driveRepo.findByUuid(jobUuid);
		if (!job || job.user_uuid !== userUuid) throw new NotFoundError('Job not found');
		return { uuid: job.uuid, status: job.status, google_file_id: job.google_file_id, error: job.error, file_name: job.file_name };
	}

	async listJobs(userUuid: string): Promise<ReturnType<DriveTransferRepository['findByUser']>> {
		return this.driveRepo.findByUser(userUuid, 20);
	}
}
