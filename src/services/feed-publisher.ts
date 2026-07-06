// =========================================================================================================
// FEED PUBLISHER
// =========================================================================================================
// The bridge from a domain mutation to the FeedRoom Durable Object. A mutation service, after it has
// persisted to D1, hands a typed FeedEvent here; the publisher resolves the single global feed stub
// and calls its broadcast RPC. This keeps the DO binding out of the domain services — they depend on
// this narrow publisher, not on the raw namespace, mirroring how services receive their collaborators.
//
// Publishing is best-effort: the write already succeeded, so a broadcast failure must never surface
// as a failed request. Clients that miss the live event still converge via the change-feed poller.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { FeedEvent } from '../types';

// =========================================================================================================
// Helpers
// =========================================================================================================

/** Name of the single global feed instance. One DO holds every connected client. */
const FEED_INSTANCE = 'feed';

// =========================================================================================================
// Publisher
// =========================================================================================================

export class FeedPublisher {
	constructor(private readonly namespace: Env['FEED']) {}

	/**
	 * Broadcasts `event` to every connected client through the global feed DO. Swallows any failure so
	 * a broadcast problem cannot fail the mutation that already committed.
	 */
	async publish(event: FeedEvent): Promise<void> {
		try {
			await this.namespace.getByName(FEED_INSTANCE).broadcast(event);
		} catch {
			// Live delivery is best-effort — the change-feed poller is the durable fallback.
		}
	}
}
