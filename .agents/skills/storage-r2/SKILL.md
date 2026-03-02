---
name: Storage — Cloudflare R2
description: Guidelines for uploading, retrieving, and managing files in VRCStorage using Cloudflare R2. Covers the uploads/downloads route split.
---

# Storage — Cloudflare R2

> [!IMPORTANT]
> R2 is object storage — not a filesystem. Objects are immutable once written. Plan keys carefully.
> Uploads and downloads are handled by **separate route files**: `src/routes/uploads.ts` (write) and `src/routes/downloads.ts` (read).

---

## 1. Route Responsibility Split

| Task | File | Path |
|------|------|------|
| Upload a file to R2 | `src/routes/uploads.ts` | `POST /api/uploads` |
| Download / serve a file from R2 | `src/routes/downloads.ts` | `GET /api/downloads/:id` |
| File type/size validation | `src/helpers/file-validation.ts` | — |
| Image validation (dimensions, format) | `src/helpers/image-validator.ts` | — |

Never write R2 logic directly in other route files (resources, users, etc.). Always go through `uploads.ts` / `downloads.ts`.

---

## 2. What Goes in R2

| Content | Stored in R2 | Key pattern |
|---------|-------------|-------------|
| Avatar `.vrca` files | Yes | `resources/{id}/file.vrca` |
| Preview images | Yes | `resources/{id}/preview.webp` |
| User profile pictures | Yes | `users/{userId}/avatar.webp` |
| Wiki images | Yes | `wiki/{slug}/{filename}` |
| Database records | No | Use D1 |
| Session data | No | Use KV |

---

## 3. Key Naming Convention

```
{resource}/{id}/{filename}
```

Examples:
```
resources/res_abc123/file.vrca
resources/res_abc123/preview.webp
users/usr_xyz789/avatar.webp
wiki/getting-started/banner.webp
```

**Rules:**
- Always lowercase
- Use `-` in slugs, except for the ID prefix (`res_`, `usr_`)
- Never use spaces or special characters
- Never use user-supplied filenames as the R2 key — always derive the key from the resource ID

---

## 4. File Validation

Before any R2 write, validate using the dedicated helpers. Never write inline MIME checks.

```typescript
// src/routes/uploads.ts
import { validateFile }  from '../helpers/file-validation'
import { validateImage } from '../helpers/image-validator'

const formData = await c.req.formData()
const file = formData.get('file') as File | null

if (!file) return c.json({ error: { code: 'NO_FILE' } }, 400)

const fileError = validateFile(file)
if (fileError) return c.json({ error: { code: fileError } }, 400)

// For preview images:
const preview = formData.get('preview') as File | null
if (preview) {
  const imgError = validateImage(preview)
  if (imgError) return c.json({ error: { code: imgError } }, 400)
}
```

---

## 5. Upload Pattern (uploads.ts)

```typescript
// src/routes/uploads.ts
router.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  // 1. Validate using helpers
  if (!file) return c.json({ error: { code: 'NO_FILE' } }, 400)
  const fileError = validateFile(file)
  if (fileError) return c.json({ error: { code: fileError } }, 400)

  // 2. Generate key from new ID (never from user input)
  const id  = generateId('res') // e.g. res_abc123
  const key = `resources/${id}/file.vrca`

  // 3. Upload to R2
  const buffer = await file.arrayBuffer()
  await c.env.STORAGE.put(key, buffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedAt: Date.now().toString() }
  })

  // 4. Save record to D1
  await createResource(c.env.DB, { id, r2Key: key, uploaderId: user.id })

  return c.json({ data: { id } }, 201)
})
```

---

## 6. Download / Serve Pattern (downloads.ts)

> [!NOTE]
> Stream directly from R2. Never load the full file into memory with `arrayBuffer()` for large downloads.

```typescript
// src/routes/downloads.ts
router.get('/:id', async (c) => {
  const id = c.req.param('id')

  // 1. Validate ID
  if (!id || id.length > 64) return c.json({ error: { code: 'INVALID_ID' } }, 400)

  // 2. Get D1 record (checks existence and access)
  const resource = await getResourceById(c.env.DB, id)
  if (!resource) return c.json({ error: { code: 'NOT_FOUND' } }, 404)

  // 3. Fetch from R2
  const object = await c.env.STORAGE.get(resource.r2_key)
  if (!object) return c.json({ error: { code: 'FILE_NOT_FOUND' } }, 404)

  // 4. Stream response
  return new Response(object.body, {
    headers: {
      'Content-Type':   object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Length': object.size.toString(),
      'Cache-Control':  'public, max-age=86400',
      'ETag':           object.httpEtag,
    }
  })
})
```

---

## 7. Cleanup Pattern (Delete Resource)

When deleting a resource, ALWAYS delete both the D1 record AND all R2 objects in parallel:

```typescript
await Promise.all([
  c.env.STORAGE.delete(resource.r2_key),
  c.env.STORAGE.delete(resource.preview_key),
  deleteResourceRecord(c.env.DB, id)
])
```

> [!WARNING]
> Never delete only the D1 record. Orphaned R2 objects waste storage and money.

---

## 8. Performance Rules for 100+ Concurrent Users

- **Stream large files** — use `object.body` directly, don't `arrayBuffer()` for downloads
- **Validate before reading the body** — check Content-Length header first to reject oversized uploads early
- **Parallel cleanup** — use `Promise.all` when deleting file + preview + DB record
- **Never use `STORAGE.list()`** in a request path — it's slow; store the R2 key in D1 and look it up there
- **Cache preview URLs in KV** — for frequently accessed previews, store the R2 key in KV (TTL 1h). See cache-kv SKILL.

---

## 9. Anti-Patterns (DO NOT DO)

| Anti-pattern | Why | Correct way |
|---|---|---|
| Using user-supplied filenames as R2 keys | Path traversal risk | Generate key from resource ID |
| Inline file validation in route handlers | Duplicates `helpers/` logic | Use `file-validation.ts` and `image-validator.ts` |
| `arrayBuffer()` for streaming large downloads | Memory spike in Worker | Stream `object.body` directly |
| Deleting D1 record without deleting R2 | Orphaned files | Delete both in `Promise.all` |
| `STORAGE.list()` to find files | Very slow | Store R2 key in D1 column |
| R2 logic in routes other than uploads/downloads | Violates route responsibility split | Route R2 work through `uploads.ts` / `downloads.ts` |
| No file size cap | OOM or huge storage bill | Cap in `file-validation.ts`, validate before body read |

---

## 10. References

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [R2 Workers Binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [D1 Skill](./../database-d1/SKILL.md)
- [Cache-KV Skill](./../cache-kv/SKILL.md)
- [API Routes Skill](./../api-routes/SKILL.md)
