// =========================================================================================================
// FAVORITE REPOSITORY
// =========================================================================================================
// The ONLY place `user_favorites` SQL lives, plus the read-side join into `resources`/
// `media`/`users` that hydrates a user's favorites list. Ordering (display_order) and
// the existence checks are expressed here as plain queries; the service decides what the
// results mean (already-favorited, not-found, etc.).
//
// Methods return DB row types; mapping to the API shape is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';

// =========================================================================================================
// Types
// =========================================================================================================

/** One hydrated favorite row (resource card + author + favorite ordering metadata). */
export interface FavoriteRow {
	uuid: string;
	title: string;
	description: string | null;
	category: string;
	thumbnail_uuid: string;
	download_count: number;
	created_at: number;
	updated_at: number;
	thumbnail_key: string | null;
	author_username: string | null;
	author_avatar: string | null;
	display_order: number;
	favorite_created_at: number;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class FavoriteRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Total active favorites for a user (for pagination). */
	async count(userUuid: string): Promise<number> {
		const row = await queryOne<{ total: number }>(
			this.db,
			'SELECT COUNT(*) AS total FROM user_favorites WHERE user_uuid = ?',
			[userUuid],
		);
		return row?.total ?? 0;
	}

	/** A page of a user's favorites, hydrated with resource + author fields, ordered for display. */
	list(userUuid: string, limit: number, offset: number): Promise<FavoriteRow[]> {
		return queryAll<FavoriteRow>(
			this.db,
			`SELECT
				r.uuid,
				r.title,
				r.description,
				r.category,
				r.thumbnail_uuid,
				r.download_count,
				r.created_at,
				r.updated_at,
				m.r2_key AS thumbnail_key,
				u.username AS author_username,
				u.avatar_url AS author_avatar,
				uf.display_order,
				uf.created_at AS favorite_created_at
			FROM user_favorites uf
			JOIN resources r ON uf.resource_uuid = r.uuid
			JOIN media m ON r.thumbnail_uuid = m.uuid
			JOIN users u ON r.author_uuid = u.uuid
			WHERE uf.user_uuid = ? AND r.is_active = 1
			ORDER BY uf.display_order DESC, uf.created_at DESC
			LIMIT ? OFFSET ?`,
			[userUuid, limit, offset],
		);
	}

	/** All favorited resource UUIDs for a user (lightweight, for UI state). */
	async listIds(userUuid: string): Promise<string[]> {
		const rows = await queryAll<{ resource_uuid: string }>(
			this.db,
			'SELECT resource_uuid FROM user_favorites WHERE user_uuid = ?',
			[userUuid],
		);
		return rows.map((r) => r.resource_uuid);
	}

	/** Whether a specific resource is favorited by a user. */
	async exists(userUuid: string, resourceUuid: string): Promise<boolean> {
		const row = await queryOne<{ one: number }>(
			this.db,
			'SELECT 1 AS one FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?',
			[userUuid, resourceUuid],
		);
		return row !== null;
	}

	/** The display_order of a favorite, or null if the pair doesn't exist. */
	async findOrder(userUuid: string, resourceUuid: string): Promise<number | null> {
		const row = await queryOne<{ display_order: number }>(
			this.db,
			'SELECT display_order FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?',
			[userUuid, resourceUuid],
		);
		return row?.display_order ?? null;
	}

	/** Highest display_order among a user's favorites (0 if they have none). */
	async maxOrder(userUuid: string): Promise<number> {
		const row = await queryOne<{ max_order: number | null }>(
			this.db,
			'SELECT MAX(display_order) AS max_order FROM user_favorites WHERE user_uuid = ?',
			[userUuid],
		);
		return row?.max_order ?? 0;
	}

	/** Minimal resource existence/activity lookup used to validate an add. */
	findResource(resourceUuid: string): Promise<{ uuid: string; is_active: number } | null> {
		return queryOne<{ uuid: string; is_active: number }>(
			this.db,
			'SELECT uuid, is_active FROM resources WHERE uuid = ?',
			[resourceUuid],
		);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a favorite with an explicit display_order. */
	async insert(userUuid: string, resourceUuid: string, displayOrder: number): Promise<void> {
		await execute(
			this.db,
			'INSERT INTO user_favorites (user_uuid, resource_uuid, display_order) VALUES (?, ?, ?)',
			[userUuid, resourceUuid, displayOrder],
		);
	}

	/** Remove a favorite. Returns the number of rows deleted (0 = nothing matched). */
	async delete(userUuid: string, resourceUuid: string): Promise<number> {
		const result = await execute(
			this.db,
			'DELETE FROM user_favorites WHERE user_uuid = ? AND resource_uuid = ?',
			[userUuid, resourceUuid],
		);
		return result.meta.changes ?? 0;
	}

	/** Update a favorite's display_order. */
	async updateOrder(userUuid: string, resourceUuid: string, displayOrder: number): Promise<void> {
		await execute(
			this.db,
			'UPDATE user_favorites SET display_order = ? WHERE user_uuid = ? AND resource_uuid = ?',
			[displayOrder, userUuid, resourceUuid],
		);
	}
}
