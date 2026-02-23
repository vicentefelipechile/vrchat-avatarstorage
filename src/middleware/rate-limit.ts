import { Context, Next } from 'hono';

interface RateLimitConfig {
    limit: number;
    limitLogged?: number;
    windowSeconds: number;
    keyPrefix?: string;
}

export const rateLimit = (config: RateLimitConfig) => {
    const { limit, windowSeconds, keyPrefix = 'global' } = config;

    return async (c: Context<{ Bindings: Env }>, next: Next) => {
        const ip = c.req.header('CF-Connecting-IP') || 'unknown';
        const key = `ratelimit:${keyPrefix}:${ip}`;
        const now = Date.now();

        try {
            const record = await c.env.VRCSTORAGE_KV.get(key, 'json') as { count: number; reset: number } | null;

            if (record) {
                if (now >= record.reset) {
                    // Window expired, reset
                    await c.env.VRCSTORAGE_KV.put(
                        key,
                        JSON.stringify({ count: 1, reset: now + windowSeconds * 1000 }),
                        { expirationTtl: windowSeconds }
                    );
                } else {
                    // Inside window
                    if (record.count >= limit) {
                        const retryAfter = Math.ceil((record.reset - now) / 1000);
                        return c.json(
                            { error: 'Too Many Requests', retryAfter },
                            429,
                            { 'Retry-After': String(retryAfter) }
                        );
                    }
                    await c.env.VRCSTORAGE_KV.put(
                        key,
                        JSON.stringify({ count: record.count + 1, reset: record.reset }),
                        { expirationTtl: Math.ceil((record.reset - now) / 1000) }
                    );
                }
            } else {
                // New record
                await c.env.VRCSTORAGE_KV.put(
                    key,
                    JSON.stringify({ count: 1, reset: now + windowSeconds * 1000 }),
                    { expirationTtl: windowSeconds }
                );
            }
        } catch (e) {
            console.error('Rate limit error:', e);
            // Fail open if KV fails
        }

        await next();
    };
};
