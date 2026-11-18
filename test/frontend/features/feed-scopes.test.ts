// =========================================================================================================
// FEED SCOPE RECONCILIATION TESTS
// =========================================================================================================
// External scope names must not dispatch inherited methods or reach notifications and refresh events.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../../src/frontend/api';
import { invalidateScopes, notifyScopes, reconcileScopes, type FeedScope } from '../../../src/frontend/features/feed-scopes';
import { showToast } from '../../../src/frontend/lib/utils';

// =========================================================================================================
// Mocks
// =========================================================================================================

vi.mock('../../../src/frontend/lib/utils', () => ({ showToast: vi.fn(), TimeUnit: { Second: 1000 } }));
vi.mock('../../../src/frontend/core/i18n', () => ({ t: (key: string) => key }));

// =========================================================================================================
// Constants
// =========================================================================================================

const DOMAINS = [api.Categories.Avatars, api.Categories.Assets, api.Categories.Clothes, api.Blog, api.Comments];

// =========================================================================================================
// Setup
// =========================================================================================================

beforeEach(() => {
	for (const domain of DOMAINS) vi.spyOn(domain, 'Invalidate').mockImplementation(() => {});
	vi.mocked(showToast).mockClear();
	vi.stubGlobal('window', { dispatchEvent: vi.fn(() => true) });
});

// =========================================================================================================
// Tests
// =========================================================================================================

describe('feed scope reconciliation', () => {
	it('invalidates every supported API domain', () => {
		invalidateScopes(['avatars', 'assets', 'clothes', 'blog', 'comments']);
		for (const domain of DOMAINS) expect(domain.Invalidate).toHaveBeenCalledOnce();
	});

	it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', 'unknown', undefined, null, 42, { toString: null }, ['avatars']].map((scope) => ({ scope })))('ignores an unsupported runtime scope: %j', ({ scope }) => {
		const untrusted = [scope] as FeedScope[];
		expect(() => {
			invalidateScopes(untrusted);
			notifyScopes(untrusted);
			reconcileScopes(untrusted);
		}).not.toThrow();
		for (const domain of DOMAINS) expect(domain.Invalidate).not.toHaveBeenCalled();
		expect(showToast).not.toHaveBeenCalled();
		expect(window.dispatchEvent).not.toHaveBeenCalled();
	});

	it('only announces and dispatches supported scopes from a mixed batch', () => {
		reconcileScopes(['avatars', 'constructor', 'blog', '__proto__', null] as FeedScope[]);
		expect(api.Categories.Avatars.Invalidate).toHaveBeenCalledOnce();
		expect(api.Blog.Invalidate).toHaveBeenCalledOnce();
		expect(api.Categories.Assets.Invalidate).not.toHaveBeenCalled();
		expect(api.Categories.Clothes.Invalidate).not.toHaveBeenCalled();
		expect(api.Comments.Invalidate).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledExactlyOnceWith('updates.multiple', 'info', 4000);
		expect(window.dispatchEvent).toHaveBeenCalledOnce();
		expect(vi.mocked(window.dispatchEvent).mock.calls[0][0]).toMatchObject({ type: 'content-updated', detail: { scopes: ['avatars', 'blog'] } });
	});

	it('keeps duplicate notifications coalesced for valid scopes', () => {
		notifyScopes(['comments', 'comments']);
		expect(showToast).toHaveBeenCalledExactlyOnceWith('updates.comments', 'info', 4000);
	});
});
