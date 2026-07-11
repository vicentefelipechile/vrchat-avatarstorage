// =========================================================================================================
// ADMIN REPOSITORY
// =========================================================================================================
// The home for the cross-cutting admin/moderation SQL that doesn't belong to a single domain table:
// the pending-resource queue, resource approve/reject/deactivate state changes, the orphaned-media
// detection (a union across resources / blog_posts / free-text references), dashboard stats, and the
// paginated user/resource admin listings. Methods return DB row types; the service decides what they
// mean and shapes the API payloads.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';
import type { Resource, Media } from '../types';

// =========================================================================================================
// Constants
// =========================================================================================================

/** The orphaned-media predicate, shared by the stats count, the listing, and the cleanup. A media
 *  row is orphaned when nothing references it: no resource thumbnail/reference/attachment, no blog
 *  cover, and no free-text mention in user avatars, author avatars, comments, blog comments, or
 *  post bodies. */
const ORPHANED_MEDIA_PREDICATE = `
	m.uuid NOT IN (
		SELECT thumbnail_uuid FROM resources WHERE thumbnail_uuid IS NOT NULL
		UNION SELECT reference_image_uuid FROM resources WHERE reference_image_uuid IS NOT NULL
		UNION SELECT media_uuid FROM resource_n_media
		UNION SELECT cover_image_uuid FROM blog_posts WHERE cover_image_uuid IS NOT NULL
	)
	AND NOT EXISTS (SELECT 1 FROM users          WHERE INSTR(users.avatar_url,          m.r2_key) > 0)
	AND NOT EXISTS (SELECT 1 FROM avatar_authors WHERE INSTR(avatar_authors.avatar_url, m.r2_key) > 0)
	AND NOT EXISTS (SELECT 1 FROM comments       WHERE INSTR(comments.text,             m.r2_key) > 0)
	AND NOT EXISTS (SELECT 1 FROM blog_comments  WHERE INSTR(blog_comments.text,        m.r2_key) > 0)
	AND NOT EXISTS (SELECT 1 FROM blog_posts     WHERE INSTR(blog_posts.content,        m.r2_key) > 0)`;

// =========================================================================================================
// Types
// =========================================================================================================

/** A pending resource row hydrated with its thumbnail key + author. */
export type PendingResourceRow = Resource & {
	thumbnail_key: string | null;
	author_username: string | null;
	author_avatar: string | null;
};

/** One admin user-listing row. */
export interface AdminUserRow {
	uuid: string;
	username: string;
	avatar_url: string | null;
	is_admin: number;
	created_at: number;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class AdminRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Pending resources / moderation
	// -------------------------------------------------------------------------

	/** All inactive resources, newest first, hydrated with thumbnail key + author. */
	listPending(): Promise<PendingResourceRow[]> {
		return queryAll<PendingResourceRow>(
			this.db,
			`SELECT
				r.*,
				m.r2_key AS thumbnail_key,
				u.username AS author_username,
				u.avatar_url AS author_avatar
			FROM resources r
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			LEFT JOIN users u ON r.author_uuid = u.uuid
			WHERE r.is_active = 0
			ORDER BY r.created_at DESC`,
		);
	}

	/** A resource's category (for cache invalidation), or null if it doesn't exist. */
	async findResourceCategory(uuid: string): Promise<string | null> {
		const row = await queryOne<{ category: string }>(this.db, 'SELECT category FROM resources WHERE uuid = ?', [uuid]);
		return row?.category ?? null;
	}

	/** Set a resource's active flag. */
	async setResourceActive(uuid: string, active: 0 | 1): Promise<void> {
		await execute(this.db, 'UPDATE resources SET is_active = ? WHERE uuid = ?', [active, uuid]);
	}

	/** R2 keys of all media attached to a resource (gallery + attachments), for R2 cleanup. */
	listResourceMediaKeys(uuid: string): Promise<Media[]> {
		return queryAll<Media>(
			this.db,
			`SELECT m.r2_key FROM media m
			 JOIN resource_n_media rm ON m.uuid = rm.media_uuid
			 WHERE rm.resource_uuid = ?`,
			[uuid],
		);
	}

	/** R2 key of a resource's thumbnail, or null. */
	findResourceThumbnailKey(uuid: string): Promise<Media | null> {
		return queryOne<Media>(
			this.db,
			'SELECT m.r2_key FROM media m JOIN resources r ON m.uuid = r.thumbnail_uuid WHERE r.uuid = ?',
			[uuid],
		);
	}

	/** Delete a resource by uuid. */
	async deleteResource(uuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM resources WHERE uuid = ?', [uuid]);
	}

	// -------------------------------------------------------------------------
	// Orphaned media
	// -------------------------------------------------------------------------

	/** Orphaned media rows in the age window `windowStart <= created_at < cutoffTime` (unix seconds),
	 *  with metadata for the stats view. The lower bound bounds each pass to a recent slice. */
	listOrphanedMedia(cutoffTime: number, windowStart: number): Promise<Media[]> {
		return queryAll<Media>(
			this.db,
			`SELECT m.uuid, m.r2_key, m.file_name, m.media_type, m.created_at
			 FROM media m
			 WHERE m.created_at < ? AND m.created_at >= ? AND ${ORPHANED_MEDIA_PREDICATE}`,
			[cutoffTime, windowStart],
		);
	}

	/** Orphaned media rows in the age window `windowStart <= created_at < cutoffTime`, minimal
	 *  (uuid + r2_key) for cleanup. */
	listOrphanedMediaForCleanup(cutoffTime: number, windowStart: number): Promise<{ uuid: string; r2_key: string }[]> {
		return queryAll<{ uuid: string; r2_key: string }>(
			this.db,
			`SELECT m.uuid, m.r2_key
			 FROM media m
			 WHERE m.created_at < ? AND m.created_at >= ? AND ${ORPHANED_MEDIA_PREDICATE}`,
			[cutoffTime, windowStart],
		);
	}

	/** R2 keys of a media's processed variants (for MEDIA_BUCKET cleanup). */
	listMediaVariantKeys(mediaUuid: string): Promise<{ r2_key: string }[]> {
		return queryAll<{ r2_key: string }>(this.db, 'SELECT r2_key FROM media_variants WHERE media_uuid = ?', [mediaUuid]);
	}

	/** Delete a media row by uuid. */
	async deleteMedia(mediaUuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM media WHERE uuid = ?', [mediaUuid]);
	}

	/** Total media count. */
	async countMedia(): Promise<number> {
		const row = await queryOne<{ count: number }>(this.db, 'SELECT COUNT(*) AS count FROM media');
		return row?.count ?? 0;
	}

	/** Total resource count. */
	async countResources(): Promise<number> {
		const row = await queryOne<{ count: number }>(this.db, 'SELECT COUNT(*) AS count FROM resources');
		return row?.count ?? 0;
	}

	// -------------------------------------------------------------------------
	// Dashboard stats (batched)
	// -------------------------------------------------------------------------

	/** All dashboard metrics in one D1 batch. `cutoffTime`/`windowStart` scope the orphaned-media
	 *  count to the same 24h–48h age window the cleanup uses. */
	async fetchStats(cutoffTime: number, windowStart: number): Promise<{
		users: number;
		avatars: number;
		assets: number;
		clothes: number;
		pending: number;
		authors: number;
		media: number;
		orphaned_media: number;
		latest_uploads: unknown[];
		latest_registrations: unknown[];
	}> {
		const [
			totalUsers,
			totalAvatars,
			totalAssets,
			totalClothes,
			totalPending,
			totalAuthors,
			totalMedia,
			orphanedMedia,
			latestUploads,
			latestRegistrations,
		] = await this.db.batch([
			this.db.prepare('SELECT COUNT(*) as count FROM users'),
			this.db.prepare("SELECT COUNT(*) as count FROM resources WHERE category = 'avatars' AND is_active = 1"),
			this.db.prepare("SELECT COUNT(*) as count FROM resources WHERE category = 'assets' AND is_active = 1"),
			this.db.prepare("SELECT COUNT(*) as count FROM resources WHERE category = 'clothes' AND is_active = 1"),
			this.db.prepare('SELECT COUNT(*) as count FROM resources WHERE is_active = 0'),
			this.db.prepare('SELECT COUNT(*) as count FROM avatar_authors'),
			this.db.prepare('SELECT COUNT(*) as count FROM media'),
			this.db
				.prepare(`SELECT COUNT(*) as count FROM media m WHERE m.created_at < ? AND m.created_at >= ? AND ${ORPHANED_MEDIA_PREDICATE}`)
				.bind(cutoffTime, windowStart),
			this.db.prepare(
				`SELECT r.uuid, r.title, r.category, r.created_at, u.username as author_username
				FROM resources r LEFT JOIN users u ON r.author_uuid = u.uuid
				ORDER BY r.created_at DESC LIMIT 5`,
			),
			this.db.prepare('SELECT uuid, username, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
		]);

		const count = (r: D1Result) => (r.results[0] as { count: number })?.count ?? 0;

		return {
			users: count(totalUsers),
			avatars: count(totalAvatars),
			assets: count(totalAssets),
			clothes: count(totalClothes),
			pending: count(totalPending),
			authors: count(totalAuthors),
			media: count(totalMedia),
			orphaned_media: count(orphanedMedia),
			latest_uploads: latestUploads.results,
			latest_registrations: latestRegistrations.results,
		};
	}

	// -------------------------------------------------------------------------
	// User / resource admin listings
	// -------------------------------------------------------------------------

	/** Count of users matching an optional username search. */
	async countUsers(search: string): Promise<number> {
		const where = search ? 'WHERE username LIKE ?' : '';
		const params = search ? [`%${search}%`] : [];
		const row = await queryOne<{ total: number }>(this.db, `SELECT COUNT(*) as total FROM users ${where}`, params);
		return row?.total ?? 0;
	}

	/** A page of users matching an optional username search, newest first. */
	listUsers(search: string, limit: number, offset: number): Promise<AdminUserRow[]> {
		const where = search ? 'WHERE username LIKE ?' : '';
		const params = search ? [`%${search}%`, limit, offset] : [limit, offset];
		return queryAll<AdminUserRow>(
			this.db,
			`SELECT uuid, username, avatar_url, is_admin, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
			params,
		);
	}

	/** A user's uuid by username, or null. */
	async findUserUuid(username: string): Promise<string | null> {
		const row = await queryOne<{ uuid: string }>(this.db, 'SELECT uuid FROM users WHERE username = ?', [username]);
		return row?.uuid ?? null;
	}

	/** Set a user's is_admin flag. */
	async setUserAdmin(uuid: string, isAdmin: 0 | 1): Promise<void> {
		await execute(this.db, 'UPDATE users SET is_admin = ? WHERE uuid = ?', [isAdmin, uuid]);
	}

	/** Count of resources matching the admin filters (title search / category / status). */
	async countResourcesFiltered(where: string, bindings: unknown[]): Promise<number> {
		const row = await queryOne<{ total: number }>(this.db, `SELECT COUNT(*) as total FROM resources r ${where}`, bindings);
		return row?.total ?? 0;
	}

	/** A page of resources matching the admin filters, newest first, with thumbnail key + author. */
	listResourcesFiltered(where: string, bindings: unknown[], limit: number, offset: number): Promise<Record<string, unknown>[]> {
		return queryAll<Record<string, unknown>>(
			this.db,
			`SELECT r.uuid, r.title, r.category, r.is_active, r.download_count, r.created_at,
				r.thumbnail_uuid, u.username as author_username, m.r2_key as thumbnail_key
			FROM resources r
			LEFT JOIN users u ON r.author_uuid = u.uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			${where}
			ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
			[...bindings, limit, offset],
		);
	}

	// -------------------------------------------------------------------------
	// Media variant backfill
	// -------------------------------------------------------------------------

	/** Image media that has no processed variants yet (candidates for backfill enqueue). */
	listImagesWithoutVariants(): Promise<{ uuid: string; r2_key: string }[]> {
		return queryAll<{ uuid: string; r2_key: string }>(
			this.db,
			`SELECT uuid, r2_key FROM media
			  WHERE media_type = 'image'
			    AND uuid NOT IN (SELECT DISTINCT media_uuid FROM media_variants)`,
		);
	}

	// -------------------------------------------------------------------------
	// r2_key → uuid unification migration (Phase 2)
	// -------------------------------------------------------------------------

	/** Media rows whose r2_key still differs from their uuid (i.e. not yet unified). `limit` caps the
	 *  batch so a single migration pass can't exceed the Worker CPU budget; omit for all rows. */
	listMediaToUnify(limit?: number): Promise<{ uuid: string; r2_key: string }[]> {
		return limit && limit > 0
			? queryAll<{ uuid: string; r2_key: string }>(this.db, 'SELECT uuid, r2_key FROM media WHERE r2_key != uuid LIMIT ?', [limit])
			: queryAll<{ uuid: string; r2_key: string }>(this.db, 'SELECT uuid, r2_key FROM media WHERE r2_key != uuid');
	}

	/** How many free-text references a given r2_key has across the columns that can embed it. Read-only;
	 *  used by the dry-run to preview how much text the migration would rewrite for this key. */
	async countTextReferences(key: string): Promise<number> {
		const row = await queryOne<{ n: number }>(
			this.db,
			`SELECT
				(SELECT COUNT(*) FROM users         WHERE INSTR(avatar_url, ?) > 0)
			  + (SELECT COUNT(*) FROM avatar_authors WHERE INSTR(avatar_url, ?) > 0)
			  + (SELECT COUNT(*) FROM comments       WHERE INSTR(text,       ?) > 0)
			  + (SELECT COUNT(*) FROM blog_comments  WHERE INSTR(text,       ?) > 0)
			  + (SELECT COUNT(*) FROM blog_posts     WHERE INSTR(content,    ?) > 0) AS n`,
			[key, key, key, key, key],
		);
		return row?.n ?? 0;
	}

	/** Count of media rows still not unified (r2_key != uuid). Used to report progress across batches. */
	async countMediaToUnify(): Promise<number> {
		const row = await queryOne<{ count: number }>(this.db, 'SELECT COUNT(*) AS count FROM media WHERE r2_key != uuid');
		return row?.count ?? 0;
	}

	/** Point a media row's r2_key at its own uuid (the object has already been copied in R2). */
	async setMediaKeyToUuid(uuid: string): Promise<void> {
		await execute(this.db, 'UPDATE media SET r2_key = uuid WHERE uuid = ?', [uuid]);
	}

	/**
	 * Rewrite every free-text reference to an old r2_key so it points at the new key (the uuid).
	 * These columns embed the r2_key inside URLs / markdown, so a plain string REPLACE is required —
	 * the orphaned-media predicate (INSTR over these same columns) depends on them staying in sync.
	 * Batched so all five tables move atomically for one media row.
	 */
	async rewriteTextReferences(oldKey: string, newKey: string): Promise<void> {
		await this.db.batch([
			this.db.prepare('UPDATE users         SET avatar_url = REPLACE(avatar_url, ?, ?) WHERE INSTR(avatar_url, ?) > 0').bind(oldKey, newKey, oldKey),
			this.db.prepare('UPDATE avatar_authors SET avatar_url = REPLACE(avatar_url, ?, ?) WHERE INSTR(avatar_url, ?) > 0').bind(oldKey, newKey, oldKey),
			this.db.prepare('UPDATE comments       SET text       = REPLACE(text,       ?, ?) WHERE INSTR(text,       ?) > 0').bind(oldKey, newKey, oldKey),
			this.db.prepare('UPDATE blog_comments  SET text       = REPLACE(text,       ?, ?) WHERE INSTR(text,       ?) > 0').bind(oldKey, newKey, oldKey),
			this.db.prepare('UPDATE blog_posts     SET content    = REPLACE(content,    ?, ?) WHERE INSTR(content,    ?) > 0').bind(oldKey, newKey, oldKey),
		]);
	}
}
