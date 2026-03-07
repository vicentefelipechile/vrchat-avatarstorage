---
name: API Routes (Hono)
description: Guidelines for creating, editing, and organizing API routes in VRCStorage using Hono on Cloudflare Workers.
---

# API Routes — Hono on Cloudflare Workers

> [!IMPORTANT]
> Read this ENTIRE file before touching any route. Every rule here exists because of a real problem.

---

## 1. Project Structure

```
src/
├── auth.ts                     # Auth logic (session creation, token validation)
├── index.ts                    # Worker entrypoint — mounts all routers, applies middleware
├── types.ts                    # Shared TypeScript types and Env interface
├── validators.ts               # Reusable input validation functions
│
├── auth/
│   └── 2fa.ts                  # Two-factor authentication logic
│
├── helpers/
│   ├── file-validation.ts      # File type, size, MIME validation
│   └── image-validator.ts      # Image-specific validation (dimensions, format)
│
├── middleware/
│   ├── rate-limit.ts           # Rate limiting middleware (see ratelimit SKILL)
│   └── security.ts             # Security headers, CORS, sanitization
│
└── routes/
│   ├── 2fa.ts                  # POST /api/auth/2fa/*
│   ├── admin.ts                # /api/admin/* (protected, admin role only)
│   ├── comments.ts             # /api/comments/*
│   ├── downloads.ts            # /api/downloads/* (R2 file serving)
│   ├── favorites.ts            # /api/favorites/*
│   ├── resources.ts            # /api/resources/* (main content: avatars, assets, clothes)
│   ├── tags.ts                 # /api/tags/*
│   ├── uploads.ts              # /api/uploads/* (R2 file ingestion)
│   ├── users.ts                # /api/users/*
│   ├── utils.ts                # /api/utils/* (misc helpers, health check)
│   └── wiki.ts                 # /api/wiki/*
│
└── test/
    ├── populate.ts             # Auto-populate local D1
    ├── routes/                 # Integration tests per route
    └── unit/                   # Unit tests for helpers and validators
```

---

## 2. Route Map

| Resource | Method | Path | File |
|----------|--------|------|------|
| List/search resources | GET | `/api/resources` | `routes/resources.ts` |
| Get one resource | GET | `/api/resources/:id` | `routes/resources.ts` |
| Upload file | POST | `/api/uploads` | `routes/uploads.ts` |
| Download file | GET | `/api/downloads/:id` | `routes/downloads.ts` |
| List tags | GET | `/api/tags` | `routes/tags.ts` |
| Comments on resource | GET/POST | `/api/comments/:resourceId` | `routes/comments.ts` |
| Favorites | GET/POST/DELETE | `/api/favorites` | `routes/favorites.ts` |
| User profile | GET/PATCH | `/api/users/:id` | `routes/users.ts` |
| 2FA | POST | `/api/auth/2fa/*` | `routes/2fa.ts` |
| Admin actions | * | `/api/admin/*` | `routes/admin.ts` |
| Wiki content | GET | `/api/wiki/*` | `routes/wiki.ts` |
| Health / misc | GET | `/api/utils/*` | `routes/utils.ts` |

**Rules:**
- Always plural for collections: `/resources`, `/users`, NOT `/resource`, `/user`
- Uploads and downloads are **separate routes** — `uploads.ts` writes to R2, `downloads.ts` reads from R2
- Query params for filters/search, path params for IDs only
- Version prefix is NOT used yet — if needed in future: `/api/v2/...`

---

## 3. Route Template

Every route file follows this exact structure:

```typescript
import { Hono } from 'hono'
import type { Env } from '../types'

const router = new Hono<{ Bindings: Env }>()

router.get('/', async (c) => {
  // 1. Parse & validate input (reuse functions from src/validators.ts)
  const { page = '1', limit = '20' } = c.req.query()
  const pageNum  = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)))

  // 2. Auth check if required
  // const user = c.get('user') // set by auth middleware in src/auth.ts

  // 3. Business logic
  // ...

  // 4. Return response
  return c.json({ data: [], meta: { page: pageNum, limit: limitNum } })
})

export default router
```

**Mount in src/index.ts:**
```typescript
import resources from './routes/resources'
import uploads   from './routes/uploads'
import downloads from './routes/downloads'
import users     from './routes/users'

app.route('/api/resources', resources)
app.route('/api/uploads',   uploads)
app.route('/api/downloads', downloads)
app.route('/api/users',     users)
// etc.
```

**Key files to read before editing any route:**
- `src/types.ts` — check the `Env` interface before accessing `c.env.*`
- `src/validators.ts` — reuse existing validators before writing new ones
- `src/helpers/file-validation.ts` — for any file-related validation in uploads
- `src/helpers/image-validator.ts` — for preview/thumbnail image validation
- `src/middleware/security.ts` — understand what headers/sanitization is already applied globally

---

## 4. Response Format (ALWAYS consistent)

### Success
```json
{
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

### Error
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### HTTP Status Codes
| Situation | Code |
|-----------|------|
| Success (with data) | 200 |
| Created | 201 |
| No content (DELETE) | 204 |
| Bad input | 400 |
| Unauthenticated | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Rate limited | 429 |
| Server error | 500 |

---

## 5. Input Validation

ALWAYS validate before touching D1/R2/KV. Check `src/validators.ts` first — the function you need may already exist there.

```typescript
// Validate ID param
const id = c.req.param('id')
if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
  return c.json({ error: { code: 'INVALID_ID', message: 'Invalid ID format' } }, 400)
}

// Validate pagination
const limit  = Math.min(50, Math.max(1, parseInt(c.req.query('limit') ?? '20')))
const page   = Math.max(1, parseInt(c.req.query('page') ?? '1'))
const offset = (page - 1) * limit
```

For file uploads, always use the helpers — never write inline MIME checks in route files:
```typescript
import { validateFile }  from '../helpers/file-validation'
import { validateImage } from '../helpers/image-validator'
```

---

## 6. Middleware Order (src/index.ts)

Middleware must be applied in this exact order:

```typescript
app.use('*', security())   // 1. Security headers + CORS — src/middleware/security.ts
app.use('*', rateLimit())  // 2. Rate limit before any processing — src/middleware/rate-limit.ts
app.use('/api/*', auth())  // 3. Auth only on /api routes — src/auth.ts
```

> [!WARNING]
> Rate limit MUST come before auth. If auth runs first, an attacker can hammer the session lookup on every request before getting blocked.

---

## 7. Auth Middleware Usage

Auth logic lives in `src/auth.ts` and `src/auth/2fa.ts`. Never duplicate auth logic inside route files.

```typescript
// In a protected route handler:
const user = c.get('user')
if (!user) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401)

// Admin-only:
if (user.role !== 'admin') return c.json({ error: { code: 'FORBIDDEN' } }, 403)
```

---

## 8. Tests

Every route in `src/routes/` has a corresponding test in `src/test/routes/`. When adding or changing a handler, update the test too.

```
src/routes/comments.ts    →   src/test/routes/comments.test.ts
src/routes/resources.ts   →   src/test/routes/resources.test.ts
src/routes/uploads.ts     →   src/test/routes/uploads.test.ts
src/routes/favorites.ts   →   src/test/routes/favorites.test.ts
src/routes/users.ts       →   src/test/routes/users.test.ts
src/routes/tags.ts        →   src/test/routes/tags.test.ts
```

For helpers and validators:
```
src/helpers/file-validation.ts  →  src/test/unit/file-validation.test.ts
src/validators.ts               →  src/test/unit/validators.test.ts
```

Use `src/test/populate.ts` for test data population.

---

## 9. Performance Rules for 100+ Concurrent Users

- **Never await inside a loop.** Use `Promise.all()`.
  ```typescript
  // BAD
  for (const id of ids) { const r = await db.get(id) }
  // GOOD
  const results = await Promise.all(ids.map(id => db.get(id)))
  ```
- **Paginate everything.** Never return unbounded lists. Cap at 50.
- **Return early on errors** — don't do extra work after a 404/400.
- **Don't log on every request** — `console.error` only for real errors.

---

## 10. Anti-Patterns (DO NOT DO)

| Anti-pattern | Why | Correct way |
|---|---|---|
| `SELECT *` in queries | Fetches unused columns | Select only needed columns |
| No input validation | SQL injection, crashes | Always validate — check `validators.ts` first |
| Returning stack traces | Leaks internals | Return generic 500 message |
| Inline MIME/file validation in routes | Duplicates `helpers/` logic | Use `file-validation.ts` / `image-validator.ts` |
| Auth logic inside route files | Duplicates `auth.ts` | Use `c.get('user')` set by middleware |
| `console.log` on every request | Fills Workers log quota | Only log errors |
| No pagination | Returns entire table | Always LIMIT + OFFSET |
| Sequential awaits on independent D1 + R2 calls | Doubles latency | Use `Promise.all` |

---

## 11. Error Handling Pattern

```typescript
router.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: { code: 'INVALID_ID' } }, 400)

    const resource = await getResource(c.env.DB, id)
    if (!resource) return c.json({ error: { code: 'NOT_FOUND' } }, 404)

    return c.json({ data: resource })
  } catch (err) {
    console.error('[GET /resources/:id]', err)
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, 500)
  }
})
```

---

## 12. References

- [Hono Docs](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Skill](./../database-d1/SKILL.md)
- [Cache-KV Skill](./../cache-kv/SKILL.md)
- [Ratelimit Skill](./../ratelimit/SKILL.md)
- [Storage R2 Skill](./../storage-r2/SKILL.md)
