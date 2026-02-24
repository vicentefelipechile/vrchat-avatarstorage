// =========================================================================================================
// TAG ROUTES
// =========================================================================================================
// Tag management and retrieval
// =========================================================================================================

import { Hono } from 'hono';
import { Tag } from '../types';

const tags = new Hono<{ Bindings: Env }>();

/**
 * Endpoint: /
 * Get all tags or search for tags
 */
tags.get('/', async (c) => {
    const query = c.req.query('q');

    try {
        let stmt;
        if (query) {
            stmt = c.env.DB.prepare('SELECT * FROM tags WHERE name LIKE ? ORDER BY name ASC LIMIT 20')
                .bind(`%${query}%`);
        } else {
            stmt = c.env.DB.prepare('SELECT * FROM tags ORDER BY name ASC');
        }

        const { results } = await stmt.all<Tag>();
        return c.json(results);
    } catch (e) {
        console.error('Error fetching tags:', e);
        return c.json({ error: 'Failed to fetch tags' }, 500);
    }
});

/**
 * Endpoint: /
 * Create a new tag (Admin only - handled by middleware in index or here?)
 * For now, assuming only admins will use a specific UI that might call this, 
 * or tags are created on the fly during resource update if they don't exist.
 * But let's add a create endpoint just in case.
 */
tags.post('/', async (c) => {
    // TODO: Add admin check here or in middleware
    const body = await c.req.json();
    const name = body.name;

    if (!name || typeof name !== 'string') {
        return c.json({ error: 'Invalid tag name' }, 400);
    }

    try {
        const existing = await c.env.DB.prepare('SELECT * FROM tags WHERE name = ?').bind(name).first();
        if (existing) {
            return c.json(existing);
        }

        const result = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?) RETURNING *')
            .bind(name).first<Tag>();
        
        return c.json(result);
    } catch (e) {
        console.error('Error creating tag:', e);
        return c.json({ error: 'Failed to create tag' }, 500);
    }
});

export default tags;
