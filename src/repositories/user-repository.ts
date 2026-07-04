// =========================================================================================================
// USER REPOSITORY
// =========================================================================================================
// The ONLY place `users` SQL lives. Methods return DB row types (or metadata); deciding what a
// result means (not-found, uniqueness conflict, ownership) is the service's job. Session/KV/cookie
// state and 2FA anti-replay are orchestrated in the route, not here — this layer is pure persistence.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, execute, type DB } from '../db/client';
import type { User } from '../types';

// =========================================================================================================
// Repository
// =========================================================================================================

export class UserRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** The full user row for a username, or null if it doesn't exist. */
	findByUsername(username: string): Promise<User | null> {
		return queryOne<User>(this.db, 'SELECT * FROM users WHERE username = ?', [username]);
	}

	/** Whether a user with this username already exists (uniqueness checks). */
	async existsByUsername(username: string): Promise<boolean> {
		const row = await queryOne<{ one: number }>(this.db, 'SELECT 1 AS one FROM users WHERE username = ?', [username]);
		return row !== null;
	}

	/** Minimal identity (username + admin flag) for a user uuid, or null. Used by OAuth login. */
	findIdentityByUuid(uuid: string): Promise<{ username: string; is_admin: number } | null> {
		return queryOne<{ username: string; is_admin: number }>(this.db, 'SELECT username, is_admin FROM users WHERE uuid = ?', [uuid]);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a new user with a hashed password and default avatar. */
	async insert(uuid: string, username: string, passwordHash: string, avatarUrl: string): Promise<void> {
		await execute(this.db, 'INSERT INTO users (uuid, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)', [
			uuid,
			username,
			passwordHash,
			avatarUrl,
		]);
	}

	/** Insert a new OAuth-only user (empty password_hash — the account has no local password). */
	async insertOAuthUser(uuid: string, username: string, avatarUrl: string): Promise<void> {
		await execute(this.db, 'INSERT INTO users (uuid, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)', [
			uuid,
			username,
			'',
			avatarUrl,
		]);
	}

	/** Update a user's username and avatar_url by uuid. */
	async updateProfile(uuid: string, username: string, avatarUrl: string | null): Promise<void> {
		await execute(this.db, 'UPDATE users SET username = ?, avatar_url = ? WHERE uuid = ?', [username, avatarUrl, uuid]);
	}

	/** Update a user's password hash by uuid. */
	async updatePasswordHash(uuid: string, passwordHash: string): Promise<void> {
		await execute(this.db, 'UPDATE users SET password_hash = ? WHERE uuid = ?', [passwordHash, uuid]);
	}

	/** Persist the remaining backup codes after one is consumed. */
	async updateBackupCodes(uuid: string, backupCodes: string): Promise<void> {
		await execute(this.db, 'UPDATE users SET two_factor_backup_codes = ? WHERE uuid = ?', [backupCodes, uuid]);
	}

	// -------------------------------------------------------------------------
	// Two-factor writes
	// -------------------------------------------------------------------------

	/** Store the encrypted secret + hashed backup codes during 2FA setup (not yet enabled). */
	async storeTwoFactorSetup(uuid: string, encryptedSecret: string, hashedBackupCodes: string): Promise<void> {
		await execute(this.db, 'UPDATE users SET two_factor_secret = ?, two_factor_backup_codes = ? WHERE uuid = ?', [
			encryptedSecret,
			hashedBackupCodes,
			uuid,
		]);
	}

	/** Mark 2FA as enabled and replace the backup codes (after a successful verify). */
	async enableTwoFactor(uuid: string, hashedBackupCodes: string): Promise<void> {
		await execute(this.db, 'UPDATE users SET two_factor_enabled = 1, two_factor_backup_codes = ? WHERE uuid = ?', [
			hashedBackupCodes,
			uuid,
		]);
	}

	/** Disable 2FA and clear the secret + backup codes. */
	async disableTwoFactor(uuid: string): Promise<void> {
		await execute(
			this.db,
			'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE uuid = ?',
			[uuid],
		);
	}
}
