#!/usr/bin/env node
// =============================================================================
// migrate-2fa-secrets.mjs — Migrate 2FA secrets from XOR to @hapi/iron
// =============================================================================
// Reads all 2FA users via wrangler, re-encrypts legacy XOR secrets locally 
// using @hapi/iron, and uploads the changes via a batched SQL update.
//
// Usage:
//   Set your JWT_SECRET as ENCRYPTION_KEY in your terminal before running.
//
//   Windows (PowerShell):
//     $env:ENCRYPTION_KEY="tu-secreto"; npm run migrate-2fa
//   Linux/Mac:
//     ENCRYPTION_KEY="tu-secreto" npm run migrate-2fa
// =============================================================================

import { seal, defaults } from '@hapi/iron';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DB_NAME = 'vrcstorage';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const args = process.argv.slice(2);
const local = args.includes('--local');
const remote = !local;

if (!ENCRYPTION_KEY) {
	console.error('\nError: ENCRYPTION_KEY variable is missing.');
	console.error('Please set it to your JWT_SECRET before running this script.');
	process.exit(1);
}

const SEAL_OPTIONS = { ...defaults, ttl: 1000 * 60 * 60 * 24 * 365 };

function isXorEncrypted(encryptedSecret) {
	return !encryptedSecret.startsWith('Fe26.2**');
}

function decryptSecretXOR(encryptedSecret, encryptionKey) {
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

function sqlQuote(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

async function run() {
	console.log(`Fetching users from ${remote ? 'PRODUCTION' : 'LOCAL'} database...`);
	
	const readResult = spawnSync(
		'npx',
		['wrangler', 'd1', 'execute', DB_NAME, remote ? '--remote' : '--local', '--command', '"SELECT uuid, two_factor_secret FROM users WHERE two_factor_enabled = 1 AND two_factor_secret IS NOT NULL"', '--json'],
		{ shell: process.platform === 'win32' }
	);

	if (readResult.status !== 0) {
		console.error('Failed to read from D1:\n', readResult.stderr?.toString());
		process.exit(1);
	}

	let data;
	try {
		const rawOut = readResult.stdout.toString();
		const jsonStart = rawOut.indexOf('[');
		const jsonOut = jsonStart >= 0 ? rawOut.substring(jsonStart) : rawOut;
		data = JSON.parse(jsonOut);
	} catch (err) {
		console.error('Failed to parse D1 JSON output. Raw output:\n', readResult.stdout.toString());
		process.exit(1);
	}

	// Dependiendo de la versión de wrangler, los resultados pueden venir en un array o directamente en data.results
	const rows = Array.isArray(data) ? data[0].results : data.results;
	
	if (!rows || rows.length === 0) {
		console.log('No users with 2FA enabled found. Nothing to do!');
		return;
	}

	let migrated = 0, skipped = 0, failed = 0;
	let sqlUpdates = '';

	for (const user of rows) {
		if (!isXorEncrypted(user.two_factor_secret)) {
			skipped++;
			continue;
		}

		const plaintext = decryptSecretXOR(user.two_factor_secret, ENCRYPTION_KEY);
		if (!plaintext) {
			console.error(`Failed to XOR-decrypt secret for user ${user.uuid}`);
			failed++;
			continue;
		}

		try {
			const ironSealed = await seal(plaintext, ENCRYPTION_KEY, SEAL_OPTIONS);
			sqlUpdates += `UPDATE users SET two_factor_secret = ${sqlQuote(ironSealed)} WHERE uuid = ${sqlQuote(user.uuid)};\n`;
			migrated++;
		} catch (err) {
			console.error(`Iron seal failed for ${user.uuid}:`, err);
			failed++;
		}
	}

	console.log(`\nSummary: ${migrated} to migrate, ${skipped} already updated, ${failed} failed.`);

	if (migrated === 0) {
		console.log('No updates needed.');
		return;
	}

	console.log('Writing updates to database...');
	const sqlFile = join(tmpdir(), `migrate-2fa-${Date.now()}.sql`);
	writeFileSync(sqlFile, sqlUpdates, 'utf8');

	const writeResult = spawnSync(
		'npx',
		['wrangler', 'd1', 'execute', DB_NAME, remote ? '--remote' : '--local', '--yes', '--file', sqlFile],
		{ stdio: 'inherit', shell: process.platform === 'win32' }
	);

	try { unlinkSync(sqlFile); } catch {}

	if (writeResult.status !== 0) {
		console.error('\nFailed to apply updates to D1.');
		process.exit(writeResult.status || 1);
	}

	console.log('\nMigration applied successfully!');
}

run();
