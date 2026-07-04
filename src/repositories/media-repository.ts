// =========================================================================================================
// MEDIA REPOSITORY
// =========================================================================================================
// The ONLY place download-side `media` SQL lives, plus the download_count increment on the
// parent resource (resolved through the `resource_n_media` join). Reads return DB row types;
// deciding what a row means (public media vs private archive) is the service's job.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { queryOne, execute, type DB } from '../db/client';
import type { MediaRow } from '../db/schema';

// =========================================================================================================
// Repository
// =========================================================================================================

export class MediaRepository {
	constructor(private readonly db: DB) {}

	/** Look up a media row by its R2 key, or null if there is no such file. */
	findByKey(r2Key: string): Promise<MediaRow | null> {
		return queryOne<MediaRow>(this.db, 'SELECT * FROM media WHERE r2_key = ?', [r2Key]);
	}

	/**
	 * Increment download_count on the resource that owns this media file. The media→resource
	 * link goes through the `resource_n_media` join table; a media UUID maps to at most one
	 * resource. No-op if the media isn't attached to any resource.
	 */
	async incrementResourceDownloads(mediaUuid: string): Promise<void> {
		await execute(
			this.db,
			`UPDATE resources
			    SET download_count = download_count + 1
			  WHERE uuid = (
			      SELECT resource_uuid FROM resource_n_media WHERE media_uuid = ? LIMIT 1
			  )`,
			[mediaUuid],
		);
	}
}
