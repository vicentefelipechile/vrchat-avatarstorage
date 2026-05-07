-- ============================================================
-- 0013_asset_file_links.sql
-- Add asset file FK to resources
-- ============================================================
-- Adds a direct FK from `resources` to `asset_files` so that
-- each resource can reference its downloadable binary file
-- independently of the image media system.
-- ============================================================

ALTER TABLE resources ADD COLUMN asset_file_uuid TEXT REFERENCES asset_files(uuid) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_asset_file ON resources(asset_file_uuid);
