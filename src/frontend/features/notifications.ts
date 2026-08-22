// =========================================================================================================
// NOTIFICATIONS FEATURE
// =========================================================================================================
// Browser Notification integration for newly approved resources. The live feed (feed.ts) is the
// delivery path — an approved resource is broadcast as an enriched FeedEvent with title/category/
// subType (avatar_type / asset_type). This module decides whether the event matches the user's
// stored preferences and, if the browser permission is granted, shows a native Notification.
//
// Preferences are persisted in D1 (user_notification_prefs) and fetched once at boot for logged-in
// users. The Settings UI owns writing them; this module only reads and filters.
//
// Requires a secure context (HTTPS) and an explicit Notification permission grant. If denied or
// unsupported, the feature silently does nothing — the in-app toast via reconcileScopes still runs.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { t } from '../core/i18n';
import { navigateTo } from '../core/router';
import { htmlDecode } from '../lib/dom';
import { mediaUrl } from '../lib/utils';

// =========================================================================================================
// Types
// =========================================================================================================

export interface NotificationPrefsDTO {
	enabled: boolean;
	avatars_enabled: boolean;
	avatar_types: string[] | null;
	assets_enabled: boolean;
	asset_types: string[] | null;
	clothes_enabled: boolean;
	updated_at: number | null;
}

export interface FeedEvent {
	scope: 'avatars' | 'assets' | 'clothes' | 'blog' | 'comments';
	action: 'created';
	entityId: string;
	title?: string;
	category?: string;
	subType?: string;
	thumbnailUuid?: string;
	isNsfw?: boolean;
}

// =========================================================================================================
// State
// =========================================================================================================

let cachedPrefs: NotificationPrefsDTO | null = null;
let prefsLoaded = false;

// =========================================================================================================
// Permission helpers
// =========================================================================================================

export function isNotificationSupported(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
	if (!isNotificationSupported()) return 'unsupported';
	return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
	if (!isNotificationSupported()) return 'unsupported';
	if (Notification.permission === 'granted') return 'granted';
	try {
		return await Notification.requestPermission();
	} catch {
		return Notification.permission;
	}
}

// =========================================================================================================
// Prefs cache
// =========================================================================================================

export function getCachedPrefs(): NotificationPrefsDTO | null {
	return cachedPrefs;
}

export function setCachedPrefs(prefs: NotificationPrefsDTO | null): void {
	cachedPrefs = prefs;
	prefsLoaded = true;
}

export async function fetchNotificationPrefs(): Promise<NotificationPrefsDTO | null> {
	if (!window.appState.isLoggedIn) return null;
	try {
		const res = await fetch('/api/notifications/preferences');
		if (!res.ok) return null;
		const data = (await res.json()) as NotificationPrefsDTO;
		cachedPrefs = data;
		prefsLoaded = true;
		return data;
	} catch {
		return null;
	}
}

export async function ensurePrefsLoaded(): Promise<NotificationPrefsDTO | null> {
	if (prefsLoaded) return cachedPrefs;
	return fetchNotificationPrefs();
}

// =========================================================================================================
// Filtering
// =========================================================================================================

export function shouldNotifyForEvent(event: FeedEvent, prefs: NotificationPrefsDTO | null): boolean {
	if (!prefs || !prefs.enabled) return false;
	if (!event.scope || event.action !== 'created') return false;
	// Only resource scopes carry notifications; blog/comments are ignored.
	if (event.scope === 'blog' || event.scope === 'comments') return false;

	if (event.scope === 'avatars') {
		if (!prefs.avatars_enabled) return false;
		if (prefs.avatar_types && prefs.avatar_types.length > 0) {
			if (!event.subType) return false;
			if (!prefs.avatar_types.includes(event.subType)) return false;
		}
		return true;
	}
	if (event.scope === 'assets') {
		if (!prefs.assets_enabled) return false;
		if (prefs.asset_types && prefs.asset_types.length > 0) {
			if (!event.subType) return false;
			if (!prefs.asset_types.includes(event.subType)) return false;
		}
		return true;
	}
	if (event.scope === 'clothes') {
		if (!prefs.clothes_enabled) return false;
		return true;
	}
	return false;
}

// =========================================================================================================
// Display
// =========================================================================================================

function buildNotificationBody(event: FeedEvent): string {
	const scopeLabel =
		event.scope === 'avatars' ? t('notifications.scope_avatars') :
		event.scope === 'assets' ? t('notifications.scope_assets') :
		event.scope === 'clothes' ? t('notifications.scope_clothes') : event.scope;
	const rawTitle = event.title?.trim() || t('notifications.untitled');
	// Titles are stored via sanitizeHtml (e.g. " → &quot;), so decode before showing
	// as plain-text Notification body. Loop to handle legacy double-encoded rows.
	let title = rawTitle;
	if (title.includes('&')) {
		let prev = title;
		for (let i = 0; i < 3; i++) {
			title = htmlDecode(title);
			if (title === prev) break;
			prev = title;
			if (!title.includes('&')) break;
		}
	}
	const sub = event.subType ? ` · ${event.subType}` : '';
	return `${scopeLabel}${sub}: ${title}`;
}

export function tryShowBrowserNotification(event: FeedEvent): boolean {
	if (!isNotificationSupported()) return false;
	if (Notification.permission !== 'granted') return false;
	if (document.visibilityState === 'hidden') {
		// Still notify even when tab is hidden — that's the point of browser notifications.
	}
	const prefs = cachedPrefs;
	if (!shouldNotifyForEvent(event, prefs)) return false;

	const title = t('notifications.newResourceTitle');
	const body = buildNotificationBody(event);
	const icon = '/favicon.ico';
	let thumbIcon: string | undefined;
	try {
		const isNsfwAssetOrClothes = event.isNsfw === true && (event.scope === 'assets' || event.scope === 'clothes');
		if (event.thumbnailUuid && !isNsfwAssetOrClothes) thumbIcon = mediaUrl(event.thumbnailUuid, 'low', 'webp');
	} catch {
		/* ignore */
	}

	try {
		const n = new Notification(title, {
			body,
			icon: thumbIcon ?? icon,
			badge: icon,
			tag: `vrcstorage-${event.entityId}`,
		});
		n.onclick = () => {
			window.focus();
			n.close();
			navigateTo(`/item/${event.entityId}`);
		};
		return true;
	} catch {
		return false;
	}
}

// =========================================================================================================
// Boot
// =========================================================================================================

/** Load prefs once at app boot for logged-in users so feed events can be filtered immediately. */
export function initNotifications(): void {
	if (!window.appState.isLoggedIn) return;
	void ensurePrefsLoaded();
	// Re-load prefs when auth state flips (login/logout without reload isn't expected, but handle it).
	window.addEventListener('auth-changed', () => {
		if (window.appState.isLoggedIn) void fetchNotificationPrefs();
		else {
			cachedPrefs = null;
			prefsLoaded = false;
		}
	});
}
