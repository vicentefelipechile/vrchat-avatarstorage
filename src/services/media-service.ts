// =========================================================================================================
// MEDIA SERVICE
// =========================================================================================================
// Read-side business rules for a single media file. Currently just its processing status: whether the
// upload queue has finished generating the CDN variants. Env-agnostic — the DB is passed in — and the
// EXISTS query lives in MediaVariantRepository. The frontend polls this while a freshly uploaded image
// still shows the "processing" placeholder, and swaps to the real variant once it reads `processed`.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import { MediaVariantRepository } from '../repositories/media-variant-repository';

// =========================================================================================================
// Service
// =========================================================================================================

export class MediaService {
	private readonly variants: MediaVariantRepository;

	constructor(db: DB) {
		this.variants = new MediaVariantRepository(db);
	}

	/**
	 * Whether this media has finished processing — true once its CDN variants exist. A media with no
	 * variants (unknown uuid, or the queue hasn't run yet) reads as not processed; the caller doesn't
	 * distinguish the two, since both mean "keep showing the placeholder and keep polling".
	 */
	async isProcessed(mediaUuid: string): Promise<boolean> {
		return this.variants.existsFor(mediaUuid);
	}
}
