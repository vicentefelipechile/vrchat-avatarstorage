// =========================================================================================================
// FAVORITE SERVICE
// =========================================================================================================
// Business logic for user favorites: collection-scoped listing, id/ownership lookups,
// add (with resource validation + duplicate guard + collection cap), remove, batch
// reorder (debounced full-list sync), and move-to-collection. Owns the rules; all SQL
// lives in FavoriteRepository.
//
// Error mapping:
//   - resource missing        → NotFoundError   (404)
//   - resource inactive       → ForbiddenError  (403)
//   - already favorited       → ValidationError (400)
//   - favorite missing (del)  → NotFoundError   (404)
//   - collection cap reached  → ValidationError (400)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import { batch, type DB } from '../db/client';
import { FavoriteRepository, type FavoriteRow } from '../repositories/favorite-repository';
import { CollectionRepository } from '../repositories/collection-repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Constants
// =========================================================================================================

const GAP = 1_000_000;
const MAX_PER_COLLECTION = 500;
const BATCH_CHUNK = 100;

// =========================================================================================================
// Service
// =========================================================================================================

export class FavoriteService {
	private readonly repo: FavoriteRepository;
	private readonly colRepo: CollectionRepository;

	constructor(private readonly db: DB) {
		this.repo = new FavoriteRepository(db);
		this.colRepo = new CollectionRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/**
	 * Favorites in a specific collection (or uncategorized if null).
	 * Pass `'all'` to get all favorites across collections (read-only, no reorder).
	 */
	async list(userUuid: string, collectionUuid: string | null | 'all') {
		const favorites = collectionUuid === 'all' ? await this.repo.listAll(userUuid) : await this.repo.list(userUuid, collectionUuid);
		return { favorites };
	}

	/** Whether a resource is favorited by a user. */
	isFavorite(userUuid: string, resourceUuid: string): Promise<boolean> {
		return this.repo.exists(userUuid, resourceUuid);
	}

	/** All favorited resource UUIDs for a user. */
	listIds(userUuid: string): Promise<string[]> {
		return this.repo.listIds(userUuid);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Add a resource to a user's favorites, optionally into a specific collection. */
	async add(
		user: AuthUser,
		resourceUuid: string,
		collectionUuid?: string,
	): Promise<{ success: true; resource_uuid: string }> {
		const resource = await this.repo.findResource(resourceUuid);
		if (!resource) throw new NotFoundError('Resource not found');
		if (resource.is_active !== 1) throw new ForbiddenError('Resource is not available');

		if (await this.repo.exists(user.uuid, resourceUuid)) {
			throw new ValidationError('Already in favorites');
		}

		const targetCollection = collectionUuid ?? null;

		if (targetCollection) {
			const col = await this.colRepo.findByUuid(targetCollection);
			if (!col || col.user_uuid !== user.uuid) throw new NotFoundError('Collection not found');
		}

		const count = await this.repo.countInCollection(user.uuid, targetCollection);
		if (count >= MAX_PER_COLLECTION) throw new ValidationError('Maximum favorites reached for this collection');

		const newOrder = (await this.repo.maxOrderInCollection(user.uuid, targetCollection)) + GAP;
		await this.repo.insert(user.uuid, resourceUuid, newOrder, targetCollection);

		return { success: true, resource_uuid: resourceUuid };
	}

	/** Remove a resource from a user's favorites. */
	async remove(user: AuthUser, resourceUuid: string): Promise<void> {
		const changes = await this.repo.delete(user.uuid, resourceUuid);
		if (changes === 0) throw new NotFoundError('Favorite not found or could not be deleted');
	}

	/**
	 * Batch-reorder favorites within a collection. Receives the full ordered list of
	 * resource UUIDs as they appear in the UI (first = top). Assigns descending
	 * display_order values with large gaps.
	 */
	async reorder(user: AuthUser, orderedUuids: string[], collectionUuid: string | null): Promise<void> {
		if (orderedUuids.length === 0) return;

		const owned = new Set(await this.repo.listUuidsInCollection(user.uuid, collectionUuid));
		for (const uuid of orderedUuids) {
			if (!owned.has(uuid)) throw new ValidationError('Favorite not found in this collection');
		}

		const statements = orderedUuids.map((uuid, i) =>
			this.repo.buildUpdateOrder(user.uuid, uuid, (orderedUuids.length - i) * GAP),
		);

		// D1 batch limit is 100 statements; chunk if needed.
		for (let start = 0; start < statements.length; start += BATCH_CHUNK) {
			await batch(this.db, statements.slice(start, start + BATCH_CHUNK));
		}
	}

	/** Move a favorite to a different collection (or uncategorized if null). */
	async moveToCollection(user: AuthUser, resourceUuid: string, collectionUuid: string | null): Promise<void> {
		if (!(await this.repo.exists(user.uuid, resourceUuid))) {
			throw new NotFoundError('Favorite not found');
		}

		if (collectionUuid !== null) {
			const col = await this.colRepo.findByUuid(collectionUuid);
			if (!col || col.user_uuid !== user.uuid) throw new NotFoundError('Collection not found');
		}

		const count = await this.repo.countInCollection(user.uuid, collectionUuid);
		if (count >= MAX_PER_COLLECTION) throw new ValidationError('Maximum favorites reached for this collection');

		const newOrder = (await this.repo.maxOrderInCollection(user.uuid, collectionUuid)) + GAP;
		await this.repo.updateCollection(user.uuid, resourceUuid, collectionUuid, newOrder);
	}
}

// Re-exported so route/tests can reference the hydrated favorite shape without reaching into the repo.
export type { FavoriteRow };
