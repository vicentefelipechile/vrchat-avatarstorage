// =========================================================================================================
// ANONYMOUS IDENTITY UNIT TESTS
// =========================================================================================================
// Check anonymous display names and avatars without a database or HTTP request.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { describe, expect, it } from 'vitest';

import { ANON_AVATAR, anonymousName, resolveDisplayIdentity } from '../../../src/helpers/anonymity';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('anonymous identities', () => {
	it('hides the original name and avatar only when anonymous mode is enabled', () => {
		const uuid = 'abcde-0000-0000-0000';
		expect(anonymousName(uuid)).toBe('Anonymous abcde');
		expect(resolveDisplayIdentity(uuid, 'Private Name', '/my-avatar.png', 1)).toEqual({ display_name: 'Anonymous abcde', display_avatar: ANON_AVATAR });
		expect(resolveDisplayIdentity(uuid, 'Private Name', '/my-avatar.png', false)).toEqual({ display_name: 'Private Name', display_avatar: '/my-avatar.png' });
	});
});
