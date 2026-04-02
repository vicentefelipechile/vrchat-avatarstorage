-- ============================================================================
-- VRCSTORAGE - SCHEMA EDIT 2026-03-22: Blog System
-- ============================================================================
-- Adds tables for blog posts and blog comments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA: blog_posts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
    uuid TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,             -- URL-friendly slug, e.g. "hello-world"
    title TEXT NOT NULL,
    content TEXT NOT NULL,                 -- Full Markdown content
    excerpt TEXT,                          -- Optional short summary shown in list view
    cover_image_uuid TEXT,                 -- Optional FK → media.uuid
    author_uuid TEXT NOT NULL,             -- FK → users.uuid (actual creator)
    author_display TEXT NOT NULL DEFAULT 'personal', -- 'personal' | 'team'
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
    FOREIGN KEY(cover_image_uuid) REFERENCES media(uuid) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_uuid);

-- ----------------------------------------------------------------------------
-- TABLA: blog_comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_comments (
    uuid TEXT PRIMARY KEY,
    post_uuid TEXT NOT NULL,
    author_uuid TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY(post_uuid) REFERENCES blog_posts(uuid) ON DELETE CASCADE,
    FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_uuid);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON blog_comments(created_at ASC);
