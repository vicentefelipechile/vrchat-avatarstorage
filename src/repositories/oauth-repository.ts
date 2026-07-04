// =========================================================================================================
// OAUTH REPOSITORY
// =========================================================================================================
// The ONLY place `user_oauth_providers` SQL lives: looking up a linked account by provider identity
// and linking a provider to a user. User-side reads/inserts live in UserRepository; deciding what a
// result means is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, execute, type DB } from '../db/client';
import type { OAuthProvider } from '../types';

// =========================================================================================================
// Repository
// =========================================================================================================

export class OAuthRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** The local user_uuid linked to a provider identity, or null if unlinked. */
	findUserUuidByProvider(provider: OAuthProvider, providerId: string): Promise<{ user_uuid: string } | null> {
		return queryOne<{ user_uuid: string }>(
			this.db,
			'SELECT user_uuid FROM user_oauth_providers WHERE provider = ? AND provider_id = ?',
			[provider, providerId],
		);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Link a provider identity to a local user. */
	async linkProvider(userUuid: string, provider: OAuthProvider, providerId: string, email: string | null): Promise<void> {
		await execute(this.db, 'INSERT INTO user_oauth_providers (user_uuid, provider, provider_id, email) VALUES (?, ?, ?, ?)', [
			userUuid,
			provider,
			providerId,
			email,
		]);
	}
}
