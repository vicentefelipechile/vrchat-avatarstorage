-- ============================================================================
-- SCHEMA EDIT 2026-03-13 04:41
-- ============================================================================
-- Sistema de OAuth con tabla de proveedores genérica
-- Soporta Google, Discord, GitHub, etc. sin modificar la tabla users
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_oauth_providers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uuid   TEXT    NOT NULL,
    provider    TEXT    NOT NULL,  -- 'google' | 'discord' | 'github' | ...
    provider_id TEXT    NOT NULL,  -- ID del usuario en el proveedor (sub / user_id)
    email       TEXT,              -- Email informativo del proveedor
    created_at  INTEGER DEFAULT (unixepoch()),
    UNIQUE (provider, provider_id),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_provider ON user_oauth_providers(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_oauth_user     ON user_oauth_providers(user_uuid);
