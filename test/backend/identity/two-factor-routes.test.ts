// =========================================================================================================
// TWO-FACTOR ROUTE INTEGRATION TESTS
// =========================================================================================================
// Require authentication and validate input before touching two-factor secrets.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('two-factor route boundaries', () => {
	it('requires login for status and reports disabled 2FA on an ordinary account', async () => {
		const url = 'http://localhost:8787/api/2fa/status';
		expect((await exports.default.fetch(url)).status).toBe(401);
		const { cookie } = await createUser();
		expect(await (await exports.default.fetch(url, { headers: { Cookie: cookie } })).json()).toEqual({ enabled: false });
	});

	it('rejects malformed setup and disable requests before touching secrets', async () => {
		const { cookie } = await createUser();
		for (const path of ['setup', 'verify', 'disable']) {
			const response = await exports.default.fetch(`http://localhost:8787/api/2fa/${path}`, {
				method: 'POST', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: '{}',
			});
			expect(response.status).toBe(400);
		}
	});
});
