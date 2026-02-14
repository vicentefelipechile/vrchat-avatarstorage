import { Context, Next } from 'hono';
import { getAuthUser } from '../auth';

interface RateLimitConfig {
    limit: number;
    limitLogged?: number;
    windowSeconds: number;
    keyPrefix?: string;
}

export const rateLimit = (config: RateLimitConfig) => {
    const { limit, limitLogged, windowSeconds, keyPrefix = 'global' } = config;

    return async (c: Context<{ Bindings: Env }>, next: Next) => {
        const ip = c.req.header('CF-Connecting-IP') || 'unknown';
        const key = `ratelimit:${keyPrefix}:${ip}`;
        const now = Math.floor(Date.now() / 1000);

        try {
            // Check existing record
            const record = await c.env.DB.prepare('SELECT * FROM rate_limits WHERE key = ?').bind(key).first<{ count: number, timestamp: number }>();

            if (record) {
                if (now - record.timestamp > windowSeconds) {
                    // Window expired, reset
                    await c.env.DB.prepare('UPDATE rate_limits SET count = 1, timestamp = ? WHERE key = ?').bind(now, key).run();
                } else {
                    // Inside window
                    if (record.count >= limit) {
                        return c.json({ error: 'Too Many Requests' }, 429);
                    }
                    await c.env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
                }
            } else {
                // New record
                await c.env.DB.prepare('INSERT INTO rate_limits (key, count, timestamp) VALUES (?, 1, ?)').bind(key, now).run();
            }
        } catch (e) {
            console.error('Rate limit error:', e);
            // Fail open if DB fails
        }

        await next();
    };
};
