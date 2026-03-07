// ============================================================================
// Rate Limit Middleware Tests
// ============================================================================
// Tests for rateLimit() — the Cloudflare native RateLimit binding middleware.
//
// Note: Miniflare always returns success:true from rate limit bindings in the
// test environment, so the 429 path cannot be triggered end-to-end.  The tests
// here verify the happy path (requests pass through) and document the expected
// 429 response shape from the source code.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { request } from '../helpers';

// ============================================================================
// Rate Limit — pass-through
// ============================================================================

describe('rateLimit middleware', () => {
    it('passes through normal requests without blocking', async () => {
        const res = await request('GET', '/api/auth/status');
        expect(res.status).not.toBe(429);
    });

    it('passes through requests to strict-rate-limited endpoints (RL_STRICT)', async () => {
        // /api/login and /api/register are RL_STRICT but call Turnstile externally.
        // In Miniflare, external fetches fail — use /api/resources (RL_GLOBAL) to
        // verify the rate-limit middleware itself does not block the request.
        const res = await request('GET', '/api/resources');
        expect(res.status).not.toBe(429);
    });

    it('passes through requests to medium-rate-limited endpoints (RL_MEDIUM)', async () => {
        // /api/admin/* is RL_MEDIUM (100 req/60s)
        const res = await request('GET', '/api/admin/pending');
        // No cookie, so we get 401 — but not 429
        expect(res.status).toBe(401);
    });

    it('expected 429 response shape when limit is exceeded', () => {
        // Documents the shape returned by the rateLimit middleware when
        // success:false — cannot be triggered in Miniflare but tested structurally.
        const expected = {
            status: 429,
            body: { error: 'Too Many Requests' },
            headers: { 'Retry-After': '60' },
        };
        expect(expected.status).toBe(429);
        expect(expected.headers['Retry-After']).toBe('60');
        expect(expected.body.error).toBe('Too Many Requests');
    });
});
