// =========================================================================================================
// QUEUE HANDLER — Upload post-processing
// =========================================================================================================
// The Worker's `queue` entrypoint. Thin: for each message it runs the image pipeline for images and the
// video pipeline (normalize → poster GIF) for videos (both via MediaProcessingService), then acks; other
// uploads (archives) are acknowledged as-is. On failure the message is retried. All the actual media work
// + SQL lives in the service / repository layers.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { UploadQueueMessage, DriveTransferMessage } from '../types';
import { MediaProcessingService } from '../services/media-processing-service';
import { DriveTransferService } from '../services/drive-transfer-service';

// =========================================================================================================
// Handler
// =========================================================================================================

export async function handleQueue(batch: MessageBatch<UploadQueueMessage>, env: Env): Promise<void> {
	const processing = new MediaProcessingService(env.DB, env.IMAGES, env.BUCKET, env.MEDIA_BUCKET, env.MEDIA);

	for (const msg of batch.messages) {
		const { media_uuid, r2_key, media_type, file_name } = msg.body;
		try {
			if (media_type === 'image') {
				await processing.processImageVariants(media_uuid, r2_key);
				console.log(`[QUEUE] Image variants generated: ${media_uuid} (${file_name})`);
			} else if (media_type === 'video') {
				await processing.processVideo(media_uuid, r2_key);
				console.log(`[QUEUE] Video normalized + poster generated: ${media_uuid} (${file_name})`);
			} else {
				console.log(`[QUEUE] Non-media upload acknowledged: ${media_uuid} (${media_type})`);
			}
			msg.ack();
		} catch (e) {
			console.error(`[QUEUE] Failed to process ${r2_key}:`, e);
			msg.retry();
		}
	}
}

export async function handleDriveQueue(batch: MessageBatch<DriveTransferMessage>, env: Env): Promise<void> {
	const service = new DriveTransferService(env.DB, env.BUCKET, env.VRCSTORAGE_KV, env.GOOGLE_CLIENT_ID, env.GOOGLE_SECRET, env.JWT_SECRET);

	for (const msg of batch.messages) {
		try {
			await service.process(msg.body);
			console.log(`[DRIVE_QUEUE] Completed ${msg.body.job_uuid}`);
			msg.ack();
		} catch (e) {
			console.error(`[DRIVE_QUEUE] Failed ${msg.body.job_uuid}:`, e);
			msg.retry();
		}
	}
}
