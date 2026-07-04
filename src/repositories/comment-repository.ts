// =========================================================================================================
// COMMENT REPOSITORY
// =========================================================================================================
// The ONLY place `comments` SQL lives, plus the read-side join into `users` that hydrates a
// comment with its author's username/avatar. Existence lookups for the resource and the author's
// avatar are here too. Methods return DB row types; deciding what they mean (not-found, ownership)
// is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';

// =========================================================================================================
// Types
// =========================================================================================================

/** One hydrated comment as returned to the API (author fields joined, ms timestamp). */
export interface HydratedComment {
	uuid: string;
	text: string;
	timestamp: number;
	author: string;
	author_avatar: string | null;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class CommentRepository {
	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** All comments for a resource, oldest first, hydrated with author username/avatar. */
	listByResource(resourceUuid: string): Promise<HydratedComment[]> {
		return queryAll<HydratedComment>(
			this.db,
			`SELECT
				c.uuid,
				c.text,
				(c.created_at * 1000) AS timestamp,
				u.username AS author,
				u.avatar_url AS author_avatar
			FROM comments c
			JOIN users u ON c.author_uuid = u.uuid
			WHERE c.resource_uuid = ?
			ORDER BY c.created_at ASC`,
			[resourceUuid],
		);
	}

	/** Whether an active resource with this uuid exists. */
	async resourceExists(resourceUuid: string): Promise<boolean> {
		const row = await queryOne<{ one: number }>(
			this.db,
			'SELECT 1 AS one FROM resources WHERE uuid = ? AND is_active = 1',
			[resourceUuid],
		);
		return row !== null;
	}

	/** The avatar_url of a user by username, or null if the user doesn't exist. */
	findAvatarByUsername(username: string): Promise<{ avatar_url: string | null } | null> {
		return queryOne<{ avatar_url: string | null }>(
			this.db,
			'SELECT avatar_url FROM users WHERE username = ?',
			[username],
		);
	}

	/** The author_uuid of a comment, or null if it doesn't exist (for ownership checks). */
	findAuthor(commentUuid: string): Promise<{ author_uuid: string } | null> {
		return queryOne<{ author_uuid: string }>(
			this.db,
			'SELECT author_uuid FROM comments WHERE uuid = ?',
			[commentUuid],
		);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a new comment. */
	async insert(uuid: string, resourceUuid: string, authorUuid: string, text: string): Promise<void> {
		await execute(
			this.db,
			'INSERT INTO comments (uuid, resource_uuid, author_uuid, text) VALUES (?, ?, ?, ?)',
			[uuid, resourceUuid, authorUuid, text],
		);
	}

	/** Delete a comment by uuid. */
	async delete(commentUuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM comments WHERE uuid = ?', [commentUuid]);
	}
}
