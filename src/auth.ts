// =========================================================================================================
// AUTHENTICATION
// =========================================================================================================
// This file handles authentication and session management
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { hashSync, compareSync } from 'bcryptjs';
import { Context } from 'hono';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie } from 'hono/cookie';
import { User } from './types';
import { decryptSecret } from './auth/2fa';

// =========================================================================================================
// Types
// =========================================================================================================

type AuthUser = {
	uuid: string;
	username: string;
	is_admin: boolean;
};

// =========================================================================================================
// Password Hashing
// =========================================================================================================

export async function hashPassword(password: string): Promise<{ hash: string; salt?: string }> {
	const hash = hashSync(password, 10);
	return { hash };
}

export async function verifyPassword(password: string, storedHash: string, _storedSalt?: string): Promise<boolean> {
	return compareSync(password, storedHash);
}

// =========================================================================================================
// JWT Session Management
// =========================================================================================================

const COOKIE_NAME = 'auth_token';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// =========================================================================================================
// Create Session
// This function creates a new session for a user
// =========================================================================================================

export async function createSession(c: Context<{ Bindings: Env }>, user: { username: string; is_admin: number }) {
	const secret = c.env.JWT_SECRET;
	if (!secret) throw new Error('JWT_SECRET is not defined');

	const payload = {
		sub: user.username,
		role: user.is_admin ? 'admin' : 'user',
		jti: crypto.randomUUID(),
		exp: Math.floor(Date.now() / 1000) + MAX_AGE, // Token expiration
	};

	const token = await sign(payload, secret, 'HS256');

	setCookie(c, COOKIE_NAME, token, {
		httpOnly: true,
		secure: true, // Always true for production/Cloudflare
		sameSite: 'Strict', // Upgraded from Lax: cookie never sent on cross-site requests,
		// even top-level navigations. Eliminates CSRF vector in XSS chain attacks.
		path: '/',
		maxAge: MAX_AGE,
	});
}

// =========================================================================================================
// Get Authenticated User
// This function gets the authenticated user from the session
// =========================================================================================================

export async function getAuthUser(c: Context<{ Bindings: Env }>): Promise<AuthUser | null> {
	const token = getCookie(c, COOKIE_NAME);
	if (!token) return null;

	const secret = c.env.JWT_SECRET;
	if (!secret) return null;

	try {
		const payload = await verify(token, secret, 'HS256');
		const username = payload.sub as string;

		// 1. JWT denylist — reject tokens that were explicitly revoked (logout / password change)
		if (payload.jti) {
			const denied = await c.env.VRCSTORAGE_KV.get(`deny:${payload.jti}`);
			if (denied) return null;
		}

		// 2. KV session cache — skip stale entries that predate the uuid field
		const cachedUser = (await c.env.VRCSTORAGE_KV.get(`user:${username}`, 'json')) as AuthUser | null;
		if (cachedUser?.uuid) {
			return cachedUser;
		}

		// 3. Query DB
		const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
		if (!user) return null;

		const sessionUser = {
			uuid: user.uuid,
			username: user.username,
			is_admin: user.is_admin === 1,
		};

		// 4. Update KV
		await c.env.VRCSTORAGE_KV.put(`user:${username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 }); // 7 Days

		return sessionUser;
	} catch (e) {
		// Invalid token
		return null;
	}
}

export async function deleteSession(c: Context<{ Bindings: Env }>) {
	// Read token before clearing the cookie so we can invalidate the KV session cache.
	const token = getCookie(c, COOKIE_NAME);

	// Clear cookie
	setCookie(c, COOKIE_NAME, '', {
		httpOnly: true,
		secure: true,
		path: '/',
		maxAge: 0,
	});

	// Invalidate the KV session cache AND add the JWT to the denylist so it
	// cannot be replayed after logout — even if the attacker still holds the raw token.
	if (token && c.env?.JWT_SECRET) {
		try {
			const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
			if (payload?.sub) {
				await c.env.VRCSTORAGE_KV.delete(`user:${payload.sub as string}`);
			}
			// Denylist the specific token ID for its remaining lifetime
			if (payload?.jti) {
				const remainingTtl = Math.max(0, (payload.exp as number) - Math.floor(Date.now() / 1000));
				if (remainingTtl > 0) {
					await c.env.VRCSTORAGE_KV.put(`deny:${payload.jti}`, '1', { expirationTtl: remainingTtl });
				}
			}
		} catch {
			// Token already invalid — nothing to revoke
		}
	}
}

// =========================================================================================================
// 2FA Helpers
// =========================================================================================================

export async function getUserWith2FA(c: Context<{ Bindings: Env }>, username: string): Promise<User | null> {
	const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
	return user;
}

export async function getDecrypted2FASecret(c: Context<{ Bindings: Env }>, user: User): Promise<string | null> {
	if (!user.two_factor_secret) return null;
	const secret = c.env.JWT_SECRET;
	if (!secret) return null;
	return await decryptSecret(user.two_factor_secret, secret);
}
