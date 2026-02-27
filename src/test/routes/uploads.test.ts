// =========================================================================================================
// INTEGRATION TESTS — Upload Routes
// =========================================================================================================
// Tests for PUT /api/upload, POST /api/upload/init, PUT /api/upload/part,
// POST /api/upload/complete
// =========================================================================================================

import { SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici';
import { seedUser, makeAuthCookie } from '../fixtures/seed';

const BASE = 'http://example.com';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(() => {
	originalDispatcher = getGlobalDispatcher();
	mockAgent = new MockAgent();
	setGlobalDispatcher(mockAgent);
	mockAgent.disableNetConnect();
});

afterAll(() => {
	setGlobalDispatcher(originalDispatcher);
});

afterEach(() => {
	mockAgent.assertNoPendingInterceptors();
});

// Helper: Build a minimal but valid PNG file with a complete IHDR chunk.
// PNG structure: 8-byte signature + 4-byte IHDR length + 4-byte "IHDR" + 4-byte width +
//                4-byte height + 1-byte bit depth + ... (remaining IHDR data optional for test)
// The image-validator reads width from bytes 16-19 and height from 20-23 (big-endian).
function makePngFile(name = 'image.png'): File {
    const bytes = new Uint8Array([
        // PNG signature (8 bytes)
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        // IHDR chunk length = 13 (4 bytes)
        0x00, 0x00, 0x00, 0x0d,
        // IHDR chunk type = "IHDR" (4 bytes)
        0x49, 0x48, 0x44, 0x52,
        // Width = 1 (4 bytes big-endian) — bytes 16-19
        0x00, 0x00, 0x00, 0x01,
        // Height = 1 (4 bytes big-endian) — bytes 20-23
        0x00, 0x00, 0x00, 0x01,
        // Bit depth = 8 (1 byte)
        0x08,
    ]);
    return new File([bytes], name, { type: 'image/png' });
}


// Helper: Build a fake text file (invalid type)
function makeTextFile(name = 'document.txt'): File {
    const content = new TextEncoder().encode('Hello World');
    return new File([content], name, { type: 'text/plain' });
}

// ── PUT /api/upload ───────────────────────────────────────────────────────────
describe('PUT /api/upload', () => {
    it('returns 401 when not authenticated', async () => {
        const formData = new FormData();
        formData.append('file', makePngFile());

        const res = await SELF.fetch(`${BASE}/api/upload`, {
            method: 'PUT',
            body: formData,
        });
        expect(res.status).toBe(401);
    });

    it('returns 400 when no file is provided', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/upload`, {
            method: 'PUT',
            headers: { Cookie: cookie },
            body: new FormData(), // empty — no file
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid file type (text/plain)', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const formData = new FormData();
        formData.append('file', makeTextFile());

        const res = await SELF.fetch(`${BASE}/api/upload`, {
            method: 'PUT',
            headers: { Cookie: cookie },
            body: formData,
        });
        expect(res.status).toBe(400);
        const json = await res.json() as any;
        expect(json.error).toContain('Invalid file type');
    });

    it('accepts a valid PNG image and returns media_uuid', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const formData = new FormData();
        formData.append('file', makePngFile());

        const res = await SELF.fetch(`${BASE}/api/upload`, {
            method: 'PUT',
            headers: { Cookie: cookie },
            body: formData,
        });
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json).toHaveProperty('media_uuid');
        expect(json).toHaveProperty('r2_key');
        expect(json.media_type).toBe('image');
    });
});

// ── POST /api/upload/init ─────────────────────────────────────────────────────
describe('POST /api/upload/init', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/upload/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: 'big-file.zip', media_type: 'file' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 400 when filename is missing', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/upload/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ media_type: 'file' }), // no filename
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when media_type is missing', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/upload/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ filename: 'big-file.zip' }), // no media_type
        });
        expect(res.status).toBe(400);
    });

    it('returns uploadId and key for a valid multipart init', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/upload/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ filename: 'big-file.zip', media_type: 'file' }),
        });
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json).toHaveProperty('uploadId');
        expect(json).toHaveProperty('key');
    });
});

// ── PUT /api/upload/part ──────────────────────────────────────────────────────
describe('PUT /api/upload/part', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/upload/part`, {
            method: 'PUT',
            headers: {
                'X-Upload-ID': 'test-id',
                'X-Key': 'test-key',
                'X-Part-Number': '1',
            },
            body: new Uint8Array([1, 2, 3]),
        });
        expect(res.status).toBe(401);
    });

    it('returns 400 when required upload headers are missing', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/upload/part`, {
            method: 'PUT',
            headers: { Cookie: cookie }, // no X-Upload-ID etc.
            body: new Uint8Array([1, 2, 3]),
        });
        expect(res.status).toBe(400);
    });
});

// ── POST /api/upload/complete ─────────────────────────────────────────────────
describe('POST /api/upload/complete', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await SELF.fetch(`${BASE}/api/upload/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: 'key',
                uploadId: 'uid',
                parts: [],
                filename: 'test.zip',
                media_type: 'file',
            }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 400 when required fields are missing', async () => {
        await seedUser();
        const cookie = await makeAuthCookie('testuser', false);

        const res = await SELF.fetch(`${BASE}/api/upload/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({}), // empty
        });
        expect(res.status).toBe(400);
    });
});
