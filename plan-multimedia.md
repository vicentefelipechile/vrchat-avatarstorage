# Multimedia CDN Refactor Plan

**Goal:** Replace the current single-bucket image serving system with a dedicated media CDN that pre-generates 6 image variants at upload time and serves them via `cdn.vrcstorage.lat/media/{UUID}?res=[low|med|original]&format=[webp|png]`, while decoupling media images from the heavy-files bucket.

---

## Current State Analysis

| Aspect | Current Behavior |
| :--- | :--- |
| Upload | `PUT /api/upload` → R2 `BUCKET` (same bucket for images AND zip/rar/blend files) |
| Serving | `GET /api/download/:r2_key` → D1 lookup → R2 stream → browser |
| Processing | None. Files stored verbatim. No resizing, no format conversion. |
| Variants | None. One raw copy per upload. |
| Placeholder | None. Full-resolution image loaded from scratch on every render. |
| Bottleneck | All traffic — thumbnails, gallery images, archive downloads — hits the same R2 bucket and the same Worker route. |

**Key files involved:**
- [src/routes/uploads.ts](src/routes/uploads.ts) — upload handler
- [src/routes/downloads.ts](src/routes/downloads.ts) — download/serve handler
- [src/index.ts](src/index.ts) — queue handler (currently a no-op placeholder at line 423)
- [migrations/0001_initial.sql](migrations/0001_initial.sql) — `media` table schema
- [src/types.ts](src/types.ts) — `Media`, `UploadQueueMessage` types
- [wrangler.jsonc](wrangler.jsonc) — bindings config

---

## Target Architecture

```
USER UPLOADS IMAGE
        │
        ▼
PUT /api/upload → validate → store original in BUCKET (unchanged)
        │
        └─► UPLOAD_QUEUE.send({ media_uuid, r2_key, media_type })
                │
                ▼ (async, after response sent)
        Queue handler processes image:
          - Fetch original from BUCKET
          - Use Cloudflare Images binding to generate 6 variants
          - Generate 8×8 blur placeholder → base64 → stored in D1
          - Store 6 variant files in MEDIA_BUCKET
          - Insert rows into media_variants table

FRONTEND REQUEST
        │
        ▼
cdn.vrcstorage.lat/media/{UUID}?res=med&format=webp
        │
        ▼
GET /media/:uuid handler (new route, same Worker, custom domain)
  - Parse + validate res/format params
  - Build R2 key: "{uuid}/{res}.{format}"
  - Fetch from MEDIA_BUCKET
  - Return with: Content-Type, immutable cache headers
  - Fallback: if variants not ready, serve from BUCKET (short cache TTL)
```

**The two R2 buckets:**
| Binding | Bucket name | Purpose |
| :--- | :--- | :--- |
| `BUCKET` | `vrcstorage` | Originals + all non-image files (zip, rar, blend, mp4) |
| `MEDIA_BUCKET` | `vrcstorage-media` | Pre-processed image variants only |

---

## The 6 Variants

Each uploaded image produces exactly 6 files in `MEDIA_BUCKET`:

| # | `res` | `format` | Max Width | Quality | R2 Key Pattern | Use Case |
| :- | :---- | :------- | :-------- | :------ | :------------- | :------- |
| 1 | `low` | `webp` | 400px | 75 | `{uuid}/low.webp` | Card thumbnails, avatar grid |
| 2 | `low` | `png` | 400px | 75 | `{uuid}/low.png` | Fallback for low-res |
| 3 | `med` | `webp` | 800px | 85 | `{uuid}/med.webp` | Detail page inline view |
| 4 | `med` | `png` | 800px | 85 | `{uuid}/med.png` | Fallback for mid-res |
| 5 | `original` | `webp` | (original) | 90 | `{uuid}/original.webp` | Lightbox, full-view |
| 6 | `original` | `png` | (original) | 90 | `{uuid}/original.png` | Download fallback |

Plus one **placeholder** stored as a base64 data URI in D1:
- 8×8 pixels, WebP, quality 10
- Stored in `media.placeholder_blur` column
- Used as `img.src` while the real variant loads

**CDN URL defaults:** if `res` or `format` are omitted, default to `res=med&format=webp`.

---

## Prerequisites

Before implementation starts, verify the following:

1. **Cloudflare Images binding** is enabled on the account. This is a paid Cloudflare product. Check at: https://developers.cloudflare.com/images/transform-images/bindings/
   - If not enabled: fallback option is to use an open-source WASM image library (`@cf-wasm/photon`) inside the Worker, but this has CPU time implications and is less reliable. The plan assumes the Images binding is available.

2. **Create the new R2 bucket** `vrcstorage-media` in the Cloudflare dashboard before deploying. R2 bucket creation is not done via `wrangler.jsonc` alone — it must exist first.

3. **DNS record** `cdn.vrcstorage.lat` must be a CNAME to `vrchat-avatarstorage.workers.dev` (or the equivalent Worker route) before the custom domain route works in production.

---

## Phase 1 — Infrastructure & Bindings

### 1.1 Update `wrangler.jsonc`

Add the new R2 bucket binding, the Cloudflare Images binding, and the custom domain route:

```jsonc
"r2_buckets": [
    {
        "bucket_name": "vrcstorage",
        "binding": "BUCKET",
        "remote": false
    },
    {
        "bucket_name": "vrcstorage-media",
        "binding": "MEDIA_BUCKET",
        "remote": false
    }
],
"images": {
    "binding": "IMAGES"
},
"routes": [
    {
        "pattern": "cdn.vrcstorage.lat/media/*",
        "zone_name": "vrcstorage.lat"
    }
]
```

> **Note:** Consult the official docs before adding the `images` binding — the config key name may differ. Reference: https://developers.cloudflare.com/images/transform-images/bindings/

### 1.2 Regenerate Worker Types

After saving `wrangler.jsonc`, run:

```bash
npm run cf-typegen
```

This regenerates `worker-configuration.d.ts`. Verify that `MEDIA_BUCKET: R2Bucket` and `IMAGES: Fetcher` (or the correct Images binding type) appear in the `Env` interface.

---

## Phase 2 — Database Migration

Create `migrations/0012_media_variants.sql`:

```sql
-- ============================================================================
-- 0012: Media variants for CDN pre-processing
-- Adds placeholder_blur column to media and the media_variants table.
-- ============================================================================

-- Blur placeholder stored as base64 data URI (tiny 8×8 WebP, ~200 bytes)
ALTER TABLE media ADD COLUMN placeholder_blur TEXT;

-- Pre-processed image variants stored in vrcstorage-media R2 bucket
CREATE TABLE IF NOT EXISTS media_variants (
    media_uuid TEXT NOT NULL,
    res        TEXT NOT NULL CHECK(res IN ('low', 'med', 'original')),
    format     TEXT NOT NULL CHECK(format IN ('webp', 'png')),
    r2_key     TEXT NOT NULL UNIQUE,
    width      INTEGER,
    height     INTEGER,
    file_size  INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (media_uuid, res, format),
    FOREIGN KEY (media_uuid) REFERENCES media(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_variants_media  ON media_variants(media_uuid);
CREATE INDEX IF NOT EXISTS idx_media_variants_r2_key ON media_variants(r2_key);
```

Apply locally and to production:

```bash
# Local
npx wrangler d1 execute vrcstorage --local --file=migrations/0012_media_variants.sql

# Production
npx wrangler d1 execute vrcstorage --remote --file=migrations/0012_media_variants.sql
```

---

## Phase 3 — Type Definitions

Update `src/types.ts` — add the following types after the existing `MediaType`:

```typescript
export type MediaResolution = 'low' | 'med' | 'original';
export type MediaFormat     = 'webp' | 'png';

export interface MediaVariant {
    media_uuid: string;
    res:        MediaResolution;
    format:     MediaFormat;
    r2_key:     string;
    width:      number | null;
    height:     number | null;
    file_size:  number | null;
    created_at: number;
}
```

Also update the `Media` interface to include the new column:

```typescript
export interface Media {
    uuid:            string;
    r2_key:          string;
    media_type:      MediaType;
    file_name:       string;
    placeholder_blur: string | null;  // ← add this
    created_at:      number;
}
```

---

## Phase 4 — Queue Handler (Image Processing)

This is the core of the new system. The queue handler in `src/index.ts` currently has a no-op placeholder at line 423. Replace it with full image processing logic.

### 4.1 Variant Generation Logic

The handler fetches the original image from `BUCKET`, runs 6 transformations via the Cloudflare Images binding, stores each result in `MEDIA_BUCKET`, generates the blur placeholder, and writes everything to D1 in a single `batch()` call.

```typescript
// In src/index.ts — replace the queue handler stub

const MEDIA_VARIANTS: Array<{
    res: MediaResolution;
    format: MediaFormat;
    maxWidth?: number;
    quality: number;
}> = [
    { res: 'low',      format: 'webp', maxWidth: 400, quality: 75 },
    { res: 'low',      format: 'png',  maxWidth: 400, quality: 75 },
    { res: 'med',      format: 'webp', maxWidth: 800, quality: 85 },
    { res: 'med',      format: 'png',  maxWidth: 800, quality: 85 },
    { res: 'original', format: 'webp',               quality: 90 },
    { res: 'original', format: 'png',                quality: 90 },
];

async function processImageVariants(
    env: Env,
    media_uuid: string,
    r2_key: string,
): Promise<void> {
    const originalObj = await env.BUCKET.get(r2_key);
    if (!originalObj) throw new Error(`Original not found in BUCKET: ${r2_key}`);

    const originalBuffer = await originalObj.arrayBuffer();
    const statements: D1PreparedStatement[] = [];

    // Generate 6 variants
    for (const v of MEDIA_VARIANTS) {
        let transform = env.IMAGES.input(originalBuffer);
        if (v.maxWidth) {
            transform = transform.transform({ width: v.maxWidth, fit: 'scale-down' });
        }
        const response = await transform
            .output({ format: v.format, quality: v.quality })
            .response();

        const variantKey = `${media_uuid}/${v.res}.${v.format}`;
        const variantBuffer = await response.arrayBuffer();

        await env.MEDIA_BUCKET.put(variantKey, variantBuffer, {
            httpMetadata: { contentType: `image/${v.format}` },
        });

        statements.push(
            env.DB.prepare(
                `INSERT OR REPLACE INTO media_variants
                    (media_uuid, res, format, r2_key, file_size)
                 VALUES (?, ?, ?, ?, ?)`,
            ).bind(media_uuid, v.res, v.format, variantKey, variantBuffer.byteLength),
        );
    }

    // Generate blur placeholder (8×8, ultra-compressed)
    const placeholderResponse = await env.IMAGES.input(originalBuffer)
        .transform({ width: 8, height: 8, fit: 'cover' })
        .output({ format: 'webp', quality: 10 })
        .response();

    const placeholderBuffer = await placeholderResponse.arrayBuffer();
    const placeholderBase64 = btoa(String.fromCharCode(...new Uint8Array(placeholderBuffer)));

    statements.push(
        env.DB.prepare('UPDATE media SET placeholder_blur = ? WHERE uuid = ?').bind(
            `data:image/webp;base64,${placeholderBase64}`,
            media_uuid,
        ),
    );

    // Write everything in a single D1 batch
    await env.DB.batch(statements);
}

// Queue handler export:
queue: async (batch: MessageBatch<UploadQueueMessage>, env: Env) => {
    for (const msg of batch.messages) {
        const { media_uuid, r2_key, media_type, file_name } = msg.body;
        try {
            if (media_type === 'image') {
                await processImageVariants(env, media_uuid, r2_key);
                console.log(`[QUEUE] Image variants generated: ${media_uuid} (${file_name})`);
            } else {
                console.log(`[QUEUE] Non-image upload acknowledged: ${media_uuid} (${media_type})`);
            }
            msg.ack();
        } catch (e) {
            console.error(`[QUEUE] Failed to process ${r2_key}:`, e);
            msg.retry();
        }
    }
},
```

### 4.2 Important Notes on the Queue Handler

- **CPU time:** Generating 6 variants + a placeholder is a CPU-intensive operation for the queue consumer. Cloudflare Queue consumers run as separate Worker invocations with their own CPU budget (up to 30 seconds on paid plans). If CPU limits are hit, `msg.retry()` will re-queue the job.
- **Memory:** The original image is loaded into memory twice (once as a buffer for parallel variant generation). The 128MB Worker memory limit is generous for images up to 20MB, but monitor this.
- **D1 batch:** Using `env.DB.batch()` ensures all 6 variant rows + the placeholder update are committed atomically. If D1 fails, the R2 objects are already written — the orphan cleanup cron will NOT remove them because the media row still exists. Re-queued messages will overwrite existing R2 objects (idempotent `put`) and use `INSERT OR REPLACE` in D1.

---

## Phase 5 — CDN Serving Route

Create a new file `src/routes/media-cdn.ts`:

```typescript
// =========================================================================================================
// MEDIA CDN ROUTES
// =========================================================================================================
// Serves pre-processed image variants from MEDIA_BUCKET.
// Mounted at /media, served via cdn.vrcstorage.lat custom domain.
// URL: /media/:uuid?res=[low|med|original]&format=[webp|png]
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import type { MediaResolution, MediaFormat, MediaVariant } from '../types';

// =========================================================================================================
// Helpers
// =========================================================================================================

const VALID_RES    = new Set<MediaResolution>(['low', 'med', 'original']);
const VALID_FORMAT = new Set<MediaFormat>(['webp', 'png']);

// =========================================================================================================
// Endpoints
// =========================================================================================================

const mediaCdn = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /media/:uuid
// Serves an image variant from MEDIA_BUCKET.
// Query params:
//   res    = low | med | original  (default: med)
//   format = webp | png            (default: webp)
// Falls back to the original in BUCKET if variants are not yet generated.
// =========================================================================================================

mediaCdn.get('/:uuid', async (c) => {
    const uuid = c.req.param('uuid');

    const resParam    = (c.req.query('res')    ?? 'med') as MediaResolution;
    const formatParam = (c.req.query('format') ?? 'webp') as MediaFormat;

    if (!VALID_RES.has(resParam))    return c.json({ error: 'Invalid res parameter' }, 400);
    if (!VALID_FORMAT.has(formatParam)) return c.json({ error: 'Invalid format parameter' }, 400);

    // Try to serve the pre-processed variant
    const variantKey = `${uuid}/${resParam}.${formatParam}`;
    const object = await c.env.MEDIA_BUCKET.get(variantKey);

    if (object) {
        const headers = new Headers();
        headers.set('Content-Type', `image/${formatParam}`);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('ETag', object.httpEtag);
        return new Response(object.body, { headers });
    }

    // Variants not yet generated — fall back to the original from BUCKET
    const media = await c.env.DB.prepare('SELECT r2_key FROM media WHERE uuid = ?')
        .bind(uuid)
        .first<{ r2_key: string }>();

    if (!media) return c.json({ error: 'Not found' }, 404);

    const fallback = await c.env.BUCKET.get(media.r2_key);
    if (!fallback) return c.json({ error: 'Not found' }, 404);

    const fallbackHeaders = new Headers();
    fallback.writeHttpMetadata(fallbackHeaders);
    fallbackHeaders.set('X-Content-Type-Options', 'nosniff');
    // Short cache: variants may become available soon
    fallbackHeaders.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    fallbackHeaders.set('X-Variant-Status', 'pending');

    return new Response(fallback.body, { headers: fallbackHeaders });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default mediaCdn;
```

### 5.1 Mount the route in `src/index.ts`

Add the route mount alongside the existing routes. The `/media` prefix must match the custom domain pattern:

```typescript
import mediaCdn from './routes/media-cdn';

// In the existing route registration block:
app.route('/media', mediaCdn);
```

---

## Phase 6 — Orphan Cleanup Update

The existing orphan cleanup in `src/index.ts` (`cleanupOrphanedMedia`) and the admin endpoint in `src/routes/admin.ts` delete orphaned `media` rows and their R2 objects from `BUCKET`. Now that image media also has variants in `MEDIA_BUCKET`, the cleanup must also delete those.

### 6.1 Update `cleanupOrphanedMedia` in `src/index.ts`

Before deleting the R2 object and media row, also:
1. Query `media_variants` for all `r2_key` values for each orphaned `media_uuid`
2. Delete each from `MEDIA_BUCKET`

The `ON DELETE CASCADE` on `media_variants.media_uuid` will remove the D1 rows automatically when the `media` row is deleted.

Pseudocode for the updated cleanup:

```typescript
// For each orphaned media record:
//   1. Fetch variant keys from media_variants
//   2. Delete each from MEDIA_BUCKET
//   3. Delete original from BUCKET
//   4. DELETE FROM media WHERE uuid = ?  (cascades to media_variants)

const variants = await env.DB.prepare(
    'SELECT r2_key FROM media_variants WHERE media_uuid = ?',
).bind(orphan.uuid).all<{ r2_key: string }>();

await Promise.all(variants.results.map((v) => env.MEDIA_BUCKET.delete(v.r2_key)));
await env.BUCKET.delete(orphan.r2_key);
await env.DB.prepare('DELETE FROM media WHERE uuid = ?').bind(orphan.uuid).run();
```

### 6.2 Update `src/routes/admin.ts`

The admin `POST /api/admin/cleanup/orphaned-media` endpoint performs the same cleanup logic manually. Apply the same `MEDIA_BUCKET` deletion logic there.

---

## Phase 7 — Frontend Integration

### 7.1 Utility function in `src/frontend/utils.ts`

Add a helper that constructs CDN URLs and renders progressive image HTML:

```typescript
const CDN_BASE = 'https://cdn.vrcstorage.lat';

export function mediaUrl(uuid: string, res: 'low' | 'med' | 'original' = 'med', format: 'webp' | 'png' = 'webp'): string {
    return `${CDN_BASE}/media/${uuid}?res=${res}&format=${format}`;
}

export function progressiveImg(opts: {
    uuid: string;
    placeholder: string | null;
    res?: 'low' | 'med' | 'original';
    alt?: string;
    className?: string;
}): string {
    const { uuid, placeholder, res = 'med', alt = '', className = '' } = opts;
    const src    = placeholder ?? mediaUrl(uuid, res);
    const dataSrc = mediaUrl(uuid, res);
    const blurStyle = placeholder ? 'filter:blur(8px);transition:filter 0.4s ease' : '';
    return `<img
        src="${src}"
        data-src="${dataSrc}"
        alt="${alt}"
        class="lazy-img${className ? ' ' + className : ''}"
        style="${blurStyle}"
        loading="lazy"
    />`;
}
```

### 7.2 IntersectionObserver for lazy loading

Add this to `src/frontend/utils.ts` (call once on page load from `app.ts`):

```typescript
export function initLazyImages(): void {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const img = entry.target as HTMLImageElement;
            const dataSrc = img.dataset.src;
            if (!dataSrc) return;
            img.onload = () => { img.style.filter = ''; };
            img.src = dataSrc;
            observer.unobserve(img);
        });
    }, { rootMargin: '200px' });

    document.querySelectorAll('img.lazy-img[data-src]').forEach((img) => observer.observe(img));
}
```

### 7.3 Update existing view files

Replace all `/api/download/${r2_key}` image references in the frontend views with the new `mediaUrl()` / `progressiveImg()` patterns. Views to update:

| View file | What to change |
| :--- | :--- |
| [src/frontend/views/AvatarsView.ts](src/frontend/views/AvatarsView.ts) | Avatar card thumbnail: use `res=low` |
| [src/frontend/views/ItemView.ts](src/frontend/views/ItemView.ts) | Gallery thumbnails: `res=low`; lightbox: `res=original` |
| [src/frontend/views/ClothesView.ts](src/frontend/views/ClothesView.ts) | Card thumbnails: `res=low` |
| [src/frontend/views/AssetsView.ts](src/frontend/views/AssetsView.ts) | Card thumbnails: `res=low` |
| [src/frontend/views/AuthorView.ts](src/frontend/views/AuthorView.ts) | Author avatar: `res=med` |
| [src/frontend/views/SettingsView.ts](src/frontend/views/SettingsView.ts) | User avatar preview: `res=med` |
| [src/frontend/views/HomeView.ts](src/frontend/views/HomeView.ts) | Resource cards: `res=low` |
| [src/frontend/ad-components.ts](src/frontend/ad-components.ts) | Ad banner/card images: `res=med` |

> **Keep the existing `/api/download/:r2_key` route intact** for backward compatibility and for serving non-image files (zip, rar, blend, mp4). Only image rendering in views should switch to the new CDN URL.

### 7.4 API responses that return `r2_key` for images

Several API endpoints return `thumbnail_key` or `r2_key` fields for images (e.g. `GET /api/avatars`, `GET /api/resources/:uuid`). Two options:

- **Option A:** Continue returning `r2_key` and have the frontend construct the CDN URL using `mediaUrl(media_uuid, ...)`.
- **Option B:** Return `media_uuid` instead of (or alongside) `r2_key` in API responses so the frontend can use `mediaUrl()` directly without knowing the raw R2 key.

**Recommendation:** Option B — expose `media_uuid` in listing API responses. This decouples the frontend from R2 internals. Update the relevant SELECT queries in `src/routes/avatars.ts`, `src/routes/resources.ts`, `src/routes/clothes.ts`, `src/routes/assets.ts` to include `m.uuid as media_uuid` where they currently join `media`.

---

## Phase 8 — Admin Backfill Endpoint (Optional but Recommended)

Existing images uploaded before this system was deployed will have no variants in `MEDIA_BUCKET` and no `placeholder_blur`. Add a one-shot admin endpoint to backfill them:

```
POST /api/admin/media/generate-variants
```

Logic:
1. Query all `media` rows where `media_type = 'image'` and `uuid NOT IN (SELECT DISTINCT media_uuid FROM media_variants)`
2. For each, send a message to `UPLOAD_QUEUE` with the existing `media_uuid` and `r2_key`
3. Return count of enqueued jobs

This leverages the same queue handler built in Phase 4, making the backfill path identical to the live upload path.

```typescript
// In src/routes/admin.ts

admin.post('/media/generate-variants', async (c) => {
    const user = await getAuthUser(c);
    if (!user?.is_admin) return c.json({ error: 'Forbidden' }, 403);

    const rows = await c.env.DB.prepare(
        `SELECT uuid, r2_key FROM media
          WHERE media_type = 'image'
            AND uuid NOT IN (SELECT DISTINCT media_uuid FROM media_variants)`,
    ).all<{ uuid: string; r2_key: string }>();

    for (const row of rows.results) {
        await c.env.UPLOAD_QUEUE.send({
            media_uuid: row.uuid,
            r2_key:     row.r2_key,
            media_type: 'image',
            file_name:  'backfill',
            uploaded_at: Date.now(),
        });
    }

    return c.json({ enqueued: rows.results.length });
});
```

---

## Implementation Order & Checklist

```
Phase 1 — Infrastructure
  [ ] Create R2 bucket vrcstorage-media in Cloudflare dashboard
  [ ] Add MEDIA_BUCKET binding to wrangler.jsonc
  [ ] Add Cloudflare Images binding to wrangler.jsonc
  [ ] Add cdn.vrcstorage.lat DNS CNAME record
  [ ] Add /media/* route pattern for custom domain in wrangler.jsonc
  [ ] Run: npm run cf-typegen
  [ ] Verify MEDIA_BUCKET and IMAGES appear in worker-configuration.d.ts

Phase 2 — Database
  [ ] Write migrations/0012_media_variants.sql
  [ ] Apply to local D1
  [ ] Apply to production D1

Phase 3 — Types
  [ ] Add MediaResolution, MediaFormat, MediaVariant to src/types.ts
  [ ] Add placeholder_blur to Media interface

Phase 4 — Queue Handler
  [ ] Write processImageVariants() helper in src/index.ts
  [ ] Define MEDIA_VARIANTS constant
  [ ] Replace the no-op queue stub with full processing logic
  [ ] Test locally with a real image upload (npm run dev)

Phase 5 — CDN Route
  [ ] Create src/routes/media-cdn.ts
  [ ] Mount it at /media in src/index.ts
  [ ] Verify ?res and ?format validation
  [ ] Verify fallback behavior when variants are not yet ready

Phase 6 — Orphan Cleanup
  [ ] Update cleanupOrphanedMedia in src/index.ts to delete from MEDIA_BUCKET
  [ ] Update the admin cleanup endpoint in src/routes/admin.ts

Phase 7 — Frontend
  [ ] Add mediaUrl() and progressiveImg() to src/frontend/utils.ts
  [ ] Add initLazyImages() to src/frontend/utils.ts
  [ ] Call initLazyImages() from src/frontend/app.ts on each navigation
  [ ] Update all 8+ view files to use new CDN URLs
  [ ] Update API responses to expose media_uuid where needed
  [ ] Run: npm run build-frontend
  [ ] Test progressive loading in browser

Phase 8 — Backfill (after deploy)
  [ ] Write POST /api/admin/media/generate-variants endpoint
  [ ] Deploy to production
  [ ] Trigger backfill via admin panel or curl
  [ ] Monitor queue processing in Cloudflare dashboard
```

---

## Edge Cases & Known Limitations

| Scenario | Handling |
| :--- | :--- |
| Variant not yet ready when first request arrives | CDN route falls back to original from BUCKET with short cache TTL (60s). Next request after queue processes will hit the variant. |
| Queue processing fails (CPU limit, Images API error) | `msg.retry()` re-queues. Max retries and dead-letter queue can be configured in the Cloudflare dashboard. |
| GIF uploads | The Images binding supports GIF input. The `original` variant will be a static frame (WebP does not animate the same way as GIF). Consider filtering GIFs out of variant generation or serving them via the original download route for animated previews. |
| Videos | Not affected. Videos stay in `BUCKET` and are served via the existing `/api/download/:r2_key` route unchanged. |
| User downloads a file | If the user navigates to `cdn.vrcstorage.lat/media/{uuid}?format=png`, they receive a WebP or PNG-converted file. Acceptable per requirements. The original (unchanged) file remains downloadable via `/api/download/:r2_key`. |
| Existing media before this deploy | No variants exist. CDN falls back to original. Backfill endpoint (Phase 8) queues regeneration for all existing images. |
| `placeholder_blur` not populated yet | Frontend must handle `null` gracefully — `progressiveImg()` falls back to loading the real URL directly without blur effect. |
| Large originals (up to 20MB) | The queue consumer reads the entire file into an ArrayBuffer. At 128MB Worker memory, this supports images up to ~15-20MB. Monitor queue worker memory via Cloudflare Observability. |

---

## File Change Summary

| File | Change Type | Description |
| :--- | :--- | :--- |
| `wrangler.jsonc` | Modify | Add `MEDIA_BUCKET`, `IMAGES` binding, custom domain route |
| `worker-configuration.d.ts` | Auto-generated | Re-run `cf-typegen` |
| `migrations/0012_media_variants.sql` | New | `placeholder_blur` column + `media_variants` table |
| `src/types.ts` | Modify | Add `MediaResolution`, `MediaFormat`, `MediaVariant`; update `Media` |
| `src/index.ts` | Modify | Implement `processImageVariants()`; replace queue stub |
| `src/routes/media-cdn.ts` | New | CDN serving route |
| `src/routes/admin.ts` | Modify | Backfill endpoint + MEDIA_BUCKET deletion in cleanup |
| `src/frontend/utils.ts` | Modify | Add `mediaUrl()`, `progressiveImg()`, `initLazyImages()` |
| `src/frontend/app.ts` | Modify | Call `initLazyImages()` on each navigation |
| `src/frontend/views/*.ts` (8 files) | Modify | Replace `/api/download/` image refs with `mediaUrl()` |
| `src/frontend/ad-components.ts` | Modify | Ad image refs → CDN URLs |
| `src/routes/avatars.ts` (and similar) | Modify | Expose `media_uuid` in listing responses |
