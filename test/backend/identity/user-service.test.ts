// =========================================================================================================
// USER SERVICE TESTS
// =========================================================================================================
// Registration, profile uniqueness, password re-authentication and OAuth-only accounts.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import { describe, expect, it } from 'vitest';

import { verifyPassword } from '../../../src/auth';
import { ConflictError, ForbiddenError, ValidationError } from '../../../src/domain/errors';
import { UserService } from '../../../src/services/user-service';
import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('UserService', () => {
	it('registers unique accounts with hashed passwords and rejects duplicate names', async () => {
		const service = new UserService(env.DB);
		const registered = await service.register('firstuser', 'strong-password-123', '', '');
		expect(registered.username).toBe('firstuser');
		const user = await service.findByUsername('firstuser');
		expect(user?.password_hash).not.toBe('strong-password-123');
		expect(await verifyPassword('strong-password-123', user!.password_hash)).toBe(true);
		await expect(service.register('firstuser', 'another-password-123', '', '')).rejects.toBeInstanceOf(ConflictError);
	}, 15_000);

	it('updates username and anonymous presentation while rejecting collisions', async () => {
		const service = new UserService(env.DB);
		await service.register('profileuser', 'strong-password-123', '', '');
		await service.register('takenuser', 'another-password-123', '', '');
		const changed = await service.updateProfile('profileuser', 'newprofile', '/new-avatar.png', 1, '', '');
		expect(changed).toMatchObject({ username: 'newprofile', previousUsername: 'profileuser', usernameChanged: true, avatar_url: '/new-avatar.png', is_anonymous: 1 });
		await expect(service.updateProfile('newprofile', 'takenuser', undefined, undefined, '', '')).rejects.toBeInstanceOf(ConflictError);
		await expect(service.updateProfile('missing-user', undefined, undefined, undefined, '', '')).rejects.toMatchObject({ status: 404 });
	}, 15_000);

	it('requires the current password but allows OAuth-only accounts to set an initial password', async () => {
		const service = new UserService(env.DB);
		await service.register('passworduser', 'strong-password-123', '', '');
		const user = await service.findByUsername('passworduser');
		await expect(service.verifyPasswordReauth(user!, undefined)).rejects.toBeInstanceOf(ValidationError);
		await expect(service.verifyPasswordReauth(user!, 'wrong-password')).rejects.toBeInstanceOf(ForbiddenError);
		await service.verifyPasswordReauth(user!, 'strong-password-123');
		const oauth = await createUser('oauthuser');
		await env.DB.prepare("UPDATE users SET password_hash = '' WHERE uuid = ?").bind(oauth.uuid).run();
		const oauthRow = await service.findByUsername('oauthuser');
		await service.verifyPasswordReauth(oauthRow!, undefined);
		await service.setPassword(oauth.uuid, 'initial-password-123');
		const updated = await service.findByUsername('oauthuser');
		expect(await verifyPassword('initial-password-123', updated!.password_hash)).toBe(true);
	}, 30_000);
});
