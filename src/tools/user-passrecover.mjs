#!/usr/bin/env node
// =============================================================================
// user-passrecover.mjs — Reset a user's password from the command line
// =============================================================================
// Hashes a new password with bcrypt (same scheme the app uses: cost 10) and
// writes it to the `users.password_hash` column of the D1 `vrcstorage`
// database via `wrangler d1 execute`.
//
// Usage:
//   npm run user-passrecover <username> <newpassword>         (production D1)
//   npm run user-passrecover <username> <newpassword> --local (local dev D1)
//
// Examples:
//   npm run user-passrecover Roxxxie hunter2
//   npm run user-passrecover Roxxxie hunter2 --local
//
// Targets the deployed production database by default, since password recovery
// is for real accounts. Pass --local only when testing against `wrangler dev`.
//
// The existing login cookie of the user (JWT) stays valid until it expires;
// only the stored password changes, so the new password works on the next login.
// =============================================================================

// =============================================================================
// Imports
// =============================================================================

import { hashSync } from 'bcryptjs';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// =============================================================================
// Constants
// =============================================================================

const DB_NAME = 'vrcstorage';
const BCRYPT_COST = 10; // Matches hashPassword() in src/auth.ts

// =============================================================================
// Argument parsing
// =============================================================================

const args = process.argv.slice(2);
const local = args.includes('--local');
const remote = !local; // Production is the default target.
const positional = args.filter((a) => !a.startsWith('--'));
const [username, newPassword] = positional;

if (!username || !newPassword) {
	console.error('Usage: npm run user-passrecover <username> <newpassword> [--local]');
	process.exit(1);
}

// =============================================================================
// SQL escaping
// =============================================================================
// wrangler d1 execute takes raw SQL, so single quotes in string literals are
// escaped by doubling them (standard SQL). bcrypt hashes never contain quotes,
// but the username might, so both are escaped defensively.

function sqlQuote(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

// =============================================================================
// Main
// =============================================================================

const hash = hashSync(newPassword, BCRYPT_COST);

const sql = `UPDATE users SET password_hash = ${sqlQuote(hash)} WHERE username = ${sqlQuote(username)};`;

// Pass the SQL via a temp .sql file rather than --command. On Windows a string
// with spaces and quotes does not survive the shell round-trip, so a file is
// the reliable way to hand raw SQL to wrangler.
const sqlFile = join(tmpdir(), `user-passrecover-${Date.now()}.sql`);
writeFileSync(sqlFile, sql, 'utf8');

console.log(`Resetting password for "${username}" on the ${remote ? 'PRODUCTION (remote)' : 'LOCAL'} database...`);

const result = spawnSync(
	'npx',
	['wrangler', 'd1', 'execute', DB_NAME, remote ? '--remote' : '--local', '--yes', '--file', sqlFile],
	{
		stdio: 'inherit',
		shell: process.platform === 'win32',
	},
);

try {
	unlinkSync(sqlFile);
} catch {
	// Best-effort cleanup; the OS temp dir is cleared periodically anyway.
}

if (result.status !== 0) {
	console.error('\nFailed to update the password. Check that the username exists and wrangler is authenticated.');
	process.exit(result.status ?? 1);
}

console.log(`\nDone. "${username}" can now log in with the new password.`);
console.log('Note: if 0 rows were written, the username does not exist (usernames are case-sensitive).');
