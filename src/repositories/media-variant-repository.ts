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

import { queryOne, type DB } from '../db/client';
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

	/**
	 * True once at least one variant row exists for this media — i.e. the queue has finished the image
	 * pipeline and the CDN can serve it. This is the source of truth for a media's "processed" state;
	 * nothing is persisted on `media` itself, so it can never desync from the actual variants.
	 */
	async existsFor(mediaUuid: string): Promise<boolean> {
		const row = await queryOne<{ present: number }>(
			this.db,
			'SELECT EXISTS(SELECT 1 FROM media_variants WHERE media_uuid = ?) AS present',
			[mediaUuid],
		);
		return row?.present === 1;
	}
}
