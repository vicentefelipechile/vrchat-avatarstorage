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
	 * Animated GIFs are the exception: they can't be re-encoded to webp/png without losing the
	 * animation, so they are stored as a single `original/gif` variant that serves the untouched
	 * original (see processGif). Everything else generates the full 6-variant set.
	 */
	async processImageVariants(mediaUuid: string, r2Key: string): Promise<void> {
		const originalObj = await this.bucket.get(r2Key);
		if (!originalObj) throw new Error(`Original not found in BUCKET: ${r2Key}`);

		// GIFs can be large (animated). Sniff the 4-byte signature from R2 metadata range before
		// materialising anything, so an animated GIF is copied by stream instead of buffered whole.
		if (await this.isGifObject(r2Key)) {
			await this.processGif(mediaUuid, r2Key);
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
	 * Store an animated GIF as its own `original/gif` variant: the untouched original is streamed
	 * R2→R2 into MEDIA_BUCKET under `{uuid}/original.gif` so the CDN serves it like any other
	 * variant, and a single index row records it. Nothing is buffered in memory — animated GIFs run
	 * tens of MB and materialising them (or running them through the Images binding for a blur)
	 * overruns the worker. There is no blur placeholder for GIFs. This keeps the animation intact
	 * while leaving the media covered by media_variants (so it no longer counts as missing).
	 */
	private async processGif(mediaUuid: string, r2Key: string): Promise<void> {
		const originalObj = await this.bucket.get(r2Key);
		if (!originalObj) throw new Error(`Original not found in BUCKET: ${r2Key}`);

		const variantKey = `${mediaUuid}/original.gif`;
		await this.mediaBucket.put(variantKey, originalObj.body, { httpMetadata: { contentType: 'image/gif' } });

		const rows: VariantRow[] = [{ res: 'original', format: 'gif', r2Key: variantKey, fileSize: originalObj.size }];
		await this.variants.saveVariantsAndPlaceholder(mediaUuid, rows, null);
	}

	/** Read the first 4 bytes from R2 (ranged GET) and test the GIF signature — no full download. */
	private async isGifObject(r2Key: string): Promise<boolean> {
		const head = await this.bucket.get(r2Key, { range: { offset: 0, length: 4 } });
		if (!head) return false;
		const bytes = new Uint8Array(await head.arrayBuffer());
		return isGif(bytes);
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
