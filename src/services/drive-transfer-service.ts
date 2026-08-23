// =========================================================================================================
// DRIVE TRANSFER SERVICE — Queue consumer (R2 -> Google Drive resumable upload)
// =========================================================================================================
// Runs in `queue` entrypoint. For each message: R2 head -> resolve Drive access token
// (decrypt refresh_token + refresh) -> initiate resumable session -> stream R2 by ranged
// GETs -> PUT chunks to the resumable Location. Updates drive_transfer_jobs status.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import type { DriveTransferMessage } from '../types';
import { DriveTransferRepository } from '../repositories/drive-transfer-repository';
import { OAuthRepository } from '../repositories/oauth-repository';
import { decryptSecret } from '../auth/2fa';
import { refreshGoogleAccessToken } from '../auth/google';

// =========================================================================================================
// Constants
// =========================================================================================================

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB — balanced between requests and memory
const DRIVE_UPLOAD_INIT_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';

// =========================================================================================================
// Service
// =========================================================================================================

export class DriveTransferService {
	private readonly driveRepo: DriveTransferRepository;
	private readonly oauthRepo: OAuthRepository;

	constructor(
		private readonly db: DB,
		private readonly bucket: R2Bucket,
		private readonly kv: KVNamespace,
		private readonly googleClientId: string,
		private readonly googleSecret: string,
		private readonly jwtSecret: string,
	) {
		this.driveRepo = new DriveTransferRepository(db);
		this.oauthRepo = new OAuthRepository(db);
	}

	async process(msg: DriveTransferMessage): Promise<void> {
		const { job_uuid, r2_key, user_uuid, file_name, folder_id } = msg;

		await this.driveRepo.updateStatus(job_uuid, 'processing');

		try {
			const head = await this.bucket.head(r2_key);
			if (!head) throw new Error(`R2 object not found: ${r2_key}`);
			const size = head.size;
			const mime = head.httpMetadata?.contentType ?? 'application/octet-stream';

			const accessToken = await this.resolveAccessToken(user_uuid);

			// 1. Initiate resumable session
			const initRes = await fetch(DRIVE_UPLOAD_INIT_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json; charset=UTF-8',
					'X-Upload-Content-Type': mime,
					'X-Upload-Content-Length': String(size),
				},
				body: JSON.stringify({
					name: file_name,
					parents: folder_id ? [folder_id] : undefined,
				}),
			});

			if (!initRes.ok) {
				const err = await initRes.text();
				throw new Error(`Drive init failed ${initRes.status}: ${err}`);
			}

			const location = initRes.headers.get('Location');
			if (!location) throw new Error('Drive init did not return Location header');

			// 2. Stream chunks via ranged R2 GETs -> PUT to Location
			let offset = 0;
			let googleFileId: string | null = null;

			while (offset < size) {
				const length = Math.min(CHUNK_SIZE, size - offset);
				const rangeObj = await this.bucket.get(r2_key, { range: { offset, length } });
				if (!rangeObj) throw new Error(`R2 range missing at ${offset}`);

				const chunk = await rangeObj.arrayBuffer();
				const end = offset + chunk.byteLength - 1;

				const putRes = await fetch(location, {
					method: 'PUT',
					headers: {
						'Content-Length': String(chunk.byteLength),
						'Content-Range': `bytes ${offset}-${end}/${size}`,
					},
					body: chunk,
				});

				// 308 Resume Incomplete -> continue
				if (putRes.status === 308) {
					offset += chunk.byteLength;
					continue;
				}

				if (!putRes.ok) {
					const err = await putRes.text();
					throw new Error(`Drive chunk PUT failed ${putRes.status}: ${err}`);
				}

				// 200/201 with JSON { id: "...", name: "..." }
				const data = (await putRes.json()) as { id?: string };
				googleFileId = data.id ?? null;
				offset += chunk.byteLength;
				break;
			}

			// Handle case where last chunk was exactly at boundary and we already got googleFileId,
			// otherwise after loop we should have it.
			if (!googleFileId) {
				// If size was 0 or we need to fetch status — try Location GET
				const statusRes = await fetch(location, { method: 'PUT', headers: { 'Content-Range': `bytes */${size}` } });
				if (statusRes.ok) {
					const data = (await statusRes.json().catch(() => null)) as { id?: string } | null;
					googleFileId = data?.id ?? null;
				}
			}

			if (!googleFileId) throw new Error('Drive upload completed but no file id returned');

			await this.driveRepo.updateCompleted(job_uuid, googleFileId);
		} catch (e) {
			const msg_ = e instanceof Error ? e.message : String(e);
			console.error(`[DRIVE_QUEUE] failed ${job_uuid}:`, msg_);
			// Token/auth errors are retryable (refresh may fix); quota errors not
			const retryable = msg_.includes('401') || msg_.includes('403') || msg_.includes('429') || msg_.includes('5');
			if (retryable) throw e; // msg.retry() in handler
			await this.driveRepo.updateFailed(job_uuid, msg_.slice(0, 500));
		}
	}

	private async resolveAccessToken(userUuid: string): Promise<string> {
		const cached = await this.kv.get<string>(`drive_access:${userUuid}`);
		if (cached) return cached;

		const row = await this.oauthRepo.findProviderByUser(userUuid, 'google');
		if (!row?.refresh_token_encrypted) throw new Error('Drive not linked');
		const refreshToken = await decryptSecret(row.refresh_token_encrypted, this.jwtSecret);
		if (!refreshToken) throw new Error('Drive token decrypt failed');
		const { access_token, expires_in } = await refreshGoogleAccessToken(refreshToken, this.googleClientId, this.googleSecret);
		await this.kv.put(`drive_access:${userUuid}`, access_token, { expirationTtl: Math.min(expires_in - 60, 3000) });
		return access_token;
	}
}
