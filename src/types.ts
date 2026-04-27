// =========================================================================
// VRCSTORAGE - DATABASE TYPES
// =========================================================================
// Este archivo define las interfaces TypeScript que reflejan la estructura
// de la base de datos definida en schema.sql
// =========================================================================

// =========================================================================
// USUARIOS
// =========================================================================

export interface User {
	uuid: string;
	username: string;
	password_hash: string;
	avatar_url: string | null;
	created_at: number;
	is_admin: number;
	two_factor_enabled: number;
	two_factor_secret: string | null;
	two_factor_backup_codes: string | null;
}

// Tipo para crear un nuevo usuario (sin campos generados automáticamente)
export interface CreateUser {
	uuid: string;
	username: string;
	password_hash: string;
	avatar_url?: string | null;
}

// =========================================================================
// MEDIOS (IMÁGENES Y ARCHIVOS)
// =========================================================================

export type MediaType = 'image' | 'video' | 'file';

export interface Media {
	uuid: string;
	r2_key: string; // Clave en Cloudflare R2
	media_type: MediaType; // 'image' o 'file'
	file_name: string;
	created_at: number; // Unix timestamp
}

export interface CreateMedia {
	uuid: string;
	r2_key: string;
	media_type: MediaType;
	file_name: string;
}

// =========================================================================
// RELACIÓN RECURSOS-MEDIOS
// =========================================================================

export interface ResourceMedia {
	uuid: string;
	resource_uuid: string;
	media_uuid: string;
	created_at: number; // Unix timestamp
}

export interface CreateResourceMedia {
	uuid: string;
	resource_uuid: string;
	media_uuid: string;
}

// =========================================================================
// RECURSOS (AVATARES, MODELOS, ETC.)
// =========================================================================

export const RESOURCE_CATEGORIES = ['avatars', 'worlds', 'assets', 'clothes'] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export interface Resource {
	uuid: string;
	title: string;
	description: string | null;
	category: ResourceCategory;
	thumbnail_uuid: string; // Miniatura principal
	reference_image_uuid: string | null; // Imagen de referencia adicional
	author_uuid: string;
	download_count: number;
	is_active: number; // 0 or 1
	created_at: number; // Unix timestamp
	updated_at: number; // Unix timestamp
}

export interface CreateResource {
	uuid: string;
	title: string;
	description?: string | null;
	category: ResourceCategory;
	thumbnail_uuid: string;
	reference_image_uuid?: string | null;
	author_uuid: string;
}

// Tipo extendido con información del autor (para consultas JOIN)
export interface ResourceWithAuthor extends Resource {
	author: User;
}

// =========================================================================
// TAGS (ETIQUETAS)
// =========================================================================
export interface Tag {
	id: number;
	name: string;
}

export interface ResourceTag {
	resource_uuid: string;
	tag_id: number;
}

// Tipo extendido con medios asociados y tags
export interface ResourceWithMedia extends Resource {
	author: User;
	thumbnail: Media;
	reference_image: Media | null;
	media_files: Media[];
	tags: Tag[]; // New: Tags associated with the resource
}

// =========================================================================
// ENLACES DE RECURSOS
// =========================================================================
export type LinkType = 'download' | 'demo' | 'documentation' | 'general';

export interface ResourceLink {
	uuid: string;
	resource_uuid: string;
	link_url: string;
	link_title: string | null; // Título descriptivo opcional
	link_type: LinkType; // Tipo de enlace
	display_order: number; // Orden de visualización
	created_at: number; // Unix timestamp
}

export interface CreateResourceLink {
	uuid: string;
	resource_uuid: string;
	link_url: string;
	link_title?: string | null;
	link_type?: LinkType;
	display_order?: number;
}

// =========================================================================
// COMENTARIOS
// =========================================================================
export interface Comment {
	uuid: string;
	resource_uuid: string;
	author_uuid: string;
	text: string;
	created_at: number; // Unix timestamp
	updated_at: number; // Unix timestamp
}

export interface CreateComment {
	uuid: string;
	resource_uuid: string;
	author_uuid: string;
	text: string;
}

// Tipo extendido con información del autor
export interface CommentWithAuthor extends Comment {
	author: User;
}

// =========================================================================
// HISTORIAL DE RECURSOS (AUDIT LOG)
// =========================================================================
export type ChangeType = 'content_edit' | 'tag_change' | 'approval' | 'meta_edit';
export type HistoryChangeType = 'content_edit' | 'meta_edit' | 'approval';

export interface MetaEditSnapshot {
	meta_type: 'avatar_meta' | 'asset_meta' | 'clothes_meta';
	fields: Record<string, unknown>;
}

export interface ResourceHistory {
	uuid: string;
	resource_uuid: string;
	actor_uuid: string;
	change_type: ChangeType;
	previous_data: string; // JSON string
	created_at: number;
}

export interface ResourceHistoryWithActor extends ResourceHistory {
	actor: {
		username: string;
		avatar_url: string | null;
	};
}

// =========================================================================
// TIPOS AUXILIARES
// =========================================================================

// Respuesta de autenticación
export interface AuthResponse {
	token: string;
	user: Omit<User, 'password_hash'>;
}

// Paginación
export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		total_pages: number;
	};
}

// Filtros de búsqueda para recursos
export interface ResourceFilters extends PaginationParams {
	category?: string;
	author_uuid?: string;
	search?: string;
	tags?: string; // New: Comma separated tags
	sort_by?: 'created_at' | 'download_count' | 'title';
	sort_order?: 'asc' | 'desc';
}

// =========================================================================
// FAVORITOS DE USUARIOS
// =========================================================================
export interface UserFavorite {
	user_uuid: string;
	resource_uuid: string;
	display_order: number;
	created_at: number;
}

export interface UserFavoriteWithResource extends UserFavorite {
	resource: Resource;
	author: {
		username: string;
		avatar_url: string | null;
	};
	thumbnail: Media;
}

// =========================================================================
// CLOUDFLARE QUEUES
// =========================================================================

/** Message sent to the upload processing queue after a file is stored in R2. */
export interface UploadQueueMessage {
	media_uuid: string;
	r2_key: string;
	media_type: 'image' | 'video' | 'file';
	file_name: string;
	uploaded_at: number; // Unix ms timestamp
}

// =========================================================================
// OAUTH PROVIDERS
// =========================================================================

/** Supported OAuth providers. Extend this union to add new ones. */
export type OAuthProvider = 'google';

/** Row in user_oauth_providers table */
export interface UserOAuthProvider {
	id: number;
	user_uuid: string;
	provider: OAuthProvider;
	provider_id: string; // Provider-side user ID (e.g. Google 'sub')
	email: string | null;
	created_at: number;
}

/** Pending OAuth registration stored in KV while user selects a username */
export interface OAuthPendingRegistration {
	provider: OAuthProvider;
	provider_id: string;
	email: string | null;
	avatar_url: string | null;
}

// =========================================================================
// BLOG
// =========================================================================

export type BlogAuthorDisplay = 'personal' | 'team';

export interface BlogPost {
	uuid: string;
	slug: string;
	title: string;
	content: string;
	excerpt: string | null;
	cover_image_uuid: string | null;
	author_uuid: string;
	author_display: BlogAuthorDisplay;
	created_at: number; // Unix timestamp
	updated_at: number; // Unix timestamp
}

export interface CreateBlogPost {
	uuid: string;
	slug: string;
	title: string;
	content: string;
	excerpt?: string | null;
	cover_image_uuid?: string | null;
	author_uuid: string;
	author_display: BlogAuthorDisplay;
}

export interface BlogPostWithAuthor extends BlogPost {
	author_username: string;
	author_avatar: string | null;
	cover_image_key: string | null; // R2 key of the cover image
}

export interface BlogComment {
	uuid: string;
	post_uuid: string;
	author_uuid: string;
	text: string;
	created_at: number;
}

export interface BlogCommentWithAuthor extends BlogComment {
	author_username: string;
	author_avatar: string | null;
}

// =========================================================================
// CATEGORY AUTHORS
// =========================================================================

export interface AvatarAuthor {
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

// =========================================================================
// CATEGORY METADATA
// =========================================================================

export interface AvatarMeta {
	resource_uuid: string;
	author_uuid: string | null;
	author_name_raw: string | null;
	avatar_gender: 'male' | 'female' | 'androgynous' | 'undefined' | 'both';
	avatar_size: 'tiny' | 'small' | 'medium' | 'tall' | 'giant';
	avatar_type:
		| 'human'
		| 'furry'
		| 'anime'
		| 'chibi'
		| 'cartoon'
		| 'semi-realistic'
		| 'monster'
		| 'fantasy'
		| 'kemono'
		| 'mecha'
		| 'sci-fi'
		| 'vtuber'
		| 'other';
	is_nsfw: number;
	has_physbones: number;
	has_face_tracking: number;
	has_dps: number;
	has_gogoloco: number;
	has_toggles: number;
	is_quest_optimized: number;
	sdk_version: 'sdk3' | 'sdk2';
	platform: 'pc' | 'quest' | 'cross';
}

export interface AssetMeta {
	resource_uuid: string;
	asset_type:
		| 'prop'
		| 'shader'
		| 'particle'
		| 'vfx'
		| 'prefab'
		| 'script'
		| 'animation'
		| 'avatar-base'
		| 'texture-pack'
		| 'sound'
		| 'tool'
		| 'hud'
		| 'other';
	is_nsfw: number;
	unity_version: '2019' | '2022';
	platform: 'pc' | 'quest' | 'cross';
	sdk_version: 'sdk3' | 'sdk2';
}

// =========================================================================
// COMMUNITY ADS
// =========================================================================

export type AdServiceType =
	| 'avatar_creator'
	| '3d_artist'
	| 'illustrator'
	| 'world_builder'
	| 'texture_artist'
	| 'rigger'
	| 'shader_dev'
	| 'animator'
	| 'voice_actor'
	| 'commissioner';

export const AD_SERVICE_TYPES: AdServiceType[] = [
	'avatar_creator',
	'3d_artist',
	'illustrator',
	'world_builder',
	'texture_artist',
	'rigger',
	'shader_dev',
	'animator',
	'voice_actor',
	'commissioner',
];

export type AdDestinationType = 'internal' | 'external';

export interface CommunityAd {
	uuid: string;
	author_uuid: string;
	title: string;
	tagline: string;
	description: string | null;
	service_type: AdServiceType;
	banner_media_uuid: string | null;
	card_media_uuid: string | null;
	destination_type: AdDestinationType;
	external_url: string | null;
	is_active: number;
	is_approved: number;
	rejected_reason: string | null;
	display_weight: number;
	created_at: number;
	updated_at: number;
	expires_at: number | null;
}

/** Extended view returned by GET /api/ads — includes resolved media keys */
export interface CommunityAdPublic {
	uuid: string;
	title: string;
	tagline: string;
	service_type: AdServiceType;
	destination_type: AdDestinationType;
	external_url: string | null;
	banner_r2_key: string | null;
	card_r2_key: string | null;
	display_weight: number;
	author_username: string;
}

export interface AdSlotConfig {
	slot_name: string;
	max_concurrent: number;
	rotation_hours: number;
	is_enabled: number;
	updated_at: number;
}

export interface AdStat {
	uuid: string;
	ad_uuid: string;
	stat_date: string; // YYYY-MM-DD
	impressions: number;
	clicks: number;
}

export interface AdInternalPage {
	ad_uuid: string;
	content: string;
}

export interface ClothesMeta {
	resource_uuid: string;
	gender_fit: 'male' | 'female' | 'unisex' | 'kemono';
	clothing_type:
		| 'top'
		| 'jacket'
		| 'bottom'
		| 'dress'
		| 'fullbody'
		| 'swimwear'
		| 'shoes'
		| 'legwear'
		| 'hat'
		| 'hair'
		| 'accessory'
		| 'tail'
		| 'ears'
		| 'wings'
		| 'body-part'
		| 'underwear'
		| 'other';
	is_base: number;
	base_avatar_uuid: string | null;
	base_avatar_name_raw: string | null;
	is_nsfw: number;
	has_physbones: number;
	platform: 'pc' | 'quest' | 'cross';
}
