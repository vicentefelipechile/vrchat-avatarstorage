// =========================================================================================================
// QUEUE HANDLER — Upload post-processing
// =========================================================================================================
// The Worker's `queue` entrypoint. Thin: for each message it runs the image pipeline (via
// MediaProcessingService) for images and acks; non-image uploads are acknowledged as-is. On failure
// the message is retried. All the actual image work + SQL lives in the service / repository layers.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { UploadQueueMessage } from '../types';
import { MediaProcessingService } from '../services/media-processing-service';

// =========================================================================================================
// Handler
// =========================================================================================================

export async function handleQueue(batch: MessageBatch<UploadQueueMessage>, env: Env): Promise<void> {
	const processing = new MediaProcessingService(env.DB, env.IMAGES, env.BUCKET, env.MEDIA_BUCKET);

	for (const msg of batch.messages) {
		const { media_uuid, r2_key, media_type, file_name } = msg.body;
		try {
			if (media_type === 'image') {
				await processing.processImageVariants(media_uuid, r2_key);
				console.log(`[QUEUE] Image variants generated: ${media_uuid} (${file_name})`);
			} else {
				console.log(`[QUEUE] Non-image upload acknowledged: ${media_uuid} (${media_type})`);
			}
			msg.ack();
		} catch (e) {
			console.error(`[QUEUE] Failed to process ${r2_key}:`, e);
			msg.retry();
		}
	}
}
