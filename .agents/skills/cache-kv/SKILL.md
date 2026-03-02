---
name: Cache — Cloudflare KV
description: Guidelines for caching API responses, sessions, and frequent lookups in VRCStorage using Cloudflare Workers KV.
---

# Cache — Cloudflare KV

> [!IMPORTANT]
> KV has eventual consistency. Don't use it for data that must be 100% real-time (like rate limit counters). For that, see ratelimit SKILL.

---

## 1. What to Cache in KV

| Data | Cache? | TTL | Key pattern |
|------|--------|-----|-------------|
| Resource detail (single) | ✅ Yes | 5 min | `resource:{id}` |
| Resource list (paginated) | ✅ Yes | 60s | `resources:list:{page}:{limit}` |
| Search results | ✅ Yes | 60s | `search:{query}:{page}` |
| User profile (public) | ✅ Yes | 5 min | `user:{id}:public` |
| Session tokens | ✅ Yes | Session TTL | `session:{token}` |
| R2 preview URLs | ✅ Yes | 1 hour | `preview:{resourceId}` |
| Rate limit counters | ❌ No | — | Use Durable Objects or Workers Analytics |
| Auth tokens being checked | ⚠️ Short only | 30s | `auth:check:{token}` |

---

## 2. KV Helper

This project has no `lib/` folder. KV utility functions live inline in the route file, or in `src/helpers/` if shared across multiple routes.

```typescript
// Inline in any route file, or extract to src/helpers/ if reused

async function kvGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function kvSet<T>(kv: KVNamespace, key: string, value: T, ttlSeconds: number): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds })
}

async function kvDelete(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key)
}
```

---

## 3. Cache-Aside Pattern

This is the standard pattern for all cacheable endpoints:

```typescript
// src/routes/resources.ts

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const cacheKey = `resource:${id}`

  // 1. Try cache first
  const cached = await kvGet<Resource>(c.env.CACHE, cacheKey)
  if (cached) {
    c.header('X-Cache', 'HIT')
    return c.json({ data: cached })
  }

  // 2. Cache miss — query D1
  const resource = await getResourceById(c.env.DB, id)
  if (!resource) return c.json({ error: { code: 'NOT_FOUND' } }, 404)

  // 3. Store in KV
  await kvSet(c.env.CACHE, cacheKey, resource, 300) // 5 min TTL

  c.header('X-Cache', 'MISS')
  return c.json({ data: resource })
})
```

> [!TIP]
> Add `X-Cache: HIT/MISS` headers. Makes debugging much easier.

---

## 4. Cache Invalidation

When data changes, invalidate the relevant cache keys immediately:

```typescript
// When resource is updated
export async function updateResource(db: D1Database, kv: KVNamespace, id: string, data: Partial<Resource>) {
  await updateResourceRecord(db, id, data)

  // Invalidate all related keys
  await Promise.all([
    kvDelete(kv, `resource:${id}`),
    kvDelete(kv, `resources:list:1:20`), // invalidate first page (most visited)
  ])
}
```

> [!WARNING]
> You can't invalidate all pages at once easily. For list caches, use short TTLs (60s) instead of manual invalidation.

---

## 5. TTL Reference

| Cache type | TTL | Reason |
|-----------|-----|--------|
| Individual resource | 300s (5 min) | Changes rarely |
| Resource list | 60s (1 min) | New uploads invalidate it |
| Search results | 60s (1 min) | Short because results change |
| User public profile | 300s (5 min) | Changes rarely |
| Session token | Match auth expiry | Security |
| Preview image URL | 3600s (1 hour) | R2 objects don't change |

---

## 6. Key Naming Convention

```
{resource}:{id}                    → resource:avt_abc123
{resource}:list:{page}:{limit}     → resources:list:1:20
search:{sanitized_query}:{page}    → search:bunny_outfit:1
session:{token}                    → session:tok_xyz...
user:{id}:public                   → user:usr_abc:public
preview:{resourceId}                 → preview:avt_abc123
```

**Rules:**
- Always lowercase
- Use `:` as separator (not `/` or `_`)
- Include pagination params in list keys
- Sanitize search queries before using as key: lowercase, trim, max 100 chars

```typescript
function sanitizeSearchKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, '_').slice(0, 100)
}
```

---

## 7. Session Storage Pattern

```typescript
// Store session after login
export async function createSession(
  kv: KVNamespace,
  token: string,
  userId: string,
  ttlSeconds = 86400 // 24h
): Promise<void> {
  await kvSet(kv, `session:${token}`, { userId, createdAt: Date.now() }, ttlSeconds)
}

// Validate session
export async function getSession(
  kv: KVNamespace,
  token: string
): Promise<{ userId: string } | null> {
  return kvGet<{ userId: string }>(kv, `session:${token}`)
}

// Logout
export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kvDelete(kv, `session:${token}`)
}
```

---

## 8. Performance Rules for 100+ Concurrent Users

- **Always check KV before D1** — KV reads are ~1ms, D1 reads are ~10–50ms
- **Don't cache per-user data in shared keys** — only cache public/shared resources
- **Parallel fetch when possible:**
  ```typescript
  // ✅ Fetch cache and something else in parallel when you need both
  const [cached, user] = await Promise.all([
    kvGet(c.env.CACHE, cacheKey),
    getUser(c.env.DB, userId)
  ])
  ```
- **Don't store large objects in KV** — keep values under 25KB, KV max is 25MB but large values slow reads
- **Use short TTLs for lists** (60s) — reduces stale data without constant invalidation

---

## 9. Anti-Patterns (DO NOT DO)

| Anti-pattern | Why | Correct way |
|---|---|---|
| Caching per-user data without user ID in key | Different users get each other's data | Include `userId` in key |
| KV for rate limiting | Eventual consistency = counters are wrong | Use Durable Objects or see ratelimit SKILL |
| Very long TTLs for mutable data | Stale data | Use 60–300s for most things |
| No cache invalidation on update | Outdated responses forever | Delete key on write |
| Storing entire arrays of 1000+ items | Huge KV values, slow | Paginate + cache per page |
| Using KV key as URL param | Injection risk | Sanitize keys |

---

## 10. References

- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [KV Workers Binding](https://developers.cloudflare.com/kv/api/)
- [Ratelimit Skill](./../ratelimit/SKILL.md)
- [Database D1 Skill](./../database-d1/SKILL.md)
