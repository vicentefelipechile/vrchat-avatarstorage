// =========================================================================================================
// FEED CLIENT
// =========================================================================================================
// The live delivery path for real-time content updates. It holds one WebSocket to /api/feed/live for
// the whole session, routes each FeedRoom event through the shared reconciler (cache invalidation +
// toast + refresh event), and reconnects with backoff when the socket drops. While connected it
// suspends the polling fallback so a change is never delivered twice; on disconnect it resumes the
// poller, which catches anything missed during the gap.
//
// Events carry only a scope + entity id, never business data — reconciling re-fetches from the API,
// which stays the single source of truth.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { TimeUnit } from '../lib/utils';
import { reconcileScopes, type FeedScope } from './feed-scopes';
import { suspendPolling, resumePolling } from './updates';

// =========================================================================================================
// Types
// =========================================================================================================

interface FeedEvent {
	scope: FeedScope;
	action: 'created';
	entityId: string;
}

// =========================================================================================================
// Configuration
// =========================================================================================================

/** Backoff bounds for reconnection. Starts short and doubles up to the cap so a dead server is not hammered. */
const RECONNECT_MIN = TimeUnit.Second * 2;
const RECONNECT_MAX = TimeUnit.Second * 30;

/**
 * Window over which incoming events are batched into one reconcile pass. A burst of events across this
 * window produces a single coalesced toast rather than one per event — the mandatory anti-spam policy.
 */
const COALESCE_WINDOW = TimeUnit.Second * 1;

// =========================================================================================================
// State
// =========================================================================================================

let socket: WebSocket | undefined;
let reconnectDelay = RECONNECT_MIN;
let reconnectTimer: number | undefined;

/** Scopes accumulated within the current coalescing window, flushed together. */
let pending: FeedScope[] = [];
let flushTimer: number | undefined;

// =========================================================================================================
// Coalescing
// =========================================================================================================

/** Queues a scope and schedules a single reconcile pass at the end of the coalescing window. */
function enqueue(scope: FeedScope): void {
	pending.push(scope);
	if (flushTimer !== undefined) return;
	flushTimer = window.setTimeout(() => {
		flushTimer = undefined;
		const scopes = pending;
		pending = [];
		reconcileScopes(scopes);
	}, COALESCE_WINDOW);
}

// =========================================================================================================
// Connection
// =========================================================================================================

function scheduleReconnect(): void {
	if (reconnectTimer !== undefined) return;
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = undefined;
		connect();
	}, reconnectDelay);
	// Exponential backoff, capped, until a connection succeeds.
	reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
}

function connect(): void {
	// A hidden tab does not need a live socket; reconnect when it becomes visible again.
	if (document.hidden) return;

	const url = `${location.origin.replace(/^http/, 'ws')}/api/feed/live`;

	let ws: WebSocket;
	try {
		ws = new WebSocket(url);
	} catch {
		scheduleReconnect();
		return;
	}
	socket = ws;

	ws.addEventListener('open', () => {
		// Live path is up — reset backoff and stand the poller down to avoid double delivery.
		reconnectDelay = RECONNECT_MIN;
		suspendPolling();
	});

	ws.addEventListener('message', (e) => {
		let event: FeedEvent;
		try {
			event = JSON.parse(e.data as string) as FeedEvent;
		} catch {
			return;
		}
		enqueue(event.scope);
	});

	ws.addEventListener('close', () => {
		socket = undefined;
		// Live path is down — let the poller take over, then try to reconnect.
		resumePolling();
		scheduleReconnect();
	});

	ws.addEventListener('error', () => {
		// The close handler runs the recovery; error alone needs no separate action.
		ws.close();
	});
}

// =========================================================================================================
// Lifecycle
// =========================================================================================================

/**
 * Opens the live feed and keeps it in step with tab visibility: a hidden tab closes the socket (the
 * poller covers it on return), and a returning tab reconnects immediately. Call once at boot, after
 * the poller is initialised so the suspend/resume handover is wired.
 */
export function initFeedClient(): void {
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			socket?.close();
		} else if (socket === undefined) {
			reconnectDelay = RECONNECT_MIN;
			connect();
		}
	});

	connect();
}
