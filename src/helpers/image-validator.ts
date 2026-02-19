// =========================================================================================================
// IMAGE VALIDATION HELPER
// =========================================================================================================
// This module provides specialized validation for image files, including dimension extraction
// and validation to prevent abuse from oversized images.
// =========================================================================================================

export interface ImageValidationResult {
    isValid: boolean;
    width?: number;
    height?: number;
    error?: string;
    fileSize?: number;
}

// Maximum image dimensions (width or height)
export const MAX_IMAGE_DIMENSION = 4096; // 4096x4096 pixels max

// Maximum image file size
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Extract image dimensions from various image formats by reading their binary headers.
 * This is more efficient than loading the entire image and works server-side.
 * 
 * References:
 * - PNG Spec: http://www.libpng.org/pub/png/spec/1.2/PNG-Structure.html
 * - JPEG Spec: https://www.w3.org/Graphics/JPEG/itu-t81.pdf
 * - GIF Spec: https://www.w3.org/Graphics/GIF/spec-gif89a.txt
 * - WEBP Spec: https://developers.google.com/speed/webp/docs/riff_container
 * - AVIF Spec: https://aomediacodec.github.io/av1-avif/
 */
async function extractImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // PNG: Signature is 89 50 4E 47 0D 0A 1A 0A
    // Dimensions are in IHDR chunk at bytes 16-23 (big-endian)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        const width = view.getUint32(16, false); // big-endian
        const height = view.getUint32(20, false);
        return { width, height };
    }

    // JPEG: Signature is FF D8 FF
    // Need to scan for SOF (Start of Frame) markers
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        let offset = 2;
        while (offset < bytes.length - 9) {
            if (bytes[offset] !== 0xFF) {
                offset++;
                continue;
            }

            const marker = bytes[offset + 1];

            // SOF markers: C0, C1, C2, C3, C5, C6, C7, C9, CA, CB, CD, CE, CF
            if ((marker >= 0xC0 && marker <= 0xC3) ||
                (marker >= 0xC5 && marker <= 0xC7) ||
                (marker >= 0xC9 && marker <= 0xCB) ||
                (marker >= 0xCD && marker <= 0xCF)) {
                const height = view.getUint16(offset + 5, false); // big-endian
                const width = view.getUint16(offset + 7, false);
                return { width, height };
            }

            // Skip to next marker
            const segmentLength = view.getUint16(offset + 2, false);
            offset += 2 + segmentLength;
        }
        return null; // Could not find SOF marker
    }

    // GIF: Signature is 47 49 46 38 (GIF8)
    // Dimensions are at bytes 6-9 (little-endian)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
        const width = view.getUint16(6, true); // little-endian
        const height = view.getUint16(8, true);
        return { width, height };
    }

    // WEBP: Signature is 52 49 46 46 (RIFF) with WEBP at offset 8
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        const webpMarker = String.fromCharCode(...bytes.slice(8, 12));
        if (webpMarker === 'WEBP') {
            const chunkHeader = String.fromCharCode(...bytes.slice(12, 16));

            // VP8 (lossy)
            if (chunkHeader === 'VP8 ') {
                const width = view.getUint16(26, true) & 0x3FFF;
                const height = view.getUint16(28, true) & 0x3FFF;
                return { width, height };
            }

            // VP8L (lossless)
            if (chunkHeader === 'VP8L') {
                const bits = view.getUint32(21, true);
                const width = (bits & 0x3FFF) + 1;
                const height = ((bits >> 14) & 0x3FFF) + 1;
                return { width, height };
            }

            // VP8X (extended)
            if (chunkHeader === 'VP8X') {
                const width = (view.getUint32(24, true) & 0xFFFFFF) + 1;
                const height = (view.getUint32(27, true) & 0xFFFFFF) + 1;
                return { width, height };
            }
        }
    }

    // AVIF: Part of ISO Base Media File Format (similar to MP4)
    // Signature: 00 00 00 XX 66 74 79 70 (ftyp box)
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        const brand = String.fromCharCode(...bytes.slice(8, 12));
        if (brand === 'avif' || brand === 'avis') {
            // AVIF dimensions are in the 'ispe' (image spatial extents) property
            // This requires parsing the entire box structure, which is complex
            // For now, we'll scan for the ispe box
            let offset = 0;
            while (offset < Math.min(bytes.length - 20, 10000)) { // Limit search to first 10KB
                if (bytes[offset] === 0x69 && bytes[offset + 1] === 0x73 &&
                    bytes[offset + 2] === 0x70 && bytes[offset + 3] === 0x65) {
                    // Found 'ispe' box, dimensions are at offset + 12 and + 16
                    const width = view.getUint32(offset + 12, false);
                    const height = view.getUint32(offset + 16, false);
                    return { width, height };
                }
                offset++;
            }
        }
    }

    return null; // Unknown format or could not extract dimensions
}

/**
 * Validate an image file's dimensions and size.
 * This function should be called on the server-side to prevent abuse.
 */
export async function validateImageDimensions(file: File): Promise<ImageValidationResult> {
    // Check file size first (quick check)
    if (file.size > MAX_IMAGE_SIZE) {
        return {
            isValid: false,
            fileSize: file.size,
            error: `Image file too large. Maximum size: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB, got ${(file.size / (1024 * 1024)).toFixed(2)}MB`
        };
    }

    // Extract dimensions
    const dimensions = await extractImageDimensions(file);

    if (!dimensions) {
        return {
            isValid: false,
            fileSize: file.size,
            error: 'Could not extract image dimensions. File may be corrupted or in an unsupported format.'
        };
    }

    const { width, height } = dimensions;

    // Validate dimensions
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        return {
            isValid: false,
            width,
            height,
            fileSize: file.size,
            error: `Image dimensions too large. Maximum: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels, got ${width}x${height} pixels`
        };
    }

    // All checks passed
    return {
        isValid: true,
        width,
        height,
        fileSize: file.size
    };
}

/**
 * Get a human-readable description of image validation limits.
 */
export function getImageLimitsDescription(): string {
    return `Maximum image size: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB, Maximum dimensions: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels`;
}
