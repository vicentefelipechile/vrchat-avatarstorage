// =========================================================================================================
// ANIMATED GIF ENCODER (from PNG frames)
// =========================================================================================================
// Cloudflare Media Transformations extracts still frames (PNG) but has no animated output, so a video's
// animated poster is assembled here in the Worker: decode each PNG frame to RGBA, quantize the whole set
// to one shared ≤256-colour palette, and write a GIF89a with a Netscape loop block. A single-frame set
// produces a valid still GIF (a 1-frame animation), so the "1 frame for short clips" case needs no special
// path.
//
// Scope is deliberately narrow: it decodes exactly the PNGs the MEDIA binding emits (8-bit depth,
// non-interlaced, colour type 2/RGB or 6/RGBA) using `node:zlib` inflate (nodejs_compat). It is not a
// general PNG/GIF library. PNG decode + quantization run in the upload queue (off the request path).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { inflateSync } from 'node:zlib';

// =========================================================================================================
// Types
// =========================================================================================================

interface RgbaImage {
	width: number;
	height: number;
	/** RGBA, 4 bytes/pixel, row-major. */
	data: Uint8Array;
}

// =========================================================================================================
// Public API
// =========================================================================================================

/**
 * Encode PNG frames into a single animated GIF (Uint8Array of the GIF file). `delayMs` is the per-frame
 * delay; a 1-frame input yields a still GIF. All frames must share dimensions (the MEDIA binding produces
 * them at one transform size); the first frame's dimensions define the canvas and later frames are clipped
 * to it. Throws if `frames` is empty or a frame isn't a supported PNG.
 */
export function encodeAnimatedGif(frames: ArrayBuffer[], delayMs: number): Uint8Array {
	if (frames.length === 0) throw new Error('encodeAnimatedGif: no frames');

	const images = frames.map(decodePng);
	const { width, height } = images[0];

	// One shared palette for the whole animation: gather pixels from every frame, median-cut to ≤256.
	const palette = buildPalette(images);
	const indexed = images.map((img) => mapToPalette(img, palette, width, height));

	return writeGif(width, height, palette, indexed, Math.max(2, Math.round(delayMs / 10)));
}

// =========================================================================================================
// PNG decode (8-bit, non-interlaced, colour type 2 or 6)
// =========================================================================================================

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function decodePng(buffer: ArrayBuffer): RgbaImage {
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < PNG_SIGNATURE.length; i++) {
		if (bytes[i] !== PNG_SIGNATURE[i]) throw new Error('gif-encoder: not a PNG frame');
	}

	const view = new DataView(buffer);
	let width = 0;
	let height = 0;
	let bitDepth = 0;
	let colorType = 0;
	const idatChunks: Uint8Array[] = [];

	// Walk chunks: length(4) + type(4) + data + crc(4).
	let p = 8;
	while (p + 8 <= bytes.length) {
		const len = view.getUint32(p);
		const type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
		const dataStart = p + 8;

		if (type === 'IHDR') {
			width = view.getUint32(dataStart);
			height = view.getUint32(dataStart + 4);
			bitDepth = bytes[dataStart + 8];
			colorType = bytes[dataStart + 9];
			const interlace = bytes[dataStart + 12];
			if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
				throw new Error(`gif-encoder: unsupported PNG (depth=${bitDepth} color=${colorType} interlace=${interlace})`);
			}
		} else if (type === 'IDAT') {
			idatChunks.push(bytes.subarray(dataStart, dataStart + len));
		} else if (type === 'IEND') {
			break;
		}

		p = dataStart + len + 4; // skip data + crc
	}

	if (!width || !height) throw new Error('gif-encoder: PNG missing IHDR');

	const raw = new Uint8Array(inflateSync(concat(idatChunks)));
	return unfilter(raw, width, height, colorType === 6 ? 4 : 3);
}

/** Reverse PNG scanline filters into a flat RGBA buffer. `channels` is 3 (RGB) or 4 (RGBA) in the source. */
function unfilter(raw: Uint8Array, width: number, height: number, channels: number): RgbaImage {
	const stride = width * channels;
	const out = new Uint8Array(width * height * 4);
	const line = new Uint8Array(stride); // current unfiltered scanline
	const prev = new Uint8Array(stride); // previous unfiltered scanline

	let src = 0;
	for (let y = 0; y < height; y++) {
		const filter = raw[src++];
		for (let x = 0; x < stride; x++) {
			const rawByte = raw[src++];
			const a = x >= channels ? line[x - channels] : 0; // left
			const b = prev[x]; // up
			const c = x >= channels ? prev[x - channels] : 0; // up-left
			let value: number;
			switch (filter) {
				case 0: value = rawByte; break;
				case 1: value = rawByte + a; break;
				case 2: value = rawByte + b; break;
				case 3: value = rawByte + ((a + b) >> 1); break;
				case 4: value = rawByte + paeth(a, b, c); break;
				default: throw new Error(`gif-encoder: bad PNG filter ${filter}`);
			}
			line[x] = value & 0xff;
		}

		// Expand this scanline into RGBA.
		let di = y * width * 4;
		for (let x = 0; x < width; x++) {
			const si = x * channels;
			out[di++] = line[si];
			out[di++] = line[si + 1];
			out[di++] = line[si + 2];
			out[di++] = channels === 4 ? line[si + 3] : 255;
		}
		prev.set(line);
	}

	return { width, height, data: out };
}

function paeth(a: number, b: number, c: number): number {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	if (pa <= pb && pa <= pc) return a;
	if (pb <= pc) return b;
	return c;
}

// =========================================================================================================
// Palette (median-cut over the whole frame set)
// =========================================================================================================

interface Rgb {
	r: number;
	g: number;
	b: number;
}

/** Build a shared ≤256-colour palette across all frames via median-cut on a sampled pixel set. */
function buildPalette(images: RgbaImage[]): Rgb[] {
	const samples: Rgb[] = [];
	// Sample every Nth pixel across frames to keep median-cut cheap on large posters.
	for (const img of images) {
		const step = Math.max(1, Math.floor(img.data.length / 4 / 20000)) * 4;
		for (let i = 0; i < img.data.length; i += step) {
			samples.push({ r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] });
		}
	}
	if (samples.length === 0) samples.push({ r: 0, g: 0, b: 0 });

	const boxes: Rgb[][] = [samples];
	while (boxes.length < 256) {
		// Split the box with the largest colour range on its widest channel.
		let target = -1;
		let bestRange = -1;
		for (let i = 0; i < boxes.length; i++) {
			if (boxes[i].length < 2) continue;
			const range = channelRange(boxes[i]);
			if (range.size > bestRange) {
				bestRange = range.size;
				target = i;
			}
		}
		if (target < 0) break;

		const box = boxes[target];
		const { channel } = channelRange(box);
		box.sort((a, b) => a[channel] - b[channel]);
		const mid = box.length >> 1;
		boxes.splice(target, 1, box.slice(0, mid), box.slice(mid));
	}

	return boxes.map(averageColor);
}

function channelRange(box: Rgb[]): { channel: keyof Rgb; size: number } {
	let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
	for (const c of box) {
		if (c.r < rMin) rMin = c.r;
		if (c.r > rMax) rMax = c.r;
		if (c.g < gMin) gMin = c.g;
		if (c.g > gMax) gMax = c.g;
		if (c.b < bMin) bMin = c.b;
		if (c.b > bMax) bMax = c.b;
	}
	const rr = rMax - rMin, gr = gMax - gMin, br = bMax - bMin;
	if (rr >= gr && rr >= br) return { channel: 'r', size: rr };
	if (gr >= br) return { channel: 'g', size: gr };
	return { channel: 'b', size: br };
}

function averageColor(box: Rgb[]): Rgb {
	if (box.length === 0) return { r: 0, g: 0, b: 0 };
	let r = 0, g = 0, b = 0;
	for (const c of box) {
		r += c.r;
		g += c.g;
		b += c.b;
	}
	return { r: Math.round(r / box.length), g: Math.round(g / box.length), b: Math.round(b / box.length) };
}

/** Map one frame's pixels to nearest palette index (linear scan — palette is ≤256). */
function mapToPalette(img: RgbaImage, palette: Rgb[], width: number, height: number): Uint8Array {
	const out = new Uint8Array(width * height);
	const rows = Math.min(height, img.height);
	const cols = Math.min(width, img.width);
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const si = (y * img.width + x) * 4;
			out[y * width + x] = nearest(palette, img.data[si], img.data[si + 1], img.data[si + 2]);
		}
	}
	return out;
}

function nearest(palette: Rgb[], r: number, g: number, b: number): number {
	let best = 0;
	let bestDist = Infinity;
	for (let i = 0; i < palette.length; i++) {
		const p = palette[i];
		const dr = p.r - r, dg = p.g - g, db = p.b - b;
		const dist = dr * dr + dg * dg + db * db;
		if (dist < bestDist) {
			bestDist = dist;
			best = i;
		}
	}
	return best;
}

// =========================================================================================================
// GIF89a writer (LZW-compressed, Netscape loop)
// =========================================================================================================

function writeGif(width: number, height: number, palette: Rgb[], frames: Uint8Array[], delayCs: number): Uint8Array {
	const out: number[] = [];
	const colorBits = Math.max(1, Math.ceil(Math.log2(Math.max(2, palette.length))));
	const tableSize = 1 << colorBits;

	// Header + Logical Screen Descriptor (global colour table, sized to the palette).
	pushStr(out, 'GIF89a');
	pushU16(out, width);
	pushU16(out, height);
	out.push(0x80 | ((colorBits - 1) << 4) | (colorBits - 1)); // GCT present, colour resolution, GCT size
	out.push(0); // background colour index
	out.push(0); // pixel aspect ratio

	// Global colour table, padded to tableSize entries.
	for (let i = 0; i < tableSize; i++) {
		const c = palette[i] ?? { r: 0, g: 0, b: 0 };
		out.push(c.r, c.g, c.b);
	}

	// Netscape 2.0 application extension → loop forever.
	out.push(0x21, 0xff, 0x0b);
	pushStr(out, 'NETSCAPE2.0');
	out.push(0x03, 0x01, 0x00, 0x00, 0x00);

	for (const frame of frames) {
		// Graphic Control Extension (per-frame delay).
		out.push(0x21, 0xf9, 0x04, 0x00);
		pushU16(out, delayCs);
		out.push(0x00, 0x00);

		// Image Descriptor.
		out.push(0x2c);
		pushU16(out, 0);
		pushU16(out, 0);
		pushU16(out, width);
		pushU16(out, height);
		out.push(0x00); // no local colour table

		lzwEncode(out, frame, colorBits);
	}

	out.push(0x3b); // trailer
	return Uint8Array.from(out);
}

/**
 * LZW-compress indexed pixels into GIF sub-blocks, appended to `out`. Standard GIF variable-width LZW:
 * the string table seeds with the single-pixel codes 0..2^minCodeSize-1, so a running code (not a string)
 * identifies each known sequence; a new (prefix, pixel) pair is added and the code width grows as the table
 * fills, resetting on a clear code when it reaches 4096 entries.
 */
function lzwEncode(out: number[], indices: Uint8Array, colorBits: number): void {
	const minCodeSize = Math.max(2, colorBits);
	out.push(minCodeSize);

	const clearCode = 1 << minCodeSize;
	const eoiCode = clearCode + 1;
	let codeSize = minCodeSize + 1;
	let nextCode = eoiCode + 1;
	// Maps "prefixCode,pixel" → assigned code. Prefix is always a known code, so no string of raw pixels.
	let dict = new Map<string, number>();

	// Bit-packing into a byte buffer, then chunked into ≤255-byte sub-blocks.
	const bytes: number[] = [];
	let bitBuffer = 0;
	let bitCount = 0;
	const emit = (code: number): void => {
		bitBuffer |= code << bitCount;
		bitCount += codeSize;
		while (bitCount >= 8) {
			bytes.push(bitBuffer & 0xff);
			bitBuffer >>= 8;
			bitCount -= 8;
		}
	};

	emit(clearCode);
	let prefix = indices[0]; // first pixel's own code
	for (let i = 1; i < indices.length; i++) {
		const pixel = indices[i];
		const key = prefix + ',' + pixel;
		const known = dict.get(key);
		if (known !== undefined) {
			prefix = known;
		} else {
			emit(prefix);
			dict.set(key, nextCode++);
			if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
			if (nextCode >= 4096) {
				emit(clearCode);
				dict = new Map();
				codeSize = minCodeSize + 1;
				nextCode = eoiCode + 1;
			}
			prefix = pixel;
		}
	}
	emit(prefix);
	emit(eoiCode);
	if (bitCount > 0) bytes.push(bitBuffer & 0xff);

	// Chunk into sub-blocks (max 255 bytes each), terminated by a zero-length block.
	for (let i = 0; i < bytes.length; i += 255) {
		const chunk = bytes.slice(i, i + 255);
		out.push(chunk.length, ...chunk);
	}
	out.push(0x00);
}

// =========================================================================================================
// Byte helpers
// =========================================================================================================

function pushStr(out: number[], s: string): void {
	for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
}

function pushU16(out: number[], n: number): void {
	out.push(n & 0xff, (n >> 8) & 0xff);
}

function concat(chunks: Uint8Array[]): Uint8Array {
	let total = 0;
	for (const c of chunks) total += c.length;
	const out = new Uint8Array(total);
	let off = 0;
	for (const c of chunks) {
		out.set(c, off);
		off += c.length;
	}
	return out;
}
