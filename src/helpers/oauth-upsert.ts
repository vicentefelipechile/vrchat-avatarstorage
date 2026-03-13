// ============================================================================
// OAUTH UPSERT HELPER
// ============================================================================
// Generic helper called by any OAuth provider route.
// Handles the three-case resolution: existing account, email link, or new pending.
// ============================================================================

import { OAuthPendingRegistration, OAuthProvider, UserOAuthProvider } from '../types';

export interface OAuthIdentity {
	provider: OAuthProvider;
	providerId: string;
	email: string | null;
	avatarUrl: string | null;
}

export type OAuthUpsertResult =
	| { status: 'existing'; user_uuid: string; username: string; is_admin: number }
	| { status: 'pending'; pendingToken: string };

const PENDING_TTL_SECONDS = 60 * 15; // 15 minutes

/**
 * Resolves an OAuth identity to a local user, or creates a pending registration
 * token if this is a completely new account.
 *
 * Returns either:
 *   { status: 'existing', ... }  — create a session immediately
 *   { status: 'pending', pendingToken }  — redirect to /register/oauth?token=...
 */
export async function oauthUpsertUser(
	db: D1Database,
	kv: KVNamespace,
	identity: OAuthIdentity,
): Promise<OAuthUpsertResult> {
	const { provider, providerId, email, avatarUrl } = identity;

	// ── Case 1: Provider ID already linked to an account ──────────────────────
	const existingRow = await db
		.prepare('SELECT user_uuid FROM user_oauth_providers WHERE provider = ? AND provider_id = ?')
		.bind(provider, providerId)
		.first<{ user_uuid: string }>();

	if (existingRow) {
		const user = await db
			.prepare('SELECT username, is_admin FROM users WHERE uuid = ?')
			.bind(existingRow.user_uuid)
			.first<{ username: string; is_admin: number }>();
		if (user) {
			return { status: 'existing', user_uuid: existingRow.user_uuid, username: user.username, is_admin: user.is_admin };
		}
	}

	// ── Case 2: Email belongs to an existing account linked via another provider ─
	// We do NOT link by email alone for security — a user must explicitly link accounts.
	// (Email can be claimed by anyone with a Google account.)

	// ── Case 3: Brand new user — store pending data in KV ─────────────────────
	const pendingToken = crypto.randomUUID();
	const pending: OAuthPendingRegistration = { provider, provider_id: providerId, email, avatar_url: avatarUrl };
	await kv.put(`oauth_pending:${pendingToken}`, JSON.stringify(pending), { expirationTtl: PENDING_TTL_SECONDS });
	return { status: 'pending', pendingToken };
}

/**
 * Completes a pending OAuth registration after the user has chosen a username.
 * Called from POST /api/auth/complete.
 *
 * Returns the created user record or throws on validation failure.
 */
export async function completeOAuthRegistration(
	db: D1Database,
	kv: KVNamespace,
	pendingToken: string,
	username: string,
): Promise<{ user_uuid: string; username: string; is_admin: number }> {
	// 1. Read and delete pending token (one-time use)
	const rawPending = await kv.get(`oauth_pending:${pendingToken}`);
	if (!rawPending) throw new OAuthPendingError('Registration session expired or not found');

	await kv.delete(`oauth_pending:${pendingToken}`);

	const pending: OAuthPendingRegistration = JSON.parse(rawPending);

	// 2. Double-check username is still available
	const taken = await db.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
	if (taken) throw new OAuthUsernameError('Username already taken');

	// 3. Insert user
	const userUuid = crypto.randomUUID();
	const avatarUrl = pending.avatar_url ?? 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';

	await db
		.prepare('INSERT INTO users (uuid, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)')
		.bind(userUuid, username, '', avatarUrl)
		.run();

	// 4. Insert provider link
	await db
		.prepare('INSERT INTO user_oauth_providers (user_uuid, provider, provider_id, email) VALUES (?, ?, ?, ?)')
		.bind(userUuid, pending.provider, pending.provider_id, pending.email)
		.run();

	return { user_uuid: userUuid, username, is_admin: 0 };
}

// ---------------------------------------------------------------------------
// Custom errors for route-level error handling
// ---------------------------------------------------------------------------

export class OAuthPendingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OAuthPendingError';
	}
}

export class OAuthUsernameError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OAuthUsernameError';
	}
}
