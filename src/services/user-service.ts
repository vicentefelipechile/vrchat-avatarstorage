// =========================================================================================================
// USER SERVICE
// =========================================================================================================
// Business logic for account management: register, profile update, and password change. Owns the
// rules (uniqueness, Turnstile, password re-auth, hashing); all SQL lives in UserRepository.
//
// What stays in the route (not here): session cookies, the KV session cache, the KV pre-auth token,
// and the KV 2FA anti-replay marker. Those are context/env-bound orchestration, mirroring how the
// download/comment layers keep KV and cookies out of the service. `turnstileSecret` is passed in so
// the service stays env-agnostic.
//
// Error mapping reproduces the legacy status codes exactly:
//   - username already taken (register/update) → ConflictError    (409)
//   - failed Turnstile CAPTCHA                  → ForbiddenError   (403)
//   - user record missing                       → NotFoundError    (404)
//   - missing current password (has password)   → ValidationError  (400)
//   - wrong current password                    → ForbiddenError   (403)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import type { User } from '../types';
import { UserRepository } from '../repositories/user-repository';
import { hashPassword, verifyPassword } from '../auth';
import { verifyTurnstile } from '../helpers/turnstile';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Constants
// =========================================================================================================

/** Default avatar assigned to a freshly registered account. */
const DEFAULT_AVATAR_URL = 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';

// =========================================================================================================
// Types
// =========================================================================================================

/** Result of a successful registration — the caller creates the session. */
export interface RegisteredUser {
	uuid: string;
	username: string;
}

/** Result of a profile update — the caller refreshes session/KV if the username changed. */
export interface UpdatedProfile {
	username: string;
	avatar_url: string | null;
	usernameChanged: boolean;
	previousUsername: string;
	is_admin: number;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class UserService {
	private readonly repo: UserRepository;

	constructor(db: DB) {
		this.repo = new UserRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** The full user row for a username, or null. */
	findByUsername(username: string): Promise<User | null> {
		return this.repo.findByUsername(username);
	}

	// -------------------------------------------------------------------------
	// Register
	// -------------------------------------------------------------------------

	/**
	 * Create a new account. Requires a passing Turnstile token and a unique username.
	 * Returns the new user's identity; the route is responsible for creating the session.
	 */
	async register(username: string, password: string, token: string, turnstileSecret: string): Promise<RegisteredUser> {
		const isValid = await verifyTurnstile(token || '', turnstileSecret);
		if (!isValid) throw new ForbiddenError('Invalid CAPTCHA');

		if (await this.repo.existsByUsername(username)) throw new ConflictError('Username already taken');

		const { hash } = await hashPassword(password);
		const uuid = crypto.randomUUID();
		await this.repo.insert(uuid, username, hash, DEFAULT_AVATAR_URL);

		return { uuid, username };
	}

	// -------------------------------------------------------------------------
	// Profile update
	// -------------------------------------------------------------------------

	/**
	 * Update username and/or avatar for the authenticated user. Requires a passing Turnstile
	 * token. A username change must not collide with an existing account. Returns the resolved
	 * values plus whether the username changed so the route can refresh the session/KV cache.
	 */
	async updateProfile(
		currentUsername: string,
		newUsername: string | undefined,
		avatarUrl: string | undefined,
		token: string,
		turnstileSecret: string,
	): Promise<UpdatedProfile> {
		const isValid = await verifyTurnstile(token || '', turnstileSecret);
		if (!isValid) throw new ForbiddenError('Invalid CAPTCHA');

		const user = await this.repo.findByUsername(currentUsername);
		if (!user) throw new NotFoundError('User not found');

		let resolvedUsername = user.username;
		let resolvedAvatar = user.avatar_url;

		if (newUsername && newUsername !== user.username) {
			if (await this.repo.existsByUsername(newUsername)) throw new ConflictError('Username taken');
			resolvedUsername = newUsername;
		}

		if (avatarUrl) resolvedAvatar = avatarUrl;

		await this.repo.updateProfile(user.uuid, resolvedUsername, resolvedAvatar);

		return {
			username: resolvedUsername,
			avatar_url: resolvedAvatar,
			usernameChanged: resolvedUsername !== user.username,
			previousUsername: user.username,
			is_admin: user.is_admin,
		};
	}

	// -------------------------------------------------------------------------
	// Password change
	// -------------------------------------------------------------------------

	/**
	 * Re-authentication step for a password change. OAuth-only accounts (empty password_hash) may
	 * set an initial password without proving the current one; password-based accounts must provide
	 * the correct current password. Throws on failure; returns nothing on success.
	 */
	async verifyPasswordReauth(user: User, currentPassword: string | undefined): Promise<void> {
		const hasPassword = !!user.password_hash;
		if (!hasPassword) return;

		if (!currentPassword) throw new ValidationError('Current password is required');
		const isMatch = await verifyPassword(currentPassword, user.password_hash);
		if (!isMatch) throw new ForbiddenError('Current password is incorrect');
	}

	/** Hash a new password and persist it for the given user. */
	async setPassword(uuid: string, newPassword: string): Promise<void> {
		const { hash } = await hashPassword(newPassword);
		await this.repo.updatePasswordHash(uuid, hash);
	}

	/** Persist remaining backup codes after one is consumed (2FA fallback path). */
	saveBackupCodes(uuid: string, backupCodes: string): Promise<void> {
		return this.repo.updateBackupCodes(uuid, backupCodes);
	}
}
