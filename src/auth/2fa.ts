// =========================================================================================================
// TWO-FACTOR AUTHENTICATION HELPER
// =========================================================================================================
// Pure functions for TOTP-based two-factor authentication and backup code management.
// All session state (storing secrets, marking 2FA as enabled) is handled in the route.
//
// =========================================================================================================
// Setup Flow (user enables 2FA)
// =========================================================================================================
//
//  Browser                     VRCStorage Worker                    Authenticator App
//  ───────                     ─────────────────                    ─────────────────
//    │  POST /api/2fa/setup        │                                        │
//    │ ───────────────────────────►│                                        │
//    │                             │  1. generateTwoFactorSecret()          │
//    │                             │     ├─ new TOTP (SHA1, 6 digits, 30s)  │
//    │                             │     ├─ returns Base32 secret           │
//    │                             │     ├─ returns otpauth:// URL          │
//    │                             │     └─ generateBackupCodes(8)          │
//    │                             │  2. encryptSecret(secret, key)         │
//    │                             │     └─ @hapi/iron seal → ciphertext    │
//    │                             │  3. hashBackupCodes(codes)             │
//    │                             │     └─ SHA-256 each code → pipe-joined │
//    │                             │  4. Store in DB (encrypted)            │
//    │  { qrCode, backupCodes }    │                                        │
//    │ ◄───────────────────────────│                                        │
//    │                             │                                        │
//    │  User scans QR code ────────────────────────────────────────────────►│
//    │  POST /api/2fa/verify       │                                        │
//    │    { code: "123456" }       │                                        │
//    │ ───────────────────────────►│                                        │
//    │                             │  5. decryptSecret(ciphertext, key)     │
//    │                             │  6. verifyTwoFactorCode(secret, code)  │
//    │                             │     └─ TOTP.validate (window ±1)       │
//    │                             │  7. Mark 2FA enabled in DB             │
//    │  { success: true }          │                                        │
//    │ ◄───────────────────────────│                                        │
//
// =========================================================================================================
// Login Flow (user has 2FA enabled)
// =========================================================================================================
//
//    │  POST /api/2fa/challenge    │                                        │
//    │    { code: "123456" }       │                                        │
//    │ ───────────────────────────►│                                        │
//    │                             │  1. decryptSecret(ciphertext, key)     │
//    │                             │  2. verifyTwoFactorCode(secret, code)  │
//    │                             │     OR useBackupCode(hashed, code)     │
//    │                             │        └─ removes code from DB         │
//    │                             │  3. Create session cookie              │
//    │  302 → /                    │                                        │
//    │ ◄───────────────────────────│                                        │
//
//  This module covers steps explicitly named above.
//  Session creation and DB updates are handled in src/routes/2fa.ts.
//
// =========================================================================================================
// References
// =========================================================================================================
//   TOTP (RFC 6238):    https://datatracker.ietf.org/doc/html/rfc6238
//   HOTP (RFC 4226):    https://datatracker.ietf.org/doc/html/rfc4226
//   otpauth library:    https://github.com/hectorm/otpauth
//   otpauth URI format: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
//   @hapi/iron:         https://hapi.dev/module/iron/
//   Web Crypto digest:  https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import * as OTPAuth from 'otpauth';
import { seal, unseal, defaults } from '@hapi/iron';

// =========================================================================================================
// Types
// =========================================================================================================

/**
 * The result of a successful 2FA setup. Contains everything the route needs to
 * display the QR code to the user and store hashed codes in the database.
 */
export interface TwoFactorSetup {
	/** Base32-encoded TOTP secret (plain-text). Must be encrypted before storing in DB. */
	secret: string;
	/** `otpauth://totp/...` URI for generating the QR code shown to the user. */
	otpauthUrl: string;
	/** 8 plain-text backup codes shown once to the user. Must be hashed before storing in DB. */
	backupCodes: string[];
}

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * @hapi/iron seal options for encrypting the TOTP secret at rest.
 * TTL is set to 1 year because the secret must remain decryptable for the lifetime of the user's 2FA.
 *
 * @see https://hapi.dev/module/iron/api/#Options
 */
const SEAL_OPTIONS = {
	...defaults,
	ttl: 1000 * 60 * 60 * 24 * 365, // 1 year — long-lived for stored secrets
};

/**
 * Returns the encryption password used by @hapi/iron.
 * Currently a pass-through, but isolates the key derivation point for future changes
 * (e.g. adding a KDF like PBKDF2 without touching call sites).
 *
 * @param encryptionKey - Raw encryption key from environment secrets.
 * @returns The password string passed to `seal`/`unseal`.
 */
function getEncryptionPassword(encryptionKey: string): string {
	return encryptionKey;
}

/**
 * Decrypts a TOTP secret that was previously encrypted with the legacy XOR + Base64 scheme.
 * This function exists solely for backward compatibility with accounts created before
 * the migration to @hapi/iron. It is never used for new encryptions.
 *
 * XOR is **not** a secure encryption scheme — it is only tolerated here because the
 * ciphertext is already stored in the database for existing users and re-encryption
 * would require a migration.
 *
 * @param encryptedSecret - Base64-encoded XOR-encrypted ciphertext.
 * @param encryptionKey   - The raw key used during original XOR encryption.
 * @returns The decrypted plain-text secret, or `null` if decoding fails.
 *
 * @deprecated Use {@link encryptSecret} / {@link decryptSecret} (iron-based) for all new secrets.
 */
function decryptSecretXOR(encryptedSecret: string, encryptionKey: string): string | null {
	try {
		const encoder = new TextEncoder();
		const decoded = atob(encryptedSecret);

		let result = '';
		const keyBytes = encoder.encode(encryptionKey);

		for (let i = 0; i < decoded.length; i++) {
			result += String.fromCharCode(decoded.charCodeAt(i) ^ keyBytes[i % keyBytes.length]);
		}

		return result;
	} catch {
		return null;
	}
}

// =========================================================================================================
// Exports
// =========================================================================================================

/**
 * Generates a new TOTP secret, constructs the `otpauth://` URI for QR code rendering,
 * and produces 8 cryptographically random backup codes.
 *
 * The returned values are all **plain-text**. The caller is responsible for:
 * - Calling {@link encryptSecret} before storing `secret` in the database.
 * - Calling {@link hashBackupCodes} before storing `backupCodes` in the database.
 * - Showing `backupCodes` to the user exactly once, then discarding the plain-text copies.
 *
 * @param username - The user's username, used as the TOTP account label in the QR code.
 * @param issuer   - The issuer name shown in the authenticator app. Defaults to `'VRCStorage'`.
 * @returns A {@link TwoFactorSetup} object with the secret, QR URI, and backup codes.
 *
 * @see https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 * @see https://datatracker.ietf.org/doc/html/rfc6238
 */
export function generateTwoFactorSecret(username: string, issuer: string = 'VRCStorage'): TwoFactorSetup {
	const totp = new OTPAuth.TOTP({
		issuer: issuer,
		label: username,
		algorithm: 'SHA1', // RFC 6238 mandates SHA1 for TOTP compatibility with most authenticator apps
		digits: 6,
		period: 30, // 30-second window — standard for Google Authenticator, Authy, etc.
		secret: new OTPAuth.Secret({ size: 20 }), // 160-bit random secret (20 bytes)
	});

	const secret = totp.secret.base32;
	const otpauthUrl = totp.toString();

	const backupCodes = generateBackupCodes(8);

	return {
		secret,
		otpauthUrl,
		backupCodes,
	};
}

/**
 * Verifies a 6-digit TOTP code against a plain-text Base32 secret.
 * Accepts codes from the current 30-second window and one window on either side
 * (`window: 1`) to tolerate minor clock drift between server and authenticator app.
 *
 * @param secret - The plain-text Base32 TOTP secret (must be decrypted before calling).
 * @param code   - The 6-digit code entered by the user.
 * @returns `true` if the code is valid within the allowed time window; `false` otherwise.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6238#section-5.2
 */
export function verifyTwoFactorCode(secret: string, code: string): boolean {
	const totp = new OTPAuth.TOTP({
		issuer: 'VRCStorage',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(secret),
	});

	// validate() returns the time-step delta (0, ±1) if valid, or null if invalid
	const delta = totp.validate({ token: code, window: 1 });
	return delta !== null;
}

/**
 * Generates `count` cryptographically random backup codes.
 * Each code is 8 hex characters (32 bits of entropy) derived from `crypto.getRandomValues()`.
 *
 * Backup codes are single-use. Once consumed via {@link useBackupCode},
 * they are removed from the stored hash list in the database.
 *
 * @param count - Number of backup codes to generate. Defaults to `8`.
 * @returns An array of plain-text uppercase hex backup codes (e.g. `['A1B2C3D4', ...]`).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
 */
export function generateBackupCodes(count: number = 8): string[] {
	const codes: string[] = [];
	for (let i = 0; i < count; i++) {
		// 4 bytes = 32 bits of entropy per code, encoded as 8 uppercase hex characters
		const array = new Uint8Array(4);
		crypto.getRandomValues(array);
		const code = Array.from(array, (b) => b.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase();
		codes.push(code);
	}
	return codes;
}

/**
 * Hashes each backup code with SHA-256 and returns them as a single pipe-delimited string
 * suitable for storing in a single database column.
 *
 * Codes are normalized to uppercase before hashing so that `useBackupCode` can
 * accept any case from the user without failing to match.
 *
 * Storage format: `HASH1|HASH2|...|HASHn` (each hash is a 64-character hex string).
 *
 * @param codes - Array of plain-text backup codes (as returned by {@link generateBackupCodes}).
 * @returns A pipe-delimited string of hex-encoded SHA-256 hashes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 */
export async function hashBackupCodes(codes: string[]): Promise<string> {
	const hashed = await Promise.all(
		codes.map(async (c) => {
			const normalized = c.toUpperCase();
			const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
		}),
	);
	return hashed.join('|');
}

/**
 * Checks whether `code` matches any of the stored hashed backup codes without consuming it.
 * Used for read-only validation before deciding whether to proceed with login.
 *
 * @param hashedCodes - Pipe-delimited string of SHA-256 hashes (as stored in the database).
 * @param code        - The plain-text backup code entered by the user (case-insensitive).
 * @returns `true` if the code matches a stored hash; `false` otherwise.
 */
export async function verifyBackupCode(hashedCodes: string, code: string): Promise<boolean> {
	const codes = hashedCodes.split('|');
	const normalizedCode = code.toUpperCase();
	const inputHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedCode));
	const inputHash = Array.from(new Uint8Array(inputHashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return codes.includes(inputHash);
}

/**
 * Validates `code` against the stored hashed backup codes and, if valid, removes it
 * from the list (single-use enforcement). Returns the updated hash string to be
 * persisted back to the database by the caller.
 *
 * @param hashedCodes - Pipe-delimited string of SHA-256 hashes (as stored in the database).
 * @param code        - The plain-text backup code entered by the user (case-insensitive).
 * @returns The updated pipe-delimited hash string with the consumed code removed,
 *          or `null` if the code was not found.
 */
export async function useBackupCode(hashedCodes: string, code: string): Promise<string | null> {
	const codes = hashedCodes.split('|');
	const normalizedCode = code.toUpperCase();
	const inputHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedCode));
	const inputHash = Array.from(new Uint8Array(inputHashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	const index = codes.indexOf(inputHash);

	if (index === -1) {
		return null;
	}

	// Remove the consumed code so it cannot be reused
	codes.splice(index, 1);
	return codes.join('|');
}

/**
 * Encrypts a plain-text TOTP secret using @hapi/iron before storing it in the database.
 * Iron applies AES-256-CBC encryption + HMAC-SHA-256 integrity check, producing
 * a self-contained, authenticated ciphertext string.
 *
 * @param secret        - The plain-text Base32 TOTP secret to encrypt.
 * @param encryptionKey - The server-side encryption key from environment secrets.
 * @returns The iron-sealed ciphertext string ready for database storage.
 *
 * @see https://hapi.dev/module/iron/api/#sealobject-password-options
 */
export async function encryptSecret(secret: string, encryptionKey: string): Promise<string> {
	const password = getEncryptionPassword(encryptionKey);
	return await seal(secret, password, SEAL_OPTIONS);
}

/**
 * Decrypts a TOTP secret from the database back to its plain-text form.
 *
 * Tries @hapi/iron `unseal` first (current scheme). If that fails, falls back to the
 * legacy XOR + Base64 decryption ({@link decryptSecretXOR}) for backward compatibility
 * with accounts created before the iron migration. If both fail, returns `null`.
 *
 * @param encryptedSecret - The ciphertext stored in the database (iron or legacy XOR format).
 * @param encryptionKey   - The server-side encryption key from environment secrets.
 * @returns The plain-text Base32 TOTP secret, or `null` if decryption fails.
 *
 * @see https://hapi.dev/module/iron/api/#unsealsealed-password-options
 */
export async function decryptSecret(encryptedSecret: string, encryptionKey: string): Promise<string | null> {
	const password = getEncryptionPassword(encryptionKey);

	try {
		// Try current iron-based encryption first
		return await unseal(encryptedSecret, password, SEAL_OPTIONS);
	} catch (err) {
		// Fallback: legacy XOR scheme for existing users migrated before iron was introduced
		const oldResult = decryptSecretXOR(encryptedSecret, encryptionKey);
		if (oldResult) {
			return oldResult;
		}
		console.error('Failed to decrypt 2FA secret:', err);
		return null;
	}
}
