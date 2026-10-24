// =========================================================================================================
// LIVE FEED DURABLE OBJECT TESTS
// =========================================================================================================
// Verify the WebSocket gateway and one-way broadcast on the local Durable Object binding.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('FeedRoom', () => {
	it('refuses non-WebSocket requests', async () => {
		const response = await env.FEED.getByName('feed-test').fetch('https://example.com/feed');
		expect(response.status).toBe(426);
	});

	it('broadcasts an event to connected clients without trusting inbound messages', async () => {
		const stub = env.FEED.getByName('feed-test');
		const response = await stub.fetch('https://example.com/feed', { headers: { Upgrade: 'websocket' } });
		expect(response.status).toBe(101);
		const socket = response.webSocket;
		if (!socket) throw new Error('Expected a WebSocket');
		socket.accept();
		try {
			const message = new Promise<string>((resolve) => socket.addEventListener('message', (event) => resolve(event.data as string), { once: true }));
			const event = { scope: 'avatars' as const, action: 'created' as const, entityId: 'resource-1' };
			await stub.broadcast(event);
			expect(JSON.parse(await message)).toEqual(event);
		} finally {
			socket.close(1000, 'done');
		}
	});
});
