// =========================================================================================================
// IMAGE TRANSFORM
// =========================================================================================================
// Wrapper around the Cloudflare Images binding.
// Transforms images stored in MEDIA_BUCKET or BUCKET (legacy) and caches results via the Cache API.
//
// Cache key format: https://vrcstorage.lat/media/{uuid}/{variant}
// Variants:
//   thumbnail  → 400px WebP q80  (resource feed cards)
//   preview    → 900px WebP q85  (resource detail page)
//   avatar     → 128px WebP q85  (user profile pictures)
//   banner     → 300px WebP q80  (community ad sidebar)
// =========================================================================================================

// =========================================================================================================
// Types & Config
// =========================================================================================================

export type ImageVariant = 'thumbnail' | 'preview' | 'avatar' | 'banner';

interface VariantConfig {
	width: number;
	quality: number;
}

const VARIANT_CONFIG: Record<ImageVariant, VariantConfig> = {
	thumbnail: { width: 400, quality: 80 },
	preview: { width: 900, quality: 85 },
	avatar: { width: 128, quality: 85 },
	banner: { width: 300, quality: 80 },
};

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// =========================================================================================================
// serveImage
// =========================================================================================================

/**
 * Returns a transformed image Response for the given R2 key and variant.
 *
 * Routing logic:
 *   - r2Bucket = 'media'  → read from env.MEDIA_BUCKET
 *   - r2Bucket = 'legacy' → read from env.BUCKET (old combined bucket, still valid during migration)
 *
 * Cache strategy (mandatory — Images binding has no automatic cache):
 *   1. Check Cache API for the generated cache key.
 *   2. On miss: fetch from R2, transform via Images binding, store in Cache API, return.
 *   3. On hit: return cached Response directly (no transformation charged).
 */
export async function serveImage(
	env: Env,
	r2Key: string,
	r2BucketDiscriminator: string,
	variant: ImageVariant,
	cacheKey: string,
): Promise<Response> {
	const cache = caches.default;
	const cacheRequest = new Request(cacheKey);

	// Cache hit — serve without any transformation billing
	const cached = await cache.match(cacheRequest);
	if (cached) return cached;

	// Fetch from the correct R2 bucket based on the discriminator
	const bucket = r2BucketDiscriminator === 'media' ? env.MEDIA_BUCKET : env.BUCKET;
	const object = await bucket.get(r2Key);
	if (!object) return new Response('Not Found', { status: 404 });

	const config = VARIANT_CONFIG[variant];

	let transformed: Response;
	try {
		// Transform via the Cloudflare Images binding
		const result = await env.IMAGES.input(object.body)
			.transform({ width: config.width })
			.output({ format: 'image/webp', quality: config.quality });

		transformed = result.response();
	} catch (e: unknown) {
		// Error code 9422: transformation quota exceeded (Free plan 5k/month limit)
		// Fall back to serving the original from R2 without transformation
		console.error('[image-transform] Images binding error (quota or unsupported format):', e);
		const fallback = await bucket.get(r2Key);
		if (!fallback) return new Response('Not Found', { status: 404 });
		return new Response(fallback.body, {
			headers: {
				'Content-Type': fallback.httpMetadata?.contentType ?? 'application/octet-stream',
				'Cache-Control': 'public, max-age=86400',
				'X-Image-Fallback': 'true',
			},
		});
	}

	// Build the cacheable response
	const toCache = new Response(transformed.body, {
		headers: {
			'Content-Type': 'image/webp',
			'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
			'X-Image-Variant': variant,
		},
	});

	// Store in Cache API — clone before putting (body is consumed)
	await cache.put(cacheRequest, toCache.clone());

	return toCache;
}

// =========================================================================================================
// invalidateImageCache
// =========================================================================================================

/**
 * Removes all cached variants for a given image UUID from the Cache API.
 * Call this after any update or delete of an image_media row.
 */
export async function invalidateImageCache(uuid: string, origin: string): Promise<void> {
	const cache = caches.default;
	const variants: ImageVariant[] = ['thumbnail', 'preview', 'avatar', 'banner'];
	await Promise.all(
		variants.map((v) => cache.delete(new Request(`${origin}/media/${uuid}/${v}`))),
	);
}
