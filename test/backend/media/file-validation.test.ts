// =========================================================================================================
// FILE VALIDATION UNIT TESTS
// =========================================================================================================
// Prevent extension spoofing and enforce upload size boundaries.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it } from 'vitest';

import { isValidSignature, SIZE_LIMITS, validateFileSize } from '../../../src/helpers/file-validation';
import { MAX_IMAGE_DIMENSION, validateImageDimensions } from '../../../src/helpers/image-validator';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('file signatures', () => {
	it.each([
		[[0x89, 0x50, 0x4e, 0x47], 'image', 'PNG'],
		[[0x50, 0x4b, 0x03, 0x04], 'file', 'ZIP'],
		[[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d], 'video', 'MP4'],
	] as const)('recognizes %s as %s', (bytes, mediaType, mediaName) => {
		expect(isValidSignature(new Uint8Array(bytes).buffer)).toMatchObject({ isValidFile: true, mediaType, mediaName });
	});

	it('rejects unknown and invalid container signatures', () => {
		expect(isValidSignature(new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c]).buffer).isValidFile).toBe(false);
		expect(isValidSignature(new TextEncoder().encode('RIFF----FAKE').buffer).isValidFile).toBe(false);
		expect(isValidSignature(new TextEncoder().encode('RIFF----WEBP').buffer).isValidFile).toBe(true);
	});
});

describe('upload limits', () => {
	it.each(['image', 'video', 'file'] as const)('accepts the exact %s limit and rejects one byte more', (type) => {
		expect(validateFileSize(SIZE_LIMITS[type], type).isValid).toBe(true);
		expect(validateFileSize(SIZE_LIMITS[type] + 1, type).isValid).toBe(false);
	});
});

describe('image dimensions', () => {
	it('extracts dimensions and enforces the maximum without decoding pixels', async () => {
		const png = new Uint8Array(24);
		png.set([0x89, 0x50, 0x4e, 0x47], 0);
		const header = new DataView(png.buffer);
		header.setUint32(16, MAX_IMAGE_DIMENSION);
		header.setUint32(20, 20);
		expect(await validateImageDimensions(new File([png], 'valid.png'))).toMatchObject({ isValid: true, width: MAX_IMAGE_DIMENSION, height: 20 });
		header.setUint32(16, MAX_IMAGE_DIMENSION + 1);
		expect(await validateImageDimensions(new File([png], 'oversized.png'))).toMatchObject({ isValid: false, width: MAX_IMAGE_DIMENSION + 1 });
	});

	it('rejects images with unrecognized headers', async () => {
		expect((await validateImageDimensions(new File(['not image data'], 'bad.png'))).isValid).toBe(false);
	});

	it('reads JPEG and GIF dimensions from their format-specific headers', async () => {
		const jpeg = new Uint8Array(16);
		jpeg.set([0xff, 0xd8, 0xff, 0xc0], 0);
		new DataView(jpeg.buffer).setUint16(7, 512);
		new DataView(jpeg.buffer).setUint16(9, 768);
		expect(await validateImageDimensions(new File([jpeg], 'image.jpg'))).toMatchObject({ isValid: true, width: 768, height: 512 });
		const gif = new Uint8Array(10);
		gif.set(new TextEncoder().encode('GIF89a'));
		new DataView(gif.buffer).setUint16(6, 320, true);
		new DataView(gif.buffer).setUint16(8, 240, true);
		expect(await validateImageDimensions(new File([gif], 'image.gif'))).toMatchObject({ isValid: true, width: 320, height: 240 });
	});
});
