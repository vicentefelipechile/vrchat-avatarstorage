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

	findProviderByUser(userUuid: string, provider: OAuthProvider): Promise<{ refresh_token_encrypted: string | null; drive_scopes: string | null; drive_default_folder_id: string | null; drive_default_folder_name: string | null } | null> {
		return queryOne(this.db, 'SELECT refresh_token_encrypted, drive_scopes, drive_default_folder_id, drive_default_folder_name FROM user_oauth_providers WHERE user_uuid = ? AND provider = ?', [
			userUuid,
			provider,
		]);
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

	async updateDriveTokens(userUuid: string, provider: OAuthProvider, refreshTokenEncrypted: string, scopes: string): Promise<void> {
		await execute(this.db, 'UPDATE user_oauth_providers SET refresh_token_encrypted = ?, drive_scopes = ? WHERE user_uuid = ? AND provider = ?', [
			refreshTokenEncrypted,
			scopes,
			userUuid,
			provider,
		]);
	}

	async updateDriveFolder(userUuid: string, provider: OAuthProvider, folderId: string | null, folderName: string | null): Promise<void> {
		await execute(this.db, 'UPDATE user_oauth_providers SET drive_default_folder_id = ?, drive_default_folder_name = ? WHERE user_uuid = ? AND provider = ?', [
			folderId,
			folderName,
			userUuid,
			provider,
		]);
	}

	async clearDriveLink(userUuid: string, provider: OAuthProvider): Promise<void> {
		await execute(this.db, 'UPDATE user_oauth_providers SET refresh_token_encrypted = NULL, drive_scopes = NULL, drive_default_folder_id = NULL, drive_default_folder_name = NULL WHERE user_uuid = ? AND provider = ?', [
			userUuid,
			provider,
		]);
	}
}
