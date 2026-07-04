import { z } from 'zod';
import { RESOURCE_CATEGORIES } from './types';
// ============================================================================
// Sanitization Helper
// ============================================================================

// DOMPurify requires a real `document` object which Cloudflare Workers doesn't
// provide. Since we strip all tags anyway, a regex-based approach is equivalent
// and works in any JS environment.
// Hard limit applied BEFORE any regex to prevent ReDoS via catastrophic backtracking.
// A well-formed user input should never exceed this; anything larger is rejected outright.
const MAX_SANITIZE_LENGTH = 100_000;

const sanitizeHtml = (str: string | undefined | null): string => {
	if (!str || typeof str !== 'string') return '';
	if (str.length > MAX_SANITIZE_LENGTH) throw new Error('Input exceeds maximum allowed length');
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// ============================================================================
// Auth Schemas
// ============================================================================

export const RegisterSchema = z.object({
	username: z
		.string()
		.min(3, 'Username must be at least 3 characters')
		.max(32, 'Username too long')
		.regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric'),
	password: z.string().min(8, 'Password must be at least 8 characters').max(100),
	token: z.string().nullish(), // Turnstile token
});

export const LoginSchema = z.object({
	// Max lengths prevent bcrypt DoS — bcrypt silently truncates at 72 bytes but hashing
	// a 1 MB string still wastes significant CPU. Cap early at the schema layer.
	username: z.string().min(1).max(32),
	password: z.string().min(1).max(200),
	token: z.string().nullish(),
});

export const UserUpdateSchema = z.object({
	username: z
		.string()
		.min(3, 'Username must be at least 3 characters')
		.max(32, 'Username too long')
		.regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric')
		.optional(),
	avatar_url: z
		.string()
		.optional()
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	token: z.string().optional(),
});

// ============================================================================
// Resource Schemas
// ============================================================================

export const LinkSchema = z.object({
	link_url: z.string().transform((val) => (val ? sanitizeHtml(val) : val)), // Allow relative URLs
	link_title: z
		.string()
		.optional()
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	link_type: z.enum(['download', 'demo', 'documentation', 'general']).default('general'),
	display_order: z.number().int().optional(),
});

export const LinkUpdateSchema = z.object({
	link_url: z
		.string()
		.optional()
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	link_title: z
		.string()
		.optional()
		.nullable()
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	link_type: z.enum(['download', 'demo', 'documentation', 'general']).optional(),
	display_order: z.number().int().optional(),
});

export const ResourceSchema = z.object({
	title: z
		.string()
		.min(3, 'Title too short')
		.max(100, 'Title too long')
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	description: z
		.string()
		.max(2000, 'Description too long')
		.optional()
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	category: z.enum(RESOURCE_CATEGORIES),
	thumbnail_uuid: z.uuid('Invalid thumbnail UUID'),
	reference_image_uuid: z.uuid('Invalid reference image UUID').optional().nullable(),
	links: z.array(LinkSchema).optional(),
	media_files: z.array(z.uuid()).optional(),
	token: z.string().optional(),
});

export const ResourceSearchSchema = z.object({
	q: z.string().optional(),
	category: z.enum(RESOURCE_CATEGORIES),
	page: z.number().int().default(1),
});

// ============================================================================
// Comment Schemas
// ============================================================================

export const CommentSchema = z.object({
	text: z
		.string()
		.min(3, 'Comment must be at least 3 characters')
		.max(500, 'Comment too long')
		.transform((val) => sanitizeHtml(val.trim().replace(/\n{3,}/g, '\n\n'))), // Limit max 2 newlines
	token: z.string().optional(),
});

// ============================================================================
// Favorite Schemas
// ============================================================================

export const AddFavoriteSchema = z.object({
	resource_uuid: z.uuid('Invalid resource UUID'),
});

export const FavoriteOrderSchema = z.object({
	resource_uuid: z.uuid('Invalid resource UUID'),
	move_to_top: z
		.boolean()
		.optional()
		.transform((val) => val ?? false),
});

// ============================================================================
// 2FA Schemas
// ============================================================================

export const TwoFactorSetupSchema = z.object({
	password: z.string().min(1, 'Password is required').optional(),
	token: z.string().optional(),
});

export const TwoFactorVerifySchema = z.object({
	code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

export const TwoFactorDisableSchema = z.object({
	password: z.string().min(1, 'Password is required').optional(),
	code: z.string().optional(),
	token: z.string().optional(),
});

export const TwoFactorLoginSchema = z.object({
	username: z.string(),
	code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
	pre_auth_token: z.uuid('Invalid pre-auth token'),
});

// ============================================================================
// Blog Schemas
// ============================================================================

export const BlogPostSchema = z.object({
	title: z
		.string()
		.min(3, 'Title too short')
		.max(200, 'Title too long')
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	content: z
		.string()
		.min(1, 'Content is required')
		.max(100000, 'Content too long')
		.transform((val) => sanitizeHtml(val)),
	excerpt: z
		.string()
		.max(500, 'Excerpt too long')
		.optional()
		.nullable()
		.transform((val) => (val ? sanitizeHtml(val) : val)),
	cover_image_uuid: z.uuid('Invalid cover image UUID').optional().nullable(),
	author_display: z.enum(['personal', 'team']).default('personal'),
});

export const BlogPostUpdateSchema = BlogPostSchema.partial().extend({
	title: z
		.string()
		.min(3, 'Title too short')
		.max(200, 'Title too long')
		.transform((val) => (val ? sanitizeHtml(val) : val))
		.optional(),
});

export const BlogCommentSchema = z.object({
	text: z
		.string()
		.min(3, 'Comment must be at least 3 characters')
		.max(1000, 'Comment too long')
		.transform((val) => sanitizeHtml(val.trim().replace(/\n{3,}/g, '\n\n'))),
	token: z.string().optional(),
});

// ============================================================================
// Password Change Schema
// ============================================================================

/**
 * Used by PUT /api/users/me/password.
 * Requires the current password as a re-authentication step before allowing
 * the password to be changed — protects against XSS-driven CSRF chain attacks.
 */
export const ChangePasswordSchema = z.object({
	current_password: z.string().min(1, 'Current password is required').max(200).optional(),
	new_password: z.string().min(8, 'New password must be at least 8 characters').max(200, 'New password is too long'),
	// Optional: required only when the user has 2FA enabled. Can be a TOTP code or a backup code.
	two_factor_code: z.string().optional(),
	token: z.string().optional(),
});

// ============================================================================
// Category Schemas
// ============================================================================

// Generic
// Exported so downstream tooling (e.g. the llms.txt generator) documents the exact allowed
// filter values from this single source of truth instead of duplicating them.
export const PLATFORM = ['pc', 'quest', 'cross'] as const;
export const SDK_VERSION = ['sdk3', 'sdk2'] as const;
export const UNITY_VERSION = ['2019', '2022'] as const;
const BOOLEAN_STRING = ['0', '1'] as const;

// Avatars
export const AVATAR_GENDER = [
	'male',
	'female',
	'androgynous',
	'undefined',
	'both'
] as const;

export const AVATAR_SIZE = [
	'tiny',
	'small',
	'medium',
	'tall',
	'giant'
] as const;

export const AVATAR_TYPE = [
	'human',
	'anime',
	'furry',
	'chibi',
	'cartoon',
	'semi-realistic',
	'monster',
	'fantasy',
	'mecha',
	'kemono',
	'other'
] as const;



// Assets
export const ASSETS_TYPE = [
	'prop',			'shader',		'particle',
	'vfx',			'prefab',		'script',
	'animation',	'avatar-base',	'texture-pack',
	'sound',		'tool',			'hud',
	'other',
] as const;

// Clothes
export const CLOTHES_GENDER = ['male', 'female', 'unisex', 'kemono'] as const;
export const CLOTHES_TYPES = [
	'top',			'jacket',		'bottom',
	'dress',		'fullbody',		'swimwear',
	'shoes',		'legwear',		'hat',
	'hair',			'accessory',	'tail',
	'ears',			'wings',		'body-part',
	'underwear',	'other',
] as const

export const AvatarAuthorSchema = z.object({
	name: z
		.string()
		.min(1, 'Name required')
		.max(70)
		.transform((v) => sanitizeHtml(v)),
	description: z
		.string()
		.max(2000)
		.optional()
		.nullable()
		.transform((v) => (v ? sanitizeHtml(v) : v)),
	avatar_url: 		z.string().min(1).max(500).optional().nullable(),
	website_url: 		z.url().optional().nullable(),
	twitter_url: 		z.url().optional().nullable(),
	booth_url: 			z.url().optional().nullable(),
	gumroad_url: 		z.url().optional().nullable(),
	patreon_url: 		z.url().optional().nullable(),
	discord_url: 		z.url().optional().nullable(),
});

export const AvatarMetaSchema = z.object({
	author_uuid: 		z.uuid().optional().nullable(),
	author_name_raw: z
		.string()
		.max(70)
		.optional()
		.nullable()
		.transform((v) => (v ? sanitizeHtml(v) : v)),
	gender: 			z.enum(AVATAR_GENDER),
	avatar_size: 		z.enum(AVATAR_SIZE),
	avatar_type: 		z.enum(AVATAR_TYPE),
	is_nsfw: 			z.number().int().min(0).max(1).default(0),
	has_physbones: 		z.number().int().min(0).max(1).default(0),
	has_face_tracking: 	z.number().int().min(0).max(1).default(0),
	has_dps: 			z.number().int().min(0).max(1).default(0),
	has_gogoloco: 		z.number().int().min(0).max(1).default(0),
	has_toggles: 		z.number().int().min(0).max(1).default(0),
	is_quest_optimized: z.number().int().min(0).max(1).default(0),
	sdk_version: 		z.enum(SDK_VERSION).default(SDK_VERSION[0]),
	platform: 			z.enum(PLATFORM).default(PLATFORM[1]),
});

export const AssetMetaSchema = z.object({
	asset_type: 		z.enum(ASSETS_TYPE),
	is_nsfw: 			z.number().int().min(0).max(1).default(0),
	unity_version: 		z.enum(UNITY_VERSION).default(UNITY_VERSION[1]),
	platform: 			z.enum(PLATFORM).default(PLATFORM[0]),
	sdk_version: 		z.enum(SDK_VERSION).default(SDK_VERSION[0]),
});

/**
 * Query-param filter schema for GET /api/assets. Tolerant by design (see AvatarFilterSchema):
 * unrecognized facet values are dropped and malformed pagination/sort falls back to defaults,
 * mirroring the legacy handler which silently ignored unsupported filters.
 */
export const AssetFilterSchema = z.object({
	asset_type: 		AssetMetaSchema.shape.asset_type.optional().catch(undefined),
	platform: 			AssetMetaSchema.shape.platform.optional().catch(undefined),
	sdk_version: 		AssetMetaSchema.shape.sdk_version.optional().catch(undefined),
	unity_version: 		AssetMetaSchema.shape.unity_version.optional().catch(undefined),
	is_nsfw: 			z.enum(BOOLEAN_STRING).optional().catch(undefined),
	page: 				z.coerce.number().int().min(1).catch(1).default(1),
	limit: 				z.coerce.number().int().min(1).max(60).catch(24).default(24),
	sort_by: 			z.enum(['created_at', 'download_count', 'title']).catch('created_at').default('created_at'),
	sort_order: 		z.enum(['asc', 'desc']).catch('desc').default('desc'),
});

export type AssetFilter = z.infer<typeof AssetFilterSchema>;

/**
 * Query-param filter schema for GET /api/avatars.
 * Derived from AvatarMetaSchema so allowed values stay in sync automatically.
 *
 * Tolerant by design: an unrecognized facet value is dropped (`.catch(undefined)`)
 * rather than rejecting the whole request, and malformed pagination/sort params fall
 * back to their defaults. This mirrors the legacy handler, which silently ignored
 * unsupported filter keys instead of returning 400.
 */
export const AvatarFilterSchema = z.object({
	// Faceted filters — reuse the same enums as AvatarMetaSchema
	avatar_gender: 		AvatarMetaSchema.shape.gender.optional().catch(undefined),
	avatar_size: 		AvatarMetaSchema.shape.avatar_size.optional().catch(undefined),
	avatar_type: 		AvatarMetaSchema.shape.avatar_type.optional().catch(undefined),
	platform: 			AvatarMetaSchema.shape.platform.optional().catch(undefined),
	sdk_version: 		AvatarMetaSchema.shape.sdk_version.optional().catch(undefined),
	// Boolean flags come as '0'/'1' strings from URLSearchParams
	is_nsfw: 			z.enum(BOOLEAN_STRING).optional().catch(undefined),
	has_physbones: 		z.enum(BOOLEAN_STRING).optional().catch(undefined),
	has_face_tracking: 	z.enum(BOOLEAN_STRING).optional().catch(undefined),
	has_dps: 			z.enum(BOOLEAN_STRING).optional().catch(undefined),
	has_gogoloco: 		z.enum(BOOLEAN_STRING).optional().catch(undefined),
	has_toggles: 		z.enum(BOOLEAN_STRING).optional().catch(undefined),
	is_quest_optimized: z.enum(BOOLEAN_STRING).optional().catch(undefined),
	// Author filter
	author_uuid: 		z.uuid().optional().catch(undefined),
	// Pagination & sorting
	page: 				z.coerce.number().int().min(1).catch(1).default(1),
	limit: 				z.coerce.number().int().min(1).max(60).catch(24).default(24),
	sort_by: 			z.enum(['created_at', 'download_count', 'title']).catch('created_at').default('created_at'),
	sort_order: 		z.enum(['asc', 'desc']).catch('desc').default('desc'),
});

export type AvatarFilter = z.infer<typeof AvatarFilterSchema>;

export const ClothesMetaSchema = z.object({
	gender_fit: 		z.enum(CLOTHES_GENDER),
	clothing_type: 		z.enum(CLOTHES_TYPES),
	is_base: 			z.number().int().min(0).max(1).default(0),
	base_avatar_uuid: 	z.uuid().optional().nullable(),
	base_avatar_name_raw: z
		.string()
		.max(200)
		.optional()
		.nullable()
		.transform((v) => (v ? sanitizeHtml(v) : v)),
	is_nsfw: 			z.number().int().min(0).max(1).default(0),
	has_physbones: 		z.number().int().min(0).max(1).default(0),
	platform: 			z.enum(PLATFORM).default(PLATFORM[0]),
});

/**
 * Query-param filter schema for GET /api/clothes. Tolerant by design (see AvatarFilterSchema):
 * unrecognized facet values are dropped and malformed pagination/sort falls back to defaults,
 * mirroring the legacy handler which silently ignored unsupported filters.
 */
export const ClothesFilterSchema = z.object({
	gender_fit: 		ClothesMetaSchema.shape.gender_fit.optional().catch(undefined),
	clothing_type: 		ClothesMetaSchema.shape.clothing_type.optional().catch(undefined),
	platform: 			ClothesMetaSchema.shape.platform.optional().catch(undefined),
	is_base: 			z.enum(BOOLEAN_STRING).optional().catch(undefined),
	is_nsfw: 			z.enum(BOOLEAN_STRING).optional().catch(undefined),
	has_physbones: 		z.enum(BOOLEAN_STRING).optional().catch(undefined),
	page: 				z.coerce.number().int().min(1).catch(1).default(1),
	limit: 				z.coerce.number().int().min(1).max(60).catch(24).default(24),
	sort_by: 			z.enum(['created_at', 'download_count', 'title']).catch('created_at').default('created_at'),
	sort_order: 		z.enum(['asc', 'desc']).catch('desc').default('desc'),
});

export type ClothesFilter = z.infer<typeof ClothesFilterSchema>;


