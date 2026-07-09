// =========================================================================================================
// CLOTHES REPOSITORY
// =========================================================================================================
// The ONLY place clothes-specific SQL lives. Owns everything that touches `clothes_meta`.
// Resource-level rows (`resources`, `resource_links`, `resource_n_media`, `resource_history`)
// still go through ResourceRepository — this repo composes those statements where a
// create/edit spans both tables.
//
// Methods return DB row types; mapping to the legacy API shape is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, type DB } from '../db/client';
import type { ClothesMetaRow } from '../db/schema';

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
export interface ClothesFilters {
	gender_fit?: string;
	clothing_type?: string;
	platform?: string;
	is_base?: number;
	is_nsfw?: number;
	has_physbones?: number;
}

export interface ClothesListParams extends ClothesFilters {
	page: number;
	limit: number;
	sortBy: string;
	sortOrder: 'ASC' | 'DESC';
}

/** One row of the faceted list (resource card + flat clothes_meta columns). */
export interface ClothesListRow {
	uuid: string;
	title: string;
	download_count: number;
	created_at: number;
	thumbnail_key: string | null;
	thumbnail_media_uuid: string | null;
	placeholder_blur: string | null;
	gender_fit: string;
	clothing_type: string;
	is_base: number;
	is_nsfw: number;
	has_physbones: number;
	platform: string;
	base_avatar_uuid: string | null;
	base_avatar_name_raw: string | null;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class ClothesRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Filter compilation (shared by count + list so they never desync)
	// -------------------------------------------------------------------------

	/** Builds the parameterised WHERE fragment (excluding `r.is_active = 1`) + bindings. */
	private compileFilters(f: ClothesFilters): { where: string; params: unknown[] } {
		const clauses: string[] = [];
		const params: unknown[] = [];

		const eq = (col: string, value: unknown) => {
			if (value !== undefined) {
				clauses.push(`cm.${col} = ?`);
				params.push(value);
			}
		};

		eq('gender_fit', f.gender_fit);
		eq('clothing_type', f.clothing_type);
		eq('platform', f.platform);
		eq('is_base', f.is_base);
		eq('is_nsfw', f.is_nsfw);
		eq('has_physbones', f.has_physbones);

		const where = clauses.length ? `AND ${clauses.join(' AND ')}` : '';
		return { where, params };
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Total active clothes matching the filters (for pagination). */
	async count(f: ClothesFilters): Promise<number> {
		const { where, params } = this.compileFilters(f);
		const row = await queryOne<{ total: number }>(
			this.db,
			`SELECT COUNT(*) AS total
			 FROM resources r
			 INNER JOIN clothes_meta cm ON r.uuid = cm.resource_uuid
			 WHERE r.is_active = 1 ${where}`,
			params,
		);
		return row?.total ?? 0;
	}

	/** Paginated faceted list of clothes (INNER JOIN clothes_meta — only clothes with metadata). */
	list(p: ClothesListParams): Promise<ClothesListRow[]> {
		const { where, params } = this.compileFilters(p);
		const orderColumn = SORT_COLUMNS[p.sortBy] ?? 'r.created_at';
		const offset = (p.page - 1) * p.limit;

		return queryAll<ClothesListRow>(
			this.db,
			`SELECT
				r.uuid,
				r.title,
				r.download_count,
				r.created_at,
				m.r2_key AS thumbnail_key,
				m.uuid AS thumbnail_media_uuid,
				m.placeholder_blur,
				cm.gender_fit,
				cm.clothing_type,
				cm.is_base,
				cm.is_nsfw,
				cm.has_physbones,
				cm.platform,
				cm.base_avatar_uuid,
				cm.base_avatar_name_raw
			FROM resources r
			INNER JOIN clothes_meta cm ON r.uuid = cm.resource_uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			WHERE r.is_active = 1 ${where}
			ORDER BY ${orderColumn} ${p.sortOrder}
			LIMIT ? OFFSET ?`,
			[...params, p.limit, offset],
		);
	}

	/** Single clothes item (resource core + flat clothes_meta). */
	findByUuid(uuid: string): Promise<Record<string, unknown> | null> {
		return queryOne<Record<string, unknown>>(
			this.db,
			`SELECT
				r.uuid,
				r.title,
				r.is_active,
				cm.gender_fit,
				cm.clothing_type,
				cm.is_base,
				cm.is_nsfw,
				cm.has_physbones,
				cm.platform,
				cm.base_avatar_uuid,
				cm.base_avatar_name_raw
			FROM resources r
			INNER JOIN clothes_meta cm ON r.uuid = cm.resource_uuid
			WHERE r.uuid = ?`,
			[uuid],
		);
	}

	/** Bare clothes_meta row by resource uuid (for the pre-edit history snapshot). */
	findMeta(uuid: string): Promise<ClothesMetaRow | null> {
		return queryOne<ClothesMetaRow>(this.db, 'SELECT * FROM clothes_meta WHERE resource_uuid = ?', [uuid]);
	}

	// -------------------------------------------------------------------------
	// Write statement factories (composed into a single db.batch by the service)
	// -------------------------------------------------------------------------

	buildInsertMeta(m: {
		resource_uuid: string;
		gender_fit: string;
		clothing_type: string;
		is_base: number;
		base_avatar_uuid: string | null;
		base_avatar_name_raw: string | null;
		is_nsfw: number;
		has_physbones: number;
		platform: string;
	}): D1PreparedStatement {
		return this.db
			.prepare(
				`INSERT INTO clothes_meta (resource_uuid, gender_fit, clothing_type, is_base, base_avatar_uuid, base_avatar_name_raw, is_nsfw, has_physbones, platform)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				m.resource_uuid,
				m.gender_fit,
				m.clothing_type,
				m.is_base,
				m.base_avatar_uuid,
				m.base_avatar_name_raw,
				m.is_nsfw,
				m.has_physbones,
				m.platform,
			);
	}

	/** Columns that a meta edit is allowed to touch (whitelist — never interpolate keys). */
	static readonly EDITABLE_META_COLUMNS = [
		'gender_fit',
		'clothing_type',
		'is_base',
		'base_avatar_uuid',
		'base_avatar_name_raw',
		'is_nsfw',
		'has_physbones',
		'platform',
	] as const;

	/** Partial UPDATE of clothes_meta from a whitelisted set/bindings pair built by the service. */
	buildUpdateMeta(uuid: string, setClauses: string[], setBindings: unknown[]): D1PreparedStatement {
		return this.db
			.prepare(`UPDATE clothes_meta SET ${setClauses.join(', ')} WHERE resource_uuid = ?`)
			.bind(...setBindings, uuid);
	}
}
