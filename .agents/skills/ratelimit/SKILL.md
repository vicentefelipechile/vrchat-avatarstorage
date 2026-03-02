---
name: Rate Limiting
description: Guidelines for implementing rate limiting in VRCStorage using Cloudflare Workers to protect against abuse at scale.
---

# Rate Limiting

> [!IMPORTANT]
> Rate limiting MUST run before auth and before any business logic. It's the first line of defense.

---

## 1. Why This Matters at 100+ Users

Without rate limiting:
- A single user can hammer `/api/search` 1000 times/second and bring down D1
- Someone can brute-force login endpoints
- R2 bandwidth costs spike from automated downloaders
- Workers CPU time gets exhausted

---

## 2. Rate Limit Tiers

| Endpoint | Limit | Window | Who |
|----------|-------|--------|-----|
| `/api/search` | 30 req | 60s | Per IP |
| `/api/avatars` (GET list) | 60 req | 60s | Per IP |
| `/api/avatars/:id` (GET) | 120 req | 60s | Per IP |
| `/api/avatars/:id/download` | 10 req | 60s | Per IP |
| `/api/auth/login` | 5 req | 60s | Per IP |
| `/api/auth/register` | 3 req | 3600s (1h) | Per IP |
| POST endpoints (uploads) | 10 req | 3600s (1h) | Per user |
| All other `/api/*` | 100 req | 60s | Per IP |

---

## 3. Implementation with Cloudflare Rate Limiting API

Cloudflare Workers has a built-in rate limiting binding. Configure in `wrangler.jsonc`:

```jsonc
{
  "ratelimits": [
    {
      "binding": "RATE_LIMITER",
      "namespace_id": "1"
    }
  ]
}
```

```typescript
// src/middleware/rate-limit.ts
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../types'

interface RateLimitConfig {
  limit: number
  window: number // seconds
}

export function ratelimit(config: RateLimitConfig): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    const key = `${c.req.path}:${ip}`

    const { success } = await c.env.RATE_LIMITER.limit({ key })

    if (!success) {
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
        429,
        {
          'Retry-After': config.window.toString(),
          'X-RateLimit-Limit': config.limit.toString(),
        }
      )
    }

    await next()
  }
}
```

---

## 4. Applying Rate Limits Per Route

```typescript
// src/index.ts
import { rateLimit } from '../middleware/rate-limit'

// Global default for all API routes
app.use('/api/*', ratelimit({ limit: 100, window: 60 }))

// Stricter limits on specific routes (applied AFTER global, more specific wins)
app.use('/api/search', ratelimit({ limit: 30, window: 60 }))
app.use('/api/auth/login', ratelimit({ limit: 5, window: 60 }))
app.use('/api/auth/register', ratelimit({ limit: 3, window: 3600 }))
app.use('/api/downloads/:id', ratelimit({ limit: 10, window: 60 }))
```

---

## 5. Per-User Rate Limiting (Authenticated Routes)

For POST/upload endpoints, rate limit by user ID instead of IP (IP can be shared in NAT):

```typescript
export function ratelimitByUser(config: RateLimitConfig): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const user = c.get('user') // set by auth middleware
    if (!user) return next() // let auth middleware handle unauthenticated

    const key = `upload:${user.id}`
    const { success } = await c.env.RATE_LIMITER.limit({ key })

    if (!success) {
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Upload limit reached. Try again in 1 hour.' } },
        429
      )
    }

    await next()
  }
}
```

---

## 6. Fallback: Manual Rate Limiting with KV

If the native Cloudflare rate limiter binding isn't available, use KV as fallback:

> [!WARNING]
> KV has eventual consistency. Use this only as a fallback, not for strict security limits.

```typescript
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const raw = await kv.get(`rl:${key}`)
  const current = raw ? parseInt(raw) : 0

  if (current >= limit) {
    return { allowed: false, remaining: 0 }
  }

  // Increment counter
  await kv.put(`rl:${key}`, (current + 1).toString(), {
    expirationTtl: windowSeconds
  })

  return { allowed: true, remaining: limit - current - 1 }
}
```

---

## 7. Response Headers (Always Include)

When rate limiting, always include these headers so clients can handle it properly:

```typescript
return c.json({ error: { code: 'RATE_LIMITED' } }, 429, {
  'Retry-After': '60',          // seconds until reset
  'X-RateLimit-Limit': '30',    // total allowed
  'X-RateLimit-Remaining': '0', // remaining this window
})
```

---

## 8. Logging Rate Limit Events

Rate limit hits are worth logging for abuse detection:

```typescript
if (!success) {
  const ip = c.req.header('CF-Connecting-IP')
  const path = c.req.path
  console.error(`[RATE_LIMITED] IP=${ip} PATH=${path} TIME=${Date.now()}`)

  return c.json({ error: { code: 'RATE_LIMITED' } }, 429)
}
```

---

## 9. Performance Rules for 100+ Concurrent Users

- Rate limit check must be **the first middleware** — before parsing body, before D1, before R2
- Use the **native Cloudflare rate limiter** (not KV) for strict limits — it's consistent across all edge nodes
- Set **different limits for reads vs writes** — reads can be more permissive
- **Download endpoints need strict limits** — R2 egress is expensive
- **Auth endpoints need the strictest limits** — brute force protection

---

## 10. Anti-Patterns (DO NOT DO)

| Anti-pattern | Why | Correct way |
|---|---|---|
| Rate limiting after auth | Auth endpoint itself can be hammered | Rate limit first, auth second |
| Using KV for strict security limits | Eventual consistency, counters drift | Use native CF rate limiter |
| Same limit for all endpoints | Downloads are expensive, reads are cheap | Tiered limits per endpoint |
| No `Retry-After` header | Clients retry immediately, making it worse | Always include `Retry-After` |
| Blocking by User-Agent only | Trivial to spoof | Use IP + user ID |
| No logging on rate limit hit | Can't detect abuse patterns | Log IP + path + timestamp |

---

## 11. References

- [Cloudflare Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Cloudflare KV](https://developers.cloudflare.com/kv/)
- [Cache-KV Skill](./../cache-kv/SKILL.md)
- [API Routes Skill](./../api-routes/SKILL.md)
