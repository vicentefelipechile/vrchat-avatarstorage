-- ============================================================================
-- 0026_user_ban.sql — per-user suspension flag
-- ============================================================================
-- Adds users.is_banned (0/1). A banned user cannot log in and any existing
-- session resolves to null in getAuthUser (ban also invalidates their KV
-- session cache, like the role change does). No backfill needed: DEFAULT 0
-- covers every existing row.
-- ============================================================================

ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned);
