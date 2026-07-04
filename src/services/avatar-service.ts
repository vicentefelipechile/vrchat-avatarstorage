// =========================================================================================================
// AVATAR SERVICE
// =========================================================================================================
// Business logic for the avatars category: faceted listing, autocomplete, single fetch,
// creation (resources + avatar_meta + links + media in one batch) and admin metadata
// edits (history snapshot + partial meta update in one batch).
//
// Owns authorization and the mapping from DB rows to the exact legacy API shape so the
// existing frontend keeps working unchanged. All SQL lives in the repositories.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import { batch, type DB } from '../db/client';
import { AvatarRepository, type AvatarFilters, type AvatarListRow } from '../repositories/avatar-repository';
import { ResourceRepository } from '../repositories/resource-repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';
import type { AvatarFilter } from '../validators';

// =========================================================================================================
// Types
// =========================================================================================================

/** Validated create payload (resource core + avatar_meta + optional links/media). */
export interface CreateAvatarInput {
	title: string;
	description?: string | null;
	thumbnail_uuid: string;
	reference_image_uuid?: string | null;
	links?: { link_url: string; link_title?: string | null; link_type?: string; display_order?: number }[];
	media_files?: string[];
	meta: {
		author_uuid?: string | null;
		author_name_raw?: string | null;
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
	};
}

// =========================================================================================================
// Service
// =========================================================================================================

export class AvatarService {
	private readonly repo: AvatarRepository;
	private readonly resources: ResourceRepository;

	constructor(private readonly db: DB) {
		this.repo = new AvatarRepository(db);
		this.resources = new ResourceRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/**
	 * Faceted, paginated avatar list. `filter` is the already-parsed AvatarFilterSchema
	 * output (boolean flags arrive as '0'/'1' strings and are coerced here).
	 */
	async list(filter: AvatarFilter) {
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

	/** Autocomplete by partial title. Returns [] for queries shorter than 2 chars. */
	async searchByName(q: string | undefined, limit: number): Promise<{ uuid: string; title: string }[]> {
		const trimmed = q?.trim();
		if (!trimmed || trimmed.length < 2) return [];
		return this.repo.searchByName(`%${trimmed}%`, limit);
	}

	/** Single avatar (resource core + flat meta). Throws NotFoundError if missing. */
	async detail(uuid: string): Promise<Record<string, unknown>> {
		const row = await this.repo.findByUuid(uuid);
		if (!row) throw new NotFoundError('Not found');
		return row;
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Creates a resource + avatar_meta (+ links + media) in a single batch. Returns the new uuid. */
	async create(user: AuthUser, input: CreateAvatarInput): Promise<{ uuid: string }> {
		const uuid = crypto.randomUUID();
		const m = input.meta;

		const statements: D1PreparedStatement[] = [
			this.resources.buildInsertResource({
				uuid,
				title: input.title,
				description: input.description ?? null,
				category: 'avatars',
				thumbnail_uuid: input.thumbnail_uuid,
				reference_image_uuid: input.reference_image_uuid ?? null,
				author_uuid: user.uuid,
			}),
			this.repo.buildInsertMeta({
				resource_uuid: uuid,
				author_uuid: m.author_uuid ?? null,
				author_name_raw: m.author_name_raw ?? null,
				gender: m.gender,
				avatar_size: m.avatar_size,
				avatar_type: m.avatar_type,
				is_nsfw: m.is_nsfw,
				has_physbones: m.has_physbones,
				has_face_tracking: m.has_face_tracking,
				has_dps: m.has_dps,
				has_gogoloco: m.has_gogoloco,
				has_toggles: m.has_toggles,
				is_quest_optimized: m.is_quest_optimized,
				sdk_version: m.sdk_version,
				platform: m.platform,
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
	 * Admin-only metadata edit. Snapshots the previous avatar_meta as a `meta_edit`
	 * history entry, then applies a partial update — both atomically in one batch.
	 */
	async update(user: AuthUser, uuid: string, patch: Partial<Record<string, unknown>>): Promise<void> {
		if (!user.is_admin) throw new ForbiddenError();

		const existing = await this.repo.findMeta(uuid);
		if (!existing) throw new NotFoundError('Avatar metadata not found');

		// Whitelisted partial update — only editable columns, only keys actually present.
		const setClauses: string[] = [];
		const setBindings: unknown[] = [];
		for (const col of AvatarRepository.EDITABLE_META_COLUMNS) {
			if (patch[col] !== undefined) {
				setClauses.push(`${col} = ?`);
				setBindings.push(patch[col] ?? null);
			}
		}
		if (setClauses.length === 0) throw new ValidationError('No fields to update');

		const previousData = JSON.stringify({ meta_type: 'avatar_meta', fields: existing });

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
	private toFilters(filter: AvatarFilter): AvatarFilters {
		const bool = (v: '0' | '1' | undefined): number | undefined => (v === undefined ? undefined : Number(v));
		return {
			gender: filter.avatar_gender,
			avatar_size: filter.avatar_size,
			avatar_type: filter.avatar_type,
			platform: filter.platform,
			sdk_version: filter.sdk_version,
			is_nsfw: bool(filter.is_nsfw),
			has_physbones: bool(filter.has_physbones),
			has_face_tracking: bool(filter.has_face_tracking),
			has_dps: bool(filter.has_dps),
			has_gogoloco: bool(filter.has_gogoloco),
			has_toggles: bool(filter.has_toggles),
			is_quest_optimized: bool(filter.is_quest_optimized),
			author_uuid: filter.author_uuid,
		};
	}
}

// =========================================================================================================
// Row → API mapping (exact legacy shape)
// =========================================================================================================

function mapListRow(row: AvatarListRow) {
	return {
		uuid: row.uuid,
		title: row.title,
		thumbnail_key: row.thumbnail_key,
		thumbnail_media_uuid: row.thumbnail_media_uuid,
		download_count: row.download_count,
		created_at: row.created_at,
		meta: {
			avatar_gender: row.gender,
			avatar_size: row.avatar_size,
			avatar_type: row.avatar_type,
			is_nsfw: row.is_nsfw,
			has_physbones: row.has_physbones,
			has_face_tracking: row.has_face_tracking,
			has_dps: row.has_dps,
			has_gogoloco: row.has_gogoloco,
			has_toggles: row.has_toggles,
			is_quest_optimized: row.is_quest_optimized,
			sdk_version: row.sdk_version,
			platform: row.platform,
			author_uuid: row.author_uuid,
			author_name_raw: row.author_name_raw,
			author_name: row.author_name,
			author_slug: row.author_slug,
		},
	};
}
