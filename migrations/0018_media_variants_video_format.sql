-- ============================================================================
-- 0017: Allow 'mp4' as a media_variants format
-- Videos are normalized to an H.264/AAC MP4 (via the Media Transformations
-- binding) and stored under {uuid}/video.mp4 in MEDIA_BUCKET, indexed as a
-- variant with format='mp4' so the video counts as processed and is covered by
-- the orphan cleanup. Its animated poster is a separate format='gif' row.
-- SQLite can't ALTER a CHECK constraint, so the table is recreated with the
-- widened CHECK; data, indexes and FK are preserved.
--
-- foreign_keys is disabled for the swap so dropping the old table can't touch
-- referenced rows in media, then re-enabled. The INSERT..SELECT carries every
-- existing row over unchanged; verify COUNT(*) matches before and after.
-- ============================================================================

PRAGMA foreign_keys = OFF;

ALTER TABLE media_variants RENAME TO media_variants_old;

CREATE TABLE media_variants (
    media_uuid TEXT NOT NULL,
    res        TEXT NOT NULL CHECK(res IN ('low', 'med', 'original')),
    format     TEXT NOT NULL CHECK(format IN ('webp', 'png', 'gif', 'mp4')),
    r2_key     TEXT NOT NULL UNIQUE,
    width      INTEGER,
    height     INTEGER,
    file_size  INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (media_uuid, res, format),
    FOREIGN KEY (media_uuid) REFERENCES media(uuid) ON DELETE CASCADE
);

INSERT INTO media_variants (media_uuid, res, format, r2_key, width, height, file_size, created_at)
SELECT media_uuid, res, format, r2_key, width, height, file_size, created_at FROM media_variants_old;

DROP TABLE media_variants_old;

CREATE INDEX IF NOT EXISTS idx_media_variants_media  ON media_variants(media_uuid);
CREATE INDEX IF NOT EXISTS idx_media_variants_r2_key ON media_variants(r2_key);

PRAGMA foreign_keys = ON;
