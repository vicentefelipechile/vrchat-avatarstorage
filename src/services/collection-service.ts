// =========================================================================================================
// COLLECTION SERVICE
// =========================================================================================================
// Business logic for user favorite collections: list (with counts), create (with name
// validation, duplicate guard, and 20-collection cap), rename, delete, and batch reorder.
// All SQL lives in CollectionRepository.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import { batch, type DB } from '../db/client';
import { CollectionRepository, type CollectionRow } from '../repositories/collection-repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Constants
// =========================================================================================================

const MAX_COLLECTIONS = 20;
const GAP = 1_000_000;

// =========================================================================================================
// Service
// =========================================================================================================

export class CollectionService {
	private readonly repo: CollectionRepository;

	constructor(private readonly db: DB) {
		this.repo = new CollectionRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** All collections for a user, each with its favorite count. */
	list(userUuid: string): Promise<CollectionRow[]> {
		return this.repo.list(userUuid);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Create a new collection. Enforces 20-collection cap and unique names per user. */
	async create(user: AuthUser, name: string): Promise<{ uuid: string; name: string }> {
		const count = await this.repo.count(user.uuid);
		if (count >= MAX_COLLECTIONS) throw new ValidationError('Maximum collections reached');

		const dup = await this.repo.findByName(user.uuid, name);
		if (dup) throw new ValidationError('A collection with this name already exists');

		const uuid = crypto.randomUUID();
		const order = (await this.repo.maxOrder(user.uuid)) + GAP;
		await this.repo.insert(uuid, user.uuid, name, order);

		return { uuid, name };
	}

	/** Rename a collection. Validates ownership and unique name. */
	async rename(user: AuthUser, uuid: string, name: string): Promise<void> {
		const col = await this.repo.findByUuid(uuid);
		if (!col) throw new NotFoundError('Collection not found');
		if (col.user_uuid !== user.uuid) throw new ForbiddenError();

		const dup = await this.repo.findByName(user.uuid, name);
		if (dup && dup.uuid !== uuid) throw new ValidationError('A collection with this name already exists');

		await this.repo.update(uuid, name);
	}

	/** Delete a collection. Favorites in it become uncategorized (FK ON DELETE SET NULL). */
	async delete(user: AuthUser, uuid: string): Promise<void> {
		const col = await this.repo.findByUuid(uuid);
		if (!col) throw new NotFoundError('Collection not found');
		if (col.user_uuid !== user.uuid) throw new ForbiddenError();

		await this.repo.delete(uuid);
	}

	/** Batch-reorder collections. Receives the full ordered list of collection UUIDs. */
	async reorder(user: AuthUser, orderedUuids: string[]): Promise<void> {
		if (orderedUuids.length === 0) return;

		const existing = await this.repo.list(user.uuid);
		const owned = new Set(existing.map((c) => c.uuid));
		for (const uuid of orderedUuids) {
			if (!owned.has(uuid)) throw new ValidationError('Collection not found or not owned');
		}

		const statements = orderedUuids.map((uuid, i) => this.repo.buildUpdateOrder(uuid, (orderedUuids.length - i) * GAP));
		await batch(this.db, statements);
	}
}

// Re-exported so the route can reference the shape without reaching into the repo.
export type { CollectionRow };
