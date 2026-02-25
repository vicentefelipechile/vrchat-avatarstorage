// ============================================================================
// VRCSTORAGE - DATABASE TYPES
// ============================================================================
// Este archivo define las interfaces TypeScript que reflejan la estructura
// de la base de datos definida en schema.sql
// ============================================================================

// ----------------------------------------------------------------------------
// USUARIOS
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// MEDIOS (IMÁGENES Y ARCHIVOS)
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// RELACIÓN RECURSOS-MEDIOS
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// RECURSOS (AVATARES, MODELOS, ETC.)
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// TAGS (ETIQUETAS)
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// ENLACES DE RECURSOS
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// COMENTARIOS
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// HISTORIAL DE RECURSOS (AUDIT LOG)
// ----------------------------------------------------------------------------
export type ChangeType = 'content_edit' | 'tag_change' | 'approval';

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

// ----------------------------------------------------------------------------
// TIPOS AUXILIARES
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// FAVORITOS DE USUARIOS
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// CLOUDFLARE QUEUES
// ----------------------------------------------------------------------------

/** Message sent to the upload processing queue after a file is stored in R2. */
export interface UploadQueueMessage {
	media_uuid: string;
	r2_key: string;
	media_type: 'image' | 'video' | 'file';
	file_name: string;
	uploaded_at: number; // Unix ms timestamp
}
