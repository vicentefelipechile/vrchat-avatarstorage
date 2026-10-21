// =========================================================================================================
// Browser API contracts — independent of server validators and database rows.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { CacheOptions } from '../core/cache';
import type { Resource, ResourceLink, AvatarMeta, AssetMeta, ClothesMeta } from '../types';

// =========================================================================================================
// Transport and pagination
// =========================================================================================================

export interface ApiOptions {
	signal?: AbortSignal;
	cache?: CacheOptions;
}
export interface RequestOptions extends ApiOptions {
	headers?: HeadersInit;
	responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
	invalidate?: readonly string[];
}
export type Filters = URLSearchParams | Record<string, string | number | boolean | readonly string[] | null | undefined>;
export interface Success {
	success: boolean;
}
export interface Pagination {
	page: number;
	limit: number;
	total: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}
export interface ResourceList {
	resources: Resource[];
	pagination: Pagination;
}
// =========================================================================================================
// Resource requests
// =========================================================================================================

export interface ResourceWrite {
	title: string;
	description?: string;
	category: string;
	thumbnail_uuid: string;
	reference_image_uuid?: string | null;
	media_files?: string[];
	links?: ResourceLink[];
	meta?: AvatarMeta | AssetMeta | ClothesMeta | Record<string, unknown>;
	token?: string;
}

export interface ResourceUpdate {
	title?: string;
	description?: string;
	category?: string;
	thumbnail_uuid?: string;
	reference_image_uuid?: string | null;
	gallery_media_uuids?: string[];
	new_links?: ResourceLink[];
	is_active?: number;
}
// =========================================================================================================
// Authentication
// =========================================================================================================

export interface LoginRequest {
	username: string;
	password: string;
	token?: string | null;
}
export interface TwoFactorLoginRequest {
	username: string;
	code: string;
	pre_auth_token: string;
}
export interface OAuthRegistrationRequest {
	username: string;
	token?: string;
}
export interface LoginResponse {
	success?: boolean;
	requires_2fa?: boolean;
	pre_auth_token?: string;
	username?: string;
}
export interface AuthStatus {
	loggedIn: boolean;
	username: string | null;
	is_admin: boolean;
	is_anonymous?: boolean;
	avatar_url: string | null;
	has_password?: boolean;
}
export interface ProfileUpdate {
	username?: string;
	avatar_url?: string;
	token?: string;
	is_anonymous?: number;
}
export interface ProfileUpdateResponse extends Success {
	username: string;
	avatar_url: string | null;
	is_anonymous: number;
}
export interface PasswordChange {
	new_password: string;
	current_password?: string;
	two_factor_code?: string;
	token: string;
}
// =========================================================================================================
// Uploads
// =========================================================================================================

export interface UploadResult {
	r2_key: string;
	media_uuid: string;
	media_type?: string;
	file_name?: string;
}
export interface UploadSession {
	uploadId: string;
	key: string;
}
export interface UploadPart {
	partNumber: number;
	etag: string;
}
// =========================================================================================================
// Favorites and collections
// =========================================================================================================

export interface Collection {
	uuid: string;
	name: string;
	display_order: number;
	favorite_count: number;
}
export interface CollectionsResponse {
	collections: Collection[];
}
export interface FavoritesResponse {
	favorites: Favorite[];
}
export interface Favorite {
	uuid: string;
	thumbnail_key?: string;
	thumbnail_uuid?: string | null;
	thumbnail_media_type?: 'image' | 'video' | 'file';
	placeholder_blur?: string | null;
	processed?: number;
	is_nsfw?: number;
	title: string;
	description?: string;
	category: string;
	download_count?: number;
	created_at?: number;
	collection_uuid: string | null;
}
export interface FavoriteWrite {
	resource_uuid: string;
	collection_uuid?: string;
}
export interface FavoriteOrder {
	ordered_uuids: string[];
	collection_uuid: string | null;
}
// =========================================================================================================
// Comments and blog
// =========================================================================================================

export interface CommentWrite {
	text: string;
	token?: string;
}
export interface BlogPostDto {
	uuid: string;
	title: string;
	content: string;
	excerpt?: string | null;
	slug?: string;
	cover_image_key?: string | null;
	cover_image_uuid?: string | null;
	author_display: string;
	author_username?: string;
	created_at: number;
}
export interface BlogWrite {
	title: string;
	content: string;
	excerpt?: string | null;
	cover_image_uuid?: string | null;
	author_display: string;
}
export interface BlogList {
	data: BlogPostDto[];
	pagination: { page: number; total_pages: number; total: number; limit: number };
}
export interface ApiComment {
	uuid: string;
	text: string;
	author: string;
	author_avatar: string | null;
	timestamp: number;
}

export interface CreatedResourceComment extends ApiComment {
	resourceUuid: string;
}

export interface WikiCommentDto extends ApiComment {
	author_avatar: string;
}
// =========================================================================================================
// Authors
// =========================================================================================================

export interface Author {
	uuid: string;
	name: string;
	slug: string;
	avatar_url: string | null;
	description: string | null;
	website_url: string | null;
	twitter_url: string | null;
	booth_url: string | null;
	gumroad_url: string | null;
	patreon_url: string | null;
	discord_url: string | null;
}
export interface AuthorWrite {
	name: string;
	avatar_url?: string | null;
	description?: string | null;
	website_url?: string | null;
	twitter_url?: string | null;
	booth_url?: string | null;
	gumroad_url?: string | null;
	patreon_url?: string | null;
	discord_url?: string | null;
}
export interface AuthorProfile {
	author: Author;
	avatars: AuthorAvatar[];
	pagination: Pagination;
}
// =========================================================================================================
// Drive
// =========================================================================================================

export interface DriveStatus {
	linked: boolean;
	folder_id: string | null;
	folder_name: string | null;
}
export interface DriveFolder {
	id: string;
	name: string;
}
export interface DriveJob {
	uuid: string;
	r2_key: string;
	status: string;
	google_file_id: string | null;
	error: string | null;
	file_name: string;
	total_bytes: number | null;
	bytes_uploaded: number;
}
// =========================================================================================================
// Notifications, shares and system metadata
// =========================================================================================================

export interface NotificationPrefsDTO {
	enabled: boolean;
	avatars_enabled: boolean;
	avatar_types: string[] | null;
	assets_enabled: boolean;
	asset_types: string[] | null;
	clothes_enabled: boolean;
	updated_at: number | null;
}
export interface ShareLinkDTO {
	uuid: string;
	file_name: string;
	uses: number;
	max_uses: number | null;
	expires_at: number;
	revoked: number;
	created_at: number;
}
export interface ShareWrite {
	r2_key: string;
	expires_in: number;
	max_uses: number | null;
}
export interface VersionInfo {
	worker?: { versionId?: string; versionTag?: string | null; commitHash?: string; deployedAt?: string; deployedAtTimestamp?: number; compatibilityDate?: string };
	runtime?: { name?: string; engine?: string };
	request?: { rayId?: string | null; requestId?: string | null; country?: string | null; colo?: string | null };
}

export interface AuthorAvatar {
	uuid: string;
	title: string;
	thumbnail_key: string | null;
	thumbnail_media_uuid: string | null;
	thumbnail_media_type: 'image' | 'video' | 'file';
	placeholder_blur: string | null;
	processed: number;
	download_count: number;
	created_at: number;
	avatar_gender: string;
	avatar_type: string;
	platform: string;
	is_nsfw: number;
}

// =========================================================================================================
// Query construction — arrays are repeated keys, never comma-joined values.
// =========================================================================================================

export function query(filters: Filters = {}): string {
	const params = filters instanceof URLSearchParams ? new URLSearchParams(filters) : new URLSearchParams();
	if (!(filters instanceof URLSearchParams)) {
		for (const [key, value] of Object.entries(filters)) {
			if (value === undefined || value === null) continue;
			for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
		}
	}
	const value = params.toString();
	return value ? `?${value}` : '';
}
