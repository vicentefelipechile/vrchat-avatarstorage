-- ============================================================
-- 0011_community_ads.sql
-- Community self-promotion ads system
-- ============================================================

-- ------------------------------------------------------------
-- Main ads table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_ads (
    uuid                TEXT PRIMARY KEY,
    author_uuid         TEXT NOT NULL,

    -- Ad content
    title               TEXT NOT NULL,              -- Advertiser name / ad title
    tagline             TEXT NOT NULL,              -- Short phrase (max 80 chars)
    description         TEXT,                       -- Long description (for internal page)

    -- Service type
    service_type        TEXT NOT NULL,              -- avatar_creator, 3d_artist, etc.

    -- Media
    banner_media_uuid   TEXT,                       -- Sidebar banner image
    card_media_uuid     TEXT,                       -- Grid card image

    -- Destination
    destination_type    TEXT NOT NULL DEFAULT 'internal', -- 'internal' | 'external'
    external_url        TEXT,                       -- Only used when destination_type = 'external'
    -- If internal, the page is served at /community/:uuid

    -- Status and moderation
    is_active           INTEGER NOT NULL DEFAULT 0,
    is_approved         INTEGER NOT NULL DEFAULT 0,
    rejected_reason     TEXT,

    -- Rotation
    display_weight      INTEGER NOT NULL DEFAULT 1, -- Admin-adjustable rotation weight

    -- Timestamps
    created_at          INTEGER DEFAULT (unixepoch()),
    updated_at          INTEGER DEFAULT (unixepoch()),
    expires_at          INTEGER,                    -- Informational only. NULL = no expiration. Ads are never auto-deleted.

    FOREIGN KEY(author_uuid)       REFERENCES users(uuid)  ON DELETE CASCADE,
    FOREIGN KEY(banner_media_uuid) REFERENCES media(uuid)  ON DELETE SET NULL,
    FOREIGN KEY(card_media_uuid)   REFERENCES media(uuid)  ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_community_ads_active
    ON community_ads(is_active, is_approved, service_type);
CREATE INDEX IF NOT EXISTS idx_community_ads_author
    ON community_ads(author_uuid);
CREATE INDEX IF NOT EXISTS idx_community_ads_created_at
    ON community_ads(created_at DESC);

-- ------------------------------------------------------------
-- Slot configuration (managed by admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_slot_config (
    slot_name           TEXT PRIMARY KEY,           -- 'sidebar_left' | 'grid_card' | 'detail_banner' | 'featured_artist'
    max_concurrent      INTEGER NOT NULL DEFAULT 3, -- Max ads shown simultaneously in this slot
    rotation_hours      INTEGER NOT NULL DEFAULT 24,-- How often the displayed ad rotates
    is_enabled          INTEGER NOT NULL DEFAULT 1,
    updated_at          INTEGER DEFAULT (unixepoch())
);

-- Default slot configuration seed
INSERT OR IGNORE INTO ad_slot_config (slot_name, max_concurrent, rotation_hours) VALUES
    ('sidebar_left',    1, 24),
    ('featured_artist', 1, 24),
    ('grid_card',       3, 24),
    ('detail_banner',   1, 24);

-- ------------------------------------------------------------
-- Basic non-invasive stats (no PII collected)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_stats (
    uuid            TEXT PRIMARY KEY,
    ad_uuid         TEXT NOT NULL,
    stat_date       TEXT NOT NULL,                  -- YYYY-MM-DD
    impressions     INTEGER NOT NULL DEFAULT 0,
    clicks          INTEGER NOT NULL DEFAULT 0,
    UNIQUE(ad_uuid, stat_date),
    FOREIGN KEY(ad_uuid) REFERENCES community_ads(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ad_stats_ad_date
    ON ad_stats(ad_uuid, stat_date DESC);

-- ------------------------------------------------------------
-- Internal advertiser pages (optional, Markdown content)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_internal_pages (
    ad_uuid         TEXT PRIMARY KEY,
    content         TEXT NOT NULL,                  -- Markdown body
    FOREIGN KEY(ad_uuid) REFERENCES community_ads(uuid) ON DELETE CASCADE
);
