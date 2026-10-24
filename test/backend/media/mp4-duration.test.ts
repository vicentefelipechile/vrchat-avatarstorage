// =========================================================================================================
// MP4 DURATION UNIT TESTS
// =========================================================================================================
// Validate binary metadata parsing without mocks.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it } from 'vitest';

import { parseMp4DurationSeconds } from '../../../src/helpers/mp4-duration';

// =========================================================================================================
// Helpers
// =========================================================================================================

function box(type: string, payload: Uint8Array): Uint8Array {
	const bytes = new Uint8Array(payload.length + 8);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, bytes.length);
	bytes.set(new TextEncoder().encode(type), 4);
	bytes.set(payload, 8);
	return bytes;
}

function movieHeader(version: 0 | 1, timescale: number, duration: number): ArrayBuffer {
	const payload = new Uint8Array(version === 1 ? 32 : 20);
	const view = new DataView(payload.buffer);
	view.setUint8(0, version);
	view.setUint32(version === 1 ? 20 : 12, timescale);
	view.setUint32(version === 1 ? 28 : 16, duration);
	return box('moov', box('mvhd', payload)).buffer;
}

// =========================================================================================================
// Tests
// =========================================================================================================

describe('MP4 duration parser', () => {
	it.each([0, 1] as const)('reads mvhd version %s durations', (version) => {
		expect(parseMp4DurationSeconds(movieHeader(version, 1000, 12500))).toBe(12.5);
	});

	it('rejects zero timescales and incomplete or unrelated boxes', () => {
		expect(parseMp4DurationSeconds(movieHeader(0, 0, 12500))).toBeNull();
		expect(parseMp4DurationSeconds(new Uint8Array([0, 0, 0, 8, 0x66, 0x74, 0x79, 0x70]).buffer)).toBeNull();
		expect(parseMp4DurationSeconds(movieHeader(1, 1000, 12500).slice(0, 12))).toBeNull();
	});
});
