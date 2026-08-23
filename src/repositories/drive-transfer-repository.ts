// =========================================================================================================
// DRIVE TRANSFER REPOSITORY
// =========================================================================================================
// ALL SQL for drive_transfer_jobs. Mirrors the other repositories: only SQL, no business logic.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, execute, type DB } from '../db/client';
import type { DriveTransferJobRow } from '../db/schema';

// =========================================================================================================
// Repository
// =========================================================================================================

export class DriveTransferRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	async create(job: DriveTransferJobRow): Promise<void> {
		await execute(
			this.db,
			`INSERT INTO drive_transfer_jobs (uuid, user_uuid, r2_key, file_name, folder_id, status, google_file_id, error, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[job.uuid, job.user_uuid, job.r2_key, job.file_name, job.folder_id, job.status, job.google_file_id, job.error, job.created_at, job.updated_at],
		);
	}

	async updateStatus(uuid: string, status: DriveTransferJobRow['status'], googleFileId: string | null = null, error: string | null = null): Promise<void> {
		await execute(this.db, `UPDATE drive_transfer_jobs SET status = ?, google_file_id = COALESCE(?, google_file_id), error = COALESCE(?, error), updated_at = unixepoch() WHERE uuid = ?`, [
			status,
			googleFileId,
			error,
			uuid,
		]);
	}

	async updateCompleted(uuid: string, googleFileId: string): Promise<void> {
		await execute(this.db, `UPDATE drive_transfer_jobs SET status = 'completed', google_file_id = ?, updated_at = unixepoch() WHERE uuid = ?`, [googleFileId, uuid]);
	}

	async updateFailed(uuid: string, error: string): Promise<void> {
		await execute(this.db, `UPDATE drive_transfer_jobs SET status = 'failed', error = ?, updated_at = unixepoch() WHERE uuid = ?`, [error, uuid]);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	findByUuid(uuid: string): Promise<DriveTransferJobRow | null> {
		return queryOne<DriveTransferJobRow>(this.db, 'SELECT * FROM drive_transfer_jobs WHERE uuid = ?', [uuid]);
	}

	async findByUser(userUuid: string, limit = 20): Promise<DriveTransferJobRow[]> {
		const { queryAll } = await import('../db/client');
		return queryAll<DriveTransferJobRow>(this.db, 'SELECT * FROM drive_transfer_jobs WHERE user_uuid = ? ORDER BY created_at DESC LIMIT ?', [userUuid, limit]);
	}
}
