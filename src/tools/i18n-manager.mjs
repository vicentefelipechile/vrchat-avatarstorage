#!/usr/bin/env node
// =============================================================================
// i18n-manager.mjs — Manage translation keys in locale files
// =============================================================================
// Usage:
//   npm run i18n-manager ADD [DRY] <LOCALE> key=value [key2=value2 ...]
//   npm run i18n-manager FILL [DRY] <path-to-json>
//   npm run i18n-manager LIST [LOCALE] path1 [path2 ...]
//   npm run i18n-manager CHECK [JSON]
//
// Subcommands:
//   ADD    Insert one or more keys into a locale file (for 1-2 keys).
//   FILL   Batch-insert keys from a JSON file (for large batches).
//          JSON format: { "locale": { "section.key": "value", ... }, ... }
//   LIST   Inspect existing keys. Multiple paths accepted.
//          If path resolves to a section, all keys in it are printed.
//          If path resolves to a leaf key, its value is printed.
//   CHECK  Report missing keys. Add JSON for machine-readable output
//          that writes to node_modules/.tmp/i18n-check.json.
//
// Key format:
//   section.leaf              e.g. register.confirmPassword
//   section.subsection.leaf   e.g. dmca.advanced.claimLabel
//
// Examples:
//   npm run i18n-manager ADD ES register.confirmPassword="Confirmar contraseña"
//   npm run i18n-manager ADD ES dmca.advanced.claimLabel="Reclamación"
//   npm run i18n-manager ADD DRY ES register.confirmPassword="Confirmar contraseña"
//   npm run i18n-manager FILL node_modules/.tmp/i18n-fill.json
//   npm run i18n-manager FILL DRY node_modules/.tmp/i18n-fill.json
//   npm run i18n-manager LIST ES register
//   npm run i18n-manager LIST ES register.confirmPassword register.success
//   npm run i18n-manager LIST ES dmca.advanced
//   npm run i18n-manager LIST dmca.advanced
//   npm run i18n-manager CHECK
//   npm run i18n-manager CHECK JSON
//
// Notes:
//   - Locale codes are case-insensitive: EN, ES, DE, FR, IT, JP, CN, NL, PL, PT, RU, TR
//   - If the key already exists, it is skipped (no overwrite)
//   - After adding, always verify with: npm run i18n-manager CHECK
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '../../public/i18n');

const KNOWN_LOCALES = new Set(['en', 'es', 'de', 'fr', 'it', 'jp', 'cn', 'nl', 'pl', 'pt', 'ru', 'tr']);
const ALL_LOCALES = [...KNOWN_LOCALES];

// =============================================================================
// JSON I/O helpers
// =============================================================================

function loadLocale(locale) {
	const filePath = join(I18N_DIR, `${locale}.json`);
	try {
		return JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch (e) {
		console.error(`✘ Could not load ${locale}.json: ${e.message}`);
		return null;
	}
}

function saveLocale(locale, data, dryRun) {
	const filePath = join(I18N_DIR, `${locale}.json`);
	const content = JSON.stringify(data, null, '\t') + '\n';
	if (dryRun) {
		console.log(`  (dry — would write ${locale}.json)`);
	} else {
		writeFileSync(filePath, content, 'utf-8');
	}
}

// =============================================================================
// Object path helpers
// =============================================================================

/**
 * Get nested value by dot-path. Returns undefined if not found.
 */
function getByPath(obj, dotPath) {
	return dotPath.split('.').reduce((acc, k) => acc?.[k], obj);
}

/**
 * Set nested value by dot-path, creating intermediate objects as needed.
 * Returns false if the key already exists (skip), true if inserted.
 */
function setByPath(obj, dotPath, value) {
	const parts = dotPath.split('.');
	const leafKey = parts[parts.length - 1];
	let current = obj;

	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		if (current[part] === undefined) {
			current[part] = {};
		} else if (typeof current[part] !== 'object' || current[part] === null) {
			console.error(`  ✘ "${parts.slice(0, i + 1).join('.')}" exists but is not an object.`);
			return false;
		}
		current = current[part];
	}

	if (current[leafKey] !== undefined) {
		return 'skip';
	}

	current[leafKey] = value;
	return true;
}

/**
 * Recursively collect all dot-paths for leaf (string/number) values in an object.
 */
function collectPaths(obj, prefix = '') {
	const paths = [];
	for (const [key, val] of Object.entries(obj)) {
		const full = prefix ? `${prefix}.${key}` : key;
		if (val && typeof val === 'object') {
			paths.push(...collectPaths(val, full));
		} else {
			paths.push(full);
		}
	}
	return paths;
}

// =============================================================================
// LIST mode
// =============================================================================

function runList(locale, paths) {
	const targetLocales = locale ? [locale] : ALL_LOCALES;

	if (!paths.length) {
		// No paths — list top-level sections per locale
		for (const loc of targetLocales) {
			const data = loadLocale(loc);
			if (!data) continue;
			const sections = Object.keys(data);
			console.log(`[${loc.toUpperCase()}] sections: ${sections.join(', ')}`);
		}
		return;
	}

	for (const dotPath of paths) {
		console.log(`\n${'─'.repeat(60)}`);
		console.log(`  ${dotPath}`);
		console.log('─'.repeat(60));

		for (const loc of targetLocales) {
			const data = loadLocale(loc);
			if (!data) {
				console.log(`  [${loc.toUpperCase()}] ✘ file not found`);
				continue;
			}

			const val = getByPath(data, dotPath);

			if (val === undefined) {
				console.log(`  [${loc.toUpperCase()}] ✘ not found`);
			} else if (typeof val === 'object' && val !== null) {
				// It's a section — print its direct children
				console.log(`  [${loc.toUpperCase()}]`);
				for (const [k, v] of Object.entries(val)) {
					if (typeof v === 'object') {
						console.log(`    ${k}: { ... }`);
					} else {
						console.log(`    ${k}: '${v}'`);
					}
				}
			} else {
				console.log(`  [${loc.toUpperCase()}] ${dotPath.split('.').pop()}: '${val}'`);
			}
		}
	}
}

// =============================================================================
// ADD mode
// =============================================================================

function runAdd(map, dryRun) {
	if (dryRun) console.log('Dry run — files will NOT be written.\n');

	let totalWritten = 0,
		totalSkipped = 0,
		totalFailed = 0;

	for (const [locale, entries] of map) {
		const data = loadLocale(locale);
		if (!data) {
			totalFailed++;
			continue;
		}

		console.log(`[${locale.toUpperCase()}]`);
		let modified = false;

		for (const { key, value } of entries) {
			const result = setByPath(data, key, value);
			if (result === false) {
				totalFailed++;
			} else if (result === 'skip') {
				console.log(`  ↷ "${key}" already exists — skipped.`);
				totalSkipped++;
			} else {
				console.log(`  ✓ ${key} = '${value}'`);
				modified = true;
				totalWritten++;
			}
		}

		if (modified) {
			saveLocale(locale, data, dryRun);
		}
		console.log('');
	}

	console.log('─────────────────────────────────');
	console.log(`Written: ${totalWritten}  Skipped: ${totalSkipped}  Failed: ${totalFailed}`);
	if (!dryRun && totalWritten > 0) console.log('\nVerify with: npm run i18n-manager CHECK');
}

// =============================================================================
// FILL mode — batch-insert from JSON file
// =============================================================================

function runFill(filePath, dryRun) {
	const absPath = resolve(filePath);
	if (!existsSync(absPath)) {
		console.error(`✘ File not found: ${absPath}`);
		process.exit(1);
	}

	let json;
	try {
		json = JSON.parse(readFileSync(absPath, 'utf-8'));
	} catch (e) {
		console.error(`✘ Invalid JSON: ${e.message}`);
		process.exit(1);
	}

	if (typeof json !== 'object' || json === null || Array.isArray(json)) {
		console.error('✘ JSON must be an object: { "locale": { "section.key": "value", ... }, ... }');
		process.exit(1);
	}

	if (dryRun) console.log('Dry run — files will NOT be written.\n');

	// Build the same Map structure that runAdd expects
	const map = new Map();
	for (const [locale, keys] of Object.entries(json)) {
		const loc = locale.toLowerCase();
		if (!KNOWN_LOCALES.has(loc)) {
			console.warn(`  ⚠ Unknown locale "${locale}" — skipped.`);
			continue;
		}
		if (typeof keys !== 'object' || keys === null || Array.isArray(keys)) {
			console.warn(`  ⚠ Locale "${locale}" value must be an object — skipped.`);
			continue;
		}
		const entries = [];
		for (const [key, value] of Object.entries(keys)) {
			if (typeof value !== 'string') {
				console.warn(`  ⚠ [${loc}] "${key}" value is not a string — skipped.`);
				continue;
			}
			entries.push({ key, value });
		}
		if (entries.length) map.set(loc, entries);
	}

	if (!map.size) {
		console.error('✘ No valid entries found in JSON.');
		process.exit(1);
	}

	runAdd(map, dryRun);
}

// =============================================================================
// CHECK mode — compact missing-key report
// =============================================================================

async function runCheck(jsonMode) {
	const data = {};
	for (const loc of ALL_LOCALES) {
		const parsed = loadLocale(loc);
		if (parsed) data[loc] = parsed;
	}

	const ref = data['en'];
	if (!ref) {
		console.error('Could not load en.json as reference.');
		process.exit(1);
	}

	const allPaths = collectPaths(ref);
	const missing = [];

	for (const dotPath of allPaths) {
		const absentIn = [];
		for (const loc of ALL_LOCALES) {
			if (loc === 'en') continue;
			if (!data[loc]) continue;
			if (getByPath(data[loc], dotPath) === undefined) absentIn.push(loc);
		}
		if (absentIn.length) missing.push({ dotPath, absentIn });
	}

	if (jsonMode) {
		const entries = missing.map(({ dotPath, absentIn }) => ({
			key: dotPath,
			locales: absentIn,
			en: String(getByPath(ref, dotPath) ?? ''),
		}));
		const json = JSON.stringify(
			{
				total: missing.length,
				missing: entries,
			},
			null,
			2,
		);
		const tmpDir = join(__dirname, '../../node_modules/.tmp');
		mkdirSync(tmpDir, { recursive: true });
		const outPath = join(tmpDir, 'i18n-check.json');
		writeFileSync(outPath, json, 'utf-8');
		if (!missing.length) {
			console.log('✔ All keys present in all locales.');
		} else {
			console.log(`✘ ${missing.length} missing keys → ${outPath}`);
			process.exit(1);
		}
		return;
	}

	if (!missing.length) {
		console.log('✔ All keys present in all locales.');
		return;
	}

	console.log(`Missing keys (${missing.length}):`);
	for (const { dotPath, absentIn } of missing) {
		console.log(`  ${dotPath}: ${absentIn.join(', ')}`);
	}
	console.log(`\nTotal: ${missing.length} missing keys across ${ALL_LOCALES.length} locales.`);
	process.exit(1);
}

// =============================================================================
// Argument parsers
// =============================================================================

function parseAddArgs(args) {
	const map = new Map();
	let currentLocale = null;
	let dryRun = false;

	for (const arg of args) {
		if (arg.toUpperCase() === 'DRY') {
			dryRun = true;
			continue;
		}

		if (KNOWN_LOCALES.has(arg.toLowerCase()) && !arg.includes('=')) {
			currentLocale = arg.toLowerCase();
			if (!map.has(currentLocale)) map.set(currentLocale, []);
			continue;
		}

		const eqIdx = arg.indexOf('=');
		if (eqIdx === -1) {
			console.warn(`Warning: ignored "${arg}"`);
			continue;
		}

		if (!currentLocale) {
			console.error(`Error: key=value "${arg}" before a locale code. Valid: ${ALL_LOCALES.join(', ')}`);
			process.exit(1);
		}

		map.get(currentLocale).push({ key: arg.slice(0, eqIdx).trim(), value: arg.slice(eqIdx + 1).trim() });
	}

	return { map, dryRun };
}

function parseListArgs(args) {
	let locale = null;
	const paths = [];

	for (const arg of args) {
		if (KNOWN_LOCALES.has(arg.toLowerCase()) && !arg.includes('.')) {
			locale = arg.toLowerCase();
		} else {
			paths.push(arg);
		}
	}

	return { locale, paths };
}

// =============================================================================
// Main
// =============================================================================

const args = process.argv.slice(2);
const subcommand = args[0]?.toUpperCase();

if (!subcommand || subcommand === 'HELP') {
	printHelp();
	process.exit(0);
}

if (subcommand === 'LIST') {
	const { locale, paths } = parseListArgs(args.slice(1));
	runList(locale, paths);
} else if (subcommand === 'ADD') {
	const { map, dryRun } = parseAddArgs(args.slice(1));
	if (!map.size) {
		printHelp();
		process.exit(0);
	}
	runAdd(map, dryRun);
} else if (subcommand === 'FILL') {
	const rest = args.slice(1);
	const dryRun = rest[0]?.toUpperCase() === 'DRY';
	const filePath = dryRun ? rest[1] : rest[0];
	if (!filePath) {
		console.error('Error: FILL requires a JSON file path.');
		printHelp();
		process.exit(1);
	}
	runFill(filePath, dryRun);
} else if (subcommand === 'CHECK') {
	const jsonMode = args.slice(1).some((a) => a.toUpperCase() === 'JSON');
	await runCheck(jsonMode);
} else {
	console.error(`Unknown subcommand "${args[0]}". Use ADD, FILL, LIST, or CHECK.`);
	printHelp();
	process.exit(1);
}

function printHelp() {
	console.log(`i18n-manager — manage translation keys in locale files

Usage:
  npm run i18n-manager ADD [DRY] <LOCALE> key=value [key2=value2 ...]
  npm run i18n-manager FILL [DRY] <path-to-json>
  npm run i18n-manager LIST [LOCALE] [path1 path2 ...]
  npm run i18n-manager CHECK [JSON]

Locale codes (case-insensitive): EN ES DE FR IT JP CN NL PL PT RU TR

Key format:
  section.leaf               register.confirmPassword
  section.subsection.leaf    dmca.advanced.claimLabel

FILL JSON format:
  { "locale": { "section.key": "translated value", ... }, ... }

Examples:
  npm run i18n-manager ADD ES register.confirmPassword="Confirmar contraseña"
  npm run i18n-manager ADD DRY ES register.confirmPassword="Confirmar contraseña"
  npm run i18n-manager FILL node_modules/.tmp/i18n-fill.json
  npm run i18n-manager FILL DRY node_modules/.tmp/i18n-fill.json
  npm run i18n-manager LIST ES register
  npm run i18n-manager LIST dmca.advanced
  npm run i18n-manager CHECK
  npm run i18n-manager CHECK JSON
`);
}
