
import { hashSync, compareSync } from 'bcryptjs';
import { Context } from 'hono';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie } from 'hono/cookie';
import { User } from './types';

export async function hashPassword(password: string): Promise<{ hash: string; salt?: string }> {
    const hash = hashSync(password, 10);
    return { hash };
}

export async function verifyPassword(password: string, storedHash: string, _storedSalt?: string): Promise<boolean> {
    return compareSync(password, storedHash);
}

// ----------------------------------------------------------------------------
// JWT SESSION MANAGEMENT
// ----------------------------------------------------------------------------

const COOKIE_NAME = 'auth_token';
// 7 days in seconds
const MAX_AGE = 60 * 60 * 24 * 7;

export async function createSession(c: Context<{ Bindings: Env }>, user: { username: string; is_admin: number }) {
    const secret = c.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    const payload = {
        sub: user.username,
        role: user.is_admin ? 'admin' : 'user',
        exp: Math.floor(Date.now() / 1000) + MAX_AGE, // Token expiration
    };

    const token = await sign(payload, secret, 'HS256');

    setCookie(c, COOKIE_NAME, token, {
        httpOnly: true,
        secure: true, // Always true for production/Cloudflare
        sameSite: 'Lax',
        path: '/',
        maxAge: MAX_AGE,
    });
}

export async function getAuthUser(c: Context<{ Bindings: Env }>): Promise<{ username: string; is_admin: boolean } | null> {
    const token = getCookie(c, COOKIE_NAME);
    if (!token) return null;

    const secret = c.env.JWT_SECRET;
    if (!secret) return null;

    try {
        const payload = await verify(token, secret, 'HS256');

        const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(payload.sub).first<User>();
        if (!user) return null;

        return {
            username: payload.sub as string,
            is_admin: user.is_admin === 1,
        };
    } catch (e) {
        // Invalid token
        return null;
    }
}

export function deleteSession(c: Context) {
    setCookie(c, COOKIE_NAME, '', {
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: 0,
    });
}
