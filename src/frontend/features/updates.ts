// =========================================================================================================
// UPDATES POLLER
// =========================================================================================================
// The fallback delivery path for real-time content updates. It polls GET /api/updates for changes
// other users made, advances a persisted cursor, and hands the changed scopes to the shared reconciler
// (cache invalidation + toast + refresh event). The live WebSocket client (feed.ts) is the primary
// path and suspends this poller while its socket is open; the poller runs whenever the socket is down.
//
// The API is the single source of truth: an update carries only a scope + timestamp, never data, so
// reconciling forces the next read to re-fetch fresh rows rather than trusting a pushed copy.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { TimeUnit } from '../lib/utils';
import { reconcileScopes, type FeedScope } from './feed-scopes';

// =========================================================================================================
// Types
// =========================================================================================================

interface ScopeChange {
	scope: FeedScope;
	updated_at: number;
}

interface UpdatesResult {
	now: number;
	changes: ScopeChange[];
}

// =========================================================================================================
// Configuration
// =========================================================================================================

/** How often the poller checks for changes while it is active and the tab is visible. */
const POLL_INTERVAL = TimeUnit.Second * 45;

/** localStorage key holding the last change timestamp (ms) the client has already reconciled. */
const CURSOR_KEY = 'updates:cursor';

// =========================================================================================================
// Cursor
// =========================================================================================================

/** The stored cursor, or `undefined` when the client has never polled. */
function readCursor(): number | undefined {
	const raw = localStorage.getItem(CURSOR_KEY);
	if (raw === null) return undefined;
	const n = Number(raw);
	return Number.isFinite(n) ? n : undefined;
}

function writeCursor(ms: number): void {
	localStorage.setItem(CURSOR_KEY, String(ms));
}

// =========================================================================================================
// Poll cycle
// =========================================================================================================

/**
 * Runs one poll. Reconciles any reported changes and advances the cursor to the server clock. A first
 * poll (no prior cursor) only seeds the cursor and stays silent, so the existing backlog is not
 * announced as if it just happened.
 */
async function pollOnce(): Promise<void> {
	const cursor = readCursor();
	const isFirstPoll = cursor === undefined;

	const url = cursor === undefined ? '/api/updates' : `/api/updates?since=${cursor}`;

	let result: UpdatesResult;
	try {
		const res = await fetch(url);
		if (!res.ok) return;
		result = (await res.json()) as UpdatesResult;
	} catch {
		// Network hiccup — keep the cursor untouched and try again next interval.
		return;
	}

	writeCursor(result.now);

	if (isFirstPoll) return;
	reconcileScopes(result.changes.map((c) => c.scope));
}

// =========================================================================================================
// Lifecycle
// =========================================================================================================

let timer: number | undefined;
let suspended = false;

function stop(): void {
	if (timer !== undefined) {
		clearInterval(timer);
		timer = undefined;
	}
}

function start(): void {
	if (timer !== undefined || suspended || document.hidden) return;
	timer = window.setInterval(() => void pollOnce(), POLL_INTERVAL);
}

/**
 * Suspends polling while the live socket carries updates, so a change is never delivered twice. The
 * cursor keeps advancing on the poll that runs the moment the poller resumes, so no change is missed
 * across the handover.
 */
export function suspendPolling(): void {
	suspended = true;
	stop();
}

/** Resumes polling when the live socket drops. Polls immediately to catch anything missed while down. */
export function resumePolling(): void {
	suspended = false;
	void pollOnce();
	start();
}

/**
 * Starts the poller and keeps it in step with tab visibility: a hidden tab stops polling so it does no
 * background work, and a returning tab polls immediately before resuming its interval so the user sees
 * a current view the moment they come back. A poll always runs once at boot to seed the cursor even
 * when the live client immediately suspends it.
 */
export function initUpdatesPoller(): void {
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			stop();
		} else if (!suspended) {
			void pollOnce();
			start();
		}
	});

	void pollOnce();
	start();
}
