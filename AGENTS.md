# Agent Guide: VRCStorage

This guide is for agentic coding agents (like yourself) operating in the VRCStorage repository. It defines the project's technical stack, coding standards, and common operations to ensure consistency and reliability.

## Tech Stack
- **Runtime:** [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Framework:** [Hono](https://hono.dev/) (v4+)
- **Language:** TypeScript (backend **and** frontend)
- **Database:** Cloudflare D1 (SQLite) - Accessible via `c.env.DB`
- **Storage:** Cloudflare R2 (Bucket) - Accessible via `c.env.BUCKET`
- **Caching:** Cloudflare KV - Accessible via `c.env.VRCSTORAGE_KV`
- **Validation:** [Zod](https://zod.dev/) for request body and parameter validation.
- **Frontend Bundler:** [esbuild](https://esbuild.github.io/) — compiles `src/frontend/` → `public/js/bundle.js`.
- **Icons:** [lucide](https://lucide.dev/) — icon library used via centralized `src/frontend/icons.ts` module.

## Common Commands

| Purpose | Command |
|---------|---------|
| **Local Development** | `npm run dev` (runs esbuild in watch mode + wrangler dev concurrently) |
| **Deploy** | `npm run deploy` (builds frontend, then deploys to production) |
| **Deploy (Preview)** | `npm run deploy:test` (builds frontend, then uploads a preview version) |
| **Build Frontend** | `npm run build-frontend` (production bundle, no source maps) |
| **Build Frontend (Dev)** | `npm run build-frontend:dev` (development bundle with source maps) |
| **Watch Frontend** | `npm run build-frontend:watch` (esbuild watch mode, dev bundle) |
| **Generate Types** | `npm run cf-typegen` (updates `worker-configuration.d.ts` from `wrangler.jsonc`) |
| **Check i18n** | `npm run check-i18n` (validates translation file consistency) |
| **Seed DB** | `npm run seed` (populates local D1 with test data via `src/test/setup/populate.ts`) |
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
- **Types:** Centralized in `src/types.ts` (backend) and `frontend/types.ts` (frontend). Avoid inline types for complex structures.
- **Database Queries:** Use prepared statements for safety. Use `.first<T>()` for single rows and `.all<T>()` for results lists.
- **Error Handling:** Centralized in `src/index.ts` via `app.onError`. Return consistent JSON: `{ "error": "Human readable message", "details": ... }`.

### Frontend View Pattern
The frontend uses a **functional view pattern** — no class-based views. Every view module exports:
- `viewFn` (named `<name>View`): `(ctx: RouteContext) => string | Promise<string>` — returns the HTML string for the route.
- `afterFn` (named `<name>After`, optional): `(ctx: RouteContext) => void | Promise<void>` — runs after the DOM is inserted (attaches event listeners, fetches data, etc.).

```typescript
// Example: frontend/views/ExampleView.ts
import type { RouteContext } from '../types';

export async function exampleView(ctx: RouteContext): Promise<string> {
	return `<div>...</div>`;
}

export async function exampleAfter(ctx: RouteContext): Promise<void> {
	// Wire up DOM listeners here
}
```

Routes are registered in `frontend/app.ts`:
```typescript
route('/example', exampleView, { after: exampleAfter });
```

### Internal Links & Routing
- **Internal Links:** MUST use the format `[text](/wiki?topic=slug)`.
- **API Base:** All API endpoints should be prefixed with `/api`.
- **Static Assets:** Served from `public/` and accessible via `c.env.ASSETS`.

### Project Structure
```

src/
  auth/                   # Authentication submodules
    2fa.ts                # TOTP / two-factor logic
    google.ts             # Google OAuth helpers
  auth.ts                 # getAuthUser helper (session/cookie resolution)
  check-i18n.ts           # CLI script: validates i18n locale consistency
  frontend/               # TypeScript SPA source (compiled by esbuild)
    build-frontend.mjs    # esbuild script: bundles src/frontend/ → public/js/bundle.js
                          # --dev flag enables source maps; --watch flag enables watch mode
    app.ts                # Entry point: route registration, nav, auth, boot
    router.ts             # History API SPA router (route/navigateTo/initRouter)
    i18n.ts               # i18n loader (wraps dynamic import of locale files)
    cache.ts              # DataCache — in-memory + sessionStorage caching
    comment-editor.ts     # Shared Markdown editor component (toolbar, image upload, Turnstile)
    diff.ts               # Content diff utilities
    icons.ts              # Centralized Lucide icon registry
    utils.ts              # General frontend utilities
    admin.ts              # Admin-specific frontend logic
    types.ts              # Frontend-only TypeScript types (RouteContext, ViewFn, etc.)
    views/                # Functional view modules (viewFn + optional afterFn)
      AdminView.ts         BlogCreateView.ts  BlogListView.ts
      BlogPostView.ts      CategoryView.ts    DMCAView.ts
      EditResourceView.ts  FavoritesView.ts   HistoryView.ts
      HomeView.ts          ItemView.ts        LoginView.ts
      OAuthRegisterView.ts RegisterView.ts    SettingsView.ts
      TOSView.ts           UploadView.ts      WikiView.ts
  helpers/
    file-validation.ts    # Magic-byte file type & size validation
    image-validator.ts    # Image-specific validation
    oauth-upsert.ts       # OAuth user upsert logic
    query-constructor.ts  # Dynamic D1 query builder
    turnstile.ts          # Cloudflare Turnstile token verification
  index.ts                # App entry point, route mounting, error handler
  middleware/
    rate-limit.ts         # KV-based rate limiter
    security.ts           # Security headers middleware
  routes/
    2fa.ts                # Two-factor authentication endpoints
    admin.ts              # Admin panel endpoints
    blog.ts               # Blog CRUD endpoints
    comments.ts           # Comment endpoints
    downloads.ts          # R2 file download proxy
    favorites.ts          # User favorites endpoints
    oauth.ts              # OAuth flow endpoints
    resources.ts          # Resource upload/listing/detail endpoints
    system.ts             # System/version info endpoints
    tags.ts               # Tag listing endpoints
    uploads.ts            # R2 file upload handler
    users.ts              # User profile/account endpoints
    utils.ts              # Miscellaneous utility endpoints
    wiki.ts               # Wiki Markdown serving
  types.ts                # Shared backend TypeScript types
  validators.ts           # Zod schemas + sanitizeHtml helper

public/
  index.html              # SPA shell
  style.css               # CSS import manifest (imports from public/style/)
  style/                  # Modular CSS files
    base.css              # CSS variables, reset, typography
    nav.css               # Navigation bar
    buttons.css           # Button components
    cards.css             # Card components
    forms.css             # Form inputs and layouts
    item.css              # Resource item page styles
    pages.css             # Misc page-level styles
    blog.css              # Blog-specific styles
    wiki.css              # Wiki page styles
    admin.css             # Admin panel styles
  sw.js                   # Service worker
  js/
    bundle.js             # Compiled frontend bundle (output of esbuild, DO NOT EDIT)
    i18n/                 # Locale files (ES module, `export default { ... }`)
      cn.js  en.js  es.js  fr.js  jp.js  pt.js  ru.js
  test/                   # Static test assets (avatar images for seeding)
  wiki/                   # Markdown wiki articles (multi-language)

sql/                      # D1 schema files
  SCHEMA_INIT.sql         # Initial schema
  SCHEMA_EDIT_*.sql       # Incremental migrations (timestamped)

wrangler.jsonc            # Cloudflare Worker configuration & bindings
tsconfig.json             # Backend TypeScript config
tsconfig.frontend.json    # Frontend TypeScript config (for type-checking only)
```

## Cloudflare Workers Specifics

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

### Docs
- General: https://developers.cloudflare.com/workers/
- Limits: https://developers.cloudflare.com/workers/platform/limits/
- D1: https://developers.cloudflare.com/d1/
- R2: https://developers.cloudflare.com/r2/

### Database Management
- **Schema:** The initial schema is in `sql/SCHEMA_INIT.sql`. Incremental migrations follow the `sql/SCHEMA_EDIT_<date>.sql` naming convention. Never edit `SCHEMA_INIT.sql` after it has been applied; always create a new migration file.
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

### Turnstile (CAPTCHA)
Located in `src/helpers/turnstile.ts`. Used to verify Cloudflare Turnstile tokens on public endpoints (registration, contact forms, etc.).

### Frontend Build System
The frontend is **TypeScript-first** and compiled with esbuild:
- **Source:** `src/frontend/` directory (TypeScript).
- **Output:** `public/js/bundle.js` (single IIFE bundle, minified in production).
- **Source Maps:** Only emitted in dev mode (`--dev` flag). Never included in production builds.
- **i18n files** in `public/js/i18n/` are **not** bundled — they remain separate static files imported at runtime.
- The build script is `src/frontend/build-frontend.mjs`. Do not edit the output `bundle.js` directly.

### Icons
Icons are managed via a centralized registry in `src/frontend/icons.ts`, built on the `lucide` package.
- Import icons from `./icons` — never inline raw SVG strings in views.
- The module exports a typed `getIcon(name, size?)` function that returns an SVG string.
- This ensures consistent sizing and stroke width across the entire UI.

### Shared Comment Editor
`src/frontend/comment-editor.ts` is a reusable module that encapsulates the full Markdown editor experience:
- Markdown toolbar (bold, italic, link, etc.) with Lucide icons.
- Native image upload via clipboard paste and the `/api/upload` endpoint.
- Cloudflare Turnstile integration.
- Used by `ItemView`, `BlogCreateView`, and `BlogPostView` — do not duplicate this logic in individual views.

### i18n (Frontend)
Locale files live in `public/js/i18n/` as ES modules (`export default { ... }`).
- **Supported locales:** `cn`, `en`, `es`, `fr`, `jp`, `pt`, `ru`.
- **Loader:** `src/frontend/i18n.ts` handles dynamic locale loading.
- **Consistency check:** Run `npm run check-i18n` to detect missing keys, orphan keys, or missing categories across all locale files. The script exits with code `1` if issues are found (CI-safe).

### CSS Architecture
The stylesheet is modular. `public/style.css` is the **import manifest only** — it `@import`s from `public/style/`:
- Edit the appropriate module file (e.g., `public/style/wiki.css`) for targeted changes.
- Do not put new styles directly in `public/style.css`.

### Wiki Documentation
The repository contains a multi-language wiki in `public/wiki/`.
- **Languages:** `pt`, `fr`, `jp`, `ru`.
- **Drafting:** Always draft in Spanish first (if applicable) or verify content thoroughly.
- **Routing:** Handled in `src/routes/wiki.ts`, serving Markdown via `[text](/wiki?topic=slug)`.
- **Formatting:**
    - Use badges: `<span class="badge badge-blue">Logic</span>`.
    - Use GitHub alerts: `> [!NOTE]`, `> [!TIP]`, etc.
    - Internal links MUST use `/wiki?topic=slug` format.
- **References:** Use a single `## References` section. Format: `* Author. (Date). Title. Site. URL`.
- **Verification:** Prohibited to include unverified links. Verify URLs before adding them.
- **Translations:** Request user confirmation before translating to all supported languages.

## Implementation Checklist for Agents

When implementing a new feature or fixing a bug, verify the following:

1. [ ] **Input Validation:** Are all inputs (body, query, params) validated with Zod?
2. [ ] **Sanitization:** Are string inputs sanitized to prevent XSS?
3. [ ] **Type Safety:** Are `src/types.ts`, `frontend/types.ts`, and `worker-configuration.d.ts` updated and used?
4. [ ] **Security:** Is the endpoint protected by `getAuthUser` or appropriate middleware?
5. [ ] **Rate Limiting:** Is a `rateLimit` middleware applied if the endpoint is public?
6. [ ] **Caching:** Does the KV cache need to be cleared/updated after this change (e.g., `VRCSTORAGE_KV.delete(...)`)?
7. [ ] **Database:** Are queries using prepared statements and `.bind(...)`?
8. [ ] **Schema Migration:** If the DB schema changed, did you create a new `sql/SCHEMA_EDIT_<date>.sql` file?
9. [ ] **i18n:** If new translatable strings were added to the frontend, did you update all locale files in `public/js/i18n/` and run `npm run check-i18n`?
10. [ ] **Frontend Build:** After editing anything in `src/frontend/`, did you rebuild with `npm run build-frontend`?
11. [ ] **Typegen:** Did you run `npm run cf-typegen` if you changed `wrangler.jsonc`?

## Troubleshooting

- **Memory/CPU Limits (1102):** Worker execution exceeded limits. Optimize D1 queries or R2 stream handling.
- **Binding Errors:** Check `wrangler.jsonc` and ensure the variable name in code matches the binding name.
- **D1 Deadlocks:** SQLite in D1 is single-writer. Keep transactions short.
- **i18n out of sync:** Run `npm run check-i18n` to identify which keys or locales are missing.
- **Bundle not updating:** Remember to run `npm run build-frontend` after editing files in `src/frontend/`. In dev mode, use `npm run dev` which runs esbuild in watch mode automatically.
- **Source maps in production:** The `src/frontend/build-frontend.mjs` only emits source maps when the `--dev` flag is passed. Production deploys via `npm run deploy` never include `.map` files.
