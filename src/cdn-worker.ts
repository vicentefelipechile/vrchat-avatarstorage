// =========================================================================================================
// VRCSTORAGE CDN WORKER
// =========================================================================================================
// Dedicated Worker for serving pre-processed image variants from MEDIA_BUCKET.
// Deployed separately from the main API Worker.
// Custom domain: cdn.vrcstorage.lat
//
// URL format: https://cdn.vrcstorage.lat/{uuid}?res=[low|med|original]&format=[webp|png|gif|video]
//
// Serves only pre-processed variants from MEDIA_BUCKET. Images are fully covered (animated media — GIF,
// animated WebP, APNG — lives as a single `{uuid}/original.{gif|webp|png}` variant in its native format).
// A video is covered by two variants: its animated poster (`{uuid}/original.gif`, served for image
// formats) and its normalized MP4 (`{uuid}/video.mp4`, served for `format=video` with HTTP Range so the
// browser can seek). The CDN never reaches into the originals bucket. When a variant is absent — the
// window between upload and the queue finishing — the CDN serves a localized "processing" placeholder
// (`_placeholder/processing.{lang}.webp`, chosen from Accept-Language) with a short cache, so the browser
// paints a valid image instead of a broken icon and re-fetches until the real variant lands. Only if no
// placeholder at all is present does a request 404. (Video requests skip the placeholder — a `<video>`
// element handles a transient 404 by retrying, and an image placeholder isn't a valid video body.)
// =========================================================================================================

const VALID_RES = new Set<string>(['low', 'med', 'original']);
const VALID_FORMAT = new Set<string>(['webp', 'png', 'gif', 'video']);

/**
 * Native formats animated media can be stored under as its single `original` variant (GIF, animated
 * WebP, APNG). Tried in order when the requested variant is absent, so an animated original is served
 * whatever res/format was asked for. GIF first: it's the only format that is *always* animated, so it
 * can't be confused with a static original of the same extension.
 */
const ANIMATED_FALLBACK_FORMATS = ['gif', 'webp', 'png'] as const;

/** Languages we ship a processing placeholder for. `en` is the fallback and must always exist in R2. */
const PLACEHOLDER_LANGS = new Set<string>(['en', 'es', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'cn', 'jp']);
const DEFAULT_LANG = 'en';

/** MEDIA_BUCKET key of the processing placeholder for a language. */
const placeholderKey = (lang: string): string => `_placeholder/processing.${lang}.webp`;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		const uuid = url.pathname.replace(/^\//, '');
		if (!uuid) return new Response('Not found', { status: 404 });

		const res = url.searchParams.get('res') ?? 'med';
		const format = url.searchParams.get('format') ?? 'webp';

		if (!VALID_RES.has(res) || !VALID_FORMAT.has(format)) {
			return new Response('Invalid res or format parameter', { status: 400 });
		}

		// Video: stream the normalized MP4 with Range support (seek/scrub). No processing placeholder —
		// a 404 lets the <video> element retry until the queue finishes normalizing.
		if (format === 'video') {
			return serveVideo(request, env, `${uuid}/video.mp4`);
		}

		const variantKey = `${uuid}/${res}.${format}`;
		const object = await env.MEDIA_BUCKET.get(variantKey);

		if (object) {
			return serveVariant(object, format);
		}

		// Animated media (GIF, animated WebP, APNG) has no resized/re-encoded variants — it lives only
		// as a single `{uuid}/original.{gif|webp|png}` in its native format. When the requested variant
		// is absent, serve that animated original (if any) so callers asking for any res/format still
		// get the animation, without needing to know the media is animated. Skip the format that was
		// already tried above.
		for (const animFormat of ANIMATED_FALLBACK_FORMATS) {
			if (animFormat === format && res === 'original') continue;
			const anim = await env.MEDIA_BUCKET.get(`${uuid}/original.${animFormat}`);
			if (anim) return serveVariant(anim, animFormat);
		}

		// No variant yet: the queue is still generating them (or the media doesn't exist). Serve the
		// processing placeholder in the viewer's language with a short cache so the browser retries and
		// picks up the real variant once it lands. Falls through to 404 only if no placeholder is in R2.
		return servePlaceholder(request, env);
	},
};

/**
 * Serve the "still processing" placeholder localized from Accept-Language. `no-store` keeps the browser
 * from pinning it in cache, so a later request for the same URL reaches the real variant as soon as it
 * exists. A 200 (not 404) keeps `<img>` from firing `onerror` — the frontend detects "processing" from
 * media status, not from a broken image. Tries the detected language, then `en`; only if neither object
 * exists does the request 404.
 */
async function servePlaceholder(request: Request, env: Env): Promise<Response> {
	const lang = pickLang(request.headers.get('Accept-Language'));

	let placeholder = await env.MEDIA_BUCKET.get(placeholderKey(lang));
	if (!placeholder && lang !== DEFAULT_LANG) placeholder = await env.MEDIA_BUCKET.get(placeholderKey(DEFAULT_LANG));
	if (!placeholder) return new Response('Not found', { status: 404 });

	const headers = new Headers();
	headers.set('Content-Type', 'image/webp');
	headers.set('Cache-Control', 'no-store');
	headers.set('Vary', 'Accept-Language');
	headers.set('X-Content-Type-Options', 'nosniff');
	return new Response(placeholder.body, { headers });
}

/**
 * Resolve an Accept-Language header to one of our supported placeholder languages, defaulting to `en`.
 * Walks the header's entries in their quality order and returns the first whose primary subtag we ship
 * (base tag only — `pt-BR` → `pt`). Chinese and Japanese map to our `cn`/`jp` keys.
 */
function pickLang(header: string | null): string {
	if (!header) return DEFAULT_LANG;

	const tags = header
		.split(',')
		.map((part) => {
			const [tag, q] = part.trim().split(';q=');
			return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 };
		})
		.sort((a, b) => b.q - a.q);

	for (const { tag } of tags) {
		const base = tag.split('-')[0];
		const mapped = base === 'zh' ? 'cn' : base === 'ja' ? 'jp' : base;
		if (PLACEHOLDER_LANGS.has(mapped)) return mapped;
	}
	return DEFAULT_LANG;
}

/**
 * Stream a normalized MP4 from MEDIA_BUCKET with HTTP Range support so `<video>` can seek. Honours a
 * `Range: bytes=start-end` request with a `206` + `Content-Range`; a full request gets a `200` with
 * `Accept-Ranges: bytes`. A missing object 404s (the queue is still normalizing) — the browser retries.
 */
async function serveVideo(request: Request, env: Env, key: string): Promise<Response> {
	const rangeHeader = request.headers.get('Range');

	// Probe size + etag without pulling the body, so a Range can be resolved to an R2 ranged GET.
	const head = await env.MEDIA_BUCKET.head(key);
	if (!head) return new Response('Not found', { status: 404 });

	const total = head.size;
	const baseHeaders = new Headers();
	baseHeaders.set('Content-Type', 'video/mp4');
	baseHeaders.set('Accept-Ranges', 'bytes');
	baseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
	baseHeaders.set('X-Content-Type-Options', 'nosniff');
	baseHeaders.set('ETag', head.httpEtag);

	const parsed = rangeHeader ? parseRange(rangeHeader, total) : null;

	// Unsatisfiable range → 416 with the valid extent.
	if (rangeHeader && !parsed) {
		return new Response('Range Not Satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
	}

	if (parsed) {
		const { start, end } = parsed;
		const object = await env.MEDIA_BUCKET.get(key, { range: { offset: start, length: end - start + 1 } });
		if (!object) return new Response('Not found', { status: 404 });
		baseHeaders.set('Content-Range', `bytes ${start}-${end}/${total}`);
		baseHeaders.set('Content-Length', String(end - start + 1));
		return new Response(object.body, { status: 206, headers: baseHeaders });
	}

	const object = await env.MEDIA_BUCKET.get(key);
	if (!object) return new Response('Not found', { status: 404 });
	baseHeaders.set('Content-Length', String(total));
	return new Response(object.body, { status: 200, headers: baseHeaders });
}

/**
 * Parse a single-range `Range: bytes=start-end` header against the object size. Returns clamped inclusive
 * `{ start, end }`, or null if unparseable/unsatisfiable. Supports open-ended (`bytes=500-`) and suffix
 * (`bytes=-500`) forms; multi-range requests fall back to the first range only.
 */
function parseRange(header: string, total: number): { start: number; end: number } | null {
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match) return null;

	const [, startStr, endStr] = match;
	let start: number;
	let end: number;

	if (startStr === '') {
		// Suffix range: last N bytes.
		const suffix = parseInt(endStr, 10);
		if (isNaN(suffix) || suffix === 0) return null;
		start = Math.max(0, total - suffix);
		end = total - 1;
	} else {
		start = parseInt(startStr, 10);
		end = endStr === '' ? total - 1 : parseInt(endStr, 10);
	}

	if (isNaN(start) || isNaN(end) || start > end || start >= total) return null;
	return { start, end: Math.min(end, total - 1) };
}

/** Serve a processed variant object from MEDIA_BUCKET with immutable cache headers. */
function serveVariant(object: R2ObjectBody, format: string): Response {
	const headers = new Headers();
	headers.set('Content-Type', `image/${format}`);
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('ETag', object.httpEtag);
	return new Response(object.body, { headers });
}
