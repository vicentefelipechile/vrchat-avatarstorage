// =========================================================================================================
// DB SCHEMA — ROW TYPES
// =========================================================================================================
// TypeScript row types mirroring the D1 tables exactly (snake_case columns, INTEGER
// booleans as `number`). These describe what the database returns; they are NOT the
// API response shapes — those live in the domain layer and are mapped by services.
//
// During the rewrite these are added table-by-table as each domain is migrated.
// The legacy `src/types.ts` remains the source of truth until a domain is ported here.
// =========================================================================================================

// =========================================================================================================
// Enums / unions
// =========================================================================================================

export const RESOURCE_CATEGORIES = ['avatars', 'worlds', 'assets', 'clothes'] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export type LinkType = 'download' | 'demo' | 'documentation' | 'general';

// =========================================================================================================
// Shared SQL fragments
// =========================================================================================================

/**
 * A `processed` (0/1) select expression: 1 once the media has CDN variants, i.e. the upload queue has
 * finished the image pipeline. Correlates on a media alias — pass the alias the surrounding query uses
 * for the `media` row (e.g. `m`, `tm`). The frontend reads this to decide whether to show the image or
 * the "processing" placeholder + poll for readiness. Kept here so every listing/detail query derives
 * the state the same way instead of persisting a column on `media` that could desync.
 */
export function processedExpr(mediaAlias: string): string {
	return `EXISTS(SELECT 1 FROM media_variants mv WHERE mv.media_uuid = ${mediaAlias}.uuid) AS processed`;
}

// =========================================================================================================
// resources
// =========================================================================================================

export interface ResourceRow {
	uuid: string;
	title: string;
	description: string | null;
	category: ResourceCategory;
	thumbnail_uuid: string;
	reference_image_uuid: string | null;
	author_uuid: string;
	download_count: number;
	is_active: number; // 0 | 1
	created_at: number; // unix seconds
	updated_at: number; // unix seconds
}

// =========================================================================================================
// resource_links
// =========================================================================================================

export interface ResourceLinkRow {
	uuid: string;
	resource_uuid: string;
	link_url: string;
	link_title: string | null;
	link_type: LinkType;
	display_order: number;
	created_at: number;
}

// =========================================================================================================
// media
// =========================================================================================================
// A stored file (image / video / private archive) in R2. `media_type` decides whether the
// file is public inline media or a private download that requires auth.

export interface MediaRow {
	uuid: string;
	r2_key: string;
	media_type: 'image' | 'video' | 'file';
	file_name: string;
	placeholder_blur: string | null;
	created_at: number;
}

// =========================================================================================================
// comments
// =========================================================================================================

export interface CommentRow {
	uuid: string;
	resource_uuid: string;
	author_uuid: string;
	text: string;
	created_at: number;
	updated_at: number;
}

// =========================================================================================================
// resource_history
// =========================================================================================================

export interface ResourceHistoryRow {
	uuid: string;
	resource_uuid: string;
	actor_uuid: string;
	change_type: string;
	previous_data: string; // JSON string
	created_at: number;
}

// =========================================================================================================
// avatar_meta
// =========================================================================================================
// Mirrors the DB columns exactly. Note the column is `gender` (the legacy API renames
// it to `avatar_gender` in the response — that mapping is the service's job).

export interface AvatarMetaRow {
	resource_uuid: string;
	author_uuid: string | null;
	author_name_raw: string | null;
	gender: string;
	avatar_size: string;
	avatar_type: string;
	is_nsfw: number;
	has_physbones: number;
	has_face_tracking: number;
	has_dps: number;
	has_gogoloco: number;
	has_toggles: number;
	is_quest_optimized: number;
	sdk_version: string;
	platform: string;
}

// =========================================================================================================
// avatar_authors
// =========================================================================================================

export interface AvatarAuthorRow {
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
	created_at: number;
	updated_at: number;
}

// =========================================================================================================
// asset_meta
// =========================================================================================================

export interface AssetMetaRow {
	resource_uuid: string;
	asset_type: string;
	is_nsfw: number;
	unity_version: string;
	platform: string;
	sdk_version: string;
}

// =========================================================================================================
// clothes_meta
// =========================================================================================================

export interface ClothesMetaRow {
	resource_uuid: string;
	gender_fit: string;
	clothing_type: string;
	is_base: number;
	base_avatar_uuid: string | null;
	base_avatar_name_raw: string | null;
	is_nsfw: number;
	has_physbones: number;
	platform: string;
}
