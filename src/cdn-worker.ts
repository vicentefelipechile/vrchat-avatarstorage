// =========================================================================================================
// VRCSTORAGE CDN WORKER
// =========================================================================================================
// Dedicated Worker for serving pre-processed image variants from MEDIA_BUCKET.
// Deployed separately from the main API Worker.
// Custom domain: cdn.vrcstorage.lat
//
// URL format: https://cdn.vrcstorage.lat/{uuid}?res=[low|med|original]&format=[webp|png]
//
// Falls back to the original in BUCKET (with short TTL) if variants are not yet generated.
// =========================================================================================================

interface CdnEnv {
	MEDIA_BUCKET: R2Bucket;
	BUCKET: R2Bucket;
	DB: D1Database;
}

const VALID_RES = new Set<string>(['low', 'med', 'original']);
const VALID_FORMAT = new Set<string>(['webp', 'png']);

export default {
	async fetch(request: Request, env: CdnEnv): Promise<Response> {
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
			const headers = new Headers();
			headers.set('Content-Type', `image/${format}`);
			headers.set('Cache-Control', 'public, max-age=31536000, immutable');
			headers.set('X-Content-Type-Options', 'nosniff');
			headers.set('ETag', object.httpEtag);
			return new Response(object.body, { headers });
		}

		// Variants not yet generated — fall back to the original from BUCKET
		const media = await env.DB.prepare('SELECT r2_key FROM media WHERE uuid = ?').bind(uuid).first<{ r2_key: string }>();
		if (!media) return new Response('Not found', { status: 404 });

		const fallback = await env.BUCKET.get(media.r2_key);
		if (!fallback) return new Response('Not found', { status: 404 });

		const fallbackHeaders = new Headers();
		fallback.writeHttpMetadata(fallbackHeaders);
		fallbackHeaders.set('X-Content-Type-Options', 'nosniff');
		fallbackHeaders.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
		fallbackHeaders.set('X-Variant-Status', 'pending');
		return new Response(fallback.body, { headers: fallbackHeaders });
	},
};
