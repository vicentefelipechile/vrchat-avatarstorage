// =========================================================================================================
// FEED ROUTES (v2)
// =========================================================================================================
// The WebSocket upgrade entry point for the real-time feed, mounted under /api/feed. The handler
// checks for the Upgrade header and forwards the raw request to the single global FeedRoom Durable
// Object, which performs the 101 handshake. All socket handling lives in the DO; this route is just
// the door.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const feed = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/feed/live
// Upgrades the connection to a WebSocket handled by the global FeedRoom. Non-WebSocket requests are
// rejected here so the DO only ever sees genuine upgrades.
// =========================================================================================================

feed.get('/live', (c) => {
	if (c.req.header('Upgrade') !== 'websocket') {
		return c.text('Expected WebSocket', 426);
	}

	const stub = c.env.FEED.getByName('feed');
	return stub.fetch(c.req.raw);
});

// =========================================================================================================
// Export
// =========================================================================================================

export default feed;
