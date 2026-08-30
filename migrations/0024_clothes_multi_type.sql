-- ============================================================================
-- 0024_clothes_multi_type.sql — clothes: clothing_type single → multi (junction)
-- ============================================================================
-- Pasamos de un único clothing_type por recurso a N tipos por recurso.
-- Nuevo modelo: clothes_clothing_types (resource_uuid, clothing_type) PK compuesta.
-- Se migra el dato existente y se elimina la columna vieja de clothes_meta.
-- Sin retrocompatibilidad: código nuevo solo lee/escribe la junction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Junction table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clothes_clothing_types (
	resource_uuid TEXT NOT NULL REFERENCES resources(uuid) ON DELETE CASCADE,
	clothing_type TEXT NOT NULL CHECK (clothing_type IN ('top','jacket','bottom','dress','fullbody','swimwear','shoes','legwear','hat','hair','accessory','tail','ears','wings','body-part','underwear','other')),
	PRIMARY KEY (resource_uuid, clothing_type)
);

CREATE INDEX IF NOT EXISTS idx_cct_resource ON clothes_clothing_types(resource_uuid);
CREATE INDEX IF NOT EXISTS idx_cct_type ON clothes_clothing_types(clothing_type);

-- ----------------------------------------------------------------------------
-- 2. Backfill desde la columna vieja
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO clothes_clothing_types (resource_uuid, clothing_type)
	SELECT resource_uuid, clothing_type FROM clothes_meta WHERE clothing_type IS NOT NULL AND clothing_type != '';

-- Los recursos clothes que por algún motivo quedaron sin fila en la junction (columna vacia o null)
-- reciben 'other' por defecto para cumplir min 1.
INSERT OR IGNORE INTO clothes_clothing_types (resource_uuid, clothing_type)
	SELECT cm.resource_uuid, 'other'
	FROM clothes_meta cm
	LEFT JOIN clothes_clothing_types cct ON cct.resource_uuid = cm.resource_uuid
	WHERE cct.resource_uuid IS NULL;

-- ----------------------------------------------------------------------------
-- 3. Limpieza de índice viejo (debe ir ANTES del DROP COLUMN — SQLite invalida el índice después)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_clothes_meta_clothing_type;

-- ----------------------------------------------------------------------------
-- 4. Eliminar la columna vieja de clothes_meta (SQLite >=3.35 soporta DROP COLUMN en D1)
-- ----------------------------------------------------------------------------
-- Recrear la tabla sin la columna es más portátil que DROP COLUMN si la versión no lo soporta.
-- Intentamos DROP COLUMN primero; si falla, el fallback de recreación está abajo comentado.
-- D1 actual (2026) soporta DROP COLUMN, así que este ALTER es suficiente.

ALTER TABLE clothes_meta DROP COLUMN clothing_type;

-- ----------------------------------------------------------------------------
-- Fallback manual si ALTER TABLE DROP COLUMN no está disponible (descomentar y ejecutar):
-- ----------------------------------------------------------------------------
-- PRAGMA foreign_keys=OFF;
-- CREATE TABLE _clothes_meta_new (
-- 	resource_uuid        TEXT PRIMARY KEY,
-- 	gender_fit           TEXT NOT NULL DEFAULT 'unisex',
-- 	is_base              INTEGER NOT NULL DEFAULT 0,
-- 	base_avatar_uuid     TEXT,
-- 	base_avatar_name_raw TEXT,
-- 	is_nsfw              INTEGER NOT NULL DEFAULT 0,
-- 	has_physbones        INTEGER NOT NULL DEFAULT 0,
-- 	platform             TEXT NOT NULL DEFAULT 'cross',
-- 	FOREIGN KEY (resource_uuid) REFERENCES resources (uuid) ON DELETE CASCADE,
-- 	FOREIGN KEY (base_avatar_uuid) REFERENCES resources (uuid)
-- );
-- INSERT INTO _clothes_meta_new (resource_uuid, gender_fit, is_base, base_avatar_uuid, base_avatar_name_raw, is_nsfw, has_physbones, platform)
-- 	SELECT resource_uuid, gender_fit, is_base, base_avatar_uuid, base_avatar_name_raw, is_nsfw, has_physbones, platform FROM clothes_meta;
-- DROP TABLE clothes_meta;
-- ALTER TABLE _clothes_meta_new RENAME TO clothes_meta;
-- CREATE INDEX IF NOT EXISTS idx_clothes_meta_gender_fit    ON clothes_meta (gender_fit);
-- CREATE INDEX IF NOT EXISTS idx_clothes_meta_is_base       ON clothes_meta (is_base);
-- CREATE INDEX IF NOT EXISTS idx_clothes_meta_is_nsfw       ON clothes_meta (is_nsfw);
-- CREATE INDEX IF NOT EXISTS idx_clothes_meta_platform      ON clothes_meta (platform);
-- CREATE INDEX IF NOT EXISTS idx_clothes_meta_has_physbones ON clothes_meta (has_physbones);
-- PRAGMA foreign_keys=ON;
