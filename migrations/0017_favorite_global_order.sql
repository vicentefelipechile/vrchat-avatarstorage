-- Separate the "All favorites" ordering from the per-collection ordering.
-- `display_order` keeps its meaning: order within a favorite's collection (or the
-- uncategorized bucket). The new `global_order` drives the "All" tab, so reordering
-- there no longer disturbs a collection's internal order and vice versa.
-- Existing favorites seed `global_order` from `display_order` to preserve the current
-- "All" order at migration time.

ALTER TABLE user_favorites ADD COLUMN global_order INTEGER DEFAULT 0;

UPDATE user_favorites SET global_order = display_order;

CREATE INDEX IF NOT EXISTS idx_user_favorites_global
    ON user_favorites(user_uuid, global_order DESC);
