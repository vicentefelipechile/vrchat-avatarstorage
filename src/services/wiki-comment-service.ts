// =========================================================================================================
// WIKI COMMENT SERVICE
// =========================================================================================================
// Business logic for the global wiki comment wall: list, create (with author lookup for the avatar
// and a Turnstile CAPTCHA), and delete (author-or-admin). Owns the rules; all SQL lives in
// WikiCommentRepository.
//
// Error mapping reproduces the legacy status codes exactly:
//   - author user record missing    → NotFoundError   (404)
//   - failed CAPTCHA                 → ForbiddenError  (403)
//   - comment missing (delete)      → NotFoundError   (404)
//   - not author and not admin       → ForbiddenError  (403)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import type { DB } from '../db/client';
import { WikiCommentRepository, type WikiComment } from '../repositories/wiki-comment-repository';
import { verifyTurnstile } from '../helpers/turnstile';
import { NotFoundError, ForbiddenError } from '../domain/errors';

// =========================================================================================================
// Types
// =========================================================================================================

/** The response shape for a newly created wiki comment (matches the legacy payload). */
export interface CreatedWikiComment {
	uuid: string;
	text: string;
	timestamp: number;
	author: string;
	author_avatar: string;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class WikiCommentService {
	private readonly repo: WikiCommentRepository;

	constructor(db: DB) {
		this.repo = new WikiCommentRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** The 50 most recent global wiki comments. */
	list(): Promise<WikiComment[]> {
		return this.repo.list();
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/**
	 * Create a global wiki comment. Confirms the author's user record exists (for the avatar) and
	 * requires a passing Turnstile token. `turnstileSecret` is passed in so the service stays
	 * env-agnostic.
	 */
	async create(user: AuthUser, text: string, token: string, turnstileSecret: string): Promise<CreatedWikiComment> {
		const author = await this.repo.findUserByUsername(user.username);
		if (!author) throw new NotFoundError('User not found');

		const isValid = await verifyTurnstile(token || '', turnstileSecret);
		if (!isValid) throw new ForbiddenError('Invalid CAPTCHA');

		const uuid = crypto.randomUUID();
		await this.repo.insert(uuid, author.uuid, text);

		return {
			uuid,
			text,
			timestamp: Date.now(),
			author: user.username,
			author_avatar: author.avatar_url,
		};
	}

	/** Delete a wiki comment. Only the author or an admin may delete it. */
	async delete(user: AuthUser, commentUuid: string): Promise<void> {
		const comment = await this.repo.findAuthor(commentUuid);
		if (!comment) throw new NotFoundError('Comment not found');

		if (!user.is_admin && user.uuid !== comment.author_uuid) throw new ForbiddenError('Forbidden');

		await this.repo.delete(commentUuid);
	}
}
