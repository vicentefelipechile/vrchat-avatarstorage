// =========================================================================================================
// DOCS — TYPE DEFINITIONS
// =========================================================================================================
// Single source of vocabulary for the auto-generated API documentation. Every endpoint that
// exists in src/http/routes/* should have a corresponding entry in src/docs/registry.ts.
// The generator in src/docs/generator.ts renders these into llms.txt / llms-full.txt / JSON.
// =========================================================================================================

// =========================================================================================================
// Core vocabulary
// =========================================================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthLevel = 'public' | 'auth' | 'admin' | 'optional';
export type RateLimitTier = 'strict' | 'medium' | 'global' | 'login' | 'none';
export type Visibility = 'public' | 'private' | 'internal';

/** Where a param lives on the wire. */
export type ParamLocation = 'path' | 'query' | 'header' | 'body' | 'cookie';

// =========================================================================================================
// Param & response descriptors
// =========================================================================================================

export interface ParamDoc {
	/** The wire name, e.g. "page", "uuid", "X-Upload-ID". */
	name: string;
	location: ParamLocation;
	required: boolean;
	/** Human-readable type, e.g. "integer", "string (uuid v4)", "enum". */
	type: string;
	/** One-line description shown in llms-full.txt. */
	description: string;
	/** Allowed values for enums — kept as strings for serialisation. */
	enumValues?: string[];
	/** Default value when omitted, if any. */
	defaultValue?: string;
}

export interface ResponseDoc {
	/** MIME + shape summary, e.g. "application/json — { resources, pagination }". */
	description: string;
	/** Optional concrete example (pretty-printed JSON). Used in llms-full.txt. */
	example?: string;
}

// =========================================================================================================
// Endpoint descriptor
// =========================================================================================================

export interface EndpointDoc {
	/** HTTP verb. */
	method: HttpMethod;
	/** Full path as mounted in src/index.ts, with colon-style params (e.g. "/api/avatars/:uuid"). */
	path: string;
	/** One-line summary — becomes the link text in llms.txt. */
	summary: string;
	/** Longer prose — shown in llms-full.txt and /api/docs. */
	description: string;
	/** Auth requirement as enforced by the route guards in src/http/middleware/auth.ts. */
	auth: AuthLevel;
	/** Rate-limit tier from src/http/rate-limits.ts. "none" means only the global catch-all applies. */
	rateLimit: RateLimitTier;
	/** "public" endpoints appear in curated llms.txt; everything appears in llms-full.txt. */
	visibility: Visibility;
	/** Section key — drives grouping in the generated markdown (e.g. "avatars", "admin"). */
	tag: string;
	/** Optional deprecation note. When present the endpoint is marked deprecated in docs. */
	deprecated?: string;
	/** All params (query/path/header/body). Use [] when there are none. */
	params: ParamDoc[];
	/** Response shape summary. */
	response: ResponseDoc;
	/** Zod schema name or validator when applicable (for cross-reference). */
	schema?: string;
	/** Optional free-form notes, e.g. caching behaviour. */
	notes?: string;
}

// =========================================================================================================
// Site-level metadata
// =========================================================================================================

export interface SiteSection {
	title: string;
	url: string;
	description: string;
}

export interface ApiDocsManifest {
	$schema: string;
	site: {
		name: string;
		baseUrl: string;
		summary: string;
		description: string;
		version: string;
	};
	siteSections: SiteSection[];
	endpoints: EndpointDoc[];
}

export type TagGroup = {
	tag: string;
	label: string;
	description: string;
};
