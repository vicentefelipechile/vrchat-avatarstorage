// =========================================================================================================
// VIDEO PROCESSING SERVICE TESTS
// =========================================================================================================
// Media Transformations is remote-only; a local typed stand-in supplies the normalized MP4 and PNG frame.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { MediaProcessingService } from '../../../src/services/media-processing-service';
import staticImage from '../../fixtures/static.png?inline';
import { createMedia } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

function localMedia(frameTimes: string[]): MediaBinding {
	const png = Uint8Array.from(atob(staticImage.split(',')[1]), (char) => char.charCodeAt(0));
	const mp4 = new TextEncoder().encode('normalized-mp4-without-duration');
	return {
		input: (_source) => {
			const output = (options?: MediaTransformationOutputOptions): MediaTransformationResult => {
				const isFrame = options?.mode === 'frame';
				if (isFrame) frameTimes.push(options?.time ?? '');
				const bytes = isFrame ? png : mp4;
				return {
					media: async () => new Response(bytes).body!,
					response: async () => new Response(bytes),
					contentType: async () => isFrame ? 'image/png' : 'video/mp4',
				};
			};
			return { output, transform: () => ({ output }) };
		},
	};
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('video normalization and poster', () => {
	it('stores normalized video, builds a GIF poster and indexes both variants', async () => {
		const uuid = await createMedia('video', 'original.webm');
		await env.BUCKET.put(uuid, 'original-video');
		const frameTimes: string[] = [];
		const service = new MediaProcessingService(env.DB, env.IMAGES, env.BUCKET, env.MEDIA_BUCKET, localMedia(frameTimes));
		await service.processVideo(uuid, uuid);
		expect(frameTimes).toEqual(['0.00s']);
		expect(await env.MEDIA_BUCKET.head(`${uuid}/video.mp4`)).not.toBeNull();
		const poster = await env.MEDIA_BUCKET.get(`${uuid}/original.gif`);
		expect(new TextDecoder().decode((await poster!.arrayBuffer()).slice(0, 6))).toBe('GIF89a');
		const variants = await env.DB.prepare('SELECT format FROM media_variants WHERE media_uuid = ? ORDER BY format').bind(uuid).all<{ format: string }>();
		expect(variants.results.map(({ format }) => format)).toEqual(['gif', 'mp4']);
	});

	it('fails before indexing if the original is missing', async () => {
		const uuid = await createMedia('video');
		const service = new MediaProcessingService(env.DB, env.IMAGES, env.BUCKET, env.MEDIA_BUCKET, localMedia([]));
		await expect(service.processVideo(uuid, uuid)).rejects.toThrow('Original not found');
		expect(await env.MEDIA_BUCKET.head(`${uuid}/video.mp4`)).toBeNull();
	});
});
