-- =========================================================================================================
-- 0013 — Migrate persisted avatar URLs from /api/download/{r2_key} to the CDN (by media uuid)
-- =========================================================================================================
-- Part of the media/download split: public media is served by the CDN worker
-- (cdn.vrcstorage.lat/{uuid}), and /api/download is now private-files only. Two columns store
-- avatar URLs as `/api/download/{r2_key}` strings and must be rewritten to CDN URLs:
--   - users.avatar_url          (0001)
--   - avatar_authors.avatar_url (0008)
--
-- The rewrite resolves r2_key -> media.uuid via a join and rebuilds the CDN URL, mirroring the
-- frontend `mediaUrl(uuid)` default (res=med, format=webp). Rows whose r2_key is not present in
-- `media` are left untouched (the EXISTS guard) so nothing breaks if a key can't be resolved.
--
-- Idempotent: only rows still matching '/api/download/%' are touched; re-running is a no-op.
-- =========================================================================================================

UPDATE users
SET avatar_url = 'https://cdn.vrcstorage.lat/' || (
    SELECT m.uuid FROM media m
    WHERE m.r2_key = REPLACE(users.avatar_url, '/api/download/', '')
) || '?res=med&format=webp'
WHERE avatar_url LIKE '/api/download/%'
  AND EXISTS (
    SELECT 1 FROM media m
    WHERE m.r2_key = REPLACE(users.avatar_url, '/api/download/', '')
  );

UPDATE avatar_authors
SET avatar_url = 'https://cdn.vrcstorage.lat/' || (
    SELECT m.uuid FROM media m
    WHERE m.r2_key = REPLACE(avatar_authors.avatar_url, '/api/download/', '')
) || '?res=med&format=webp'
WHERE avatar_url LIKE '/api/download/%'
  AND EXISTS (
    SELECT 1 FROM media m
    WHERE m.r2_key = REPLACE(avatar_authors.avatar_url, '/api/download/', '')
  );
