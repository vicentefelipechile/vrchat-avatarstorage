// =========================================================================================================
// MEDIA VARIANT REPOSITORY
// =========================================================================================================
// The ONLY place `media_variants` SQL lives, plus the `media.placeholder_blur` write that the image
// pipeline produces. The processing service builds the variant objects (R2) and calls these to
// persist the index rows + blur placeholder in a single D1 batch. SQL only — no image work here.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import type { MediaResolution, MediaFormat } from '../types';

// =========================================================================================================
// Types
// =========================================================================================================

/** One generated variant to index (an object already stored in MEDIA_BUCKET). */
export interface VariantRow {
	res: MediaResolution;
	format: MediaFormat;
	r2Key: string;
	fileSize: number;
}

// =========================================================================================================
// Repository
// =========================================================================================================

export class MediaVariantRepository {
	constructor(private readonly db: DB) {}

	/**
	 * Persist all generated variants + the blur placeholder for one media in a single batch. The
	 * caller has already written the variant objects to MEDIA_BUCKET; this only records them and
	 * sets `media.placeholder_blur`. `INSERT OR REPLACE` keeps re-runs (backfill) idempotent. A
	 * `null` placeholder (animated GIFs, which get no blur) leaves `media.placeholder_blur` untouched.
	 */
	async saveVariantsAndPlaceholder(mediaUuid: string, variants: VariantRow[], placeholderDataUri: string | null): Promise<void> {
		const statements: D1PreparedStatement[] = variants.map((v) =>
			this.db
				.prepare('INSERT OR REPLACE INTO media_variants (media_uuid, res, format, r2_key, file_size) VALUES (?, ?, ?, ?, ?)')
				.bind(mediaUuid, v.res, v.format, v.r2Key, v.fileSize),
		);

		if (placeholderDataUri !== null) {
			statements.push(
				this.db.prepare('UPDATE media SET placeholder_blur = ? WHERE uuid = ?').bind(placeholderDataUri, mediaUuid),
			);
		}

		await this.db.batch(statements);
	}
}
