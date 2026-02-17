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
    const bytes = new Uint8Array(buffer).slice(0, 8); // Read 8 bytes for longer signatures
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Check each signature
    for (const sig of FILE_SIGNATURES) {
        if (hex.startsWith(sig.signature)) {
            // If there's a custom validator, run it
            if (sig.customValidator && !sig.customValidator(buffer)) {
                continue;
            }

            return { isValidFile: true, mediaType: sig.mediaType, mediaName: sig.name };
        }
    }

    return { isValidFile: false, mediaType: 'unknown', mediaName: 'unknown' };
}

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
