-- Migration 0021: Google Drive transfer (R2 -> Drive via Queues)
-- Drive auth is fully optional and incremental: login stays `openid email profile` only.
-- Drive consent (drive.file offline) is requested only when the user explicitly clicks "Save to Drive" / "Connect Drive".
-- Default folder is optional: user may pick a folder once and every transfer goes there; fallback is root.

-- Extend the existing OAuth provider table for Drive tokens + default folder.
-- We reuse the google provider row (provider='google') — no new provider value needed.
ALTER TABLE user_oauth_providers ADD COLUMN refresh_token_encrypted TEXT;
ALTER TABLE user_oauth_providers ADD COLUMN drive_scopes TEXT;
ALTER TABLE user_oauth_providers ADD COLUMN drive_default_folder_id TEXT;
ALTER TABLE user_oauth_providers ADD COLUMN drive_default_folder_name TEXT;

-- Jobs queue: one row per R2->Drive transfer, polled by the frontend.
CREATE TABLE IF NOT EXISTS drive_transfer_jobs (
	uuid TEXT PRIMARY KEY,
	user_uuid TEXT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
	r2_key TEXT NOT NULL,
	file_name TEXT NOT NULL,
	folder_id TEXT,
	status TEXT NOT NULL CHECK(status IN ('queued','processing','completed','failed')),
	google_file_id TEXT,
	error TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_drive_jobs_user ON drive_transfer_jobs(user_uuid);
CREATE INDEX IF NOT EXISTS idx_drive_jobs_status ON drive_transfer_jobs(status);
CREATE INDEX IF NOT EXISTS idx_drive_jobs_r2 ON drive_transfer_jobs(r2_key);
