// =========================================================================================================
// AVATAR REPOSITORY
// =========================================================================================================
// The ONLY place avatar-specific SQL lives. Owns everything that touches `avatar_meta`
// and its joins (`avatar_authors` for resolved author names). Resource-level rows
// (`resources`, `resource_links`, `resource_n_media`, `resource_history`) still go
// through ResourceRepository — this repo composes those statements where a create/edit
// spans both tables.
//
// Methods return DB row types; mapping to the legacy API shape is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, type DB } from '../db/client';
import type { AvatarMetaRow } from '../db/schema';

// =========================================================================================================
// Types
// =========================================================================================================

/** Whitelisted sort columns — never interpolate raw user input into ORDER BY. */
const SORT_COLUMNS: Record<string, string> = {
	created_at: 'r.created_at',
	download_count: 'r.download_count',
	title: 'r.title',
};

/** Normalised, already-validated faceted filters (the service passes these in). */
export interface AvatarFilters {
	gender?: string;
	avatar_size?: string;
	avatar_type?: string;
	platform?: string;
	sdk_version?: string;
	is_nsfw?: number;
	has_physbones?: number;
	has_face_tracking?: number;
	has_dps?: number;
	has_gogoloco?: number;
	has_toggles?: number;
	is_quest_optimized?: number;
	author_uuid?: string;
}

export interface AvatarListParams extends AvatarFilters {
	page: number;
	limit: number;
	sortBy: string;
	sortOrder: 'ASC' | 'DESC';
}

/** One row of the faceted list (resource card + flat avatar_meta columns + resolved author). */
export interface AvatarListRow {
	uuid: string;
	title: string;
	download_count: number;
	created_at: number;
	thumbnail_key: string | null;
	thumbnail_media_uuid: string | null;
	gender: string;
	avatar_size: string;
	avatar_type: string;
	is_nsfw: number;
	has_physbones: number;
	has_face_tracking: number;
	has_dps: number;
	has_gogoloco: number;
	has_toggles: number;
	is_quest_optimized: number;
	sdk_version: string;
	platform: string;
	author_uuid: string | null;
	author_name_raw: string | null;
	author_name: string | null;
	author_slug: string | null;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class AvatarRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Filter compilation (shared by count + list so they never desync)
	// -------------------------------------------------------------------------

	/** Builds the parameterised WHERE fragment (excluding `r.is_active = 1`) + bindings. */
	private compileFilters(f: AvatarFilters): { where: string; params: unknown[] } {
		const clauses: string[] = [];
		const params: unknown[] = [];

		const eq = (col: string, value: unknown) => {
			if (value !== undefined) {
				clauses.push(`am.${col} = ?`);
				params.push(value);
			}
		};

		eq('gender', f.gender);
		eq('avatar_size', f.avatar_size);
		eq('avatar_type', f.avatar_type);
		eq('platform', f.platform);
		eq('sdk_version', f.sdk_version);
		eq('is_nsfw', f.is_nsfw);
		eq('has_physbones', f.has_physbones);
		eq('has_face_tracking', f.has_face_tracking);
		eq('has_dps', f.has_dps);
		eq('has_gogoloco', f.has_gogoloco);
		eq('has_toggles', f.has_toggles);
		eq('is_quest_optimized', f.is_quest_optimized);
		eq('author_uuid', f.author_uuid);

		const where = clauses.length ? `AND ${clauses.join(' AND ')}` : '';
		return { where, params };
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Total active avatars matching the filters (for pagination). */
	async count(f: AvatarFilters): Promise<number> {
		const { where, params } = this.compileFilters(f);
		const row = await queryOne<{ total: number }>(
			this.db,
			`SELECT COUNT(*) AS total
			 FROM resources r
			 INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			 WHERE r.is_active = 1 ${where}`,
			params,
		);
		return row?.total ?? 0;
	}

	/** Paginated faceted list of avatars (INNER JOIN avatar_meta — only avatars with metadata). */
	list(p: AvatarListParams): Promise<AvatarListRow[]> {
		const { where, params } = this.compileFilters(p);
		const orderColumn = SORT_COLUMNS[p.sortBy] ?? 'r.created_at';
		const offset = (p.page - 1) * p.limit;

		return queryAll<AvatarListRow>(
			this.db,
			`SELECT
				r.uuid,
				r.title,
				r.download_count,
				r.created_at,
				m.r2_key AS thumbnail_key,
				m.uuid AS thumbnail_media_uuid,
				am.gender,
				am.avatar_size,
				am.avatar_type,
				am.is_nsfw,
				am.has_physbones,
				am.has_face_tracking,
				am.has_dps,
				am.has_gogoloco,
				am.has_toggles,
				am.is_quest_optimized,
				am.sdk_version,
				am.platform,
				am.author_uuid,
				am.author_name_raw,
				aa.name AS author_name,
				aa.slug AS author_slug
			FROM resources r
			INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			LEFT JOIN avatar_authors aa ON am.author_uuid = aa.uuid
			WHERE r.is_active = 1 ${where}
			ORDER BY ${orderColumn} ${p.sortOrder}
			LIMIT ? OFFSET ?`,
			[...params, p.limit, offset],
		);
	}

	/** Lightweight name search for autocomplete (active avatars only). */
	searchByName(pattern: string, limit: number): Promise<{ uuid: string; title: string }[]> {
		return queryAll<{ uuid: string; title: string }>(
			this.db,
			`SELECT r.uuid, r.title
			 FROM resources r
			 INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			 WHERE r.is_active = 1 AND r.title LIKE ?
			 ORDER BY r.title ASC
			 LIMIT ?`,
			[pattern, limit],
		);
	}

	/** Single avatar (resource core + flat avatar_meta) — used by HistoryView diffing. */
	findByUuid(uuid: string): Promise<Record<string, unknown> | null> {
		return queryOne<Record<string, unknown>>(
			this.db,
			`SELECT r.uuid, r.title, r.is_active,
				am.gender, am.avatar_size, am.avatar_type, am.is_nsfw,
				am.has_physbones, am.has_face_tracking, am.has_dps,
				am.has_gogoloco, am.has_toggles, am.is_quest_optimized,
				am.sdk_version, am.platform, am.author_uuid, am.author_name_raw
			FROM resources r
			INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			WHERE r.uuid = ?`,
			[uuid],
		);
	}

	/** Bare avatar_meta row by resource uuid (for the pre-edit history snapshot). */
	findMeta(uuid: string): Promise<AvatarMetaRow | null> {
		return queryOne<AvatarMetaRow>(this.db, 'SELECT * FROM avatar_meta WHERE resource_uuid = ?', [uuid]);
	}

	// -------------------------------------------------------------------------
	// Write statement factories (composed into a single db.batch by the service)
	// -------------------------------------------------------------------------

	buildInsertMeta(m: {
		resource_uuid: string;
		author_uuid: string | null;
		author_name_raw: string | null;
		gender: string;
		avatar_size: string;
		avatar_type: string;
		is_nsfw: number;
		has_physbones: number;
		has_face_tracking: number;
		has_dps: number;
		has_gogoloco: number;
		has_toggles: number;
		is_quest_optimized: number;
		sdk_version: string;
		platform: string;
	}): D1PreparedStatement {
		return this.db
			.prepare(
				`INSERT INTO avatar_meta (resource_uuid, author_uuid, author_name_raw, gender, avatar_size, avatar_type,
					is_nsfw, has_physbones, has_face_tracking, has_dps, has_gogoloco, has_toggles, is_quest_optimized, sdk_version, platform)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				m.resource_uuid,
				m.author_uuid,
				m.author_name_raw,
				m.gender,
				m.avatar_size,
				m.avatar_type,
				m.is_nsfw,
				m.has_physbones,
				m.has_face_tracking,
				m.has_dps,
				m.has_gogoloco,
				m.has_toggles,
				m.is_quest_optimized,
				m.sdk_version,
				m.platform,
			);
	}

	/** Columns that a meta edit is allowed to touch (whitelist — never interpolate keys). */
	static readonly EDITABLE_META_COLUMNS = [
		'gender',
		'avatar_size',
		'avatar_type',
		'is_nsfw',
		'has_physbones',
		'has_face_tracking',
		'has_dps',
		'has_gogoloco',
		'has_toggles',
		'is_quest_optimized',
		'sdk_version',
		'platform',
		'author_uuid',
		'author_name_raw',
	] as const;

	/** Partial UPDATE of avatar_meta from a whitelisted set/bindings pair built by the service. */
	buildUpdateMeta(uuid: string, setClauses: string[], setBindings: unknown[]): D1PreparedStatement {
		return this.db
			.prepare(`UPDATE avatar_meta SET ${setClauses.join(', ')} WHERE resource_uuid = ?`)
			.bind(...setBindings, uuid);
	}
}
