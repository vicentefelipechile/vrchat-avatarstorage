// =========================================================================================================
// SHARE LINK REPOSITORY
// =========================================================================================================
// The ONLY place `share_links` SQL lives. Reads return DB row types; deciding what a row
// means (expired vs exhausted vs revoked) is the service's job — except `consume`, which
// folds the check and the increment into a single atomic UPDATE so two concurrent GETs
// with max_uses = 1 cannot both succeed.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';

// =========================================================================================================
// Types
// =========================================================================================================

/** DB row mirror of the `share_links` table (snake_case, exactly as stored). */
export interface ShareLinkRow {
	uuid: string;
	token: string;
	media_uuid: string;
	r2_key: string;
	created_by: string;
	expires_at: number;
	max_uses: number | null;
	uses: number;
	revoked: number;
	created_at: number;
}

/** Owner-facing list row: the shared file's name for display. */
export interface ShareLinkListRow extends ShareLinkRow {
	file_name: string;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class ShareLinkRepository {
	constructor(private readonly db: DB) {}

	/** Insert a new share link. */
	async insert(row: Omit<ShareLinkRow, 'uses' | 'revoked' | 'created_at'>): Promise<void> {
		await execute(
			this.db,
			'INSERT INTO share_links (uuid, token, media_uuid, r2_key, created_by, expires_at, max_uses) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[row.uuid, row.token, row.media_uuid, row.r2_key, row.created_by, row.expires_at, row.max_uses],
		);
	}

	/** Look up a link by its opaque token, or null. */
	findByToken(token: string): Promise<ShareLinkRow | null> {
		return queryOne<ShareLinkRow>(this.db, 'SELECT * FROM share_links WHERE token = ?', [token]);
	}

	/** All links created by a user, newest first, with the file name for display. */
	listByOwner(userUuid: string): Promise<ShareLinkListRow[]> {
		return queryAll<ShareLinkListRow>(
			this.db,
			`SELECT s.*, m.file_name AS file_name FROM share_links s
			   JOIN media m ON m.uuid = s.media_uuid
			  WHERE s.created_by = ? ORDER BY s.created_at DESC`,
			[userUuid],
		);
	}

	/** Revoke a link owned by the user. Returns true if a row was revoked. */
	async revoke(uuid: string, userUuid: string): Promise<boolean> {
		const res = await execute(this.db, 'UPDATE share_links SET revoked = 1 WHERE uuid = ? AND created_by = ?', [uuid, userUuid]);
		return (res.meta.changes ?? 0) > 0;
	}

	/**
	 * Atomically consume one use: increments `uses` only if the link is live (not revoked,
	 * not expired, under max_uses). Returns true when the caller may serve the file.
	 */
	async consume(token: string, now: number): Promise<boolean> {
		const res = await execute(
			this.db,
			`UPDATE share_links SET uses = uses + 1
			  WHERE token = ? AND revoked = 0 AND expires_at > ?
			    AND (max_uses IS NULL OR uses < max_uses)`,
			[token, now],
		);
		return (res.meta.changes ?? 0) > 0;
	}
}
