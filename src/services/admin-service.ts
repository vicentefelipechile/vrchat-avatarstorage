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
const FORTY_EIGHT_HOURS = 48 * 60 * 60; // seconds
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
	/** Minimum age (hours) a media must reach before it's eligible — the 24h grace window. */
	cutoff_hours: number;
	/** Maximum age (hours) considered — media older than this is out of scope and never auto-cleaned. */
	window_hours: number;
}

/** A generic paginated envelope for the admin listings. */
export interface Paginated<T> {
	pagination: { page: number; limit: number; total: number; hasNextPage: boolean; hasPrevPage: boolean };
	rows: T[];
}

/** The result of the r2_key → uuid unification migration (dry-run or real). */
export interface MediaUnifyReport {
	dry_run: boolean;
	/** Rows examined this pass (r2_key != uuid, capped by `limit`). */
	candidates: number;
	/** Rows actually migrated this pass (real run only; 0 on dry-run). */
	migrated: number;
	/** Rows that WOULD migrate (dry-run only; 0 on real run). */
	would_migrate: number;
	/** Total free-text references that would be rewritten across the examined rows (dry-run only). */
	text_references: number;
	/** Rows skipped because their original object was missing in BUCKET (left untouched). */
	skipped_missing_original: { uuid: string; r2_key: string }[];
	/** Rows that errored mid-migration (reported, not retried in this pass). */
	errors: { uuid: string; r2_key: string; error: string }[];
	/** Rows still not unified after this pass (0 = done). Present after a real run and dry-runs. */
	remaining?: number;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class AdminService {
	private readonly repo: AdminRepository;

	constructor(db: DB) {
		this.repo = new AdminRepository(db);
	}

	/** Upper bound of the orphaned-media window: media must be older than this (24h grace) to qualify. */
	private cutoff(): number {
		return Math.floor(Date.now() / 1000) - TWENTY_FOUR_HOURS;
	}

	/** Lower bound of the orphaned-media window: media created before this (>48h old) is out of scope.
	 *  Bounding the window keeps each stats/cleanup pass to a fixed, recent slice instead of the whole
	 *  ever-growing history — the cron only ever touches media aged between 24h and 48h. */
	private windowStart(): number {
		return Math.floor(Date.now() / 1000) - FORTY_EIGHT_HOURS;
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

	/** Orphaned-media statistics (no deletion). Scoped to the 24h–48h window like the cleanup. */
	async orphanedMediaStats(): Promise<OrphanedMediaStats> {
		const cutoff = this.cutoff();
		const orphaned = await this.repo.listOrphanedMedia(cutoff, this.windowStart());
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
			window_hours: 48,
		};
	}

	/** Delete orphaned media in the 24h–48h age window from both R2 buckets + the DB. Bounding the
	 *  window keeps each run's workload fixed and recent (media older than 48h is out of scope, so it
	 *  is never auto-cleaned). Returns the count deleted. */
	async cleanupOrphanedMedia(bucket: R2Bucket, mediaBucket: R2Bucket): Promise<number> {
		const orphaned = await this.repo.listOrphanedMediaForCleanup(this.cutoff(), this.windowStart());

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

	/** Consolidated dashboard metrics. The orphaned-media count uses the same 24h–48h window as the
	 *  cleanup so the dashboard number matches what a cleanup run would actually delete. */
	fetchStats() {
		return this.repo.fetchStats(this.cutoff(), this.windowStart());
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

	// -------------------------------------------------------------------------
	// r2_key → uuid unification migration (Phase 2)
	// -------------------------------------------------------------------------

	/**
	 * Unify every media row so its R2 key equals its uuid, collapsing the two historical identifiers
	 * into one. For each row where `r2_key != uuid`:
	 *   1. copy the original object in BUCKET from the old key to the uuid key (variants in
	 *      MEDIA_BUCKET already live under `{uuid}/...`, so they need no move);
	 *   2. rewrite every free-text reference (avatar URLs, comment/blog markdown) old key → uuid;
	 *   3. point `media.r2_key` at the uuid;
	 *   4. only then delete the old object.
	 *
	 * The order is load-bearing: the new object and the rewritten text must exist BEFORE the old
	 * object is deleted, or the orphaned-media predicate (which matches r2_key inside those columns)
	 * would start deleting in-use media. Idempotent — already-unified rows are skipped by the query,
	 * and re-running only reprocesses rows that didn't finish. Rows whose old object is missing in R2
	 * are skipped and reported, never touched.
	 *
	 * `dryRun` (default true) performs NO writes: it reads each candidate, checks the original still
	 * exists in R2, and counts the text references it would rewrite — so you can see the full impact
	 * before committing. `limit` caps how many rows one pass processes (Worker CPU budget): run it
	 * repeatedly until `remaining` reaches 0.
	 */
	async unifyMediaKeys(bucket: R2Bucket, opts: { dryRun?: boolean; limit?: number } = {}): Promise<MediaUnifyReport> {
		const dryRun = opts.dryRun ?? true;
		const pending = await this.repo.listMediaToUnify(opts.limit);

		const report: MediaUnifyReport = {
			dry_run: dryRun,
			candidates: pending.length,
			migrated: 0,
			would_migrate: 0,
			text_references: 0,
			skipped_missing_original: [],
			errors: [],
		};

		for (const { uuid, r2_key: oldKey } of pending) {
			try {
				const original = await bucket.get(oldKey);
				if (!original) {
					// No object to move — leave the row untouched and report it.
					report.skipped_missing_original.push({ uuid, r2_key: oldKey });
					continue;
				}

				if (dryRun) {
					// Read-only preview: this row would migrate, and here's how much text it touches.
					report.would_migrate++;
					report.text_references += await this.repo.countTextReferences(oldKey);
					continue;
				}

				// 1. Copy the original to the uuid key, preserving its Content-Type.
				await bucket.put(uuid, original.body, { httpMetadata: original.httpMetadata });

				// 2. Rewrite free-text references, then 3. repoint the column — text before/with the
				//    column update so the predicate never sees a stale key.
				await this.repo.rewriteTextReferences(oldKey, uuid);
				await this.repo.setMediaKeyToUuid(uuid);

				// 4. Old object is now safe to delete: the new key exists and nothing references the old.
				await bucket.delete(oldKey);

				report.migrated++;
			} catch (e) {
				report.errors.push({ uuid, r2_key: oldKey, error: e instanceof Error ? e.message : String(e) });
			}
		}

		// How many candidates are still left after this pass (0 when fully unified).
		report.remaining = await this.repo.countMediaToUnify();
		return report;
	}
}
