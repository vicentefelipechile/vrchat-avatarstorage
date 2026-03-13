// ============================================================================
// Tag Routes Tests
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { Tag } from './../../types';
import { request, getAnyTag } from '../helpers';

// Unique IP per suite to isolate rate limiter counters.
const TEST_IP = '10.0.0.5';

// ============================================================================
// Setup
// ============================================================================

let existingTagName: string;

beforeAll(async () => {
	const tag = await getAnyTag();
	existingTagName = tag.name;
});

// ============================================================================
// GET /api/tags
// ============================================================================

describe('GET /api/tags', () => {
	it('returns 200 with an array of tags (public)', async () => {
		const res = await request('GET', '/api/tags', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as Tag[];
		expect(Array.isArray(body)).toBe(true);
		expect(body.length).toBeGreaterThan(0);
	});

	it('each tag has id and name fields', async () => {
		const res = await request('GET', '/api/tags', undefined, undefined, TEST_IP);
		const body = await res.json() as Tag[];

		const tag = body[0];
		expect(typeof tag.id).toBe('number');
		expect(typeof tag.name).toBe('string');
	});

	it('filters by query param q to return only matching tags', async () => {
		const prefix = existingTagName.charAt(0);
		const res = await request('GET', `/api/tags?q=${prefix}`, undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as Tag[];
		expect(Array.isArray(body)).toBe(true);
		for (const tag of body) {
			expect(tag.name.toLowerCase()).toContain(prefix.toLowerCase());
		}
	});

	it('returns an empty array when no tags match the query', async () => {
		const res = await request('GET', '/api/tags?q=zzz_no_match_xyz', undefined, undefined, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as Tag[];
		expect(Array.isArray(body)).toBe(true);
		expect(body.length).toBe(0);
	});
});

// ============================================================================
// POST /api/tags
// ============================================================================

describe('POST /api/tags', () => {
	it('returns 400 when name is missing', async () => {
		const res = await request('POST', '/api/tags', undefined, {}, TEST_IP);
		expect(res.status).toBe(400);
	});

	it('returns 400 when name is not a string (number)', async () => {
		const res = await request('POST', '/api/tags', undefined, { name: 123 }, TEST_IP);
		expect(res.status).toBe(400);
	});

	it('creates a new tag and returns it with id and name', async () => {
		const newName = `test-tag-${Date.now()}`;
		const res = await request('POST', '/api/tags', undefined, { name: newName }, TEST_IP);
		expect(res.status).toBe(200);

		const body = await res.json() as Tag;
		expect(typeof body.id).toBe('number');
		expect(body.name).toBe(newName);
	});

	it('returns the existing tag (not a duplicate) when name already exists', async () => {
		const res1 = await request('POST', '/api/tags', undefined, { name: existingTagName }, TEST_IP);
		const res2 = await request('POST', '/api/tags', undefined, { name: existingTagName }, TEST_IP);

		expect(res1.status).toBe(200);
		expect(res2.status).toBe(200);

		const body1 = await res1.json() as Tag;
		const body2 = await res2.json() as Tag;
		expect(body1.id).toBe(body2.id);
		expect(body1.name).toBe(body2.name);
	});
});
