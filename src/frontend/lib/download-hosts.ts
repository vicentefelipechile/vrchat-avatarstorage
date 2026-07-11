// =========================================================================
// lib/download-hosts.ts — Recognise a download URL's origin host
// =========================================================================
//
// A resource's download links point at our own R2 storage, an external mirror,
// or the original storefront. This maps a URL to a display label, an icon key
// and a kind so the UI can label and group each link. Purely string logic —
// no DOM, no network.

/**
 * How a download link is meant to be used:
 *   'local'   — hosted on our own R2 storage (a `/api/download/…` link); the primary source we serve.
 *   'server'  — an external download mirror (Google Drive, MEGA, workupload, …).
 *   'article' — the storefront/original listing the file comes from (BOOTH, Gumroad, Payhip, …), linked
 *               for people who want the source rather than a mirror.
 * The distinction is a property of the host, not the link's position — a store link can appear anywhere in
 * the list and still reads as the original article, and every R2 file reads as a local server.
 */
export type DownloadKind = 'local' | 'server' | 'article';

/** Matches our own R2 download links (`/api/download/{key}`), whether relative or fully-qualified. */
const LOCAL_DOWNLOAD_PATH = /^\/api\/download\//;

/** A known download host: matched against the URL hostname, paired with a readable name, icon key and kind. */
interface KnownHost {
	match: RegExp;
	label: string;
	icon: string;
	kind: DownloadKind;
}

// Ordered most-specific first. `icon` values are keys in the `icons` registry (rendered by the caller via
// getIcon), so this module stays free of icon imports. Where simple-icons has a brand mark the key is that
// mark's slug (googledrive, mega, …); the rest use a Lucide fallback.
const KNOWN_HOSTS: KnownHost[] = [
	{ match: /(?:drive|docs)\.google\./, label: 'Google Drive', icon: 'googledrive', kind: 'server' },
	{ match: /mega\.(?:nz|io|co\.nz)/, label: 'MEGA', icon: 'mega', kind: 'server' },
	{ match: /mediafire\./, label: 'MediaFire', icon: 'mediafire', kind: 'server' },
	{ match: /dropbox\./, label: 'Dropbox', icon: 'dropbox', kind: 'server' },
	{ match: /workupload\./, label: 'Workupload', icon: 'cloud', kind: 'server' },
	{ match: /(?:cdn\.)?discord(?:app)?\.(?:com|gg)/, label: 'Discord', icon: 'discord', kind: 'server' },
	{ match: /github\.(?:com|io)/, label: 'GitHub', icon: 'github', kind: 'server' },
	{ match: /(?:1fichier|pixeldrain|gofile|anonfiles|krakenfiles)\./, label: 'File host', icon: 'cloud', kind: 'server' },
	{ match: /gumroad\./, label: 'Gumroad', icon: 'gumroad', kind: 'article' },
	{ match: /payhip\./, label: 'Payhip', icon: 'payhip', kind: 'article' },
	{ match: /booth\.pm/, label: 'BOOTH', icon: 'shopping-bag', kind: 'article' },
	{ match: /jinxxy\./, label: 'Jinxxy', icon: 'shopping-bag', kind: 'article' },
	{ match: /itch\.io/, label: 'itch.io', icon: 'itchdotio', kind: 'article' },
];

/** What `downloadHost` resolves a URL to: a display label, an icon key, and how the link should be treated. */
export interface HostInfo {
	label: string;
	icon: string;
	kind: DownloadKind;
}

/**
 * Resolves a download URL to its origin host. Our own R2 links (`/api/download/…`) resolve to the local
 * server; known external hosts get a friendly name, a matching icon key, and a kind (download mirror vs.
 * original storefront). Unknown hosts fall back to the bare hostname, a generic globe, and 'server' (an
 * unrecognised link is assumed to be a mirror). A malformed URL yields an empty label with a link icon.
 */
export function downloadHost(url: string): HostInfo {
	// Our own R2 files, served relative from this origin. Check the path before parsing as a full URL so a
	// relative `/api/download/…` (which `new URL` cannot parse on its own) is still recognised.
	const path = url.replace(/^https?:\/\/[^/]+/, '');
	if (LOCAL_DOWNLOAD_PATH.test(path)) {
		return { label: 'VRCStorage', icon: 'hard-drive', kind: 'local' };
	}

	let host: string;
	try {
		host = new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return { label: '', icon: 'link', kind: 'server' };
	}
	const known = KNOWN_HOSTS.find((h) => h.match.test(host));
	if (known) return { label: known.label, icon: known.icon, kind: known.kind };
	return { label: host, icon: 'globe', kind: 'server' };
}
