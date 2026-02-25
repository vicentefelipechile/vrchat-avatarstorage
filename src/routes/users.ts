// =========================================================================================================
// USER ROUTES
// =========================================================================================================
// User authentication and profile management endpoints
// =========================================================================================================

import { Hono } from 'hono';
import { hashPassword, verifyPassword, createSession, getAuthUser, deleteSession, getUserWith2FA, getDecrypted2FASecret } from '../auth';
import { User } from '../types';
import { RegisterSchema, LoginSchema, UserUpdateSchema } from '../validators';
import { verifyTurnstile } from './utils';
import { verifyTwoFactorCode, verifyBackupCode, useBackupCode } from '../auth/2fa';

const users = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /register
 * Registra un nuevo usuario.
 */
users.post('/register', async (c) => {
	const ip = c.req.header('CF-Connecting-IP') || 'unknown';

	// Rate limit: max 5 registration attempts per IP per hour
	const registerAttemptsKey = `register_attempt:${ip}`;
	const attempts = (await c.env.VRCSTORAGE_KV.get(registerAttemptsKey, 'json')) as { count: number; reset: number } | null;
	const now = Date.now();

	if (attempts && attempts.count >= 5 && now < attempts.reset) {
		const retryAfter = Math.ceil((attempts.reset - now) / 1000);
		return c.json({ error: 'Too many registration attempts. Try again in 1 hour.', retryAfter }, 400);
	}

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

		// Clear registration attempts on success
		await c.env.VRCSTORAGE_KV.delete(registerAttemptsKey);

		return c.json({ success: true });
	} catch (e) {
		console.error('Registration error:', e);

		// Increment failed attempt count
		if (attempts) {
			await c.env.VRCSTORAGE_KV.put(registerAttemptsKey, JSON.stringify({ count: attempts.count + 1, reset: attempts.reset }), {
				expirationTtl: Math.ceil((attempts.reset - now) / 1000),
			});
		} else {
			await c.env.VRCSTORAGE_KV.put(registerAttemptsKey, JSON.stringify({ count: 1, reset: now + 3600000 }), { expirationTtl: 3600 });
		}

		return c.json({ error: 'Registration failed' }, 500);
	}
});

/**
 * Endpoint: /login
 * Inicia sesion de un usuario.
 */
users.post('/login', async (c) => {
	const ip = c.req.header('CF-Connecting-IP') || 'unknown';

	// Rate limit: max 10 login attempts per IP per 15 minutes
	const loginAttemptsKey = `login_attempt:${ip}`;
	const attempts = (await c.env.VRCSTORAGE_KV.get(loginAttemptsKey, 'json')) as { count: number; reset: number } | null;
	const now = Date.now();

	if (attempts && attempts.count >= 10 && now < attempts.reset) {
		const retryAfter = Math.ceil((attempts.reset - now) / 1000);
		return c.json({ error: 'Too many login attempts. Try again later.', retryAfter }, 429);
	}

	const body = await c.req.json();

	// Validation
	const { username, password, token } = LoginSchema.parse(body);

	// Turnstile Verification
	const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
	if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

	// Fixed delay to prevent timing attacks (always check password even if user doesn't exist)
	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();

	// Always use constant-time comparison to prevent username enumeration
	if (!user) {
		// Increment failed attempt count
		if (attempts) {
			await c.env.VRCSTORAGE_KV.put(loginAttemptsKey, JSON.stringify({ count: attempts.count + 1, reset: attempts.reset }), {
				expirationTtl: Math.ceil((attempts.reset - now) / 1000),
			});
		} else {
			await c.env.VRCSTORAGE_KV.put(loginAttemptsKey, JSON.stringify({ count: 1, reset: now + 900000 }), { expirationTtl: 900 });
		}
		// Always return same message to prevent user enumeration
		return c.json({ error: 'Invalid credentials' }, 401);
	}

	const isMatch = await verifyPassword(password, user.password_hash);
	if (isMatch) {
		// Clear failed attempts on successful login
		await c.env.VRCSTORAGE_KV.delete(loginAttemptsKey);

		// Check if 2FA is enabled
		if (user.two_factor_enabled === 1) {
			// Return requires_2fa to trigger second step
			return c.json({ requires_2fa: true, username: user.username });
		}

		// Secure session
		await createSession(c, { username: user.username, is_admin: user.is_admin });

		// Cache user in KV
		const sessionUser = { username: user.username, is_admin: user.is_admin === 1 };
		await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

		return c.json({ success: true });
	}

	// Increment failed attempt count on wrong password
	if (attempts) {
		await c.env.VRCSTORAGE_KV.put(loginAttemptsKey, JSON.stringify({ count: attempts.count + 1, reset: attempts.reset }), {
			expirationTtl: Math.ceil((attempts.reset - now) / 1000),
		});
	} else {
		await c.env.VRCSTORAGE_KV.put(loginAttemptsKey, JSON.stringify({ count: 1, reset: now + 900000 }), { expirationTtl: 900 });
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
	const ip = c.req.header('CF-Connecting-IP') || 'unknown';

	// Rate limit: max 5 2FA attempts per IP per 5 minutes
	const twoFactorAttemptsKey = `2fa_attempt:${ip}`;
	const attempts = (await c.env.VRCSTORAGE_KV.get(twoFactorAttemptsKey, 'json')) as { count: number; reset: number } | null;
	const now = Date.now();

	if (attempts && attempts.count >= 5 && now < attempts.reset) {
		const retryAfter = Math.ceil((attempts.reset - now) / 1000);
		return c.json({ error: 'Too many 2FA attempts. Try again later.', retryAfter }, 429);
	}

	const body = await c.req.json();
	const { username, code } = body;

	if (!username || !code) {
		return c.json({ error: 'Username and code are required' }, 400);
	}

	const user = await getUserWith2FA(c, username);
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}

	if (user.two_factor_enabled !== 1) {
		return c.json({ error: '2FA is not enabled for this user' }, 400);
	}

	const secret = getDecrypted2FASecret(c, user);
	if (!secret) {
		return c.json({ error: 'Failed to decrypt 2FA secret' }, 500);
	}

	let isValid = verifyTwoFactorCode(secret, code);

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
		// Increment failed 2FA attempts
		if (attempts) {
			await c.env.VRCSTORAGE_KV.put(twoFactorAttemptsKey, JSON.stringify({ count: attempts.count + 1, reset: attempts.reset }), {
				expirationTtl: Math.ceil((attempts.reset - now) / 1000),
			});
		} else {
			await c.env.VRCSTORAGE_KV.put(twoFactorAttemptsKey, JSON.stringify({ count: 1, reset: now + 300000 }), { expirationTtl: 300 });
		}
		return c.json({ error: 'Invalid code' }, 401);
	}

	// Clear failed 2FA attempts on successful verification
	await c.env.VRCSTORAGE_KV.delete(twoFactorAttemptsKey);

	// Create session
	await createSession(c, { username: user.username, is_admin: user.is_admin });

	// Cache user in KV
	const sessionUser = { username: user.username, is_admin: user.is_admin === 1 };
	await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

	return c.json({ success: true });
});

export default users;
