-- ----------------------------------------------------------------------------
-- MIGRATION 0019: User Anonymity
-- ----------------------------------------------------------------------------
-- Adds an opt-in anonymous mode. When is_anonymous = 1, public-facing queries
-- substitute the user's real username/avatar with a deterministic pseudonym
-- ('Anonymous ' || substr(uuid,1,5)) and the default /avatar.png.
-- ----------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN is_anonymous INTEGER DEFAULT 0;
