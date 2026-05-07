// =========================================================================
// types.ts — Shared type declarations for the frontend bundle
// =========================================================================

// =========================================================================
// App state
// =========================================================================

export interface AuthUser {
	username: string;
	uuid?: string;
	is_admin?: boolean;
	loggedIn?: boolean;
	avatar_url?: string;
	has_password?: boolean;
}

export interface AppState {
	isLoggedIn: boolean;
	isAdmin: boolean;
	user: AuthUser | null;
}

// =========================================================================
// Router
// =========================================================================

export interface RouteContext {
	params: Record<string, string>;
	query: URLSearchParams;
}

export type ViewFn = (ctx: RouteContext) => string | Promise<string>;
export type AfterFn = (ctx: RouteContext) => void | Promise<void>;

export interface RouteOptions {
	after?: AfterFn;
}

export interface Route {
	pattern: RegExp;
	keys: string[];
	view: ViewFn;
	after?: AfterFn;
}

// =========================================================================
// API models
// =========================================================================

export interface ResourceLink {
	uuid?: string;
	link_url: string;
	link_title?: string | null;
	link_type: 'download' | 'demo' | 'documentation' | 'general';
	display_order?: number;
}

export interface MediaFile {
	uuid?: string;
	r2_key: string;
	media_type: 'image' | 'video' | 'file';
}

export interface ResourceAuthor {
	username: string;
}

export interface ResourceTag {
	name: string;
}

// =========================================================================
// Category-specific metadata
// =========================================================================

export interface AvatarMeta {
	avatar_gender?: string | null;
	avatar_size?: string | null;
	avatar_type?: string | null;
	is_nsfw?: number | null;
	has_physbones?: number | null;
	has_face_tracking?: number | null;
	has_dps?: number | null;
	has_gogoloco?: number | null;
	has_toggles?: number | null;
	is_quest_optimized?: number | null;
	sdk_version?: string | null;
	platform?: string | null;
	author_name_raw?: string | null;
	author_name?: string | null;
	author_slug?: string | null;
}

export interface AssetMeta {
	asset_type?: string | null;
	is_nsfw?: number | null;
	unity_version?: string | null;
	platform?: string | null;
	sdk_version?: string | null;
}

export interface ClothesMeta {
	gender_fit?: string | null;
	clothing_type?: string | null;
	is_base?: number | null;
	is_nsfw?: number | null;
	has_physbones?: number | null;
	platform?: string | null;
	base_avatar_name_raw?: string | null;
	base_avatar_uuid?: string | null;
}

export interface Resource {
	uuid: string;
	title: string;
	description: string;
	category: string;
	thumbnail_key?: string;
	thumbnail_media_uuid?: string | null;
	reference_image_key?: string | null;
	reference_image_media_uuid?: string | null;
	is_active: number;
	created_at: number;
	updated_at?: number;
	download_count?: number;
	author?: ResourceAuthor;
	links?: ResourceLink[];
	mediaFiles?: MediaFile[];
	tags?: ResourceTag[];
	meta?: AvatarMeta | AssetMeta | ClothesMeta | null;
	// Download helpers
	canDownload?: boolean;
	downloadUrl?: string | null;
	backupUrls?: string[];
}

export interface Comment {
	uuid: string;
	text: string;
	author: string;
	author_avatar: string;
	timestamp: number;
}

export interface BlogPost {
	uuid: string;
	title: string;
	content: string;
	author: string;
	author_avatar?: string;
	created_at: number;
	updated_at?: number;
	thumbnail_key?: string;
	cover_image_key?: string | null;
	cover_image_media_uuid?: string | null;
	tags?: string[];
}

// =========================================================================
// Third-party globals (CDN — Turnstile only)
// =========================================================================

export interface TurnstileOptions {
	sitekey: string;
	callback?: (token: string) => void;
	'expired-callback'?: () => void;
	theme?: 'light' | 'dark' | 'auto';
}

export interface TurnstileInstance {
	render(selector: string, options: TurnstileOptions): string | undefined;
	reset(widgetId?: string): void;
	getResponse(widgetId?: string): string;
}

// =========================================================================
// Window augmentation
// =========================================================================

declare global {
	interface Window {
		appState: AppState;
		navigateTo: (url: string) => void;
		setLanguage: (lang: string) => void;
		turnstile?: TurnstileInstance;
	}
}

export {};
