-- ============================================================================
-- SCHEMA EDIT 2026-02-23 23:03
-- ============================================================================
-- Sistema de favoritos de usuarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_favorites (
    user_uuid TEXT NOT NULL,
    resource_uuid TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_uuid, resource_uuid),
    FOREIGN KEY(user_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_order ON user_favorites(user_uuid, display_order DESC);
