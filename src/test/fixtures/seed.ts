// =========================================================================================================
// TEST FIXTURES — Seed helpers
// =========================================================================================================
// Utility functions to insert canonical test data into D1 and generate
// authenticated JWT cookies for integration tests.
//
// Usage:
//   import { seedUser, seedResource, makeAuthCookie } from '../fixtures/seed';
//   const user = await seedUser(env.DB);
//   const cookie = await makeAuthCookie('testuser', false);
// =========================================================================================================
// TEST FIXTURES — Seeding Data
// =========================================================================================================

import { env } from 'cloudflare:test';
import { hashSync } from 'bcryptjs';
import { sign } from 'hono/jwt';

// Constants for test references — Using valid v4 UUID format to pass Zod .uuid() validation
export const TEST_USER_UUID = '123e4567-e89b-12d3-a456-426614174001';
export const TEST_ADMIN_UUID = '123e4567-e89b-12d3-a456-426614174002';
export const TEST_MEDIA_UUID = '123e4567-e89b-12d3-a456-426614174010';
export const TEST_RESOURCE_UUID = '123e4567-e89b-12d3-a456-426614174020';

export const TEST_PASSWORD = 'password123';
const TEST_PASSWORD_HASH = hashSync(TEST_PASSWORD, 10);
const TEST_JWT_SECRET = 'vitest-test-secret-do-not-use-in-prod';

// ── seedUser ─────────────────────────────────────────────────────────────────
/**
 * Inserts a regular test user into D1.
 * @param username - defaults to 'testuser'
 * @returns the inserted user's uuid and username
 */
export async function seedUser(
    username = 'testuser',
    uuid = TEST_USER_UUID,
): Promise<{ uuid: string; username: string }> {
    await env.DB.prepare(
        'INSERT OR IGNORE INTO users (uuid, username, password_hash, avatar_url) VALUES (?, ?, ?, ?)',
    )
        .bind(uuid, username, TEST_PASSWORD_HASH, 'https://example.com/avatar.png')
        .run();

    return { uuid, username };
}

// ── seedAdmin ─────────────────────────────────────────────────────────────────
/**
 * Inserts an admin user into D1.
 */
export async function seedAdmin(
    username = 'adminuser',
    uuid = TEST_ADMIN_UUID,
): Promise<{ uuid: string; username: string }> {
    await env.DB.prepare(
        'INSERT OR IGNORE INTO users (uuid, username, password_hash, avatar_url, is_admin) VALUES (?, ?, ?, ?, 1)',
    )
        .bind(uuid, username, TEST_PASSWORD_HASH, 'https://example.com/avatar.png')
        .run();

    return { uuid, username };
}

// ── seedMedia ─────────────────────────────────────────────────────────────────
/**
 * Inserts a placeholder media record (needed as thumbnail FK before seeding a resource).
 */
export async function seedMedia(
    uuid = TEST_MEDIA_UUID,
    r2Key = 'test-r2-key',
): Promise<{ uuid: string; r2_key: string }> {
    await env.DB.prepare(
        'INSERT OR IGNORE INTO media (uuid, r2_key, media_type, file_name) VALUES (?, ?, ?, ?)',
    )
        .bind(uuid, r2Key, 'image', 'thumbnail.png')
        .run();

    return { uuid, r2_key: r2Key };
}

// ── seedResource ──────────────────────────────────────────────────────────────
/**
 * Inserts a test resource. Requires the author user and thumbnail media to exist first.
 * @param authorUuid - uuid of the author user (must already exist in DB)
 * @param isActive - whether the resource is approved/visible (default: 1)
 */
export async function seedResource(
    authorUuid = TEST_USER_UUID,
    thumbnailUuid = TEST_MEDIA_UUID,
    uuid = TEST_RESOURCE_UUID,
    isActive = 1,
): Promise<{ uuid: string }> {
    await env.DB.prepare(
        `INSERT OR IGNORE INTO resources
		 (uuid, title, description, category, thumbnail_uuid, author_uuid, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
        .bind(
            uuid,
            'Test Resource',
            'A test resource description',
            'avatars',
            thumbnailUuid,
            authorUuid,
            isActive,
        )
        .run();

    return { uuid };
}

// ── seedFavorite ──────────────────────────────────────────────────────────────
/**
 * Inserts a favorite relationship directly into D1, bypassing the API.
 * Use this in tests that need a favorite to exist without triggering rate limits
 * from multiple SELF.fetch() calls.
 */
export async function seedFavorite(
    userUuid = TEST_USER_UUID,
    resourceUuid = TEST_RESOURCE_UUID,
): Promise<void> {
    await env.DB.prepare(
        'INSERT OR IGNORE INTO user_favorites (user_uuid, resource_uuid, display_order) VALUES (?, ?, 0)',
    )
        .bind(userUuid, resourceUuid)
        .run();
}

/**
 * Creates a signed JWT cookie header string for authenticating requests.
 * Pass the result as a `Cookie` header in `SELF.fetch()` calls.
 *
 * @example
 *   const cookie = await makeAuthCookie('testuser');
 *   const res = await SELF.fetch('https://example.com/api/auth/status', {
 *     headers: { Cookie: cookie },
 *   });
 */
export async function makeAuthCookie(
    username: string,
    isAdmin = false,
): Promise<string> {
    const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
    const payload = {
        sub: username,
        role: isAdmin ? 'admin' : 'user',
        exp: Math.floor(Date.now() / 1000) + MAX_AGE,
    };

    const token = await sign(payload, TEST_JWT_SECRET, 'HS256');
    return `auth_token=${token}`;
}
