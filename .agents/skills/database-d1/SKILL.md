---
name: Database — Cloudflare D1
description: Guidelines for querying, indexing, and managing Cloudflare D1 in VRCStorage for performance under high traffic.
---

# Database — Cloudflare D1

> [!IMPORTANT]
> D1 is SQLite under the hood. Not Postgres. Not MySQL. Many SQL features DON'T exist here.

---

## 1. Query Pattern

This project has no `lib/` folder. D1 query functions live either:
- **Inline in the route file** (`src/routes/resources.ts`) — preferred for queries used only in that route
- **In `src/helpers/`** — only if the same query is used in 2+ different route files

```typescript
// Inline inside src/routes/resources.ts

async function getResourceById(db: D1Database, id: string) {
  return db
    .prepare('SELECT id, name, author, preview_url, created_at FROM resources WHERE id = ?')
    .bind(id)
    .first<Resource>()
}

async function listResources(db: D1Database, limit: number, offset: number) {
  return db
    .prepare('SELECT id, name, author, preview_url, created_at FROM resources ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all<Resource>()
}

async function countResources(db: D1Database): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as total FROM resources')
    .first<{ total: number }>()
  return result?.total ?? 0
}
```

**Using it in the route handler:**
```typescript
router.get('/:id', async (c) => {
  const resource = await getResourceById(c.env.DB, c.req.param('id'))
  if (!resource) return c.json({ error: { code: 'NOT_FOUND' } }, 404)
  return c.json({ data: resource })
})
```

---

## 2. SELECT Rules

Always specify columns explicitly:

```sql
-- ❌ BAD
SELECT * FROM resources

-- ✅ GOOD
SELECT id, name, author, preview_url, created_at FROM resources
```

For list endpoints, NEVER include large text fields (descriptions, full metadata) unless explicitly needed. Fetch those only on the detail endpoint.

---

## 3. Indexes — Critical for 100+ Users

Without indexes, every query does a full table scan. With 1000 resources and 100 concurrent users, that's 100,000 row reads per second.

### Required Indexes

```sql
-- Search by author
CREATE INDEX IF NOT EXISTS idx_resources_author ON resources(author);

-- Sort by date (most common listing pattern)
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- If you have tags/categories
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
```

### When to Add an Index
Add an index whenever a column appears in:
- `WHERE column = ?`
- `ORDER BY column`
- `JOIN ... ON column`

### When NOT to Add an Index
- Columns that are almost never queried (adds write overhead)
- Boolean flags with only 2 values (low selectivity, index won't help)

---

## 4. Pagination Pattern

```typescript
// Always paginate. Cap limit at 50.
export async function listResources(
  db: D1Database,
  page: number,
  limit: number
) {
  const safeLimit = Math.min(50, Math.max(1, limit))
  const offset = (Math.max(1, page) - 1) * safeLimit

  const [rows, count] = await Promise.all([
    db.prepare('SELECT id, name, author, preview_url FROM resources ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(safeLimit, offset)
      .all<Resource>(),
    db.prepare('SELECT COUNT(*) as total FROM resources')
      .first<{ total: number }>()
  ])

  return {
    data: rows.results,
    meta: {
      page,
      limit: safeLimit,
      total: count?.total ?? 0,
      pages: Math.ceil((count?.total ?? 0) / safeLimit)
    }
  }
}
```

> [!NOTE]
> Run the COUNT and the SELECT in parallel using `Promise.all`. Never await them sequentially.

---

## 5. Search Queries

D1 supports basic `LIKE` search. FTS5 is unreliable — avoid it.

```typescript
export async function searchResources(db: D1Database, query: string, limit: number, offset: number) {
  // Sanitize: strip SQL wildcards from user input, then add our own
  const safe = query.replace(/[%_\\]/g, '\\$&')
  const pattern = `%${safe}%`

  return db
    .prepare(`
      SELECT id, name, author, preview_url
      FROM resources
      WHERE name LIKE ? OR author LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(pattern, pattern, limit, offset)
    .all<Resource>()
}
```

> [!WARNING]
> Always sanitize LIKE patterns. A query like `%` without escaping matches everything and causes full scans.

For search with high traffic, cache results in KV with the query string as key. See cache-kv SKILL.

---

## 6. Batch Operations

For bulk inserts/updates, use `db.batch()`:

```typescript
// ✅ One round-trip instead of N
const statements = items.map(item =>
  db.prepare('INSERT INTO resources (id, name, author) VALUES (?, ?, ?)')
    .bind(item.id, item.name, item.author)
)
await db.batch(statements)
```

---

## 7. D1 Limitations (Things That Don't Work)

| Feature | Status |
|---------|--------|
| FTS5 full-text search | Unreliable, avoid |
| `ALTER TABLE DROP COLUMN` | Not supported |
| `ALTER TABLE RENAME COLUMN` | Not supported |
| Stored procedures | Not supported |
| `RETURNING` clause | Supported in newer D1 |
| Transactions | Limited — use `db.batch()` instead |
| JSON functions (`json_extract`) | Supported |

---

## 8. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Tables | `snake_case`, plural | `resources`, `users`, `resource_tags` |
| Columns | `snake_case` | `created_at`, `preview_url`, `author_id` |
| Indexes | `idx_table_column` | `idx_resources_author` |
| Primary keys | `id` (TEXT, UUID or nanoid) | `id TEXT PRIMARY KEY` |
| Timestamps | `created_at`, `updated_at` | `created_at INTEGER` (Unix ms) |

Use **INTEGER** (Unix milliseconds) for timestamps, not TEXT ISO strings. Faster to compare and sort.

---

## 9. Anti-Patterns (DO NOT DO)

| Anti-pattern | Why | Correct way |
|---|---|---|
| `SELECT *` | Unnecessary data transfer | List only needed columns |
| No pagination | Returns entire table | Always LIMIT + OFFSET |
| Sequential await for COUNT + SELECT | 2x latency | `Promise.all` |
| Raw SQL duplicated across multiple routes | Hard to maintain, harder to test | Extract to `src/helpers/` only if used in 2+ routes |
| FTS5 | Unreliable on D1 | Use `LIKE` with KV cache |
| No indexes on `WHERE` columns | Full table scans | Add `CREATE INDEX` in migration |
| String IDs without length validation | Enables DoS | Validate max 64 chars |

---

## 10. Performance Rules for 100+ Concurrent Users

- COUNT + SELECT in `Promise.all` (parallel, not sequential)
- Every `WHERE` column must have an index
- Never return more than 50 rows per request
- Cache frequent search queries in KV (TTL 60s) — see cache-kv SKILL
- Use `db.batch()` for any multi-row write
- Extract query functions to `src/helpers/` only when used in 2+ routes — otherwise keep them in the route file

---

## 11. References

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [D1 Workers Binding](https://developers.cloudflare.com/d1/worker-api/)
- [SQL Migrations Skill](./../sql-migrations/SKILL.md)
