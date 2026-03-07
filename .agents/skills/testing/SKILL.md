---
name: Testing (Vitest + Cloudflare Workers)
description: How to write, structure, and name tests for VRCStorage. Covers the worker pattern, test types, shared helpers, and the populate script.
---

# Testing — Vitest on Cloudflare Workers

> [!IMPORTANT]
> Never use `SELF` or a bare `fetch()` to call the worker in tests. The correct pattern is `worker.fetch(req, env, ctx)` with `createExecutionContext` / `waitOnExecutionContext` from `cloudflare:test`. Any test that uses the old pattern is outdated and must be rewritten.

---

## 1. Test Infrastructure

### Runner
`@cloudflare/vitest-pool-workers` — runs tests **inside a real Miniflare Worker environment**, so every Cloudflare binding (D1, KV, R2, RateLimit) is available as `env.*` without any mocking.

### Setup file
`vitest.config.mts` registers `src/test/populate.ts` as `setupFiles`. This script:
1. Applies all SQL schema files from `sql/` against the local D1.
2. Generates and executes fake seed data (100 users, 2 admins, ~700 resources, comments, favorites, wiki comments, tags).

> [!IMPORTANT]
> **Do NOT seed data inside individual test files.** The database is already populated before any test runs. Query the existing data instead.

### Shared test utilities
All helpers live in **`src/test/helpers.ts`**. Never copy-paste helper logic into a test file.

---

## 2. Test Types and Naming

| Type | Suffix | When to use |
|---|---|---|
| **Unit** | `.unit.test.ts` | Pure functions with no external dependencies (no DB, no worker, no network) |
| **Integration** | `.integration.test.ts` | Anything that uses the worker, D1, KV, or R2 |
| **E2E** | `.e2e.test.ts` | Full external HTTP stack (not currently used in this project) |

### Examples
```
src/test/helpers/file-validation.unit.test.ts   ← pure magic-byte functions
src/test/routes/admin.integration.test.ts       ← worker + D1 + KV
src/test/auth/auth.integration.test.ts          ← worker + D1 + KV session
src/test/middleware/security.integration.test.ts
src/test/middleware/rate-limit.integration.test.ts
```

---

## 3. Directory Structure

```
src/test/
  helpers.ts                          # Shared utilities — ALWAYS import from here
  helpers.integration.test.ts         # Tests for helpers.ts itself

  auth/
    auth.integration.test.ts          # Tests for src/auth.ts

  middleware/
    security.integration.test.ts      # Tests for src/middleware/security.ts
    rate-limit.integration.test.ts    # Tests for src/middleware/rate-limit.ts

  helpers/
    file-validation.unit.test.ts      # Tests for src/helpers/ (pure functions)

  routes/
    admin.integration.test.ts         # Tests for src/routes/admin.ts
    comments.integration.test.ts      # etc — one file per route
    resources.integration.test.ts
    ...
```

**Rule:** one test file per source file. The test file lives in the folder that mirrors its source module.

---

## 4. The Worker Pattern (Integration Tests)

Never call the route directly. Always go through `worker.fetch`:

```typescript
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../../index';

async function request(
    method: string,
    path: string,
    cookie?: string,
    body?: unknown,
): Promise<Response> {
    const ctx = createExecutionContext();
    const req = new Request(`http://localhost${path}`, {
        method,
        headers: {
            ...(cookie ? { Cookie: cookie } : {}),
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    return res;
}
```

> [!NOTE]
> `createExecutionContext()` simulates the real Worker execution lifecycle. `waitOnExecutionContext(ctx)` drains any pending `ctx.waitUntil()` promises before assertions run. Both are required.

**Why not `SELF.fetch` or `fetch()`?**
- `SELF` is an older API that doesn't give you control over `env` or execution context.
- A bare `fetch()` would leave the Miniflare sandbox entirely and hit a real network.
- `worker.fetch(req, env, ctx)` guarantees all bindings use the test environment.

---

## 5. Authentication in Tests

The worker reads auth from the `auth_token` cookie, signed with `JWT_SECRET` (set to `'vitest-test-secret-do-not-use-in-prod'` in `vitest.config.mts`).

Use `makeAuthCookie` from `helpers.ts`:

```typescript
import { makeAuthCookie } from '../helpers';

// In beforeAll:
const adminCookie  = await makeAuthCookie(admin.username, true);
const normalCookie = await makeAuthCookie(normal.username, false);

// In a test:
const res = await request('GET', '/api/admin/pending', adminCookie);
```

`makeAuthCookie(username, isAdmin)` mirrors exactly what `createSession()` in `src/auth.ts` does, so the token will be accepted by `getAuthUser()`.

---

## 6. Querying Test Data

Use the DB query helpers from `helpers.ts` — never hardcode UUIDs:

```typescript
import {
    getAdminUser,      // first user with is_admin = 1
    getNormalUser,     // first user with is_admin = 0
    getAnotherNormalUser,  // a second distinct non-admin user
    getPendingResource,    // first resource with is_active = 0
    getActiveResource,     // first resource with is_active = 1
    getActiveResourceByOwner,  // active resource belonging to a specific author
    getAnyComment,         // a comment, optionally filtered by author_uuid
    getAnyWikiComment,     // a wiki comment, optionally filtered by author_uuid
    getAnyTag,             // any tag row
} from '../helpers';
```

You can also query `env.DB` directly for assertions:

```typescript
const row = await env.DB
    .prepare('SELECT is_active FROM resources WHERE uuid = ?')
    .bind(uuid)
    .first<{ is_active: number }>();
expect(row?.is_active).toBe(1);
```

---

## 7. Integration Test Template

```typescript
// ============================================================================
// <Module> Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { SomeType } from './../../types';
import { makeAuthCookie, request, getAdminUser, getNormalUser } from '../helpers';

// ============================================================================
// Setup
// ============================================================================

let adminCookie: string;
let normalCookie: string;

beforeAll(async () => {
    const admin  = await getAdminUser();
    const normal = await getNormalUser();
    adminCookie  = await makeAuthCookie(admin.username, true);
    normalCookie = await makeAuthCookie(normal.username, false);
});

// ============================================================================
// GET /api/example
// ============================================================================

describe('GET /api/example', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request('GET', '/api/example');
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
        const res = await request('GET', '/api/example', normalCookie);
        expect(res.status).toBe(403);
    });

    it('returns 200 with expected shape for an admin', async () => {
        const res  = await request('GET', '/api/example', adminCookie);
        expect(res.status).toBe(200);
        const body = await res.json() as SomeType[];
        expect(Array.isArray(body)).toBe(true);
    });
});
```

**Rules:**
- One `describe` block per endpoint.
- Always test auth guards first (401 → 403 → happy path), in that order.
- Use typed `as` casts on `res.json()` — never use `any`.
- Verify mutations in the DB directly via `env.DB`, not just by trusting the response body.

---

## 8. Unit Test Template

```typescript
// ============================================================================
// <Helper> Unit Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import { myPureFunction } from '../../helpers/my-helper';

describe('myPureFunction()', () => {
    it('returns the expected value for valid input', () => {
        expect(myPureFunction('valid')).toBe('expected');
    });

    it('returns false for invalid input', () => {
        expect(myPureFunction('')).toBe(false);
    });
});
```

No `beforeAll`, no `env`, no `worker` — just pure inputs and outputs.

---

## 9. What NOT to Do

| Anti-pattern | Why | Correct way |
|---|---|---|
| `SELF.fetch(...)` | Outdated API, no env control | `worker.fetch(req, env, ctx)` |
| `fetch('http://localhost/api/...')` | Leaves the sandbox | `worker.fetch(req, env, ctx)` |
| Seeding data inside a test | Already done by `populate.ts` | Use `getActiveResource()` etc. from `helpers.ts` |
| Hardcoding UUIDs | Data changes on each seed | Query with `getAdminUser()`, `getAnyComment()`, etc. |
| `as any` on response bodies | Hides type errors | Use typed interfaces from `src/types.ts` |
| Auth logic inside test file | Duplicates `helpers.ts` | Use `makeAuthCookie()` |
| Skipping the 401/403 tests | Auth regressions go unnoticed | Always test both guards before the happy path |
| Mixing integration + unit in one file | Confuses test type boundaries | Use `.unit.test.ts` vs `.integration.test.ts` |

---

## 10. Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Run only one file
npm test -- src/test/routes/admin.integration.test.ts
```

To re-seed the database before running:
```bash
npm run seed && npm test
```
