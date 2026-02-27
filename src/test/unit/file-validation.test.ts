// =========================================================================================================
// UNIT TESTS — File Validation Helper
// =========================================================================================================
// Tests for src/helpers/file-validation.ts
// =========================================================================================================

import { describe, it, expect } from 'vitest';
import {
    isValidFileType,
    validateFileSize,
    getSizeLimitsDescription,
    SIZE_LIMITS,
    FILE_SIGNATURES,
} from '../../helpers/file-validation';

// ── Helper: Create a File from hex magic bytes ────────────────────────────────
function makeFileFromHex(hex: string, extraSize = 0, name = 'test.bin'): File {
    const bytes = hex.match(/../g)!.map((b) => parseInt(b, 16));
    // Pad to required minimum length + extra
    const padded = [...bytes, ...new Array(Math.max(0, 12 - bytes.length + extraSize)).fill(0)];
    return new File([new Uint8Array(padded)], name, { type: 'application/octet-stream' });
}

// Helper to build a valid WEBP file (RIFF....WEBP)
function makeWebPFile(): File {
    const arr = new Uint8Array(16);
    // RIFF magic bytes
    arr[0] = 0x52; arr[1] = 0x49; arr[2] = 0x46; arr[3] = 0x46; // RIFF
    // file size bytes (4 bytes, don't care)
    arr[4] = 0x00; arr[5] = 0x00; arr[6] = 0x00; arr[7] = 0x00;
    // WEBP marker
    arr[8] = 0x57; arr[9] = 0x45; arr[10] = 0x42; arr[11] = 0x50; // WEBP
    arr[12] = 0x00; arr[13] = 0x00; arr[14] = 0x00; arr[15] = 0x00;
    return new File([arr], 'image.webp', { type: 'image/webp' });
}

// ── isValidFileType ───────────────────────────────────────────────────────────
describe('isValidFileType', () => {
    it('accepts PNG files (magic bytes 89504E47)', async () => {
        const file = makeFileFromHex('89504E47', 0, 'image.png');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('image');
        expect(result.mediaName).toBe('PNG');
    });

    it('accepts JPEG files (magic bytes FFD8FF)', async () => {
        const file = makeFileFromHex('FFD8FF', 0, 'image.jpg');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('image');
        expect(result.mediaName).toBe('JPEG');
    });

    it('accepts GIF files (magic bytes 47494638)', async () => {
        const file = makeFileFromHex('47494638', 0, 'image.gif');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('image');
        expect(result.mediaName).toBe('GIF');
    });

    it('accepts WEBP files (RIFF + WEBP marker)', async () => {
        const file = makeWebPFile();
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('image');
        expect(result.mediaName).toBe('WEBP');
    });

    it('accepts ZIP files (magic bytes 504B0304)', async () => {
        const file = makeFileFromHex('504B0304', 0, 'archive.zip');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('file');
        expect(result.mediaName).toBe('ZIP');
    });

    it('accepts GZIP files (magic bytes 1F8B)', async () => {
        const file = makeFileFromHex('1F8B', 0, 'archive.gz');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('file');
        expect(result.mediaName).toBe('GZIP');
    });

    it('accepts RAR files (magic bytes 52617221)', async () => {
        const file = makeFileFromHex('52617221', 0, 'archive.rar');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('file');
        expect(result.mediaName).toBe('RAR');
    });

    it('accepts WEBM video files (magic bytes 1A45DF)', async () => {
        const file = makeFileFromHex('1A45DF', 0, 'video.webm');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(true);
        expect(result.mediaType).toBe('video');
        expect(result.mediaName).toBe('WEBM');
    });

    it('rejects an invalid/unknown file type', async () => {
        const file = makeFileFromHex('DEADBEEF', 0, 'bad.exe');
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(false);
        expect(result.mediaType).toBe('unknown');
    });

    it('rejects a text/plain file', async () => {
        const textContent = new TextEncoder().encode('Hello World');
        const file = new File([textContent], 'document.txt', { type: 'text/plain' });
        const result = await isValidFileType(file);
        expect(result.isValidFile).toBe(false);
    });

    it('rejects a RIFF file that is NOT WEBP', async () => {
        // RIFF header but AVI instead of WEBP at bytes 8-11
        const arr = new Uint8Array(16);
        arr[0] = 0x52; arr[1] = 0x49; arr[2] = 0x46; arr[3] = 0x46; // RIFF
        arr[4] = arr[5] = arr[6] = arr[7] = 0x00;
        arr[8] = 0x41; arr[9] = 0x56; arr[10] = 0x49; arr[11] = 0x20; // AVI space
        const file = new File([arr], 'video.avi');
        const result = await isValidFileType(file);
        // Should still match WEBM or other signatures, but not WEBP custom validator
        // Actually RIFF + AVI won't match any other sig cleanly → unknown
        expect(result.mediaName).not.toBe('WEBP');
    });
});

// ── validateFileSize ──────────────────────────────────────────────────────────
describe('validateFileSize', () => {
    it('passes for image within 20MB limit', () => {
        const result = validateFileSize(10 * 1024 * 1024, 'image'); // 10 MB
        expect(result.isValid).toBe(true);
    });

    it('fails for image exceeding 20MB limit', () => {
        const result = validateFileSize(21 * 1024 * 1024, 'image'); // 21 MB
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File too large');
        expect(result.error).toContain('image');
    });

    it('passes for video within 100MB limit', () => {
        const result = validateFileSize(80 * 1024 * 1024, 'video'); // 80 MB
        expect(result.isValid).toBe(true);
    });

    it('fails for video exceeding 100MB limit', () => {
        const result = validateFileSize(101 * 1024 * 1024, 'video'); // 101 MB
        expect(result.isValid).toBe(false);
    });

    it('passes for archive file within 1500MB limit', () => {
        const result = validateFileSize(500 * 1024 * 1024, 'file'); // 500 MB
        expect(result.isValid).toBe(true);
    });

    it('returns the maxSize in the result', () => {
        const result = validateFileSize(1, 'image');
        expect(result.maxSize).toBe(SIZE_LIMITS.image);
    });

    it('error message includes human-readable MB values', () => {
        const result = validateFileSize(25 * 1024 * 1024, 'image'); // 25 MB
        expect(result.error).toMatch(/\d+MB/);
    });
});

// ── getSizeLimitsDescription ──────────────────────────────────────────────────
describe('getSizeLimitsDescription', () => {
    it('returns a non-empty string description', () => {
        const desc = getSizeLimitsDescription();
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
    });

    it('mentions Images, Videos, and Files', () => {
        const desc = getSizeLimitsDescription();
        expect(desc).toContain('Images');
        expect(desc).toContain('Videos');
        expect(desc).toContain('Files');
    });

    it('includes MB values', () => {
        const desc = getSizeLimitsDescription();
        expect(desc).toContain('MB');
    });
});

// ── FILE_SIGNATURES constant ──────────────────────────────────────────────────
describe('FILE_SIGNATURES', () => {
    it('contains at least one image signature', () => {
        const images = FILE_SIGNATURES.filter((s) => s.mediaType === 'image');
        expect(images.length).toBeGreaterThan(0);
    });

    it('contains at least one file/archive signature', () => {
        const files = FILE_SIGNATURES.filter((s) => s.mediaType === 'file');
        expect(files.length).toBeGreaterThan(0);
    });

    it('contains at least one video signature', () => {
        const videos = FILE_SIGNATURES.filter((s) => s.mediaType === 'video');
        expect(videos.length).toBeGreaterThan(0);
    });
});
