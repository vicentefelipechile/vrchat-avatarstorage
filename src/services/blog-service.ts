// =========================================================================================================
// BLOG SERVICE
// =========================================================================================================
// Business logic for the blog: post CRUD (admin-gated at the route via requireAdmin, so these
// methods assume authorization already happened) and blog comments. Owns slug generation +
// uniqueness, the partial-update shaping, the cover-image cleanup coordination, and the comment
// rules; all SQL lives in BlogPostRepository / BlogCommentRepository.
//
// Env collaborators that can't live in a service (the KV list cache and the R2 bucket) are passed
// INTO the methods that need them, keeping the service itself env-agnostic. The route supplies them.
//
// Error mapping reproduces the legacy status codes exactly:
//   - post missing (get/update/delete/comment) → NotFoundError  (404)
//   - comment author user record missing        → NotFoundError  (404)
//   - failed CAPTCHA                             → ForbiddenError (403)
//   - comment missing (delete)                  → NotFoundError  (404)
//   - not comment author and not admin           → ForbiddenError (403)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import type { DB } from '../db/client';
import type { BlogPostWithAuthor } from '../types';
import { BlogPostRepository } from '../repositories/blog-post-repository';
import { BlogCommentRepository, type BlogComment } from '../repositories/blog-comment-repository';
import { ChangeFeedRepository } from '../repositories/change-feed-repository';
import { FeedPublisher } from './feed-publisher';
import { verifyTurnstile } from '../helpers/turnstile';
import { NotFoundError, ForbiddenError } from '../domain/errors';

// =========================================================================================================
// Types
// =========================================================================================================

/** Result of a paginated post list. */
export interface PostListResult {
	data: BlogPostWithAuthor[];
	total: number;
}

/** Validated create input (shape from BlogPostSchema). */
export interface CreatePostInput {
	title: string;
	content: string;
	excerpt?: string | null;
	cover_image_uuid?: string | null;
	author_display: string;
}

/** Validated update input (shape from BlogPostUpdateSchema — every field optional). */
export interface UpdatePostInput {
	title?: string;
	content?: string;
	excerpt?: string | null;
	cover_image_uuid?: string | null;
	author_display?: string;
}

/** The response shape for a newly created blog comment (matches the legacy payload). */
export interface CreatedBlogComment {
	uuid: string;
	text: string;
	timestamp: number;
	author: string;
	author_avatar: string | null;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class BlogService {
	private readonly posts: BlogPostRepository;
	private readonly comments: BlogCommentRepository;
	private readonly changeFeed: ChangeFeedRepository;

	constructor(db: DB) {
		this.posts = new BlogPostRepository(db);
		this.comments = new BlogCommentRepository(db);
		this.changeFeed = new ChangeFeedRepository(db);
	}

	// -------------------------------------------------------------------------
	// Slug helpers
	// -------------------------------------------------------------------------

	/** Convert a title into a URL-friendly slug. e.g. "Hello World! (2026)" → "hello-world-2026" */
	private slugify(title: string): string {
		return title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '') // strip accents
			.replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric
			.trim()
			.replace(/[\s]+/g, '-') // spaces to hyphens
			.replace(/-+/g, '-') // collapse multiple hyphens
			.slice(0, 100);
	}

	/** Ensure a slug is unique, appending a numeric suffix if needed (e.g. hello-world-2). */
	private async uniqueSlug(base: string, excludeUuid?: string): Promise<string> {
		let candidate = base;
		let attempts = 0;
		while (await this.posts.slugExists(candidate, excludeUuid)) {
			attempts++;
			candidate = `${base}-${attempts + 1}`;
		}
		return candidate;
	}

	// -------------------------------------------------------------------------
	// Post reads
	// -------------------------------------------------------------------------

	/** A page of posts + the total count (the route owns the KV list cache around this). */
	async listPosts(limit: number, offset: number): Promise<PostListResult> {
		const [data, total] = await Promise.all([this.posts.listHydrated(limit, offset), this.posts.count()]);
		return { data, total };
	}

	/** A single post by uuid. Throws NotFoundError if it doesn't exist. */
	async getPost(uuid: string): Promise<BlogPostWithAuthor> {
		const post = await this.posts.findHydrated(uuid);
		if (!post) throw new NotFoundError('Post not found');
		return post;
	}

	// -------------------------------------------------------------------------
	// Post writes (admin-gated at the route)
	// -------------------------------------------------------------------------

	/** Create a post; generates a unique slug. Returns the summary payload the legacy handler returned. */
	async createPost(authorUuid: string, input: CreatePostInput, feed: Env['FEED']): Promise<{ uuid: string; slug: string; title: string; author_display: string; created_at: number }> {
		const uuid = crypto.randomUUID();
		const slug = await this.uniqueSlug(this.slugify(input.title));
		const now = Math.floor(Date.now() / 1000);

		await this.posts.insert(
			uuid,
			slug,
			input.title,
			input.content,
			input.excerpt ?? null,
			input.cover_image_uuid ?? null,
			authorUuid,
			input.author_display,
			now,
		);

		// Announce the post. The insert already succeeded, so neither the durable bump nor the live
		// broadcast may fail the request — a miss only leaves it unannounced until the next change.
		await this.changeFeed.bump('blog', uuid).catch(() => {});
		await new FeedPublisher(feed).publish({ scope: 'blog', action: 'created', entityId: uuid });

		return { uuid, slug, title: input.title, author_display: input.author_display, created_at: now };
	}

	/** Update a post (partial). Recalculates the slug if the title changed. Throws NotFoundError. */
	async updatePost(uuid: string, input: UpdatePostInput): Promise<{ uuid: string; slug: string }> {
		const existing = await this.posts.findBasic(uuid);
		if (!existing) throw new NotFoundError('Post not found');

		const now = Math.floor(Date.now() / 1000);

		let slug = existing.slug;
		if (input.title) slug = await this.uniqueSlug(this.slugify(input.title), uuid);

		await this.posts.update(
			uuid,
			{
				slug: input.title ? slug : null,
				title: input.title ?? null,
				content: input.content ?? null,
				excerpt: input.excerpt ?? null,
				coverImageProvided: input.cover_image_uuid !== undefined,
				cover_image_uuid: input.cover_image_uuid ?? null,
				author_display: input.author_display ?? null,
			},
			now,
		);

		return { uuid, slug };
	}

	/**
	 * Delete a post and clean up its cover image from R2 + the media table. The blog_posts FK uses
	 * ON DELETE SET NULL (post → media doesn't cascade), so the media record would be orphaned
	 * without this explicit cleanup. Throws NotFoundError if the post doesn't exist. The R2 bucket
	 * is passed in so the service stays env-agnostic.
	 */
	async deletePost(uuid: string, bucket: R2Bucket): Promise<void> {
		if (!(await this.posts.exists(uuid))) throw new NotFoundError('Post not found');

		const coverImageUuid = await this.posts.findCoverImageUuid(uuid);
		if (coverImageUuid) {
			const r2Key = await this.posts.findMediaKey(coverImageUuid);
			if (r2Key) {
				await bucket.delete(r2Key);
				await this.posts.deleteMedia(coverImageUuid);
			}
		}

		await this.posts.delete(uuid);
	}

	// -------------------------------------------------------------------------
	// Comments
	// -------------------------------------------------------------------------

	/** A page of comments for a post. */
	listComments(postUuid: string, limit: number, offset: number): Promise<BlogComment[]> {
		return this.comments.listByPost(postUuid, limit, offset);
	}

	/**
	 * Create a comment on a post. Confirms the post exists and the author's user record exists (for
	 * the avatar), and requires a passing Turnstile token. `turnstileSecret` is passed in.
	 */
	async createComment(user: AuthUser, postUuid: string, text: string, token: string, turnstileSecret: string): Promise<CreatedBlogComment> {
		if (!(await this.posts.exists(postUuid))) throw new NotFoundError('Post not found');

		const author = await this.comments.findUserByUsername(user.username);
		if (!author) throw new NotFoundError('User not found');

		const isValid = await verifyTurnstile(token || '', turnstileSecret);
		if (!isValid) throw new ForbiddenError('Invalid CAPTCHA');

		const uuid = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);
		await this.comments.insert(uuid, postUuid, author.uuid, text, now);

		return { uuid, text, timestamp: now * 1000, author: user.username, author_avatar: author.avatar_url };
	}

	/** Delete a blog comment. Only the author or an admin may delete it. */
	async deleteComment(user: AuthUser, commentUuid: string): Promise<void> {
		const comment = await this.comments.findAuthor(commentUuid);
		if (!comment) throw new NotFoundError('Comment not found');

		if (!user.is_admin && user.uuid !== comment.author_uuid) throw new ForbiddenError('Forbidden');

		await this.comments.delete(commentUuid);
	}
}
