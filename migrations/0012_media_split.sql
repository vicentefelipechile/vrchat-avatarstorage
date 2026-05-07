-- ============================================================
-- 0012_media_split.sql
-- Split media table: image_media (visual) vs asset_files (binary)
-- ============================================================
-- Context:
--   The original `media` table stored every file type (images, videos,
--   archives) in a single flat registry against a single R2 bucket.
--   This migration decouples visual media from binary downloads:
--     - `image_media` → thumbnails, reference images, avatars, banners,
--                        blog covers, ad cards. Lives in MEDIA_BUCKET.
--     - `asset_files`  → downloadable .unitypackage / zip files.
--                        Lives in BUCKET (unchanged).
--
-- Zero-downtime strategy:
--   All pre-existing rows inherit r2_bucket = 'legacy', meaning they
--   still live in the old combined BUCKET. New uploads set r2_bucket = 'media'.
--   The serving layer checks this discriminator and routes reads accordingly.
--   Do not delete files from BUCKET until all 'legacy' rows are migrated.
-- ============================================================

-- Rename the existing media table to reflect its new purpose
ALTER TABLE media RENAME TO image_media;

-- Add a bucket discriminator for zero-downtime transition
-- 'legacy'  = still in the old combined BUCKET (needs migration)
-- 'media'   = already in MEDIA_BUCKET
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
