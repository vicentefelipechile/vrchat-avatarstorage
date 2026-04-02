-- ============================================================================
-- SCHEMA EDIT 2026-02-15 12:01
-- ============================================================================
-- Agregar índice compuesto para el feed de recursos
-- Este índice agrupa primero los activos y los ordena por fecha
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_resources_feed ON resources(is_active, created_at DESC);
