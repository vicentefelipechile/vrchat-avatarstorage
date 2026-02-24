-- ============================================================================
-- VRCSTORAGE - DATABASE SCHEMA
-- ============================================================================
-- Este archivo define la estructura completa de la base de datos
-- Organizado por secciones para facilitar el mantenimiento
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECCIÓN 1: LIMPIEZA DE TABLAS EXISTENTES
-- ----------------------------------------------------------------------------
-- Eliminar tablas en orden correcto (respetando dependencias)
-- DROP TABLE IF EXISTS comments;
-- DROP TABLE IF EXISTS resource_links;
-- DROP TABLE IF EXISTS resources;
-- DROP TABLE IF EXISTS resource_n_media;
-- DROP TABLE IF EXISTS media;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS rate_limits;

-- ----------------------------------------------------------------------------
-- SECCIÓN 2: TABLA DE USUARIOS
-- ----------------------------------------------------------------------------
-- Almacena información de los usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    is_admin BOOLEAN DEFAULT 0
);

-- Índices para optimizar búsquedas de usuarios
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ----------------------------------------------------------------------------
-- SECCIÓN 3: SISTEMA DE MEDIOS (IMÁGENES Y ARCHIVOS)
-- ----------------------------------------------------------------------------
-- Tabla principal de medios (imágenes, archivos, etc.)
CREATE TABLE IF NOT EXISTS media (
    uuid TEXT PRIMARY KEY,
    r2_key TEXT NOT NULL,              -- Clave en Cloudflare R2
    media_type TEXT NOT NULL,          -- 'image' o 'file'
    file_name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Índices para medios
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_r2_key ON media(r2_key);

-- Tabla puente para relación recursos-medios (muchos a muchos)
CREATE TABLE IF NOT EXISTS resource_n_media (
    uuid TEXT PRIMARY KEY,
    resource_uuid TEXT NOT NULL,       -- UUID del recurso
    media_uuid TEXT NOT NULL,          -- UUID del medio
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
    FOREIGN KEY(media_uuid) REFERENCES media(uuid) ON DELETE CASCADE
);

-- Índices para relaciones
CREATE INDEX IF NOT EXISTS idx_resource_n_media_resource ON resource_n_media(resource_uuid);
CREATE INDEX IF NOT EXISTS idx_resource_n_media_media ON resource_n_media(media_uuid);

-- ----------------------------------------------------------------------------
-- SECCIÓN 4: TABLA DE RECURSOS (AVATARES, MODELOS, ETC.)
-- ----------------------------------------------------------------------------
-- Tabla principal de recursos publicados
CREATE TABLE IF NOT EXISTS resources (
    uuid TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,            -- Categoría del recurso
    thumbnail_uuid TEXT NOT NULL,      -- Miniatura principal
    reference_image_uuid TEXT,         -- Imagen de referencia adicional
    author_uuid TEXT NOT NULL,
    download_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
    FOREIGN KEY(thumbnail_uuid) REFERENCES media(uuid),
    FOREIGN KEY(reference_image_uuid) REFERENCES media(uuid)
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_resources_author ON resources(author_uuid);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_download_count ON resources(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_resources_title ON resources(title);

-- ----------------------------------------------------------------------------
-- SECCIÓN 5: TABLA DE LINKS/ENLACES
-- ----------------------------------------------------------------------------
-- Almacena múltiples enlaces asociados a cada recurso
CREATE TABLE IF NOT EXISTS resource_links (
    uuid TEXT PRIMARY KEY,
    resource_uuid TEXT NOT NULL,      -- UUID del recurso al que pertenece
    link_url TEXT NOT NULL,           -- URL del enlace
    link_title TEXT,                  -- Título descriptivo del enlace (opcional)
    link_type TEXT DEFAULT 'general', -- Tipo: 'download', 'demo', 'documentation', 'general'
    display_order INTEGER DEFAULT 0,  -- Orden de visualización
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE
);

-- Índices para links
CREATE INDEX IF NOT EXISTS idx_resource_links_resource ON resource_links(resource_uuid);
CREATE INDEX IF NOT EXISTS idx_resource_links_display_order ON resource_links(resource_uuid, display_order);

-- ----------------------------------------------------------------------------
-- SECCIÓN 6: TABLA DE COMENTARIOS
-- ----------------------------------------------------------------------------
-- Comentarios de usuarios en recursos
CREATE TABLE IF NOT EXISTS comments (
    uuid TEXT PRIMARY KEY,
    resource_uuid TEXT NOT NULL,
    author_uuid TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
    FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Índices para comentarios
CREATE INDEX IF NOT EXISTS idx_comments_resource ON comments(resource_uuid);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_uuid);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ----------------------------------------------------------------------------
-- SECCIÓN 7: RATE LIMITING
-- ----------------------------------------------------------------------------
-- Tabla para almacenar el conteo de peticiones por IP
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,               -- IP o Identificador único (ej: "ip:127.0.0.1")
    count INTEGER DEFAULT 1,            -- Número de peticiones
    timestamp INTEGER DEFAULT (unixepoch()) -- Momento del primer request en la ventana
);

-- Índices para limpieza
CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits(timestamp);


-- ----------------------------------------------------------------------------
-- SCHEMA EDIT 2026-02-15 12:01
-- ----------------------------------------------------------------------------

-- Este índice agrupa primero los activos y ya los tiene ordenados por fecha.
-- D1 encontrará las 6 filas exactas instantáneamente sin escanear nada más.
CREATE INDEX IF NOT EXISTS idx_resources_feed ON resources(is_active, created_at DESC);

-- ----------------------------------------------------------------------------
-- SECCIÓN 8: WIKI COMMENTS (GLOBAL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wiki_comments (
    uuid TEXT PRIMARY KEY,
    author_uuid TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Index for global feed
CREATE INDEX IF NOT EXISTS idx_wiki_comments_created_at ON wiki_comments(created_at DESC);


-- ----------------------------------------------------------------------------
-- SCHEMA EDIT 2026-02-23 21:03
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- SECCIÓN 9: SISTEMA DE TAGS Y BÚSQUEDA
-- ----------------------------------------------------------------------------

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

-- Tabla Virtual FTS5 para Búsqueda Full Text
CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(
    title, 
    description, 
    content='resources', 
    content_rowid='rowid'
);

-- Triggers para mantener sincronizada la tabla FTS
CREATE TRIGGER IF NOT EXISTS resources_ai AFTER INSERT ON resources BEGIN
  INSERT INTO resources_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS resources_ad AFTER DELETE ON resources BEGIN
  INSERT INTO resources_fts(resources_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS resources_au AFTER UPDATE ON resources BEGIN
  INSERT INTO resources_fts(resources_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO resources_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

-- ----------------------------------------------------------------------------
-- SECCIÓN 10: HISTORIAL DE CAMBIOS (AUDIT LOG)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS resource_history (
    uuid TEXT PRIMARY KEY,
    resource_uuid TEXT NOT NULL,
    actor_uuid TEXT NOT NULL,           -- Quién hizo el cambio (Admin)
    change_type TEXT NOT NULL,          -- 'content_edit', 'tag_change', 'approval'
    previous_data TEXT NOT NULL,        -- JSON con el estado anterior del recurso
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
    FOREIGN KEY(actor_uuid) REFERENCES users(uuid)
);

CREATE INDEX IF NOT EXISTS idx_resource_history_resource ON resource_history(resource_uuid, created_at DESC);

-- ----------------------------------------------------------------------------
-- SECCIÓN 11: FAVORITOS DE USUARIOS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_favorites (
    user_uuid TEXT NOT NULL,
    resource_uuid TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,        -- Orden de visualización (0 = más reciente)
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_uuid, resource_uuid),
    FOREIGN KEY(user_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_order ON user_favorites(user_uuid, display_order DESC);
