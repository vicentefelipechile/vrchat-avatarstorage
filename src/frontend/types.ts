// =========================================================================
// types.ts — Shared type declarations for the frontend bundle
// =========================================================================

// -------------------------------------------------------------------------
// App state
// -------------------------------------------------------------------------

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

// -------------------------------------------------------------------------
// Router
// -------------------------------------------------------------------------

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

// -------------------------------------------------------------------------
// API models
// -------------------------------------------------------------------------

export interface ResourceLink {
	link_url: string;
	link_title?: string;
	link_type: 'download' | 'backup';
	display_order?: number;
	file_size?: number;
	version?: string;
}

export interface MediaFile {
	r2_key: string;
	media_type: 'image' | 'video' | 'file';
}

export interface ResourceAuthor {
	username: string;
}

export interface ResourceTag {
	name: string;
}

export interface Resource {
	uuid: string;
	title: string;
	description: string;
	category: string;
	thumbnail_key?: string;
	reference_image_key?: string | null;
	is_active: number;
	created_at: number;
	updated_at?: number;
	download_count?: number;
	author?: ResourceAuthor;
	links?: ResourceLink[];
	mediaFiles?: MediaFile[];
	tags?: ResourceTag[];
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
	tags?: string[];
}



// -------------------------------------------------------------------------
// Third-party globals (CDN — Turnstile only)
// -------------------------------------------------------------------------

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

// -------------------------------------------------------------------------
// Window augmentation
// -------------------------------------------------------------------------

declare global {
	interface Window {
		appState: AppState;
		navigateTo: (url: string) => void;
		setLanguage: (lang: string) => void;
		turnstile?: TurnstileInstance;
	}
}

export { };
