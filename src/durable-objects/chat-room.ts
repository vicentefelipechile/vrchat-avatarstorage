// =========================================================================================================
// CHAT ROOM (Durable Object)
// =========================================================================================================
// The global chat: one instance holds every connected client's WebSocket, keeps the last
// CHAT_HISTORY_SIZE messages in its own SQLite, and fans out each accepted message to everyone.
//
// Unlike FeedRoom this room is bidirectional, so it does validate — but only the *shape* of what
// arrives. It never reads D1 and never decides who a user is: identity is resolved once by the route
// during the upgrade and pinned to the socket, so the room's whole job is transport plus persistence.
//
// Clients reach it over a WebSocket upgrade (`fetch`); an admin empties it over RPC (`purge`).
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { DurableObject } from 'cloudflare:workers';
import { CHAT_HISTORY_SIZE, type ChatMessage, type ChatServerMessage } from '../types';
import { ChatSendSchema } from '../validators';

// =========================================================================================================
// Types
// =========================================================================================================

/**
 * Per-connection state, pinned to the socket itself via `serializeAttachment` so it survives
 * hibernation. Nothing about a connection may live in an instance field — the object is evicted
 * from memory while its sockets stay open, and any in-memory map would come back empty.
 */
interface SocketState {
	/** The author's uuid, or null for an anonymous reader. A null here is what makes a socket read-only. */
	userUuid: string | null;
	username: string | null;
	/** Epoch ms of this socket's last accepted message. Backs the per-connection send cooldown. */
	lastSentAt: number;
}

/** A history row as stored in the room's SQLite. */
type MessageRow = {
	uuid: string;
	user_uuid: string;
	username: string;
	text: string;
	created_at: number;
};

// =========================================================================================================
// Configuration
// =========================================================================================================

/**
 * Minimum gap between two messages from the same socket. The native RL_* bindings cannot help here:
 * they are HTTP middleware, so they see the handshake once and never see anything sent afterwards
 * over the open socket. Throttling has to live where the messages actually arrive.
 */
const SEND_COOLDOWN_MS = 2_000;

// =========================================================================================================
// Durable Object
// =========================================================================================================

export class ChatRoom extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		// Schema setup only — the one legitimate use of blockConcurrencyWhile. It must not wrap request
		// handling or any I/O, which would serialize the whole room behind it.
		ctx.blockConcurrencyWhile(async () => {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS messages (
					uuid       TEXT PRIMARY KEY,
					user_uuid  TEXT NOT NULL,
					username   TEXT NOT NULL,
					text       TEXT NOT NULL,
					created_at INTEGER NOT NULL
				)
			`);
			this.ctx.storage.sql.exec(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at)`);
		});
	}

	// -------------------------------------------------------------------------
	// Connection lifecycle
	// -------------------------------------------------------------------------

	/**
	 * Upgrades an incoming request to a hibernatable WebSocket and sends the backlog so an opening
	 * panel shows a conversation instead of an empty box.
	 *
	 * The identity headers are set by the route on every request, overwriting anything the client
	 * sent, so their absence means anonymous rather than "trust the client".
	 */
	override async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		const userUuid = request.headers.get('X-Chat-User-Uuid') || null;
		const username = request.headers.get('X-Chat-Username') || null;

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		this.ctx.acceptWebSocket(server);

		const state: SocketState = { userUuid, username, lastSentAt: 0 };
		server.serializeAttachment(state);

		this.send(server, { type: 'history', messages: this.history() });

		return new Response(null, { status: 101, webSocket: client });
	}

	/**
	 * Handles a client send. Every rejection path answers the sender and returns without broadcasting,
	 * so a refused message reaches nobody else.
	 */
	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		const state = ws.deserializeAttachment() as SocketState | null;

		// No identity on the socket means an anonymous reader. Hiding the input is UX; this is the rule.
		if (!state?.userUuid || !state.username) {
			this.send(ws, { type: 'error', code: 'unauthenticated' });
			return;
		}

		// Binary frames are not part of the contract — this room carries text only.
		if (typeof message !== 'string') {
			this.send(ws, { type: 'error', code: 'invalid' });
			return;
		}

		let payload: unknown;
		try {
			payload = JSON.parse(message);
		} catch {
			this.send(ws, { type: 'error', code: 'invalid' });
			return;
		}

		const parsed = ChatSendSchema.safeParse(payload);
		if (!parsed.success) {
			// An over-long message is the one failure worth naming: it is the only one a user can hit by
			// typing rather than by tampering, and it tells them what to change.
			const tooLong = parsed.error.issues.some((issue) => issue.code === 'too_big');
			this.send(ws, { type: 'error', code: tooLong ? 'too_long' : 'invalid' });
			return;
		}

		const now = Date.now();
		if (now - state.lastSentAt < SEND_COOLDOWN_MS) {
			this.send(ws, { type: 'error', code: 'rate_limited' });
			return;
		}

		const chatMessage: ChatMessage = {
			uuid: crypto.randomUUID(),
			userUuid: state.userUuid,
			username: state.username,
			text: parsed.data.text,
			createdAt: now,
		};

		this.persist(chatMessage);

		// Stamped only after the message is accepted, so rejected sends never start a cooldown.
		ws.serializeAttachment({ ...state, lastSentAt: now } satisfies SocketState);

		this.broadcast({ type: 'message', message: chatMessage });
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
	// Moderation
	// -------------------------------------------------------------------------

	/**
	 * Empties the room and tells every connected client to clear its list. Called over RPC by the
	 * Worker, which has already established the caller is an admin — authorization is the route's job.
	 *
	 * This one is not best-effort. FeedRoom can swallow a failed broadcast because D1 already holds the
	 * truth and the poller reconciles; here the room *is* the truth and nothing reconciles it, so a
	 * failure propagates to the admin instead of reporting a purge that did not happen.
	 */
	purge(): void {
		this.ctx.storage.sql.exec(`DELETE FROM messages`);
		this.broadcast({ type: 'purged' });
	}

	// -------------------------------------------------------------------------
	// Storage
	// -------------------------------------------------------------------------

	/** Returns the backlog oldest-first, ready to render top-to-bottom. */
	private history(): ChatMessage[] {
		const rows = this.ctx.storage.sql
			.exec<MessageRow>(`SELECT uuid, user_uuid, username, text, created_at FROM messages ORDER BY created_at DESC LIMIT ?`, CHAT_HISTORY_SIZE)
			.toArray();

		return rows.reverse().map((row) => ({
			uuid: row.uuid,
			userUuid: row.user_uuid,
			username: row.username,
			text: row.text,
			createdAt: row.created_at,
		}));
	}

	/** Stores a message and drops whatever falls out of the newest CHAT_HISTORY_SIZE. */
	private persist(message: ChatMessage): void {
		// No await between the two statements: they run back-to-back in one turn, so no other request
		// can observe the room with the insert applied but the pruning not yet done.
		this.ctx.storage.sql.exec(
			`INSERT INTO messages (uuid, user_uuid, username, text, created_at) VALUES (?, ?, ?, ?, ?)`,
			message.uuid,
			message.userUuid,
			message.username,
			message.text,
			message.createdAt,
		);
		this.ctx.storage.sql.exec(
			`DELETE FROM messages WHERE uuid NOT IN (SELECT uuid FROM messages ORDER BY created_at DESC LIMIT ?)`,
			CHAT_HISTORY_SIZE,
		);
	}

	// -------------------------------------------------------------------------
	// Delivery
	// -------------------------------------------------------------------------

	/** Sends to one socket, tolerating a connection that died since it was handed to us. */
	private send(ws: WebSocket, message: ChatServerMessage): void {
		try {
			ws.send(JSON.stringify(message));
		} catch {
			// Socket is gone — the runtime cleans it up on close; there is nothing to report to.
		}
	}

	/** Sends to every connected client, independently so one dead socket cannot block the fan-out. */
	private broadcast(message: ChatServerMessage): void {
		const payload = JSON.stringify(message);
		for (const ws of this.ctx.getWebSockets()) {
			try {
				ws.send(payload);
			} catch {
				// Socket is gone mid-broadcast — skip it; the runtime cleans it up on close.
			}
		}
	}
}
