// ============================================================================
// File Validation Helpers Tests
// ============================================================================
// Tests for isValidFileType(), validateFileSize(), getSizeLimitsDescription()
// and validateImageDimensions() — all pure functions, no worker needed.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
    isValidFileType,
    validateFileSize,
    getSizeLimitsDescription,
    SIZE_LIMITS,
    FILE_SIGNATURES,
} from '../../helpers/file-validation';
import {
    validateImageDimensions,
    getImageLimitsDescription,
    MAX_IMAGE_DIMENSION,
    MAX_IMAGE_SIZE,
} from '../../helpers/image-validator';

// ============================================================================
// Helpers — build a minimal File from raw bytes
// ============================================================================

function makeFile(hex: string, name = 'test.bin', type = 'application/octet-stream'): File {
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    return new File([bytes], name, { type });
}

/** Build a minimal valid PNG: signature + IHDR chunk with given dimensions */
function makePng(width: number, height: number): File {
    // PNG signature (8 bytes) + IHDR length (4) + 'IHDR' (4) + w (4, BE) + h (4, BE) + rest
    const buf = new Uint8Array(32);
    // PNG signature
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A].forEach((b, i) => (buf[i] = b));
    // IHDR chunk: length = 13 at offset 8
    const view = new DataView(buf.buffer);
    view.setUint32(8, 13, false);
    // 'IHDR' at offset 12
    [0x49, 0x48, 0x44, 0x52].forEach((b, i) => (buf[12 + i] = b));
    // Width at offset 16, Height at offset 20 (big-endian)
    view.setUint32(16, width, false);
    view.setUint32(20, height, false);
    return new File([buf], 'test.png', { type: 'image/png' });
}

/** Build a minimal valid JPEG: FF D8 FF + some padding */
function makeJpeg(width: number, height: number): File {
    // Minimal JPEG: signature + SOF0 marker with dimensions
    const buf = new Uint8Array(64).fill(0);
    const view = new DataView(buf.buffer);
    // JPEG signature
    buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF;
    // SOF0 at offset 2
    buf[2] = 0xFF; buf[3] = 0xC0;
    view.setUint16(4, 17, false);  // segment length
    buf[6] = 8;                    // precision
    view.setUint16(7, height, false); // big-endian height
    view.setUint16(9, width, false);  // big-endian width
    return new File([buf], 'test.jpg', { type: 'image/jpeg' });
}

/** Build a valid WebP file (VP8 lossy) */
function makeWebp(): File {
    const buf = new Uint8Array(32).fill(0);
    // RIFF signature
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => (buf[i] = b));
    // File size (little-endian, offset 4)
    // WEBP marker at offset 8
    [0x57, 0x45, 0x42, 0x50].forEach((b, i) => (buf[8 + i] = b));
    return new File([buf], 'test.webp', { type: 'image/webp' });
}

/** Build a ZIP file header */
function makeZip(): File {
    return makeFile('504B030400000000', 'test.zip', 'application/zip');
}

// ============================================================================
// isValidFileType()
// ============================================================================

describe('isValidFileType()', () => {
    it('recognises a PNG by magic bytes', async () => {
        const result = await isValidFileType(makePng(100, 100));
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('image');
        expect(result.mediaName).toBe('PNG');
    });

    it('recognises a JPEG by magic bytes', async () => {
        const result = await isValidFileType(makeJpeg(100, 100));
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('image');
        expect(result.mediaName).toBe('JPEG');
    });

    it('recognises a WebP by magic bytes + custom validator', async () => {
        const result = await isValidFileType(makeWebp());
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('image');
        expect(result.mediaName).toBe('WEBP');
    });

    it('recognises a ZIP by magic bytes', async () => {
        const result = await isValidFileType(makeZip());
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('file');
        expect(result.mediaName).toBe('ZIP');
    });

    it('returns isValidFile:false for random bytes', async () => {
        const junk = new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], 'junk.bin');
        const result = await isValidFileType(junk);
        expect(result.isValidFile).toBe(false);
        expect(result.mediaType).toBe('unknown');
    });

    it('returns the correct maxAllowedSize for each media type', async () => {
        const png = await isValidFileType(makePng(10, 10));
        expect(png.maxAllowedSize).toBe(SIZE_LIMITS.image);

        const zip = await isValidFileType(makeZip());
        expect(zip.maxAllowedSize).toBe(SIZE_LIMITS.file);
    });
});

// ============================================================================
// validateFileSize()
// ============================================================================

describe('validateFileSize()', () => {
    it('returns isValid:true when size is within the image limit', () => {
        const result = validateFileSize(1024 * 1024, 'image'); // 1 MB
        expect(result.isValid).toBe(true);
        expect(result.maxSize).toBe(SIZE_LIMITS.image);
    });

    it('returns isValid:false when size exceeds the image limit', () => {
        const result = validateFileSize(SIZE_LIMITS.image + 1, 'image');
        expect(result.isValid).toBe(false);
        expect(typeof result.error).toBe('string');
        expect(result.error).toContain('too large');
    });

    it('returns isValid:true when size is within the file (archive) limit', () => {
        const result = validateFileSize(500 * 1024 * 1024, 'file'); // 500 MB
        expect(result.isValid).toBe(true);
    });

    it('returns isValid:false when size exceeds the file limit', () => {
        const result = validateFileSize(SIZE_LIMITS.file + 1, 'file');
        expect(result.isValid).toBe(false);
    });
});

// ============================================================================
// getSizeLimitsDescription()
// ============================================================================

describe('getSizeLimitsDescription()', () => {
    it('returns a non-empty string describing the limits', () => {
        const desc = getSizeLimitsDescription();
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
        expect(desc).toContain('MB');
    });
});

// ============================================================================
// FILE_SIGNATURES constant
// ============================================================================

describe('FILE_SIGNATURES', () => {
    it('contains at least one image, one video and one file signature', () => {
        const types = FILE_SIGNATURES.map(s => s.mediaType);
        expect(types).toContain('image');
        expect(types).toContain('video');
        expect(types).toContain('file');
    });
});

// ============================================================================
// validateImageDimensions()
// ============================================================================

describe('validateImageDimensions()', () => {
    it('returns isValid:true for a small PNG', async () => {
        const result = await validateImageDimensions(makePng(256, 256));
        expect(result.isValid).toBe(true);
        expect(result.width).toBe(256);
        expect(result.height).toBe(256);
    });

    it('returns isValid:false when dimensions exceed the maximum', async () => {
        const oversized = makePng(MAX_IMAGE_DIMENSION + 1, MAX_IMAGE_DIMENSION + 1);
        const result = await validateImageDimensions(oversized);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('too large');
    });

    it('returns isValid:false when file size exceeds the maximum', async () => {
        // Create a File whose .size reports over the limit without real bytes
        const bigFile = {
            size: MAX_IMAGE_SIZE + 1,
            arrayBuffer: async () => new ArrayBuffer(0),
            name: 'huge.png',
            type: 'image/png',
        } as unknown as File;

        const result = await validateImageDimensions(bigFile);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('too large');
    });

    it('returns isValid:false for a file with no recognisable format', async () => {
        const junk = new File([new Uint8Array(64).fill(0)], 'junk.bin');
        const result = await validateImageDimensions(junk);
        expect(result.isValid).toBe(false);
    });
});

// ============================================================================
// getImageLimitsDescription()
// ============================================================================

describe('getImageLimitsDescription()', () => {
    it('returns a non-empty string mentioning MB and pixels', () => {
        const desc = getImageLimitsDescription();
        expect(desc).toContain('MB');
        expect(desc).toContain('pixels');
    });
});
