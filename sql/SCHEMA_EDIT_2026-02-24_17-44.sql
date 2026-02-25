-- ============================================================================
-- SCHEMA EDIT 2026-02-24 00:00
-- ============================================================================
-- Sistema de Autenticación en 2 Pasos (2FA/TOTP)
-- ============================================================================

ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT;
