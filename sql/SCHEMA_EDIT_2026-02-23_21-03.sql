-- ============================================================================
-- SCHEMA EDIT 2026-02-23 21:03
-- ============================================================================
-- Sistema de etiquetas (tags) para recursos
-- ============================================================================

-- Tabla de Tags
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Tabla Relacional Recursos-Tags
CREATE TABLE IF NOT EXISTS resource_tags (
    resource_uuid TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (resource_uuid, tag_id),
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
