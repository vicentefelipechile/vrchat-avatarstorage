-- Temporary share links for local (R2) files: an opaque token grants anonymous,
-- expiry- and use-limited downloads of a single media file. Expiry and usage live
-- here (never in the URL); consumption is an atomic UPDATE so concurrent GETs with
-- max_uses = 1 cannot both succeed. Orphaned rows cascade when the media/user is deleted.
CREATE TABLE IF NOT EXISTS share_links (
    uuid TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    media_uuid TEXT NOT NULL REFERENCES media(uuid) ON DELETE CASCADE,
    r2_key TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    max_uses INTEGER NULL,
    uses INTEGER NOT NULL DEFAULT 0,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_owner ON share_links(created_by);
