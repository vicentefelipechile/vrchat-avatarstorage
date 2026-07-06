// =========================================================================================================
// CHANGE FEED SERVICE
// =========================================================================================================
// Business logic for the change-feed read path that backs the frontend poller. Clamps the caller's
// `since` cursor to a sane window, resolves the newest change timestamp per scope, and returns the
// server clock so the client advances its cursor without trusting its own time.
//
// The write path does not go through here: each mutation service calls ChangeFeedRepository.bump at
// the point its entity becomes public — comment/post creation, and resource approval (not resource
// creation, which is hidden pending review).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { ChangeFeedRepository, type ScopeChange } from '../repositories/change-feed-repository';

// =========================================================================================================
// Types
// =========================================================================================================

/** The poller response: server clock plus the newest change timestamp per scope since the cursor. */
export interface UpdatesResult {
	now: number;
	changes: ScopeChange[];
}

// =========================================================================================================
// Helpers
// =========================================================================================================

/** Longest lookback a caller may request. A first poll (no cursor) only reports the last minute. */
const MAX_LOOKBACK_MS = 60 * 1000;

// =========================================================================================================
// Service
// =========================================================================================================

export class ChangeFeedService {
	private readonly repo: ChangeFeedRepository;

	constructor(db: DB) {
		this.repo = new ChangeFeedRepository(db);
	}

	/**
	 * Newest change per scope since `since` (ms). A missing, non-finite, or too-old cursor is clamped
	 * to `now - MAX_LOOKBACK_MS` so a client cannot ask the DB to scan the whole history, and a fresh
	 * client (no stored cursor) only learns about the last minute rather than the entire backlog.
	 */
	async latest(since: number | undefined): Promise<UpdatesResult> {
		const now = Date.now();
		const floor = now - MAX_LOOKBACK_MS;
		const cursor = since !== undefined && Number.isFinite(since) ? Math.max(since, floor) : floor;
		const changes = await this.repo.latest(cursor);
		return { now, changes };
	}
}
