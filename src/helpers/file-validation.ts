// =========================================================================================================
// FILE VALIDATION HELPER
// =========================================================================================================
// This module contains file type validation logic using magic bytes (file signatures)
// to ensure uploaded files are of allowed types.
// =========================================================================================================

import { MediaType } from '../types';

export interface ValidFileType {
    isValidFile: boolean;
    mediaType: MediaType | 'unknown';
    mediaName: string | 'unknown';
    maxAllowedSize?: number;
    sizeError?: string;
}

/**
 * File type signatures (Magic Bytes)
 * 
 * Magic bytes are unique byte sequences at the beginning of files that identify their format.
 * These signatures are defined by file format specifications and are more reliable than file extensions.
 * 
 * References:
 * - Wikipedia: List of file signatures - https://en.wikipedia.org/wiki/List_of_file_signatures
 * - Gary Kessler's File Signatures Table - https://www.garykessler.net/library/file_sigs.html
 * - RFC specifications for various formats
 * 
 * Format: { signature: string, mediaType: string, name: string, customValidator?: function }
 */
export type FileSignature = {
    signature: string;
    mediaType: MediaType;
    name: string;
    customValidator?: (buffer: ArrayBuffer) => boolean;
};

export const FILE_SIGNATURES: FileSignature[] = [
    // Images
    { signature: '89504E47', mediaType: 'image', name: 'PNG' },
    { signature: 'FFD8FF', mediaType: 'image', name: 'JPEG' },
    { signature: '47494638', mediaType: 'image', name: 'GIF' },

    // WEBP requires additional validation (RIFF container check)
    {
        signature: '52494646',
        mediaType: 'image',
        name: 'WEBP',
        customValidator: (buffer: ArrayBuffer) => {
            const webpMarker = [...new Uint8Array(buffer).slice(8, 12)]
                .map(b => String.fromCharCode(b))
                .join('');
            return webpMarker === 'WEBP';
        }
    },

    // AVIF (offset check required)
    {
        signature: '0000001866747970',
        mediaType: 'image',
        name: 'AVIF',
        customValidator: (buffer: ArrayBuffer) => {
            const arr = new Uint8Array(buffer);
            const brand = [...arr.slice(8, 12)].map(b => String.fromCharCode(b)).join('');
            return brand === 'avif';
        }
    },

    // Videos
    { signature: '0000001866747970', mediaType: 'video', name: 'MP4' },
    { signature: '1A45DF', mediaType: 'video', name: 'WEBM' },

    // Archives / Unity Packages
    { signature: '504B0304', mediaType: 'file', name: 'ZIP' },
    { signature: '1F8B', mediaType: 'file', name: 'GZIP' },
    { signature: '377ABCAF271C', mediaType: 'file', name: '7Z' },
    { signature: '52617221', mediaType: 'file', name: 'RAR' },
] as const;

export async function isValidFileType(file: File): Promise<ValidFileType> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer).slice(0, 12); // Read 12 bytes to check for AVIF signature
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Check each signature
    for (const sig of FILE_SIGNATURES) {
        if (hex.startsWith(sig.signature)) {
            // If there's a custom validator, run it
            if (sig.customValidator && !sig.customValidator(buffer)) {
                continue;
            }

            // Get max allowed size for this media type
            const maxAllowedSize = SIZE_LIMITS[sig.mediaType];

            return {
                isValidFile: true,
                mediaType: sig.mediaType,
                mediaName: sig.name,
                maxAllowedSize
            };
        }
    }

    return { isValidFile: false, mediaType: 'unknown', mediaName: 'unknown' };
}

/**
 * Validate file size against the limits for its media type.
 * Returns validation result with detailed error messages.
 */
export function validateFileSize(size: number, mediaType: MediaType): {
    isValid: boolean;
    maxSize: number;
    error?: string;
} {
    const maxSize = SIZE_LIMITS[mediaType];

    if (size > maxSize) {
        const sizeMB = (size / (1024 * 1024)).toFixed(2);
        const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
        return {
            isValid: false,
            maxSize,
            error: `File too large for ${mediaType} type. Maximum: ${maxMB}MB, got ${sizeMB}MB`
        };
    }

    return { isValid: true, maxSize };
}

/**
 * Get human-readable size limits description.
 */
export function getSizeLimitsDescription(): string {
    return `Size limits: Images ${SIZE_LIMITS.image / (1024 * 1024)}MB, Videos ${SIZE_LIMITS.video / (1024 * 1024)}MB, Files ${SIZE_LIMITS.file / (1024 * 1024)}MB`;
}

// Size limits per media type (in bytes)
export const SIZE_LIMITS = {
    image: 20 * 1024 * 1024,    // 20MB for images
    video: 100 * 1024 * 1024,   // 100MB for videos
    file: 1500 * 1024 * 1024     // 1500MB for archives/packages
} as const;

// Legacy constant for backwards compatibility
export const MAX_FILE_SIZE = SIZE_LIMITS.file;
