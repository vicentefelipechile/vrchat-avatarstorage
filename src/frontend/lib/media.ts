// =========================================================================
// lib/media.ts — Images: resizing, CDN URLs, download hosts, lazy/progressive
//                loading, and the processing-status poll
// =========================================================================

// =========================================================================
// Image resizing
// =========================================================================

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

// =========================================================================
// Media CDN
// =========================================================================

const CDN_BASE = 'https://cdn.vrcstorage.lat';

export function mediaUrl(uuid: string, res: 'low' | 'med' | 'original' = 'med', format: 'webp' | 'png' | 'gif' = 'webp'): string {
	return `${CDN_BASE}/${uuid}?res=${res}&format=${format}`;
}

// =========================================================================
// Progressive / lazy images
// =========================================================================

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

// =========================================================================
// Media processing poll
// =========================================================================
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
