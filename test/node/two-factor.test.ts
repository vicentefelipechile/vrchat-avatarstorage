// =========================================================================================================
// TWO-FACTOR AUTHENTICATION TESTS
// =========================================================================================================
// Validate TOTP, one-time backup codes and encryption at rest in the Workers runtime.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import * as OTPAuth from 'otpauth';
import { describe, expect, it } from 'vitest';

import { decryptSecret, encryptSecret, generateBackupCodes, generateTwoFactorSecret, hashBackupCodes, useBackupCode, verifyBackupCode, verifyTwoFactorCode } from '../../src/auth/2fa';

// =========================================================================================================
// Constants
// =========================================================================================================

const ENCRYPTION_KEY = 'a-private-test-key-of-at-least-thirty-two-bytes';

// =========================================================================================================
// Tests
// =========================================================================================================

describe('TOTP', () => {
	it('accepts a valid code for a newly generated secret and rejects an invalid code', () => {
		const { secret, otpauthUrl, backupCodes } = generateTwoFactorSecret('tester');
		const code = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30, algorithm: 'SHA1' }).generate();
		expect(otpauthUrl).toContain('otpauth://totp/');
		expect(backupCodes).toHaveLength(8);
		expect(verifyTwoFactorCode(secret, code)).toBe(true);
		expect(verifyTwoFactorCode(secret, 'invalid')).toBe(false);
	});

	it('encrypts secrets at rest and rejects the wrong encryption key', async () => {
		const plain = generateTwoFactorSecret('tester').secret;
		const sealed = await encryptSecret(plain, ENCRYPTION_KEY);
		expect(sealed).not.toContain(plain);
		expect(await decryptSecret(sealed, ENCRYPTION_KEY)).toBe(plain);
		expect(await decryptSecret(sealed, 'a-completely-different-private-test-key-of-sufficient-length')).not.toBe(plain);
	});
});

describe('backup codes', () => {
	it('generates unique hexadecimal codes and consumes each hash only once', async () => {
		const codes = generateBackupCodes(8);
		expect(new Set(codes).size).toBe(8);
		expect(codes.every((code) => /^[A-F0-9]{16}$/.test(code))).toBe(true);
		const hashed = await hashBackupCodes(codes);
		expect(hashed).not.toContain(codes[0]);
		expect(await verifyBackupCode(hashed, codes[0].toLowerCase())).toBe(true);
		const remaining = await useBackupCode(hashed, codes[0]);
		expect(remaining).not.toBeNull();
		expect(await verifyBackupCode(remaining!, codes[0])).toBe(false);
		expect(await useBackupCode(remaining!, codes[0])).toBeNull();
	});
});
