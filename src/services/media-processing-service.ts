// =========================================================================================================
// MEDIA PROCESSING SERVICE
// =========================================================================================================
// The image pipeline that runs off the upload queue: for one image it reads the original from R2,
// generates the 6 resolution/format variants (via the Cloudflare Images binding), stores them in
// MEDIA_BUCKET, produces an 8×8 blur placeholder, and hands the index rows + placeholder to
// MediaVariantRepository for a single-batch persist.
//
// The env collaborators it needs — the Images binding and both R2 buckets — are passed in so the
// service stays env-agnostic. The queue handler (src/http/queue.ts) supplies them.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import type { MediaResolution, MediaFormat } from '../types';
import { MediaVariantRepository, type VariantRow } from '../repositories/media-variant-repository';

// =========================================================================================================
// Constants
// =========================================================================================================

/** The 6 variants generated for every image (2 resolutions capped + original, each in webp + png). */
const MEDIA_VARIANTS: Array<{ res: MediaResolution; format: MediaFormat; maxWidth?: number; quality: number }> = [
	{ res: 'low', format: 'webp', maxWidth: 400, quality: 75 },
	{ res: 'low', format: 'png', maxWidth: 400, quality: 75 },
	{ res: 'med', format: 'webp', maxWidth: 800, quality: 85 },
	{ res: 'med', format: 'png', maxWidth: 800, quality: 85 },
	{ res: 'original', format: 'webp', quality: 90 },
	{ res: 'original', format: 'png', quality: 90 },
];

// =========================================================================================================
// Service
// =========================================================================================================

export class MediaProcessingService {
	private readonly variants: MediaVariantRepository;

	constructor(
		db: DB,
		private readonly images: ImagesBinding,
		private readonly bucket: R2Bucket,
		private readonly mediaBucket: R2Bucket,
	) {
		this.variants = new MediaVariantRepository(db);
	}

	/**
	 * Generate + store all variants and the blur placeholder for one image. Throws if the original
	 * is missing in R2 (the queue handler will retry). Idempotent: re-running overwrites variants.
	 *
	 * Animated media is the exception: an animated GIF, animated WebP, or APNG can't be re-encoded to
	 * static webp/png without losing the animation, so it is stored as a single `original` variant that
	 * serves the untouched original in its own format (see processAnimated). Everything else generates
	 * the full 6-variant set.
	 */
	async processImageVariants(mediaUuid: string, r2Key: string): Promise<void> {
		const originalObj = await this.bucket.get(r2Key);
		if (!originalObj) throw new Error(`Original not found in BUCKET: ${r2Key}`);

		// Animated media can be large. Sniff the container from a ranged GET before materialising
		// anything, so an animated original is copied by stream instead of buffered whole.
		const animatedFormat = await this.detectAnimatedFormat(r2Key);
		if (animatedFormat) {
			await this.processAnimated(mediaUuid, r2Key, animatedFormat);
			return;
		}

		const originalBytes = new Uint8Array(await originalObj.arrayBuffer());

		const toStream = (): ReadableStream<Uint8Array> =>
			new ReadableStream({
				start(controller) {
					controller.enqueue(originalBytes);
					controller.close();
				},
			});

		const rows: VariantRow[] = [];

		for (const v of MEDIA_VARIANTS) {
			const transformInput = this.images.input(toStream());
			const withTransform = v.maxWidth ? transformInput.transform({ width: v.maxWidth, fit: 'scale-down' }) : transformInput;
			const result = await withTransform.output({ format: `image/${v.format}` as `image/${MediaFormat}`, quality: v.quality });

			const variantKey = `${mediaUuid}/${v.res}.${v.format}`;
			const variantBuffer = await result.response().arrayBuffer();

			await this.mediaBucket.put(variantKey, variantBuffer, { httpMetadata: { contentType: `image/${v.format}` } });

			rows.push({ res: v.res, format: v.format, r2Key: variantKey, fileSize: variantBuffer.byteLength });
		}

		const placeholder = await this.buildBlurPlaceholder(originalBytes);
		await this.variants.saveVariantsAndPlaceholder(mediaUuid, rows, placeholder);
	}

	/**
	 * Store animated media as its own single `original` variant in its native format: the untouched
	 * original is streamed R2→R2 into MEDIA_BUCKET under `{uuid}/original.{format}` so the CDN serves
	 * it like any other variant, and a single index row records it. Nothing is buffered in memory —
	 * animated media runs tens of MB and materialising it (or running it through the Images binding
	 * for a blur) overruns the worker. There is no blur placeholder for animated media. This keeps the
	 * animation intact while leaving the media covered by media_variants (so it no longer counts as
	 * missing). GIF stays `image/gif`; animated WebP and APNG keep `image/webp` / `image/png`.
	 */
	private async processAnimated(mediaUuid: string, r2Key: string, format: MediaFormat): Promise<void> {
		const originalObj = await this.bucket.get(r2Key);
		if (!originalObj) throw new Error(`Original not found in BUCKET: ${r2Key}`);

		const variantKey = `${mediaUuid}/original.${format}`;
		await this.mediaBucket.put(variantKey, originalObj.body, { httpMetadata: { contentType: `image/${format}` } });

		const rows: VariantRow[] = [{ res: 'original', format, r2Key: variantKey, fileSize: originalObj.size }];
		await this.variants.saveVariantsAndPlaceholder(mediaUuid, rows, null);
	}

	/**
	 * Detect animated media from the container header via a ranged GET — no full download. Returns the
	 * native format to preserve (`gif`, `webp` for animated WebP, `png` for APNG) or `null` for static
	 * media, which takes the normal re-encode path. Reads a 256-byte prefix: the WebP animation flag
	 * sits at a fixed offset, but an APNG's `acTL` chunk can be pushed past the first few chunks by
	 * optional colour/metadata chunks (e.g. an embedded ICC profile), so the prefix stays generous.
	 */
	private async detectAnimatedFormat(r2Key: string): Promise<MediaFormat | null> {
		const head = await this.bucket.get(r2Key, { range: { offset: 0, length: 256 } });
		if (!head) return null;
		const bytes = new Uint8Array(await head.arrayBuffer());

		if (isGif(bytes)) return 'gif';
		if (isAnimatedWebp(bytes)) return 'webp';
		if (isApng(bytes)) return 'png';
		return null;
	}

	/** 8×8 blur placeholder as a base64 webp data URI (a static frame for GIFs). */
	private async buildBlurPlaceholder(originalBytes: Uint8Array): Promise<string> {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(originalBytes);
				controller.close();
			},
		});

		const result = await this.images
			.input(stream)
			.transform({ width: 8, height: 8, fit: 'cover' })
			.output({ format: 'image/webp', quality: 10 });

		const buffer = await result.response().arrayBuffer();
		const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
		return `data:image/webp;base64,${base64}`;
	}
}

// =========================================================================================================
// Helpers
// =========================================================================================================

/** True if the bytes start with the GIF signature (`GIF8` — both 87a and 89a). */
function isGif(bytes: Uint8Array): boolean {
	return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
}

/**
 * True for an animated WebP: a RIFF/WEBP container whose extended (`VP8X`) header has the animation
 * flag set. WebP is `RIFF????WEBP` (bytes 0–3 `RIFF`, 8–11 `WEBP`); an animated file uses the `VP8X`
 * chunk at offset 12, whose flags byte (offset 20) has bit 1 (0x02) set. Static and lossy/lossless
 * WebP lack `VP8X` or the flag, so they fall through to the normal re-encode path.
 */
function isAnimatedWebp(bytes: Uint8Array): boolean {
	const isRiffWebp =
		bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
		bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50; // "WEBP"
	if (!isRiffWebp) return false;

	const hasVp8x = bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58; // "VP8X"
	if (!hasVp8x) return false;

	return (bytes[20] & 0x02) !== 0; // VP8X flags: animation bit
}

/**
 * True for an APNG: a PNG signature followed by an `acTL` (animation control) chunk before the first
 * `IDAT`. `acTL` sits right after `IHDR` in the spec, so it lands within the sniffed prefix in
 * practice; a plain PNG has no `acTL` and falls through to the normal re-encode path.
 */
function isApng(bytes: Uint8Array): boolean {
	const isPng =
		bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
		bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
	if (!isPng) return false;

	// Scan the prefix for the `acTL` chunk type marker.
	for (let i = 8; i + 4 <= bytes.length; i++) {
		if (bytes[i] === 0x61 && bytes[i + 1] === 0x63 && bytes[i + 2] === 0x54 && bytes[i + 3] === 0x4c) return true; // "acTL"
	}
	return false;
}
