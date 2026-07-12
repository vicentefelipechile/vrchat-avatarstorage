// =========================================================================================================
// MP4 DURATION HELPER
// =========================================================================================================
// Reads a video's duration (seconds) from the `mvhd` box of an ISO-BMFF / MP4 container, without
// decoding the stream. The Media Transformations binding never reports duration, so the video pipeline
// parses it here from the normalized MP4 to decide how many poster frames to sample.
//
// Only the `moov` → `mvhd` header is needed, so callers pass a small prefix of the file (a ranged R2
// GET), not the whole video. `moov` normally sits near the start of a web-optimized (faststart) MP4; if
// it trails at the end and isn't in the prefix, this returns null and the caller falls back to a default
// frame count.
// =========================================================================================================

// =========================================================================================================
// Constants
// =========================================================================================================

/** How many leading bytes to fetch when probing for `mvhd`. `moov`/`mvhd` fit well within this for a
 *  faststart MP4; enough slack to clear a leading `ftyp` and any small boxes before `moov`. */
export const MP4_HEADER_PROBE_BYTES = 64 * 1024;

// =========================================================================================================
// Parser
// =========================================================================================================

/**
 * Parse the media duration (in seconds) from an MP4 header buffer, or null if the `mvhd` box isn't within
 * the buffer or the bytes aren't a recognizable MP4. Walks top-level boxes to find `moov`, then scans its
 * child boxes for `mvhd`, reading `timescale` and `duration` (32-bit for mvhd version 0, 64-bit for
 * version 1). A zero timescale is treated as unparseable.
 */
export function parseMp4DurationSeconds(buffer: ArrayBuffer): number | null {
	const view = new DataView(buffer);
	const moov = findBox(view, 0, view.byteLength, 'moov');
	if (!moov) return null;

	const mvhd = findBox(view, moov.contentStart, moov.end, 'mvhd');
	if (!mvhd) return null;

	// mvhd payload: version(1) + flags(3), then creation/modification time, timescale, duration. The
	// field widths depend on version: v0 uses 32-bit times + 32-bit duration, v1 uses 64-bit.
	let p = mvhd.contentStart;
	if (p + 4 > mvhd.end) return null;
	const version = view.getUint8(p);
	p += 4; // version + flags

	let timescale: number;
	let duration: number;
	if (version === 1) {
		if (p + 28 > mvhd.end) return null;
		p += 16; // creation_time(8) + modification_time(8)
		timescale = view.getUint32(p);
		p += 4;
		duration = readUint64(view, p);
	} else {
		if (p + 16 > mvhd.end) return null;
		p += 8; // creation_time(4) + modification_time(4)
		timescale = view.getUint32(p);
		p += 4;
		duration = view.getUint32(p);
	}

	if (!timescale || duration <= 0) return null;
	return duration / timescale;
}

// =========================================================================================================
// Helpers
// =========================================================================================================

interface Box {
	/** Offset of the first byte of the box's payload (after size + type, and after the 8-byte largesize). */
	contentStart: number;
	/** Offset one past the last byte of the box. */
	end: number;
}

/**
 * Find the first child box of the given 4-char type within [start, limit), or null. Each box is
 * `size(4) + type(4) + payload`; a size of 1 means a 64-bit largesize follows the type, and a size of 0
 * means the box runs to `limit`. Bounds are clamped so a truncated prefix never reads past the buffer.
 */
function findBox(view: DataView, start: number, limit: number, type: string): Box | null {
	let p = start;
	while (p + 8 <= limit) {
		let size = view.getUint32(p);
		const boxType = readType(view, p + 4);
		let headerSize = 8;

		if (size === 1) {
			if (p + 16 > limit) break;
			size = readUint64(view, p + 8);
			headerSize = 16;
		} else if (size === 0) {
			size = limit - p;
		}

		if (size < headerSize) break; // malformed
		const end = Math.min(p + size, limit);

		if (boxType === type) return { contentStart: p + headerSize, end };
		p += size;
	}
	return null;
}

/** Read a 4-byte ASCII box type at offset. */
function readType(view: DataView, offset: number): string {
	return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
}

/** Read a 64-bit big-endian unsigned int as a JS number (durations here are well within 2^53). */
function readUint64(view: DataView, offset: number): number {
	const hi = view.getUint32(offset);
	const lo = view.getUint32(offset + 4);
	return hi * 2 ** 32 + lo;
}
