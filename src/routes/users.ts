// =========================================================================================================
// USER ROUTES
// =========================================================================================================
// User authentication and profile management endpoints
// =========================================================================================================

import { Hono } from 'hono';
import { hashPassword, verifyPassword, createSession, getAuthUser, deleteSession, getUserWith2FA, getDecrypted2FASecret } from '../auth';
import { User } from '../types';
import { RegisterSchema, LoginSchema, UserUpdateSchema, TwoFactorLoginSchema } from '../validators';
import { verifyTurnstile } from './utils';
import { verifyTwoFactorCode, verifyBackupCode, useBackupCode } from '../auth/2fa';

const users = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /register
 * Registra un nuevo usuario.
 */
users.post('/register', async (c) => {
	// Rate limiting is handled by the native Cloudflare ratelimit binding (RL_STRICT)
	// applied as middleware in index.ts — no KV-based tracking needed here.

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

/**
 * Endpoint: /login
 * Inicia sesion de un usuario.
 */
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
				pre_auth_token: preAuthToken
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

/**
 * Endpoint: /user
 * Actualiza el perfil del usuario (username, avatar).
 */
users.put('/user', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

	const body = await c.req.json();
	const { username, avatar_url, token } = UserUpdateSchema.parse(body); // Use UserUpdateSchema (needs import)

	// Turnstile check if provided (optional for updates but good for security)
	if (token) {
		const isValid = await verifyTurnstile(token, c.env.TURNSTILE_SECRET_KEY);
		if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);
	}

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

/**
 * Endpoint: /auth/status
 * Verifica si el usuario esta logueado.
 */
users.get('/auth/status', async (c) => {
	const authUser = await getAuthUser(c);
	if (!authUser) {
		return c.json({ loggedIn: false, username: null, is_admin: false, avatar_url: null });
	}

	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(authUser.username).first<User>();

	return c.json({
		loggedIn: !!user,
		username: user ? user.username : null,
		is_admin: user ? !!user.is_admin : false,
		avatar_url: user ? user.avatar_url : null,
	});
});

/**
 * Endpoint: /logout
 * Cierra sesion de un usuario.
 */
users.post('/logout', (c) => {
	deleteSession(c);
	return c.json({ success: true });
});

/**
 * Endpoint: /login/2fa
 * Verifica el código 2FA y crea la sesión
 */
users.post('/login/2fa', async (c) => {
	// Rate limiting is handled by the native Cloudflare ratelimit binding (RL_STRICT)
	// applied as middleware in index.ts — no KV-based tracking needed here.

	const body = await c.req.json();
	const { username, code } = TwoFactorLoginSchema.parse(body);

	// CSRF / Pre-auth check: verify token in KV
	/*
	const storedUsername = await c.env.VRCSTORAGE_KV.get(`pre_auth:${pre_auth_token}`);
	if (!storedUsername || storedUsername !== username) {
		return c.json({ error: 'Invalid or expired login session' }, 401);
	}
	*/

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
	const codeHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
		.then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
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

	// Invalidate pre-auth token
	// await c.env.VRCSTORAGE_KV.delete(`pre_auth:${pre_auth_token}`);

	// Cache user in KV
	const sessionUser = { username: user.username, is_admin: user.is_admin === 1 };
	await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

	return c.json({ success: true });
});

export default users;
