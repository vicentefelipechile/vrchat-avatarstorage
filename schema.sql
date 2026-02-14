-- ============================================================================
-- VRCHAT AVATAR STORAGE - DATABASE SCHEMA
-- ============================================================================
-- Este archivo define la estructura completa de la base de datos
-- Organizado por secciones para facilitar el mantenimiento
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECCIÓN 1: LIMPIEZA DE TABLAS EXISTENTES
-- ----------------------------------------------------------------------------
-- Eliminar tablas en orden correcto (respetando dependencias)
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS resource_links;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS resource_n_media;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS users;

-- ----------------------------------------------------------------------------
-- SECCIÓN 2: TABLA DE USUARIOS
-- ----------------------------------------------------------------------------
-- Almacena información de los usuarios del sistema
CREATE TABLE users (
    uuid TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    is_admin BOOLEAN DEFAULT 0
);

-- Índices para optimizar búsquedas de usuarios
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ----------------------------------------------------------------------------
-- SECCIÓN 3: SISTEMA DE MEDIOS (IMÁGENES Y ARCHIVOS)
-- ----------------------------------------------------------------------------
-- Tabla principal de medios (imágenes, archivos, etc.)
CREATE TABLE media (
    uuid TEXT PRIMARY KEY,
    r2_key TEXT NOT NULL,              -- Clave en Cloudflare R2
    media_type TEXT NOT NULL,          -- 'image' o 'file'
    file_name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Índices para medios
CREATE INDEX idx_media_type ON media(media_type);
CREATE INDEX idx_media_r2_key ON media(r2_key);

-- Tabla puente para relación recursos-medios (muchos a muchos)
CREATE TABLE resource_n_media (
    uuid TEXT PRIMARY KEY,
    resource_uuid TEXT NOT NULL,       -- UUID del recurso
    media_uuid TEXT NOT NULL,          -- UUID del medio
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
    FOREIGN KEY(media_uuid) REFERENCES media(uuid) ON DELETE CASCADE
);

-- Índices para relaciones
CREATE INDEX idx_resource_n_media_resource ON resource_n_media(resource_uuid);
CREATE INDEX idx_resource_n_media_media ON resource_n_media(media_uuid);

-- ----------------------------------------------------------------------------
-- SECCIÓN 4: TABLA DE RECURSOS (AVATARES, MODELOS, ETC.)
-- ----------------------------------------------------------------------------
-- Tabla principal de recursos publicados
CREATE TABLE resources (
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
CREATE INDEX idx_resources_author ON resources(author_uuid);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX idx_resources_download_count ON resources(download_count DESC);
CREATE INDEX idx_resources_title ON resources(title);

-- ----------------------------------------------------------------------------
-- SECCIÓN 5: TABLA DE LINKS/ENLACES
-- ----------------------------------------------------------------------------
-- Almacena múltiples enlaces asociados a cada recurso
CREATE TABLE resource_links (
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
CREATE INDEX idx_resource_links_resource ON resource_links(resource_uuid);
CREATE INDEX idx_resource_links_display_order ON resource_links(resource_uuid, display_order);

-- ----------------------------------------------------------------------------
-- SECCIÓN 6: TABLA DE COMENTARIOS
-- ----------------------------------------------------------------------------
-- Comentarios de usuarios en recursos
CREATE TABLE comments (
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
CREATE INDEX idx_comments_resource ON comments(resource_uuid);
CREATE INDEX idx_comments_author ON comments(author_uuid);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
