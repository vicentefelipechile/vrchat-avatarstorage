// ============================================================================
// Security Middleware Tests
// ============================================================================
// Tests for securityMiddleware — CORS and secure response headers.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { request } from '../helpers';
import worker from '../../index';

// ============================================================================
// Helper — dispatch with a custom Origin header
// ============================================================================

async function requestWithOrigin(origin: string): Promise<Response> {
    const ctx = createExecutionContext();
    const req = new Request('http://localhost/api/auth/status', {
        headers: { Origin: origin },
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    return res;
}

// ============================================================================
// CORS
// ============================================================================

describe('securityMiddleware — CORS', () => {
    it('responds to an OPTIONS preflight without erroring', async () => {
        const res = await request('OPTIONS', '/api/auth/status');
        expect([200, 204]).toContain(res.status);
    });

    it('includes Access-Control-Allow-Origin for an allowed origin', async () => {
        const res = await requestWithOrigin('https://vrcstorage.net');
        expect(res.headers.get('access-control-allow-origin')).toBe('https://vrcstorage.net');
    });

    it('includes Access-Control-Allow-Credentials: true', async () => {
        const res = await requestWithOrigin('https://vrcstorage.net');
        expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });
});

// ============================================================================
// Secure Headers (hono/secure-headers)
// ============================================================================

describe('securityMiddleware — Secure Headers', () => {
    it('sets X-Content-Type-Options: nosniff', async () => {
        const res = await request('GET', '/api/auth/status');
        expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });

    it('sets X-Frame-Options', async () => {
        const res = await request('GET', '/api/auth/status');
        expect(res.headers.get('x-frame-options')).toBeTruthy();
    });
});
