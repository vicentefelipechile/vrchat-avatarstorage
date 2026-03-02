import * as OTPAuth from 'otpauth';
import { seal, unseal, defaults } from '@hapi/iron';

export interface TwoFactorSetup {
	secret: string;
	otpauthUrl: string;
	backupCodes: string[];
}

const SEAL_OPTIONS = {
	...defaults,
	ttl: 1000 * 60 * 60 * 24 * 365, // 1 year - long lived for stored secrets
};

function getEncryptionPassword(encryptionKey: string): string {
	return encryptionKey;
}

export function generateTwoFactorSecret(username: string, issuer: string = 'VRCStorage'): TwoFactorSetup {
	const totp = new OTPAuth.TOTP({
		issuer: issuer,
		label: username,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: new OTPAuth.Secret({ size: 20 }),
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

export function verifyTwoFactorCode(secret: string, code: string): boolean {
	const totp = new OTPAuth.TOTP({
		issuer: 'VRCStorage',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(secret),
	});

	const delta = totp.validate({ token: code, window: 1 });
	return delta !== null;
}

export function generateBackupCodes(count: number = 8): string[] {
	const codes: string[] = [];
	for (let i = 0; i < count; i++) {
		// Use crypto.getRandomValues() for cryptographically secure random codes
		const array = new Uint8Array(4);
		crypto.getRandomValues(array);
		const code = Array.from(array, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
		codes.push(code);
	}
	return codes;
}

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

export async function verifyBackupCode(hashedCodes: string, code: string): Promise<boolean> {
	const codes = hashedCodes.split('|');
	const normalizedCode = code.toUpperCase();
	const inputHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedCode));
	const inputHash = Array.from(new Uint8Array(inputHashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return codes.includes(inputHash);
}

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

	codes.splice(index, 1);
	return codes.join('|');
}

export async function encryptSecret(secret: string, encryptionKey: string): Promise<string> {
	const password = getEncryptionPassword(encryptionKey);
	return await seal(secret, password, SEAL_OPTIONS);
}

export async function decryptSecret(encryptedSecret: string, encryptionKey: string): Promise<string | null> {
	const password = getEncryptionPassword(encryptionKey);
	
	try {
		// First try new iron encryption
		return await unseal(encryptedSecret, password, SEAL_OPTIONS);
	} catch (err) {
		// Fallback: Try old XOR method for backward compatibility with existing users
		const oldResult = decryptSecretXOR(encryptedSecret, encryptionKey);
		if (oldResult) {
			return oldResult;
		}
		console.error('Failed to decrypt 2FA secret:', err);
		return null;
	}
}

// Legacy XOR decryption for backward compatibility with existing users
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
