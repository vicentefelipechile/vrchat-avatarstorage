// =========================================================================================================
// ASSET REPOSITORY
// =========================================================================================================
// The ONLY place asset-specific SQL lives. Owns everything that touches `asset_meta`.
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
import type { AssetMetaRow } from '../db/schema';
import { processedExpr } from '../db/schema';

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
export interface AssetFilters {
	asset_type?: string | string[];
	platform?: string | string[];
	sdk_version?: string | string[];
	unity_version?: string | string[];
	is_nsfw?: number;
	q?: string;
}

export interface AssetListParams extends AssetFilters {
	page: number;
	limit: number;
	sortBy: string;
	sortOrder: 'ASC' | 'DESC';
}

/** One row of the faceted list (resource card + flat asset_meta columns). */
export interface AssetListRow {
	uuid: string;
	title: string;
	download_count: number;
	created_at: number;
	thumbnail_key: string | null;
	thumbnail_media_uuid: string | null;
	placeholder_blur: string | null;
	processed: number;
	asset_type: string;
	is_nsfw: number;
	unity_version: string;
	platform: string;
	sdk_version: string;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class AssetRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Filter compilation (shared by count + list so they never desync)
	// -------------------------------------------------------------------------

	/** Builds the parameterised WHERE fragment (excluding `r.is_active = 1`) + bindings. */
	private compileFilters(f: AssetFilters): { where: string; params: unknown[] } {
		const clauses: string[] = [];
		const params: unknown[] = [];

		const eq = (col: string, value: unknown) => {
			if (value === undefined || value === null) return;
			if (Array.isArray(value)) {
				if (value.length === 0) return;
				if (value.length === 1) {
					clauses.push(`am.${col} = ?`);
					params.push(value[0]);
				} else {
					clauses.push(`am.${col} IN (${value.map(() => '?').join(', ')})`);
					params.push(...value);
				}
			} else {
				clauses.push(`am.${col} = ?`);
				params.push(value);
			}
		};

		eq('asset_type', f.asset_type);
		eq('platform', f.platform);
		eq('sdk_version', f.sdk_version);
		eq('unity_version', f.unity_version);
		eq('is_nsfw', f.is_nsfw);

		const where = clauses.length ? `AND ${clauses.join(' AND ')}` : '';
		return { where, params };
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Total active assets matching the filters (for pagination). */
	async count(f: AssetFilters): Promise<number> {
		const { where, params } = this.compileFilters(f);
		const q = (f as { q?: string }).q?.trim();
		const likePattern = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
		const titleFilter = likePattern ? `AND r.uuid IN (SELECT uuid FROM resources_fts WHERE title LIKE ? ESCAPE '\\')` : '';
		const titleParams = likePattern ? [likePattern] : [];
		const sql = `SELECT COUNT(*) AS total
			 FROM resources r
			 INNER JOIN asset_meta am ON r.uuid = am.resource_uuid
			 WHERE r.is_active = 1 ${where} ${titleFilter}`;
		try {
			const row = await queryOne<{ total: number }>(this.db, sql, [...params, ...titleParams]);
			return row?.total ?? 0;
		} catch (e) {
			if (String((e as Error).message).includes('no such table: resources_fts')) {
				const fallback = likePattern ? `AND r.title LIKE ? ESCAPE '\\'` : '';
				const row = await queryOne<{ total: number }>(
					this.db,
					`SELECT COUNT(*) AS total FROM resources r INNER JOIN asset_meta am ON r.uuid = am.resource_uuid WHERE r.is_active = 1 ${where} ${fallback}`,
					[...params, ...titleParams],
				);
				return row?.total ?? 0;
			}
			throw e;
		}
	}

	/** Paginated faceted list of assets (INNER JOIN asset_meta — only assets with metadata). */
	async list(p: AssetListParams): Promise<AssetListRow[]> {
		const { where, params } = this.compileFilters(p);
		const orderColumn = SORT_COLUMNS[p.sortBy] ?? 'r.created_at';
		const offset = (p.page - 1) * p.limit;
		const q = (p as { q?: string }).q?.trim();
		const likePattern = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
		const titleFilter = likePattern ? `AND r.uuid IN (SELECT uuid FROM resources_fts WHERE title LIKE ? ESCAPE '\\')` : '';
		const titleParams = likePattern ? [likePattern] : [];
		const sql = `SELECT
				r.uuid,
				r.title,
				r.download_count,
				r.created_at,
				m.r2_key AS thumbnail_key,
				m.uuid AS thumbnail_media_uuid,
				m.placeholder_blur,
				${processedExpr('m')},
				am.asset_type,
				am.is_nsfw,
				am.unity_version,
				am.platform,
				am.sdk_version
			FROM resources r
			INNER JOIN asset_meta am ON r.uuid = am.resource_uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			WHERE r.is_active = 1 ${where} ${titleFilter}
			ORDER BY ${orderColumn} ${p.sortOrder}
			LIMIT ? OFFSET ?`;
		try {
			return await queryAll<AssetListRow>(this.db, sql, [...params, ...titleParams, p.limit, offset]);
		} catch (e) {
			if (String((e as Error).message).includes('no such table: resources_fts')) {
				const fallbackSql = sql.replace(titleFilter, likePattern ? `AND r.title LIKE ? ESCAPE '\\'` : '');
				const fallbackParams = likePattern ? [...params, likePattern, p.limit, offset] : [...params, p.limit, offset];
				return queryAll<AssetListRow>(this.db, fallbackSql, fallbackParams);
			}
			throw e;
		}
	}

	/** Single asset (resource core + flat asset_meta). */
	findByUuid(uuid: string): Promise<Record<string, unknown> | null> {
		return queryOne<Record<string, unknown>>(
			this.db,
			`SELECT r.uuid, r.title, r.is_active,
				am.asset_type, am.is_nsfw, am.unity_version, am.platform, am.sdk_version
			FROM resources r
			INNER JOIN asset_meta am ON r.uuid = am.resource_uuid
			WHERE r.uuid = ?`,
			[uuid],
		);
	}

	/** Bare asset_meta row by resource uuid (for the pre-edit history snapshot). */
	findMeta(uuid: string): Promise<AssetMetaRow | null> {
		return queryOne<AssetMetaRow>(this.db, 'SELECT * FROM asset_meta WHERE resource_uuid = ?', [uuid]);
	}

	// -------------------------------------------------------------------------
	// Write statement factories (composed into a single db.batch by the service)
	// -------------------------------------------------------------------------

	buildInsertMeta(m: {
		resource_uuid: string;
		asset_type: string;
		is_nsfw: number;
		unity_version: string;
		platform: string;
		sdk_version: string;
	}): D1PreparedStatement {
		return this.db
			.prepare(
				`INSERT INTO asset_meta (resource_uuid, asset_type, is_nsfw, unity_version, platform, sdk_version)
				VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(m.resource_uuid, m.asset_type, m.is_nsfw, m.unity_version, m.platform, m.sdk_version);
	}

	/** Columns that a meta edit is allowed to touch (whitelist — never interpolate keys). */
	static readonly EDITABLE_META_COLUMNS = ['asset_type', 'is_nsfw', 'unity_version', 'platform', 'sdk_version'] as const;

	/** Partial UPDATE of asset_meta from a whitelisted set/bindings pair built by the service. */
	buildUpdateMeta(uuid: string, setClauses: string[], setBindings: unknown[]): D1PreparedStatement {
		return this.db
			.prepare(`UPDATE asset_meta SET ${setClauses.join(', ')} WHERE resource_uuid = ?`)
			.bind(...setBindings, uuid);
	}
}
