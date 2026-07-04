// =========================================================================================================
// AUTHOR SERVICE
// =========================================================================================================
// Business logic for avatar authors: paginated listing (with linked-avatar counts),
// autocomplete, public profile (author + their avatars), admin CRUD, and linking an
// avatar resource to an author (with a meta_edit history snapshot).
//
// Owns authorization, slug derivation, and the mapping to the legacy API shape so the
// existing frontend keeps working unchanged. All SQL lives in the repositories.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { AuthUser } from '../auth';
import { batch, type DB } from '../db/client';
import { AuthorRepository, type InsertAuthorInput } from '../repositories/author-repository';
import { ResourceRepository } from '../repositories/resource-repository';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Types
// =========================================================================================================

/** Validated author payload (AvatarAuthorSchema output — all fields optional on update). */
export interface AuthorInput {
	name?: string;
	description?: string | null;
	avatar_url?: string | null;
	website_url?: string | null;
	twitter_url?: string | null;
	booth_url?: string | null;
	gumroad_url?: string | null;
	patreon_url?: string | null;
	discord_url?: string | null;
}

// =========================================================================================================
// Helpers
// =========================================================================================================

/** Convert a display name to a URL-friendly slug (lowercase, spaces → hyphens, strip non-alphanum). */
function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-{2,}/g, '-')
		.slice(0, 80);
}

// =========================================================================================================
// Service
// =========================================================================================================

export class AuthorService {
	private readonly repo: AuthorRepository;
	private readonly resources: ResourceRepository;

	constructor(private readonly db: DB) {
		this.repo = new AuthorRepository(db);
		this.resources = new ResourceRepository(db);
	}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Paginated author list (each row carries a resource_count). */
	async list(page: number, limit: number) {
		const offset = (page - 1) * limit;
		const [total, authors] = await Promise.all([this.repo.count(), this.repo.list(limit, offset)]);
		return {
			authors,
			pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 },
		};
	}

	/** Autocomplete by name. Returns [] for an empty query. */
	async searchByName(q: string): Promise<{ uuid: string; name: string; slug: string }[]> {
		const trimmed = q.trim();
		if (!trimmed) return [];
		return this.repo.searchByName(`%${trimmed}%`, 10);
	}

	/** Public author profile: the author record + a page of their active avatars. */
	async profile(slug: string, page: number) {
		const limit = 24;
		const offset = (page - 1) * limit;

		const author = await this.repo.findBySlug(slug);
		if (!author) throw new NotFoundError('Author not found');

		const [total, avatars] = await Promise.all([
			this.repo.countAvatars(author.uuid),
			this.repo.listAvatars(author.uuid, limit, offset),
		]);

		return {
			author,
			avatars,
			pagination: { page, limit, total, hasNextPage: offset + limit < total, hasPrevPage: page > 1 },
		};
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Create an author [admin]. Derives the slug and maps a UNIQUE clash to ConflictError (409). */
	async create(user: AuthUser, input: AuthorInput): Promise<{ uuid: string; slug: string }> {
		if (!user.is_admin) throw new ForbiddenError();
		if (!input.name) throw new ValidationError('Name required');

		const uuid = crypto.randomUUID();
		const slug = toSlug(input.name);

		const row: InsertAuthorInput = {
			uuid,
			name: input.name,
			slug,
			description: input.description ?? null,
			avatar_url: input.avatar_url ?? null,
			website_url: input.website_url ?? null,
			twitter_url: input.twitter_url ?? null,
			booth_url: input.booth_url ?? null,
			gumroad_url: input.gumroad_url ?? null,
			patreon_url: input.patreon_url ?? null,
			discord_url: input.discord_url ?? null,
		};

		try {
			await this.repo.insert(row);
		} catch (e) {
			if (e instanceof Error && e.message.includes('UNIQUE')) {
				throw new ConflictError('Author name or slug already exists');
			}
			throw e;
		}

		return { uuid, slug };
	}

	/** Edit an author [admin] — whitelisted partial update, always bumps updated_at. */
	async update(user: AuthUser, slug: string, input: AuthorInput): Promise<void> {
		if (!user.is_admin) throw new ForbiddenError();

		const author = await this.repo.findBySlug(slug);
		if (!author) throw new NotFoundError('Author not found');

		const setClauses: string[] = [];
		const setBindings: unknown[] = [];
		for (const col of AuthorRepository.EDITABLE_COLUMNS) {
			const v = (input as Record<string, unknown>)[col];
			if (v !== undefined) {
				setClauses.push(`${col} = ?`);
				setBindings.push(v ?? null);
			}
		}

		await this.repo.update(author.uuid, setClauses, setBindings);
	}

	/** Delete an author [admin] — refused (409) if any avatar is still linked. */
	async delete(user: AuthUser, slug: string): Promise<void> {
		if (!user.is_admin) throw new ForbiddenError();

		const author = await this.repo.findBySlug(slug);
		if (!author) throw new NotFoundError('Author not found');

		const linked = await this.repo.countLinkedAvatars(author.uuid);
		if (linked > 0) throw new ConflictError('Cannot delete author with linked avatars. Unlink them first.');

		await this.repo.delete(author.uuid);
	}

	/**
	 * Link an avatar resource to this author [admin]. Snapshots the previous author fields
	 * of the resource's avatar_meta as a `meta_edit` history entry, then re-points
	 * author_uuid — both atomically in one batch.
	 */
	async linkResource(user: AuthUser, slug: string, resourceUuid: string): Promise<void> {
		if (!user.is_admin) throw new ForbiddenError();

		const author = await this.repo.findBySlug(slug);
		if (!author) throw new NotFoundError('Author not found');

		const existing = await this.repo.findMetaAuthor(resourceUuid);
		if (!existing) throw new NotFoundError('Avatar metadata not found for this resource');

		const previousData = JSON.stringify({
			meta_type: 'avatar_meta',
			fields: { author_uuid: existing.author_uuid, author_name_raw: existing.author_name_raw },
		});

		await batch(this.db, [
			this.resources.buildInsertHistory({
				uuid: crypto.randomUUID(),
				resource_uuid: resourceUuid,
				actor_uuid: user.uuid,
				change_type: 'meta_edit',
				previous_data: previousData,
			}),
			this.repo.buildUpdateMetaAuthor(resourceUuid, author.uuid),
		]);
	}
}
