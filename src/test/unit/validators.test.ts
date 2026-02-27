// =========================================================================================================
// UNIT TESTS — Zod Validators
// =========================================================================================================
// Tests for all Zod schemas defined in src/validators.ts.
// These are pure unit tests — no Workers runtime needed.
// =========================================================================================================

import { describe, it, expect } from 'vitest';
import {
    RegisterSchema,
    LoginSchema,
    UserUpdateSchema,
    ResourceSchema,
    CommentSchema,
    AddFavoriteSchema,
    FavoriteOrderSchema,
    TwoFactorSetupSchema,
    TwoFactorVerifySchema,
    TwoFactorDisableSchema,
    TwoFactorLoginSchema,
} from '../../validators';

// ── RegisterSchema ───────────────────────────────────────────────────────────
describe('RegisterSchema', () => {
    it('accepts a valid username and password', () => {
        const result = RegisterSchema.parse({ username: 'Alice_99', password: 'password123' });
        expect(result.username).toBe('Alice_99');
    });

    it('rejects username shorter than 3 characters', () => {
        expect(() => RegisterSchema.parse({ username: 'ab', password: 'password123' })).toThrow();
    });

    it('rejects username longer than 32 characters', () => {
        expect(() =>
            RegisterSchema.parse({ username: 'a'.repeat(33), password: 'password123' }),
        ).toThrow();
    });

    it('rejects username with special characters', () => {
        expect(() => RegisterSchema.parse({ username: 'user name!', password: 'password123' })).toThrow();
    });

    it('rejects username with hyphens', () => {
        expect(() =>
            RegisterSchema.parse({ username: 'user-name', password: 'password123' }),
        ).toThrow();
    });

    it('rejects password shorter than 8 characters', () => {
        expect(() => RegisterSchema.parse({ username: 'validuser', password: 'short' })).toThrow();
    });

    it('rejects password longer than 100 characters', () => {
        expect(() =>
            RegisterSchema.parse({ username: 'validuser', password: 'x'.repeat(101) }),
        ).toThrow();
    });

    it('accepts an optional turnstile token', () => {
        const result = RegisterSchema.parse({
            username: 'validuser',
            password: 'password123',
            token: 'some-token',
        });
        expect(result.token).toBe('some-token');
    });
});

// ── LoginSchema ──────────────────────────────────────────────────────────────
describe('LoginSchema', () => {
    it('accepts username and password', () => {
        const result = LoginSchema.parse({ username: 'alice', password: 'password' });
        expect(result.username).toBe('alice');
    });

    it('accepts an optional token', () => {
        const result = LoginSchema.parse({ username: 'alice', password: 'password', token: 'tk' });
        expect(result.token).toBe('tk');
    });

    it('rejects missing username', () => {
        expect(() => LoginSchema.parse({ password: 'password' })).toThrow();
    });
});

// ── UserUpdateSchema ─────────────────────────────────────────────────────────
describe('UserUpdateSchema', () => {
    it('accepts all optional fields absent', () => {
        const result = UserUpdateSchema.parse({});
        expect(result.username).toBeUndefined();
    });

    it('accepts a valid new username', () => {
        const result = UserUpdateSchema.parse({ username: 'NewName123' });
        expect(result.username).toBe('NewName123');
    });

    it('rejects an invalid username format', () => {
        expect(() => UserUpdateSchema.parse({ username: 'bad user!' })).toThrow();
    });

    it('strips HTML from avatar_url', () => {
        const result = UserUpdateSchema.parse({ avatar_url: '<script>alert(1)</script>https://img.png' });
        expect(result.avatar_url).not.toContain('<script>');
        expect(result.avatar_url).toContain('https://img.png');
    });
});

// ── ResourceSchema ────────────────────────────────────────────────────────────
describe('ResourceSchema', () => {
    const validResource = {
        title: 'My Avatar',
        category: 'avatars',
        thumbnail_uuid: '123e4567-e89b-12d3-a456-426614174000',
    };

    it('accepts a valid resource', () => {
        const result = ResourceSchema.parse(validResource);
        expect(result.title).toBe('My Avatar');
        expect(result.category).toBe('avatars');
    });

    it('rejects title shorter than 3 characters', () => {
        expect(() => ResourceSchema.parse({ ...validResource, title: 'Hi' })).toThrow();
    });

    it('rejects title longer than 100 characters', () => {
        expect(() =>
            ResourceSchema.parse({ ...validResource, title: 'A'.repeat(101) }),
        ).toThrow();
    });

    it('rejects invalid category', () => {
        expect(() => ResourceSchema.parse({ ...validResource, category: 'games' })).toThrow();
    });

    it('accepts valid categories', () => {
        for (const cat of ['avatars', 'worlds', 'assets', 'clothes'] as const) {
            expect(() => ResourceSchema.parse({ ...validResource, category: cat })).not.toThrow();
        }
    });

    it('rejects invalid thumbnail UUID', () => {
        expect(() =>
            ResourceSchema.parse({ ...validResource, thumbnail_uuid: 'not-a-uuid' }),
        ).toThrow();
    });

    it('strips HTML from title', () => {
        const result = ResourceSchema.parse({ ...validResource, title: '<b>Cool</b> Avatar' });
        expect(result.title).toBe('Cool Avatar');
    });

    it('rejects description longer than 2000 characters', () => {
        expect(() =>
            ResourceSchema.parse({ ...validResource, description: 'x'.repeat(2001) }),
        ).toThrow();
    });
});

// ── CommentSchema ─────────────────────────────────────────────────────────────
describe('CommentSchema', () => {
    it('accepts valid text', () => {
        const result = CommentSchema.parse({ text: 'Nice avatar!' });
        expect(result.text).toBe('Nice avatar!');
    });

    it('rejects text shorter than 3 characters', () => {
        expect(() => CommentSchema.parse({ text: 'Hi' })).toThrow();
    });

    it('rejects text longer than 500 characters', () => {
        expect(() => CommentSchema.parse({ text: 'x'.repeat(501) })).toThrow();
    });

    it('strips HTML tags from comment text', () => {
        const result = CommentSchema.parse({ text: '<script>evil()</script>Clean comment' });
        expect(result.text).not.toContain('<script>');
        expect(result.text).toContain('Clean comment');
    });

    it('strips javascript: URIs', () => {
        const result = CommentSchema.parse({ text: 'click javascript:alert(1) here' });
        expect(result.text).not.toContain('javascript:');
    });

    it('strips inline event handlers', () => {
        const result = CommentSchema.parse({ text: 'link onclick=evil() text here extra' });
        expect(result.text).not.toContain('onclick=');
    });

    it('collapses excessive newlines to maximum 2', () => {
        const result = CommentSchema.parse({ text: 'line1\n\n\n\nline2' });
        expect(result.text).toBe('line1\n\nline2');
    });
});

// ── AddFavoriteSchema ─────────────────────────────────────────────────────────
describe('AddFavoriteSchema', () => {
    it('accepts a valid resource UUID', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const result = AddFavoriteSchema.parse({ resource_uuid: uuid });
        expect(result.resource_uuid).toBe(uuid);
    });

    it('rejects an invalid UUID', () => {
        expect(() => AddFavoriteSchema.parse({ resource_uuid: 'not-a-uuid' })).toThrow();
    });
});

// ── FavoriteOrderSchema ───────────────────────────────────────────────────────
describe('FavoriteOrderSchema', () => {
    it('defaults move_to_top to false when not provided', () => {
        const result = FavoriteOrderSchema.parse({
            resource_uuid: '123e4567-e89b-12d3-a456-426614174000',
        });
        expect(result.move_to_top).toBe(false);
    });

    it('accepts move_to_top: true', () => {
        const result = FavoriteOrderSchema.parse({
            resource_uuid: '123e4567-e89b-12d3-a456-426614174000',
            move_to_top: true,
        });
        expect(result.move_to_top).toBe(true);
    });
});

// ── TwoFactorVerifySchema ─────────────────────────────────────────────────────
describe('TwoFactorVerifySchema', () => {
    it('accepts exactly 6 numeric digits', () => {
        const result = TwoFactorVerifySchema.parse({ code: '123456' });
        expect(result.code).toBe('123456');
    });

    it('rejects fewer than 6 digits', () => {
        expect(() => TwoFactorVerifySchema.parse({ code: '12345' })).toThrow();
    });

    it('rejects more than 6 digits', () => {
        expect(() => TwoFactorVerifySchema.parse({ code: '1234567' })).toThrow();
    });

    it('rejects non-numeric characters', () => {
        expect(() => TwoFactorVerifySchema.parse({ code: 'abcdef' })).toThrow();
    });
});

// ── TwoFactorSetupSchema ──────────────────────────────────────────────────────
describe('TwoFactorSetupSchema', () => {
    it('requires a non-empty password', () => {
        expect(() => TwoFactorSetupSchema.parse({ password: '' })).toThrow();
    });

    it('accepts a valid password', () => {
        const result = TwoFactorSetupSchema.parse({ password: 'mypassword' });
        expect(result.password).toBe('mypassword');
    });
});

// ── TwoFactorDisableSchema ────────────────────────────────────────────────────
describe('TwoFactorDisableSchema', () => {
    it('requires password', () => {
        expect(() => TwoFactorDisableSchema.parse({ password: '' })).toThrow();
    });

    it('accepts password without code', () => {
        const result = TwoFactorDisableSchema.parse({ password: 'mypassword' });
        expect(result.password).toBe('mypassword');
    });
});

// ── TwoFactorLoginSchema ──────────────────────────────────────────────────────
describe('TwoFactorLoginSchema', () => {
    it('requires username and 6-digit code', () => {
        const result = TwoFactorLoginSchema.parse({ username: 'alice', code: '123456' });
        expect(result.username).toBe('alice');
    });

    it('rejects non-numeric code', () => {
        expect(() => TwoFactorLoginSchema.parse({ username: 'alice', code: 'abc123' })).toThrow();
    });
});
