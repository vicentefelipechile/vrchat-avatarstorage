# VRCStorage — Media Bucket Separation & Images Binding Integration

**Status:** Planning  
**Target stack:** Cloudflare Workers · Hono · D1 · R2 · Cloudflare Images Binding  
**Language:** TypeScript

---

## Context & Problem Statement

The current architecture stores every file — heavy binary assets (`.unitypackage`, zip archives) and lightweight visual media (thumbnails, reference images, banners, avatars) — in a single R2 bucket (`vrcstorage`, bound as `BUCKET`). The `media` table in D1 holds metadata for all of them without distinction.

As the platform scales, this creates two compounding problems:

1. **Bandwidth & latency:** Every image is served at original resolution and original format directly from R2. No resizing, no format negotiation (WebP/AVIF), no compression pipeline. Page load times degrade linearly with catalog size.
2. **Structural coupling:** Asset files and media files share a namespace, a binding, and a metadata table. This makes it impossible to apply different CDN policies, access controls, or transformation pipelines to each type.

**Goal:** Split the single bucket into two purpose-specific ones and introduce the Cloudflare Images binding to generate and serve optimized variants (thumbnails, previews, low-quality placeholders) at request time, with responses cached via the Cache API.

---

## Architecture: Before vs After

### Before

```
Upload → BUCKET (vrcstorage) → R2
                ↓
         media table (D1)
         ← all types mixed →
         thumbnails, banners, unitypackages, zips
```

### After

```
Upload (image) → MEDIA_BUCKET (vrcstorage-media) → R2
                       ↓
              media table (D1) — images only
                       ↓
              IMAGES binding → transform on-demand
                       ↓
              Cache API (Workers) → serve cached variant

Upload (asset) → BUCKET (vrcstorage-assets) → R2
                       ↓
              asset_files table (D1) — binary files only
```

---

## Key Technical Decisions

### 1. Images Binding vs. Transform via URL

The **Images binding** (`env.IMAGES`) is the correct choice here, not URL-based image transformations. Reasons:

- Images are stored in a **private R2 bucket** — they have no public URL. The binding accepts a `ReadableStream` directly from `MEDIA_BUCKET.get()`, so no public access is needed.
- The binding supports `.transform()` for resize/format, `.output()` for AVIF/WebP, and `.info()` to inspect dimensions — everything needed for thumbnails and previews.
- **Billing note:** Every binding call counts as one unique transformation. Cloudflare's Free plan includes 5,000 unique transformations/month. Once you exceed this, new unique transformations fail with a `9422` error — existing cached ones keep serving. On the Paid plan: $0.50 per 1,000 unique transformations beyond the first 5,000. **Caching is not automatic** — you must implement it manually via the Cache API. This is mandatory, not optional.

### 2. Cache Strategy

Since the Images binding has no automatic cache, every transformed variant must be stored using the Workers Cache API after the first generation. Cache key format:

```
https://vrcstorage.lat/media/{uuid}/{variant}
```

Variants to define:

| Variant name | Use case | Width | Format | Quality |
|---|---|---|---|---|
| `thumbnail` | Resource cards in feed | 400px | WebP | 80 |
| `preview` | Resource detail page | 900px | WebP | 85 |
| `avatar` | User profile picture | 128px | WebP | 85 |
| `banner` | Community ads sidebar | 300px | WebP | 80 |
| `original` | Admin view / download | — | original | — |

### 3. Database Split

The current `media` table is a flat registry with no type discrimination. The split introduces:

- `media` → renamed to `image_media`, stores only visual files (thumbnails, reference images, banners, avatars, blog covers). Points to `MEDIA_BUCKET`.
- `asset_files` → new table for binary downloads (`.unitypackage`, zip, etc.). Points to `BUCKET`.

All existing foreign keys (`thumbnail_uuid`, `reference_image_uuid`, `cover_image_uuid`, `banner_media_uuid`, `card_media_uuid`) remain pointing to `image_media`. The `resource_n_media` join table is unaffected structurally.

---

## Work Plan

### Phase 0 — Prerequisites

**0.1 — Enable the Images binding on your Cloudflare account**

The Images binding requires at least the **Images Free plan** activated on your account. Go to Cloudflare Dashboard → Images → Get Started. Free tier includes 5,000 unique transformations/month. No storage in Cloudflare Images is needed — you keep files in R2.

**0.2 — Inventory all upload paths in the codebase**

Before touching anything, identify every place that writes to `BUCKET`:

- Upload routes (media uploads: thumbnails, reference images, user avatars, blog covers, ad banners/cards)
- Upload routes (asset file uploads: the actual downloadable `.unitypackage` / zip files)
- The `cleanupOrphanedMedia` cron in `src/index.ts`
- The manual cleanup in `src/routes/admin.ts`

Document which uploads are images and which are binary assets. This list drives the migration.

---

### Phase 1 — Infrastructure Setup

**1.1 — Create the new media bucket**

```bash
npx wrangler r2 bucket create vrcstorage-media
```

**1.2 — Update `wrangler.jsonc`**

Add the new media bucket binding and the Images binding:

```jsonc
"r2_buckets": [
  {
    // Existing: now used only for binary asset files
    "bucket_name": "vrcstorage",
    "binding": "BUCKET",
    "remote": false
  },
  {
    // New: dedicated to image/visual media
    "bucket_name": "vrcstorage-media",
    "binding": "MEDIA_BUCKET",
    "remote": false
  }
],
"images": {
  "binding": "IMAGES"
}
```

**1.3 — Regenerate types**

```bash
npm run cf-typegen
```

The `Env` interface in `worker-configuration.d.ts` will pick up `MEDIA_BUCKET: R2Bucket` and `IMAGES: Fetcher` automatically. Update `src/types.ts` if you have a manual `Env` definition there.

---

### Phase 2 — Database Schema Migration

**2.1 — Migration file: `0012_media_split.sql`**

This is the core schema change. It does three things:

1. Rename `media` → `image_media` to reflect its new purpose.
2. Add an `r2_bucket` discriminator column to `image_media` (for the transition period, defaults to `'media'`; after full migration, always `'media_bucket'`).
3. Create the new `asset_files` table for binary downloads.

```sql
-- ============================================================
-- 0012_media_split.sql
-- Split media table: image_media (visual) vs asset_files (binary)
-- ============================================================

-- Rename the existing media table
ALTER TABLE media RENAME TO image_media;

-- Add a bucket discriminator for zero-downtime transition
-- 'legacy' = still in the old combined bucket (needs migration)
-- 'media'  = already in MEDIA_BUCKET
ALTER TABLE image_media ADD COLUMN r2_bucket TEXT NOT NULL DEFAULT 'legacy';

-- New table for downloadable binary asset files
CREATE TABLE IF NOT EXISTS asset_files (
    uuid        TEXT PRIMARY KEY,
    r2_key      TEXT NOT NULL,
    file_name   TEXT NOT NULL,
    file_size   INTEGER,
    mime_type   TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_asset_files_r2_key ON asset_files(r2_key);
```

**2.2 — Migration file: `0013_asset_file_links.sql`**

Link `asset_files` to resources:

```sql
-- ============================================================
-- 0013_asset_file_links.sql
-- Add asset file FK to resources
-- ============================================================

ALTER TABLE resources ADD COLUMN asset_file_uuid TEXT REFERENCES asset_files(uuid) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_asset_file ON resources(asset_file_uuid);
```

> **Note:** All `resource_n_media`, `thumbnail_uuid`, `reference_image_uuid`, `cover_image_uuid` foreign keys remain pointing at `image_media` (the renamed table). D1/SQLite preserves FKs across `ALTER TABLE RENAME`.

---

### Phase 3 — Image Serving Layer

**3.1 — Create `src/lib/image-transform.ts`**

Central module for the Images binding. Handles: fetch from `MEDIA_BUCKET`, transform, cache read/write.

```typescript
// =========================================================================================================
// IMAGE TRANSFORM
// =========================================================================================================
// Wrapper around the Cloudflare Images binding.
// Transforms images stored in MEDIA_BUCKET and caches results via the Cache API.
// =========================================================================================================

export type ImageVariant = 'thumbnail' | 'preview' | 'avatar' | 'banner';

interface VariantConfig {
	width: number;
	quality: number;
}

const VARIANT_CONFIG: Record<ImageVariant, VariantConfig> = {
	thumbnail: { width: 400, quality: 80 },
	preview:   { width: 900, quality: 85 },
	avatar:    { width: 128, quality: 85 },
	banner:    { width: 300, quality: 80 },
};

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Returns a transformed image Response for the given R2 key and variant.
 * Checks the Cache API first; generates and caches on miss.
 */
export async function serveImage(
	env: Env,
	r2Key: string,
	variant: ImageVariant,
	cacheKey: string,
): Promise<Response> {
	const cache = caches.default;
	const cacheRequest = new Request(cacheKey);

	// Cache hit
	const cached = await cache.match(cacheRequest);
	if (cached) return cached;

	// Fetch from MEDIA_BUCKET
	const object = await env.MEDIA_BUCKET.get(r2Key);
	if (!object) return new Response('Not Found', { status: 404 });

	const config = VARIANT_CONFIG[variant];

	// Transform via Images binding
	const result = await env.IMAGES.input(object.body)
		.transform({ width: config.width })
		.output({ format: 'image/webp', quality: config.quality });

	const transformed = result.response();

	// Clone and cache
	const toCache = new Response(transformed.body, {
		headers: {
			'Content-Type': 'image/webp',
			'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
		},
	});

	await cache.put(cacheRequest, toCache.clone());
	return toCache;
}
```

**3.2 — Create `src/routes/media.ts`**

New route module that exposes image variants publicly:

```
GET /media/:uuid/:variant   → serves transformed image
GET /media/:uuid            → serves original (admin only, or signed URL)
```

The route reads `image_media` from D1 to resolve the `r2_key`, then calls `serveImage()`.

**3.3 — Update `src/index.ts`**

Mount the new router:

```typescript
app.route('/media', mediaRouter);
```

---

### Phase 4 — Upload Pipeline Changes

**4.1 — Image uploads**

All routes that upload visual media (thumbnail, reference image, user avatar, blog cover, ad banner, ad card) must:

1. Write the file to `MEDIA_BUCKET` (not `BUCKET`).
2. Insert into `image_media` with `r2_bucket = 'media'`.
3. Invalidate any existing cache entries for that UUID after update operations.

**4.2 — Asset file uploads**

Routes that handle the actual downloadable resource file must:

1. Write the file to `BUCKET` (unchanged).
2. Insert into `asset_files` (not `image_media`).
3. Update `resources.asset_file_uuid` to point to the new `asset_files` row.

**4.3 — NSFW detection (UPLOAD_QUEUE consumer)**

The queue consumer that runs `@cf/falconsai/nsfw_image_detection` reads from the existing bucket. After the migration, it must read from `MEDIA_BUCKET` for image files. Update the consumer to check `image_media.r2_bucket` and route the read accordingly during the transition period.

---

### Phase 5 — Cleanup & Orphan Detection

**5.1 — Update the cron (`cleanupOrphanedMedia` in `src/index.ts`)**

The cron currently deletes files from `BUCKET` that have no references in `media`. After the migration:

- Add a second sweep for `MEDIA_BUCKET` against `image_media`.
- Keep the original sweep for `BUCKET` against `asset_files`.
- The `INSTR` guards for Markdown-embedded images (blog posts, ad pages) must still reference `image_media.r2_key`.

**5.2 — Update admin manual cleanup (`src/routes/admin.ts`)**

Same split as above for the manual trigger endpoint.

---

### Phase 6 — Production Data Migration

This phase moves existing image files from the old `vrcstorage` bucket into `vrcstorage-media`.

**Strategy: lazy migration via `r2_bucket` discriminator**

Rather than a bulk copy that requires downtime, use the discriminator column added in migration `0012`:

1. All existing rows in `image_media` have `r2_bucket = 'legacy'` (default).
2. All new uploads set `r2_bucket = 'media'`.
3. The `serveImage()` function checks `r2_bucket`:
   - `'media'` → read from `MEDIA_BUCKET`
   - `'legacy'` → read from `BUCKET` (old path, still works)
4. On any read of a `'legacy'` entry, optionally trigger a background copy to `MEDIA_BUCKET` and update the row to `'media'`. This is a **lazy copy-on-read** pattern.

**Alternatively**, run a one-shot migration script via a Workers Cron or an admin endpoint that iterates all `image_media` rows with `r2_bucket = 'legacy'`, copies each file from `BUCKET` to `MEDIA_BUCKET`, and updates the row. Do this during a low-traffic window.

**Do not delete files from `BUCKET` until `r2_bucket = 'legacy'` count reaches zero.**

---

### Phase 7 — Frontend Updates

**7.1 — Replace all direct R2 URLs with `/media/:uuid/:variant` paths**

Any frontend code constructing image URLs from `r2_key` or a raw bucket URL must be updated to use the new serving route. This affects:

- Resource feed cards → use `thumbnail` variant
- Resource detail page → use `preview` variant
- User profile pictures → use `avatar` variant
- Community ad banners → use `banner` variant
- Community ad cards → use `thumbnail` variant

**7.2 — Add `loading="lazy"` and `decoding="async"` to all `<img>` tags**

With optimized WebP variants now available, lazy loading becomes significantly more effective. Update all image rendering helpers in `src/frontend/`.

**7.3 — Rebuild frontend**

```bash
npm run build-frontend
```

---

### Phase 8 — Validation & Rollout

**8.1 — Local testing**

```bash
npx wrangler dev
```

The Images binding in local dev mode supports `width`, `height`, `rotate`, and `format` only. For full fidelity:

```bash
npx wrangler dev --remote
```

Note: `--remote` counts against your live transformation quota.

**8.2 — Checklist before deploying to production**

- [ ] `wrangler.jsonc` has both `MEDIA_BUCKET` and `IMAGES` bindings
- [ ] `npm run cf-typegen` was run after updating `wrangler.jsonc`
- [ ] Migration files `0012` and `0013` are committed and applied
- [ ] All upload routes write images to `MEDIA_BUCKET`
- [ ] All upload routes write binary assets to `BUCKET`
- [ ] `cleanupOrphanedMedia` cron covers both buckets
- [ ] Admin cleanup route covers both buckets
- [ ] NSFW detection queue consumer reads from the correct bucket
- [ ] Cache invalidation is called on image update/delete
- [ ] Frontend uses `/media/:uuid/:variant` URLs, not raw R2 keys
- [ ] `npm run build-frontend` was run
- [ ] Images Free plan is activated in the Cloudflare dashboard (or Paid if >5k/month transformations expected)

**8.3 — Deploy**

```bash
npm run deploy
```

**8.4 — Monitor**

After deploying, monitor:

- Cloudflare Images dashboard → transformation count (watch the 5,000/month Free limit)
- Cache hit rate via Workers observability (already enabled in `wrangler.jsonc`)
- R2 request count on `vrcstorage` should drop as legacy files are migrated

---

## Billing Estimate

| Volume (unique image variants/month) | Transformations | Estimated cost |
|---|---|---|
| < 5,000 | Free | $0.00 |
| 10,000 | 5,000 paid | $2.50 |
| 50,000 | 45,000 paid | $22.50 |

Unique transformation = same image + same variant = counted only once per month. Repeated requests for a cached variant do not count. **This is why the Cache API implementation in Phase 3 is critical** — without it, every page request generates a new billable transformation.

R2 costs for `vrcstorage-media` follow standard R2 pricing: first 10 GB/month storage free, Class B reads (10M/month) free. For a typical VRCStorage load, the R2 cost delta from adding a second bucket is negligible.

---

## File Change Summary

| File | Action |
|---|---|
| `wrangler.jsonc` | Add `MEDIA_BUCKET` R2 binding and `IMAGES` binding |
| `worker-configuration.d.ts` | Auto-generated via `cf-typegen` |
| `migrations/0012_media_split.sql` | Rename `media` → `image_media`, add `r2_bucket` column, create `asset_files` |
| `migrations/0013_asset_file_links.sql` | Add `asset_file_uuid` FK to `resources` |
| `src/lib/image-transform.ts` | New — Images binding wrapper with Cache API |
| `src/routes/media.ts` | New — `/media/:uuid/:variant` serving endpoint |
| `src/routes/upload.ts` | Update image uploads → `MEDIA_BUCKET`, asset uploads → `BUCKET` |
| `src/routes/admin.ts` | Update orphan cleanup to cover both buckets |
| `src/index.ts` | Mount `mediaRouter`, update cron to sweep both buckets |
| `src/types.ts` | Add `ImageVariant` type, update `Env` if manually defined |
| `src/frontend/**` | Replace raw R2 URLs with `/media/:uuid/:variant` |
