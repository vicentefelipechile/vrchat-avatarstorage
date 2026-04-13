// =========================================================================================================
// USER ROUTES
// =========================================================================================================
// This module handles all user-facing authentication and account management operations.
// It is mounted at /api/auth (for login/register/logout/2fa) and /api/users (for profile updates).
//
// AUTHENTICATION FLOW
// -------------------
// 1. The client calls POST /register or POST /login with credentials + a Turnstile CAPTCHA token.
// 2. On successful login WITHOUT 2FA, createSession() writes a signed, encrypted cookie via @hapi/iron
//    and the user object is cached in Cloudflare KV (TTL: 7 days) for fast auth lookups.
// 3. On successful login WITH 2FA, a short-lived "pre-auth token" (UUID, TTL: 5 min) is stored in KV
//    and returned to the client. The client must complete the second factor via POST /login/2fa using
//    that token before a full session is created.
// 4. getAuthUser() resolves the session cookie on every protected request. It first checks the KV cache;
//    on a cache miss it falls back to the DB and repopulates the cache.
//
// TWO-FACTOR AUTHENTICATION (TOTP)
// ----------------------------------
// - Secrets are generated via `otpauth` and stored in the DB encrypted with @hapi/iron (AES-256-CBC).
// - verifyTwoFactorCode(secret, code): validates a 6-digit TOTP token with a ±1 window (±30s drift).
// - Anti-replay: every used TOTP code is hashed (SHA-256) and stored in KV for 90 seconds so the same
//   code cannot be submitted twice within its validity window.
// - Backup codes: 8 random hex codes hashed with SHA-256 and stored pipe-separated in the DB.
//   verifyBackupCode() checks the hash; useBackupCode() removes the consumed code from the set.
//
// RE-AUTHENTICATION REQUIREMENT
// ------------------------------
// Sensitive operations (password change) require the user to prove identity again even within an active
// session. This prevents XSS → session-hijack → account-takeover chains:
//   - POST /me/password: requires current_password. If the account also has 2FA enabled, a valid TOTP
//     code (or backup code) must be supplied as two_factor_code before the new hash is written to the DB.
//   After a successful password change the KV session cache is purged, forcing all active sessions to
//   re-authenticate on their next request.
//
// ENDPOINTS
// ---------
// POST /register         — Create a new account (Turnstile required).
// POST /login            — Password login; returns pre-auth token if 2FA is active.
// POST /login/2fa        — Complete 2FA step and create full session.
// GET  /status           — Return current session info (username, is_admin, avatar_url).
// POST /logout           — Destroy the session cookie.
// PUT  /me               — Update username and/or avatar URL (Turnstile required).
// POST /me/password      — Change password (re-auth + 2FA if enabled).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { hashPassword, verifyPassword, createSession, getAuthUser, deleteSession, getUserWith2FA, getDecrypted2FASecret } from '../auth';
import { RegisterSchema, LoginSchema, UserUpdateSchema, TwoFactorLoginSchema, ChangePasswordSchema } from '../validators';
import { verifyTwoFactorCode, verifyBackupCode, useBackupCode } from '../auth/2fa';
import { verifyTurnstile } from '../helpers/turnstile';
import { User } from '../types';
import { Hono } from 'hono';

// =========================================================================================================
// Endpoint
// =========================================================================================================

const users = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// POST /api/auth/register
// Register a new user
// =========================================================================================================

users.post('/register', async (c) => {
	const body = await c.req.json();

	// Validation
	const { username, password, token } = RegisterSchema.parse(body);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	// User Check
	const existingUser = await c.env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
	if (existingUser) {
		return c.json({ error: 'Username already taken' }, 409);
	}

	const { hash } = await hashPassword(password);
	const uuid = crypto.randomUUID();
	const avatarUrl = 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';

	try {
		await c.env.DB.prepare('INSERT INTO users (uuid, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)')
			.bind(uuid, username, hash, avatarUrl)
			.run();

		return c.json({ success: true });
	} catch (e) {
		console.error('Registration error:', e);
		return c.json({ error: 'Registration failed' }, 500);
	}
});

// =========================================================================================================
// POST /api/auth/login
// Login a user
// =========================================================================================================

users.post('/login', async (c) => {
	// Rate limiting is handled by the native Cloudflare ratelimit binding (RL_STRICT)
	// applied as middleware in index.ts — no KV-based tracking needed here.

	const body = await c.req.json();

	// Validation
	const { username, password, token } = LoginSchema.parse(body);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	// Always query DB even for unknown users to prevent timing-based username enumeration
	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();

	if (!user) {
		return c.json({ error: 'Invalid credentials' }, 401);
	}

	const isMatch = await verifyPassword(password, user.password_hash);
	if (isMatch) {
		// Check if 2FA is enabled
		if (user.two_factor_enabled === 1) {
			const preAuthToken = crypto.randomUUID();
			// Store in KV with 5 minute expiration
			await c.env.VRCSTORAGE_KV.put(`pre_auth:${preAuthToken}`, user.username, { expirationTtl: 300 });

			return c.json({
				requires_2fa: true,
				username: user.username,
				pre_auth_token: preAuthToken,
			});
		}

		// Secure session
		await createSession(c, { username: user.username, is_admin: user.is_admin });

		// Cache user in KV
		const sessionUser = { username: user.username, is_admin: user.is_admin === 1 };
		await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

		return c.json({ success: true });
	}

	return c.json({ error: 'Invalid credentials' }, 401);
});

// =========================================================================================================
// PUT /api/users/me
// Update user profile (username, avatar)
// =========================================================================================================

users.put('/me', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { username, avatar_url, token } = UserUpdateSchema.parse(body); // Use UserUpdateSchema (needs import)

	// Turnstile is required for profile updates to prevent bot abuse
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(authUser.username).first<User>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	let newUsername = user.username;
	let newAvatarUrl = user.avatar_url;

	if (username && username !== user.username) {
		// Check uniqueness
		const existing = await c.env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
		if (existing) return c.json({ error: 'Username taken' }, 409);
		newUsername = username;
	}

	if (avatar_url) {
		newAvatarUrl = avatar_url;
	}

	try {
		await c.env.DB.prepare('UPDATE users SET username = ?, avatar_url = ? WHERE uuid = ?').bind(newUsername, newAvatarUrl, user.uuid).run();

		// Update Session if username changed
		if (newUsername !== user.username) {
			await createSession(c, { username: newUsername, is_admin: user.is_admin });
		}

		// If username changed, delete old key
		if (newUsername !== user.username) {
			await c.env.VRCSTORAGE_KV.delete(`user:${user.username}`);
		}
		const sessionUser = { username: newUsername, is_admin: user.is_admin === 1 };
		await c.env.VRCSTORAGE_KV.put(`user:${newUsername}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

		return c.json({ success: true, username: newUsername, avatar_url: newAvatarUrl });
	} catch (e) {
		console.error('Update user error:', e);
		return c.json({ error: 'Failed to update user' }, 500);
	}
});

// =========================================================================================================
// GET /api/auth/status
// Check if user is logged in
// =========================================================================================================

users.get('/status', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({
			loggedIn: false,
			username: null,
			is_admin: false,
			avatar_url: null,
		});
	}

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(authUser.username).first<User>();

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
// Logout a user
// =========================================================================================================

users.post('/logout', async (c) => {
	await deleteSession(c);
	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/auth/login/2fa
// Verify 2FA code and create session
// =========================================================================================================

users.post('/login/2fa', async (c) => {
	const body = await c.req.json();
	const { username, code, pre_auth_token } = TwoFactorLoginSchema.parse(body);

	// Validate the pre-auth token: it must exist in KV and be bound to this exact username.
	// This proves the caller passed the password step before reaching the 2FA step.
	// Consumed immediately (single-use) — even if the TOTP code is wrong afterwards.
	const preAuthUsername = await c.env.VRCSTORAGE_KV.get(`pre_auth:${pre_auth_token}`);
	await c.env.VRCSTORAGE_KV.delete(`pre_auth:${pre_auth_token}`);

	if (!preAuthUsername || preAuthUsername !== username) {
		return c.json({ error: 'Invalid or expired session. Please log in again.' }, 401);
	}

	const user = await getUserWith2FA(c, username);
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}

	if (user.two_factor_enabled !== 1) {
		return c.json({ error: '2FA is not enabled for this user' }, 400);
	}

	const secret = await getDecrypted2FASecret(c, user);
	if (!secret) {
		return c.json({ error: 'Failed to decrypt 2FA secret' }, 500);
	}

	// Anti-Replay: Check if the code has been used recently
	const codeHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)).then((buf) =>
		Array.from(new Uint8Array(buf))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join(''),
	);
	const usedCodeKey = `used_2fa_code:${user.uuid}:${codeHash}`;
	const isUsed = await c.env.VRCSTORAGE_KV.get(usedCodeKey);
	if (isUsed) {
		return c.json({ error: 'This code has already been used. Please wait for the next one.' }, 401);
	}

	let isValid = verifyTwoFactorCode(secret, code);

	if (isValid) {
		// Mark code as used for Anti-Replay (expires in 90s, covering current, past and next window)
		await c.env.VRCSTORAGE_KV.put(usedCodeKey, '1', { expirationTtl: 90 });
	}

	// Check backup codes if TOTP code is invalid
	if (!isValid && user.two_factor_backup_codes) {
		if (await verifyBackupCode(user.two_factor_backup_codes, code)) {
			// Use the backup code
			const remainingCodes = await useBackupCode(user.two_factor_backup_codes, code);
			if (remainingCodes !== null) {
				await c.env.DB.prepare('UPDATE users SET two_factor_backup_codes = ? WHERE uuid = ?').bind(remainingCodes, user.uuid).run();
				isValid = true;
			}
		}
	}

	if (!isValid) {
		return c.json({ error: 'Invalid code' }, 401);
	}

	// Create session
	await createSession(c, { username: user.username, is_admin: user.is_admin });

	// Cache user in KV
	const sessionUser = { username: user.username, is_admin: user.is_admin === 1 };
	await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

	return c.json({ success: true });
});

// =========================================================================================================
// POST /api/users/me/password
// Change the authenticated user's password.
// Requires current password as a re-authentication step to prevent XSS → CSRF chain attacks.
// =========================================================================================================

users.post('/me/password', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { current_password, new_password, two_factor_code, token } = ChangePasswordSchema.parse(body);

	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid token' }, 401);

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(authUser.username).first<User>();
	if (!user) return c.json({ error: 'User not found' }, 404);

	// OAuth-only accounts have an empty password_hash. They are allowed to set an initial
	// password without providing current_password. Password-based accounts always require
	// current_password as a re-authentication step to prevent XSS → CSRF chains.
	const hasPassword = !!user.password_hash;
	if (hasPassword) {
		if (!current_password) return c.json({ error: 'Current password is required' }, 400);
		const isMatch = await verifyPassword(current_password, user.password_hash);
		if (!isMatch) return c.json({ error: 'Current password is incorrect' }, 403);
	}

	// 2FA verification: if the user has 2FA enabled, a valid code must be provided.
	if (user.two_factor_enabled === 1) {
		if (!two_factor_code) return c.json({ error: 'Two-factor authentication code is required' }, 403);

		const userWith2FA = await getUserWith2FA(c, user.username);
		if (!userWith2FA) return c.json({ error: 'User not found' }, 404);

		const secret = await getDecrypted2FASecret(c, userWith2FA);
		if (!secret) return c.json({ error: 'Failed to decrypt 2FA secret' }, 500);

		// Anti-Replay: check if this TOTP code has been used recently.
		const codeHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(two_factor_code)).then((buf) =>
			Array.from(new Uint8Array(buf))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join(''),
		);
		const usedCodeKey = `used_2fa_code:${user.uuid}:${codeHash}`;
		const isCodeUsed = await c.env.VRCSTORAGE_KV.get(usedCodeKey);
		if (isCodeUsed) return c.json({ error: 'This code has already been used. Please wait for the next one.' }, 401);

		let is2FAValid = verifyTwoFactorCode(secret, two_factor_code);

		if (is2FAValid) {
			// Mark code as used for Anti-Replay (90s covers current, previous, and next TOTP window).
			await c.env.VRCSTORAGE_KV.put(usedCodeKey, '1', { expirationTtl: 90 });
		}

		// Fall back to backup codes if TOTP failed.
		if (!is2FAValid && userWith2FA.two_factor_backup_codes) {
			if (await verifyBackupCode(userWith2FA.two_factor_backup_codes, two_factor_code)) {
				const remainingCodes = await useBackupCode(userWith2FA.two_factor_backup_codes, two_factor_code);
				if (remainingCodes !== null) {
					await c.env.DB.prepare('UPDATE users SET two_factor_backup_codes = ? WHERE uuid = ?').bind(remainingCodes, user.uuid).run();
					is2FAValid = true;
				}
			}
		}

		if (!is2FAValid) return c.json({ error: 'Invalid two-factor authentication code' }, 403);
	}

	const { hash } = await hashPassword(new_password);

	try {
		await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE uuid = ?').bind(hash, user.uuid).run();

		// Invalidate the KV session cache so all active sessions are forced to re-authenticate.
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
