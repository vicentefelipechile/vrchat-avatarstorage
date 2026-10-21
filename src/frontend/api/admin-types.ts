// =========================================================================================================
// Admin API response contracts
// =========================================================================================================

// =========================================================================================================
// Types
// =========================================================================================================

export interface PendingResource {
	uuid: string;
	title: string;
	description: string | null;
	category: string;
	thumbnail_key: string | null;
	timestamp: number;
	created_at: number;
	is_active: number;
	author: { username: string; avatar_url: string | null } | null;
}

export interface AdminStats {
	users: number;
	avatars: number;
	assets: number;
	clothes: number;
	pending: number;
	authors: number;
	media: number;
	orphaned_media: number;
	latest_uploads: { uuid: string; title: string; category: string; created_at: number; author_username: string | null }[];
	latest_registrations: { uuid: string; username: string; created_at: number }[];
}

export interface OrphanStats {
	orphaned_count: number;
	total_media: number;
	total_resources: number;
	cutoff_hours: number;
	orphaned_files: { filename: string; type: string; age_hours: number }[];
}

export interface UserRow {
	uuid: string;
	username: string;
	avatar_url: string | null;
	is_admin: number;
	is_banned: number;
	created_at: number;
}

export interface ResourceRow {
	uuid: string;
	title: string;
	category: string;
	is_active: number;
	download_count: number;
	created_at: number;
	author_username: string | null;
	thumbnail_key: string | null;
}

export interface AuthorRow {
	uuid: string;
	name: string;
	slug: string;
	avatar_url: string | null;
	resource_count: number;
	created_at: number;
}

export interface AdminCommentRow {
	uuid: string;
	text: string;
	created_at: number;
	author_username: string | null;
	resource_uuid: string;
	resource_title: string | null;
}

export interface Timeseries {
	days: string[];
	uploads: number[];
	registrations: number[];
}
