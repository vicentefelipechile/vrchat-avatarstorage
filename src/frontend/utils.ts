// =========================================================================================================
// utils.ts — Shared frontend utilities
// =========================================================================================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// =========================================================================================================
// Image resizing
// =========================================================================================================

export function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<File> {
	return new Promise((resolve, reject) => {
		const img = document.createElement('img');
		const reader = new FileReader();

		reader.onload = (e) => {
			img.src = e.target!.result as string;
			img.onload = () => {
				let { width, height } = img;

				if (width > height) {
					if (width > maxWidth) {
						height = Math.round((height * maxWidth) / width);
						width = maxWidth;
					}
				} else {
					if (height > maxHeight) {
						width = Math.round((width * maxHeight) / height);
						height = maxHeight;
					}
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) =>
						blob
							? resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }))
							: reject(new Error('Canvas to Blob failed')),
					file.type,
				);
			};
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// =========================================================================================================
// Markdown stripping
// =========================================================================================================

export function stripMarkdown(md: string): string {
	if (!md) return '';
	return md
		.replace(/^#+\s+/gm, '')
		.replace(/(\*\*|__)(.*?)\1/g, '$2')
		.replace(/(\*|_)(.*?)\1/g, '$2')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/!\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^>\s+/gm, '')
		.replace(/^[+\-*]\s+/gm, '')
		.replace(/`([^`]+)`/g, '$1');
}

// =========================================================================================================
// Markdown rendering (with GitHub-style alert post-processing)
// =========================================================================================================

export function renderMarkdown(container: HTMLElement, raw: string): void {
	const html = DOMPurify.sanitize(marked.parse(raw) as string);
	container.innerHTML = html;

	// Post-process > [!NOTE / TIP / WARNING / …] blockquotes
	container.querySelectorAll<HTMLElement>('blockquote').forEach((bq) => {
		const firstP = bq.querySelector('p');
		if (!firstP) return;
		const match = firstP.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
		if (!match) return;

		const type = match[1].toLowerCase();
		bq.classList.add('markdown-alert', `markdown-alert-${type}`);
		firstP.innerHTML = firstP.innerHTML.replace(match[0], '').trim();

		const title = document.createElement('p');
		title.className = 'markdown-alert-title';
		title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
		bq.insertBefore(title, firstP);
	});
}

// =========================================================================================================
// Turnstile
// =========================================================================================================

let _cachedSiteKey: string | null = null;

async function getSiteKey(): Promise<string | null> {
	if (_cachedSiteKey) return _cachedSiteKey;
	try {
		const res = await fetch('/api/config');
		const data = (await res.json()) as { turnstileSiteKey?: string };
		_cachedSiteKey = data.turnstileSiteKey ?? null;
		return _cachedSiteKey;
	} catch {
		return null;
	}
}

export async function renderTurnstile(selector: string): Promise<void> {
	if (!window.turnstile) {
		console.warn('Turnstile not loaded yet.');
		return;
	}

	const key = await getSiteKey();
	if (!key) {
		console.error('Turnstile site key missing');
		return;
	}

	const container = document.querySelector(selector);
	if (!container) return;

	container.innerHTML = '';
	window.turnstile.render(selector, { sitekey: key.trim() });
}

// =========================================================================================================
// DOM helpers
// =========================================================================================================

/** Query a typed element, throws if missing. */
export function $<T extends HTMLElement>(selector: string, root: ParentNode = document): T {
	const el = root.querySelector<T>(selector);
	if (!el) throw new Error(`Element not found: ${selector}`);
	return el;
}

/** Query a typed element, returns null if missing. */
export function $$<T extends HTMLElement>(selector: string, root: ParentNode = document): T | null {
	return root.querySelector<T>(selector);
}

/** Decode HTML entities into normal text. */
export function htmlDecode(input: string): string {
	const textarea = document.createElement('textarea');
	textarea.innerHTML = input;
	return textarea.value;
}

/** Set button to loading state, returns restore function. */
export function loadingBtn(btn: HTMLButtonElement, text = '…'): () => void {
	const orig = btn.innerHTML;
	btn.disabled = true;
	btn.textContent = text;
	return () => {
		btn.disabled = false;
		btn.innerHTML = orig;
	};
}

// =========================================================================================================
// Toast notifications
// =========================================================================================================

export type ToastType = 'info' | 'success' | 'error' | 'warning';

let _toastContainer: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
	if (_toastContainer && document.body.contains(_toastContainer)) return _toastContainer;
	const el = document.createElement('div');
	el.id = 'toast-container';
	document.body.appendChild(el);
	_toastContainer = el;
	return el;
}

/**
 * Shows a toast notification.
 * @param message  Text to display
 * @param type     'info' | 'success' | 'error' | 'warning'  (default: 'info')
 * @param duration Auto-dismiss delay in ms (default: 3000). Pass 0 to keep until manually dismissed.
 * @returns        A dismiss function you can call to remove the toast early.
 */
export function showToast(message: string, type: ToastType = 'info', duration = 3000): () => void {
	const container = getToastContainer();

	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.textContent = message;

	container.appendChild(toast);

	// Trigger enter animation on next frame
	requestAnimationFrame(() => toast.classList.add('toast-visible'));

	const dismiss = () => {
		toast.classList.remove('toast-visible');
		toast.classList.add('toast-hiding');
		toast.addEventListener('transitionend', () => toast.remove(), { once: true });
	};

	let timer: ReturnType<typeof setTimeout> | null = null;
	if (duration > 0) timer = setTimeout(dismiss, duration);

	toast.addEventListener('click', () => {
		if (timer) clearTimeout(timer);
		dismiss();
	});

	return dismiss;
}

// =========================================================================================================
// Media CDN
// =========================================================================================================

const CDN_BASE = 'https://cdn.vrcstorage.lat';

export function mediaUrl(uuid: string, res: 'low' | 'med' | 'original' = 'med', format: 'webp' | 'png' | 'gif' = 'webp'): string {
	return `${CDN_BASE}/${uuid}?res=${res}&format=${format}`;
}

// =========================================================================================================
// Download host recognition
// =========================================================================================================

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
// getIcon), so utils stays free of icon imports. Where simple-icons has a brand mark the key is that mark's
// slug (googledrive, mega, …); the rest use a Lucide fallback.
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

/**
 * CDN URLs that have finished decoding in this page session. A cached URL renders straight to its sharp
 * image — no blur placeholder, no swap — so revisiting a view (clicking "Inicio", paging, filtering)
 * shows already-seen images instantly instead of flashing blur every time.
 */
const loadedUrls = new Set<string>();

export function progressiveImg(opts: {
	uuid: string;
	placeholder: string | null;
	res?: 'low' | 'med' | 'original';
	alt?: string;
	className?: string;
	processed?: boolean;
}): string {
	const { uuid, placeholder, res = 'med', alt = '', className = '', processed = true } = opts;
	const dataSrc = mediaUrl(uuid, res);

	// Not processed yet: the queue is still generating variants, so the CDN serves the shared
	// "processing" placeholder for this URL. Tag the image with its uuid so initMediaPolling can poll
	// for readiness and swap in the real variant without a reload. It still goes through the normal lazy
	// path below — the only difference is the data-processing marker.
	const processingAttr = processed ? '' : ` data-processing="1" data-uuid="${uuid}" data-res="${res}"`;

	// Seen this exact URL already this session: skip the blur entirely and point straight at the real
	// image. The browser serves it from memory cache, so it paints sharp on the first frame. Only for
	// already-processed media — a still-processing URL would cache the placeholder, so never shortcut it.
	if (processed && loadedUrls.has(dataSrc)) {
		return `<img src="${dataSrc}" alt="${alt}" class="${className}" loading="lazy" />`;
	}

	const src = placeholder ?? dataSrc;
	const blurStyle = placeholder ? 'filter:blur(8px);transition:filter 0.4s ease' : '';
	return `<img
		src="${src}"
		data-src="${dataSrc}"
		alt="${alt}"
		class="lazy-img${className ? ' ' + className : ''}"
		style="${blurStyle}"
		loading="lazy"${processingAttr}
	/>`;
}

/** Swaps a lazy image to its real source, clearing the blur and recording the URL as loaded. */
function revealLazyImage(img: HTMLImageElement, dataSrc: string): void {
	img.onload = () => {
		img.style.filter = '';
		loadedUrls.add(dataSrc);
	};
	img.src = dataSrc;
}

let _lazyObserver: IntersectionObserver | null = null;

function getLazyObserver(): IntersectionObserver {
	if (_lazyObserver) return _lazyObserver;
	_lazyObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				const img = entry.target as HTMLImageElement;
				const dataSrc = img.dataset.src;
				_lazyObserver!.unobserve(img);
				if (dataSrc) revealLazyImage(img, dataSrc);
			});
		},
		{ rootMargin: '200px' },
	);
	return _lazyObserver;
}

/**
 * Binds every not-yet-bound `img.lazy-img[data-src]`. Each image first probes the browser cache by
 * pointing `src` at the real URL: on a disk-cache hit (survives a full reload) `complete` is already
 * true, so the blur is dropped synchronously with no swap. Otherwise it falls back to the blur-up
 * IntersectionObserver. Idempotent — already-bound images are skipped, so callers may re-run this after
 * any partial re-render (filter/pagination) without stacking observers or reloading in-flight images.
 */
export function initLazyImages(): void {
	const observer = getLazyObserver();
	document.querySelectorAll<HTMLImageElement>('img.lazy-img[data-src]:not([data-lazy-bound])').forEach((img) => {
		img.dataset.lazyBound = '1';
		const dataSrc = img.dataset.src;
		if (!dataSrc) return;

		// Optimistic cache probe: assigning a cached URL makes `complete` true synchronously. Keep the
		// blur placeholder (the original `src`) so we can restore it on a miss.
		const placeholderSrc = img.getAttribute('src');
		img.src = dataSrc;
		if (img.complete && img.naturalWidth > 0) {
			img.style.filter = '';
			loadedUrls.add(dataSrc);
			return;
		}

		// Cache miss — restore the blur placeholder until the image scrolls into view.
		if (placeholderSrc) img.src = placeholderSrc;
		else img.removeAttribute('src');
		observer.observe(img);
	});
}

// =========================================================================================================
// Media processing poll
// =========================================================================================================
//
// A freshly uploaded image shows the CDN "processing" placeholder until the upload queue finishes its
// variants. progressiveImg marks those images with `data-processing`; this polls `/api/media/:uuid/status`
// per media and, once it reports ready, points every image of that uuid at the real variant and clears the
// marker. Polling is per-uuid (not per-img) so a media shown in several cards is polled once, and it backs
// off so a slow pipeline doesn't hammer the API. Stops itself once nothing is left processing.

/** Backoff schedule (ms) for the status poll: quick at first, then easing off. The last value repeats. */
const POLL_DELAYS = [2000, 3000, 5000, 8000, 13000, 21000, 30000];

/** uuids already being polled, so re-running initMediaPolling after a re-render never double-schedules. */
const pollingUuids = new Set<string>();

/** Point every still-processing image of this uuid at its real variant and drop the processing marker. */
function swapProcessedImages(uuid: string): void {
	document.querySelectorAll<HTMLImageElement>(`img[data-processing][data-uuid="${uuid}"]`).forEach((img) => {
		const res = (img.dataset.res as 'low' | 'med' | 'original') ?? 'med';
		const real = mediaUrl(uuid, res);
		img.removeAttribute('data-processing');
		img.src = real;
		img.style.filter = '';
		loadedUrls.add(real);
	});
}

/** Poll one media's status with backoff until it's processed (then swap) or it vanishes from the DOM. */
function pollMediaStatus(uuid: string): void {
	let attempt = 0;

	const tick = async (): Promise<void> => {
		// The media left the page (navigated away, filtered out) before finishing — stop polling it.
		if (!document.querySelector(`img[data-processing][data-uuid="${uuid}"]`)) {
			pollingUuids.delete(uuid);
			return;
		}

		try {
			const res = await fetch(`/api/media/${uuid}/status`);
			if (res.ok) {
				const { processed } = (await res.json()) as { processed: boolean };
				if (processed) {
					swapProcessedImages(uuid);
					pollingUuids.delete(uuid);
					return;
				}
			}
		} catch {
			// Network hiccup — fall through to reschedule; the backoff keeps retries sane.
		}

		const delay = POLL_DELAYS[Math.min(attempt, POLL_DELAYS.length - 1)];
		attempt++;
		setTimeout(tick, delay);
	};

	setTimeout(tick, POLL_DELAYS[0]);
}

/**
 * Starts polling for every not-yet-bound processing image on the page. Idempotent and per-uuid, so
 * callers may re-run it after any partial re-render (filter/pagination) — same as initLazyImages — without
 * stacking polls. Call it wherever initLazyImages is called.
 */
export function initMediaPolling(): void {
	document.querySelectorAll<HTMLImageElement>('img[data-processing][data-uuid]').forEach((img) => {
		const uuid = img.dataset.uuid;
		if (!uuid || pollingUuids.has(uuid)) return;
		pollingUuids.add(uuid);
		pollMediaStatus(uuid);
	});
}

// =========================================================================================================
// Time Definitions
// =========================================================================================================

export enum TimeUnit {
	Second = 1000,
	Minute = 60 * 1000,
	Hour = 60 * 60 * 1000,
	Day = 24 * 60 * 60 * 1000,
	Week = 7 * 24 * 60 * 60 * 1000,
}

// =========================================================================================================
// Chunked upload
// =========================================================================================================

export const CHUNK_SIZE = 30 * 1024 * 1024;
const PART_MAX_ATTEMPTS = 3;
const PART_RETRY_BASE_DELAY = 1000;

export interface ChunkedUploadResult {
	r2_key: string;
	media_uuid: string;
}

/**
 * Reads a chunk into memory before sending so a mid-upload change to the file on disk
 * (antivirus scan, sync client, re-export) cannot abort the request with
 * ERR_UPLOAD_FILE_CHANGED. Retries transient part failures with exponential backoff.
 */
async function uploadPart(uploadId: string, key: string, partNumber: number, chunk: Blob): Promise<object> {
	const body = await chunk.arrayBuffer();

	for (let attempt = 1; ; attempt++) {
		try {
			const partRes = await fetch('/api/upload/part', {
				method: 'PUT',
				headers: {
					'X-Upload-ID': uploadId,
					'X-Key': key,
					'X-Part-Number': String(partNumber),
					'Content-Type': 'application/octet-stream',
				},
				body,
			});
			if (!partRes.ok) throw new Error(`Failed to upload part ${partNumber} (${partRes.status})`);
			return await partRes.json();
		} catch (err) {
			if (attempt >= PART_MAX_ATTEMPTS) throw err;
			console.error(`Part ${partNumber} attempt ${attempt} failed, retrying:`, err);
			await new Promise((resolve) => setTimeout(resolve, PART_RETRY_BASE_DELAY * attempt));
		}
	}
}

/** Uploads a file to R2 via the multipart init/part/complete flow, reporting progress 0-100. */
export async function uploadChunked(
	file: File,
	mediaType: string,
	onProgress: (p: number) => void,
): Promise<ChunkedUploadResult> {
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

	const initRes = await fetch('/api/upload/init', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ filename: file.name, media_type: mediaType }),
	});
	if (!initRes.ok) throw new Error('Failed to initialize upload');
	const { uploadId, key } = (await initRes.json()) as { uploadId: string; key: string };

	const parts: object[] = [];
	let loaded = 0;

	for (let i = 0; i < totalChunks; i++) {
		const start = i * CHUNK_SIZE;
		const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
		parts.push(await uploadPart(uploadId, key, i + 1, chunk));
		loaded += chunk.size;
		onProgress((loaded / file.size) * 100);
	}

	const completeRes = await fetch('/api/upload/complete', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ uploadId, key, parts, filename: file.name, media_type: mediaType }),
	});
	if (!completeRes.ok) throw new Error('Failed to complete upload');
	return completeRes.json() as Promise<ChunkedUploadResult>;
}
