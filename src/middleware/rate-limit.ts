import { Context, Next } from 'hono';

interface RateLimitConfig {
    /** The native Cloudflare Rate Limiting binding to use */
    binding: RateLimit;
    /** Prefix used to isolate counters per route (combined with the client IP) */
    keyPrefix?: string;
}

/**
 * Cloudflare native Rate Limiting middleware.
 * Uses the `ratelimits` binding defined in wrangler.jsonc instead of KV.
 * The limit and period are configured in wrangler.jsonc per binding.
 */
export const rateLimit = (config: RateLimitConfig) => {
    return async (c: Context<{ Bindings: Env }>, next: Next) => {
        const ip = c.req.header('CF-Connecting-IP') || 'unknown';
        const key = `${config.keyPrefix ?? 'global'}:${ip}`;

        try {
            const { success } = await config.binding.limit({ key });
            if (!success) {
                return c.json(
                    { error: 'Too Many Requests' },
                    429,
                    { 'Retry-After': '60' }
                );
            }
        } catch (e) {
            console.error('Rate limit error:', e);
            // Fail open — let request through if the binding is unavailable
        }

        await next();
    };
};
