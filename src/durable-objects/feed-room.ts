// =========================================================================================================
// FEED ROOM (Durable Object)
// =========================================================================================================
// The transport layer for real-time feed events: one global instance holds every connected client's
// WebSocket and fans out events to all of them. It is to the feed what a repository is to the DB —
// isolated plumbing with no domain logic. It never decides what an event means or reads business data;
// it only accepts sockets, keeps them alive through hibernation, and broadcasts whatever the Worker
// hands it. D1 remains the single source of truth.
//
// Producers reach it over RPC (`broadcast`); clients reach it over a WebSocket upgrade (`fetch`).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { DurableObject } from 'cloudflare:workers';
import type { FeedEvent } from '../types';

// =========================================================================================================
// Durable Object
// =========================================================================================================

export class FeedRoom extends DurableObject<Env> {
	// -------------------------------------------------------------------------
	// Connection lifecycle
	// -------------------------------------------------------------------------

	/**
	 * Upgrades an incoming request to a hibernatable WebSocket. `acceptWebSocket` (not `server.accept()`)
	 * lets the runtime evict this object from memory while keeping the socket open, so a large idle
	 * audience costs nothing until the next event.
	 */
	override async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		this.ctx.acceptWebSocket(server);

		return new Response(null, { status: 101, webSocket: client });
	}

	/**
	 * Clients are receive-only listeners; they send nothing meaningful. Ignore inbound messages rather
	 * than trust them — the feed is a one-way fan-out from the server.
	 */
	override async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {
		// Intentionally ignored — the feed only pushes; it never acts on client messages.
	}

	/**
	 * Closes the server end when a client disconnects. Done explicitly because the current compatibility
	 * date predates `web_socket_auto_reply_to_close`; without this the half-closed socket would linger.
	 *
	 * The runtime reports the close `code` the client sent, which may be a reserved value that `close()`
	 * refuses to echo (1005 "no status", 1006 "abnormal" — the norm on a page reload or tab close). Only
	 * the application range (1000 and 3000–4999) is safe to forward; anything else closes without a code.
	 */
	override async webSocketClose(ws: WebSocket, code: number, _reason: string, _wasClean: boolean): Promise<void> {
		const canForward = code === 1000 || (code >= 3000 && code <= 4999);
		if (canForward) {
			ws.close(code, 'client disconnected');
		} else {
			ws.close();
		}
	}

	override async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
		// A failed socket is dropped by the runtime; nothing to recover, so nothing to do here.
	}

	// -------------------------------------------------------------------------
	// Broadcast
	// -------------------------------------------------------------------------

	/**
	 * Sends `event` to every connected client. Called over RPC by the Worker after a mutation persists.
	 * Sends to each socket independently so one dead connection cannot block the rest of the fan-out.
	 */
	broadcast(event: FeedEvent): void {
		const payload = JSON.stringify(event);
		for (const ws of this.ctx.getWebSockets()) {
			try {
				ws.send(payload);
			} catch {
				// Socket is gone mid-broadcast — skip it; the runtime cleans it up on close.
			}
		}
	}
}
