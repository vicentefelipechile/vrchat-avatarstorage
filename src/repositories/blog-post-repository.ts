// =========================================================================================================
// BLOG POST REPOSITORY
// =========================================================================================================
// The ONLY place `blog_posts` SQL lives (plus the read-side joins into `users`/`media` that hydrate
// a post with its author and cover-image key). Slug-uniqueness lookups, the COALESCE-based partial
// update, and the cover-image cleanup lookups are here too. Methods return DB row types; deciding
// what a row means (not-found, admin-only) is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';
import type { BlogPost, BlogPostWithAuthor } from '../types';

// =========================================================================================================
// Types
// =========================================================================================================

/** Fields a partial post update may set. `cover_image_uuid` uses a sentinel to distinguish
 *  "not provided" (leave as-is) from "provided" (overwrite, possibly to null). */
export interface PostUpdate {
	slug?: string | null;
	title?: string | null;
	content?: string | null;
	excerpt?: string | null;
	coverImageProvided: boolean;
	cover_image_uuid?: string | null;
	author_display?: string | null;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class BlogPostRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** A page of posts, newest first, hydrated with author + cover-image key. */
	listHydrated(limit: number, offset: number): Promise<BlogPostWithAuthor[]> {
		return queryAll<BlogPostWithAuthor>(
			this.db,
			`SELECT
				bp.*,
				bp.created_at,
				u.username AS author_username,
				u.avatar_url AS author_avatar,
				m.r2_key AS cover_image_key
			FROM blog_posts bp
			JOIN users u ON bp.author_uuid = u.uuid
			LEFT JOIN media m ON bp.cover_image_uuid = m.uuid
			ORDER BY bp.created_at DESC
			LIMIT ? OFFSET ?`,
			[limit, offset],
		);
	}

	/** Total post count (for pagination). */
	async count(): Promise<number> {
		const row = await queryOne<{ count: number }>(this.db, 'SELECT COUNT(*) AS count FROM blog_posts');
		return row?.count ?? 0;
	}

	/** A single post by uuid, hydrated with author + cover-image key, or null. */
	findHydrated(uuid: string): Promise<BlogPostWithAuthor | null> {
		return queryOne<BlogPostWithAuthor>(
			this.db,
			`SELECT
				bp.*,
				bp.created_at,
				u.username AS author_username,
				u.avatar_url AS author_avatar,
				m.r2_key AS cover_image_key
			FROM blog_posts bp
			JOIN users u ON bp.author_uuid = u.uuid
			LEFT JOIN media m ON bp.cover_image_uuid = m.uuid
			WHERE bp.uuid = ?`,
			[uuid],
		);
	}

	/** Minimal post lookup (uuid + slug) for existence/slug checks, or null. */
	findBasic(uuid: string): Promise<Pick<BlogPost, 'uuid' | 'slug'> | null> {
		return queryOne<Pick<BlogPost, 'uuid' | 'slug'>>(this.db, 'SELECT uuid, slug FROM blog_posts WHERE uuid = ?', [uuid]);
	}

	/** SEO/OG lookup: just the fields the SSR meta-tag injection needs (title, excerpt, cover uuid), or null. */
	findForSeo(uuid: string): Promise<{ uuid: string; title: string; excerpt: string | null; cover_image_uuid: string | null } | null> {
		return queryOne<{ uuid: string; title: string; excerpt: string | null; cover_image_uuid: string | null }>(
			this.db,
			'SELECT uuid, title, excerpt, cover_image_uuid FROM blog_posts WHERE uuid = ?',
			[uuid],
		);
	}

	/** Whether a post with this uuid exists. */
	async exists(uuid: string): Promise<boolean> {
		const row = await queryOne<{ one: number }>(this.db, 'SELECT 1 AS one FROM blog_posts WHERE uuid = ?', [uuid]);
		return row !== null;
	}

	/** Whether a slug is already taken (optionally excluding one post uuid, for updates). */
	async slugExists(slug: string, excludeUuid?: string): Promise<boolean> {
		const row = excludeUuid
			? await queryOne<{ uuid: string }>(this.db, 'SELECT uuid FROM blog_posts WHERE slug = ? AND uuid != ? LIMIT 1', [slug, excludeUuid])
			: await queryOne<{ uuid: string }>(this.db, 'SELECT uuid FROM blog_posts WHERE slug = ? LIMIT 1', [slug]);
		return row !== null;
	}

	/** The cover_image_uuid of a post, or null if the post doesn't exist / has no cover. */
	async findCoverImageUuid(uuid: string): Promise<string | null> {
		const row = await queryOne<{ cover_image_uuid: string | null }>(
			this.db,
			'SELECT cover_image_uuid FROM blog_posts WHERE uuid = ?',
			[uuid],
		);
		return row?.cover_image_uuid ?? null;
	}

	/** The r2_key of a media row by uuid (for cover-image R2 cleanup), or null. */
	async findMediaKey(mediaUuid: string): Promise<string | null> {
		const row = await queryOne<{ r2_key: string }>(this.db, 'SELECT r2_key FROM media WHERE uuid = ?', [mediaUuid]);
		return row?.r2_key ?? null;
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a new post. Timestamps are unix seconds. */
	async insert(
		uuid: string,
		slug: string,
		title: string,
		content: string,
		excerpt: string | null,
		coverImageUuid: string | null,
		authorUuid: string,
		authorDisplay: string,
		now: number,
	): Promise<void> {
		await execute(
			this.db,
			`INSERT INTO blog_posts (uuid, slug, title, content, excerpt, cover_image_uuid, author_uuid, author_display, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[uuid, slug, title, content, excerpt, coverImageUuid, authorUuid, authorDisplay, now, now],
		);
	}

	/** Partial update via COALESCE; `cover_image_uuid` is only overwritten when explicitly provided. */
	async update(uuid: string, updates: PostUpdate, now: number): Promise<void> {
		await execute(
			this.db,
			`UPDATE blog_posts SET
				slug = COALESCE(?, slug),
				title = COALESCE(?, title),
				content = COALESCE(?, content),
				excerpt = COALESCE(?, excerpt),
				cover_image_uuid = CASE WHEN ? = 1 THEN ? ELSE cover_image_uuid END,
				author_display = COALESCE(?, author_display),
				updated_at = ?
			WHERE uuid = ?`,
			[
				updates.slug ?? null,
				updates.title ?? null,
				updates.content ?? null,
				updates.excerpt ?? null,
				updates.coverImageProvided ? 1 : 0,
				updates.cover_image_uuid ?? null,
				updates.author_display ?? null,
				now,
				uuid,
			],
		);
	}

	/** Delete a post by uuid. */
	async delete(uuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM blog_posts WHERE uuid = ?', [uuid]);
	}

	/** Delete a media row by uuid (used during cover-image cleanup). */
	async deleteMedia(mediaUuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM media WHERE uuid = ?', [mediaUuid]);
	}
}
