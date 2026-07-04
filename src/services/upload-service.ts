// =========================================================================================================
// UPLOAD SERVICE
// =========================================================================================================
// Pure, env-agnostic upload rules: magic-byte + size + dimension validation, the media_type
// allowlist for multipart sessions, and the mime-type derivation used when storing to R2. The
// service owns the *decisions*; the route owns the R2 / KV / queue orchestration (those are env
// collaborators, like sessions and cookies in the other slices) and the single INSERT lives in
// MediaRepository.
//
// Validation failures throw ValidationError (mapped to 400 by the central error handler), keeping
// the legacy status codes. The `details` payload for an over-dimension image is carried on the
// error so the route can reproduce the legacy body exactly.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { isValidFileType, isValidSignature, validateFileSize } from '../helpers/file-validation';
import { validateImageDimensions } from '../helpers/image-validator';
import { ValidationError } from '../domain/errors';

// =========================================================================================================
// Constants
// =========================================================================================================

/** media_type values a multipart session may declare (init) and be completed with. */
export const MULTIPART_MEDIA_TYPES = ['image', 'video', 'file'] as const;
export type MultipartMediaType = (typeof MULTIPART_MEDIA_TYPES)[number];

// =========================================================================================================
// Types
// =========================================================================================================

/** Result of validating a single-shot upload: the detected media type and the mime to store. */
export interface ValidatedUpload {
	mediaType: string;
	mimeType: string;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class UploadService {
	// -------------------------------------------------------------------------
	// Single-shot upload (PUT /api/upload)
	// -------------------------------------------------------------------------

	/**
	 * Validate a single-shot file upload (magic bytes → size → image dimensions) and derive the
	 * strict mime type to store in R2. Throws ValidationError on any failed check; the dimension
	 * failure carries the legacy `{ width, height, fileSize }` details.
	 */
	async validateFile(file: File): Promise<ValidatedUpload> {
		// Step 1: magic bytes → file type.
		const validation = await isValidFileType(file);
		if (!validation.isValidFile || validation.mediaType === 'unknown') {
			throw new ValidationError(
				'Invalid file type. Only images (PNG, JPEG, GIF, WEBP, AVIF), videos (MP4, WEBM), and archives (ZIP, RAR, 7Z, GZIP, BLEND) are allowed.',
			);
		}

		// Step 2: size limit for the detected media type.
		const sizeValidation = validateFileSize(file.size, validation.mediaType);
		if (!sizeValidation.isValid) throw new ValidationError(sizeValidation.error ?? 'Invalid file size');

		// Step 3: images get an extra dimension check.
		if (validation.mediaType === 'image') {
			const imageValidation = await validateImageDimensions(file);
			if (!imageValidation.isValid) {
				throw new ValidationError(imageValidation.error ?? 'Invalid image dimensions', {
					width: imageValidation.width,
					height: imageValidation.height,
					fileSize: imageValidation.fileSize,
				});
			}
		}

		return { mediaType: validation.mediaType, mimeType: this.deriveMimeType(validation.mediaType, validation.mediaName) };
	}

	/** Strict mime type from the detected media type + name (defaults to octet-stream for archives). */
	private deriveMimeType(mediaType: string, mediaName: string): string {
		if (mediaType === 'image') return `image/${mediaName.toLowerCase()}`;
		if (mediaType === 'video') return `video/${mediaName.toLowerCase()}`;
		return 'application/octet-stream';
	}

	// -------------------------------------------------------------------------
	// Multipart upload (POST /api/upload/init, PUT /part, POST /complete)
	// -------------------------------------------------------------------------

	/** Whether a client-declared media_type is one this system accepts for multipart uploads. */
	isAllowedMultipartType(mediaType: string): mediaType is MultipartMediaType {
		return (MULTIPART_MEDIA_TYPES as readonly string[]).includes(mediaType);
	}

	/** Generic mime for the createMultipartUpload metadata (real type is enforced on part 1). */
	initMimeType(mediaType: MultipartMediaType): string {
		if (mediaType === 'image' || mediaType === 'video') return `${mediaType}/mp4`;
		return 'application/octet-stream';
	}

	/**
	 * Validate the first multipart chunk's signature against the media_type declared at init.
	 * Returns true when the buffer's magic bytes match the expectation; the route aborts the
	 * upload and surfaces the legacy error string when this is false.
	 */
	firstPartSignatureMatches(buffer: ArrayBuffer, expectedMediaType: string): {
		ok: boolean;
		detectedType: string;
		detectedName: string;
	} {
		const validation = isValidSignature(buffer);
		return {
			ok: validation.isValidFile && validation.mediaType === expectedMediaType,
			detectedType: validation.mediaType,
			detectedName: validation.mediaName,
		};
	}
}
