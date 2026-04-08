-- ============================================================
-- 0008_category_authors.sql
-- Tabla de autores normalizados de avatares
-- ============================================================

CREATE TABLE IF NOT EXISTS avatar_authors (
	uuid        TEXT PRIMARY KEY,
	name        TEXT NOT NULL UNIQUE,
	slug        TEXT NOT NULL UNIQUE,
	description TEXT,
	avatar_url  TEXT,
	website_url TEXT,
	twitter_url TEXT,
	booth_url   TEXT,
	gumroad_url TEXT,
	patreon_url TEXT,
	discord_url TEXT,
	created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_avatar_authors_slug ON avatar_authors (slug);
CREATE INDEX IF NOT EXISTS idx_avatar_authors_name ON avatar_authors (name);
