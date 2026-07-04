// =========================================================================================================
// WIKI COMMENT REPOSITORY
// =========================================================================================================
// The ONLY place `wiki_comments` SQL lives, plus the read-side join into `users` that hydrates a
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

/** One hydrated wiki comment as returned to the API (author fields joined, ms timestamp). */
export interface WikiComment {
	uuid: string;
	text: string;
	timestamp: number;
	author: string;
	author_avatar: string;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class WikiCommentRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** The 50 most recent global wiki comments, newest first, hydrated with author username/avatar. */
	list(): Promise<WikiComment[]> {
		return queryAll<WikiComment>(
			this.db,
			`SELECT
				c.uuid,
				c.text,
				(c.created_at * 1000) AS timestamp,
				u.username AS author,
				u.avatar_url AS author_avatar
			FROM wiki_comments c
			JOIN users u ON c.author_uuid = u.uuid
			ORDER BY c.created_at DESC
			LIMIT 50`,
		);
	}

	/** A user's uuid + avatar_url by username, or null if the user doesn't exist. */
	findUserByUsername(username: string): Promise<{ uuid: string; avatar_url: string } | null> {
		return queryOne<{ uuid: string; avatar_url: string }>(
			this.db,
			'SELECT uuid, avatar_url FROM users WHERE username = ?',
			[username],
		);
	}

	/** The author_uuid of a comment, or null if it doesn't exist (for ownership checks). */
	findAuthor(commentUuid: string): Promise<{ author_uuid: string } | null> {
		return queryOne<{ author_uuid: string }>(
			this.db,
			'SELECT author_uuid FROM wiki_comments WHERE uuid = ?',
			[commentUuid],
		);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a new global wiki comment. */
	async insert(uuid: string, authorUuid: string, text: string): Promise<void> {
		await execute(
			this.db,
			'INSERT INTO wiki_comments (uuid, author_uuid, text) VALUES (?, ?, ?)',
			[uuid, authorUuid, text],
		);
	}

	/** Delete a wiki comment by uuid. */
	async delete(commentUuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM wiki_comments WHERE uuid = ?', [commentUuid]);
	}
}
