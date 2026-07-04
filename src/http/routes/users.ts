// =========================================================================================================
// USER ROUTES (v2)
// =========================================================================================================
// Thin HTTP handlers for authentication and account management, mounted at /api/auth. Handlers
// resolve auth, parse/validate input, orchestrate the context-bound pieces (session cookie, KV
// session cache, KV pre-auth token, KV 2FA anti-replay), and delegate the business rules + SQL to
// UserService / UserRepository. Domain errors map to HTTP via app.onError.
//
// The JSON responses are identical to the legacy handler so the existing frontend works unchanged.
//
// AUTHENTICATION FLOW
// -------------------
// 1. POST /register | /login with credentials + a Turnstile token.
// 2. Login WITHOUT 2FA → createSession() writes a signed cookie; the user is cached in KV (7d).
// 3. Login WITH 2FA → a short-lived pre-auth token (KV, 5 min) is returned; the client completes
//    the second factor via POST /login/2fa before a full session is created.
// 4. getAuthUser() resolves the session cookie on every protected request (KV cache → DB fallback).
//
// TWO-FACTOR (TOTP) — anti-replay
// -------------------------------
// Every used TOTP code is hashed (SHA-256) and stored in KV for 90s so the same code cannot be
// submitted twice within its validity window. Backup codes fall back when the TOTP code is invalid.
//
// RE-AUTHENTICATION
// -----------------
// POST /me/password requires current_password (unless OAuth-only) and, if 2FA is enabled, a valid
// TOTP/backup code. On success the KV session cache is purged, forcing re-authentication.
//
// ENDPOINTS
// ---------
// POST /register    — Create a new account (Turnstile required).
// POST /login       — Password login; returns pre-auth token if 2FA is active.
// POST /login/2fa   — Complete 2FA step and create full session.
// GET  /status      — Return current session info (username, is_admin, avatar_url).
// POST /logout      — Destroy the session cookie.
// PUT  /me          — Update username and/or avatar URL (Turnstile required).
// POST /me/password — Change password (re-auth + 2FA if enabled).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { createSession, getAuthUser, deleteSession, getUserWith2FA, getDecrypted2FASecret, verifyPassword } from '../../auth';
import { verifyTwoFactorCode, verifyBackupCode, useBackupCode } from '../../auth/2fa';
import { RegisterSchema, LoginSchema, UserUpdateSchema, TwoFactorLoginSchema, ChangePasswordSchema } from '../../validators';
import { verifyTurnstile } from '../../helpers/turnstile';
import { UserService } from '../../services/user-service';

// =========================================================================================================
// Constants / helpers
// =========================================================================================================

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

/** Cache the session user in KV under `user:<username>` (7d), mirroring the legacy shape. */
function cacheSessionUser(c: { env: Env }, username: string, isAdmin: number): Promise<void> {
	const sessionUser = { username, is_admin: isAdmin === 1 };
	return c.env.VRCSTORAGE_KV.put(`user:${username}`, JSON.stringify(sessionUser), { expirationTtl: SESSION_TTL });
}

/** SHA-256 hex digest of a TOTP/backup code, for the KV anti-replay marker key. */
async function codeDigest(code: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// =========================================================================================================
// Endpoint
// =========================================================================================================

const users = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// POST /api/auth/register
// Register a new user.
// =========================================================================================================

users.post('/register', async (c) => {
	const body = await c.req.json();
	const { username, password, token } = RegisterSchema.parse(body);

	try {
		const newUser = await new UserService(c.env.DB).register(username, password, token || '', c.env.TURNSTILE_SECRET_KEY);
		await createSession(c, { username: newUser.username, is_admin: 0 });
		return c.json({ success: true });
	} catch (e) {
		// Domain errors (Conflict/Forbidden) bubble to app.onError with their status.
		if ((e as { status?: number }).status) throw e;
		console.error('Registration error:', e);
		return c.json({ error: 'Registration failed' }, 500);
	}
});

// =========================================================================================================
// POST /api/auth/login
// Login a user. Returns a pre-auth token when 2FA is enabled.
// Rate limiting is handled by the native Cloudflare ratelimit binding in index.ts.
// =========================================================================================================

users.post('/login', async (c) => {
	const body = await c.req.json();
	const { username, password, token } = LoginSchema.parse(body);

	const service = new UserService(c.env.DB);

	// Turnstile first (matches legacy order); a failed CAPTCHA is a 403.
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	// Always query DB even for unknown users to prevent timing-based username enumeration.
	const user = await service.findByUsername(username);
	if (!user) return c.json({ error: 'Invalid credentials' }, 401);

	const isMatch = await verifyPassword(password, user.password_hash);
	if (!isMatch) return c.json({ error: 'Invalid credentials' }, 401);

	// 2FA enabled → issue a short-lived pre-auth token; the session is created after /login/2fa.
	if (user.two_factor_enabled === 1) {
		const preAuthToken = crypto.randomUUID();
		await c.env.VRCSTORAGE_KV.put(`pre_auth:${preAuthToken}`, user.username, { expirationTtl: 300 });
		return c.json({ requires_2fa: true, username: user.username, pre_auth_token: preAuthToken });
	}

	await createSession(c, { username: user.username, is_admin: user.is_admin });
	await cacheSessionUser(c, user.username, user.is_admin);
	return c.json({ success: true });
});

// =========================================================================================================
// PUT /api/auth/me
// Update user profile (username, avatar). Turnstile required.
// =========================================================================================================

users.put('/me', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { username, avatar_url, token } = UserUpdateSchema.parse(body);

	try {
		const result = await new UserService(c.env.DB).updateProfile(
			authUser.username,
			username,
			avatar_url ?? undefined,
			token || '',
			c.env.TURNSTILE_SECRET_KEY,
		);

		// Refresh session + KV cache if the username changed, then repopulate the cache.
		if (result.usernameChanged) {
			await createSession(c, { username: result.username, is_admin: result.is_admin });
			await c.env.VRCSTORAGE_KV.delete(`user:${result.previousUsername}`);
		}
		await cacheSessionUser(c, result.username, result.is_admin);

		return c.json({ success: true, username: result.username, avatar_url: result.avatar_url });
	} catch (e) {
		if ((e as { status?: number }).status) throw e;
		console.error('Update user error:', e);
		return c.json({ error: 'Failed to update user' }, 500);
	}
});

// =========================================================================================================
// GET /api/auth/status
// Check if the user is logged in.
// =========================================================================================================

users.get('/status', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({ loggedIn: false, username: null, is_admin: false, avatar_url: null });
	}

	const user = await new UserService(c.env.DB).findByUsername(authUser.username);

	return c.json({
		loggedIn: !!user,
		username: user ? user.username : null,
		is_admin: user ? !!user.is_admin : false,
		avatar_url: user ? user.avatar_url : null,
		has_password: user ? !!user.password_hash : false,
	});
});

// =========================================================================================================
// POST /api/auth/logout
// Logout a user.
// =========================================================================================================

users.post('/logout', async (c) => {
	await deleteSession(c);
	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/auth/login/2fa
// Verify the 2FA code and create the session.
// =========================================================================================================

users.post('/login/2fa', async (c) => {
	const body = await c.req.json();
	const { username, code, pre_auth_token } = TwoFactorLoginSchema.parse(body);

	// Validate + single-use consume the pre-auth token (proves the password step was passed).
	const preAuthUsername = await c.env.VRCSTORAGE_KV.get(`pre_auth:${pre_auth_token}`);
	await c.env.VRCSTORAGE_KV.delete(`pre_auth:${pre_auth_token}`);

	if (!preAuthUsername || preAuthUsername !== username) {
		return c.json({ error: 'Invalid or expired session. Please log in again.' }, 401);
	}

	const user = await getUserWith2FA(c, username);
	if (!user) return c.json({ error: 'User not found' }, 404);
	if (user.two_factor_enabled !== 1) return c.json({ error: '2FA is not enabled for this user' }, 400);

	const secret = await getDecrypted2FASecret(c, user);
	if (!secret) return c.json({ error: 'Failed to decrypt 2FA secret' }, 500);

	// Anti-replay: reject a code already used within its window.
	const usedCodeKey = `used_2fa_code:${user.uuid}:${await codeDigest(code)}`;
	if (await c.env.VRCSTORAGE_KV.get(usedCodeKey)) {
		return c.json({ error: 'This code has already been used. Please wait for the next one.' }, 401);
	}

	let isValid = verifyTwoFactorCode(secret, code);
	if (isValid) {
		await c.env.VRCSTORAGE_KV.put(usedCodeKey, '1', { expirationTtl: 90 });
	}

	// Fall back to backup codes if the TOTP code was invalid.
	if (!isValid && user.two_factor_backup_codes) {
		if (await verifyBackupCode(user.two_factor_backup_codes, code)) {
			const remainingCodes = await useBackupCode(user.two_factor_backup_codes, code);
			if (remainingCodes !== null) {
				await new UserService(c.env.DB).saveBackupCodes(user.uuid, remainingCodes);
				isValid = true;
			}
		}
	}

	if (!isValid) return c.json({ error: 'Invalid code' }, 401);

	await createSession(c, { username: user.username, is_admin: user.is_admin });
	await cacheSessionUser(c, user.username, user.is_admin);
	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/auth/me/password
// Change the authenticated user's password. Requires current_password (unless OAuth-only) as a
// re-authentication step, plus a valid 2FA code when 2FA is enabled.
// =========================================================================================================

users.post('/me/password', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { current_password, new_password, two_factor_code, token } = ChangePasswordSchema.parse(body);

	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid token' }, 401);

	const service = new UserService(c.env.DB);
	const user = await service.findByUsername(authUser.username);
	if (!user) return c.json({ error: 'User not found' }, 404);

	// Re-auth: password-based accounts must prove the current password; OAuth-only accounts skip it.
	// Throws ValidationError (400) / ForbiddenError (403) → mapped by app.onError.
	await service.verifyPasswordReauth(user, current_password);

	// 2FA: if enabled, a valid TOTP (or backup) code must accompany the change.
	if (user.two_factor_enabled === 1) {
		if (!two_factor_code) return c.json({ error: 'Two-factor authentication code is required' }, 403);

		const userWith2FA = await getUserWith2FA(c, user.username);
		if (!userWith2FA) return c.json({ error: 'User not found' }, 404);

		const secret = await getDecrypted2FASecret(c, userWith2FA);
		if (!secret) return c.json({ error: 'Failed to decrypt 2FA secret' }, 500);

		const usedCodeKey = `used_2fa_code:${user.uuid}:${await codeDigest(two_factor_code)}`;
		if (await c.env.VRCSTORAGE_KV.get(usedCodeKey)) {
			return c.json({ error: 'This code has already been used. Please wait for the next one.' }, 401);
		}

		let is2FAValid = verifyTwoFactorCode(secret, two_factor_code);
		if (is2FAValid) {
			await c.env.VRCSTORAGE_KV.put(usedCodeKey, '1', { expirationTtl: 90 });
		}

		if (!is2FAValid && userWith2FA.two_factor_backup_codes) {
			if (await verifyBackupCode(userWith2FA.two_factor_backup_codes, two_factor_code)) {
				const remainingCodes = await useBackupCode(userWith2FA.two_factor_backup_codes, two_factor_code);
				if (remainingCodes !== null) {
					await service.saveBackupCodes(user.uuid, remainingCodes);
					is2FAValid = true;
				}
			}
		}

		if (!is2FAValid) return c.json({ error: 'Invalid two-factor authentication code' }, 403);
	}

	try {
		await service.setPassword(user.uuid, new_password);
		// Invalidate the KV session cache so all active sessions must re-authenticate.
		await c.env.VRCSTORAGE_KV.delete(`user:${user.username}`);
		return c.json({ success: true });
	} catch (e) {
		console.error('Password change error:', e);
		return c.json({ error: 'Failed to change password' }, 500);
	}
});

// =========================================================================================================
// Export
// =========================================================================================================

export default users;
