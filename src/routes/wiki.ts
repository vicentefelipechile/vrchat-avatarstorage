// =========================================================================================================
// WIKI ROUTES
// =========================================================================================================
// Global Wiki Comment operations
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { CommentSchema } from '../validators';
import { verifyTurnstile } from './utils';

const wiki = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /api/wiki/comments
 * GET: Obtiene los comentarios globales de la wiki.
 */
wiki.get('/comments', async (c) => {
    // Join with users to get username and avatar
    const { results } = await c.env.DB.prepare(
        `SELECT
			c.uuid,
			c.text,
			(c.created_at * 1000) as timestamp,
			u.username as author,
			u.avatar_url as author_avatar
         FROM wiki_comments c 
         JOIN users u ON c.author_uuid = u.uuid 
         ORDER BY c.created_at DESC
         LIMIT 50` // Limit to last 50 comments for now
    ).all<any>();

    return c.json(results);
});

/**
 * Endpoint: /api/wiki/comments
 * POST: Crea un nuevo comentario global en la wiki.
 */
wiki.post('/comments', async (c) => {
    const authUser = await getAuthUser(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    // Get author details
    const user = await c.env.DB.prepare('SELECT uuid, avatar_url FROM users WHERE username = ?').bind(authUser.username).first<any>();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const body = await c.req.json();

    // Validation
    const parseResult = CommentSchema.safeParse(body);
    if (!parseResult.success) {
        return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const { text, token } = parseResult.data;

    // Turnstile Verification
    const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
    if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

    const commentUuid = crypto.randomUUID();

    try {
        await c.env.DB.prepare(
            'INSERT INTO wiki_comments (uuid, author_uuid, text) VALUES (?, ?, ?)'
        ).bind(commentUuid, user.uuid, text).run();

        const newComment = {
            uuid: commentUuid,
            text: text,
            timestamp: Date.now(),
            author: authUser.username,
            author_avatar: user.avatar_url
        };

        return c.json(newComment);
    } catch (e) {
        console.error('Wiki comment error:', e);
        return c.json({ error: 'Failed to post comment' }, 500);
    }
});

/**
 * Endpoint: /api/wiki/comments/:uuid
 * DELETE: Elimina un comentario específico.
 */
wiki.delete('/comments/:uuid', async (c) => {
    const authUser = await getAuthUser(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    const commentUuid = c.req.param('uuid');

    // Check if user is admin or author
    const comment = await c.env.DB.prepare('SELECT author_uuid FROM wiki_comments WHERE uuid = ?').bind(commentUuid).first<any>();
    if (!comment) return c.json({ error: 'Comment not found' }, 404);

    // If not admin, verify ownership
    if (!authUser.is_admin) {
        const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
        if (!user || user.uuid !== comment.author_uuid) {
            return c.json({ error: 'Forbidden' }, 403);
        }
    }

    try {
        await c.env.DB.prepare('DELETE FROM wiki_comments WHERE uuid = ?').bind(commentUuid).run();
        return c.json({ success: true });
    } catch (e) {
        console.error('Wiki comment delete error:', e);
        return c.json({ error: 'Failed to delete comment' }, 500);
    }
});

export default wiki;
