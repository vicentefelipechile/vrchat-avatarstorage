// =========================================================================================================
// DOCS — REGISTRY (SINGLE SOURCE OF TRUTH)
// =========================================================================================================
// Every HTTP endpoint in src/http/routes/* is documented here exactly once. The generator
// (src/docs/generator.ts) renders this manifest into:
//
//   GET /llms.txt       — curated, LLM-friendly overview (llmstxt.org spec, public endpoints only)
//   GET /llms-full.txt  — exhaustive reference (every endpoint, every param, every response)
//   GET /api/docs       — machine-readable JSON (same data, for tooling/codegen)
//
// Rules for adding a new endpoint:
//   1. Add one EndpointDoc object to the `ENDPOINTS` array below.
//   2. Keep `method` + `path` exactly as mounted in src/index.ts (colon-style params).
//   3. Set `visibility: 'public'` for unauthenticated reads that belong in the curated file;
//      'private' for auth/admin/write endpoints (they still appear in llms-full.txt).
//   4. Run `npx tsc -p tsconfig.json --noEmit` and `npx prettier --check src/` before committing.
//   5. The build check in src/tools/check-docs.mjs will fail CI if a route exists without a doc.
//
// The param / response prose here is the documentation — the generator does not infer it from Zod.
// That keeps the llms.txt human-curated (as the spec intends) while still being auto-assembled.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { ApiDocsManifest, EndpointDoc, SiteSection, TagGroup } from './types';

// =========================================================================================================
// Site metadata
// =========================================================================================================

export const SITE_URL = 'https://vrcstorage.lat';
export const CDN_URL = 'https://cdn.vrcstorage.lat';

export const SITE_SECTIONS: SiteSection[] = [
	{ title: 'Home', url: `${SITE_URL}/`, description: 'Landing page with featured content and search.' },
	{ title: 'Avatars', url: `${SITE_URL}/avatars`, description: 'Browse and filter VRChat avatars by type, gender, size, platform, SDK, and NSFW flag.' },
	{ title: 'Assets', url: `${SITE_URL}/assets`, description: 'Browse shaders, tools, prefabs, scripts, and other Unity assets for VRChat.' },
	{ title: 'Clothes', url: `${SITE_URL}/clothes`, description: 'Browse wearable clothing and accessories compatible with popular avatar bases.' },
	{ title: 'Blog', url: `${SITE_URL}/blog`, description: 'Community articles and announcements written by platform staff.' },
	{ title: 'Wiki', url: `${SITE_URL}/wiki?topic=home`, description: 'Documentation hub covering setup, tools, shaders, and VRChat guides (raw Markdown).' },
	{ title: 'Upload', url: `${SITE_URL}/upload`, description: 'Submit a new resource (requires an authenticated account).' },
	{ title: 'Terms of Service', url: `${SITE_URL}/tos`, description: 'Permitted content, age requirement (18+), DMCA policy, and account rules.' },
	{ title: 'DMCA', url: `${SITE_URL}/dmca`, description: 'Copyright takedown request process.' },
];

export const WIKI_TOPICS: string[] = [
	'home','faq','setup','poiyomi','vrcfury','modular-avatar','physbones','syncdances','vrcquesttools','gogoloco',
	'gogoloco-nsfw','desktop-puppeteer','gesture-manager-emulator','action-menu','parameter','unityhub-error',
	'gogoloco-remove','nsfw-essentials','sps','inside-view','pcs','haptics','dps','justkisssfx','avatar-categories',
];

export const TAG_GROUPS: TagGroup[] = [
	{ tag: 'site', label: 'Site', description: 'Frontend pages and wiki' },
	{ tag: 'avatars', label: 'Avatars', description: 'Avatar listing, search, detail, and mutation' },
	{ tag: 'assets', label: 'Assets', description: 'Asset listing and mutation' },
	{ tag: 'clothes', label: 'Clothes', description: 'Clothing listing and mutation' },
	{ tag: 'resources', label: 'Resources', description: 'Generic resource CRUD and links' },
	{ tag: 'authors', label: 'Authors', description: 'Normalized avatar author profiles' },
	{ tag: 'blog', label: 'Blog', description: 'Blog posts and blog comments' },
	{ tag: 'comments', label: 'Comments', description: 'Resource and wiki comments' },
	{ tag: 'wiki', label: 'Wiki', description: 'Wiki comments' },
	{ tag: 'uploads', label: 'Uploads', description: 'Single-shot and multipart file uploads' },
	{ tag: 'media', label: 'Media', description: 'Media processing status and CDN variants' },
	{ tag: 'downloads', label: 'Downloads', description: 'R2 file serving and CDN media variants' },
	{ tag: 'favorites', label: 'Favorites', description: 'User favorites and favorite ordering' },
	{ tag: 'collections', label: 'Collections', description: 'User-created favorite collections' },
	{ tag: 'auth', label: 'Auth', description: 'Registration, login, profile, and sessions' },
	{ tag: 'oauth', label: 'OAuth', description: 'Google OAuth flow' },
	{ tag: '2fa', label: 'Two-Factor', description: 'TOTP two-factor authentication' },
	{ tag: 'admin', label: 'Admin', description: 'Moderation, stats, and maintenance (admin-only)' },
	{ tag: 'system', label: 'System', description: 'Configuration and version metadata' },
	{ tag: 'realtime', label: 'Realtime', description: 'Live feed, polling updates, global chat, and notifications' },
];

// =========================================================================================================
// Helper — short factory for ParamDoc to keep the array readable
// =========================================================================================================

function q(name: string, description: string, opts: Partial<{ required: boolean; type: string; enumValues: string[]; defaultValue: string }> = {}): import('./types').ParamDoc {
	return {
		name,
		location: 'query',
		required: opts.required ?? false,
		type: opts.type ?? 'string',
		description,
		enumValues: opts.enumValues,
		defaultValue: opts.defaultValue,
	};
}
function p(name: string, description: string, type = 'string (uuid v4)'): import('./types').ParamDoc {
	return { name, location: 'path', required: true, type, description };
}
function b(name: string, description: string, opts: Partial<{ required: boolean; type: string }> = {}): import('./types').ParamDoc {
	return { name, location: 'body', required: opts.required ?? false, type: opts.type ?? 'string', description };
}
function h(name: string, description: string, type = 'string'): import('./types').ParamDoc {
	return { name, location: 'header', required: true, type, description };
}

// =========================================================================================================
// Endpoint registry — 98 entries, one per route
// =========================================================================================================

export const ENDPOINTS: EndpointDoc[] = [
	// ---- Avatars (public reads + auth writes) -----------------------------------------------------------------
	{
		method: 'GET', path: '/api/avatars', summary: 'List avatars with faceted filtering', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'avatars', schema: 'AvatarFilterSchema',
		description: 'Paginated avatar listing filtered by title substring (q), gender, size, type, platform, SDK, NSFW, feature flags, and author. Uses INNER JOIN avatar_meta; q is substring search on resources.title via FTS5 resources_fts (trigram) with LIKE fallback. Multi-value filters use repeated keys (?avatar_type=human&avatar_type=furry).',
		params: [
			q('page', 'Page number', { type: 'integer', defaultValue: '1' }),
			q('limit', 'Items per page', { type: 'integer', defaultValue: '24', enumValues: ['1..60'] }),
			q('sort_by', 'Sort field', { type: 'enum', enumValues: ['created_at','download_count','title'], defaultValue: 'created_at' }),
			q('sort_order', 'Sort direction', { type: 'enum', enumValues: ['asc','desc'], defaultValue: 'desc' }),
			q('q', 'Filter by title substring (1..100 chars)', { type: 'string' }),
			q('avatar_gender', 'Filter by gender (repeat for OR, e.g. ?avatar_gender=male&avatar_gender=female)', { type: 'enum', enumValues: ['male','female','androgynous','undefined','both'] }),
			q('avatar_size', 'Filter by size (repeat for OR)', { type: 'enum', enumValues: ['tiny','small','medium','tall','giant'] }),
			q('avatar_type', 'Filter by avatar type (repeat for OR, e.g. ?avatar_type=human&avatar_type=furry)', { type: 'enum', enumValues: ['human','furry','anime','chibi','cartoon','semi-realistic','monster','fantasy','mecha','kemono','sci-fi','vtuber','other'] }),
			q('platform', 'Filter by platform (repeat for OR)', { type: 'enum', enumValues: ['pc','quest','cross'] }),
			q('sdk_version', 'Filter by SDK (repeat for OR)', { type: 'enum', enumValues: ['sdk3','sdk2'] }),
			q('is_nsfw', 'NSFW filter', { type: 'enum', enumValues: ['0','1'] }),
			q('has_physbones', 'Has PhysBones', { type: 'enum', enumValues: ['0','1'] }),
			q('has_face_tracking', 'Has face tracking', { type: 'enum', enumValues: ['0','1'] }),
			q('has_dps', 'Has DPS', { type: 'enum', enumValues: ['0','1'] }),
			q('has_gogoloco', 'Has GoGo Loco', { type: 'enum', enumValues: ['0','1'] }),
			q('has_toggles', 'Has toggles', { type: 'enum', enumValues: ['0','1'] }),
			q('is_quest_optimized', 'Quest optimized', { type: 'enum', enumValues: ['0','1'] }),
			q('author_uuid', 'Filter by author profile UUID', { type: 'string (uuid v4)' }),
		],
		response: { description: 'JSON — { resources: AvatarWithMeta[], pagination: { page, limit, total, hasNextPage, hasPrevPage } }' },
	},
	{
		method: 'GET', path: '/api/avatars/search', summary: 'Lightweight avatar name autocomplete', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'avatars',
		description: 'Returns at most `limit` avatar titles matching a prefix — intended for the clothes base-avatar selector and similar autocomplete fields.',
		params: [q('q', 'Partial avatar name to match', { required: true, type: 'string (min 2 chars)' }), q('limit', 'Max results', { type: 'integer', defaultValue: '10', enumValues: ['1..20'] })],
		response: { description: 'JSON — [{ uuid, title }]' },
	},
	{
		method: 'GET', path: '/api/avatars/:uuid', summary: 'Get a single avatar with metadata', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'avatars',
		description: 'Full avatar detail including avatar_meta row. Used by HistoryView to compute diffs.',
		params: [p('uuid', 'Avatar resource UUID')],
		response: { description: 'JSON — AvatarWithMeta (resource + meta + links + media)' },
	},
	{
		method: 'POST', path: '/api/avatars', summary: 'Create an avatar resource', auth: 'auth', rateLimit: 'strict', visibility: 'private', tag: 'avatars', schema: 'ResourceSchema + AvatarMetaSchema',
		description: 'Creates a resource, its avatar_meta row, links, and media relations in one batch. Created as inactive (pending approval). No history entry on creation. Turnstile required.',
		params: [
			b('title', 'Avatar title (3–100 chars)', { required: true, type: 'string' }),
			b('description', 'Markdown description (≤8000 chars)', { type: 'string' }),
			b('category', 'Must be "avatars"', { required: true, type: 'enum', }),
			b('thumbnail_uuid', 'Media UUID for the thumbnail', { required: true, type: 'string (uuid v4)' }),
			b('reference_image_uuid', 'Optional reference image media UUID', { type: 'string (uuid v4)' }),
			b('links', 'Download/demo links', { type: 'LinkSchema[]' }),
			b('media_files', 'Gallery media UUIDs', { type: 'uuid[]' }),
			b('meta', 'AvatarMetaSchema payload (gender, size, type, platform, etc.)', { required: true, type: 'object' }),
			q('validate_only', 'When "true", only validates without creating', { type: 'enum', enumValues: ['true'] }),
		],
		response: { description: '201 — { uuid }' },
	},
	{
		method: 'PUT', path: '/api/avatars/:uuid', summary: 'Edit avatar metadata (admin only)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'avatars', schema: 'AvatarMetaSchema (partial)',
		description: 'Snapshots previous avatar_meta, records a meta_edit in resource history, then updates. Requires admin.',
		params: [p('uuid', 'Avatar resource UUID'), b('meta fields', 'Any AvatarMetaSchema field (partial)', { type: 'object' })],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Assets -----------------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/assets', summary: 'List assets with faceted filtering', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'assets', schema: 'AssetFilterSchema',
		description: 'Paginated asset listing filtered by title substring (q) plus asset_type, platform, SDK, Unity version, and NSFW. q is substring on resources.title via FTS5 resources_fts. Multi-value filters use repeated keys (?asset_type=prop&asset_type=shader).',
		params: [
			q('page', 'Page number', { type: 'integer', defaultValue: '1' }),
			q('limit', 'Items per page', { type: 'integer', defaultValue: '24', enumValues: ['1..60'] }),
			q('sort_by', 'Sort field', { type: 'enum', enumValues: ['created_at','download_count','title'], defaultValue: 'created_at' }),
			q('sort_order', 'Sort direction', { type: 'enum', enumValues: ['asc','desc'], defaultValue: 'desc' }),
			q('q', 'Filter by title substring (1..100 chars)', { type: 'string' }),
			q('asset_type', 'Filter by asset type (repeat for OR)', { type: 'enum', enumValues: ['prop','shader','particle','vfx','prefab','script','animation','avatar-base','texture-pack','sound','tool','hud','other'] }),
			q('platform', 'Filter by platform (repeat for OR)', { type: 'enum', enumValues: ['pc','quest','cross'] }),
			q('sdk_version', 'Filter by SDK (repeat for OR)', { type: 'enum', enumValues: ['sdk3','sdk2'] }),
			q('unity_version', 'Filter by Unity version (repeat for OR)', { type: 'enum', enumValues: ['2019','2022'] }),
			q('is_nsfw', 'NSFW filter', { type: 'enum', enumValues: ['0','1'] }),
		],
		response: { description: 'JSON — { resources: AssetWithMeta[], pagination }' },
	},
	{
		method: 'GET', path: '/api/assets/:uuid', summary: 'Get a single asset with metadata', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'assets',
		description: 'Full asset detail including asset_meta row.',
		params: [p('uuid', 'Asset resource UUID')],
		response: { description: 'JSON — AssetWithMeta' },
	},
	{
		method: 'POST', path: '/api/assets', summary: 'Create an asset resource', auth: 'auth', rateLimit: 'strict', visibility: 'private', tag: 'assets', schema: 'ResourceSchema + AssetMetaSchema',
		description: 'Creates a resource + asset_meta + links + media in one batch (inactive, pending approval). Turnstile required.',
		params: [b('title', 'Asset title', { required: true }), b('thumbnail_uuid', 'Media UUID for thumbnail', { required: true }), b('meta', 'AssetMetaSchema payload', { required: true, type: 'object' })],
		response: { description: '201 — { uuid }' },
	},
	{
		method: 'PUT', path: '/api/assets/:uuid', summary: 'Edit asset metadata (admin only)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'assets', schema: 'AssetMetaSchema (partial)',
		description: 'Snapshots previous state, records meta_edit, then updates. Requires admin.',
		params: [p('uuid', 'Asset resource UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Clothes ----------------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/clothes', summary: 'List clothing items with faceted filtering', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'clothes', schema: 'ClothesFilterSchema',
		description: 'Paginated clothes listing filtered by title substring (q) plus gender_fit, clothing_type, platform, is_base, is_nsfw, and has_physbones. q is substring on resources.title via FTS5 resources_fts. Multi-value filters use repeated keys.',
		params: [
			q('page', 'Page number', { type: 'integer', defaultValue: '1' }),
			q('limit', 'Items per page', { type: 'integer', defaultValue: '24', enumValues: ['1..60'] }),
			q('sort_by', 'Sort field', { type: 'enum', enumValues: ['created_at','download_count','title'], defaultValue: 'created_at' }),
			q('sort_order', 'Sort direction', { type: 'enum', enumValues: ['asc','desc'], defaultValue: 'desc' }),
			q('q', 'Filter by title substring (1..100 chars)', { type: 'string' }),
			q('gender_fit', 'Filter by gender fit (repeat for OR)', { type: 'enum', enumValues: ['male','female','unisex','kemono'] }),
			q('clothing_type', 'Filter by clothing type (repeat for OR)', { type: 'enum', enumValues: ['top','jacket','bottom','dress','fullbody','swimwear','shoes','legwear','hat','hair','accessory','tail','ears','wings','body-part','underwear','other'] }),
			q('platform', 'Filter by platform (repeat for OR)', { type: 'enum', enumValues: ['pc','quest','cross'] }),
			q('is_base', 'Base avatar flag', { type: 'enum', enumValues: ['0','1'] }),
			q('is_nsfw', 'NSFW filter', { type: 'enum', enumValues: ['0','1'] }),
			q('has_physbones', 'Has PhysBones', { type: 'enum', enumValues: ['0','1'] }),
			q('compatible_avatar', 'Filter by compatible avatar UUID', { type: 'string (uuid v4)' }),
		],
		response: { description: 'JSON — { resources: ClothesWithMeta[], pagination }' },
	},
	{
		method: 'GET', path: '/api/clothes/:uuid', summary: 'Get a single clothing item with metadata', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'clothes',
		description: 'Full clothing detail including clothes_meta row.',
		params: [p('uuid', 'Clothes resource UUID')],
		response: { description: 'JSON — ClothesWithMeta' },
	},
	{
		method: 'POST', path: '/api/clothes', summary: 'Create a clothing resource', auth: 'auth', rateLimit: 'strict', visibility: 'private', tag: 'clothes', schema: 'ResourceSchema + ClothesMetaSchema',
		description: 'Creates a resource + clothes_meta + links + media in one batch (inactive, pending approval). Turnstile required.',
		params: [b('title', 'Clothing title', { required: true }), b('thumbnail_uuid', 'Media UUID for thumbnail', { required: true }), b('meta', 'ClothesMetaSchema payload', { required: true, type: 'object' })],
		response: { description: '201 — { uuid }' },
	},
	{
		method: 'PUT', path: '/api/clothes/:uuid', summary: 'Edit clothing metadata (admin only)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'clothes', schema: 'ClothesMetaSchema (partial)',
		description: 'Snapshots previous state, records meta_edit, then updates. Requires admin.',
		params: [p('uuid', 'Clothes resource UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Resources (generic) ----------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/resources/latest', summary: 'Latest active resources (KV-cached, 60s)', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'resources',
		description: 'Returns the 10 most recently created active resources, KV-cached for 60s with Cache-Control: public, max-age=60.',
		params: [],
		response: { description: 'JSON — ResourceWithMedia[]' },
	},
	{
		method: 'GET', path: '/api/resources', summary: 'Search resources by query and category', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'resources',
		description: 'Paginated search across resources; optional category filter (avatars/assets/clothes/worlds) and sorting.',
		params: [
			q('page', 'Page number', { type: 'integer', defaultValue: '1' }),
			q('limit', 'Items per page', { type: 'integer', defaultValue: '30', enumValues: ['1..60'] }),
			q('category', 'Resource category filter', { type: 'enum', enumValues: ['avatars','assets','clothes','worlds'] }),
			q('sort_by', 'Sort field (legacy)', { type: 'string' }),
			q('sort_order', 'Sort direction', { type: 'enum', enumValues: ['ASC','DESC'], defaultValue: 'DESC' }),
			q('q', 'Free-text search (title/description)', { type: 'string' }),
		],
		response: { description: 'JSON — { data: Resource[], pagination }' },
	},
	{
		method: 'GET', path: '/api/resources/:uuid', summary: 'Full resource detail (download links gated)', auth: 'optional', rateLimit: 'global', visibility: 'public', tag: 'resources',
		description: 'Returns title, description (Markdown), thumbnail, reference image, gallery media, download links, metadata, and download_count. Download link URLs are only included for authenticated users.',
		params: [p('uuid', 'Resource UUID'), b('auth', 'Sealed session cookie (optional — unauthenticated users get the same resource without download links)', { type: 'cookie' })],
		response: { description: 'JSON — ResourceWithMedia & links & meta' },
		notes: 'Download links are filtered server-side when unauthenticated.',
	},
	{
		method: 'GET', path: '/api/resources/:uuid/history', summary: 'Resource edit history', auth: 'auth', rateLimit: 'global', visibility: 'private', tag: 'resources',
		description: ' Chronological edit history for a resource. Requires authentication.',
		params: [p('uuid', 'Resource UUID')],
		response: { description: 'JSON — ResourceHistoryWithActor[]' },
	},
	{
		method: 'POST', path: '/api/resources', summary: 'Create a generic resource', auth: 'auth', rateLimit: 'strict', visibility: 'private', tag: 'resources', schema: 'ResourceSchema',
		description: 'Creates a new resource (pending approval). Turnstile CAPTCHA required.',
		params: [b('title', 'Title (3–100 chars)', { required: true }), b('category', 'Category', { required: true, type: 'enum', }), b('thumbnail_uuid', 'Thumbnail media UUID', { required: true }), b('token', 'Turnstile token', { type: 'string' })],
		response: { description: 'JSON — { success: true, uuid }' },
	},
	{
		method: 'PUT', path: '/api/resources/:uuid', summary: 'Update a resource (owner or admin)', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'resources', schema: 'ResourceSchema (partial)',
		description: 'Owner or admin may update. Approved resources are admin-only for edits.',
		params: [p('uuid', 'Resource UUID'), b('title', 'New title', { type: 'string' }), b('description', 'New markdown description', { type: 'string' }), b('is_active', 'Active flag (0/1)', { type: 'integer' }), b('new_links', 'Additional links to append', { type: 'LinkSchema[]' }), b('gallery_media_uuids', 'Replacement gallery UUIDs', { type: 'uuid[]' })],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'DELETE', path: '/api/resources/:uuid', summary: 'Delete a resource (admin only)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'resources',
		description: 'Deletes the resource, its media rows, and R2 objects. Requires admin.',
		params: [p('uuid', 'Resource UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'POST', path: '/api/resources/:uuid/links/reorder', summary: 'Reorder download links', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'resources',
		description: 'Batch-reorders links for a resource. Must include every link UUID in the desired order. Owner or admin.',
		params: [p('uuid', 'Resource UUID'), b('ordered_uuids', 'All link UUIDs in desired order', { required: true, type: 'uuid[] (1..100)' })],
		response: { description: 'JSON — { ok: true }' },
	},
	{
		method: 'DELETE', path: '/api/resources/:uuid/links/:linkUuid', summary: 'Delete a single download link', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'resources',
		description: 'Deletes one link from a resource. Owner or admin.',
		params: [p('uuid', 'Resource UUID'), p('linkUuid', 'Link UUID')],
		response: { description: 'JSON — { ok: true }' },
	},
	{
		method: 'PUT', path: '/api/resources/:uuid/links/:linkUuid', summary: 'Update a single download link', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'resources', schema: 'LinkUpdateSchema',
		description: 'Updates title, URL, type, or display order for one link. Owner or admin.',
		params: [p('uuid', 'Resource UUID'), p('linkUuid', 'Link UUID'), b('link_url', 'New URL (https:// or /)', { type: 'string' }), b('link_title', 'New title', { type: 'string' }), b('link_type', 'Link type', { type: 'enum', })],
		response: { description: 'JSON — { ok: true }' },
	},
	// ---- Authors ----------------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/authors', summary: 'List avatar authors (paginated)', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'authors',
		description: 'Paginated list of normalized avatar author profiles, each with resource_count.',
		params: [q('page', 'Page number', { type: 'integer', defaultValue: '1' }), q('limit', 'Items per page', { type: 'integer', defaultValue: '24' })],
		response: { description: 'JSON — { authors: AuthorWithCount[], pagination }' },
	},
	{
		method: 'GET', path: '/api/authors/search', summary: 'Author name autocomplete', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'authors',
		description: 'Prefix search over author names, max 10 results with uuid, name, slug.',
		params: [q('q', 'Partial author name', { required: true }), q('limit', 'Max results', { type: 'integer', defaultValue: '10' })],
		response: { description: 'JSON — [{ uuid, name, slug }]' },
	},
	{
		method: 'GET', path: '/api/authors/:slug', summary: 'Author profile with avatars', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'authors',
		description: 'Public author profile plus paginated list of their published avatars.',
		params: [p('slug', 'Author slug', 'string (slug)'), q('page', 'Page number', { type: 'integer', defaultValue: '1' }), q('limit', 'Items per page', { type: 'integer', defaultValue: '12' })],
		response: { description: 'JSON — { author, avatars: ResourceWithMedia[], pagination }' },
	},
	{
		method: 'POST', path: '/api/authors', summary: 'Create an author record (admin)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'authors', schema: 'AvatarAuthorSchema',
		description: 'Creates a normalized author profile. Requires admin (route guard requireAdmin).',
		params: [b('name', 'Author display name (1–70 chars)', { required: true }), b('description', 'Author bio (≤2000 chars)', { type: 'string' }), b('avatar_url', 'Avatar image URL', { type: 'string' })],
		response: { description: '201 — Author' },
	},
	{
		method: 'PUT', path: '/api/authors/:slug', summary: 'Edit an author record (admin)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'authors', schema: 'AvatarAuthorSchema (partial)',
		description: 'Updates a normalized author profile. Requires admin.',
		params: [p('slug', 'Author slug', 'string (slug)')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'DELETE', path: '/api/authors/:slug', summary: 'Delete an author (admin, no linked avatars)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'authors',
		description: 'Deletes an author only when no avatars are linked to it. Requires admin.',
		params: [p('slug', 'Author slug', 'string (slug)')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'POST', path: '/api/authors/:slug/link-resource', summary: 'Link an avatar to an author (admin)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'authors',
		description: 'Links an avatar resource to an author. Records a meta_edit history snapshot. Requires admin.',
		params: [p('slug', 'Author slug', 'string (slug)'), b('resource_uuid', 'Avatar resource UUID to link', { required: true, type: 'string (uuid v4)' })],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Blog -------------------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/blog', summary: 'List blog posts (paginated, KV-cached)', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'blog',
		description: 'Paginated blog post list with cover image key and author info. KV-cached for 1h (list) and per-post.',
		params: [q('page', 'Page number', { type: 'integer', defaultValue: '1' }), q('limit', 'Items per page', { type: 'integer', defaultValue: '10', enumValues: ['1..20'] })],
		response: { description: 'JSON — { data: BlogPostWithAuthor[], pagination: { page, limit, total, total_pages } }' },
	},
	{
		method: 'GET', path: '/api/blog/:uuid', summary: 'Get a single blog post', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'blog',
		description: 'Single post by UUID, including full Markdown content.',
		params: [p('uuid', 'Blog post UUID')],
		response: { description: 'JSON — BlogPostWithAuthor' },
	},
	{
		method: 'POST', path: '/api/blog', summary: 'Create a blog post (admin)', auth: 'admin', rateLimit: 'strict', visibility: 'private', tag: 'blog', schema: 'BlogPostSchema',
		description: 'Creates a new blog post. Bumps the change_feed (blog scope) and broadcasts via FeedRoom.',
		params: [b('title', 'Title (3–200 chars)', { required: true }), b('content', 'Markdown body (≤100k chars)', { required: true }), b('excerpt', 'Optional excerpt (≤500 chars)', { type: 'string' }), b('cover_image_uuid', 'Cover image media UUID', { type: 'string (uuid v4)' }), b('author_display', 'Author display mode', { type: 'enum', })],
		response: { description: '201 — { uuid, slug }' },
	},
	{
		method: 'PUT', path: '/api/blog/:uuid', summary: 'Update a blog post (admin)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'blog', schema: 'BlogPostUpdateSchema',
		description: 'Partial update for a blog post. Admin-only.',
		params: [p('uuid', 'Blog post UUID')],
		response: { description: 'JSON — { success: true, uuid, slug }' },
	},
	{
		method: 'DELETE', path: '/api/blog/:uuid', summary: 'Delete a blog post (admin)', auth: 'admin', rateLimit: 'medium', visibility: 'private', tag: 'blog',
		description: 'Deletes a blog post and cleans up its cover image from R2.',
		params: [p('uuid', 'Blog post UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'GET', path: '/api/blog/:uuid/comments', summary: 'List comments for a blog post', auth: 'public', rateLimit: 'medium', visibility: 'public', tag: 'blog',
		description: 'Comments for a single blog post, paginated.',
		params: [p('uuid', 'Blog post UUID'), q('limit', 'Max comments', { type: 'integer', defaultValue: '50', enumValues: ['1..50'] }), q('offset', 'Offset', { type: 'integer', defaultValue: '0' })],
		response: { description: 'JSON — BlogCommentWithAuthor[]' },
	},
	{
		method: 'POST', path: '/api/blog/:uuid/comments', summary: 'Add a comment to a blog post', auth: 'auth', rateLimit: 'strict', visibility: 'private', tag: 'blog', schema: 'BlogCommentSchema',
		description: 'Creates a comment on a blog post. Turnstile-gated.',
		params: [p('uuid', 'Blog post UUID'), b('text', 'Comment text (3–1000 chars)', { required: true }), b('token', 'Turnstile token', { type: 'string' })],
		response: { description: '201 — BlogComment' },
	},
	{
		method: 'DELETE', path: '/api/blog/comments/:commentId', summary: 'Delete a blog comment', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'blog',
		description: 'Deletes a blog comment. Author or admin only.',
		params: [p('commentId', 'Comment UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Comments (resource) ----------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/comments/:resourceId', summary: 'List comments for a resource', auth: 'public', rateLimit: 'medium', visibility: 'public', tag: 'comments',
		description: 'All comments for a given resource, with author info.',
		params: [p('resourceId', 'Resource UUID')],
		response: { description: 'JSON — CommentWithAuthor[]' },
	},
	{
		method: 'POST', path: '/api/comments/:resourceId', summary: 'Create a comment on a resource', auth: 'auth', rateLimit: 'strict', visibility: 'private', tag: 'comments', schema: 'CommentSchema',
		description: 'Creates a comment on a resource. Turnstile-gated. Bumps the comments scope.',
		params: [p('resourceId', 'Resource UUID'), b('text', 'Comment text (3–500 chars)', { required: true }), b('token', 'Turnstile token', { type: 'string' })],
		response: { description: '201 — Comment' },
	},
	{
		method: 'DELETE', path: '/api/comments/:commentId', summary: 'Delete a resource comment', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'comments',
		description: 'Deletes a resource comment. Author or admin only.',
		params: [p('commentId', 'Comment UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Wiki comments ----------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/wiki/comments', summary: 'List global wiki comments', auth: 'public', rateLimit: 'medium', visibility: 'public', tag: 'wiki',
		description: 'Global wiki (site-wide) comments, not tied to a specific resource.',
		params: [q('limit', 'Max comments', { type: 'integer', defaultValue: '50' }), q('offset', 'Offset', { type: 'integer', defaultValue: '0' })],
		response: { description: 'JSON — WikiCommentWithAuthor[]' },
	},
	{
		method: 'POST', path: '/api/wiki/comments', summary: 'Create a global wiki comment', auth: 'auth', rateLimit: 'strict', visibility: 'private', tag: 'wiki', schema: 'CommentSchema',
		description: 'Creates a global wiki comment. Turnstile-gated.',
		params: [b('text', 'Comment text (3–500 chars)', { required: true }), b('token', 'Turnstile token', { type: 'string' })],
		response: { description: '201 — WikiComment' },
	},
	{
		method: 'DELETE', path: '/api/wiki/comments/:uuid', summary: 'Delete a wiki comment', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'wiki',
		description: 'Deletes a wiki comment. Author or admin only.',
		params: [p('uuid', 'Comment UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Uploads ----------------------------------------------------------------------------------------------
	{
		method: 'PUT', path: '/api/upload', summary: 'Single-shot file upload', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'uploads',
		description: 'Uploads a file (multipart/form-data, field "file"). Validates magic bytes, stores to R2 under the media UUID, inserts a media row, and enqueues post-processing via UPLOAD_QUEUE.',
		params: [b('file', 'File to upload (multipart/form-data)', { required: true, type: 'File (image ≤20MB, video ≤100MB, archive ≤1500MB)' })],
		response: { description: 'JSON — { media_uuid, r2_key, media_type, file_name }' },
	},
	{
		method: 'POST', path: '/api/upload/init', summary: 'Initialize a multipart upload', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'uploads',
		description: 'Begins a large-file multipart upload. Stores expected media_type in KV for signature validation on part 1.',
		params: [b('filename', 'Original filename', { required: true }), b('media_type', 'Expected type for signature check', { required: true, type: 'enum' })],
		response: { description: 'JSON — { uploadId, key } where key is the future media UUID' },
	},
	{
		method: 'PUT', path: '/api/upload/part', summary: 'Upload one part of a multipart upload', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'uploads',
		description: 'Uploads a single chunk. Part 1 is magic-byte checked against the media_type declared at init. Uses R2 multipart upload under the hood.',
		params: [h('X-Upload-ID', 'Multipart upload ID from /init'), h('X-Key', 'Object key (media UUID) from /init'), h('X-Part-Number', '1-indexed part number', 'integer'), b('body', 'Raw chunk bytes', { required: true, type: 'ReadableStream | ArrayBuffer' })],
		response: { description: 'JSON — R2 UploadedPart { partNumber, etag }' },
	},
	{
		method: 'POST', path: '/api/upload/complete', summary: 'Complete a multipart upload', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'uploads',
		description: 'Finalizes a multipart upload. media_type is read from KV (server-authoritative), not the client body. Inserts the media row.',
		params: [b('key', 'Object key (media UUID)', { required: true }), b('uploadId', 'Multipart upload ID', { required: true }), b('parts', 'Array of { partNumber, etag } from /part', { required: true, type: 'array' }), b('filename', 'Original filename', { required: true })],
		response: { description: 'JSON — { media_uuid, r2_key, media_type, file_name }' },
	},
	// ---- Media & Downloads ------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/media/:uuid/status', summary: 'Media processing status', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'media',
		description: 'Whether a media item has finished processing (its CDN variants exist). Derived from media_variants existence.',
		params: [p('uuid', 'Media UUID')],
		response: { description: 'JSON — { processed: boolean }' },
	},
	{
		method: 'GET', path: '/api/download/:key', summary: 'Download a private R2 file', auth: 'auth', rateLimit: 'global', visibility: 'private', tag: 'downloads',
		description: 'Proxies a private file (usually an archive like .zip/.rar/.blend) from the vrcstorage R2 bucket. Requires authentication — anonymous users receive 401. Sets Content-Type from the stored object.',
		params: [p('key', 'R2 object key (== media UUID)', 'string (r2 key)')],
		response: { description: 'Binary — raw file with Content-Type / Content-Disposition headers' },
	},
	{
		method: 'GET', path: 'https://cdn.vrcstorage.lat/:uuid', summary: 'CDN — public media variants', auth: 'public', rateLimit: 'none', visibility: 'public', tag: 'downloads',
		description: 'Standalone CDN Worker (src/cdn-worker.ts, wrangler-cdn.jsonc). Serves pre-processed public media from MEDIA_BUCKET. While the queue is still processing, serves a localized cover-safe placeholder (processing.{lang}.webp) with Cache-Control: no-store.',
		params: [
			p('uuid', 'Media UUID', 'string (uuid v4)'),
			q('res', 'Resolution variant', { type: 'enum', enumValues: ['low','med','original'], defaultValue: 'med' }),
			q('format', 'Output format', { type: 'enum', enumValues: ['webp','png','gif','video'], defaultValue: 'webp' }),
		],
		response: { description: 'Binary — image (webp/png/gif) or video (mp4, Range-supported) with long immutable cache' },
		notes: 'Images: 6 variants per media (low/med/original × webp/png); videos: {uuid}/video.mp4 + {uuid}/original.gif poster. Range requests are forwarded for video so <video> can seek.',
	},
	// ---- Favorites & Collections --------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/favorites', summary: 'List favorites for the authenticated user', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'favorites',
		description: 'Returns the caller’s favorites, optionally scoped to a collection, with resource and author info. Sorted by display_order.',
		params: [q('collection_uuid', 'Collection UUID or null for uncategorized', { type: 'string (uuid v4 | null)' }), q('page', 'Page number', { type: 'integer', defaultValue: '1' }), q('limit', 'Items per page', { type: 'integer', defaultValue: '24' })],
		response: { description: 'JSON — UserFavoriteWithResource[] with pagination' },
	},
	{
		method: 'GET', path: '/api/favorites/ids', summary: 'List only favorite resource UUIDs', auth: 'optional', rateLimit: 'medium', visibility: 'private', tag: 'favorites',
		description: 'Returns just the UUIDs of the caller’s favorites. Anonymous users receive an empty list (not 401), so the frontend can hydrate favorite state before login.',
		params: [],
		response: { description: 'JSON — string[] (resource UUIDs)' },
	},
	{
		method: 'GET', path: '/api/favorites/check/:resourceUuid', summary: 'Check if a resource is favorited', auth: 'optional', rateLimit: 'medium', visibility: 'private', tag: 'favorites',
		description: 'Whether the caller has favorited a given resource. Anonymous → { is_favorite: false } (not 401).',
		params: [p('resourceUuid', 'Resource UUID to check')],
		response: { description: 'JSON — { is_favorite: boolean }' },
	},
	{
		method: 'POST', path: '/api/favorites', summary: 'Add a resource to favorites', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'favorites', schema: 'AddFavoriteSchema',
		description: 'Adds a resource to the caller’s favorites, optionally into a specific collection.',
		params: [b('resource_uuid', 'Resource UUID to favorite', { required: true, type: 'string (uuid v4)' }), b('collection_uuid', 'Target collection UUID', { type: 'string (uuid v4)' })],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'POST', path: '/api/favorites/reorder', summary: 'Reorder favorites within a collection', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'favorites', schema: 'FavoriteReorderSchema',
		description: 'Batch-reorders favorites. The ordered_uuids array must contain every favorite in the target scope in the desired order.',
		params: [b('ordered_uuids', 'All favorite resource UUIDs in desired order', { required: true, type: 'uuid[] (≤500)' }), b('collection_uuid', 'Target scope: collection UUID, null (uncategorized), or "all" (global order)', { required: true, type: 'string (uuid | "all" | null)' })],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'PUT', path: '/api/favorites/:resourceUuid/collection', summary: 'Move a favorite to a different collection', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'favorites', schema: 'FavoriteMoveSchema',
		description: 'Moves a single favorite to a different collection, or to uncategorized when collection_uuid is null.',
		params: [p('resourceUuid', 'Favorited resource UUID'), b('collection_uuid', 'Destination collection UUID (null → uncategorized)', { required: true, type: 'string (uuid v4 | null)' })],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'DELETE', path: '/api/favorites/:resourceUuid', summary: 'Remove a resource from favorites', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'favorites',
		description: 'Removes a single resource from the caller’s favorites.',
		params: [p('resourceUuid', 'Favorited resource UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'GET', path: '/api/collections', summary: 'List user collections', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'collections',
		description: 'Returns all collections for the caller, each with its favorite count, ordered by display_order.',
		params: [],
		response: { description: 'JSON — CollectionWithCount[]' },
	},
	{
		method: 'POST', path: '/api/collections', summary: 'Create a collection', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'collections', schema: 'CreateCollectionSchema',
		description: 'Creates a new favorites collection for the caller.',
		params: [b('name', 'Collection name (1–50 chars)', { required: true })],
		response: { description: '201 — Collection { uuid, name, display_order, created_at }' },
	},
	{
		method: 'PUT', path: '/api/collections/:uuid', summary: 'Rename a collection', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'collections', schema: 'CreateCollectionSchema',
		description: 'Renames an existing collection owned by the caller.',
		params: [p('uuid', 'Collection UUID'), b('name', 'New name (1–50 chars)', { required: true })],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'DELETE', path: '/api/collections/:uuid', summary: 'Delete a collection', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'collections',
		description: 'Deletes a collection. Favorites inside it become uncategorized (their collection_uuid is nulled).',
		params: [p('uuid', 'Collection UUID')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'POST', path: '/api/collections/reorder', summary: 'Reorder collections', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'collections', schema: 'CollectionReorderSchema',
		description: 'Batch-reorders all collections for the caller. The array must contain every collection UUID in the desired order.',
		params: [b('ordered_uuids', 'All collection UUIDs in desired order', { required: true, type: 'uuid[] (≤20)' })],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- Auth / Users -----------------------------------------------------------------------------------------
	{
		method: 'POST', path: '/api/auth/register', summary: 'Register a new user', auth: 'public', rateLimit: 'strict', visibility: 'private', tag: 'auth', schema: 'RegisterSchema',
		description: 'Creates a new user account. Turnstile CAPTCHA required.',
		params: [b('username', 'Username (3–32 chars, alphanumeric+_)', { required: true }), b('password', 'Password (8–100 chars)', { required: true, type: 'string' }), b('token', 'Turnstile token', { type: 'string' })],
		response: { description: '201 — AuthResponse { token, user } + sets sealed session cookie' },
	},
	{
		method: 'POST', path: '/api/auth/login', summary: 'Login', auth: 'public', rateLimit: 'login', visibility: 'private', tag: 'auth', schema: 'LoginSchema',
		description: 'Authenticates a user. When 2FA is enabled, returns a pre_auth_token instead of a session — the client must call POST /api/auth/login/2fa to complete login.',
		params: [b('username', 'Username', { required: true }), b('password', 'Password', { required: true }), b('token', 'Turnstile token', { type: 'string' })],
		response: { description: 'JSON — { token, user } or { pre_auth_token, requires_2fa: true }' },
	},
	{
		method: 'POST', path: '/api/auth/login/2fa', summary: 'Complete 2FA login', auth: 'public', rateLimit: 'login', visibility: 'private', tag: 'auth', schema: 'TwoFactorLoginSchema',
		description: 'Verifies a TOTP/backup code using the pre_auth_token from /login and creates the sealed session.',
		params: [b('username', 'Username', { required: true }), b('code', '6-digit TOTP or backup code', { required: true }), b('pre_auth_token', 'Pre-auth UUID from /login', { required: true, type: 'string (uuid v4)' })],
		response: { description: 'JSON — { token, user } + sets session cookie' },
	},
	{
		method: 'GET', path: '/api/auth/status', summary: 'Check auth status', auth: 'public', rateLimit: 'global', visibility: 'private', tag: 'auth',
		description: 'Returns whether the caller is authenticated and, when logged in, their user object.',
		params: [],
		response: { description: 'JSON — { authenticated: boolean, user?: User }' },
	},
	{
		method: 'POST', path: '/api/auth/logout', summary: 'Logout', auth: 'public', rateLimit: 'global', visibility: 'private', tag: 'auth',
		description: 'Clears the sealed session cookie and invalidates the KV session entry.',
		params: [],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'PUT', path: '/api/auth/me', summary: 'Update own profile', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'auth', schema: 'UserUpdateSchema',
		description: 'Updates the caller’s username, avatar_url, or anonymity flag. Turnstile may be required.',
		params: [b('username', 'New username (3–32 chars, alphanumeric+_)', { type: 'string' }), b('avatar_url', 'New avatar URL (https:// or /)', { type: 'string' }), b('is_anonymous', 'Anonymity flag', { type: 'integer (0|1)' })],
		response: { description: 'JSON — { success: true, user }' },
	},
	{
		method: 'POST', path: '/api/auth/me/password', summary: 'Change own password', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'auth', schema: 'ChangePasswordSchema',
		description: 'Changes the caller’s password. Requires current_password (unless OAuth-only account) and a valid 2FA code when 2FA is enabled.',
		params: [b('current_password', 'Current password', { type: 'string' }), b('new_password', 'New password (8–200 chars)', { required: true }), b('two_factor_code', 'TOTP/backup code when 2FA is enabled', { type: 'string' })],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- OAuth ------------------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/auth/google', summary: 'Start Google OAuth', auth: 'public', rateLimit: 'medium', visibility: 'private', tag: 'oauth',
		description: 'Redirects the user to Google’s OAuth consent screen. Used to link or sign in via Google.',
		params: [],
		response: { description: '302 — Redirect to Google consent URL' },
	},
	{
		method: 'GET', path: '/api/auth/google/callback', summary: 'Google OAuth callback', auth: 'public', rateLimit: 'medium', visibility: 'private', tag: 'oauth',
		description: 'Google redirects here after consent. Exchanges the code, verifies the id_token, and either creates a session or stores a pending registration in KV and redirects to the OAuthRegisterView.',
		params: [q('code', 'Authorization code from Google', { required: true }), q('state', 'Opaque state param', { type: 'string' })],
		response: { description: '302 — Redirect to /oauth-register (pending) or / (existing user) + sets session cookie' },
	},
	{
		method: 'POST', path: '/api/auth/complete', summary: 'Complete OAuth registration', auth: 'public', rateLimit: 'strict', visibility: 'private', tag: 'oauth',
		description: 'Called by OAuthRegisterView after the user picks a username for a pending Google registration.',
		params: [b('username', 'Chosen username (3–32 chars)', { required: true }), b('pending_token', 'Pending registration token from callback step', { type: 'string' })],
		response: { description: '201 — { token, user } + sets session cookie' },
	},
	// ---- Two-Factor -------------------------------------------------------------------------------------------
	{
		method: 'POST', path: '/api/2fa/setup', summary: 'Begin 2FA setup', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: '2fa', schema: 'TwoFactorSetupSchema',
		description: 'Generates a TOTP secret and an otpauth:// URL + QR code for the caller. The secret is not yet active until /2fa/verify.',
		params: [b('password', 'Current password (re-auth)', { type: 'string' })],
		response: { description: 'JSON — { secret, otpauth_url, qr_data_url }' },
	},
	{
		method: 'POST', path: '/api/2fa/verify', summary: 'Verify TOTP and enable 2FA', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: '2fa', schema: 'TwoFactorVerifySchema',
		description: 'Verifies the 6-digit TOTP code against the pending secret, enables 2FA, and returns one-time backup codes.',
		params: [b('code', '6-digit TOTP code', { required: true })],
		response: { description: 'JSON — { backup_codes: string[] }' },
	},
	{
		method: 'POST', path: '/api/2fa/disable', summary: 'Disable 2FA', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: '2fa', schema: 'TwoFactorDisableSchema',
		description: 'Disables 2FA for the caller. Requires password or valid TOTP/backup code.',
		params: [b('password', 'Current password', { type: 'string' }), b('code', 'TOTP or backup code', { type: 'string' })],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'GET', path: '/api/2fa/status', summary: 'Get 2FA status', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: '2fa',
		description: 'Whether 2FA is enabled for the caller.',
		params: [],
		response: { description: 'JSON — { enabled: boolean }' },
	},
	// ---- Admin ------------------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/admin/pending', summary: 'List pending (inactive) resources', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'All inactive resources awaiting moderation, with author and media info.',
		params: [],
		response: { description: 'JSON — ResourceWithMedia[]' },
	},
	{
		method: 'POST', path: '/api/admin/resource/:uuid/approve', summary: 'Approve a pending resource', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Flips is_active to 1, invalidates caches, bumps the change_feed for the resource’s category scope, and broadcasts via FeedRoom.',
		params: [p('uuid', 'Resource UUID to approve')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'POST', path: '/api/admin/resource/:uuid/reject', summary: 'Reject and delete a pending resource', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Deletes the resource and its R2 objects/media rows. Only pending (inactive) resources can be rejected.',
		params: [p('uuid', 'Resource UUID to reject')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'POST', path: '/api/admin/resource/:uuid/deactivate', summary: 'Deactivate an approved resource', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Flips an approved resource back to inactive and invalidates caches.',
		params: [p('uuid', 'Resource UUID to deactivate')],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'GET', path: '/api/admin/stats/orphaned-media', summary: 'Orphaned-media stats (no deletion)', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Counts orphaned media inside the 24h–48h age window (same predicate the cron uses). No files are deleted.',
		params: [],
		response: { description: 'JSON — { count, totalSize, oldestTimestamp }' },
	},
	{
		method: 'POST', path: '/api/admin/cleanup/orphaned-media', summary: 'Delete orphaned media (R2 + DB)', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Deletes orphaned media inside the 24h–48h window: variant objects from MEDIA_BUCKET, original from BUCKET, then media row (cascades to media_variants). Reuses the same logic as the daily cron.',
		params: [],
		response: { description: 'JSON — { success: true, deleted, message }' },
	},
	{
		method: 'POST', path: '/api/admin/cache/clear/:username', summary: 'Clear KV session cache for a user', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Deletes user:<username> from KV — useful after role changes to force re-resolution.',
		params: [p('username', 'Target username', 'string')],
		response: { description: 'JSON — { success: true, message }' },
	},
	{
		method: 'POST', path: '/api/admin/users/:username/role', summary: 'Set a user’s admin flag', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Updates is_admin for a target user and immediately invalidates their KV cache so a demoted admin cannot retain elevated access for up to 7 days.',
		params: [p('username', 'Target username', 'string'), b('is_admin', 'New admin flag (0 or 1)', { required: true, type: 'integer (0|1)' })],
		response: { description: 'JSON — { success: true, username, is_admin }' },
	},
	{
		method: 'GET', path: '/api/admin/stats', summary: 'Dashboard aggregate stats', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Consolidated metrics for the admin dashboard overview section (resource counts, user counts, pending count, etc.).',
		params: [],
		response: { description: 'JSON — AdminStats { totalResources, pendingResources, totalUsers, ... }' },
	},
	{
		method: 'GET', path: '/api/admin/users', summary: 'List users (paginated, searchable)', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Paginated user listing with optional username prefix search.',
		params: [q('q', 'Username search prefix', { type: 'string' }), q('page', 'Page number', { type: 'integer', defaultValue: '1' })],
		response: { description: 'JSON — { users, pagination }' },
	},
	{
		method: 'GET', path: '/api/admin/resources', summary: 'List all resources (filterable)', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'All resources (active + pending) with optional category/status/text filters.',
		params: [q('q', 'Title search', { type: 'string' }), q('category', 'Category filter', { type: 'enum', enumValues: ['avatars','assets','clothes','worlds'] }), q('status', 'Active filter', { type: 'enum', enumValues: ['active','pending'] }), q('page', 'Page number', { type: 'integer', defaultValue: '1' })],
		response: { description: 'JSON — { resources, pagination }' },
	},
	{
		method: 'POST', path: '/api/admin/media/generate-variants', summary: 'Backfill image variants (enqueue)', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Enqueues UPLOAD_QUEUE messages for every image/video that has no variants yet, so the queue handler regenerates them.',
		params: [],
		response: { description: 'JSON — { enqueued: number }' },
	},
	{
		method: 'POST', path: '/api/admin/media/unify-keys', summary: 'One-off: unify media R2 keys to UUIDs', auth: 'admin', rateLimit: 'medium', visibility: 'internal', tag: 'admin',
		description: 'Maintenance migration — copies each original in BUCKET to the key equal to its UUID, rewrites free-text references, repoints the media.r2_key column, then deletes the old object. Defaults to a dry-run; pass ?confirm=true to execute. Idempotent and re-runnable with ?limit=N per pass.',
		params: [q('confirm', 'When "true", performs writes; otherwise dry-run', { type: 'enum', enumValues: ['true'] }), q('limit', 'Max rows per pass (Worker CPU budget)', { type: 'integer' })],
		response: { description: 'JSON — { dryRun, processed, remaining, textReferences }' },
	},
	// ---- System -----------------------------------------------------------------------------------------------
	{
		method: 'GET', path: '/api/config', summary: 'Public site configuration', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'system',
		description: 'Returns public configuration needed by the frontend (Turnstile site key, etc.). No auth required.',
		params: [],
		response: { description: 'JSON — { turnstileSiteKey }' },
	},
	{
		method: 'GET', path: '/api/version', summary: 'Worker version and request metadata', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'system',
		description: 'Unauthenticated deployment metadata: version ID/tag, commit hash, compatibility date, Cloudflare Ray/colo/country. Intentionally public for debugging.',
		params: [],
		response: { description: 'JSON — { worker: { versionId, versionTag, commitHash, deployedAt, compatibilityDate }, runtime, request: { rayId, colo, country } }' },
	},
	// ---- Realtime (feed / updates / chat / notifications) ------------------------------------------------------
	{
		method: 'GET', path: '/api/updates', summary: 'Polling change feed (fallback for live feed)', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'realtime',
		description: 'Returns the server clock and the newest change timestamp per scope (avatars/assets/clothes/blog/comments) since ?since. The frontend polls this when the live WebSocket is down. Scopes map to DataCache prefixes the client invalidates.',
		params: [q('since', 'Cursor in Unix ms (0 for full)', { required: true, type: 'integer (unix ms)' })],
		response: { description: 'JSON — { now, changes: { avatars, assets, clothes, blog, comments } }' },
	},
	{
		method: 'GET', path: '/api/feed/live', summary: 'Live feed WebSocket', auth: 'public', rateLimit: 'medium', visibility: 'public', tag: 'realtime',
		description: 'Upgrades to a WebSocket backed by the global FeedRoom Durable Object. Broadcasts FeedEvent { scope, action, entityId, title?, category?, thumbnailUuid?, isNsfw? } in real time. When open, the frontend suspends the /api/updates poller; when it drops, the poller resumes and covers the gap. Same reconciler drives both paths.',
		params: [],
		response: { description: '101 Switching Protocols — WebSocket frames are JSON FeedEvent objects' },
	},
	{
		method: 'GET', path: '/api/chat/live', summary: 'Global chat WebSocket', auth: 'optional', rateLimit: 'medium', visibility: 'public', tag: 'realtime',
		description: 'Upgrades to a WebSocket backed by the global ChatRoom Durable Object. Reading is public; only authenticated sockets may send. Text-only, ≤50 chars, backlog of 50 messages. The route stamps X-Chat-User-Uuid/Username headers before forwarding to the DO — the client never supplies identity.',
		params: [],
		response: { description: '101 — WebSocket. Client sends { type: "send", text }; server emits { type: "history" | "message" | "purged" | "error", ... }' },
	},
	{
		method: 'POST', path: '/api/chat/purge', summary: 'Purge global chat (admin)', auth: 'admin', rateLimit: 'strict', visibility: 'internal', tag: 'realtime',
		description: 'Empties the ChatRoom history for everyone. Admin-only, rate-limited to 1/min (strict). HTTP (not a socket message) so the DO never reasons about roles.',
		params: [],
		response: { description: 'JSON — { success: true }' },
	},
	{
		method: 'GET', path: '/api/notifications/preferences', summary: 'Get notification preferences', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'realtime',
		description: 'Returns the caller’s browser Notification preferences (defaults when never saved).',
		params: [],
		response: { description: 'JSON — NotificationPrefs { enabled, avatars_enabled, avatar_types, assets_enabled, asset_types, clothes_enabled, updated_at }' },
	},
	{
		method: 'PUT', path: '/api/notifications/preferences', summary: 'Save notification preferences', auth: 'auth', rateLimit: 'medium', visibility: 'private', tag: 'realtime',
		description: 'Persists the caller’s Notification preferences (which approved-resource scopes and avatar/asset sub-types should trigger a browser notification).',
		params: [b('enabled', 'Master toggle', { required: true, type: 'boolean' }), b('avatars_enabled', 'Notify for avatars', { required: true, type: 'boolean' }), b('avatar_types', 'Which avatar types to notify', { type: 'string[] | null' }), b('assets_enabled', 'Notify for assets', { required: true, type: 'boolean' }), b('asset_types', 'Which asset types to notify', { type: 'string[] | null' }), b('clothes_enabled', 'Notify for clothes', { required: true, type: 'boolean' })],
		response: { description: 'JSON — { success: true }' },
	},
	// ---- CDN edge case: wiki markdown raw fetch is not an /api route but should be documented ---------------
	{
		method: 'GET', path: '/wiki/:lang/:topic.md', summary: 'Raw wiki markdown (static asset)', auth: 'public', rateLimit: 'global', visibility: 'public', tag: 'site',
		description: 'Raw Markdown source for a wiki article, served from ASSETS (public/wiki/{lang}/{topic}.md). The frontend falls back to English when the localized file is missing.',
		params: [p('lang', 'Locale code', 'enum (cn/de/en/es/fr/it/jp/nl/pl/pt/ru/tr)'), p('topic', 'Article slug (e.g. "home", "poiyomi")', 'string')],
		response: { description: 'text/markdown — raw Markdown, or the SPA shell HTML when missing (fallback signal)' },
	},
];

// =========================================================================================================
// Manifest builder
// =========================================================================================================

export function buildManifest(): ApiDocsManifest {
	return {
		$schema: `${SITE_URL}/api/docs/schema.json`,
		site: {
			name: 'VRCStorage',
			baseUrl: SITE_URL,
			summary: 'Community-driven platform for sharing and downloading VRChat resources: avatars, assets, and clothing.',
			description:
				'VRCStorage is hosted at https://vrcstorage.lat. Content is age-gated (18+). Resources are organised into three primary categories: Avatars (full VRChat-ready packages), Assets (Unity-compatible shaders, tools, scripts, props, and prefabs), and Clothes (wearable clothing and accessories for popular avatar bases). All content is user-submitted and free to download after registration. The platform serves a global audience in 12 languages.',
			version: '2026-02-12',
		},
		siteSections: SITE_SECTIONS,
		endpoints: ENDPOINTS,
	};
}
