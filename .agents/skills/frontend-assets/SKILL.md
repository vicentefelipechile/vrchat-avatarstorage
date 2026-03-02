---
name: Frontend Assets (Cloudflare Workers ASSETS)
description: Guidelines for managing, serving, and optimizing static frontend assets in VRCStorage using Cloudflare Workers Assets binding.
---

# Frontend Assets — Cloudflare Workers ASSETS

> [!IMPORTANT]
> Assets are served by Cloudflare's edge network directly. The Worker only handles `/api/*` routes. Don't serve static files through Worker code.

---

## 1. Structure

```
public/
├── index.html            # Main app shell (SPA entry)
├── css/
│   └── style.css
├── js/
│   ├── app.js            # Main JS bundle
│   ├── views/
│   │   ├── HomeView.js
│   │   ├── AvatarView.js
│   │   ├── WikiView.js
│   │   └── ...
│   └── i18n.js           # Translations
├── wiki/
│   ├── es/               # Spanish wiki markdown files
│   ├── en/               # English wiki markdown files
│   └── ...
└── img/
    └── ...
```

---

## 2. wrangler.jsonc Configuration

```jsonc
{
  "assets": {
    "directory": "./public",
    "binding": "ASSETS"
  }
}
```

With this config:
- Files in `public/` are served automatically by Cloudflare's edge
- The Worker handles everything under `/api/*`
- All other paths (`/`, `/wiki`, etc.) fall through to `public/index.html` (SPA routing)

---

## 3. SPA Routing (Catch-All)

To make SPA routing work (so `/wiki?topic=getting-started` serves `index.html`):

```typescript
// src/index.ts — at the END, after all API routes
app.get('*', async (c) => {
  // Let Cloudflare Assets handle non-API routes
  return c.env.ASSETS.fetch(c.req.raw)
})
```

> [!NOTE]
> This catch-all must be the LAST route registered. API routes must be registered before it.

---

## 4. Cache Headers for Assets

Static assets should be cached aggressively. Configure cache headers in the Worker for static file responses:

```typescript
// If serving assets manually through Worker (not recommended, but sometimes needed)
app.get('/img/*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw)
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return newResponse
})
```

For most assets, Cloudflare handles caching automatically. Only override when you need custom rules.

### Recommended Cache-Control Values

| Asset type | Cache-Control |
|-----------|---------------|
| JS/CSS with hash in filename | `public, max-age=31536000, immutable` |
| Images | `public, max-age=86400` (1 day) |
| HTML files | `public, max-age=0, must-revalidate` |
| Wiki markdown | `public, max-age=300` (5 min) |

---

## 5. Versioning / Cache Busting

For JS and CSS files, append a version query param or use hashed filenames:

```html
<!-- ❌ BAD — users get stale JS forever -->
<script src="/js/app.js"></script>

<!-- ✅ GOOD — change version string on each deploy -->
<script src="/js/app.js?v=2026-02-25"></script>
```

Or use content-hashed filenames (better):
```
/js/app.a3f9c1.js
```

---

## 6. i18n File Pattern

The `public/js/i18n.js` file must follow this structure:

```javascript
const i18n = {
  es: {
    nav: { home: 'Inicio', wiki: 'Wiki', search: 'Buscar' },
    wiki: {
      gettingStarted: { title: 'Guía de Inicio' },
      // ... other topics
    }
  },
  en: {
    nav: { home: 'Home', wiki: 'Wiki', search: 'Search' },
    wiki: {
      gettingStarted: { title: 'Getting Started' },
    }
  }
}
```

**Rules:**
- Spanish (`es`) is always the primary language — add here first
- Keys use `camelCase`
- Nested by section: `wiki.topicSlug.title`
- Never delete keys — only add or update

---

## 7. WikiView.js Pattern

When adding a new wiki topic, update both `WikiView.js` AND `i18n.js`:

```javascript
// public/js/views/WikiView.js
const WIKI_TOPICS = [
  { id: 'getting-started', label: 'wiki.gettingStarted.title' },
  { id: 'avatar-upload',   label: 'wiki.avatarUpload.title' },
  // Add new topics here
]
```

The `id` must match the filename in `public/wiki/{lang}/{id}.md`.

---

## 8. Performance Rules for 100+ Concurrent Users

- **Never serve assets through Worker code if avoidable** — let Cloudflare's edge CDN do it
- **Minify JS and CSS** — less bandwidth, faster load
- **Use `Cache-Control: immutable`** for versioned assets — prevents revalidation requests
- **HTML should have `max-age=0`** — always fresh, triggers new asset fetches when version changes
- **Lazy load JS views** — don't bundle everything into one giant file

---

## 9. Anti-Patterns (DO NOT DO)

| Anti-pattern | Why | Correct way |
|---|---|---|
| Serving static files through Worker fetch handler | Uses CPU time unnecessarily | Use ASSETS binding |
| No cache-busting on JS/CSS | Users get stale app after deploy | Add `?v=` or content hash |
| Hardcoded strings in JS (no i18n) | Hard to maintain multilingual | Use `i18n.js` for all user-visible strings |
| Putting API keys in frontend JS | Exposed to everyone | Never — keep secrets in Worker env |
| Unbounded imports in `index.html` | Slow initial load | Lazy load non-critical JS |
| Missing SPA catch-all route | 404 on direct URL access | Add `app.get('*', ...)` last |

---

## 10. References

- [Cloudflare Workers Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cache-Control MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [Wiki Documentation Skill](./../wiki-docs/SKILL.md)
- [API Routes Skill](./../api-routes/SKILL.md)
