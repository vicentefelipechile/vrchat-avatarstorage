-- ============================================================
-- 0009_category_metadata.sql
-- Tablas de metadatos por categoría: avatar_meta, asset_meta, clothes_meta
-- ============================================================

-- ============================================================
-- avatar_meta
-- ============================================================

CREATE TABLE IF NOT EXISTS avatar_meta (
	resource_uuid        TEXT PRIMARY KEY,
	author_uuid          TEXT,
	author_name_raw      TEXT,
	gender        		 NOT NULL DEFAULT 'undefined',
	avatar_size          TEXT NOT NULL DEFAULT 'medium',
	avatar_type          TEXT NOT NULL DEFAULT 'other',
	is_nsfw              INTEGER NOT NULL DEFAULT 0,
	has_physbones        INTEGER NOT NULL DEFAULT 0,
	has_face_tracking    INTEGER NOT NULL DEFAULT 0,
	has_dps              INTEGER NOT NULL DEFAULT 0,
	has_gogoloco         INTEGER NOT NULL DEFAULT 0,
	has_toggles          INTEGER NOT NULL DEFAULT 0,
	is_quest_optimized   INTEGER NOT NULL DEFAULT 0,
	sdk_version          TEXT NOT NULL DEFAULT 'sdk3',
	platform             TEXT NOT NULL DEFAULT 'cross',
	FOREIGN KEY (resource_uuid) REFERENCES resources (uuid) ON DELETE CASCADE,
	FOREIGN KEY (author_uuid) REFERENCES avatar_authors (uuid)
);

CREATE INDEX IF NOT EXISTS idx_avatar_meta_gender            ON avatar_meta (gender);
CREATE INDEX IF NOT EXISTS idx_avatar_meta_avatar_type       ON avatar_meta (avatar_type);
CREATE INDEX IF NOT EXISTS idx_avatar_meta_avatar_size       ON avatar_meta (avatar_size);
CREATE INDEX IF NOT EXISTS idx_avatar_meta_is_nsfw           ON avatar_meta (is_nsfw);
CREATE INDEX IF NOT EXISTS idx_avatar_meta_platform          ON avatar_meta (platform);
CREATE INDEX IF NOT EXISTS idx_avatar_meta_author_uuid       ON avatar_meta (author_uuid);
CREATE INDEX IF NOT EXISTS idx_avatar_meta_has_gogoloco      ON avatar_meta (has_gogoloco);
CREATE INDEX IF NOT EXISTS idx_avatar_meta_is_quest_optimized ON avatar_meta (is_quest_optimized);

-- ============================================================
-- asset_meta
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_meta (
	resource_uuid TEXT PRIMARY KEY,
	asset_type    TEXT NOT NULL DEFAULT 'other',
	is_nsfw       INTEGER NOT NULL DEFAULT 0,
	unity_version TEXT NOT NULL DEFAULT '2022',
	platform      TEXT NOT NULL DEFAULT 'cross',
	sdk_version   TEXT NOT NULL DEFAULT 'sdk3',
	FOREIGN KEY (resource_uuid) REFERENCES resources (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asset_meta_asset_type    ON asset_meta (asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_meta_is_nsfw       ON asset_meta (is_nsfw);
CREATE INDEX IF NOT EXISTS idx_asset_meta_platform      ON asset_meta (platform);
CREATE INDEX IF NOT EXISTS idx_asset_meta_unity_version ON asset_meta (unity_version);

-- ============================================================
-- clothes_meta
-- ============================================================

CREATE TABLE IF NOT EXISTS clothes_meta (
	resource_uuid       TEXT PRIMARY KEY,
	gender_fit          TEXT NOT NULL DEFAULT 'unisex',
	clothing_type       TEXT NOT NULL DEFAULT 'other',
	is_base             INTEGER NOT NULL DEFAULT 0,
	base_avatar_uuid    TEXT,
	base_avatar_name_raw TEXT,
	is_nsfw             INTEGER NOT NULL DEFAULT 0,
	has_physbones       INTEGER NOT NULL DEFAULT 0,
	platform            TEXT NOT NULL DEFAULT 'cross',
	FOREIGN KEY (resource_uuid) REFERENCES resources (uuid) ON DELETE CASCADE,
	FOREIGN KEY (base_avatar_uuid) REFERENCES resources (uuid)
);

CREATE INDEX IF NOT EXISTS idx_clothes_meta_gender_fit    ON clothes_meta (gender_fit);
CREATE INDEX IF NOT EXISTS idx_clothes_meta_clothing_type ON clothes_meta (clothing_type);
CREATE INDEX IF NOT EXISTS idx_clothes_meta_is_base       ON clothes_meta (is_base);
CREATE INDEX IF NOT EXISTS idx_clothes_meta_is_nsfw       ON clothes_meta (is_nsfw);
CREATE INDEX IF NOT EXISTS idx_clothes_meta_platform      ON clothes_meta (platform);
CREATE INDEX IF NOT EXISTS idx_clothes_meta_has_physbones ON clothes_meta (has_physbones);
