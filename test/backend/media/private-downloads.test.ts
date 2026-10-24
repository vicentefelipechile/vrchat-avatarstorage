// =========================================================================================================
// PRIVATE DOWNLOAD INTEGRATION TESTS
// =========================================================================================================
// Public media must never leak through private downloads.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createMedia, createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('private downloads', () => {
	it('rejects anonymous access and public images but streams a private attachment to a user', async () => {
		const { cookie } = await createUser();
		const file = await createMedia('file');
		const image = await createMedia('image');
		await env.BUCKET.put(file, 'archive body', { httpMetadata: { contentType: 'text/html' } });
		expect((await exports.default.fetch(`http://localhost:8787/api/download/${file}`)).status).toBe(401);
		expect((await exports.default.fetch(`http://localhost:8787/api/download/${image}`, { headers: { Cookie: cookie } })).status).toBe(404);
		const response = await exports.default.fetch(`http://localhost:8787/api/download/${file}`, { headers: { Cookie: cookie } });
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
		expect(response.headers.get('Cache-Control')).toBe('private, no-store');
		expect(new TextDecoder().decode(await response.arrayBuffer())).toBe('archive body');
	});
});
