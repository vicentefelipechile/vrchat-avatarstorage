// =========================================================================================================
// CHAT CLIENT
// =========================================================================================================
// The global chat panel: a collapsible dock in the bottom-right corner that talks to /api/chat/live
// over a WebSocket. Anyone can read it, including logged-out visitors; only authenticated users get a
// composer. Text only, capped at CHAT_MAX_LENGTH characters.
//
// Two things separate it from the feed client next door:
//
//   - It does not connect at boot. The socket opens the first time the panel is expanded and closes
//     when it collapses, so an audience that never opens the chat costs no connections.
//   - It does not toast incoming messages. The project's anti-spam rule allows one coalesced toast per
//     window, which an active conversation would violate on every line. Unread count on the bubble
//     instead; toasts are reserved for errors, which is real ephemeral feedback.
//
// The panel is mounted once on <body>, outside the router's container, so navigating the SPA never
// tears down the conversation.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { showToast, TimeUnit } from '../lib/utils';
import { showConfirm } from '../lib/confirm';
import { t } from '../core/i18n';

// =========================================================================================================
// Types
// =========================================================================================================

interface ChatMessage {
	uuid: string;
	userUuid: string;
	username: string;
	text: string;
	createdAt: number;
}

type ChatErrorCode = 'unauthenticated' | 'too_long' | 'rate_limited' | 'invalid';

type ChatServerMessage =
	| { type: 'history'; messages: ChatMessage[] }
	| { type: 'message'; message: ChatMessage }
	| { type: 'purged' }
	| { type: 'error'; code: ChatErrorCode };

// =========================================================================================================
// Configuration
// =========================================================================================================

/** Mirrors CHAT_MAX_LENGTH in src/types.ts. The server enforces it; this only stops the typing early. */
const MAX_LENGTH = 50;

/** Backoff bounds for reconnection. Starts short and doubles up to the cap so a dead server is not hammered. */
const RECONNECT_MIN = TimeUnit.Second * 2;
const RECONNECT_MAX = TimeUnit.Second * 30;

/** Remembers the panel across reloads, so a user who chats does not re-open it on every page. */
const OPEN_KEY = 'chat_open';

/** i18n leaf key explaining each rejection the server can send back. */
const ERROR_LABELS: Record<ChatErrorCode, string> = {
	unauthenticated: 'chat.loginToChat',
	too_long: 'chat.tooLong',
	rate_limited: 'chat.rateLimited',
	invalid: 'chat.invalid',
};

// =========================================================================================================
// State
// =========================================================================================================

let socket: WebSocket | undefined;
let reconnectDelay = RECONNECT_MIN;
let reconnectTimer: number | undefined;

let isOpen = false;
let unread = 0;

let panel: HTMLElement | undefined;
let listEl: HTMLElement | undefined;
let badgeEl: HTMLElement | undefined;
let inputEl: HTMLInputElement | undefined;

// =========================================================================================================
// Rendering
// =========================================================================================================

/** True when the list is already scrolled to the newest message, within a small tolerance. */
function isAtBottom(): boolean {
	if (!listEl) return true;
	return listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 40;
}

function scrollToBottom(): void {
	if (listEl) listEl.scrollTop = listEl.scrollHeight;
}

/**
 * Builds one message row. Text goes in via `textContent` — never innerHTML — so a message is inert
 * markup-wise no matter what the server sent. The backend sanitizes too; this is the second line.
 */
function renderMessage(message: ChatMessage): HTMLElement {
	const row = document.createElement('div');
	row.className = 'chat-message';

	const author = document.createElement('span');
	author.className = 'chat-message-author';
	author.textContent = message.username;
	if (message.userUuid === window.appState.user?.uuid) row.classList.add('chat-message-own');

	const text = document.createElement('span');
	text.className = 'chat-message-text';
	text.textContent = message.text;

	row.append(author, text);
	return row;
}

/** Replaces the list with the empty-state placeholder. */
function renderEmpty(): void {
	if (!listEl) return;
	listEl.replaceChildren();
	const empty = document.createElement('p');
	empty.className = 'chat-empty';
	empty.textContent = t('chat.empty');
	listEl.appendChild(empty);
}

function appendMessage(message: ChatMessage): void {
	if (!listEl) return;
	listEl.querySelector('.chat-empty')?.remove();

	// Decide before appending — adding the row changes scrollHeight and would always read as "not at bottom".
	const stick = isAtBottom();
	listEl.appendChild(renderMessage(message));
	if (stick) scrollToBottom();

	if (!isOpen) {
		unread += 1;
		updateBadge();
	}
}

function updateBadge(): void {
	if (!badgeEl) return;
	badgeEl.textContent = unread > 99 ? '99+' : String(unread);
	badgeEl.style.display = unread > 0 ? 'block' : 'none';
}

// =========================================================================================================
// Connection
// =========================================================================================================

function scheduleReconnect(): void {
	// A collapsed panel has no socket by design; do not resurrect one behind the user's back.
	if (!isOpen || reconnectTimer !== undefined) return;
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = undefined;
		connect();
	}, reconnectDelay);
	// Exponential backoff, capped, until a connection succeeds.
	reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
}

function handleMessage(event: ChatServerMessage): void {
	switch (event.type) {
		case 'history':
			if (!listEl) return;
			if (event.messages.length === 0) {
				renderEmpty();
				return;
			}
			listEl.replaceChildren(...event.messages.map(renderMessage));
			scrollToBottom();
			return;

		case 'message':
			appendMessage(event.message);
			return;

		case 'purged':
			renderEmpty();
			showToast(t('chat.purged'), 'info');
			return;

		case 'error':
			showToast(t(ERROR_LABELS[event.code]), 'error');
			return;
	}
}

function connect(): void {
	if (document.hidden || socket !== undefined) return;

	const url = `${location.origin.replace(/^http/, 'ws')}/api/chat/live`;

	let ws: WebSocket;
	try {
		ws = new WebSocket(url);
	} catch {
		scheduleReconnect();
		return;
	}
	socket = ws;

	ws.addEventListener('open', () => {
		reconnectDelay = RECONNECT_MIN;
		setComposerEnabled(true);
	});

	ws.addEventListener('message', (e) => {
		let event: ChatServerMessage;
		try {
			event = JSON.parse(e.data as string) as ChatServerMessage;
		} catch {
			return;
		}
		handleMessage(event);
	});

	ws.addEventListener('close', () => {
		socket = undefined;
		setComposerEnabled(false);
		scheduleReconnect();
	});

	ws.addEventListener('error', () => {
		// The close handler runs the recovery; error alone needs no separate action.
		ws.close();
	});
}

function disconnect(): void {
	if (reconnectTimer !== undefined) {
		clearTimeout(reconnectTimer);
		reconnectTimer = undefined;
	}
	socket?.close();
	socket = undefined;
}

// =========================================================================================================
// Composer
// =========================================================================================================

/** Greys out the composer while the socket is down so a user cannot type into the void. */
function setComposerEnabled(enabled: boolean): void {
	if (!inputEl || !window.appState.isLoggedIn) return;
	inputEl.disabled = !enabled;
	inputEl.placeholder = enabled ? t('chat.placeholder') : t('chat.disconnected');
}

function send(): void {
	if (!inputEl) return;
	const text = inputEl.value.trim();
	if (!text || socket?.readyState !== WebSocket.OPEN) return;

	// Only the text is sent. Identity and timestamp are the server's to assign — a client that supplied
	// them could impersonate anyone.
	socket.send(JSON.stringify({ type: 'send', text }));
	inputEl.value = '';
}

// =========================================================================================================
// Moderation
// =========================================================================================================

/**
 * Empties the room for everyone. `isAdmin` only decides whether the button is drawn — the server
 * re-checks and answers 403 to anyone who calls this without the role, so the gate below is UX.
 */
async function purge(): Promise<void> {
	const ok = await showConfirm({ message: t('chat.purgeConfirm'), confirmText: t('chat.purge'), danger: true });
	if (!ok) return;

	try {
		const res = await fetch('/api/chat/purge', { method: 'POST' });
		if (!res.ok) throw new Error();
		// The list clears when the room broadcasts `purged`, which arrives on our own socket too.
	} catch {
		showToast(t('chat.purgeFailed'), 'error');
	}
}

// =========================================================================================================
// Panel
// =========================================================================================================

function setOpen(open: boolean): void {
	isOpen = open;
	panel?.classList.toggle('chat-open', open);
	localStorage.setItem(OPEN_KEY, open ? '1' : '0');

	if (open) {
		unread = 0;
		updateBadge();
		connect();
		scrollToBottom();
	} else {
		disconnect();
	}
}

/** Builds the panel once and wires its controls. */
function build(): HTMLElement {
	const { isLoggedIn, isAdmin } = window.appState;

	const root = document.createElement('div');
	root.className = 'chat-panel';

	const composer = isLoggedIn
		? `<form class="chat-composer">
				<input class="chat-input" type="text" maxlength="${MAX_LENGTH}" autocomplete="off" />
				<button class="btn chat-send" type="submit"></button>
			</form>`
		: `<p class="chat-login-prompt"><a href="/login" data-link></a></p>`;

	root.innerHTML = `
		<button class="chat-toggle" type="button">
			<span class="chat-toggle-label"></span>
			<span class="chat-badge"></span>
		</button>
		<div class="chat-body">
			<div class="chat-messages"></div>
			${isAdmin ? `<button class="btn btn-danger chat-purge" type="button"></button>` : ''}
			${composer}
		</div>`;

	document.body.appendChild(root);

	root.querySelector<HTMLElement>('.chat-toggle-label')!.textContent = t('chat.title');
	root.querySelector<HTMLElement>('.chat-send')?.append(t('chat.send'));
	root.querySelector<HTMLElement>('.chat-purge')?.append(t('chat.purge'));
	root.querySelector<HTMLElement>('.chat-login-prompt a')?.append(t('chat.loginToChat'));

	root.querySelector<HTMLButtonElement>('.chat-toggle')!.addEventListener('click', () => setOpen(!isOpen));
	root.querySelector<HTMLButtonElement>('.chat-purge')?.addEventListener('click', () => void purge());
	root.querySelector<HTMLFormElement>('.chat-composer')?.addEventListener('submit', (e) => {
		e.preventDefault();
		send();
	});

	return root;
}

// =========================================================================================================
// Lifecycle
// =========================================================================================================

/**
 * Mounts the chat panel and restores its last open/closed state. Call once at boot. A hidden tab drops
 * the socket and a returning one restores it, but only while the panel is open.
 */
export function initChat(): void {
	panel = build();
	listEl = panel.querySelector<HTMLElement>('.chat-messages')!;
	badgeEl = panel.querySelector<HTMLElement>('.chat-badge')!;
	inputEl = panel.querySelector<HTMLInputElement>('.chat-input') ?? undefined;

	renderEmpty();
	updateBadge();
	setComposerEnabled(false);

	document.addEventListener('visibilitychange', () => {
		if (!isOpen) return;
		if (document.hidden) {
			disconnect();
		} else {
			reconnectDelay = RECONNECT_MIN;
			connect();
		}
	});

	setOpen(localStorage.getItem(OPEN_KEY) === '1');
}
