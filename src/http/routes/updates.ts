// =========================================================================================================
// UPDATES ROUTES (v2)
// =========================================================================================================
// Thin HTTP handler for the change-feed poller, mounted under /api/updates. The handler parses the
// optional `since` cursor, calls ChangeFeedService, and returns the server clock plus the newest
// change timestamp per scope. Cursor clamping and all SQL live in the service / repository.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { ChangeFeedService } from '../../services/change-feed-service';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const updates = new Hono<{ Bindings: Env }>();

// =========================================================================================================
// GET /api/updates?since=<ms>
// Returns the server clock and the newest change timestamp per scope since the cursor. A missing or
// non-numeric `since` is treated as no cursor and clamped by the service to a short lookback window.
// =========================================================================================================

updates.get('/', async (c) => {
	const raw = c.req.query('since');
	const since = raw !== undefined ? Number(raw) : undefined;
	const result = await new ChangeFeedService(c.env.DB).latest(since);
	return c.json(result);
});

// =========================================================================================================
// Export
// =========================================================================================================

export default updates;
