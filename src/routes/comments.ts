// =========================================================================================================
// COMMENT ROUTES
// =========================================================================================================
// Comment CRUD operations
// =========================================================================================================

import { Hono } from 'hono';
import { getAuthUser } from '../auth';
import { CommentSchema } from '../validators';
import { verifyTurnstile } from './utils';

const comments = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /:uuid/comments
 * Obtiene los comentarios de un recurso.
 */
comments.get('/:uuid/comments', async (c) => {
    const uuid = c.req.param('uuid');
    // Join with users to get username
    const { results } = await c.env.DB.prepare(
        `SELECT
			c.uuid,
			c.text,
			(c.created_at * 1000) as timestamp,
			u.username as author,
			u.avatar_url as author_avatar
         FROM comments c 
         JOIN users u ON c.author_uuid = u.uuid 
         WHERE c.resource_uuid = ? 
         ORDER BY c.created_at ASC`
    ).bind(uuid).all<any>(); // any because of join

    return c.json(results);
});

/**
 * Endpoint: /:uuid/comments
 * Crea un nuevo comentario.
 */
comments.post('/:uuid/comments', async (c) => {
    const authUser = await getAuthUser(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    // Get author
    const user = await c.env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(authUser.username).first<any>();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const uuid = c.req.param('uuid');
    const body = await c.req.json();

    // Validation
    const { text, token } = CommentSchema.parse(body);

    // Turnstile Verification for Comments (Optional but requested)
    const isValid = await verifyTurnstile(token || '', c.env.TURNSTILE_SECRET_KEY);
    if (!isValid) return c.json({ error: 'Invalid CAPTCHA' }, 403);

    const commentUuid = crypto.randomUUID();

    try {
        await c.env.DB.prepare(
            'INSERT INTO comments (uuid, resource_uuid, author_uuid, text) VALUES (?, ?, ?, ?)'
        ).bind(commentUuid, uuid, user.uuid, text).run();

        const newComment = {
            commentUuid,
            resourceUuid: uuid,
            author: authUser.username,
            author_avatar: user.avatar_url,
            text: text,
            created_at: new Date().toISOString()
        };

        return c.json(newComment);
    } catch (e) {
        console.error('Comment error:', e);
        return c.json({ error: 'Failed to post comment' }, 500);
    }
});

/**
 * Endpoint: /:commentId
 * Elimina un comentario específico.
 */
comments.delete('/:commentId', async (c) => {
    const authUser = await getAuthUser(c);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

    const commentId = c.req.param('commentId');
    try {
        await c.env.DB.prepare('DELETE FROM comments WHERE uuid = ?').bind(commentId).run();
        return c.json({ success: true });
    } catch (e) {
        console.error('Comment error:', e);
        return c.json({ error: 'Failed to delete comment' }, 500);
    }
});

export default comments;
