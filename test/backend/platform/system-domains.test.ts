// =========================================================================================================
// SYSTEM DOMAIN INTEGRATION TESTS
// =========================================================================================================
// Cover public status endpoints, persisted preferences and feed reads.
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

describe('content updates', () => {
	it('returns empty update scopes and refuses plain HTTP feed connections', async () => {
		const updates = await exports.default.fetch('http://localhost:8787/api/updates');
		expect(updates.status).toBe(200);
		const body = await updates.json();
		expect(body).toBeDefined();
		expect((await exports.default.fetch('http://localhost:8787/api/feed/live')).status).toBe(426);
	});
});

describe('worker system routes', () => {
	it('returns trimmed public config and request/deployment version metadata', async () => {
		const config = await exports.default.fetch('http://localhost:8787/api/config');
		expect(config.status).toBe(200);
		expect(await config.json()).toEqual({ turnstileSiteKey: '' });
		const version = await exports.default.fetch('http://localhost:8787/api/version', {
			headers: { 'CF-Ray': 'ray-ABC123-FRA', 'CF-IPCountry': 'CL', 'CF-Request-Id': 'request-id' },
		});
		expect(version.status).toBe(200);
		expect(await version.json()).toMatchObject({
			worker: { compatibilityDate: '2026-02-12' },
			runtime: { name: 'Cloudflare Workers', engine: 'V8 isolate' },
			request: { rayId: 'ray-ABC123-FRA', requestId: 'request-id', country: 'CL', colo: 'ABC123' },
		});
	});
});

describe('browser notification preferences', () => {
	it('isolates defaults and persisted preferences per user', async () => {
		const owner = await createUser('owner');
		const other = await createUser('other');
		const url = 'http://localhost:8787/api/notifications/preferences';
		expect((await exports.default.fetch(url)).status).toBe(401);
		const initial = await exports.default.fetch(url, { headers: { Cookie: owner.cookie } });
		expect(initial.status).toBe(200);
		const preferences = { enabled: false, avatars_enabled: true, avatar_types: ['human'], assets_enabled: false, asset_types: null, clothes_enabled: true };
		const saved = await exports.default.fetch(url, { method: 'PUT', headers: { Cookie: owner.cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: JSON.stringify(preferences) });
		expect(saved.status).toBe(200);
		expect(await (await exports.default.fetch(url, { headers: { Cookie: owner.cookie } })).json()).toMatchObject(preferences);
		expect(await (await exports.default.fetch(url, { headers: { Cookie: other.cookie } })).json()).not.toMatchObject(preferences);
	});

	it('rejects invalid preference payloads', async () => {
		const { cookie } = await createUser();
		const response = await exports.default.fetch('http://localhost:8787/api/notifications/preferences', {
			method: 'PUT', headers: { Cookie: cookie, Origin: 'https://vrcstorage.lat', 'Content-Type': 'application/json' }, body: '{"enabled":"yes"}',
		});
		expect(response.status).toBe(400);
	});
});
