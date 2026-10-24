// =========================================================================================================
// API DOCUMENTATION GENERATOR TESTS
// =========================================================================================================
// The public guide must not advertise authenticated routes as public reads.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it } from 'vitest';

import { buildApiJson, buildLlmsFullTxt, buildLlmsTxt } from '../../../src/docs/generator';
import { buildManifest } from '../../../src/docs/registry';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('API documentation', () => {
	it('builds matching public and complete references from one manifest', () => {
		const manifest = buildManifest();
		const curated = buildLlmsTxt(manifest);
		const full = buildLlmsFullTxt(manifest);
		expect(buildApiJson(manifest)).toBe(manifest);
		expect(manifest.endpoints.length).toBeGreaterThan(0);
		expect(curated).toContain('https://vrcstorage.lat');
		expect(curated).not.toContain('POST /api/admin/resource/');
		expect(full).toContain('Admin only');
		expect(full).toContain('POST /api/admin/resource/');
	});

	it('provides a path, method, tag and visibility for every documented endpoint', () => {
		const endpoints = buildManifest().endpoints;
		for (const entry of endpoints) {
			expect(entry.path).toMatch(/^(\/|https:\/\/cdn\.vrcstorage\.lat\/)/);
			expect(entry.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/);
			expect(entry.tag).not.toBe('');
			expect(entry.visibility).toMatch(/^(public|private|internal)$/);
		}
	});
});
