# Agent Guide: VRCStorage

This guide is for agentic coding agents (like yourself) operating in the VRCStorage repository. It defines the project's technical stack, coding standards, and common operations to ensure consistency and reliability.

## Communication Style

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

### Route File Structure

Every file in `src/routes/` follows a strict structural pattern using 105-`=` section banners. Deviating from this pattern is not allowed.

```typescript
// =========================================================================================================
// MODULE NAME ROUTES
// =========================================================================================================
// Brief description of what this module handles.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import ...

// =========================================================================================================
// Helpers                          ← only present if helper functions exist
// =========================================================================================================

function helperFn() { ... }

// =========================================================================================================
// Endpoints
// =========================================================================================================

const routerName = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/route/:param
// One-line description of what this endpoint does.
// =========================================================================================================

routerName.get('/:param', async (c) => {
    // implementation
});

// =========================================================================================================
// Export
// =========================================================================================================

export default routerName;
```

**Rules:**
- The 105-`=` banner is **mandatory** before every section and every endpoint handler.
- Auth guards use the **early-return pattern** (no curly braces): `if (!authUser) return c.json({ error: 'Unauthorized' }, 401);`
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
    utils.ts              # General frontend utilities (incl. showToast)
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
    pages.css             # Footer, TOS, DMCA, version info modal styles
    age-gate.css          # Age verification overlay modal styles
    blog.css              # Blog-specific styles
    wiki.css              # Wiki page styles
    admin.css             # Admin panel styles
  sw.js                   # Service worker
  js/
    bundle.js             # Compiled frontend bundle (output of esbuild, DO NOT EDIT)
    i18n/                 # Locale files (ES module, `export default { ... }`)
      cn.js  de.js  en.js  es.js  fr.js  it.js
      jp.js  nl.js  pl.js  pt.js  ru.js  tr.js
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
                          # New migrations follow the pattern: NNNN_description.sql

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
- **Schema:** All migration files live in `migrations/`. The initial schema is `migrations/0001_initial.sql`. New migrations follow the sequential naming pattern `migrations/NNNN_description.sql` (e.g. `0008_new_feature.sql`). Never edit an already-applied migration; always create a new file.
- **D1 API:** Use `c.env.DB.prepare(query)`.
- **Transactions:** Cloudflare D1 supports transactions via `db.batch()`.
- **Primary Keys:** Most tables use UUIDs (v4) as primary keys.
- **Timestamps:** Usually stored as Unix timestamps (seconds or milliseconds). Check `src/types.ts` for each entity.

### R2 Storage
- **Public URL:** R2 buckets are not public by default. Use `src/routes/downloads.ts` or `src/routes/uploads.ts` for access.
- **Keys:** R2 keys are random UUIDs generated at upload time (e.g. `crypto.randomUUID()`). The key is stored in `media.r2_key` and forms part of all download URLs: `/api/download/<r2_key>`.
- **Never delete R2 objects directly** without also deleting the corresponding `media` row. Always pair `BUCKET.delete(r2_key)` + `DELETE FROM media WHERE uuid = ?`.

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

### Frontend Utilities & Feedback
All visual feedback or ephemeral messages to the user (success, error, loading states) MUST use the integrated `showToast` utility from `src/frontend/utils.ts`. 
- **Do not** use `alert()`, `confirm()`, or custom floating divs for ephemeral feedback.
- **Import:** `import { showToast } from './utils';`
- **Usage:** `showToast('Message', 'success' | 'error' | 'warning' | 'info', durationMs)`
- The function returns a `dismiss` callback which is useful for hiding indefinite toasts (duration `0`) after a background async task finishes.

### i18n (Frontend)
Locale files live in `public/js/i18n/` as ES modules (`export default { ... }`).
- **Supported locales:** `cn`, `de`, `en`, `es`, `fr`, `it`, `jp`, `nl`, `pl`, `pt`, `ru`, `tr`.
- **Loader:** `src/frontend/i18n.ts` handles dynamic locale loading.
- **No Fallbacks:** NEVER use fallback strings with the `t()` function (e.g., avoid `t('key') || 'Fallback'`). Just use `t('key')`. Fallbacks make it harder to detect missing translations.
- **Consistency check:** Run `npm run check-i18n` to detect missing keys, orphan keys, or missing categories across all locale files. The script exits with code `1` if issues are found (CI-safe).

### R2 Media Lifecycle & Orphan Cleanup

Every file uploaded via `PUT /api/upload` (or the multipart flow) creates:
1. An object in **R2** (`BUCKET.put(r2Key, file)`)
2. A row in **`media`** (`uuid`, `r2_key`, `media_type`, `file_name`)

The `r2_key` is a random UUID and appears in all download URLs: `/api/download/<r2_key>`.

#### Orphan Cleanup

A scheduled cron job (`cleanupOrphanedMedia` in `src/index.ts`) runs daily and deletes any `media` record (+ its R2 object) that is not referenced anywhere. The same logic is exposed manually via `POST /api/admin/cleanup/orphaned-media`.

A media record is considered **in use** if its `uuid` or `r2_key` appears in any of the following:

| Reference type | How tracked |
|---|---|
| Resource thumbnail | `resources.thumbnail_uuid` |
| Resource reference image | `resources.reference_image_uuid` |
| Resource gallery file | `resource_n_media.media_uuid` |
| Blog post cover image | `blog_posts.cover_image_uuid` |
| User avatar | `INSTR(users.avatar_url, m.r2_key)` |
| Image embedded in resource comment | `INSTR(comments.text, m.r2_key)` |
| Image embedded in blog comment | `INSTR(blog_comments.text, m.r2_key)` |
| Image embedded in blog post body | `INSTR(blog_posts.content, m.r2_key)` |

> **Important:** Comments embed images as Markdown (`![alt](/api/download/<r2_key>)`). Because there is no FK between `media` and `comments`, the cleanup uses `INSTR` to scan comment text for the `r2_key`. This means:
> - Images in **active** comments are protected from deletion.
> - Once a comment is deleted, the image becomes orphaned and will be removed by the **next** cron run (within 24 hours).

#### Rules for modifying this system

- **Adding a new place where media can be referenced** (e.g. a new table with a text field that embeds images): add a corresponding `AND NOT EXISTS (SELECT 1 FROM <table> WHERE INSTR(<table>.<column>, m.r2_key) > 0)` clause to **both** the cron query in `src/index.ts` and the admin endpoint queries in `src/routes/admin.ts`.
- **Adding a new FK reference to `media`** (e.g. a new table with a `media_uuid` column): add it to the `AND m.uuid NOT IN (...)` subquery in the same two files.
- **Deleting a record that owns a media file** (e.g. a blog post with a cover image): always explicitly delete the R2 object and the `media` row **before** deleting the parent record. Do not rely on the orphan cron for immediate cleanup of explicitly owned assets.

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
- No box shadows for layout elements (only allowed for overlays like modals).
- No Google Fonts or external typefaces. The font is **`monospace`** (system monospace stack), set globally on `body`.
- Flat, high-contrast borders define structure instead of shadows or depth effects.

#### Color Tokens

**Never hardcode colors.** All colors must come from the CSS variables defined in `public/style/base.css`. The full token set:

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--bg-body` | `#f0f0f0` | `#121212` | Page background |
| `--bg-nav` | `#ddd` | `#1e1e1e` | Navbar background |
| `--bg-card` | `#fff` | `#242424` | Cards, panels, modal bodies |
| `--bg-input` | `#fff` | `#2d2d2d` | Form inputs, textareas |
| `--bg-hover` | `#eee` | `#333` | Hover state backgrounds |
| `--bg-dropdown` | `#ddd` | `#2d2d2d` | Dropdown menus |
| `--bg-sidebar` | `#e0e0e0` | `#1e1e1e` | Sidebar panels |
| `--bg-code` | `#f4f4f4` | `#2d2d2d` | Code blocks |
| `--bg-quote` | `#f9f9f9` | `#242424` | Blockquotes |
| `--text-main` | `#333` | `#e0e0e0` | Primary text |
| `--text-muted` | `#666` | `#aaa` | Secondary/helper text |
| `--text-inverse` | `#fff` | `#121212` | Text on dark backgrounds |
| `--text-link` | `#000` | `#4a90e2` | Hyperlinks |
| `--border-color` | `#333` | `#bbb` | Primary borders |
| `--border-light` | `#eee` | `#444` | Subtle dividers |
| `--btn-bg` | `#333` | `#eeeeee88` | Default button background |
| `--btn-text` | `#fff` | `#121212` | Default button text |
| `--btn-hover` | `#555` | `#ccc` | Button hover background |

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

#### Borders

- **Thickness:** Always `2px solid var(--border-color)` for structural borders (cards, inputs, buttons, nav).
- **Light dividers:** `1px solid var(--border-color)` or `1px solid var(--border-light)` for internal row separators.
- **Border radius:** **`0` always.** No exceptions. Never write `border-radius`.
- Hover states on bordered elements must **not change the border width** — only the color. Changing thickness shifts layout. Use `border-color` on hover, not the `border` shorthand.

#### Buttons

Use the existing button classes from `public/style/buttons.css`. Do not create new button variants without a strong reason.

| Class | Use case |
|---|---|
| `.btn` | Default filled button (dark bg, white text) |
| `.btn-outline` | Secondary action (transparent bg, border) |
| `.btn-favorite` | Inline toggle (transparent, with border) |
| `.btn-danger` | Destructive action (red) |
| `.btn-sm` | Compact button for inline/table use |
| `.btn-icon` | Icon-only button (square, transparent) |
| `.btn-square` | Full-width block button (muted gray) |

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
border-radius: 4px;         /* any border-radius value */
border-radius: 8px;
border-radius: 50%;         /* even for circular elements — use square icon buttons */
font-family: 'Inter', ...;  /* no external fonts */
font-family: sans-serif;    /* unless inside code/pre blocks */
background: linear-gradient(...);  /* no gradients */
box-shadow: 0 2px 8px ...;  /* no shadows on cards or layout elements */
color: #1a73e8;             /* no hardcoded blues, greens, purples outside the allowed exceptions */
font-weight: 600;           /* use bold or normal only */
border: 1px solid ...;      /* structural borders must be 2px */
border: 2px solid ...;      /* on hover, only change border-color, never re-declare border */
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
- **Formatting:**
    - Use badges: `<span class="badge badge-blue">Logic</span>`.
    - Use GitHub alerts: `> [!NOTE]`, `> [!TIP]`, etc.
    - Internal links MUST use `/wiki?topic=slug` format.
- **References:** Use a single `## References` section. Format: `* Author. (Date). Title. Site. URL`.
- **Verification:** Prohibited to include unverified links. Verify URLs before adding them.
- **Translations:** Request user confirmation before translating to all supported languages.
- **Article list (23 topics):** `home`, `faq`, `setup`, `poiyomi`, `vrcfury`, `modular-avatar`, `physbones`, `syncdances`, `vrcquesttools`, `gogoloco`, `gogoloco-nsfw`, `desktop-puppeteer`, `gesture-manager-emulator`, `action-menu`, `parameter`, `unityhub-error`, `nsfw-essentials`, `sps`, `inside-view`, `pcs`, `haptics`, `dps`, `justkisssfx`.

### Adding a New Language (Complete Checklist)

When adding a new language to the project, follow **ALL** of these steps in order:

#### Step 1: Create the locale file (`public/js/i18n/<code>.js`)
1. Copy `public/js/i18n/en.js` as the template (it is the reference locale and always has the complete set of keys).
2. Translate **every** value to the target language. Keep all keys in English.
3. The file format is an ES module: `export default { ... }`.
4. DO NOT add or remove keys — maintain exact structural parity with `en.js`.

#### Step 2: Register the locale in the frontend loader
1. Open `src/frontend/i18n.ts`.
2. Add an `import` for the new locale file (e.g., `import xx from '../../public/js/i18n/xx.js';`).
3. Add the new code to the `translations` object (e.g., `{ ..., xx }`).

#### Step 3: Add the language to the HTML selector
1. Open `public/index.html`.
2. Find the `<select id="lang-selector">` element.
3. Add an `<option value="xx">🇽🇽 XX</option>` entry with the appropriate flag emoji and uppercase code.

#### Step 4: Validate i18n sync
```bash
npm run check-i18n
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
- Update the locale file listing in the `Project Structure` section.

## Implementation Checklist for Agents

When implementing a new feature or fixing a bug, verify the following:

1. [ ] **Input Validation:** Are all inputs (body, query, params) validated with Zod?
2. [ ] **Sanitization:** Are string inputs sanitized to prevent XSS?
3. [ ] **Type Safety:** Are `src/types.ts`, `frontend/types.ts`, and `worker-configuration.d.ts` updated and used?
4. [ ] **Security:** Is the endpoint protected by `getAuthUser` or appropriate middleware?
5. [ ] **Rate Limiting:** Is a `rateLimit` middleware applied if the endpoint is public?
6. [ ] **Caching:** Does the KV cache need to be cleared/updated after this change (e.g., `VRCSTORAGE_KV.delete(...)`)?
7. [ ] **Database:** Are queries using prepared statements and `.bind(...)`?
8. [ ] **Schema Migration:** If the DB schema changed, did you create a new `migrations/NNNN_description.sql` file following the sequential numbering convention?
9. [ ] **i18n:** If new translatable strings were added to the frontend, did you update all locale files in `public/js/i18n/` and run `npm run check-i18n`?
10. [ ] **Frontend Build:** After editing anything in `src/frontend/`, did you rebuild with `npm run build-frontend`?
11. [ ] **Typegen:** Did you run `npm run cf-typegen` if you changed `wrangler.jsonc`?
12. [ ] **R2 Media Cleanup:** If your change deletes a record that directly owns a media file (e.g. a blog post with a cover image), did you explicitly delete the R2 object and `media` row **before** the parent DELETE? If you added a new table or column that can embed media via Markdown, did you add the corresponding `INSTR` guard to **both** `src/index.ts` (cron) and `src/routes/admin.ts` (manual cleanup)?

## Troubleshooting

- **Memory/CPU Limits (1102):** Worker execution exceeded limits. Optimize D1 queries or R2 stream handling.
- **Binding Errors:** Check `wrangler.jsonc` and ensure the variable name in code matches the binding name.
- **D1 Deadlocks:** SQLite in D1 is single-writer. Keep transactions short.
- **i18n out of sync:** Run `npm run check-i18n` to identify which keys or locales are missing.
- **Bundle not updating:** Remember to run `npm run build-frontend` after editing files in `src/frontend/`. In dev mode, use `npm run dev` which runs esbuild in watch mode automatically.
- **Source maps in production:** The `src/frontend/build-frontend.mjs` only emits source maps when the `--dev` flag is passed. Production deploys via `npm run deploy` never include `.map` files.
- **Orphaned media not cleaned up:** The cron only deletes files older than 24 hours. Check that the new reference type is covered in both the `src/index.ts` cron query and the `src/routes/admin.ts` endpoint. If a new text column embeds images, add `AND NOT EXISTS (SELECT 1 FROM <table> WHERE INSTR(<table>.<column>, m.r2_key) > 0)` to both queries.
