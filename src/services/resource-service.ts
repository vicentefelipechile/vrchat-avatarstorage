// =========================================================================================================
// RESOURCE SERVICE
// =========================================================================================================
// Business logic and authorization for resources. This is the single place that decides
// "can this user do this" — replacing the owner/admin checks that were copy-pasted across
// the legacy handlers. It talks to the repository (never raw SQL) and returns API-shaped
// objects (never DB rows). Failures are thrown as DomainErrors and mapped to HTTP by the
// central error handler.
//
// The returned shapes are byte-compatible with the legacy responses so the existing
// frontend keeps working unchanged.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { batch } from '../db/client';
import type { AuthUser } from '../auth';
import { ResourceRepository } from '../repositories/resource-repository';
import type { ResourceDetailRow } from '../repositories/resource-repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Types
// =========================================================================================================

export interface CreateResourceInput {
	title: string;
	description?: string | null;
	category: string;
	thumbnail_uuid: string;
	reference_image_uuid?: string | null;
	links?: { link_url: string; link_title?: string | null; link_type?: string; display_order?: number }[];
	media_files?: string[];
}

export interface UpdateResourceInput {
	title?: string;
	description?: string | null;
	category?: string;
	is_active?: number;
	thumbnail_uuid?: string;
	reference_image_uuid?: string | null;
	new_links?: { link_url: string; link_title?: string | null; link_type?: string }[];
	gallery_media_uuids?: string[];
}

// =========================================================================================================
// Service
// =========================================================================================================

export class ResourceService {
	private readonly repo: ResourceRepository;

	constructor(private readonly db: DB) {
		this.repo = new ResourceRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	async latest(limit = 10) {
		return this.repo.findLatest(limit);
	}

	async search(params: {
		page: number;
		limit: number;
		category?: string;
		sortBy?: string;
		sortOrder: 'ASC' | 'DESC';
	}) {
		const rows = await this.repo.search(params);
		const hasNextPage = rows.length > params.limit;
		return {
			resources: hasNextPage ? rows.slice(0, params.limit) : rows,
			pagination: { page: params.page, hasNextPage, hasPrevPage: params.page > 1 },
		};
	}

	/**
	 * Resource detail in the exact API shape. Download links and full link list are
	 * gated behind authentication (mirrors the legacy behavior).
	 */
	async detail(uuid: string, isLoggedIn: boolean) {
		const row = await this.repo.findDetail(uuid);
		if (!row) throw new NotFoundError();
		return mapDetail(row, isLoggedIn);
	}

	async history(uuid: string) {
		const rows = await this.repo.findHistory(uuid);
		return rows.map((h) => ({
			...h,
			created_at: h.created_at * 1000,
			actor: { username: h.username, avatar_url: h.avatar_url },
			previous_data: JSON.parse(h.previous_data),
		}));
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	async create(user: AuthUser, input: CreateResourceInput): Promise<{ uuid: string }> {
		const uuid = crypto.randomUUID();
		const statements: D1PreparedStatement[] = [
			this.repo.buildInsertResource({
				uuid,
				title: input.title,
				description: input.description ?? null,
				category: input.category as never,
				thumbnail_uuid: input.thumbnail_uuid,
				reference_image_uuid: input.reference_image_uuid ?? null,
				author_uuid: user.uuid,
			}),
		];

		(input.links ?? []).forEach((link, i) => {
			statements.push(
				this.repo.buildInsertLink({
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
			statements.push(this.repo.buildInsertMediaRelation(crypto.randomUUID(), uuid, mediaUuid));
		}

		await batch(this.db, statements);
		return { uuid };
	}

	/**
	 * Updates a resource. Authorization rules (preserved from legacy):
	 *   - Must be owner or admin.
	 *   - Non-admins cannot edit an already-approved (is_active=1) resource.
	 *   - Only admins may change is_active and snapshot history.
	 */
	async update(user: AuthUser, uuid: string, input: UpdateResourceInput): Promise<void> {
		const resource = await this.repo.findByUuid(uuid);
		if (!resource) throw new NotFoundError('Resource not found');

		const isOwner = resource.author_uuid === user.uuid;
		const isAdmin = user.is_admin;
		if (!isOwner && !isAdmin) throw new ForbiddenError();
		if (resource.is_active === 1 && !isAdmin) throw new ForbiddenError('Only admins can edit approved resources');

		const title = input.title ?? resource.title;
		const description = input.description ?? resource.description;
		const category = input.category ?? resource.category;
		const isActive =
			isAdmin && typeof input.is_active === 'number' && (input.is_active === 0 || input.is_active === 1)
				? input.is_active
				: resource.is_active;

		const statements: D1PreparedStatement[] = [];

		// History snapshot (admin edits only)
		if (isAdmin) {
			const previousData = JSON.stringify({
				title: resource.title,
				description: resource.description,
				category: resource.category,
			});
			statements.push(
				this.repo.buildInsertHistory({
					uuid: crypto.randomUUID(),
					resource_uuid: uuid,
					actor_uuid: user.uuid,
					change_type: 'content_edit',
					previous_data: previousData,
				}),
			);
		}

		statements.push(this.repo.buildUpdateCore(uuid, title, description, category, isActive));

		// New links (appended after the current max display_order)
		if (input.new_links && input.new_links.length > 0) {
			const existing = await this.repo.findLinks(uuid);
			let nextOrder = (existing.at(-1)?.display_order ?? 0) + 1;
			for (const link of input.new_links) {
				statements.push(
					this.repo.buildInsertLink({
						uuid: crypto.randomUUID(),
						resource_uuid: uuid,
						link_url: link.link_url,
						link_title: link.link_title ?? null,
						link_type: link.link_type ?? 'general',
						display_order: nextOrder++,
					}),
				);
			}
		}

		if (input.thumbnail_uuid !== undefined) {
			statements.push(this.repo.buildUpdateThumbnail(uuid, input.thumbnail_uuid));
		}
		if (input.reference_image_uuid !== undefined) {
			statements.push(this.repo.buildUpdateReferenceImage(uuid, input.reference_image_uuid ?? null));
		}

		// Gallery — full replacement if provided
		if (input.gallery_media_uuids !== undefined) {
			statements.push(this.repo.buildClearMediaRelations(uuid));
			for (const mediaUuid of input.gallery_media_uuids) {
				statements.push(this.repo.buildInsertMediaRelation(crypto.randomUUID(), uuid, mediaUuid));
			}
		}

		await batch(this.db, statements);
	}

	/** Deletes a resource. Admin-only (matches legacy DELETE behavior). */
	async delete(user: AuthUser, uuid: string): Promise<void> {
		if (!user.is_admin) throw new ForbiddenError();
		const resource = await this.repo.findByUuid(uuid);
		if (!resource) throw new NotFoundError('Resource not found');
		await this.repo.buildDelete(uuid).run();
	}

	// -------------------------------------------------------------------------
	// Links (owner-or-admin)
	// -------------------------------------------------------------------------

	/** Ensures the caller owns the resource or is admin; throws otherwise. */
	private async assertCanEditLinks(user: AuthUser, resourceUuid: string): Promise<void> {
		const resource = await this.repo.findByUuid(resourceUuid);
		if (!resource) throw new NotFoundError('Resource not found');
		if (resource.author_uuid !== user.uuid && !user.is_admin) throw new ForbiddenError();
	}

	async deleteLink(user: AuthUser, resourceUuid: string, linkUuid: string): Promise<void> {
		await this.assertCanEditLinks(user, resourceUuid);
		const changes = await this.repo.deleteLink(resourceUuid, linkUuid);
		if (changes === 0) throw new NotFoundError('Link not found');
	}

	async updateLink(user: AuthUser, resourceUuid: string, linkUuid: string, fields: Record<string, unknown>): Promise<void> {
		if (Object.keys(fields).length === 0) throw new ValidationError('No fields to update');
		await this.assertCanEditLinks(user, resourceUuid);
		await this.repo.updateLink(resourceUuid, linkUuid, fields);
	}
}

// =========================================================================================================
// Mapping — DB detail row → API contract (identical shape to the legacy handler)
// =========================================================================================================

function mapDetail(row: ResourceDetailRow, isLoggedIn: boolean) {
	const r = row as Record<string, unknown>;
	const mediaFiles = JSON.parse(r.media_files_json as string);
	const allLinks = JSON.parse(r.links_json as string) as { link_type: string; link_url: string }[];

	const downloadLinks = allLinks.filter((l) => l.link_type === 'download');
	const publicLinks = allLinks.filter((l) => l.link_type !== 'download');

	return {
		uuid: r.uuid,
		title: r.title,
		description: r.description,
		category: r.category,
		download_count: r.download_count,
		is_active: r.is_active,
		created_at: r.created_at,
		updated_at: r.updated_at,
		thumbnail_key: r.thumbnail_key ?? null,
		thumbnail_media_uuid: r.thumbnail_media_uuid ?? null,
		reference_image_key: r.reference_image_key ?? null,
		reference_image_media_uuid: r.reference_image_media_uuid ?? null,
		meta: mapMeta(r),
		mediaFiles,
		canDownload: isLoggedIn,
		links: isLoggedIn ? allLinks : publicLinks,
		downloadUrl: isLoggedIn ? (downloadLinks[0] as { link_url?: string } | undefined)?.link_url ?? null : null,
		backupUrls: isLoggedIn ? downloadLinks.slice(1).map((l) => l.link_url) : [],
	};
}

function mapMeta(r: Record<string, unknown>): Record<string, unknown> | null {
	const cat = r.category as string;
	if (cat === 'avatars' && r.av_gender != null) {
		return {
			avatar_gender: r.av_gender,
			avatar_size: r.av_avatar_size,
			avatar_type: r.av_avatar_type,
			is_nsfw: r.av_is_nsfw,
			has_physbones: r.av_has_physbones,
			has_face_tracking: r.av_has_face_tracking,
			has_dps: r.av_has_dps,
			has_gogoloco: r.av_has_gogoloco,
			has_toggles: r.av_has_toggles,
			is_quest_optimized: r.av_is_quest_optimized,
			sdk_version: r.av_sdk_version,
			platform: r.av_platform,
			author_name_raw: r.av_author_name_raw,
			author_name: r.av_author_name,
			author_slug: r.av_author_slug,
		};
	}
	if (cat === 'assets' && r.as_asset_type != null) {
		return {
			asset_type: r.as_asset_type,
			is_nsfw: r.as_is_nsfw,
			unity_version: r.as_unity_version,
			platform: r.as_platform,
			sdk_version: r.as_sdk_version,
		};
	}
	if (cat === 'clothes' && r.cl_clothing_type != null) {
		return {
			gender_fit: r.cl_gender_fit,
			clothing_type: r.cl_clothing_type,
			is_base: r.cl_is_base,
			is_nsfw: r.cl_is_nsfw,
			has_physbones: r.cl_has_physbones,
			platform: r.cl_platform,
			base_avatar_name_raw: r.cl_base_avatar_name_raw,
			base_avatar_uuid: r.cl_base_avatar_uuid,
		};
	}
	return null;
}
