-- ============================================================================
-- 0012: Media variants for CDN pre-processing
-- Adds placeholder_blur column to media and the media_variants table.
-- ============================================================================

-- Blur placeholder stored as base64 data URI (tiny 8x8 WebP, ~200 bytes)
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
