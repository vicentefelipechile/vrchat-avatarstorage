// =========================================================================================================
// ANONYMITY HELPERS
// =========================================================================================================
// Shared utilities for the account anonymity feature. When a user enables anonymous mode,
// every public-facing surface substitutes their real username and avatar with a deterministic
// pseudonym derived from their UUID and the static default avatar.
//
// The pseudonym format is "Anonymous {uuid.slice(0,5)}" — stable across sessions, short enough
// to display comfortably, and practically collision-free within any realistic user population.
// =========================================================================================================

// =========================================================================================================
// Constants
// =========================================================================================================

/** The avatar URL returned for anonymous users. Matches the static default in /public. */
export const ANON_AVATAR = '/avatar.png';

// =========================================================================================================
// Helpers
// =========================================================================================================

/** Deterministic pseudonym for an anonymous user, derived from the first 5 chars of their UUID. */
export function anonymousName(uuid: string): string {
	return `Anonymous ${uuid.slice(0, 5)}`;
}

/**
 * Resolves the public-facing display identity for a user. Returns the real username and avatar
 * when the user is not anonymous, or the pseudonym and default avatar when they are.
 *
 * Used by services after fetching raw data, and can also be called from SQL result mapping.
 */
export function resolveDisplayIdentity(
	uuid: string,
	username: string,
	avatarUrl: string | null,
	isAnonymous: number | boolean,
): { display_name: string; display_avatar: string | null } {
	if (isAnonymous) {
		return { display_name: anonymousName(uuid), display_avatar: ANON_AVATAR };
	}
	return { display_name: username, display_avatar: avatarUrl };
}

// =========================================================================================================
// SQL Fragments
// =========================================================================================================

/**
 * SQL CASE expression that resolves the display username for a user row. Pass the table alias
 * used in the surrounding query (e.g. `'u'`). The expression evaluates to the anonymous
 * pseudonym when `is_anonymous = 1`, or the real `username` otherwise.
 *
 * Example output: `CASE WHEN u.is_anonymous = 1 THEN 'Anonymous ' || SUBSTR(u.uuid, 1, 5) ELSE u.username END`
 */
export function anonUsernameExpr(alias: string): string {
	return `CASE WHEN ${alias}.is_anonymous = 1 THEN 'Anonymous ' || SUBSTR(${alias}.uuid, 1, 5) ELSE ${alias}.username END`;
}

/**
 * SQL CASE expression that resolves the display avatar_url. Returns `'/avatar.png'` for
 * anonymous users, or the real `avatar_url` otherwise.
 */
export function anonAvatarExpr(alias: string): string {
	return `CASE WHEN ${alias}.is_anonymous = 1 THEN '/avatar.png' ELSE ${alias}.avatar_url END`;
}
