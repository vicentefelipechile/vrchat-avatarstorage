# Agent Guide: VRCStorage

This guide is for agentic coding agents (like yourself) operating in the VRCStorage repository. It defines the project's technical stack, coding standards, and common operations to ensure consistency and reliability.


## Communication Style

**EXPLICITLY PROHIBITED:** Manipulating files using git without explicit user permission. Any git operations must be announced in advance and explicitly approved.

- **No sycophancy.** Never say "you're right", "great point", "absolutely", "of course", "tienes razón", "good catch", or any similar filler phrase. Just do the work.
- **Be direct.** If something is wrong, say what it is and fix it. Skip the preamble.
- **Don't over-explain corrections.** If you made an error, acknowledge it in one sentence max and move on.
- **Don't celebrate the user's feedback.** Receiving a correction is normal. Treat it as such.
- **Always be honest.** Give the real answer, even if it's uncomfortable. Never soften the truth to avoid conflict. A wrong answer delivered kindly is still wrong.

## Tech Stack

- **Runtime:** [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Framework:** [Hono](https://hono.dev/) (v4+)
- **Language:** TypeScript (backend **and** frontend)
- **Database:** Cloudflare D1 (SQLite) - Accessible via `c.env.DB`
- **Storage:** Two Cloudflare R2 buckets:
  - `BUCKET` (`vrcstorage`) — originals + all non-image files (zip, rar, blend, mp4). Accessible via `c.env.BUCKET`.
  - `MEDIA_BUCKET` (`vrcstorage-media`) — pre-processed image variants only (6 per image). Accessible via `c.env.MEDIA_BUCKET`.
- **Images:** Cloudflare Images binding (`IMAGES`) — used by the queue handler to generate image variants and blur placeholders. Configured in `wrangler.jsonc` (main Worker only; the CDN Worker does not need this binding).
- **KV Cache:** Cloudflare KV - Accessible via `c.env.VRCSTORAGE_KV` (used by legacy rate-limit middleware).
- **Rate Limiting:** Cloudflare native Rate Limiting bindings — `RL_STRICT` (1/60s), `RL_MEDIUM` (100/60s), `RL_GLOBAL` (500/60s), `RL_LOGIN` (10/60s). Configured in `wrangler.jsonc`.
- **Queues:** Cloudflare Queues — `UPLOAD_QUEUE` binding for async upload post-processing. After a file is stored, the `queue` handler (`src/http/queue.ts` → `MediaProcessingService`) generates 6 image variants (low/med/original × webp/png) and a blur placeholder stored in D1.
- **Cron:** Scheduled worker runs daily at `0 3 * * *` UTC — the `scheduled` handler (`src/http/scheduled.ts`) reuses `AdminService.cleanupOrphanedMedia`.
- **Validation:** [Zod](https://zod.dev/) for request body and parameter validation.
- **Frontend Bundler:** [esbuild](https://esbuild.github.io/) — compiles `src/frontend/` → `public/js/bundle.js`.
- **Icons:** [lucide](https://lucide.dev/) — icon library used via centralized `src/frontend/icons.ts` module.

## Common Commands

| Purpose                  | Command                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Local Development**    | `npm run dev` (runs esbuild in watch mode + wrangler dev concurrently)                   |
| **Dev CDN Worker**       | `npm run dev:cdn` (runs CDN Worker on port 8788 via `wrangler-cdn.jsonc`)                |
| **Deploy**               | `npm run deploy` (builds frontend, then deploys to production)                           |
| **Deploy CDN Worker**    | `npm run deploy:cdn` (deploys the dedicated CDN Worker via `wrangler-cdn.jsonc`)         |
| **Deploy (Preview)**     | `npm run deploy:test` (builds frontend, then uploads a preview version)                  |
| **Build Frontend**       | `npm run build-frontend` (production bundle, no source maps)                             |
| **Build Frontend (Dev)** | `npm run build-frontend:dev` (development bundle with source maps)                       |
| **Watch Frontend**       | `npm run build-frontend:watch` (esbuild watch mode, dev bundle)                          |
| **Generate Types**       | `npm run cf-typegen` (updates `worker-configuration.d.ts` from `wrangler.jsonc`)         |
| **Manage i18n**          | `npm run i18n-manager [ADD\|FILL\|LIST\|CHECK] ...` (see [i18n section](#i18n-frontend)) |
| **Seed DB**              | `npm run seed` (populates local D1 with test data via `src/test/setup/populate.ts`)      |
| **Linting**              | `npx prettier --check src/` (Formatting check — only src/ directory)                     |

## Code Style & Conventions

### Formatting & Linting

- **Prettier:** Strictly enforced via `.prettierrc`. Configured to only format files in `src/` directory via `.prettierignore`.
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

The backend is a **layered architecture**: route → service → repository. Each API domain is split across three directories, and `src/index.ts` mounts the routers with `app.route('/api/path', handler)`.

- **Routes** (`src/http/routes/`): thin HTTP handlers. They resolve auth (via the guards in `src/http/middleware/auth.ts`), parse/validate input, call a service, and shape the response. They own the env collaborators that cannot leave the request (R2 buckets, KV caches, `UPLOAD_QUEUE`, cookies/sessions, the raw request stream) and hand them to the service where needed. No business logic, no SQL.
- **Services** (`src/services/`): business rules, env-agnostic. They throw typed domain errors (`src/domain/errors.ts`) instead of building HTTP responses; secrets/collaborators (Turnstile secret, JWT secret, KV, R2 bucket, queue) are **passed into** the methods that need them so a service never reads `c.env`.
- **Repositories** (`src/repositories/`): the ONLY place SQL lives, one repo per table (e.g. `user-repository.ts`, `blog-post-repository.ts`). They use the `db/client.ts` helpers (`queryOne<T>`, `queryAll<T>`, `execute`, `batch`) — not raw `c.env.DB.prepare` — and return DB row types; mapping to the API shape is the service's job.
- **Auth guards** (`src/http/middleware/auth.ts`): `requireAuth`, `requireAdmin`, `optionalAuth`. On success they set `c.get('user')` (typed via `AuthVariables`); on failure they throw `UnauthorizedError`/`ForbiddenError`. These replace the per-handler `getAuthUser` + manual role checks.
- **Response helpers** (`src/http/responses.ts`): `fail(c, message, status, details?)` and `ok(c, payload, status?)` guarantee a consistent JSON envelope (`{ error, details? }`).
- **Middleware:** `securityMiddleware` (security headers) and the legacy KV `rateLimit` in `src/http/middleware/`; native rate-limit bindings are wired in `src/http/rate-limits.ts` (`registerRateLimits`, called from `src/index.ts`).
- **Validation:** Always use Zod schemas in `src/validators.ts`. Use `.transform()` with `sanitizeHtml` for any string input that might be rendered.
- **Types:** Centralized in `src/types.ts` (backend) and `frontend/types.ts` (frontend). Avoid inline types for complex structures.
- **Error Handling:** Centralized in `src/index.ts` via `app.onError`, which maps `DomainError → its status`, `ZodError → 400`, and anything else → `500 { error: 'Internal Server Error' }`. Always return consistent JSON: `{ "error": "Human readable message", "details": ... }`.

### Route File Structure

Every file in `src/http/routes/`, `src/services/`, and `src/repositories/` follows a strict structural pattern using 105-`=` section banners. Deviating from this pattern is not allowed.

```typescript
// =========================================================================================================
// MODULE NAME ROUTES (v2)
// =========================================================================================================
// Brief description: what this module handles and what stays in the route vs the service/repository.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { ExampleService } from '../../services/example-service';
import { fail } from '../responses';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const routerName = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/route/:param
// One-line description of what this endpoint does.
// =========================================================================================================

routerName.get('/:param', requireAuth, async (c) => {
    const result = await new ExampleService(c.env.DB).doThing(c.get('user'), c.req.param('param')!);
    return c.json(result);
});

// =========================================================================================================
// Export
// =========================================================================================================

export default routerName;
```

**Rules:**

- The 105-`=` banner is **mandatory** before every section and every endpoint handler.
- Auth is enforced with the **guards** (`requireAuth` / `requireAdmin` / `optionalAuth`), not a hand-rolled `getAuthUser` check. The authenticated user is read via `c.get('user')`, and the router generic must include `Variables: AuthVariables`.
- Services throw **typed domain errors** (`NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`, `GoneError`); routes let them bubble to `app.onError`. Use `fail()` only for pre-service input rejections (e.g. malformed JSON).
- A new domain slice means three files: a router in `src/http/routes/`, a service in `src/services/`, and one repository per table in `src/repositories/`. All SQL lives in the repository.
- The `// Helpers` section is only added when helper functions exist; router initialization (`const x = new Hono(...)`) always goes inside `// Endpoints`.
- The `// Export` section banner is **always** present, even for simple modules.

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
    2fa.ts                # TOTP / two-factor crypto (pure helpers)
    google.ts             # Google OAuth adapter (auth URL, code exchange, id_token verify)
  auth.ts                 # getAuthUser + createSession helpers (session/cookie/KV resolution)
  db/
    client.ts             # D1 query helpers: queryOne / queryAll / execute / batch (DB type alias)
    schema.ts             # DB row types + RESOURCE_CATEGORIES
    migrator.ts           # Programmatic migration runner
  domain/
    errors.ts             # Typed domain errors (NotFound/Unauthorized/Forbidden/Validation/Conflict/Gone)
  http/
    responses.ts          # fail() / ok() JSON envelope helpers
    rate-limits.ts        # registerRateLimits(app) — all native rate-limit wiring
    seo.ts                # registerSeoRoutes(app) — crawler-facing /wiki, /blog/:slug, /item/:uuid (OG injection)
    queue.ts              # `queue` entrypoint handler — runs the image pipeline per message
    scheduled.ts          # `scheduled` (cron) entrypoint handler — daily orphan cleanup
    middleware/
      auth.ts             # requireAuth / requireAdmin / optionalAuth guards + AuthVariables
      rate-limit.ts       # KV-based rate limiter (legacy)
      security.ts         # Security headers middleware
    routes/               # Thin HTTP handlers (route layer) — one file per API domain
      admin.ts            assets.ts     authors.ts    avatars.ts
      blog.ts             clothes.ts    comments.ts   downloads.ts
      favorites.ts        llms.ts       oauth.ts      resources.ts
      system.ts           two-factor.ts uploads.ts    users.ts
      wiki.ts
  services/               # Business logic (service layer), env-agnostic — one file per domain
    admin-service.ts      asset-service.ts    author-service.ts   avatar-service.ts
    blog-service.ts       clothes-service.ts  comment-service.ts  download-service.ts
    favorite-service.ts   media-processing-service.ts             oauth-service.ts
    resource-service.ts   two-factor-service.ts                   upload-service.ts
    user-service.ts       wiki-comment-service.ts
  repositories/           # ALL SQL (repository layer) — one file per table
    admin-repository.ts       asset-repository.ts       author-repository.ts
    avatar-repository.ts      blog-comment-repository.ts blog-post-repository.ts
    clothes-repository.ts     comment-repository.ts     favorite-repository.ts
    media-repository.ts       media-variant-repository.ts oauth-repository.ts
    resource-repository.ts    user-repository.ts        wiki-comment-repository.ts
  tools/
    i18n-manager.mjs      # CLI script: add/inspect translation keys (npm run i18n-manager)
    build-frontend.mjs    # esbuild script: bundles src/frontend/ → public/js/bundle.js
                          # --dev flag enables source maps; --watch flag enables watch mode
  frontend/               # TypeScript SPA source (compiled by esbuild)
    app.ts                # Entry point: route registration, nav, auth, boot
    router.ts             # History API SPA router (route/navigateTo/initRouter)
    i18n.ts               # i18n loader (wraps dynamic import of locale files)
    cache.ts              # DataCache — two-layer cache: in-memory Map + localStorage (survives reloads)
    comment-editor.ts     # Shared Markdown editor component (toolbar, image upload, Turnstile)
    diff.ts               # Content diff utilities
    filter-panel.ts       # Reusable faceted filter panel (used in AvatarsView, etc.)
    icons.ts              # Centralized Lucide icon registry
    utils.ts              # General frontend utilities (incl. showToast)
    admin.ts              # Admin-specific frontend logic
    types.ts              # Frontend-only TypeScript types (RouteContext, ViewFn, etc.)
    views/                # Functional view modules (viewFn + optional afterFn)
      AdminView.ts         AssetsView.ts      AuthorView.ts
      AvatarsView.ts       BlogCreateView.ts  BlogListView.ts
      BlogPostView.ts      CategoryView.ts    ClothesView.ts
      DMCAView.ts          EditResourceView.ts FavoritesView.ts
      HistoryView.ts       HomeView.ts        ItemView.ts
      LoginView.ts         OAuthRegisterView.ts RegisterView.ts
      SettingsView.ts      TOSView.ts         UploadView.ts
      WikiView.ts
  helpers/
    file-validation.ts    # Magic-byte file type & size validation
    image-validator.ts    # Image-specific validation
    query-constructor.ts  # Dynamic D1 query builder
    turnstile.ts          # Cloudflare Turnstile token verification
  cdn-worker.ts           # Dedicated CDN Worker entry point (deployed separately via wrangler-cdn.jsonc)
  index.ts                # Composition root: builds the app, wires middleware +
                          # registerRateLimits + app.onError, mounts the /api routers,
                          # calls registerSeoRoutes, serves the SPA, and exports the
                          # fetch/queue/scheduled entrypoints. No logic, no SQL.
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
    pages.css             # Footer, TOS, DMCA, version info modal styles
    age-gate.css          # Age verification overlay modal styles
    blog.css              # Blog-specific styles
    wiki.css              # Wiki page styles
    admin.css             # Admin panel styles (legacy, kept for compatibility)
    admin-dashboard.css   # Admin dashboard stats and layout
    authors.css           # Avatar author profile page styles
    search.css            # Search bar and filter panel styles
  sw.js                   # Service worker
  js/
    bundle.js             # Compiled frontend bundle (output of esbuild, DO NOT EDIT)
    i18n/                 # Locale files — plain JSON (`{ "key": "value" }`, NOT ES modules)
      cn.json  de.json  en.json  es.json  fr.json  it.json
      jp.json  nl.json  pl.json  pt.json  ru.json  tr.json
  wiki/                   # Markdown wiki articles (multi-language)
    cn/ de/ en/ es/ fr/ it/ jp/ nl/ pl/ pt/ ru/ tr/
    └── <topic>.md        # 23 articles per language (home, faq, setup, poiyomi, ...)

migrations/               # D1 schema & migration files
  0001_initial.sql        # Initial schema
  0002_index_resources.sql
  0003_tags.sql
  0004_favorites.sql
  0005_2fa.sql
  0006_google.sql
  0007_blogs.sql
  0008_category_authors.sql   # avatar_authors table (normalized author profiles)
  0009_category_metadata.sql  # avatar_meta, asset_meta, clothes_meta tables
  0010_backfill_metadata.sql  # Backfill metadata for existing resources
  0011_community_ads.sql      # (historical) community ads schema — feature removed, tables no longer used
  0012_media_variants.sql     # placeholder_blur column on media + media_variants table
  0013_avatar_urls_to_cdn.sql # Rewrite persisted avatar_url values from /api/download/<key> to CDN URLs
                              # New migrations follow the pattern: NNNN_description.sql

wrangler.jsonc            # Main Worker configuration & bindings
wrangler-cdn.jsonc        # CDN Worker configuration (MEDIA_BUCKET, BUCKET, DB only)
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

- **Schema:** All migration files live in `migrations/`. The initial schema is `migrations/0001_initial.sql`. New migrations follow the sequential naming pattern `migrations/NNNN_description.sql` (e.g. `0008_new_feature.sql`). Never edit an already-applied migration; always create a new file.
- **D1 API:** Use `c.env.DB.prepare(query)`.
- **Transactions:** Cloudflare D1 supports transactions via `db.batch()`.
- **Primary Keys:** Most tables use UUIDs (v4) as primary keys.
- **Timestamps:** Usually stored as Unix timestamps (seconds or milliseconds). Check `src/types.ts` for each entity.

### R2 Storage

- **Public URL:** R2 buckets are not public by default. Use `src/http/routes/downloads.ts` or `src/http/routes/uploads.ts` for access.
- **Keys:** R2 keys are random UUIDs generated at upload time (e.g. `crypto.randomUUID()`). The key is stored in `media.r2_key` and forms part of all download URLs: `/api/download/<r2_key>`.
- **Never delete R2 objects directly** without also deleting the corresponding `media` row. Always pair `BUCKET.delete(r2_key)` + `DELETE FROM media WHERE uuid = ?`.

### Middleware Details

- `securityMiddleware`: Sets `HSTS`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and `CORS`.
- `rateLimit` (legacy): KV-based rate limiter in `src/http/middleware/rate-limit.ts`. Key format: `rate_limit:{prefix}:{key}`. Most endpoints now use the **Cloudflare native Rate Limiting bindings** (`RL_STRICT`, `RL_MEDIUM`, `RL_GLOBAL`, `RL_LOGIN`) configured directly in `wrangler.jsonc` and applied in `src/http/rate-limits.ts` via `rateLimit({ binding: c.env.RL_*, keyPrefix: '...' })`.
- `getAuthUser`: Helper in `src/auth.ts` to retrieve user from session/cookie.

> **Note:** `GET /api/version` (in `src/http/routes/system.ts`) is **intentionally public and unauthenticated**. It exposes deployment metadata (version ID, commit hash, compatibility date, Cloudflare Ray ID, colo, country) for debugging and monitoring purposes. This is a deliberate design decision — do not gate it behind auth or flag it as information disclosure.

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
- **i18n files** in `public/js/i18n/` are **not** bundled — they are plain `.json` files loaded at runtime by `src/frontend/i18n.ts`. Do not convert them to ES modules.
- The build script is `src/tools/build-frontend.mjs`. Do not edit the output `bundle.js` directly.

### Icons

Icons are managed via a centralized registry in `src/frontend/icons.ts`, built on the `lucide` package.

- Import icons from `./icons` — never inline raw SVG strings in views.
- The module exports a typed `getIcon(name, size?)` function that returns an SVG string.
- This ensures consistent sizing and stroke width across the entire UI.

### Shared Markdown & Comment Editor

`src/frontend/comment-editor.ts` is a reusable module that encapsulates the full Markdown editor experience. It offers two modes:

1. **Full Comment Form:** Uses `commentEditorHtml()` and `initCommentEditor()`. Includes Turnstile, submit handling, and the toolbar. Used in `ItemView`, `BlogPostView`.
2. **Standalone Toolbar:** Uses `markdownToolbarHtml()` and `initMarkdownToolbar()`. Just the formatting toolbar and paste-to-upload logic, designed to be dropped into custom forms.

**Markdown Editor Pattern:**
When adding a Markdown description field to a form (like in `AdCreateView` or `BlogCreateView`), follow the established layout pattern:
- Wrap the editor in `.md-editor-wrap` with `.md-editor-tabs` (Write / Preview).
- Render the `textarea` and toolbar inside a `.comment-editor` pane.
- Render the preview via `marked` and `DOMPurify` inside a `.markdown-body` pane.
- **Never** duplicate toolbar generation or image paste logic in individual views.

### Frontend Utilities & Feedback

All visual feedback or ephemeral messages to the user (success, error, loading states) MUST use the integrated `showToast` utility from `src/frontend/utils.ts`.

- **Do not** use `alert()`, `confirm()`, or custom floating divs for ephemeral feedback.
- **Import:** `import { showToast } from './utils';`
- **Usage:** `showToast('Message', 'success' | 'error' | 'warning' | 'info', durationMs)`
- The function returns a `dismiss` callback which is useful for hiding indefinite toasts (duration `0`) after a background async task finishes.

### i18n (Frontend)

Locale files live in `public/js/i18n/` as **plain JSON files** (e.g. `en.json`, `es.json`). They are NOT ES modules — do not use `export default`.

- **Supported locales:** `cn`, `de`, `en`, `es`, `fr`, `it`, `jp`, `nl`, `pl`, `pt`, `ru`, `tr`.
- **Loader:** `src/frontend/i18n.ts` handles dynamic locale loading via `fetch()` + `JSON.parse()`.
- **No Fallbacks:** NEVER use fallback strings with the `t()` function (e.g., avoid `t('key') || 'Fallback'`). Just use `t('key')`. Fallbacks make it harder to detect missing translations.
- **Consistency check:** Run `npm run i18n-manager CHECK` to detect missing keys across all locale files (compact one-line-per-key output). Exits with code `1` if issues are found (CI-safe).
- **NO ENGLISH PLACEHOLDERS IN OTHER LANGUAGES:** It is **EXPLICITLY FORBIDDEN** to use English text as placeholder translations in non‑English locale files. The i18n system already falls back to English when a key is missing; writing English strings in other locale files defeats the purpose of translation and makes missing keys invisible. Agents MUST generate proper translations for all supported languages—use machine translation if necessary, but never copy English strings verbatim into `de.json`, `es.json`, etc.

#### Adding a few keys (ADD mode — for 1–2 keys)

Use `ADD` for quick, small corrections — one or two keys at most.

```bash
npm run i18n-manager ADD ES register.confirmPassword="Confirmar contraseña"
npm run i18n-manager ADD DRY ES register.confirmPassword="Confirmar contraseña"
```

**Rules:**

- Locale codes are case-insensitive: `EN`, `ES`, `DE`, `FR`, `IT`, `JP`, `CN`, `NL`, `PL`, `PT`, `RU`, `TR`.
- Key format is dot-notation at any depth: `section.leaf` or `section.subsection.leaf`.
- If the key already exists in the target locale, it is skipped silently.
- After running, always verify with `npm run i18n-manager CHECK`.
- Run **one command per locale** — do not chain all locales in a single command.

#### Batch-filling missing translations (FILL mode — for 3+ keys)

When CHECK reports many missing keys, use `FILL` instead of `ADD`. FILL reads translations from a JSON file, eliminating shell escaping issues entirely.

**Step 1 — Get the missing keys with EN reference values**

```bash
npm run i18n-manager CHECK JSON
```

This writes a compact JSON file to `node_modules/.tmp/i18n-check.json` with one line per missing key (key, locales, EN value). Read it.

**Step 2 — Create a JSON file with all translations**

Write a JSON file to `./i18n-fill.json`. Format:

```json
{
	"de": {
		"dmca.modeSimple": "Einfacher Modus",
		"dmca.modeAdvanced": "Erweiterter Modus"
	},
	"it": {
		"blog.title": "Blog",
		"blog.subtitle": "Articoli e notizie di VRCStorage"
	}
}
```

**Step 3 — Run FILL**

```bash
npm run i18n-manager FILL ./i18n-fill.json
```

Add `DRY` before the path to preview without writing.

**Step 4 — Verify**

```bash
npm run i18n-manager CHECK
```

Repeat until output is `✔ All keys present in all locales.`

> [!IMPORTANT]
> **Always use FILL for batch operations (3+ keys).** Using ADD for many keys across many locales is error-prone due to shell escaping. FILL avoids this entirely because translations are written to a JSON file (no shell involved).

#### Inspecting keys (LIST mode)

```bash
npm run i18n-manager LIST ES register          # All keys in a section
npm run i18n-manager LIST ES register.success   # Specific leaf key
npm run i18n-manager LIST dmca.advanced         # Across ALL locales
npm run i18n-manager LIST ES                    # Top-level sections
```

LIST mode never writes files — it is always safe to run.

### R2 Media Lifecycle & Orphan Cleanup

Every file uploaded via `PUT /api/upload` (or the multipart flow) creates:

1. An object in **R2** (`BUCKET.put(r2Key, file)`) — the original, served via `/api/download/<r2_key>`.
2. A row in **`media`** (`uuid`, `r2_key`, `media_type`, `file_name`, `placeholder_blur`).
3. For images, the upload is also sent to `UPLOAD_QUEUE`. The `queue` handler (`src/http/queue.ts`) calls `MediaProcessingService.processImageVariants` (`src/services/media-processing-service.ts`), which generates 6 variants stored in `MEDIA_BUCKET` and 6 rows in `media_variants`, then writes the base64 blur placeholder to `media.placeholder_blur` (via `MediaVariantRepository`).

The `r2_key` is a random UUID. Original files remain accessible at `/api/download/<r2_key>`. Image variants are served via the **dedicated CDN Worker** (`src/cdn-worker.ts`, deployed separately):

```
GET https://cdn.vrcstorage.lat/{uuid}?res=[low|med|original]&format=[webp|png]
```

- **CDN Worker:** `src/cdn-worker.ts` — a standalone raw-fetch Worker (no Hono, no middleware) deployed via `wrangler-cdn.jsonc`. Custom domain `cdn.vrcstorage.lat` configured in Cloudflare dashboard (Workers & Pages → vrcstorage-cdn → Settings → Triggers → Custom Domains). The main API Worker has no CDN route.
- **Variants:** 6 files per image in `MEDIA_BUCKET` with keys `{uuid}/{res}.{format}`. Fallback to `BUCKET` original if variants are not yet ready (short cache TTL, `X-Variant-Status: pending` header).
- **Blur placeholder:** 8×8 WebP stored as a base64 data URI in `media.placeholder_blur`. Frontend reads it to display a blurred preview while the real image loads.
- **Backfill:** `POST /api/admin/media/generate-variants` re-queues all images that have no variants yet.

Frontend utilities in `src/frontend/utils.ts`:
- `mediaUrl(uuid, res?, format?)` — constructs a CDN URL.
- `progressiveImg(opts)` — renders an `<img>` with blur-up loading (uses `data-src` + `.lazy-img` class).
- `initLazyImages()` — wires an `IntersectionObserver` to replace blurred placeholders with real images. Called from `app.ts` on every `route-changed` event.

#### Orphan Cleanup

A scheduled cron job (`src/http/scheduled.ts`) runs daily and deletes any `media` record (+ its R2 objects) that is not referenced anywhere. It reuses `AdminService.cleanupOrphanedMedia`, the exact same logic exposed manually via `POST /api/admin/cleanup/orphaned-media` — single source of truth.

The cleanup only considers media inside a bounded **age window**: `created_at` between 24h and 48h ago (`AdminService.cutoff()` / `windowStart()`). The 24h lower bound is a grace period so freshly uploaded media isn't reaped before it's attached; the 48h upper bound keeps each run's workload to a fixed, recent slice instead of the whole ever-growing history. **Consequence:** media that stays orphaned for more than 48h is never auto-cleaned and must be removed manually. The dashboard stats and the manual endpoint use the same window, so their counts match what a run would delete.

When deleting an orphaned media record, the cleanup:
1. Deletes all variant objects from `MEDIA_BUCKET` (queried from `media_variants`).
2. Deletes the original from `BUCKET`.
3. Deletes the `media` row (cascades to `media_variants` via FK `ON DELETE CASCADE`).

A media record is considered **in use** if its `uuid` or `r2_key` appears in any of the following:

| Reference type                     | How tracked                                        |
| ---------------------------------- | -------------------------------------------------- |
| Resource thumbnail                 | `resources.thumbnail_uuid`                         |
| Resource reference image           | `resources.reference_image_uuid`                   |
| Resource gallery file              | `resource_n_media.media_uuid`                      |
| Blog post cover image              | `blog_posts.cover_image_uuid`                      |
| User avatar                        | `INSTR(users.avatar_url, m.r2_key)`                |
| Image embedded in resource comment | `INSTR(comments.text, m.r2_key)`                   |
| Image embedded in blog comment     | `INSTR(blog_comments.text, m.r2_key)`              |
| Image embedded in blog post body   | `INSTR(blog_posts.content, m.r2_key)`              |

> **Important:** Comments embed images as Markdown (`![alt](/api/download/<r2_key>)`). Because there is no FK between `media` and `comments`, the cleanup uses `INSTR` to scan comment text for the `r2_key`. This means:
>
> - Images in **active** comments are protected from deletion.
> - Once a comment is deleted, the image becomes orphaned and will be removed by a cron run — but only while it falls inside the 24h–48h age window (see above). An image whose media is already older than 48h when its last reference is removed will **not** be auto-cleaned.

#### Rules for modifying this system

- **Adding a new place where media can be referenced** (e.g. a new table with a text field that embeds images): add a corresponding `AND NOT EXISTS (SELECT 1 FROM <table> WHERE INSTR(<table>.<column>, m.r2_key) > 0)` clause to the shared `ORPHANED_MEDIA_PREDICATE` constant in `src/repositories/admin-repository.ts` — the single source used by the stats, listing, cleanup, and cron queries.
- **Adding a new FK reference to `media`** (e.g. a new table with a `media_uuid` column): add it to the `AND m.uuid NOT IN (...)` subquery in the same two places.
- **Deleting a record that owns a media file** (e.g. a blog post with a cover image): always explicitly delete the variant objects from `MEDIA_BUCKET`, the original from `BUCKET`, and the `media` row **before** deleting the parent record. Do not rely on the orphan cron for immediate cleanup of explicitly owned assets.
- **Never delete a `media` row** without also deleting its variants from `MEDIA_BUCKET`. The `media_variants` rows cascade automatically on `DELETE FROM media`, but the R2 objects in `MEDIA_BUCKET` do not — they must be deleted manually first.

### CSS Architecture

The stylesheet is modular. `public/style.css` is the **import manifest only** — it `@import`s from `public/style/`:

- Edit the appropriate module file (e.g., `public/style/wiki.css`) for targeted changes.
- Do not put new styles directly in `public/style.css`.
- When adding a new CSS file, register it in `public/style.css` and document it in the Project Structure above.

### Design System & Visual Style

> **This is the law.** Every UI element you create must follow these rules. Do not introduce your own colors, fonts, border-radius values, shadows, or spacing that deviate from what is described here. Consistency is non-negotiable.

#### Identity

VRCStorage uses a **flat, monochromatic, brutalist-adjacent** design language:

- No gradients.
- No rounded corners (`border-radius: 0` everywhere — not even `2px`, `4px`, or `8px`).
- Box shadows are highly restricted: **only square, solid-color shadows are allowed** (e.g., `box-shadow: 4px 4px 0 var(--shadow-hover);`). Soft, blurry shadows are forbidden.
- No Google Fonts or external typefaces. The font is **`monospace`** (system monospace stack), set globally on `body`.
- Flat, high-contrast borders define structure instead of soft depth effects.

#### Color Tokens

**Never hardcode colors.** All colors must come from the CSS variables defined in `public/style/base.css`. The full token set:

| Token            | Light     | Dark        | Purpose                     |
| ---------------- | --------- | ----------- | --------------------------- |
| `--bg-body`      | `#f0f0f0` | `#121212`   | Page background             |
| `--bg-nav`       | `#ddd`    | `#1e1e1e`   | Navbar background           |
| `--bg-card`      | `#fff`    | `#242424`   | Cards, panels, modal bodies |
| `--bg-input`     | `#fff`    | `#2d2d2d`   | Form inputs, textareas      |
| `--bg-hover`     | `#eee`    | `#333`      | Hover state backgrounds     |
| `--bg-dropdown`  | `#ddd`    | `#2d2d2d`   | Dropdown menus              |
| `--bg-sidebar`   | `#e0e0e0` | `#1e1e1e`   | Sidebar panels              |
| `--bg-code`      | `#f4f4f4` | `#2d2d2d`   | Code blocks                 |
| `--bg-quote`     | `#f9f9f9` | `#242424`   | Blockquotes                 |
| `--text-main`    | `#333`    | `#e0e0e0`   | Primary text                |
| `--text-muted`   | `#666`    | `#aaa`      | Secondary/helper text       |
| `--text-inverse` | `#fff`    | `#121212`   | Text on dark backgrounds    |
| `--text-link`    | `#000`    | `#4a90e2`   | Hyperlinks                  |
| `--border-color` | `#333`    | `#bbb`      | Primary borders             |
| `--border-light` | `#eee`    | `#444`      | Subtle dividers             |
| `--btn-bg`       | `#333`    | `#eeeeee88` | Default button background   |
| `--btn-text`     | `#fff`    | `#121212`   | Default button text         |
| `--btn-hover`    | `#555`    | `#ccc`      | Button hover background     |

**Exceptions allowed** (these specific hard-coded values exist in the codebase and are acceptable):

- `#dc3545` / `#c82333` — `.btn-danger` (destructive actions only).
- `#e74c3c` / `rgba(231, 76, 60, 0.1)` — `.btn-favorite.is-favorite` (heart/favorite active state).
- `#6c757d` / `#5a6268` — `.btn-square`, `.favorite-remove` (secondary muted actions).
- Toast semantic colors: green for success, red for error, amber for warning (see `base.css`).
- Any **accent color** used in admin stats (currently orange `#f5a623` or similar) must remain isolated to `admin.css`.

#### Typography

- **Font:** `monospace` (inherited from `body`, never override with `font-family` unless strictly necessary for code blocks).
- **Weights:** `normal` for body copy, `bold` for headings and nav labels. Do not use `font-weight: 500`, `600`, or `700` — only `bold`.
- **Sizes:** Use `rem` units. Common scale: `0.78rem` (fine print), `0.8rem` (small labels), `0.85rem` (secondary), `0.9rem` (form labels), `0.95rem`–`1rem` (body), `1.05rem`–`1.1rem` (section headings), `1.4rem`–`1.8rem` (page titles).
- **Line height:** `1.6`–`1.7` for paragraph text. `1` for single-line UI elements.

#### Border & Shadows

- **Thickness:** Always `2px solid var(--border-color)` for structural borders (cards, inputs, buttons, nav).
- **Light dividers:** `1px solid var(--border-color)` or `1px solid var(--border-light)` for internal row separators.
- **Border radius:** **`0` always.** No exceptions. Never write `border-radius`.
- Hover states on bordered elements must **not change the border width** — only the color. Changing thickness shifts layout. Use `border-color` on hover, not the `border` shorthand.

**Box-Shadow Rules:**
`box-shadow` is strictly controlled. Soft, blurry drop-shadows (e.g., `0 4px 10px rgba(0,0,0,0.1)`) are strictly forbidden.
You may ONLY use a **solid, square shadow** under the following precise conditions:

- **Allowed on:** Small cards and notes.
- **Forbidden on:** Buttons, large layout containers, and form inputs.
- **Usage example (Hover):**

```css
.card:hover {
	transform: translateY(-4px);
	box-shadow: 4px 4px 0 var(--shadow-hover);
}
```

#### Buttons

Use the existing button classes from `public/style/buttons.css`. Do not create new button variants without a strong reason.

| Class           | Use case                                    |
| --------------- | ------------------------------------------- |
| `.btn`          | Default filled button (dark bg, white text) |
| `.btn-outline`  | Secondary action (transparent bg, border)   |
| `.btn-favorite` | Inline toggle (transparent, with border)    |
| `.btn-danger`   | Destructive action (red)                    |
| `.btn-sm`       | Compact button for inline/table use         |
| `.btn-icon`     | Icon-only button (square, transparent)      |
| `.btn-square`   | Full-width block button (muted gray)        |

Rules:

- `font-family: inherit` is **mandatory** on every `<button>` or `.btn` — otherwise the browser overrides to its default sans-serif, breaking consistency.
- Never set a `border-radius` on buttons.
- Never change `font-size` beyond the documented scale.

#### Layout & Spacing

- **Max content width:** `950px` via `.container`.
- **Container padding:** `20px` desktop, `15px` mobile.
- **Standard gaps:** `8px`–`12px` for flex/grid gaps within components, `20px`–`30px` for section spacing.
- **Section spacing between cards:** `20px` margin.
- Use `padding: 24px 30px` for card/panel content areas (mobile: `18px 16px`).

#### Separators & Dividers

- The `<hr>` element renders as `2px solid var(--border-color)` with `20px` vertical margin — use it freely for section breaks.
- Within card stacks, use `border-bottom: none` on all but the last item to avoid double borders.

#### Interactive States

- **Hover backgrounds:** Always `var(--bg-hover)` — never a fixed hex.
- **Border hover:** Change `border-color` only, never the `border` shorthand (to avoid layout shift).
- **Focus:** Do not remove focus outlines without replacement. If you suppress `outline`, add a visible `border-color` change instead.
- **Transitions:** Keep them short — `0.2s ease` is the standard. Do not use `0.3s` or longer for hover effects on nav or buttons.

#### Overlays & Modals

Modals (e.g., version info, age gate) follow this pattern:

- Overlay: `position: fixed; inset: 0; background: rgba(0,0,0,0.7–0.85); z-index: 10000+`
- Modal box: `background: var(--bg-card); border: 2px solid var(--border-color);` — no `border-radius`, no excessive `box-shadow`.
- Header/footer separated by `1px solid var(--border-color)`.

#### What Is Strictly Forbidden

The following patterns have been introduced by external agents and must never appear again:

```css
/* ❌ FORBIDDEN */
border-radius: 4px; /* any border-radius value */
border-radius: 8px;
border-radius: 50%; /* even for circular elements — use square icon buttons */
font-family: 'Inter', ...; /* no external fonts */
font-family: sans-serif; /* unless inside code/pre blocks */
background: linear-gradient(...); /* no gradients */
box-shadow: 0 2px 8px...; /* no soft, blurry shadows! Only square, solid shadows (4px 4px 0 ...) are allowed, and never on layout containers */
color: #1a73e8; /* no hardcoded blues, greens, purples outside the allowed exceptions */
font-weight: 600; /* use bold or normal only */
border: 1px solid...; /* structural borders must be 2px */
border: 2px solid...; /* on hover, only change border-color, never re-declare border */
```

#### Quick Reference: Adding a New UI Component

1. Check if an existing class covers the need (`.btn`, `.btn-outline`, `.card`, etc.).
2. If a new CSS file is needed, create it in `public/style/` and register it in `public/style.css`.
3. Use only CSS variables from `base.css` for colors.
4. `border-radius: 0`, `font-family: inherit`, `border: 2px solid var(--border-color)`.
5. Hover states: change `background` to `var(--bg-hover)` and/or `border-color` — never border width.
6. Test in both light and dark mode (toggle via the 🌙 button in the nav).

### Wiki Documentation

The repository contains a multi-language wiki in `public/wiki/`.

- **Languages:** `cn`, `de`, `en`, `es`, `fr`, `it`, `jp`, `nl`, `pl`, `pt`, `ru`, `tr`.
- **Drafting:** Always draft in Spanish first (if applicable) or verify content thoroughly.
- **Routing:** The frontend (`WikiView.ts`) fetches `/wiki/{lang}/{topic}.md` based on `getCurrentLang()`. If the file does not exist, it **falls back to the English version**. If neither exists, an error message is shown. The view detects non-existent files by checking if Cloudflare returned the SPA shell (HTML) instead of Markdown.
- **Verification:** Prohibited to include unverified links. Verify all URLs before adding them.
- **Translations:** Request user confirmation before translating to all supported languages.
- **Article list (24 topics):** `home`, `faq`, `setup`, `poiyomi`, `vrcfury`, `modular-avatar`, `physbones`, `syncdances`, `vrcquesttools`, `gogoloco`, `gogoloco-nsfw`, `desktop-puppeteer`, `gesture-manager-emulator`, `action-menu`, `parameter`, `unityhub-error`, `gogoloco-remove`, `nsfw-essentials`, `sps`, `inside-view`, `pcs`, `haptics`, `dps`, `justkisssfx`.

#### Article Structure

Every wiki article follows a strict top-to-bottom structure. Deviating from this order is not allowed.

```markdown
# Article Title

<span class="badge ...">Category</span> [<span class="badge ...">Category</span> ...]

## What is it?

Short paragraph (2–4 sentences) explaining what the tool/concept is in plain language.
No lists here — prose only.

> [!NOTE] or > [!WARNING] (if immediately relevant at a glance)

## What is it for?

Bullet list of concrete use cases. Each item is a short, actionable phrase.

## [Main content sections]

The body of the article. Variable structure depending on topic type (see below).

## References

* Author. (Year). _Title_. Site Name. URL
```

**Rules:**
- The `# Title` is always `H1`. All subsequent sections are `H2` (`##`). Subsections are `H3` (`###`) and `H4` (`####`). Never skip levels.
- The badge line must come immediately after the `H1` title, before any other content.
- `## What is it?` and `## What is it for?` are **mandatory** on every article.
- `## References` is **mandatory** and always the last section.
- Do not add a table of contents — `WikiView.ts` does not render one.

#### Badge System

Badges classify the article's role. Use one or more `<span>` tags on the same line, separated by a space:

| Badge HTML | Meaning |
|---|---|
| `<span class="badge badge-blue">Logic</span>` | Explains a VRChat/Unity concept or system |
| `<span class="badge badge-blue">DEPENDENCY</span>` | A tool/shader that must be installed (Poiyomi, PhysBones, etc.) |
| `<span class="badge badge-blue">Optimization</span>` | Performance or memory optimization topic |
| `<span class="badge">TOOL</span>` | A standalone utility or workflow tool (no color modifier = default gray) |

Only use badge classes that already exist in `public/style/wiki.css`. Do not invent new badge colors.

#### Callout Alerts

Use GitHub-style alert blocks for contextual callouts. Supported types:

| Syntax | Use for |
|---|---|
| `> [!NOTE]` | Neutral supplementary information |
| `> [!TIP]` | Actionable advice or best practices |
| `> [!WARNING]` | Common mistakes or potentially destructive actions |
| `> [!CAUTION]` | Hard requirements that, if ignored, break things |
| `> [!IMPORTANT]` | Information the reader must not skip |

**Rules:**
- Place alerts inline within the section they relate to, not grouped at the end.
- Never use an alert as a replacement for a proper section — alerts are supplements, not structure.
- Do not nest alerts.

#### Tables

Use Markdown tables for structured comparisons, settings references, and multi-column data. Follow this pattern:

```markdown
| Column A | Column B | Column C |
| :------- | :------- | :------- |
| Value    | Value    | Value    |
```

- Left-align all columns (`:-------`) unless the data is numeric, in which case right-align (`:------:`).
- Bold the first column when it contains parameter or setting names (e.g., `| **Pull** | ... |`).
- Keep cell text concise — one short sentence max per cell.

#### Internal Links

All links between wiki articles MUST use the SPA query format:

```markdown
[VRCFury](/wiki?topic=vrcfury)
[Poiyomi](/wiki?topic=poiyomi)
```

Never use relative file paths (`../poiyomi.md`) or external URLs for internal wiki topics.

#### References Section

The `## References` section is always the last section of the article. Format each entry as:

```markdown
* LastName, F. (Year). _Title of the page_. Site Name. https://full-url
```

- Use `_italics_` for the title.
- List one URL per reference entry. Do not combine multiple URLs in one bullet.
- Only include sources that are actually cited or directly relevant to the article's content.
- **Never include unverified or fabricated URLs.** If you cannot confirm a URL is live, omit it.

#### Article Type Patterns

Different topic types follow different body structures after the mandatory opening sections.

**Dependency articles** (tools that must be installed — e.g., `poiyomi`, `physbones`):

```markdown
## What is it?
## What is it for?
## Where to get it?        ← download links (official site, GitHub, Patreon if applicable)
## How to install?         ← step-by-step, numbered list, one method per H3 subsection
## [Feature sections]      ← detailed breakdown of settings, components, or options
## Common Errors           ← symptom → cause → fix, as H3 per error
## References
```

**Tool articles** (workflow utilities — e.g., `modular-avatar`, `vrcfury`):

```markdown
## What is it?
## What is it for?
## Main features           ← comparison table or feature list
## Where to get it?
## How to install?
## How to use it?          ← practical walkthroughs with numbered steps
## Relationship with other tools  ← cross-references via internal links
## References
```

**Concept/Logic articles** (VRChat systems — e.g., `parameter`, `gogoloco`):

```markdown
## What is it?             ← definition + purpose
## [Core concept sections] ← tables, diagrams in prose, examples
## Advanced Uses           ← edge cases, integrations with other systems
## Limitations and Common Issues  ← numbered problem/consequence format
## Optimization and Tricks ← practical techniques
## Summary Table           ← quick-reference table at the end before References
## References
```

**Setup/Guide articles** (step-by-step processes — e.g., `setup`):

```markdown
## [Intro note if needed]
### Step 1: ...            ← H3 steps in sequence, each with a short title
### Step 2: ...
...
## References
```

Setup articles may omit `## What is it for?` if the title makes the purpose self-evident, but must still include `## References`.

#### Practical Examples

When an article includes code-like configuration steps (Unity inspector values, Animator settings), format them as numbered lists with inline `code` for field names and values:

```markdown
1. Set **Root Transform** to the hair root bone.
2. Set **Pull** to `0.3`–`0.5`.
3. Set **Gravity Falloff** to `0.8` to reduce gravity at rest.
```

Use bold for UI label names and inline code for values and field identifiers.

#### What NOT to do in wiki articles

- **No HTML other than badges.** Do not use `<div>`, `<table>`, `<img>`, or any other HTML tag. The wiki renderer only supports Markdown + the badge `<span>` pattern.
- **Do not translate tool names, Unity menu paths, code, or URLs.** These must remain in English across all language versions for discoverability (e.g., "Assets → Import Package → Custom Package..." stays as-is in every locale).
- **Do not add a "See also" section.** Use inline internal links within the relevant paragraph or section instead.
- **Do not use `H1` more than once.** The article title is the only `H1`.
- **Do not write vague callouts.** Every `> [!TIP]` or `> [!WARNING]` must contain specific, actionable information — not generic advice like "be careful with this setting."

### Adding a New Language (Complete Checklist)

When adding a new language to the project, follow **ALL** of these steps in order:

#### Step 1: Create the locale file (`public/js/i18n/<code>.json`)

1. Copy `public/js/i18n/en.json` as the template (it is the reference locale and always has the complete set of keys).
2. Translate **every** value to the target language. Keep all keys in English.
3. The file format is **plain JSON** — a single JSON object `{ "key": "value", ... }`. Do NOT use `export default` or any JS syntax.
4. DO NOT add or remove keys — maintain exact structural parity with `en.json`.

#### Step 2: Register the locale in the frontend loader

1. Open `src/frontend/i18n.ts`.
2. Add the new locale code to the loader's switch/map so it fetches `/js/i18n/<code>.json` at runtime.
3. Verify the loader correctly parses the JSON response.

#### Step 3: Add the language to the HTML selector

1. Open `public/index.html`.
2. Find the `<select id="lang-selector">` element.
3. Add an `<option value="xx">🇽🇽 XX</option>` entry with the appropriate flag emoji and uppercase code.

#### Step 4: Validate i18n sync

```bash
npm run i18n-manager CHECK
```

This must report **0 missing keys** and **0 orphan keys**. Fix any issues before proceeding.

#### Step 5: Create the wiki directory (`public/wiki/<code>/`)

1. Create the directory `public/wiki/<code>/`.
2. You must create **all 23 `.md` files** (listed above) translated to the target language.
3. Use the English (`public/wiki/en/`) articles as the reference source.
4. Preserve all Markdown formatting: badges, `> [!NOTE]` alerts, tables, internal links (`/wiki?topic=slug`), and the `## References` section.
5. **Do not translate**: tool names (Poiyomi, VRCFury, etc.), URLs, code snippets, or Unity menu paths (keep them in English for discoverability).

#### Step 6: Build the frontend

```bash
npm run build-frontend
```

This bundles the new locale import into `public/js/bundle.js`.

#### Step 7: Update this file (AGENTS.md)

- Update the **Supported locales** list in the `i18n (Frontend)` section.
- Update the **Languages** list in the `Wiki Documentation` section.
- Update the locale file listing (`.json` files) in the `Project Structure` section.

## Troubleshooting

- **Memory/CPU Limits (1102):** Worker execution exceeded limits. Optimize D1 queries or R2 stream handling.
- **Binding Errors:** Check `wrangler.jsonc` and ensure the variable name in code matches the binding name.
- **D1 Deadlocks:** SQLite in D1 is single-writer. Keep transactions short.
- **i18n out of sync:** Run `npm run i18n-manager CHECK` to identify which keys or locales are missing.
- **Bundle not updating:** Remember to run `npm run build-frontend` after editing files in `src/frontend/`. In dev mode, use `npm run dev` which runs esbuild in watch mode automatically.
- **Source maps in production:** The `src/tools/build-frontend.mjs` only emits source maps when the `--dev` flag is passed. Production deploys via `npm run deploy` never include `.map` files.
- **Orphaned media not cleaned up:** The cron only deletes media inside the 24h–48h age window (see "Orphan Cleanup"); anything older than 48h is out of scope by design and must be removed manually. If the media is inside the window, check that the new reference type is covered in the `ORPHANED_MEDIA_PREDICATE` in `src/repositories/admin-repository.ts` (the single predicate shared by the stats, listing, cleanup, and cron queries). If a new text column embeds images, add `AND NOT EXISTS (SELECT 1 FROM <table> WHERE INSTR(<table>.<column>, m.r2_key) > 0)`.