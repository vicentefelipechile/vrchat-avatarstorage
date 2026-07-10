// =========================================================================================================
// FAVORITE REPOSITORY
// =========================================================================================================
// The ONLY place `user_favorites` SQL lives, plus the read-side join into `resources`/
// `media`/`users` that hydrates a user's favorites list. Ordering (display_order) is
// scoped per user per collection. Methods return DB row types; mapping to the API shape
// is the service's job.
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
	placeholder_blur: string | null;
	author_username: string | null;
	author_avatar: string | null;
	display_order: number;
	favorite_created_at: number;
	collection_uuid: string | null;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class FavoriteRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Total active favorites for a user in a specific collection (NULL = uncategorized). */
	async countInCollection(userUuid: string, collectionUuid: string | null): Promise<number> {
		const row = await queryOne<{ total: number }>(
			this.db,
			collectionUuid === null
				? 'SELECT COUNT(*) AS total FROM user_favorites uf JOIN resources r ON uf.resource_uuid = r.uuid WHERE uf.user_uuid = ? AND uf.collection_uuid IS NULL AND r.is_active = 1'
				: 'SELECT COUNT(*) AS total FROM user_favorites uf JOIN resources r ON uf.resource_uuid = r.uuid WHERE uf.user_uuid = ? AND uf.collection_uuid = ? AND r.is_active = 1',
			collectionUuid === null ? [userUuid] : [userUuid, collectionUuid],
		);
		return row?.total ?? 0;
	}

	/** Total active favorites for a user across all collections (for "All" tab). */
	async countAll(userUuid: string): Promise<number> {
		const row = await queryOne<{ total: number }>(
			this.db,
			'SELECT COUNT(*) AS total FROM user_favorites uf JOIN resources r ON uf.resource_uuid = r.uuid WHERE uf.user_uuid = ? AND r.is_active = 1',
			[userUuid],
		);
		return row?.total ?? 0;
	}

	/**
	 * A user's favorites in a specific collection, hydrated with resource + author fields.
	 * Capped at 500 (no pagination). Pass `null` for uncategorized.
	 */
	list(userUuid: string, collectionUuid: string | null): Promise<FavoriteRow[]> {
		const whereClause =
			collectionUuid === null ? 'uf.user_uuid = ? AND uf.collection_uuid IS NULL' : 'uf.user_uuid = ? AND uf.collection_uuid = ?';
		const params = collectionUuid === null ? [userUuid] : [userUuid, collectionUuid];

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
				m.placeholder_blur,
				u.username AS author_username,
				u.avatar_url AS author_avatar,
				uf.display_order,
				uf.created_at AS favorite_created_at,
				uf.collection_uuid
			FROM user_favorites uf
			JOIN resources r ON uf.resource_uuid = r.uuid
			JOIN media m ON r.thumbnail_uuid = m.uuid
			JOIN users u ON r.author_uuid = u.uuid
			WHERE ${whereClause} AND r.is_active = 1
			ORDER BY uf.display_order DESC, uf.created_at DESC
			LIMIT 500`,
			params,
		);
	}

	/** All favorites across all collections (for "All" tab). Read-only, no reorder. */
	listAll(userUuid: string): Promise<FavoriteRow[]> {
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
				m.placeholder_blur,
				u.username AS author_username,
				u.avatar_url AS author_avatar,
				uf.display_order,
				uf.created_at AS favorite_created_at,
				uf.collection_uuid
			FROM user_favorites uf
			JOIN resources r ON uf.resource_uuid = r.uuid
			JOIN media m ON r.thumbnail_uuid = m.uuid
			JOIN users u ON r.author_uuid = u.uuid
			WHERE uf.user_uuid = ? AND r.is_active = 1
			ORDER BY uf.display_order DESC, uf.created_at DESC
			LIMIT 500`,
			[userUuid],
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

	/** Resource UUIDs in a specific collection (for reorder validation). */
	async listUuidsInCollection(userUuid: string, collectionUuid: string | null): Promise<string[]> {
		const rows = await queryAll<{ resource_uuid: string }>(
			this.db,
			collectionUuid === null
				? 'SELECT resource_uuid FROM user_favorites WHERE user_uuid = ? AND collection_uuid IS NULL'
				: 'SELECT resource_uuid FROM user_favorites WHERE user_uuid = ? AND collection_uuid = ?',
			collectionUuid === null ? [userUuid] : [userUuid, collectionUuid],
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

	/** Highest display_order in a specific collection (0 if empty). */
	async maxOrderInCollection(userUuid: string, collectionUuid: string | null): Promise<number> {
		const row = await queryOne<{ max_order: number | null }>(
			this.db,
			collectionUuid === null
				? 'SELECT MAX(display_order) AS max_order FROM user_favorites WHERE user_uuid = ? AND collection_uuid IS NULL'
				: 'SELECT MAX(display_order) AS max_order FROM user_favorites WHERE user_uuid = ? AND collection_uuid = ?',
			collectionUuid === null ? [userUuid] : [userUuid, collectionUuid],
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

	/** Insert a favorite with an explicit display_order and optional collection. */
	async insert(userUuid: string, resourceUuid: string, displayOrder: number, collectionUuid: string | null): Promise<void> {
		await execute(
			this.db,
			'INSERT INTO user_favorites (user_uuid, resource_uuid, display_order, collection_uuid) VALUES (?, ?, ?, ?)',
			[userUuid, resourceUuid, displayOrder, collectionUuid],
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

	/** Move a favorite to a different collection and assign it to the end of that collection's order. */
	async updateCollection(userUuid: string, resourceUuid: string, collectionUuid: string | null, displayOrder: number): Promise<void> {
		await execute(
			this.db,
			'UPDATE user_favorites SET collection_uuid = ?, display_order = ? WHERE user_uuid = ? AND resource_uuid = ?',
			[collectionUuid, displayOrder, userUuid, resourceUuid],
		);
	}

	/** Returns a prepared statement for batch-updating a favorite's display_order. */
	buildUpdateOrder(userUuid: string, resourceUuid: string, displayOrder: number): D1PreparedStatement {
		return this.db
			.prepare('UPDATE user_favorites SET display_order = ? WHERE user_uuid = ? AND resource_uuid = ?')
			.bind(displayOrder, userUuid, resourceUuid);
	}
}
