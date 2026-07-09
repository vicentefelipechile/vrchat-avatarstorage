// =========================================================================================================
// AUTHOR REPOSITORY
// =========================================================================================================
// The ONLY place `avatar_authors` SQL lives. Also owns the read-side joins into
// `avatar_meta`/`resources` that answer author-scoped questions (resource counts, an
// author's avatar list, the linked-avatar guard). The cross-table write for
// link-resource (history snapshot + avatar_meta update) is composed here as statement
// factories and run as a batch by the service.
//
// Methods return DB row types; mapping to the API shape is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, queryAll, execute, type DB } from '../db/client';
import type { AvatarAuthorRow } from '../db/schema';

// =========================================================================================================
// Types
// =========================================================================================================

export type AuthorWithCount = AvatarAuthorRow & { resource_count: number };

/** Editable author columns (whitelist — never interpolate keys). `slug` is derived, not edited directly. */
const EDITABLE_COLUMNS = [
	'name',
	'description',
	'avatar_url',
	'website_url',
	'twitter_url',
	'booth_url',
	'gumroad_url',
	'patreon_url',
	'discord_url',
] as const;

export type EditableAuthorColumn = (typeof EDITABLE_COLUMNS)[number];

/** Full insert payload for a new author row. */
export interface InsertAuthorInput {
	uuid: string;
	name: string;
	slug: string;
	description: string | null;
	avatar_url: string | null;
	website_url: string | null;
	twitter_url: string | null;
	booth_url: string | null;
	gumroad_url: string | null;
	patreon_url: string | null;
	discord_url: string | null;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class AuthorRepository {
	static readonly EDITABLE_COLUMNS = EDITABLE_COLUMNS;

	constructor(private readonly db: DB) {}

	// -------------------------------------------------------------------------
	// Reads
	// -------------------------------------------------------------------------

	/** Total author count (for pagination). */
	async count(): Promise<number> {
		const row = await queryOne<{ total: number }>(this.db, 'SELECT COUNT(*) AS total FROM avatar_authors');
		return row?.total ?? 0;
	}

	/** Paginated author list with a linked-avatar count per author. */
	list(limit: number, offset: number): Promise<AuthorWithCount[]> {
		return queryAll<AuthorWithCount>(
			this.db,
			`SELECT aa.*, COUNT(am.resource_uuid) AS resource_count
			 FROM avatar_authors aa
			 LEFT JOIN avatar_meta am ON aa.uuid = am.author_uuid
			 GROUP BY aa.uuid
			 ORDER BY aa.name ASC
			 LIMIT ? OFFSET ?`,
			[limit, offset],
		);
	}

	/** Autocomplete by name — lightweight (uuid/name/slug only). */
	searchByName(pattern: string, limit: number): Promise<{ uuid: string; name: string; slug: string }[]> {
		return queryAll<{ uuid: string; name: string; slug: string }>(
			this.db,
			'SELECT uuid, name, slug FROM avatar_authors WHERE name LIKE ? LIMIT ?',
			[pattern, limit],
		);
	}

	/** Full author row by slug. */
	findBySlug(slug: string): Promise<AvatarAuthorRow | null> {
		return queryOne<AvatarAuthorRow>(this.db, 'SELECT * FROM avatar_authors WHERE slug = ?', [slug]);
	}

	/** Count of active avatars belonging to an author (for the profile pagination). */
	async countAvatars(authorUuid: string): Promise<number> {
		const row = await queryOne<{ total: number }>(
			this.db,
			'SELECT COUNT(*) AS total FROM avatar_meta WHERE author_uuid = ?',
			[authorUuid],
		);
		return row?.total ?? 0;
	}

	/** A page of an author's active avatars (card shape used by the public profile). */
	listAvatars(authorUuid: string, limit: number, offset: number): Promise<Record<string, unknown>[]> {
		return queryAll<Record<string, unknown>>(
			this.db,
			`SELECT r.uuid, r.title, r.download_count, r.created_at, m.r2_key AS thumbnail_key, m.uuid AS thumbnail_media_uuid,
				m.placeholder_blur,
				am.gender, am.avatar_type, am.platform, am.is_nsfw
			FROM resources r
			INNER JOIN avatar_meta am ON r.uuid = am.resource_uuid
			LEFT JOIN media m ON r.thumbnail_uuid = m.uuid
			WHERE am.author_uuid = ? AND r.is_active = 1
			ORDER BY r.created_at DESC
			LIMIT ? OFFSET ?`,
			[authorUuid, limit, offset],
		);
	}

	/** How many avatars reference this author (the delete guard). */
	async countLinkedAvatars(authorUuid: string): Promise<number> {
		const row = await queryOne<{ count: number }>(
			this.db,
			'SELECT COUNT(*) AS count FROM avatar_meta WHERE author_uuid = ?',
			[authorUuid],
		);
		return row?.count ?? 0;
	}

	/** Current author fields of a resource's avatar_meta (snapshotted before a re-link). */
	findMetaAuthor(resourceUuid: string): Promise<{ author_uuid: string | null; author_name_raw: string | null } | null> {
		return queryOne<{ author_uuid: string | null; author_name_raw: string | null }>(
			this.db,
			'SELECT author_uuid, author_name_raw FROM avatar_meta WHERE resource_uuid = ?',
			[resourceUuid],
		);
	}

	// -------------------------------------------------------------------------
	// Writes
	// -------------------------------------------------------------------------

	/** Insert a new author. Bubbles a UNIQUE constraint failure up to the service (→ 409). */
	async insert(a: InsertAuthorInput): Promise<void> {
		await execute(
			this.db,
			`INSERT INTO avatar_authors (uuid, name, slug, description, avatar_url, website_url, twitter_url, booth_url, gumroad_url, patreon_url, discord_url, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
			[
				a.uuid,
				a.name,
				a.slug,
				a.description,
				a.avatar_url,
				a.website_url,
				a.twitter_url,
				a.booth_url,
				a.gumroad_url,
				a.patreon_url,
				a.discord_url,
			],
		);
	}

	/** Partial UPDATE from a whitelisted set/bindings pair built by the service (always bumps updated_at). */
	async update(uuid: string, setClauses: string[], setBindings: unknown[]): Promise<void> {
		await execute(
			this.db,
			`UPDATE avatar_authors SET ${['updated_at = unixepoch()', ...setClauses].join(', ')} WHERE uuid = ?`,
			[...setBindings, uuid],
		);
	}

	/** Delete an author by uuid (the linked-avatar guard is enforced in the service). */
	async delete(uuid: string): Promise<void> {
		await execute(this.db, 'DELETE FROM avatar_authors WHERE uuid = ?', [uuid]);
	}

	// -------------------------------------------------------------------------
	// Cross-table write factories (composed into a single db.batch by the service)
	// -------------------------------------------------------------------------

	/** UPDATE avatar_meta.author_uuid for a resource (paired with a history snapshot in link-resource). */
	buildUpdateMetaAuthor(resourceUuid: string, authorUuid: string): D1PreparedStatement {
		return this.db.prepare('UPDATE avatar_meta SET author_uuid = ? WHERE resource_uuid = ?').bind(authorUuid, resourceUuid);
	}
}
