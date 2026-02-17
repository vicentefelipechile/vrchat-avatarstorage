// =========================================================================================================
// USER ROUTES
// =========================================================================================================
// User authentication and profile management endpoints
// =========================================================================================================

import { Hono } from 'hono';
import { hashPassword, verifyPassword, createSession, getAuthUser, deleteSession } from '../auth';
import { User } from '../types';
import { RegisterSchema, LoginSchema, UserUpdateSchema } from '../validators';
import { verifyTurnstile } from './utils';

const users = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /register
 * Registra un nuevo usuario.
 */
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
        return c.json({ error: 'Username taken' }, 409);
    }

    const { hash } = await hashPassword(password);
    const uuid = crypto.randomUUID();
    const avatarUrl = 'https://vrchat-avatarstorage.vicentefelipechile.workers.dev/avatar.png';

    try {
        await c.env.DB.prepare(
            'INSERT INTO users (uuid, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)'
        ).bind(uuid, username, hash, avatarUrl).run();

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
    const body = await c.req.json();

    // Validation
    const { username, password, token } = LoginSchema.parse(body);

    // Turnstile Verification
    const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
    if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();

    if (user) {
        const isMatch = await verifyPassword(password, user.password_hash);
        if (isMatch) {
            // Secure: false for localhost development
            // Secure session
            await createSession(c, { username: user.username, is_admin: user.is_admin });

            // Cache user in KV
            const sessionUser = { username: user.username, is_admin: user.is_admin === 1 };
            await c.env.VRCSTORAGE_KV.put(`user:${user.username}`, JSON.stringify(sessionUser), { expirationTtl: 60 * 60 * 24 * 7 });

            return c.json({ success: true });
        }
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
        await c.env.DB.prepare(
            'UPDATE users SET username = ?, avatar_url = ? WHERE uuid = ?'
        ).bind(newUsername, newAvatarUrl, user.uuid).run();

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
        avatar_url: user ? user.avatar_url : null
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

export default users;
