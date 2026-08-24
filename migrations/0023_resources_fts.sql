-- Migration 0023: FTS5 index for fast name search on resource titles
-- LIKE '%q%' without index is a full scan (1.7s on 18M rows) — FTS5 is the SQLite-native fix (Cloudflare D1 docs list fts5 as supported).
-- Use porter+unicode61 (available on D1) with prefix 2/3 for autocomplete; trigram would be ideal for infix LIKE but is not guaranteed on D1 builds.
-- Our queries use `r.uuid IN (SELECT uuid FROM resources_fts WHERE title LIKE ?)` which works with any tokenizer and falls back to `r.title LIKE` if the table is missing.
-- See query-constructor.ts:withFts and resource-repository.ts:search.

CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(
	title,
	description,
	uuid UNINDEXED,
	tokenize='porter unicode61',
	prefix='2 3'
);

-- Backfill existing active resources (populate trigram index)
INSERT INTO resources_fts(title, description, uuid)
SELECT title, COALESCE(description, ''), uuid FROM resources WHERE is_active = 1;

-- Keep FTS in sync via triggers (only title/description matter for search)
CREATE TRIGGER IF NOT EXISTS resources_fts_insert AFTER INSERT ON resources BEGIN
	INSERT INTO resources_fts(title, description, uuid) VALUES (new.title, COALESCE(new.description,''), new.uuid);
END;

CREATE TRIGGER IF NOT EXISTS resources_fts_delete AFTER DELETE ON resources BEGIN
	DELETE FROM resources_fts WHERE uuid = old.uuid;
END;

CREATE TRIGGER IF NOT EXISTS resources_fts_update AFTER UPDATE OF title, description ON resources BEGIN
	UPDATE resources_fts SET title = new.title, description = COALESCE(new.description,'') WHERE uuid = new.uuid;
END;

-- Keep index compact — run periodically (also on migration)
INSERT INTO resources_fts(resources_fts) VALUES ('optimize');
