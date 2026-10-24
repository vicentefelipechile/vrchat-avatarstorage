// =========================================================================================================
// BACKEND ROUTE AUTHORIZATION TESTS
// =========================================================================================================
// Every write route below must refuse anonymous requests before parsing or mutating data.
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

describe('anonymous write protection', () => {
	it.each([
		['POST', '/api/avatars'],
		['POST', '/api/assets'],
		['POST', '/api/clothes'],
		['POST', '/api/resources'],
		['POST', '/api/comments/not-found'],
		['POST', '/api/wiki/comments'],
		['POST', '/api/favorites'],
		['POST', '/api/collections'],
		['POST', '/api/share'],
		['PUT', '/api/notifications/preferences'],
		['PUT', '/api/resources/not-found'],
		['DELETE', '/api/favorites/not-found'],
	] as const)('%s %s returns 401 before touching storage', async (method, path) => {
		const response = await exports.default.fetch(`http://localhost:8787${path}`, {
			method, headers: { Origin: 'https://vrcstorage.lat' },
		});
		expect(response.status).toBe(401);
	});
});

describe('admin-only writes', () => {
	it.each([
		['POST', '/api/blog'],
		['POST', '/api/admin/resource/not-found/approve'],
		['POST', '/api/admin/cleanup/orphaned-media'],
		['DELETE', '/api/resources/not-found'],
	] as const)('%s %s rejects a normal account', async (method, path) => {
		const { cookie } = await createUser();
		const response = await exports.default.fetch(`http://localhost:8787${path}`, {
			method, headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat' },
		});
		expect(response.status).toBe(403);
	});
});
