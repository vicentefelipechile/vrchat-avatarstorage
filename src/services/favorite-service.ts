// =========================================================================================================
// FAVORITE SERVICE
// =========================================================================================================
// Business logic for user favorites: paginated listing, id/ownership lookups, add (with
// resource validation + duplicate guard + next display_order), remove, and reorder
// (move-to-top). Owns the rules; all SQL lives in FavoriteRepository.
//
// Error mapping is chosen to reproduce the legacy status codes exactly:
//   - resource missing        → NotFoundError   (404)
//   - resource inactive       → ForbiddenError  (403)
//   - already favorited       → ValidationError (400)   ← NOT 409, to match legacy
//   - favorite missing (del)  → NotFoundError   (404)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import type { DB } from '../db/client';
import { FavoriteRepository, type FavoriteRow } from '../repositories/favorite-repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Service
// =========================================================================================================

export class FavoriteService {
	private readonly repo: FavoriteRepository;

	constructor(db: DB) {
		this.repo = new FavoriteRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Paginated favorites list for a user. */
	async list(userUuid: string, page: number, limit: number) {
		const offset = (page - 1) * limit;
		const [total, favorites] = await Promise.all([this.repo.count(userUuid), this.repo.list(userUuid, limit, offset)]);
		return {
			favorites,
			pagination: {
				page,
				limit,
				total,
				total_pages: Math.ceil(total / limit),
				hasNextPage: offset + limit < total,
				hasPrevPage: page > 1,
			},
		};
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

	/** Add a resource to a user's favorites (appended at the top of the ordering). */
	async add(user: AuthUser, resourceUuid: string): Promise<{ success: true; resource_uuid: string }> {
		const resource = await this.repo.findResource(resourceUuid);
		if (!resource) throw new NotFoundError('Resource not found');
		if (resource.is_active !== 1) throw new ForbiddenError('Resource is not available');

		if (await this.repo.exists(user.uuid, resourceUuid)) {
			throw new ValidationError('Already in favorites');
		}

		const newOrder = (await this.repo.maxOrder(user.uuid)) + 1;
		await this.repo.insert(user.uuid, resourceUuid, newOrder);

		return { success: true, resource_uuid: resourceUuid };
	}

	/** Remove a resource from a user's favorites. Throws NotFoundError if nothing matched. */
	async remove(user: AuthUser, resourceUuid: string): Promise<void> {
		const changes = await this.repo.delete(user.uuid, resourceUuid);
		if (changes === 0) throw new NotFoundError('Favorite not found or could not be deleted');
	}

	/** Reorder a favorite. Currently only supports move-to-top. Throws NotFoundError if absent. */
	async reorder(user: AuthUser, resourceUuid: string, moveToTop: boolean): Promise<void> {
		const order = await this.repo.findOrder(user.uuid, resourceUuid);
		if (order === null) throw new NotFoundError('Favorite not found');

		if (moveToTop) {
			const newOrder = (await this.repo.maxOrder(user.uuid)) + 1;
			await this.repo.updateOrder(user.uuid, resourceUuid, newOrder);
		}
	}
}

// Re-exported so route/tests can reference the hydrated favorite shape without reaching into the repo.
export type { FavoriteRow };
