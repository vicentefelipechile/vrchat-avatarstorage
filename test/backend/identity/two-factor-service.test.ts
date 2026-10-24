// =========================================================================================================
// TWO-FACTOR SERVICE TESTS
// =========================================================================================================
// Exercise setup boundaries, code replay protection, backup-code consumption and disable flow.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { env } from 'cloudflare:workers';

import * as OTPAuth from 'otpauth';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateTwoFactorSecret, generateBackupCodes, hashBackupCodes } from '../../../src/auth/2fa';
import { TwoFactorService } from '../../../src/services/two-factor-service';
import { createUser } from '../../setup/fixtures';

// =========================================================================================================
// Helpers
// =========================================================================================================

function legacyEncrypt(secret: string, key: string): string {
	const keyBytes = new TextEncoder().encode(key);
	const encoded = [...secret].map((char, index) => String.fromCharCode(char.charCodeAt(0) ^ keyBytes[index % keyBytes.length])).join('');
	return btoa(encoded);
}

async function enableTestTwoFactor(username: string, jwtSecret: string, codes: string[] = []): Promise<{ secret: string; code: string }> {
	const { secret } = generateTwoFactorSecret(username);
	const totp = new OTPAuth.TOTP({ issuer: 'VRCStorage', label: username, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
	const backupHashes = await hashBackupCodes(codes);
	const user = await env.DB.prepare('SELECT uuid FROM users WHERE username = ?').bind(username).first<{ uuid: string }>();
	await env.DB.prepare('UPDATE users SET two_factor_enabled = 1, two_factor_secret = ?, two_factor_backup_codes = ? WHERE uuid = ?')
		.bind(legacyEncrypt(secret, jwtSecret), backupHashes, user!.uuid).run();
	return { secret, code: totp.generate() };
}

// =========================================================================================================
// Tests
// =========================================================================================================

afterEach(() => vi.restoreAllMocks());

describe('TwoFactorService', () => {
	it('rejects missing users, missing passwords and an already-enabled setup', async () => {
		const service = new TwoFactorService(env.DB);
		await expect(service.status('missing')).rejects.toMatchObject({ status: 404 });
		const user = await createUser('factoruser');
		await expect(service.setup('factoruser', undefined, env.JWT_SECRET)).rejects.toMatchObject({ status: 400 });
		await env.DB.prepare('UPDATE users SET two_factor_enabled = 1 WHERE uuid = ?').bind(user.uuid).run();
		await expect(service.setup('factoruser', 'not-a-real-hash', env.JWT_SECRET)).rejects.toMatchObject({ status: 401 });
		await expect(service.verify('factoruser', '000000', env.JWT_SECRET)).rejects.toMatchObject({ status: 400 });
		await expect(service.disable('factoruser', undefined, undefined, env.JWT_SECRET)).rejects.toMatchObject({ status: 400 });
	});

	it('enables 2FA only after verifying the generated TOTP and rotates backup codes', async () => {
		const { uuid } = await createUser('factoruser');
		const { secret } = generateTwoFactorSecret('factoruser');
		const code = new OTPAuth.TOTP({ issuer: 'VRCStorage', label: 'factoruser', algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) }).generate();
		await env.DB.prepare('UPDATE users SET two_factor_secret = ?, two_factor_backup_codes = ? WHERE uuid = ?')
			.bind(legacyEncrypt(secret, env.JWT_SECRET), await hashBackupCodes(['0000000000000000']), uuid).run();
		const service = new TwoFactorService(env.DB);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			await expect(service.verify('factoruser', '000000', env.JWT_SECRET)).rejects.toMatchObject({ status: 401 });
			const enabled = await service.verify('factoruser', code, env.JWT_SECRET);
			expect(enabled.username).toBe('factoruser');
			expect(enabled.backupCodes).toHaveLength(8);
			expect(await service.status('factoruser')).toEqual({ enabled: true });
			const row = await env.DB.prepare('SELECT two_factor_backup_codes FROM users WHERE uuid = ?').bind(uuid).first<{ two_factor_backup_codes: string }>();
			expect(row?.two_factor_backup_codes).not.toBe(await hashBackupCodes(['0000000000000000']));
		} finally {
			error.mockRestore();
		}
	});

	it('consumes each TOTP once and supports a one-use backup code for sensitive actions', async () => {
		const { uuid } = await createUser('factoruser');
		const backupCodes = generateBackupCodes(2);
		const { code } = await enableTestTwoFactor('factoruser', env.JWT_SECRET, backupCodes);
		const service = new TwoFactorService(env.DB);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			await service.verifyActionCode('factoruser', code, env.JWT_SECRET, env.VRCSTORAGE_KV);
			await expect(service.verifyActionCode('factoruser', code, env.JWT_SECRET, env.VRCSTORAGE_KV)).rejects.toMatchObject({ status: 401 });
			await service.verifyActionCode('factoruser', backupCodes[0]!, env.JWT_SECRET, env.VRCSTORAGE_KV);
			const stored = await env.DB.prepare('SELECT two_factor_backup_codes FROM users WHERE uuid = ?').bind(uuid).first<{ two_factor_backup_codes: string }>();
			expect(stored?.two_factor_backup_codes).toBe(await hashBackupCodes([backupCodes[1]!]));
			expect(await service.status('factoruser')).toEqual({ enabled: true });
		} finally {
			error.mockRestore();
		}
	});

	it('disables 2FA with a valid backup code and clears all stored 2FA material', async () => {
		const { uuid } = await createUser('factoruser');
		await env.DB.prepare("UPDATE users SET password_hash = '' WHERE uuid = ?").bind(uuid).run();
		const backupCodes = generateBackupCodes(1);
		await enableTestTwoFactor('factoruser', env.JWT_SECRET, backupCodes);
		const service = new TwoFactorService(env.DB);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			await expect(service.disable('factoruser', undefined, undefined, env.JWT_SECRET)).rejects.toMatchObject({ status: 400 });
			await expect(service.disable('factoruser', undefined, 'not-valid', env.JWT_SECRET)).rejects.toMatchObject({ status: 401 });
			await expect(service.disable('factoruser', undefined, backupCodes[0], env.JWT_SECRET)).resolves.toEqual({ username: 'factoruser' });
			const user = await env.DB.prepare('SELECT two_factor_enabled, two_factor_secret, two_factor_backup_codes FROM users WHERE uuid = ?').bind(uuid)
				.first<{ two_factor_enabled: number; two_factor_secret: string | null; two_factor_backup_codes: string | null }>();
			expect(user).toEqual({ two_factor_enabled: 0, two_factor_secret: null, two_factor_backup_codes: null });
		} finally {
			error.mockRestore();
		}
	});
});
