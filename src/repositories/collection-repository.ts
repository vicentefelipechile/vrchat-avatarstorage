// =========================================================================================================
// COLLECTION REPOSITORY
// =========================================================================================================
// The ONLY place `user_collections` SQL lives. Manages named collections that group a
// user's favorites. Methods return DB row types; mapping to the API shape is the service's
// job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';

// =========================================================================================================
// Types
// =========================================================================================================

/** A collection row with the count of favorites it contains. */
export interface CollectionRow {
	uuid: string;
	user_uuid: string;
	name: string;
	display_order: number;
	created_at: number;
	favorite_count: number;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class CollectionRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** All collections for a user, with a count of active favorites in each. */
	list(userUuid: string): Promise<CollectionRow[]> {
		return queryAll<CollectionRow>(
			this.db,
			`SELECT
				c.uuid,
				c.user_uuid,
				c.name,
				c.display_order,
				c.created_at,
				COUNT(uf.resource_uuid) AS favorite_count
			FROM user_collections c
			LEFT JOIN user_favorites uf ON uf.collection_uuid = c.uuid
			LEFT JOIN resources r ON uf.resource_uuid = r.uuid AND r.is_active = 1
			WHERE c.user_uuid = ?
			GROUP BY c.uuid
			ORDER BY c.display_order DESC, c.created_at DESC`,
			[userUuid],
		);
	}

	/** Single collection lookup (ownership check). */
	findByUuid(uuid: string): Promise<{ uuid: string; user_uuid: string; name: string } | null> {
		return queryOne<{ uuid: string; user_uuid: string; name: string }>(
			this.db,
			'SELECT uuid, user_uuid, name FROM user_collections WHERE uuid = ?',
			[uuid],
		);
	}

	/** Duplicate name check within a user's collections. */
	findByName(userUuid: string, name: string): Promise<{ uuid: string } | null> {
		return queryOne<{ uuid: string }>(
			this.db,
			'SELECT uuid FROM user_collections WHERE user_uuid = ? AND name = ?',
			[userUuid, name],
		);
	}

	/** Total collections for a user (for cap enforcement). */
	async count(userUuid: string): Promise<number> {
		const row = await queryOne<{ total: number }>(
			this.db,
			'SELECT COUNT(*) AS total FROM user_collections WHERE user_uuid = ?',
			[userUuid],
		);
		return row?.total ?? 0;
	}

	/** Highest display_order among a user's collections (0 if none). */
	async maxOrder(userUuid: string): Promise<number> {
		const row = await queryOne<{ max_order: number | null }>(
			this.db,
			'SELECT MAX(display_order) AS max_order FROM user_collections WHERE user_uuid = ?',
			[userUuid],
		);
		return row?.max_order ?? 0;
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a new collection. */
	async insert(uuid: string, userUuid: string, name: string, displayOrder: number): Promise<void> {
		await execute(
			this.db,
			'INSERT INTO user_collections (uuid, user_uuid, name, display_order) VALUES (?, ?, ?, ?)',
			[uuid, userUuid, name, displayOrder],
		);
	}

	/** Rename a collection. */
	async update(uuid: string, name: string): Promise<void> {
		await execute(this.db, 'UPDATE user_collections SET name = ? WHERE uuid = ?', [name, uuid]);
	}

	/** Delete a collection. FK ON DELETE SET NULL moves favorites to uncategorized. */
	async delete(uuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM user_collections WHERE uuid = ?', [uuid]);
	}

	/** Returns a prepared statement for batch-updating a collection's display_order. */
	buildUpdateOrder(uuid: string, displayOrder: number): D1PreparedStatement {
		return this.db.prepare('UPDATE user_collections SET display_order = ? WHERE uuid = ?').bind(displayOrder, uuid);
	}
}
