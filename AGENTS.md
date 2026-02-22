# Agent Guide: VRCStorage

This guide is for agentic coding agents (like yourself) operating in the VRCStorage repository. It defines the project's technical stack, coding standards, and common operations to ensure consistency and reliability.

## Tech Stack
- **Runtime:** [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Framework:** [Hono](https://hono.dev/) (v4+)
- **Language:** TypeScript
- **Database:** Cloudflare D1 (SQLite) - Accessible via `c.env.DB`
- **Storage:** Cloudflare R2 (Bucket) - Accessible via `c.env.BUCKET`
- **Caching:** Cloudflare KV - Accessible via `c.env.VRCSTORAGE_KV`
- **Validation:** [Zod](https://zod.dev/) for request body and parameter validation.
- **Testing:** [Vitest](https://vitest.dev/) with `@cloudflare/vitest-pool-workers` for worker-native testing.

## Common Commands

| Purpose | Command |
|---------|---------|
| **Local Development** | `npm run dev` (starts wrangler dev with local assets) |
| **Deploy** | `npm run deploy` (deploys to production) |
| **Generate Types** | `npm run cf-typegen` (updates `worker-configuration.d.ts` from `wrangler.jsonc`) |
| **Run All Tests** | `npm test` |
| **Run Single Test** | `npx vitest run path/to/file.test.ts` |
| **Watch Tests** | `npx vitest` |
| **Linting** | `npx prettier --check .` (Formatting check) |

## Code Style & Conventions

### Formatting & Linting
- **Prettier:** Strictly enforced via `.prettierrc`.
- **Tabs:** Use tabs for indentation.
- **Quotes:** Use single quotes (`'`) for strings.
- **Semicolons:** Always include semicolons at the end of statements.
- **Line Width:** 140 characters limit before wrapping.

### Naming Conventions
- **Files:** `kebab-case.ts` (e.g., `resource-validator.ts`, `rate-limit.ts`).
- **Variables/Functions:** `camelCase`.
- **Classes/Interfaces/Types:** `PascalCase`.
- **Constants:** `UPPER_SNAKE_CASE`.
- **Database Tables/Columns:** `snake_case`. TypeScript interfaces for DB rows must mirror these names exactly.

### Architecture Patterns
- **Modular Routing:** Define specific route handlers in `src/routes/` and mount them in `src/index.ts` using `app.route('/api/path', handler)`.
- **Middleware:** reusable logic in `src/middleware/`.
    - `securityMiddleware`: Sets security headers (CORS, CSP, etc.).
    - `rateLimit`: Protects endpoints from abuse using KV.
- **Validation:** Always use Zod schemas in `src/validators.ts`. Use `.transform()` with `sanitizeHtml` for any string input that might be rendered.
- **Types:** Centralized in `src/types.ts`. Avoid inline types for complex structures.
- **Database Queries:** Use prepared statements for safety. Use `.first<T>()` for single rows and `.all<T>()` for results lists.
- **Error Handling:** Centralized in `src/index.ts` via `app.onError`. Return consistent JSON: `{ "error": "Human readable message", "details": ... }`.

### Internal Links & Routing
- **Internal Links:** MUST use the format `[text](/wiki?topic=slug)`.
- **API Base:** All API endpoints should be prefixed with `/api`.
- **Static Assets:** Served from `public/` and accessible via `c.env.ASSETS`.

### Project Structure
- `src/`: TypeScript source code.
- `src/routes/`: Route handlers.
- `src/middleware/`: Hono middleware.
- `src/helpers/`: Utility functions and validation logic.
- `public/`: Static files (HTML, CSS, Wiki).
- `schema.sql`: D1 database schema definition.
- `wrangler.jsonc`: Cloudflare configuration and bindings.

## Cloudflare Workers Specifics

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

### Docs
- General: https://developers.cloudflare.com/workers/
- Limits: https://developers.cloudflare.com/workers/platform/limits/
- D1: https://developers.cloudflare.com/d1/
- R2: https://developers.cloudflare.com/r2/

### Database Management
- **Schema:** Defined in `schema.sql`. Refer to this file for table structures.
- **D1 API:** Use `c.env.DB.prepare(query)`.
- **Transactions:** Cloudflare D1 supports transactions via `db.batch()`.
- **Primary Keys:** Most tables use UUIDs (v4) as primary keys.
- **Timestamps:** Usually stored as Unix timestamps (seconds or milliseconds). Check `src/types.ts` for each entity.

### R2 Storage
- **Public URL:** R2 buckets are not public by default. Use `src/routes/downloads.ts` or `src/routes/uploads.ts` for access.
- **Keys:** Use consistent key naming for R2 (e.g., `media/{uuid}`).

### Middleware Details
- `securityMiddleware`: Sets `HSTS`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and `CORS`.
- `rateLimit`: Uses KV to store counts. Key format: `rate_limit:{prefix}:{key}`.
- `getAuthUser`: Helper in `src/auth.ts` to retrieve user from session/cookie.

## Core Logic & Helpers

### Sanitization
We do not use `DOMPurify` because it requires a browser DOM. Instead, use the `sanitizeHtml` regex-based helper in `src/validators.ts` to strip HTML tags and dangerous URI schemes from user input.

### File Validation
Located in `src/helpers/file-validation.ts`.
- **Magic Bytes:** We validate file types using byte signatures (magic bytes) rather than just extensions.
- **Size Limits:** Enforced per media type (Images: 20MB, Videos: 100MB, Files: 1500MB).
- Use `isValidFileType(file)` to verify uploads.

### Wiki Documentation
The repository contains a multi-language wiki in `public/wiki/`.
- **Languages:** `pt`, `fr`, `jp`, `ru`.
- **Drafting:** Always draft in Spanish first (if applicable) or verify content thoroughly.
- **Routing:** Handled in `src/routes/wiki.ts`, serving Markdown via `[text](/wiki?topic=slug)`.
- **Formatting:** 
    - Use badges: `<span class="badge badge-blue">Logic</span>`.
    - Use GitHub alerts: `> [!NOTE]`, `> [!TIP]`, etc.
    - Internal links MUST use `/wiki?topic=slug) format.
- **References:** Use a single `## References` section. Format: `* Author. (Date). Title. Site. URL`.
- **Verification:** Prohibited to include unverified links. Verify URLs before adding them.
- **Translations:** Request user confirmation before translating to all supported languages.

## Implementation Checklist for Agents

When implementing a new feature or fixing a bug, verify the following:

1. [ ] **Input Validation:** Are all inputs (body, query, params) validated with Zod?
2. [ ] **Sanitization:** Are string inputs sanitized to prevent XSS?
3. [ ] **Type Safety:** Are `src/types.ts` and `worker-configuration.d.ts` updated and used?
4. [ ] **Security:** Is the endpoint protected by `getAuthUser` or appropriate middleware?
5. [ ] **Rate Limiting:** Is a `rateLimit` middleware applied if the endpoint is public?
6. [ ] **Caching:** Does the KV cache need to be cleared/updated after this change (e.g., `VRCSTORAGE_KV.delete(...)`)?
7. [ ] **Database:** Are queries using prepared statements and `.bind(...)`?
8. [ ] **Tests:** Have you added or updated Vitest tests in the relevant `.test.ts` file?
9. [ ] **Typegen:** Did you run `npm run cf-typegen` if you changed `wrangler.jsonc`?

## Troubleshooting

- **Memory/CPU Limits (1102):** Worker execution exceeded limits. Optimize D1 queries or R2 stream handling.
- **Binding Errors:** Check `wrangler.jsonc` and ensure the variable name in code matches the binding name.
- **D1 Deadlocks:** SQLite in D1 is single-writer. Keep transactions short.
