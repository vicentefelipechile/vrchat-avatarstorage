// =========================================================================================================
// CHANGE FEED REPOSITORY
// =========================================================================================================
// The ONLY place `change_feed` SQL lives. `bump` records that an entity within a scope changed, and
// `latest` reads the newest updated_at per scope since a cursor, which the poller turns into a
// stale-scope list. Rows carry timestamps only, never business data.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryAll, execute, type DB } from '../db/client';
import type { FeedScope } from '../types';

// =========================================================================================================
// Types
// =========================================================================================================

/**
 * A scope the frontend can invalidate as a unit. Same vocabulary as the real-time feed — aliased to
 * `FeedScope` so the poller and the DO agree on one set of values (see src/types.ts).
 */
export type ChangeScope = FeedScope;

/** The newest change timestamp for a single scope. */
export interface ScopeChange {
	scope: ChangeScope;
	updated_at: number;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class ChangeFeedRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** The newest updated_at per scope for changes strictly after `since` (ms). Empty when nothing changed. */
	latest(since: number): Promise<ScopeChange[]> {
		return queryAll<ScopeChange>(
			this.db,
			`SELECT scope, MAX(updated_at) AS updated_at
			FROM change_feed
			WHERE updated_at > ?
			GROUP BY scope`,
			[since],
		);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Records that `entityId` changed within `scope`. */
	async bump(scope: ChangeScope, entityId: string): Promise<void> {
		await execute(this.db, 'INSERT INTO change_feed (scope, entity_id) VALUES (?, ?)', [scope, entityId]);
	}
}
