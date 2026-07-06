// =========================================================================================================
// COMMENT SERVICE
// =========================================================================================================
// Business logic for resource comments: list, create (with UUID guard, resource-exists check,
// Turnstile CAPTCHA, and the created-comment response shape), and delete (author-or-admin).
// Owns the rules; all SQL lives in CommentRepository.
//
// Error mapping reproduces the legacy status codes exactly:
//   - malformed resource id         → ValidationError (400)
//   - author user record missing    → NotFoundError   (404)
//   - resource missing/inactive     → NotFoundError   (404)
//   - failed CAPTCHA                 → ForbiddenError  (403)
//   - comment missing (delete)      → NotFoundError   (404)
//   - not author and not admin       → ForbiddenError  (403)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import type { DB } from '../db/client';
import { CommentRepository, type HydratedComment } from '../repositories/comment-repository';
import { ChangeFeedRepository } from '../repositories/change-feed-repository';
import { FeedPublisher } from './feed-publisher';
import { verifyTurnstile } from '../helpers/turnstile';
import { ValidationError, NotFoundError, ForbiddenError } from '../domain/errors';

// =========================================================================================================
// Helpers
// =========================================================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =========================================================================================================
// Types
// =========================================================================================================

/** The response shape for a newly created comment (matches the legacy payload). */
export interface CreatedComment {
	uuid: string;
	resourceUuid: string;
	author: string;
	author_avatar: string | null;
	text: string;
	timestamp: number;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class CommentService {
	private readonly repo: CommentRepository;
	private readonly changeFeed: ChangeFeedRepository;

	constructor(db: DB) {
		this.repo = new CommentRepository(db);
		this.changeFeed = new ChangeFeedRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** All comments for a resource. Throws ValidationError on a malformed resource id. */
	list(resourceUuid: string): Promise<HydratedComment[]> {
		if (!UUID_RE.test(resourceUuid)) throw new ValidationError('Invalid resource ID');
		return this.repo.listByResource(resourceUuid);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/**
	 * Create a comment on a resource. Validates the resource id, confirms the author's user
	 * record exists (for the avatar), checks the resource is active, and requires a passing
	 * Turnstile token. `turnstileSecret` is passed in so the service stays env-agnostic.
	 */
	async create(
		user: AuthUser,
		resourceUuid: string,
		text: string,
		token: string,
		turnstileSecret: string,
		feed: Env['FEED'],
	): Promise<CreatedComment> {
		const author = await this.repo.findAvatarByUsername(user.username);
		if (!author) throw new NotFoundError('User not found');

		if (!UUID_RE.test(resourceUuid)) throw new ValidationError('Invalid resource ID');

		if (!(await this.repo.resourceExists(resourceUuid))) throw new NotFoundError('Resource not found');

		const isValid = await verifyTurnstile(token || '', turnstileSecret);
		if (!isValid) throw new ForbiddenError('Invalid CAPTCHA');

		const uuid = crypto.randomUUID();
		await this.repo.insert(uuid, resourceUuid, user.uuid, text);

		// Announce the comment. The insert already succeeded, so neither the durable bump nor the live
		// broadcast may fail the request — a miss only leaves it unannounced until the next change.
		await this.changeFeed.bump('comments', resourceUuid).catch(() => {});
		await new FeedPublisher(feed).publish({ scope: 'comments', action: 'created', entityId: resourceUuid });

		return {
			uuid,
			resourceUuid,
			author: user.username,
			author_avatar: author.avatar_url,
			text,
			timestamp: Date.now(),
		};
	}

	/** Delete a comment. Only the author or an admin may delete it. */
	async delete(user: AuthUser, commentUuid: string): Promise<void> {
		const comment = await this.repo.findAuthor(commentUuid);
		if (!comment) throw new NotFoundError('Comment not found');

		if (!user.is_admin && user.uuid !== comment.author_uuid) throw new ForbiddenError('Forbidden');

		await this.repo.delete(commentUuid);
	}
}
