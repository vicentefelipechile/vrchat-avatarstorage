// =========================================================================================================
// CHAT ROUTES
// =========================================================================================================
// The door to the global chat, mounted under /api/chat. Two endpoints, both deliberately thin:
//
//   GET  /live   — resolves the caller, then hands the upgrade to the global ChatRoom.
//   POST /purge  — empties the room. Admin only.
//
// This is where identity is decided. The room never asks who anyone is; it trusts the headers this
// route stamps on the upgrade, which is safe precisely because the route overwrites them every time.
//
// Purge is HTTP rather than a socket message on purpose: it is the only privileged operation in the
// feature, and routing it through the same channel as anonymous chatter would force the room to reason
// about roles. As a plain request it reuses `requireAdmin` and the room learns nothing new.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { Hono } from 'hono';
import { optionalAuth, requireAdmin, type AuthVariables } from '../middleware/auth';
import { resolveDisplayIdentity } from '../../helpers/anonymity';

// =========================================================================================================
// Endpoints
// =========================================================================================================

const chat = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// =========================================================================================================
// GET /api/chat/live
// Upgrades the connection to a WebSocket handled by the global ChatRoom. Reading is public, so this
// uses optionalAuth: an anonymous caller connects and receives everything, but arrives without an
// identity and so cannot send. Non-WebSocket requests are rejected here so the DO only ever sees
// genuine upgrades.
// =========================================================================================================

chat.get('/live', optionalAuth, (c) => {
	if (c.req.header('Upgrade') !== 'websocket') {
		return c.text('Expected WebSocket', 426);
	}

	// A browser WebSocket cannot set request headers, but it does send cookies on a same-origin
	// handshake — so the sealed session cookie resolves the user here exactly as on any other route,
	// with no token in the query string to leak into logs.
	const user = c.get('user') as AuthVariables['user'] | undefined;
	const identity = user ? resolveDisplayIdentity(user.uuid, user.username, null, user.is_anonymous ? 1 : 0) : null;

	// `set` (never `append`) means a forged X-Chat-* header from the client is overwritten, not merged.
	const headers = new Headers(c.req.raw.headers);
	headers.set('X-Chat-User-Uuid', user?.uuid ?? '');
	headers.set('X-Chat-Username', identity?.display_name ?? '');

	const stub = c.env.CHAT.getByName('global');
	return stub.fetch(new Request(c.req.raw, { headers }));
});

// =========================================================================================================
// POST /api/chat/purge
// Empties the chat for everyone. `requireAdmin` is the whole authorization story — no manual is_admin
// check. Errors from the DO propagate to app.onError rather than being swallowed: the room is the only
// copy of this data, so an admin must not be told a purge succeeded when it did not.
// =========================================================================================================

chat.post('/purge', requireAdmin, async (c) => {
	const stub = c.env.CHAT.getByName('global');
	await stub.purge();
	return c.json({ success: true });
});

// =========================================================================================================
// Export
// =========================================================================================================

export default chat;
