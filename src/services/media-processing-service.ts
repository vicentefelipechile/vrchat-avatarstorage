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
	 */
	async processImageVariants(mediaUuid: string, r2Key: string): Promise<void> {
		const originalObj = await this.bucket.get(r2Key);
		if (!originalObj) throw new Error(`Original not found in BUCKET: ${r2Key}`);

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

		const placeholderResult = await this.images
			.input(toStream())
			.transform({ width: 8, height: 8, fit: 'cover' })
			.output({ format: 'image/webp', quality: 10 });

		const placeholderBuffer = await placeholderResult.response().arrayBuffer();
		const placeholderBase64 = btoa(String.fromCharCode(...new Uint8Array(placeholderBuffer)));

		await this.variants.saveVariantsAndPlaceholder(mediaUuid, rows, `data:image/webp;base64,${placeholderBase64}`);
	}
}
