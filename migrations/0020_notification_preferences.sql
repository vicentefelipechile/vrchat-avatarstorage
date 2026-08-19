-- ----------------------------------------------------------------------------
-- MIGRATION 0020: Browser notification preferences
-- ----------------------------------------------------------------------------
-- Per-user opt-in for browser Notifications when a new resource is approved.
-- Stored per-user with global toggle + per-category toggles + subtype filters:
--   - avatars: filter by avatar_type (human, furry, anime, etc.)
--   - assets: filter by asset_type (prefab, shader, etc.)
--   - clothes: simple on/off (no subtype granularity requested)
-- JSON arrays are stored as TEXT (e.g. '["human","furry"]' or NULL = all).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_notification_prefs (
	user_uuid TEXT PRIMARY KEY,
	enabled INTEGER NOT NULL DEFAULT 0,
	avatars_enabled INTEGER NOT NULL DEFAULT 1,
	avatar_types TEXT,
	assets_enabled INTEGER NOT NULL DEFAULT 1,
	asset_types TEXT,
	clothes_enabled INTEGER NOT NULL DEFAULT 1,
	updated_at INTEGER DEFAULT (unixepoch()),
	FOREIGN KEY(user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);
