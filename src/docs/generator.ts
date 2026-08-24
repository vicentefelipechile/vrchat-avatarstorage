// =========================================================================================================
// DOCS — GENERATOR
// =========================================================================================================
// Pure, side-effect-free renderers that turn the registry (src/docs/registry.ts) into
// the three artefacts the platform serves:
//
//   buildLlmsTxt()      → the curated /llms.txt             (llmstxt.org spec, public reads only)
//   buildLlmsFullTxt()  → the exhaustive /llms-full.txt      (every endpoint, every param)
//   buildApiJson()      → JSON for /api/docs                 (machine-readable)
//
// All three are deterministic string builders — no I/O, no env access — so they can run
// at build time (public/llms.txt, public/llms-full.txt) or at request time for /api/docs.
// /llms.txt and /llms-full.txt are static ASSETS to avoid per-request Worker CPU; only
// /api/docs is live (for ?tag= filtering). Cache-Control for the static files is handled
// by the ASSETS binding / edge cache; for /api/docs it is set in the route handler.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { ApiDocsManifest, EndpointDoc } from './types';
import { buildManifest, TAG_GROUPS, WIKI_TOPICS, SITE_URL, CDN_URL } from './registry';

// =========================================================================================================
// Helpers
// =========================================================================================================

function authLabel(auth: EndpointDoc['auth']): string {
	switch (auth) {
		case 'public': return 'No auth';
		case 'optional': return 'Optional auth (gated field)';
		case 'auth': return 'Auth required';
		case 'admin': return 'Admin only';
		default: return auth;
	}
}

function rateLabel(tier: EndpointDoc['rateLimit']): string {
	if (tier === 'none') return 'global catch-all';
	return tier;
}

function toAscii(s: string): string {
	return s
		.replace(/—/g, '-')
		.replace(/–/g, '-')
		.replace(/·/g, '|')
		.replace(/×/g, 'x')
		.replace(/≤/g, '<=')
		.replace(/≥/g, '>=')
		.replace(/→/g, '->')
		.replace(/←/g, '<-')
		.replace(/[’‘]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/…/g, '...')
		.replace(/\u00A0/g, ' ');
}

function escapeMd(s: string): string {
	return toAscii(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function paramTable(params: EndpointDoc['params']): string {
	if (!params.length) return 'No parameters.\n';
	const header = '| Location | Name | Type | Required | Description |\n| :------- | :--- | :--- | :------- | :---------- |\n';
	const rows = params.map((p) => {
		const req = p.required ? 'Yes' : 'No';
		// Use comma separator for enum values to avoid escaped pipes breaking LLM parsers
		const type = p.enumValues ? `${escapeMd(p.type)} (${p.enumValues.join(', ')})` : escapeMd(p.type);
		const def = p.defaultValue ? ` Default: \`${escapeMd(p.defaultValue)}\`.` : '';
		return `| ${p.location} | \`${escapeMd(p.name)}\` | ${type} | ${req} | ${escapeMd(p.description)}${def} |`;
	});
	return header + rows.join('\n') + '\n';
}

function sectionForTag(tag: string, endpoints: EndpointDoc[]): string {
	const meta = TAG_GROUPS.find((g) => g.tag === tag);
	const label = meta?.label ?? tag;
	const desc = meta?.description ? toAscii(meta.description) : '';
	return `## ${label}${desc ? ` - ${desc}` : ''}\n\n` + endpoints.map(endpointBlock).join('\n');
}

function endpointBlock(e: EndpointDoc): string {
	const deprecated = e.deprecated ? `> **Deprecated:** ${toAscii(e.deprecated)}\n\n` : '';
	const params = paramTable(e.params);
	const notes = e.notes ? `\n> Note: ${toAscii(e.notes)}\n` : '';
	return [
		`### \`${e.method} ${e.path}\``,
		`${deprecated}**${toAscii(e.summary)}** - ${toAscii(e.description)}`,
		`- Auth: ${authLabel(e.auth)} | Rate limit: ${rateLabel(e.rateLimit)} | Visibility: ${e.visibility}`,
		`**Parameters**\n\n${params.trim()}`,
		`**Response** - ${toAscii(e.response.description)}${e.response.example ? `\n\n\`\`\`json\n${e.response.example}\n\`\`\`` : ''}`,
		notes.trim() ? notes.trim() : null,
	].filter(Boolean).join('\n\n') + '\n';
}

function curatedLine(e: EndpointDoc): string {
	// llms.txt curates as list items with a URL + colon description (per spec § "H2 sections").
	// We link to the API path (absolute) and include the method + auth hint.
	const url = e.path.startsWith('http') ? e.path : `${SITE_URL}${e.path}`;
	const method = `\`${e.method}\``;
	const auth = authLabel(e.auth);
	const params = e.params.filter((p) => p.location === 'query').map((p) => `\`${escapeMd(p.name)}\``).join(', ');
	const paramHint = params ? ` Query: ${params}.` : '';
	return `- [${method} ${escapeMd(e.path)}](${url}): ${toAscii(e.summary)} - ${toAscii(e.description)} (${auth}.${paramHint} Response: ${toAscii(e.response.description)})`;
}

// =========================================================================================================
// Public builders
// =========================================================================================================

/**
 * Curated llms.txt — follows the llmstxt.org specification (§1–5):
 *   H1 project name, blockquote summary, freeform context, H2 curated lists, ## Optional tail.
 * Only `visibility: 'public'` endpoints are listed so the file stays concise and unauthenticated
 * clients get a useful starting point without wading through admin/write endpoints.
 */
export function buildLlmsTxt(manifest: ApiDocsManifest = buildManifest()): string {
	const publicEndpoints = manifest.endpoints.filter((e) => e.visibility === 'public');
	const byTag = new Map<string, EndpointDoc[]>();
	for (const e of publicEndpoints) {
		const arr = byTag.get(e.tag) ?? [];
		arr.push(e);
		byTag.set(e.tag, arr);
	}

	// Explicit ordering: site first, then the three resource categories, then generic resources, etc.
	const tagOrder = ['site', 'avatars', 'assets', 'clothes', 'resources', 'authors', 'blog', 'comments', 'wiki', 'media', 'downloads', 'system', 'realtime'];
	const orderedTags = tagOrder.filter((t) => byTag.has(t));

	const lines: string[] = [];

	// --- Header (spec §1–3) ---
	lines.push(`# ${manifest.site.name}`);
	lines.push('');
	lines.push(`> ${manifest.site.summary}`);
	lines.push('');
	lines.push(manifest.site.description);
	lines.push('');
	lines.push(`All API endpoints return JSON. Pagination follows a consistent shape: \`{ page, limit, total, hasNextPage, hasPrevPage }\` or \`{ page, limit, total, total_pages }\` for blog. UUIDs are v4 strings. Timestamps are Unix milliseconds unless noted.`);
	lines.push('');
	lines.push(`Base API URL: \`${SITE_URL}/api\`. CDN media base: \`${CDN_URL}/{uuid}?res=[low|med|original]&format=[webp|png|gif|video]\`. Wiki raw Markdown: \`${SITE_URL}/wiki/{lang}/{topic}.md\`.`);
	lines.push('');
	lines.push(`Full exhaustive reference (every endpoint, every param, auth and rate-limit notes): [llms-full.txt](${SITE_URL}/llms-full.txt). Machine-readable JSON: [${SITE_URL}/api/docs](${SITE_URL}/api/docs).`);
	lines.push('');

	// --- Site sections (spec §4 — curated file/URL lists) ---
	lines.push(`## Site Sections`);
	lines.push('');
	for (const s of manifest.siteSections) {
		lines.push(`- [${s.title}](${s.url}): ${s.description}`);
	}
	lines.push('');

	// --- Public API — grouped by tag ---
	for (const tag of orderedTags) {
		const endpoints = byTag.get(tag)!;
		const meta = TAG_GROUPS.find((g) => g.tag === tag);
		const label = meta?.label ?? tag;
		const desc = meta?.description ? ` - ${toAscii(meta.description)}` : '';
		lines.push(`## Public API - ${toAscii(label)}${desc}`);
		lines.push('');
		// Surface a base URL hint when the tag maps to a mount point
		const baseHint: Record<string, string> = {
			avatars: '`https://vrcstorage.lat/api/avatars`',
			assets: '`https://vrcstorage.lat/api/assets`',
			clothes: '`https://vrcstorage.lat/api/clothes`',
			resources: '`https://vrcstorage.lat/api/resources`',
			authors: '`https://vrcstorage.lat/api/authors`',
			blog: '`https://vrcstorage.lat/api/blog`',
			comments: '`https://vrcstorage.lat/api/comments`',
			wiki: '`https://vrcstorage.lat/api/wiki`',
			media: '`https://vrcstorage.lat/api/media`',
			downloads: '`https://vrcstorage.lat/api/download`',
			system: '`https://vrcstorage.lat/api`',
			realtime: '`https://vrcstorage.lat/api`',
			site: 'Static assets / SSR pages',
		};
		if (baseHint[tag]) lines.push(`Base: ${baseHint[tag]}`);
		lines.push('');
		for (const e of endpoints) {
			lines.push(curatedLine(e));
		}
		lines.push('');
	}

	// --- Optional tail (spec §5) ---
	lines.push(`## Optional`);
	lines.push('');
	lines.push('Raw wiki articles (Markdown) - replace `en` with any supported locale (`es`, `pt`, `fr`, `de`, `it`, `nl`, `pl`, `tr`, `ru`, `cn`, `jp`):');
	lines.push('');
	for (const topic of WIKI_TOPICS) {
		lines.push(`- [Wiki - ${topic}](https://vrcstorage.lat/wiki/en/${topic}.md): Raw Markdown source for the "${topic}" guide.`);
	}
	lines.push('');
	lines.push(`CDN placeholders (cover-safe, localized) - served while the queue is still generating variants: \`${CDN_URL}/_placeholder/processing.{lang}.webp\` (image placeholder, 200 with no-store) and the same files mirrored under \`/processing/{lang}.webp\` for local preview.`);
	lines.push('');

	return lines.join('\n');
}

/**
 * Exhaustive llms-full.txt — every endpoint, grouped by tag, with full param/response prose.
 * Intended for agents that need the complete contract, and as the target of the bare llms.txt's
 * "see also llms-full.txt" link.
 */
export function buildLlmsFullTxt(manifest: ApiDocsManifest = buildManifest()): string {
	const byTag = new Map<string, EndpointDoc[]>();
	for (const e of manifest.endpoints) {
		const arr = byTag.get(e.tag) ?? [];
		arr.push(e);
		byTag.set(e.tag, arr);
	}
	const orderedTags = TAG_GROUPS.map((g) => g.tag).filter((t) => byTag.has(t));
	// Append any untagged tags at the end (defensive — should not happen)
	for (const t of byTag.keys()) if (!orderedTags.includes(t)) orderedTags.push(t);

	const lines: string[] = [];
	lines.push(`# VRCStorage - Full API Reference`);
	lines.push('');
	lines.push(`> Exhaustive endpoint reference for AI agents and tooling. Every route in VRCStorage, including authenticated, admin, and write endpoints. For a concise, LLM-friendly overview of public reads only, see [llms.txt](${SITE_URL}/llms.txt). Machine-readable JSON: [${SITE_URL}/api/docs](${SITE_URL}/api/docs).`);
	lines.push('');
	lines.push(`Base API URL: \`${SITE_URL}/api\`. CDN: \`${CDN_URL}/{uuid}?res=[low|med|original]&format=[webp|png|gif|video]\`. Rate-limit tiers: \`strict\` (1/60s), \`login\` (10/60s), \`medium\` (100/60s), \`global\` (500/60s) - configured in wrangler.jsonc and wired in src/http/rate-limits.ts. Auth: \`public\` (no session), \`optional\` (gated field), \`auth\` (sealed session cookie via requireAuth), \`admin\` (requireAdmin). Pagination and UUID/timestamp conventions are as in llms.txt.`);
	lines.push('');

	for (const tag of orderedTags) {
		lines.push(sectionForTag(tag, byTag.get(tag)!));
		lines.push('');
	}

	lines.push(`---`);
	lines.push('');
	lines.push(`Generated from the single source of truth at \`src/docs/registry.ts\` (${TAG_GROUPS.length} tags). To update the docs: edit that file and run \`npm run docs:build\` - /llms.txt and /llms-full.txt are static ASSETS (public/) rebuilt at deploy time, while /api/docs is served live from the same registry with optional ?tag= filtering. Run \`npm run docs:check\` locally to catch a route that exists without a doc entry.`);
	lines.push('');

	return lines.join('\n');
}

/**
 * Machine-readable JSON manifest — same data as the two markdown files, for codegen and tooling.
 * An optional `?tag=avatars` filter can narrow it on the route side.
 */
export function buildApiJson(manifest: ApiDocsManifest = buildManifest()): ApiDocsManifest {
	return manifest;
}
