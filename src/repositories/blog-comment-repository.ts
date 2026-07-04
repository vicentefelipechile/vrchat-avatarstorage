// =========================================================================================================
// BLOG COMMENT REPOSITORY
// =========================================================================================================
// The ONLY place `blog_comments` SQL lives, plus the read-side join into `users` that hydrates a
// comment with its author's username/avatar. The author-avatar lookup and the ownership lookup are
// here too. Methods return DB row types; deciding what they mean (not-found, ownership) is the
// service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';

// =========================================================================================================
// Types
// =========================================================================================================

/** One hydrated blog comment as returned to the API (author fields joined, ms timestamp). */
export interface BlogComment {
	uuid: string;
	text: string;
	timestamp: number;
	author: string;
	author_avatar: string | null;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class BlogCommentRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** A page of comments for a post, oldest first, hydrated with author username/avatar. */
	listByPost(postUuid: string, limit: number, offset: number): Promise<BlogComment[]> {
		return queryAll<BlogComment>(
			this.db,
			`SELECT
				bc.uuid,
				bc.text,
				(bc.created_at * 1000) AS timestamp,
				u.username AS author,
				u.avatar_url AS author_avatar
			FROM blog_comments bc
			JOIN users u ON bc.author_uuid = u.uuid
			WHERE bc.post_uuid = ?
			ORDER BY bc.created_at ASC
			LIMIT ? OFFSET ?`,
			[postUuid, limit, offset],
		);
	}

	/** A user's uuid + avatar_url by username, or null if the user doesn't exist. */
	findUserByUsername(username: string): Promise<{ uuid: string; avatar_url: string | null } | null> {
		return queryOne<{ uuid: string; avatar_url: string | null }>(
			this.db,
			'SELECT uuid, avatar_url FROM users WHERE username = ?',
			[username],
		);
	}

	/** The author_uuid of a comment, or null if it doesn't exist (for ownership checks). */
	findAuthor(commentUuid: string): Promise<{ author_uuid: string } | null> {
		return queryOne<{ author_uuid: string }>(this.db, 'SELECT author_uuid FROM blog_comments WHERE uuid = ?', [commentUuid]);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a new blog comment. `now` is unix seconds. */
	async insert(uuid: string, postUuid: string, authorUuid: string, text: string, now: number): Promise<void> {
		await execute(
			this.db,
			'INSERT INTO blog_comments (uuid, post_uuid, author_uuid, text, created_at) VALUES (?, ?, ?, ?, ?)',
			[uuid, postUuid, authorUuid, text, now],
		);
	}

	/** Delete a blog comment by uuid. */
	async delete(commentUuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM blog_comments WHERE uuid = ?', [commentUuid]);
	}
}
