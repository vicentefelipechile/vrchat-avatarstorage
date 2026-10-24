// =========================================================================================================
// ADMIN AUTHORIZATION INTEGRATION TESTS
// =========================================================================================================
// The dashboard requires an administrator session.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env, exports } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('admin authorization', () => {
	it('rejects anonymous and ordinary-user admin dashboard access', async () => {
		const url = 'http://localhost:8787/api/admin/pending';
		expect((await exports.default.fetch(url)).status).toBe(401);
		const { cookie } = await createUser();
		expect((await exports.default.fetch(url, { headers: { Cookie: cookie } })).status).toBe(403);
	});

	it('allows an admin to inspect pending resources', async () => {
		const { uuid, cookie } = await createUser();
		await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE uuid = ?').bind(uuid).run();
		const result = await exports.default.fetch('http://localhost:8787/api/admin/pending', { headers: { Cookie: cookie } });
		expect(result.status).toBe(200);
	});
});
