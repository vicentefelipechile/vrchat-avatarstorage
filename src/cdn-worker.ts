// =========================================================================================================
// VRCSTORAGE CDN WORKER
// =========================================================================================================
// Dedicated Worker for serving pre-processed image variants from MEDIA_BUCKET.
// Deployed separately from the main API Worker.
// Custom domain: cdn.vrcstorage.lat
//
// URL format: https://cdn.vrcstorage.lat/{uuid}?res=[low|med|original]&format=[webp|png|gif]
//
// Serves only pre-processed variants from MEDIA_BUCKET. Every image is fully covered (animated
// GIFs live as a single `{uuid}/original.gif` variant), so an absent variant is a 404 — the CDN
// never reaches into the originals bucket.
// =========================================================================================================

const VALID_RES = new Set<string>(['low', 'med', 'original']);
const VALID_FORMAT = new Set<string>(['webp', 'png', 'gif']);

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

		const variantKey = `${uuid}/${res}.${format}`;
		const object = await env.MEDIA_BUCKET.get(variantKey);

		if (object) {
			return serveVariant(object, format);
		}

		// Animated GIFs have no webp/png variants — they live only as `{uuid}/original.gif`. When the
		// requested variant is absent, serve the GIF (if any) so callers asking for webp/png still get
		// the animation, without needing to know the media is a GIF.
		if (format !== 'gif') {
			const gif = await env.MEDIA_BUCKET.get(`${uuid}/original.gif`);
			if (gif) return serveVariant(gif, 'gif');
		}

		return new Response('Not found', { status: 404 });
	},
};

/** Serve a processed variant object from MEDIA_BUCKET with immutable cache headers. */
function serveVariant(object: R2ObjectBody, format: string): Response {
	const headers = new Headers();
	headers.set('Content-Type', `image/${format}`);
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('ETag', object.httpEtag);
	return new Response(object.body, { headers });
}
