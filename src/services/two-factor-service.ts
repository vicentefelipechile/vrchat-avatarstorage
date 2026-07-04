// =========================================================================================================
// TWO-FACTOR SERVICE
// =========================================================================================================
// Business logic for enabling/disabling TOTP two-factor auth: setup, verify, disable, status. Owns the
// rules (password re-auth, already-enabled/not-enabled guards, code validation, backup-code fallback)
// and the secret encryption; all SQL lives in UserRepository.
//
// Env-agnostic: `jwtSecret` (the encryption key) is passed in per call, mirroring how the other
// services take `turnstileSecret`. Session/KV cache invalidation stays in the route.
//
// Error mapping reproduces the legacy status codes exactly:
//   - user record missing                        → NotFoundError    (404)
//   - missing password (password-based account)  → ValidationError  (400)
//   - wrong password                             → UnauthorizedError(401)
//   - 2FA already enabled (setup)                → ValidationError  (400)
//   - 2FA not set up (verify) / not enabled      → ValidationError  (400)
//   - failed secret decryption                   → DomainError 500
//   - invalid TOTP/backup code                   → UnauthorizedError(401)
//   - missing code (disable)                     → ValidationError  (400)
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from '../db/client';
import type { User } from '../types';
import { UserRepository } from '../repositories/user-repository';
import { verifyPassword } from '../auth';
import {
	generateTwoFactorSecret,
	verifyTwoFactorCode,
	encryptSecret,
	decryptSecret,
	hashBackupCodes,
	verifyBackupCode,
	generateBackupCodes,
} from '../auth/2fa';
import { DomainError, NotFoundError, UnauthorizedError, ValidationError } from '../domain/errors';

// =========================================================================================================
// Types
// =========================================================================================================

/** The setup response — the plaintext secret + otpauth URL for the authenticator app. */
export interface TwoFactorSetupResult {
	secret: string;
	otpauthUrl: string;
}

/** The verify response — 2FA is now enabled and these are the one-time backup codes. */
export interface TwoFactorEnableResult {
	backupCodes: string[];
}

/** A username-keyed reference to the affected user, so the route can invalidate the KV cache. */
export interface TwoFactorMutationResult {
	username: string;
}

// =========================================================================================================
// Service
// =========================================================================================================

export class TwoFactorService {
	private readonly repo: UserRepository;

	constructor(db: DB) {
		this.repo = new UserRepository(db);
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	/** Load the user by username or throw NotFoundError. */
	private async requireUser(username: string): Promise<User> {
		const user = await this.repo.findByUsername(username);
		if (!user) throw new NotFoundError('User not found');
		return user;
	}

	/**
	 * Re-auth for a 2FA mutation. OAuth-only accounts (empty password_hash) skip the check;
	 * password-based accounts must supply the correct password (missing → 400, wrong → 401).
	 */
	private async assertPassword(user: User, password: string | undefined): Promise<void> {
		if (!user.password_hash) return;
		if (!password) throw new ValidationError('Password is required');
		const ok = await verifyPassword(password, user.password_hash);
		if (!ok) throw new UnauthorizedError('Invalid password');
	}

	/** Decrypt the stored 2FA secret or throw a 500 DomainError. */
	private async decryptOrThrow(user: User, jwtSecret: string): Promise<string> {
		if (!user.two_factor_secret) throw new ValidationError('2FA not set up');
		const secret = await decryptSecret(user.two_factor_secret, jwtSecret);
		if (!secret) throw new DomainError('Failed to decrypt 2FA secret', 500);
		return secret;
	}

	// -------------------------------------------------------------------------
	// Setup
	// -------------------------------------------------------------------------

	/**
	 * Begin 2FA setup: verify identity, generate a secret + backup codes, store them encrypted
	 * (2FA stays disabled until /verify). Returns the plaintext secret + otpauth URL.
	 */
	async setup(username: string, password: string | undefined, jwtSecret: string): Promise<TwoFactorSetupResult> {
		const user = await this.requireUser(username);
		await this.assertPassword(user, password);

		if (user.two_factor_enabled === 1) throw new ValidationError('2FA is already enabled');

		const setup = generateTwoFactorSecret(user.username, 'VRCStorage');
		const encryptedSecret = await encryptSecret(setup.secret, jwtSecret);
		await this.repo.storeTwoFactorSetup(user.uuid, encryptedSecret, await hashBackupCodes(setup.backupCodes));

		return { secret: setup.secret, otpauthUrl: setup.otpauthUrl };
	}

	// -------------------------------------------------------------------------
	// Verify (enable)
	// -------------------------------------------------------------------------

	/**
	 * Complete setup: validate a TOTP code against the stored secret, then flip 2FA on and issue a
	 * fresh set of backup codes. The route invalidates the KV session cache afterwards.
	 */
	async verify(username: string, code: string, jwtSecret: string): Promise<TwoFactorEnableResult & TwoFactorMutationResult> {
		const user = await this.requireUser(username);
		const secret = await this.decryptOrThrow(user, jwtSecret);

		if (!verifyTwoFactorCode(secret, code)) throw new UnauthorizedError('Invalid code');

		const backupCodes = generateBackupCodes(8);
		await this.repo.enableTwoFactor(user.uuid, await hashBackupCodes(backupCodes));

		return { backupCodes, username: user.username };
	}

	// -------------------------------------------------------------------------
	// Disable
	// -------------------------------------------------------------------------

	/**
	 * Disable 2FA: verify identity, require a valid TOTP or backup code, then clear the secret and
	 * backup codes. The route invalidates the KV session cache afterwards.
	 */
	async disable(
		username: string,
		password: string | undefined,
		code: string | undefined,
		jwtSecret: string,
	): Promise<TwoFactorMutationResult> {
		const user = await this.requireUser(username);

		if (user.two_factor_enabled !== 1) throw new ValidationError('2FA is not enabled');

		await this.assertPassword(user, password);

		if (!code) throw new ValidationError('2FA code is required to disable 2FA');

		const secret = await this.decryptOrThrow(user, jwtSecret);

		let ok = verifyTwoFactorCode(secret, code);
		if (!ok) {
			ok = user.two_factor_backup_codes ? await verifyBackupCode(user.two_factor_backup_codes, code) : false;
		}
		if (!ok) throw new UnauthorizedError('Invalid code');

		await this.repo.disableTwoFactor(user.uuid);

		return { username: user.username };
	}

	// -------------------------------------------------------------------------
	// Status
	// -------------------------------------------------------------------------

	/** Whether 2FA is currently enabled for the user. */
	async status(username: string): Promise<{ enabled: boolean }> {
		const user = await this.requireUser(username);
		return { enabled: user.two_factor_enabled === 1 };
	}
}
