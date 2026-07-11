// =========================================================================================================
// ASSET SERVICE
// =========================================================================================================
// Business logic for the assets category: faceted listing, single fetch, creation
// (resources + asset_meta + links + media in one batch) and admin metadata edits
// (history snapshot + partial meta update in one batch).
//
// Owns authorization and the mapping from DB rows to the exact legacy API shape so the
// existing frontend keeps working unchanged. All SQL lives in the repositories.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import { batch, type DB } from '../db/client';
import { AssetRepository, type AssetFilters, type AssetListRow } from '../repositories/asset-repository';
import { ResourceRepository } from '../repositories/resource-repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';
import type { AssetFilter } from '../validators';

// =========================================================================================================
// Types
// =========================================================================================================

/** Validated create payload (resource core + asset_meta + optional links/media). */
export interface CreateAssetInput {
	title: string;
	description?: string | null;
	thumbnail_uuid: string;
	reference_image_uuid?: string | null;
	links?: { link_url: string; link_title?: string | null; link_type?: string; display_order?: number }[];
	media_files?: string[];
	meta: {
		asset_type: string;
		is_nsfw: number;
		unity_version: string;
		platform: string;
		sdk_version: string;
	};
}

// =========================================================================================================
// Service
// =========================================================================================================

export class AssetService {
	private readonly repo: AssetRepository;
	private readonly resources: ResourceRepository;

	constructor(private readonly db: DB) {
		this.repo = new AssetRepository(db);
		this.resources = new ResourceRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/**
	 * Faceted, paginated asset list. `filter` is the already-parsed AssetFilterSchema
	 * output (boolean flags arrive as '0'/'1' strings and are coerced here).
	 */
	async list(filter: AssetFilter) {
		const filters = this.toFilters(filter);
		const [total, rows] = await Promise.all([
			this.repo.count(filters),
			this.repo.list({
				...filters,
				page: filter.page,
				limit: filter.limit,
				sortBy: filter.sort_by,
				sortOrder: filter.sort_order === 'asc' ? 'ASC' : 'DESC',
			}),
		]);

		const offset = (filter.page - 1) * filter.limit;
		return {
			resources: rows.map(mapListRow),
			pagination: {
				page: filter.page,
				limit: filter.limit,
				total,
				hasNextPage: offset + filter.limit < total,
				hasPrevPage: filter.page > 1,
			},
		};
	}

	/** Single asset (resource core + flat meta). Throws NotFoundError if missing. */
	async detail(uuid: string): Promise<Record<string, unknown>> {
		const row = await this.repo.findByUuid(uuid);
		if (!row) throw new NotFoundError('Not found');
		return row;
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Creates a resource + asset_meta (+ links + media) in a single batch. Returns the new uuid. */
	async create(user: AuthUser, input: CreateAssetInput): Promise<{ uuid: string }> {
		const uuid = crypto.randomUUID();
		const m = input.meta;

		const statements: D1PreparedStatement[] = [
			this.resources.buildInsertResource({
				uuid,
				title: input.title,
				description: input.description ?? null,
				category: 'assets',
				thumbnail_uuid: input.thumbnail_uuid,
				reference_image_uuid: input.reference_image_uuid ?? null,
				author_uuid: user.uuid,
			}),
			this.repo.buildInsertMeta({
				resource_uuid: uuid,
				asset_type: m.asset_type,
				is_nsfw: m.is_nsfw,
				unity_version: m.unity_version,
				platform: m.platform,
				sdk_version: m.sdk_version,
			}),
		];

		(input.links ?? []).forEach((link, i) => {
			statements.push(
				this.resources.buildInsertLink({
					uuid: crypto.randomUUID(),
					resource_uuid: uuid,
					link_url: link.link_url,
					link_title: link.link_title ?? null,
					link_type: link.link_type ?? 'general',
					display_order: link.display_order ?? i,
				}),
			);
		});

		for (const mediaUuid of input.media_files ?? []) {
			statements.push(this.resources.buildInsertMediaRelation(crypto.randomUUID(), uuid, mediaUuid));
		}

		await batch(this.db, statements);
		return { uuid };
	}

	/**
	 * Admin-only metadata edit. Snapshots the previous asset_meta as a `meta_edit`
	 * history entry, then applies a partial update — both atomically in one batch.
	 */
	async update(user: AuthUser, uuid: string, patch: Partial<Record<string, unknown>>): Promise<void> {
		if (!user.is_admin) throw new ForbiddenError();

		const existing = await this.repo.findMeta(uuid);
		if (!existing) throw new NotFoundError('Asset metadata not found');

		// Whitelisted partial update — only editable columns, only keys actually present.
		const setClauses: string[] = [];
		const setBindings: unknown[] = [];
		for (const col of AssetRepository.EDITABLE_META_COLUMNS) {
			if (patch[col] !== undefined) {
				setClauses.push(`${col} = ?`);
				setBindings.push(patch[col] ?? null);
			}
		}
		if (setClauses.length === 0) throw new ValidationError('No fields to update');

		const previousData = JSON.stringify({ meta_type: 'asset_meta', fields: existing });

		await batch(this.db, [
			this.resources.buildInsertHistory({
				uuid: crypto.randomUUID(),
				resource_uuid: uuid,
				actor_uuid: user.uuid,
				change_type: 'meta_edit',
				previous_data: previousData,
			}),
			this.repo.buildUpdateMeta(uuid, setClauses, setBindings),
		]);
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	/** Coerces the validated query filter into repository-level filters (strings → numbers for flags). */
	private toFilters(filter: AssetFilter): AssetFilters {
		const bool = (v: '0' | '1' | undefined): number | undefined => (v === undefined ? undefined : Number(v));
		return {
			asset_type: filter.asset_type,
			platform: filter.platform,
			sdk_version: filter.sdk_version,
			unity_version: filter.unity_version,
			is_nsfw: bool(filter.is_nsfw),
		};
	}
}

// =========================================================================================================
// Row → API mapping (exact legacy shape)
// =========================================================================================================

function mapListRow(row: AssetListRow) {
	return {
		uuid: row.uuid,
		title: row.title,
		thumbnail_key: row.thumbnail_key,
		thumbnail_media_uuid: row.thumbnail_media_uuid,
		placeholder_blur: row.placeholder_blur,
		processed: row.processed === 1,
		download_count: row.download_count,
		created_at: row.created_at,
		meta: {
			asset_type: row.asset_type,
			is_nsfw: row.is_nsfw,
			unity_version: row.unity_version,
			platform: row.platform,
			sdk_version: row.sdk_version,
		},
	};
}
