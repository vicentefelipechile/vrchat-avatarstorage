-- Favorite collections: named folders that group a user's favorites.
-- A favorite belongs to zero or one collection (NULL = uncategorized).
-- Deleting a collection moves its favorites back to uncategorized (ON DELETE SET NULL).

CREATE TABLE IF NOT EXISTS user_collections (
    uuid TEXT PRIMARY KEY,
    user_uuid TEXT NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_collections_user ON user_collections(user_uuid, display_order DESC);

ALTER TABLE user_favorites ADD COLUMN collection_uuid TEXT DEFAULT NULL
    REFERENCES user_collections(uuid) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_favorites_collection
    ON user_favorites(user_uuid, collection_uuid, display_order DESC);
