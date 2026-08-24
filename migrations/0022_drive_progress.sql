-- Migration 0022: Drive progress tracking for toast with progress
-- Adds total size and uploaded bytes to drive_transfer_jobs so the frontend can poll real %.

ALTER TABLE drive_transfer_jobs ADD COLUMN total_bytes INTEGER;
ALTER TABLE drive_transfer_jobs ADD COLUMN bytes_uploaded INTEGER NOT NULL DEFAULT 0;
