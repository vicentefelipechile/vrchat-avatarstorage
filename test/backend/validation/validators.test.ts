// =========================================================================================================
// BACKEND VALIDATION TESTS
// =========================================================================================================
// Ensure untrusted API input is validated and normalized at the boundary.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it } from 'vitest';

import { AvatarFilterSchema, ClothesMetaSchema, CommentSchema, CreateShareLinkSchema, LinkSchema, LoginSchema, RegisterSchema, ResourceSchema, SensitiveActionSchema, UserUpdateSchema } from '../../../src/validators';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('authentication boundaries', () => {
	it.each(['ab', 'name with spaces', '<script>', 'x'.repeat(33)])('rejects malformed usernames: %s', (username) => {
		expect(RegisterSchema.safeParse({ username, password: 'password123' }).success).toBe(false);
	});

	it('caps password size before the expensive comparison', () => {
		expect(LoginSchema.safeParse({ username: 'user', password: 'x'.repeat(201) }).success).toBe(false);
		expect(LoginSchema.safeParse({ username: 'user', password: 'x'.repeat(200) }).success).toBe(true);
	});

	it.each(['javascript:alert(1)', 'data:text/html,hi'])('rejects non-web avatar URLs: %s', (avatar_url) => {
		expect(UserUpdateSchema.safeParse({ avatar_url }).success).toBe(false);
	});
});

describe('resources and comments', () => {
	it('escapes HTML in titles and links, and rejects script URL schemes', () => {
		const thumbnail_uuid = crypto.randomUUID();
		const parsed = ResourceSchema.parse({ title: 'Fox <b>', category: 'avatars', thumbnail_uuid, links: [{ link_url: 'https://example.com/?x=1&y=2' }] });
		expect(parsed.title).toBe('Fox &lt;b&gt;');
		expect(parsed.links?.[0]?.link_url).toContain('&amp;');
		expect(LinkSchema.safeParse({ link_url: 'javascript:alert(1)' }).success).toBe(false);
	});

	it('trims and normalizes comments and rejects oversized content', () => {
		expect(CommentSchema.parse({ text: '  hello\n\n\n\nworld  ' }).text).toBe('hello\n\nworld');
		expect(CommentSchema.safeParse({ text: 'x'.repeat(501) }).success).toBe(false);
	});

	it('enforces 1..8 distinct clothing types', () => {
		const base = { gender_fit: 'unisex' };
		expect(ClothesMetaSchema.safeParse({ ...base, clothing_type: [] }).success).toBe(false);
		expect(ClothesMetaSchema.safeParse({ ...base, clothing_type: ['hat', 'hat'] }).success).toBe(false);
		expect(ClothesMetaSchema.safeParse({ ...base, clothing_type: ['hat', 'shoes'] }).success).toBe(true);
	});

	it('ignores invalid facets without accepting malformed pagination', () => {
		expect(AvatarFilterSchema.parse({ avatar_gender: 'unknown', page: '-3' })).toMatchObject({ page: 1 });
		expect(AvatarFilterSchema.parse({ avatar_gender: ['male', 'female'] }).avatar_gender).toEqual(['male', 'female']);
	});
});

describe('sensitive actions and share links', () => {
	it.each(['123456', 'abcdef1234567890'])('accepts a valid confirmation code: %s', (code) => {
		expect(SensitiveActionSchema.safeParse({ code }).success).toBe(true);
	});

	it.each(['12345', 'not-a-code', '1234567'])('rejects malformed confirmation codes: %s', (code) => {
		expect(SensitiveActionSchema.safeParse({ code }).success).toBe(false);
	});

	it('enforces fixed expiry and usage ladders', () => {
		expect(CreateShareLinkSchema.safeParse({ r2_key: 'key', expires_in: 300, max_uses: null }).success).toBe(true);
		expect(CreateShareLinkSchema.safeParse({ r2_key: 'key', expires_in: 301 }).success).toBe(false);
		expect(CreateShareLinkSchema.safeParse({ r2_key: 'key', expires_in: 300, max_uses: 2 }).success).toBe(false);
	});
});
