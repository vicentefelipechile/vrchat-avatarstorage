-- ============================================================
-- 0014_change_feed.sql
-- Change-feed table: append-only log of "something in this scope changed at
-- this time". The frontend poller (GET /api/updates?since=<ts>) reads the
-- latest updated_at per scope to know which cached URL prefixes are stale.
-- D1 is the single source of truth; this table carries only timestamps,
-- never business data.
-- ============================================================

-- ------------------------------------------------------------
-- change_feed
-- One row per mutation. `scope` groups changes the frontend acts on as a
-- unit (avatars | assets | clothes | blog | comments). `entity_id` is the
-- uuid of the mutated entity; the poller reads MAX(updated_at) per scope.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS change_feed (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scope       TEXT NOT NULL,                      -- avatars | assets | clothes | blog | comments
    entity_id   TEXT NOT NULL,                      -- uuid of the mutated entity
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)  -- ms since epoch
);

-- Poller query is `SELECT scope, MAX(updated_at) ... WHERE updated_at > ? GROUP BY scope`.
-- A composite (scope, updated_at) index serves both the filter and the grouping.
CREATE INDEX IF NOT EXISTS idx_change_feed_scope_updated
    ON change_feed(scope, updated_at);

-- Ordered index over updated_at alone lets a retention sweep prune old rows cheaply.
CREATE INDEX IF NOT EXISTS idx_change_feed_updated
    ON change_feed(updated_at);
