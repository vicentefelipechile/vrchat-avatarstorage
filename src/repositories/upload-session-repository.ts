// =========================================================================================================
// UPLOAD SESSION REPOSITORY
// Durable session ownership, activity and acknowledged multipart parts.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { batch, execute, queryAll, queryOne, type DB } from '../db/client';
import type { UploadSessionRow, UploadPartRow } from '../db/schema';

// =========================================================================================================
// Repository
// =========================================================================================================

export class UploadSessionRepository {
	constructor(private readonly db: DB) {}

	find(uploadId: string) {
		return queryOne<UploadSessionRow>(this.db, 'SELECT * FROM upload_sessions WHERE upload_id = ?', [uploadId]);
	}

	async insert(uploadId: string, key: string, userUuid: string, filename: string, mediaType: string, size: number) {
		const now = Date.now();
		await batch(this.db, [
			this.db.prepare('DELETE FROM upload_sessions WHERE created_at < ?').bind(now - 7 * 86400_000),
			this.db.prepare('INSERT INTO upload_sessions (upload_id, r2_key, user_uuid, filename, media_type, file_size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(uploadId, key, userUuid, filename, mediaType, size, now, now),
		]);
	}

	parts(uploadId: string) {
		return queryAll<UploadPartRow>(this.db, 'SELECT * FROM upload_parts WHERE upload_id = ? ORDER BY part_number', [uploadId]);
	}

	async hasFirstPart(uploadId: string): Promise<boolean> {
		return (await queryOne(this.db, 'SELECT 1 FROM upload_parts WHERE upload_id = ? AND part_number = 1', [uploadId])) !== null;
	}

	touch(uploadId: string) {
		return execute(this.db, "UPDATE upload_sessions SET updated_at = ? WHERE upload_id = ? AND state = 'uploading'", [Date.now(), uploadId]);
	}

	async acknowledge(uploadId: string, part: R2UploadedPart, size: number) {
		await batch(this.db, [
			this.db
				.prepare(
					`INSERT INTO upload_parts (upload_id, part_number, etag, byte_size)
				SELECT upload_id, ?, ?, ? FROM upload_sessions WHERE upload_id = ? AND state = 'uploading'
				ON CONFLICT(upload_id, part_number) DO UPDATE SET etag = excluded.etag, byte_size = excluded.byte_size`,
				)
				.bind(part.partNumber, part.etag, size, uploadId),
			this.db.prepare("UPDATE upload_sessions SET updated_at = ? WHERE upload_id = ? AND state = 'uploading'").bind(Date.now(), uploadId),
		]);
	}

	async transition(uploadId: string, from: string, to: string): Promise<boolean> {
		const result = await execute(this.db, 'UPDATE upload_sessions SET state = ?, updated_at = ? WHERE upload_id = ? AND state = ?', [to, Date.now(), uploadId, from]);
		return result.meta.changes === 1;
	}

	buildComplete(uploadId: string) {
		return this.db.prepare("UPDATE upload_sessions SET state = 'complete', updated_at = ? WHERE upload_id = ? AND state = 'completing'").bind(Date.now(), uploadId);
	}
}

// =========================================================================================================
// Export
// =========================================================================================================
