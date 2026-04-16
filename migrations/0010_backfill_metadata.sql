-- ============================================================================
-- VRCSTORAGE - BACKFILL CATEGORY METADATA
-- ============================================================================
-- Poblar metadatos faltantes para recursos existentes en producción.
-- Todos los valores son defaults seguros y editables desde el panel admin.
-- Seguro de correr múltiples veces — el NOT IN evita duplicados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. avatar_meta
-- Aplica a todos los recursos de categoría 'avatars' sin fila en avatar_meta.
-- ----------------------------------------------------------------------------
INSERT INTO avatar_meta (
    resource_uuid,
    author_uuid,        -- Sin autor normalizado por defecto
    author_name_raw,    -- Sin nombre raw por defecto
    gender,             -- 'undefined' hasta que el admin lo corrija
    avatar_size,        -- Talla media como default razonable
    avatar_type,        -- 'other' hasta que el admin lo clasifique
    is_nsfw,
    has_physbones,
    has_face_tracking,
    has_dps,
    has_gogoloco,
    has_toggles,
    is_quest_optimized,
    sdk_version,        -- SDK3 es el estándar actual de VRChat
    platform            -- 'pc' es el más común y seguro como default para avatares
)
SELECT
    uuid,
    NULL,
    NULL,
    'undefined',
    'medium',
    'other',
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    'sdk3',
    'pc'
FROM resources
WHERE category = 'avatars'
AND uuid NOT IN (SELECT resource_uuid FROM avatar_meta);

-- ----------------------------------------------------------------------------
-- 2. asset_meta
-- Aplica a todos los recursos de categoría 'assets' sin fila en asset_meta.
-- ----------------------------------------------------------------------------
INSERT INTO asset_meta (
    resource_uuid,
    asset_type,     -- 'other' hasta que el admin lo clasifique
    is_nsfw,
    unity_version,  -- 2022 es la versión actual requerida por VRChat
    platform,       -- 'pc' es el más común y seguro como default para assets
    sdk_version     -- SDK3 es el estándar actual de VRChat
)
SELECT
    uuid,
    'other',
    0,
    '2022',
    'pc',
    'sdk3'
FROM resources
WHERE category = 'assets'
AND uuid NOT IN (SELECT resource_uuid FROM asset_meta);

-- ----------------------------------------------------------------------------
-- 3. clothes_meta
-- Aplica a todos los recursos de categoría 'clothes' sin fila en clothes_meta.
-- ----------------------------------------------------------------------------
INSERT INTO clothes_meta (
    resource_uuid,
    gender_fit,             -- 'unisex' es el default más neutral
    clothing_type,          -- 'other' hasta que el admin lo clasifique
    is_base,
    base_avatar_uuid,       -- Sin avatar base asociado por defecto
    base_avatar_name_raw,   -- Sin nombre raw por defecto
    is_nsfw,
    has_physbones,
    platform                -- 'cross' es el más permisivo como default
)
SELECT
    uuid,
    'unisex',
    'other',
    0,
    NULL,
    NULL,
    0,
    0,
    'cross'
FROM resources
WHERE category = 'clothes'
AND uuid NOT IN (SELECT resource_uuid FROM clothes_meta);