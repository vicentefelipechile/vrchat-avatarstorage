// =========================================================================================================
// INTEGRATION TESTS — Tags Routes
// =========================================================================================================
// Tests for GET /api/tags
// =========================================================================================================

import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher } from 'undici';

const BASE = 'http://example.com';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(() => {
	originalDispatcher = getGlobalDispatcher();
	mockAgent = new MockAgent();
	setGlobalDispatcher(mockAgent);
	mockAgent.disableNetConnect();
});

afterAll(() => {
	setGlobalDispatcher(originalDispatcher);
});

afterEach(() => {
	mockAgent.assertNoPendingInterceptors();
});

// ── GET /api/tags ─────────────────────────────────────────────────────────────
describe('GET /api/tags', () => {
    it('returns an array (empty when no tags exist)', async () => {
        const res = await SELF.fetch(`${BASE}/api/tags`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(Array.isArray(json)).toBe(true);
    });

    it('returns existing tags', async () => {
        // Seed a tag directly in D1
        await env.DB.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?), (?)")
            .bind('vrc', 'avatar')
            .run();

        const res = await SELF.fetch(`${BASE}/api/tags`);
        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(Array.isArray(json)).toBe(true);

        const names = json.map((t: any) => t.name);
        expect(names).toContain('vrc');
        expect(names).toContain('avatar');
    });
});
