// =========================================================================================================
// RESOURCE REPOSITORY
// =========================================================================================================
// The ONLY place resource-related SQL lives. Every read/write against `resources`,
// `resource_links`, `resource_n_media` and `resource_history` goes
// through here. Services call these methods; handlers never see SQL.
//
// Design notes:
//   - Methods return DB row types (schema.ts), not API shapes. Mapping to the API
//     contract is the service's job.
//   - Multi-statement writes are exposed as `build*` statement factories so the
//     service can compose them into a single atomic `db.batch(...)` — matching the
//     transactional behavior of the legacy PUT handler.
//   - The search query reuses the existing QueryBuilder to preserve identical SQL.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { queryOne, queryAll } from '../db/client';
import { QueryBuilder } from '../helpers/query-constructor';
import type { ResourceRow, ResourceLinkRow, ResourceHistoryRow, ResourceCategory } from '../db/schema';
import { RESOURCE_CATEGORIES } from '../db/schema';

// =========================================================================================================
// Types
// =========================================================================================================

/** Whitelisted sort columns — never interpolate raw user input into ORDER BY. */
const SORT_COLUMNS: Record<string, string> = {
	created_at: 'r.created_at',
	download_count: 'r.download_count',
	title: 'r.title',
};

export interface ResourceSearchParams {
	page: number;
	limit: number;
	category?: string;
	sortBy?: string;
	sortOrder: 'ASC' | 'DESC';
}

/** A single row of the search result set (list card shape from the DB). */
export interface ResourceListRow {
	uuid: string;
	title: string;
	description: string | null;
	category: ResourceCategory;
	thumbnail_uuid: string;
	download_count: number;
	created_at: number;
	thumbnail_key: string | null;
	placeholder_blur: string | null;
}

/** The joined detail row — flat, with prefixed metadata columns. Kept as-is from the
 *  legacy detail query so the service can map it to the exact same API contract. */
export type ResourceDetailRow = Record<string, unknown>;

// =========================================================================================================
// Repository
// =========================================================================================================

export class ResourceRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Bare resource row by uuid, or null. */
	findByUuid(uuid: string): Promise<ResourceRow | null> {
		return queryOne<ResourceRow>(this.db, 'SELECT * FROM resources WHERE uuid = ?', [uuid]);
	}

	/** Latest N active resources (thumbnail joined). Used by GET /latest. */
	findLatest(limit: number): Promise<ResourceListRow[]> {
		const { sql, params } = new QueryBuilder('resources', 'r')
			.select([
				'r.category',
				'r.uuid',
				'r.title',
				'r.description',
				'r.thumbnail_uuid',
				'r.created_at',
				'r.download_count',
				'm.r2_key as thumbnail_key',
				'm.uuid as thumbnail_media_uuid',
				'm.placeholder_blur',
			])
			.join('INNER JOIN media m ON r.thumbnail_uuid = m.uuid')
			.join('LEFT JOIN users u ON r.author_uuid = u.uuid')
			.where('r.is_active = 1')
			.orderBy('r.created_at', 'DESC')
			.paginate(1, limit)
			.build();

		return queryAll<ResourceListRow>(this.db, sql, params);
	}

	/**
	 * Paginated search. Requests `limit + 1` rows (the +1 trick) so the caller can
	 * detect a next page without a COUNT(*). Returns the raw rows; the service
	 * slices and maps.
	 */
	search(p: ResourceSearchParams): Promise<ResourceListRow[]> {
		const orderColumn = SORT_COLUMNS[p.sortBy ?? ''] ?? 'r.created_at';

		const qb = new QueryBuilder('resources', 'r')
			.select([
				'r.uuid',
				'r.title',
				'r.description',
				'r.category',
				'r.thumbnail_uuid',
				'r.download_count',
				'r.created_at',
				'm.r2_key AS thumbnail_key',
				'm.placeholder_blur',
			])
			.join('INNER JOIN media m ON r.thumbnail_uuid = m.uuid')
			.where('r.is_active = 1')
			.whereIf(!!p.category && RESOURCE_CATEGORIES.includes(p.category as ResourceCategory), 'r.category = ?', p.category)
			.orderBy(orderColumn, p.sortOrder)
			.paginate(p.page, p.limit + 1);

		const { sql, params } = qb.build();
		return queryAll<ResourceListRow>(this.db, sql, params);
	}

	/** Full joined detail row (metadata, links json, media json) by uuid. */
	findDetail(uuid: string): Promise<ResourceDetailRow | null> {
		return queryOne<ResourceDetailRow>(this.db, DETAIL_SQL, [uuid]);
	}

	/** Edit history for a resource, newest first, with actor info joined. */
	findHistory(uuid: string): Promise<(ResourceHistoryRow & { username: string; avatar_url: string | null })[]> {
		return queryAll(
			this.db,
			`SELECT h.*, u.username, u.avatar_url
			 FROM resource_history h
			 LEFT JOIN users u ON h.actor_uuid = u.uuid
			 WHERE h.resource_uuid = ?
			 ORDER BY h.created_at DESC`,
			[uuid],
		);
	}

	/** Links for a resource ordered by display_order. */
	findLinks(uuid: string): Promise<ResourceLinkRow[]> {
		return queryAll<ResourceLinkRow>(
			this.db,
			'SELECT * FROM resource_links WHERE resource_uuid = ? ORDER BY display_order ASC',
			[uuid],
		);
	}

	/** Deletes a single link scoped to its resource. Returns rows affected. */
	async deleteLink(resourceUuid: string, linkUuid: string): Promise<number> {
		const res = await this.db
			.prepare('DELETE FROM resource_links WHERE uuid = ? AND resource_uuid = ?')
			.bind(linkUuid, resourceUuid)
			.run();
		return res.meta.changes ?? 0;
	}

	/**
	 * Applies a partial update to a single link. `fields` is a validated,
	 * whitelisted set of column→value pairs (never raw user keys).
	 */
	async updateLink(resourceUuid: string, linkUuid: string, fields: Record<string, unknown>): Promise<void> {
		const setClauses: string[] = [];
		const bindings: unknown[] = [];
		for (const [key, value] of Object.entries(fields)) {
			setClauses.push(`${key} = ?`);
			bindings.push(value ?? null);
		}
		bindings.push(linkUuid, resourceUuid);
		await this.db
			.prepare(`UPDATE resource_links SET ${setClauses.join(', ')} WHERE uuid = ? AND resource_uuid = ?`)
			.bind(...bindings)
			.run();
	}

	// -------------------------------------------------------------------------
	// Write statement factories (composed into a single db.batch by the service)
	// -------------------------------------------------------------------------

	buildInsertResource(r: {
		uuid: string;
		title: string;
		description: string | null;
		category: ResourceCategory;
		thumbnail_uuid: string;
		reference_image_uuid: string | null;
		author_uuid: string;
	}): D1PreparedStatement {
		return this.db
			.prepare(
				`INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(r.uuid, r.title, r.description, r.category, r.thumbnail_uuid, r.reference_image_uuid, r.author_uuid);
	}

	buildInsertLink(l: {
		uuid: string;
		resource_uuid: string;
		link_url: string;
		link_title: string | null;
		link_type: string;
		display_order: number;
	}): D1PreparedStatement {
		return this.db
			.prepare(
				`INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order)
				 VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(l.uuid, l.resource_uuid, l.link_url, l.link_title, l.link_type, l.display_order);
	}

	buildInsertMediaRelation(uuid: string, resourceUuid: string, mediaUuid: string): D1PreparedStatement {
		return this.db
			.prepare('INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid) VALUES (?, ?, ?)')
			.bind(uuid, resourceUuid, mediaUuid);
	}

	buildClearMediaRelations(resourceUuid: string): D1PreparedStatement {
		return this.db.prepare('DELETE FROM resource_n_media WHERE resource_uuid = ?').bind(resourceUuid);
	}

	buildInsertHistory(h: {
		uuid: string;
		resource_uuid: string;
		actor_uuid: string;
		change_type: string;
		previous_data: string;
	}): D1PreparedStatement {
		return this.db
			.prepare(
				`INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data)
				 VALUES (?, ?, ?, ?, ?)`,
			)
			.bind(h.uuid, h.resource_uuid, h.actor_uuid, h.change_type, h.previous_data);
	}

	buildUpdateCore(uuid: string, title: string, description: string | null, category: string, isActive: number): D1PreparedStatement {
		return this.db
			.prepare(
				`UPDATE resources SET title = ?, description = ?, category = ?, is_active = ?, updated_at = unixepoch() WHERE uuid = ?`,
			)
			.bind(title, description, category, isActive, uuid);
	}

	buildUpdateThumbnail(uuid: string, thumbnailUuid: string): D1PreparedStatement {
		return this.db.prepare('UPDATE resources SET thumbnail_uuid = ? WHERE uuid = ?').bind(thumbnailUuid, uuid);
	}

	buildUpdateReferenceImage(uuid: string, referenceUuid: string | null): D1PreparedStatement {
		return this.db.prepare('UPDATE resources SET reference_image_uuid = ? WHERE uuid = ?').bind(referenceUuid, uuid);
	}

	buildDelete(uuid: string): D1PreparedStatement {
		return this.db.prepare('DELETE FROM resources WHERE uuid = ?').bind(uuid);
	}
}

// =========================================================================================================
// Detail SQL (kept identical to the legacy query so the API contract is byte-for-byte preserved)
// =========================================================================================================

const DETAIL_SQL = `
	SELECT
		r.uuid, r.title, r.description, r.category, r.download_count, r.is_active, r.created_at, r.updated_at,
		tm.r2_key            AS thumbnail_key,
		tm.uuid              AS thumbnail_media_uuid,
		rm_ref.r2_key        AS reference_image_key,
		rm_ref.uuid          AS reference_image_media_uuid,
		am.gender            AS av_gender,
		am.avatar_size       AS av_avatar_size,
		am.avatar_type       AS av_avatar_type,
		am.is_nsfw           AS av_is_nsfw,
		am.has_physbones     AS av_has_physbones,
		am.has_face_tracking AS av_has_face_tracking,
		am.has_dps           AS av_has_dps,
		am.has_gogoloco      AS av_has_gogoloco,
		am.has_toggles       AS av_has_toggles,
		am.is_quest_optimized AS av_is_quest_optimized,
		am.sdk_version       AS av_sdk_version,
		am.platform          AS av_platform,
		am.author_name_raw   AS av_author_name_raw,
		aa.name              AS av_author_name,
		aa.slug              AS av_author_slug,
		asm.asset_type       AS as_asset_type,
		asm.is_nsfw          AS as_is_nsfw,
		asm.unity_version    AS as_unity_version,
		asm.platform         AS as_platform,
		asm.sdk_version      AS as_sdk_version,
		cm.gender_fit           AS cl_gender_fit,
		cm.clothing_type        AS cl_clothing_type,
		cm.is_base              AS cl_is_base,
		cm.is_nsfw              AS cl_is_nsfw,
		cm.has_physbones        AS cl_has_physbones,
		cm.platform             AS cl_platform,
		cm.base_avatar_name_raw AS cl_base_avatar_name_raw,
		cm.base_avatar_uuid     AS cl_base_avatar_uuid,
		COALESCE((
			SELECT json_group_array(json_object('uuid', m.uuid, 'r2_key', m.r2_key, 'media_type', m.media_type, 'placeholder_blur', m.placeholder_blur))
			FROM media m JOIN resource_n_media rnm ON m.uuid = rnm.media_uuid
			WHERE rnm.resource_uuid = r.uuid
		), '[]') AS media_files_json,
		COALESCE((
			SELECT json_group_array(json_object(
				'uuid', rl.uuid, 'link_url', rl.link_url, 'link_title', rl.link_title,
				'link_type', rl.link_type, 'display_order', rl.display_order))
			FROM resource_links rl WHERE rl.resource_uuid = r.uuid ORDER BY rl.display_order ASC
		), '[]') AS links_json
	FROM resources r
	LEFT JOIN users  u      ON r.author_uuid         = u.uuid
	LEFT JOIN media  tm     ON r.thumbnail_uuid       = tm.uuid
	LEFT JOIN media  rm_ref ON r.reference_image_uuid = rm_ref.uuid
	LEFT JOIN avatar_meta    am  ON r.uuid = am.resource_uuid
	LEFT JOIN avatar_authors aa  ON am.author_uuid = aa.uuid
	LEFT JOIN asset_meta     asm ON r.uuid = asm.resource_uuid
	LEFT JOIN clothes_meta   cm  ON r.uuid = cm.resource_uuid
	WHERE r.uuid = ?
`;
