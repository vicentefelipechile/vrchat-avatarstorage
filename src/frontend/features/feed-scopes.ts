// =========================================================================================================
// FEED SCOPES
// =========================================================================================================
// The shared vocabulary for real-time content updates and the reconciliation both delivery paths run:
// the live WebSocket client (feed.ts) and the polling fallback (updates.ts). A scope maps to the cache
// domain invalidation it triggers and to the i18n label it toasts. Kept in one place so the two paths cannot
// drift — they invalidate the same keys and announce the same wording.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { api } from '../api';
import { showToast, TimeUnit } from '../lib/utils';
import { t } from '../core/i18n';

// =========================================================================================================
// Types
// =========================================================================================================

/** A content scope a change can belong to. Matches the backend `FeedScope` in src/types.ts. */
export type FeedScope = 'avatars' | 'assets' | 'clothes' | 'blog' | 'comments';

// =========================================================================================================
// Maps
// =========================================================================================================

const SCOPE_INVALIDATORS: Record<FeedScope, () => void> = {
	avatars: () => api.Categories.Avatars.Invalidate(),
	assets: () => api.Categories.Assets.Invalidate(),
	clothes: () => api.Categories.Clothes.Invalidate(),
	blog: () => api.Blog.Invalidate(),
	comments: () => api.Comments.Invalidate(),
};

/** i18n leaf key naming each scope in a toast. */
const SCOPE_LABELS: Record<FeedScope, string> = {
	avatars: 'updates.avatars',
	assets: 'updates.assets',
	clothes: 'updates.clothes',
	blog: 'updates.blog',
	comments: 'updates.comments',
};

// =========================================================================================================
// Reconciliation
// =========================================================================================================

/** Lets each domain invalidate its own cached data before the view refreshes. */
export function invalidateScopes(scopes: FeedScope[]): void {
	for (const scope of scopes) {
		SCOPE_INVALIDATORS[scope]();
	}
}

/**
 * Shows a single coalesced toast. One changed scope names itself; several collapse into a generic
 * message so a burst of changes never stacks into a wall of toasts.
 */
export function notifyScopes(scopes: FeedScope[]): void {
	const unique = [...new Set(scopes)];
	if (unique.length === 0) return;
	const message = unique.length === 1 ? t(SCOPE_LABELS[unique[0]]) : t('updates.multiple');
	showToast(message, 'info', TimeUnit.Second * 4);
}

/**
 * Reconciles a batch of changed scopes: invalidate the affected caches, show one toast, and let an
 * active listing view refresh itself via the `content-updated` event. The single entry point both the
 * live client and the poller call so their behaviour stays identical.
 */
export function reconcileScopes(scopes: FeedScope[]): void {
	if (scopes.length === 0) return;
	invalidateScopes(scopes);
	notifyScopes(scopes);
	window.dispatchEvent(new CustomEvent('content-updated', { detail: { scopes } }));
}
