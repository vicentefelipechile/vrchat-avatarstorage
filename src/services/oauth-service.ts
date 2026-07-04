// =========================================================================================================
// OAUTH SERVICE
// =========================================================================================================
// Business logic for OAuth 2.0 login/registration. Owns the three-case resolution (existing link,
// pending registration) and the "complete registration after username selection" flow. SQL lives in
// OAuthRepository (provider links) + UserRepository (user rows). The pending registration is genuine
// domain state stored in KV (not a cache), so KV is a collaborator here — passed in per the same
// env-agnostic convention as the other services. Session creation + the `user:` session cache stay
// in the route.
//
// Error mapping reproduces the legacy status codes exactly:
//   - expired/missing pending token (complete) → GoneError      (410)
//   - username already taken (complete)        → ConflictError  (409)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import type { OAuthProvider, OAuthPendingRegistration } from '../types';
import { OAuthRepository } from '../repositories/oauth-repository';
import { UserRepository } from '../repositories/user-repository';
import { ConflictError, GoneError } from '../domain/errors';

// =========================================================================================================
// Constants
// =========================================================================================================

const PENDING_TTL_SECONDS = 60 * 15; // 15 minutes
const DEFAULT_AVATAR_URL = 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';

// =========================================================================================================
// Types
// =========================================================================================================

/** The provider identity resolved from a verified OAuth token. */
export interface OAuthIdentity {
	provider: OAuthProvider;
	providerId: string;
	email: string | null;
	avatarUrl: string | null;
}

/** Resolution result: a known account (create a session) or a new one (choose a username first). */
export type OAuthResolution =
	| { status: 'existing'; user_uuid: string; username: string; is_admin: number }
	| { status: 'pending'; pendingToken: string };

/** The user created after a pending registration is completed. */
export interface CompletedRegistration {
	user_uuid: string;
	username: string;
	is_admin: number;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class OAuthService {
	private readonly oauthRepo: OAuthRepository;
	private readonly userRepo: UserRepository;

	constructor(
		db: DB,
		private readonly kv: KVNamespace,
	) {
		this.oauthRepo = new OAuthRepository(db);
		this.userRepo = new UserRepository(db);
	}

	// -------------------------------------------------------------------------
	// Resolve identity (callback)
	// -------------------------------------------------------------------------

	/**
	 * Resolve a verified provider identity to a local user.
	 *   - Provider already linked → { status: 'existing' } (the route creates a session).
	 *   - Otherwise → a pending registration token stored in KV (redirect to username selection).
	 *
	 * We deliberately do NOT link by email alone: email can be claimed by anyone with a Google
	 * account, so linking a new provider to an existing account must be explicit.
	 */
	async resolveIdentity(identity: OAuthIdentity): Promise<OAuthResolution> {
		const { provider, providerId, email, avatarUrl } = identity;

		const link = await this.oauthRepo.findUserUuidByProvider(provider, providerId);
		if (link) {
			const user = await this.userRepo.findIdentityByUuid(link.user_uuid);
			if (user) {
				return { status: 'existing', user_uuid: link.user_uuid, username: user.username, is_admin: user.is_admin };
			}
		}

		// Brand new user — stash the pending data in KV until they pick a username.
		const pendingToken = crypto.randomUUID();
		const pending: OAuthPendingRegistration = { provider, provider_id: providerId, email, avatar_url: avatarUrl };
		await this.kv.put(`oauth_pending:${pendingToken}`, JSON.stringify(pending), { expirationTtl: PENDING_TTL_SECONDS });
		return { status: 'pending', pendingToken };
	}

	// -------------------------------------------------------------------------
	// Complete registration
	// -------------------------------------------------------------------------

	/**
	 * Finish a pending OAuth registration once the user has chosen a username. Consumes the
	 * one-time pending token, re-checks username availability, then creates the user + provider link.
	 */
	async completeRegistration(pendingToken: string, username: string): Promise<CompletedRegistration> {
		// 1. Read + consume the pending token (one-time use).
		const rawPending = await this.kv.get(`oauth_pending:${pendingToken}`);
		if (!rawPending) throw new GoneError('Registration session expired or not found');
		await this.kv.delete(`oauth_pending:${pendingToken}`);

		const pending: OAuthPendingRegistration = JSON.parse(rawPending);

		// 2. Re-check availability (the username may have been taken since selection).
		if (await this.userRepo.existsByUsername(username)) throw new ConflictError('Username already taken');

		// 3. Create the user (OAuth-only, no local password) + link the provider.
		const userUuid = crypto.randomUUID();
		const avatarUrl = pending.avatar_url ?? DEFAULT_AVATAR_URL;
		await this.userRepo.insertOAuthUser(userUuid, username, avatarUrl);
		await this.oauthRepo.linkProvider(userUuid, pending.provider, pending.provider_id, pending.email);

		return { user_uuid: userUuid, username, is_admin: 0 };
	}
}
