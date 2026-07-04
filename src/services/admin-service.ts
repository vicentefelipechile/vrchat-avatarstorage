// =========================================================================================================
// ADMIN SERVICE
// =========================================================================================================
// Business logic for the admin dashboard + moderation. Every method assumes the caller is already an
// admin (the route gates with requireAdmin). Owns the payload shaping (pending-resource mapping,
// orphaned-media stats), the filter/pagination math for the admin listings, and the self-demotion
// guard; all SQL lives in AdminRepository.
//
// Env collaborators that can't live in a service — the R2 buckets (BUCKET / MEDIA_BUCKET), the KV
// cache, and the UPLOAD_QUEUE — are passed INTO the methods that need them so the service stays
// env-agnostic. The route supplies them.
//
// Error mapping reproduces the legacy status codes exactly:
//   - resource missing (approve/deactivate) → NotFoundError   (404)
//   - target user missing (role change)     → NotFoundError   (404)
//   - invalid is_admin body                  → ValidationError (400)
//   - self-demotion attempt                  → ValidationError (400)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import type { UploadQueueMessage } from '../types';
import { AdminRepository, type PendingResourceRow, type AdminUserRow } from '../repositories/admin-repository';
import { NotFoundError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Constants
// =========================================================================================================

const TWENTY_FOUR_HOURS = 24 * 60 * 60; // seconds
const VALID_CATEGORIES = ['avatars', 'assets', 'clothes', 'worlds'] as const;

// =========================================================================================================
// Types
// =========================================================================================================

/** A pending resource mapped to the legacy API shape (ms timestamp + nested author). */
export type MappedPendingResource = PendingResourceRow & {
	timestamp: number;
	author: { username: string; avatar_url: string | null } | null;
};

/** The orphaned-media stats payload. */
export interface OrphanedMediaStats {
	orphaned_count: number;
	orphaned_files: { uuid: string; filename: string; type: string; age_hours: number }[];
	total_media: number;
	total_resources: number;
	cutoff_hours: number;
}

/** A generic paginated envelope for the admin listings. */
export interface Paginated<T> {
	pagination: { page: number; limit: number; total: number; hasNextPage: boolean; hasPrevPage: boolean };
	rows: T[];
}

// =========================================================================================================
// Service
// =========================================================================================================

export class AdminService {
	private readonly repo: AdminRepository;

	constructor(db: DB) {
		this.repo = new AdminRepository(db);
	}

	private cutoff(): number {
		return Math.floor(Date.now() / 1000) - TWENTY_FOUR_HOURS;
	}

	// -------------------------------------------------------------------------
	// Pending resources / moderation
	// -------------------------------------------------------------------------

	/** All pending resources, mapped to the legacy shape (ms timestamp + nested author). */
	async listPending(): Promise<MappedPendingResource[]> {
		const rows = await this.repo.listPending();
		return rows.map((r) => ({
			...r,
			timestamp: r.created_at * 1000,
			author: r.author_username ? { username: r.author_username, avatar_url: r.author_avatar } : null,
		}));
	}

	/** Approve a pending resource (activate + invalidate its category caches). Throws NotFoundError. */
	async approveResource(uuid: string, kv: KVNamespace): Promise<void> {
		const category = await this.repo.findResourceCategory(uuid);
		if (category === null) throw new NotFoundError('Resource not found');

		await this.repo.setResourceActive(uuid, 1);
		await this.invalidateResourceCaches(kv, category);
	}

	/** Deactivate an approved resource (+ invalidate its category caches). Throws NotFoundError. */
	async deactivateResource(uuid: string, kv: KVNamespace): Promise<void> {
		const category = await this.repo.findResourceCategory(uuid);
		if (category === null) throw new NotFoundError('Resource not found');

		await this.repo.setResourceActive(uuid, 0);
		await this.invalidateResourceCaches(kv, category);
	}

	/** Reject a pending resource: delete its R2 media (thumbnail + attachments) then the DB row. */
	async rejectResource(uuid: string, bucket: R2Bucket): Promise<void> {
		const mediaFiles = await this.repo.listResourceMediaKeys(uuid);
		const thumbnail = await this.repo.findResourceThumbnailKey(uuid);

		if (thumbnail) await bucket.delete(thumbnail.r2_key);
		for (const media of mediaFiles) await bucket.delete(media.r2_key);

		await this.repo.deleteResource(uuid);
	}

	private async invalidateResourceCaches(kv: KVNamespace, category: string): Promise<void> {
		await kv.delete('resource:latest');
		await kv.delete(`resource:category:${category}`);
	}

	// -------------------------------------------------------------------------
	// Orphaned media
	// -------------------------------------------------------------------------

	/** Orphaned-media statistics (no deletion). */
	async orphanedMediaStats(): Promise<OrphanedMediaStats> {
		const cutoff = this.cutoff();
		const orphaned = await this.repo.listOrphanedMedia(cutoff);
		const [totalMedia, totalResources] = await Promise.all([this.repo.countMedia(), this.repo.countResources()]);

		return {
			orphaned_count: orphaned.length,
			orphaned_files: orphaned.map((m) => ({
				uuid: m.uuid,
				filename: m.file_name,
				type: m.media_type,
				age_hours: Math.floor((Date.now() / 1000 - m.created_at) / 3600),
			})),
			total_media: totalMedia,
			total_resources: totalResources,
			cutoff_hours: 24,
		};
	}

	/** Delete orphaned media (older than 24h) from both R2 buckets + the DB. Returns the count deleted. */
	async cleanupOrphanedMedia(bucket: R2Bucket, mediaBucket: R2Bucket): Promise<number> {
		const orphaned = await this.repo.listOrphanedMediaForCleanup(this.cutoff());

		let deletedCount = 0;
		for (const media of orphaned) {
			const variants = await this.repo.listMediaVariantKeys(media.uuid);
			await Promise.all(variants.map((v) => mediaBucket.delete(v.r2_key)));
			await bucket.delete(media.r2_key);
			await this.repo.deleteMedia(media.uuid);
			deletedCount++;
		}
		return deletedCount;
	}

	// -------------------------------------------------------------------------
	// Stats / cache / roles
	// -------------------------------------------------------------------------

	/** Consolidated dashboard metrics. */
	fetchStats() {
		return this.repo.fetchStats(this.cutoff());
	}

	/**
	 * Change a target user's admin role and return the target's uuid so the route can invalidate
	 * their KV session cache. Guards against a non-boolean flag and self-demotion.
	 */
	async changeRole(actorUsername: string, targetUsername: string, isAdmin: unknown): Promise<boolean> {
		if (typeof isAdmin !== 'boolean') throw new ValidationError('is_admin must be a boolean');
		if (targetUsername === actorUsername) throw new ValidationError('Cannot change your own role');

		const targetUuid = await this.repo.findUserUuid(targetUsername);
		if (!targetUuid) throw new NotFoundError('User not found');

		await this.repo.setUserAdmin(targetUuid, isAdmin ? 1 : 0);
		return isAdmin;
	}

	// -------------------------------------------------------------------------
	// Listings
	// -------------------------------------------------------------------------

	/** A page of users (30/page), optionally filtered by username search. */
	async listUsers(search: string, page: number): Promise<Paginated<AdminUserRow>> {
		const limit = 30;
		const offset = (page - 1) * limit;
		const total = await this.repo.countUsers(search);
		const rows = await this.repo.listUsers(search, limit, offset);
		return { rows, pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 } };
	}

	/** A page of resources (30/page) with optional title/category/status filters. */
	async listResources(
		search: string,
		categoryRaw: string,
		statusRaw: string,
		page: number,
	): Promise<Paginated<Record<string, unknown>>> {
		const limit = 30;
		const offset = (page - 1) * limit;

		const category = (VALID_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : null;
		const status = statusRaw === '0' ? 0 : statusRaw === '1' ? 1 : null;

		const clauses: string[] = [];
		const bindings: unknown[] = [];
		if (search) {
			clauses.push('r.title LIKE ?');
			bindings.push(`%${search}%`);
		}
		if (category) {
			clauses.push('r.category = ?');
			bindings.push(category);
		}
		if (status !== null) {
			clauses.push('r.is_active = ?');
			bindings.push(status);
		}
		const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

		const total = await this.repo.countResourcesFiltered(where, bindings);
		const rows = await this.repo.listResourcesFiltered(where, bindings, limit, offset);
		return { rows, pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 } };
	}

	// -------------------------------------------------------------------------
	// Media variant backfill
	// -------------------------------------------------------------------------

	/** Enqueue a variant-generation job for every image lacking variants. Returns the enqueued count. */
	async backfillVariants(queue: Queue<UploadQueueMessage>): Promise<number> {
		const rows = await this.repo.listImagesWithoutVariants();
		for (const row of rows) {
			await queue.send({
				media_uuid: row.uuid,
				r2_key: row.r2_key,
				media_type: 'image',
				file_name: 'backfill',
				uploaded_at: Date.now(),
			});
		}
		return rows.length;
	}
}
