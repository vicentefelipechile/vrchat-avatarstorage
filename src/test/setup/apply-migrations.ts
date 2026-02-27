// =========================================================================================================
// TEST SETUP — Apply D1 Schema
// =========================================================================================================
// This setupFile runs before all tests (outside isolated storage).
// Each SQL statement is executed individually because D1's exec() does NOT
// support multiple statements in a single string.
//
// NOTE: We use env.DB.prepare(...).run() for each statement because the project
// uses custom SQL file names (SCHEMA_INIT.sql, SCHEMA_EDIT_*) rather than the
// sequential `0001_name.sql` format expected by readD1Migrations().
// =========================================================================================================

import { env } from 'cloudflare:test';

const statements = [
    // ── Users ──
    `CREATE TABLE IF NOT EXISTS users (
		uuid TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		avatar_url TEXT,
		created_at INTEGER DEFAULT (unixepoch()),
		is_admin BOOLEAN DEFAULT 0,
		two_factor_enabled BOOLEAN DEFAULT 0,
		two_factor_secret TEXT,
		two_factor_backup_codes TEXT
	)`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
    `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`,

    // ── Media ──
    `CREATE TABLE IF NOT EXISTS media (
		uuid TEXT PRIMARY KEY,
		r2_key TEXT NOT NULL,
		media_type TEXT NOT NULL,
		file_name TEXT NOT NULL,
		created_at INTEGER DEFAULT (unixepoch())
	)`,
    `CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type)`,
    `CREATE INDEX IF NOT EXISTS idx_media_r2_key ON media(r2_key)`,

    // ── Resources ──
    `CREATE TABLE IF NOT EXISTS resources (
		uuid TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT,
		category TEXT NOT NULL,
		thumbnail_uuid TEXT NOT NULL,
		reference_image_uuid TEXT,
		author_uuid TEXT NOT NULL,
		download_count INTEGER DEFAULT 0,
		is_active BOOLEAN DEFAULT 0,
		created_at INTEGER DEFAULT (unixepoch()),
		updated_at INTEGER DEFAULT (unixepoch()),
		FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
		FOREIGN KEY(thumbnail_uuid) REFERENCES media(uuid),
		FOREIGN KEY(reference_image_uuid) REFERENCES media(uuid)
	)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_author ON resources(author_uuid)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_download_count ON resources(download_count DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_title ON resources(title)`,
    `CREATE INDEX IF NOT EXISTS idx_resources_feed ON resources(is_active, created_at DESC)`,

    // ── Resource ↔ Media junction ──
    `CREATE TABLE IF NOT EXISTS resource_n_media (
		uuid TEXT PRIMARY KEY,
		resource_uuid TEXT NOT NULL,
		media_uuid TEXT NOT NULL,
		created_at INTEGER DEFAULT (unixepoch()),
		FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
		FOREIGN KEY(media_uuid) REFERENCES media(uuid) ON DELETE CASCADE
	)`,
    `CREATE INDEX IF NOT EXISTS idx_resource_n_media_resource ON resource_n_media(resource_uuid)`,
    `CREATE INDEX IF NOT EXISTS idx_resource_n_media_media ON resource_n_media(media_uuid)`,

    // ── Resource Links ──
    `CREATE TABLE IF NOT EXISTS resource_links (
		uuid TEXT PRIMARY KEY,
		resource_uuid TEXT NOT NULL,
		link_url TEXT NOT NULL,
		link_title TEXT,
		link_type TEXT DEFAULT 'general',
		display_order INTEGER DEFAULT 0,
		created_at INTEGER DEFAULT (unixepoch()),
		FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE
	)`,
    `CREATE INDEX IF NOT EXISTS idx_resource_links_resource ON resource_links(resource_uuid)`,
    `CREATE INDEX IF NOT EXISTS idx_resource_links_display_order ON resource_links(resource_uuid, display_order)`,

    // ── Comments ──
    `CREATE TABLE IF NOT EXISTS comments (
		uuid TEXT PRIMARY KEY,
		resource_uuid TEXT NOT NULL,
		author_uuid TEXT NOT NULL,
		text TEXT NOT NULL,
		created_at INTEGER DEFAULT (unixepoch()),
		updated_at INTEGER DEFAULT (unixepoch()),
		FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
		FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE
	)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_resource ON comments(resource_uuid)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_uuid)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC)`,

    // ── Rate Limits ──
    `CREATE TABLE IF NOT EXISTS rate_limits (
		key TEXT PRIMARY KEY,
		count INTEGER DEFAULT 1,
		timestamp INTEGER DEFAULT (unixepoch())
	)`,
    `CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits(timestamp)`,

    // ── Wiki Comments ──
    `CREATE TABLE IF NOT EXISTS wiki_comments (
		uuid TEXT PRIMARY KEY,
		author_uuid TEXT NOT NULL,
		text TEXT NOT NULL,
		created_at INTEGER DEFAULT (unixepoch()),
		FOREIGN KEY(author_uuid) REFERENCES users(uuid) ON DELETE CASCADE
	)`,
    `CREATE INDEX IF NOT EXISTS idx_wiki_comments_created_at ON wiki_comments(created_at DESC)`,

    // ── Resource History ──
    `CREATE TABLE IF NOT EXISTS resource_history (
		uuid TEXT PRIMARY KEY,
		resource_uuid TEXT NOT NULL,
		actor_uuid TEXT NOT NULL,
		change_type TEXT NOT NULL,
		previous_data TEXT NOT NULL,
		created_at INTEGER DEFAULT (unixepoch()),
		FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
		FOREIGN KEY(actor_uuid) REFERENCES users(uuid)
	)`,
    `CREATE INDEX IF NOT EXISTS idx_resource_history_resource ON resource_history(resource_uuid, created_at DESC)`,

    // ── Tags ──
    `CREATE TABLE IF NOT EXISTS tags (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE NOT NULL
	)`,
    `CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)`,

    // ── Resource ↔ Tags junction ──
    `CREATE TABLE IF NOT EXISTS resource_tags (
		resource_uuid TEXT NOT NULL,
		tag_id INTEGER NOT NULL,
		PRIMARY KEY (resource_uuid, tag_id),
		FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE,
		FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
	)`,

    // ── User Favorites ──
    `CREATE TABLE IF NOT EXISTS user_favorites (
		user_uuid TEXT NOT NULL,
		resource_uuid TEXT NOT NULL,
		display_order INTEGER DEFAULT 0,
		created_at INTEGER DEFAULT (unixepoch()),
		PRIMARY KEY (user_uuid, resource_uuid),
		FOREIGN KEY(user_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
		FOREIGN KEY(resource_uuid) REFERENCES resources(uuid) ON DELETE CASCADE
	)`,
    `CREATE INDEX IF NOT EXISTS idx_user_favorites_user_order ON user_favorites(user_uuid, display_order DESC)`,
];

// Execute each statement individually — D1 exec() does not support multi-statement strings
for (const sql of statements) {
    await env.DB.prepare(sql).run();
}
