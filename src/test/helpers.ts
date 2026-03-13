// ============================================================================
// Test Helpers
// ============================================================================

import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { sign } from 'hono/jwt';
import { User, Resource, Comment, Tag } from '../types';
import worker from '../index';

// ============================================================================
// Auth
// ============================================================================

const JWT_SECRET = 'vitest-test-secret-do-not-use-in-prod';

/**
 * Signs a JWT the same way createSession() does in auth.ts and returns it
 * ready to use as a Cookie header value.
 */
export async function makeAuthCookie(username: string, isAdmin: boolean): Promise<string> {
    const token = await sign(
        {
            sub: username,
            role: isAdmin ? 'admin' : 'user',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        },
        JWT_SECRET,
        'HS256',
    );
    return `auth_token=${token}`;
}

// ============================================================================
// Worker fetch
// ============================================================================

/**
 * Dispatches a request to the test worker and returns the Response.
 *
 * @param spoofedIp - Optional value for the `CF-Connecting-IP` header. The
 *   rate limiter uses this header as the key, so passing a unique IP per test
 *   suite prevents cross-suite rate-limit interference. Defaults to '127.0.0.1'.
 */
export async function request(
    method: string,
    path: string,
    cookie?: string,
    body?: unknown,
    spoofedIp?: string,
): Promise<Response> {
    const ctx = createExecutionContext();
    const req = new Request(`http://localhost${path}`, {
        method,
        headers: {
            'CF-Connecting-IP': spoofedIp ?? '127.0.0.1',
            ...(cookie ? { Cookie: cookie } : {}),
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    return res;
}

// ============================================================================
// DB queries — Users
// ============================================================================

/** Returns the first admin user from the DB seeded by populate.ts */
export async function getAdminUser(): Promise<Pick<User, 'uuid' | 'username'>> {
    const user = await env.DB
        .prepare('SELECT uuid, username FROM users WHERE is_admin = 1 LIMIT 1')
        .first<Pick<User, 'uuid' | 'username'>>();
    if (!user) throw new Error('No admin users in DB — run `npm run seed` first');
    return user;
}

/** Returns the first non-admin user from the DB seeded by populate.ts */
export async function getNormalUser(): Promise<Pick<User, 'uuid' | 'username'>> {
    const user = await env.DB
        .prepare('SELECT uuid, username FROM users WHERE is_admin = 0 LIMIT 1')
        .first<Pick<User, 'uuid' | 'username'>>();
    if (!user) throw new Error('No regular users in DB — run `npm run seed` first');
    return user;
}

/**
 * Returns a normal user that is different from the one returned by getNormalUser().
 * Useful for tests that need two distinct non-admin users (e.g. comment ownership).
 */
export async function getAnotherNormalUser(): Promise<Pick<User, 'uuid' | 'username'>> {
    const first = await getNormalUser();
    const user = await env.DB
        .prepare('SELECT uuid, username FROM users WHERE is_admin = 0 AND uuid != ? LIMIT 1')
        .bind(first.uuid)
        .first<Pick<User, 'uuid' | 'username'>>();
    if (!user) throw new Error('Not enough regular users in DB — run `npm run seed` first');
    return user;
}

// ============================================================================
// DB queries — Resources
// ============================================================================

/** Returns the first inactive (pending approval) resource */
export async function getPendingResource(): Promise<Pick<Resource, 'uuid' | 'category'>> {
    const resource = await env.DB
        .prepare('SELECT uuid, category FROM resources WHERE is_active = 0 LIMIT 1')
        .first<Pick<Resource, 'uuid' | 'category'>>();
    if (!resource) throw new Error('No pending resources in DB — run `npm run seed` first');
    return resource;
}

/** Returns the first active resource */
export async function getActiveResource(): Promise<Pick<Resource, 'uuid' | 'category' | 'author_uuid'>> {
    const resource = await env.DB
        .prepare('SELECT uuid, category, author_uuid FROM resources WHERE is_active = 1 LIMIT 1')
        .first<Pick<Resource, 'uuid' | 'category' | 'author_uuid'>>();
    if (!resource) throw new Error('No active resources in DB — run `npm run seed` first');
    return resource;
}

/**
 * Returns an active resource owned by a given user UUID.
 * Useful for testing owner-only operations (e.g. editing your own resource).
 */
export async function getActiveResourceByOwner(
    authorUuid: string,
): Promise<Pick<Resource, 'uuid' | 'category'> | null> {
    return env.DB
        .prepare('SELECT uuid, category FROM resources WHERE is_active = 1 AND author_uuid = ? LIMIT 1')
        .bind(authorUuid)
        .first<Pick<Resource, 'uuid' | 'category'>>();
}

// ============================================================================
// DB queries — Comments
// ============================================================================

/**
 * Returns a comment on any resource, optionally filtered by author.
 * Useful for testing comment deletion and ownership rules.
 */
export async function getAnyComment(authorUuid?: string): Promise<Pick<Comment, 'uuid' | 'resource_uuid' | 'author_uuid'>> {
    const row = authorUuid
        ? await env.DB
            .prepare('SELECT uuid, resource_uuid, author_uuid FROM comments WHERE author_uuid = ? LIMIT 1')
            .bind(authorUuid)
            .first<Pick<Comment, 'uuid' | 'resource_uuid' | 'author_uuid'>>()
        : await env.DB
            .prepare('SELECT uuid, resource_uuid, author_uuid FROM comments LIMIT 1')
            .first<Pick<Comment, 'uuid' | 'resource_uuid' | 'author_uuid'>>();
    if (!row) throw new Error('No comments in DB — run `npm run seed` first');
    return row;
}

// ============================================================================
// DB queries — Wiki
// ============================================================================

/**
 * Returns a wiki comment, optionally filtered by author.
 * Useful for testing wiki comment deletion and ownership rules.
 */
export async function getAnyWikiComment(
    authorUuid?: string,
): Promise<{ uuid: string; author_uuid: string }> {
    const row = authorUuid
        ? await env.DB
            .prepare('SELECT uuid, author_uuid FROM wiki_comments WHERE author_uuid = ? LIMIT 1')
            .bind(authorUuid)
            .first<{ uuid: string; author_uuid: string }>()
        : await env.DB
            .prepare('SELECT uuid, author_uuid FROM wiki_comments LIMIT 1')
            .first<{ uuid: string; author_uuid: string }>();
    if (!row) throw new Error('No wiki comments in DB — run `npm run seed` first');
    return row;
}

// ============================================================================
// DB queries — Tags
// ============================================================================

/** Returns any tag from the DB */
export async function getAnyTag(): Promise<Tag> {
    const tag = await env.DB
        .prepare('SELECT id, name FROM tags LIMIT 1')
        .first<Tag>();
    if (!tag) throw new Error('No tags in DB — run `npm run seed` first');
    return tag;
}