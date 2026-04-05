#!/usr/bin/env node
// =============================================================================
// i18n-manager.mjs — Manage translation keys in locale files
// =============================================================================
// Usage:
//   npm run i18n-manager ADD [DRY] <LOCALE> key=value [key2=value2 ...]
//   npm run i18n-manager LIST [LOCALE] path1 [path2 ...]
//
// Subcommands:
//   ADD    Insert one or more keys into a locale file.
//   LIST   Inspect existing keys. Multiple paths accepted.
//          If path resolves to a section, all keys in it are printed.
//          If path resolves to a leaf key, its value is printed.
//
// Key format:
//   section.leaf              e.g. register.confirmPassword
//   section.subsection.leaf   e.g. dmca.advanced.claimLabel
//
// Examples:
//   npm run i18n-manager ADD ES register.confirmPassword="Confirmar contraseña"
//   npm run i18n-manager ADD ES dmca.advanced.claimLabel="Reclamación"
//   npm run i18n-manager ADD DRY ES register.confirmPassword="Confirmar contraseña"
//   npm run i18n-manager LIST ES register
//   npm run i18n-manager LIST ES register.confirmPassword register.success
//   npm run i18n-manager LIST ES dmca.advanced
//   npm run i18n-manager LIST dmca.advanced
//
// Notes:
//   - Locale codes are case-insensitive: EN, ES, DE, FR, IT, JP, CN, NL, PL, PT, RU, TR
//   - If the key already exists, it is skipped (no overwrite)
//   - After adding, always verify with: npm run i18n-manager CHECK
// =============================================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '../../public/js/i18n');

const KNOWN_LOCALES = new Set(['en', 'es', 'de', 'fr', 'it', 'jp', 'cn', 'nl', 'pl', 'pt', 'ru', 'tr']);
const ALL_LOCALES = [...KNOWN_LOCALES];

// ---------------------------------------------------------------------------
// Section navigation
// ---------------------------------------------------------------------------

/**
 * Find the content bounds of a named section starting at searchFrom,
 * constrained within [searchFrom, searchLimit].
 * Returns { contentStart, contentEnd } or null.
 */
function findSectionBounds(source, sectionName, searchFrom = 0, searchLimit = source.length) {
	const re = new RegExp(`['"]?${sectionName}['"]?\\s*:\\s*\\{`, 'g');
	re.lastIndex = searchFrom;
	let found = null;
	let match;
	while ((match = re.exec(source)) !== null) {
		if (match.index >= searchLimit) break;
		found = match;
	}
	if (!found) return null;

	const contentStart = found.index + found[0].length;
	let depth = 1;
	let pos = contentStart;
	while (pos < source.length && depth > 0) {
		if (source[pos] === '{') depth++;
		else if (source[pos] === '}') depth--;
		pos++;
	}
	return { contentStart, contentEnd: pos - 1 };
}

/**
 * Navigate an array of path parts through nested section boundaries.
 * Returns { contentStart, contentEnd } of the deepest section, or null.
 */
function navigatePath(source, pathParts) {
	let searchFrom = 0;
	let searchLimit = source.length;
	let bounds = null;
	for (const part of pathParts) {
		bounds = findSectionBounds(source, part, searchFrom, searchLimit);
		if (!bounds) return null;
		searchFrom = bounds.contentStart;
		searchLimit = bounds.contentEnd;
	}
	return bounds;
}

/**
 * Extract all direct string key:value pairs from a section content string.
 * Does not recurse into nested sub-objects.
 */
function extractStringKeys(sectionContent) {
	const SINGLE = `'(?:[^'\\\\]|\\\\.)*'`;
	const DOUBLE = `"(?:[^"\\\\]|\\\\.)*"`;
	const re = new RegExp(`(\\w+)\\s*:\\s*(${SINGLE}|${DOUBLE})`, 'g');
	const results = [];
	let m;
	while ((m = re.exec(sectionContent)) !== null) {
		const raw = m[2];
		const value = raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
		results.push({ key: m[1], value });
	}
	return results;
}

/**
 * Extract all direct sub-section names (object-valued keys) from a section.
 */
function extractSubSections(sectionContent) {
	const re = /(\w+)\s*:\s*\{/g;
	const names = [];
	let m;
	while ((m = re.exec(sectionContent)) !== null) names.push(m[1]);
	return names;
}

/**
 * Read the value of a specific leaf key within a section content.
 * Returns the string value or null if not found.
 */
function readLeafValue(sectionContent, leafKey) {
	const SINGLE = `'(?:[^'\\\\]|\\\\.)*'`;
	const DOUBLE = `"(?:[^"\\\\]|\\\\.)*"`;
	const re = new RegExp(`['"]?${leafKey}['"]?\\s*:\\s*(${SINGLE}|${DOUBLE})`);
	const m = sectionContent.match(re);
	if (!m) return null;
	return m[1].slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
}

// ---------------------------------------------------------------------------
// LIST mode
// ---------------------------------------------------------------------------

function runList(locale, paths) {
	const targetLocales = locale ? [locale] : ALL_LOCALES;

	if (!paths.length) {
		// No paths given — list top-level sections per locale
		for (const loc of targetLocales) {
			const source = loadSource(loc);
			if (!source) continue;
			const re = /(?:^|\n)\s*(\w+)\s*:\s*\{/g;
			const sections = [];
			let m;
			while ((m = re.exec(source)) !== null) sections.push(m[1]);
			console.log(`[${loc.toUpperCase()}] sections: ${sections.join(', ')}`);
		}
		return;
	}

	for (const dotPath of paths) {
		const parts = dotPath.split('.');
		const isLeaf = parts.length >= 2;

		console.log(`\n${'─'.repeat(60)}`);
		console.log(`  ${dotPath}`);
		console.log('─'.repeat(60));

		for (const loc of targetLocales) {
			const source = loadSource(loc);
			if (!source) { console.log(`  [${loc.toUpperCase()}] ✘ file not found`); continue; }

			if (isLeaf) {
				// Could be a leaf key (section.key) or a nested section (section.sub)
				// Try as section first, then as leaf
				const sectionBounds = navigatePath(source, parts);
				if (sectionBounds) {
					// It's a section — print all string keys in it
					const content = source.slice(sectionBounds.contentStart, sectionBounds.contentEnd);
					const keys = extractStringKeys(content);
					const subs = extractSubSections(content);
					if (!keys.length && !subs.length) {
						console.log(`  [${loc.toUpperCase()}] (empty)`);
					} else {
						console.log(`  [${loc.toUpperCase()}]`);
						for (const { key, value } of keys) console.log(`    ${key}: '${value}'`);
						if (subs.length) console.log(`    subsections: ${subs.join(', ')}`);
					}
				} else {
					// Try as a leaf: navigate to parent section, read key
					const parentParts = parts.slice(0, -1);
					const leafKey = parts[parts.length - 1];
					const parentBounds = navigatePath(source, parentParts);
					if (!parentBounds) {
						console.log(`  [${loc.toUpperCase()}] ✘ section "${parentParts.join('.')}" not found`);
						continue;
					}
					const parentContent = source.slice(parentBounds.contentStart, parentBounds.contentEnd);
					const value = readLeafValue(parentContent, leafKey);
					if (value === null) {
						console.log(`  [${loc.toUpperCase()}] ✘ key "${leafKey}" not found`);
					} else {
						console.log(`  [${loc.toUpperCase()}] ${leafKey}: '${value}'`);
					}
				}
			} else {
				// Top-level section name only
				const bounds = findSectionBounds(source, parts[0]);
				if (!bounds) { console.log(`  [${loc.toUpperCase()}] ✘ not found`); continue; }
				const content = source.slice(bounds.contentStart, bounds.contentEnd);
				const keys = extractStringKeys(content);
				const subs = extractSubSections(content);
				console.log(`  [${loc.toUpperCase()}]`);
				for (const { key, value } of keys) console.log(`    ${key}: '${value}'`);
				if (subs.length) console.log(`    subsections: ${subs.join(', ')}`);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// ADD mode
// ---------------------------------------------------------------------------

function insertKey(source, dotPath, value) {
	const parts = dotPath.split('.');
	const leafKey = parts[parts.length - 1];
	const sectionParts = parts.slice(0, -1);

	if (!sectionParts.length) {
		console.error(`  ✘ "${dotPath}" has no section prefix. Use "section.key" format.`);
		return null;
	}

	const bounds = navigatePath(source, sectionParts);
	if (!bounds) {
		console.error(`  ✘ Section "${sectionParts.join('.')}" not found.`);
		return null;
	}

	const { contentStart, contentEnd } = bounds;
	const sectionContent = source.slice(contentStart, contentEnd);

	// Detect indentation from the section itself
	const firstPropMatch = sectionContent.match(/\n([ \t]+)\w/);
	const leafIndent = firstPropMatch ? firstPropMatch[1] : (source.includes('\t') ? '\t\t' : '        ');

	if (new RegExp(`['"]?${leafKey}['"]?\\s*:`).test(sectionContent)) {
		console.log(`  ↷ "${dotPath}" already exists — skipped.`);
		return source;
	}

	const SINGLE = `'(?:[^'\\\\]|\\\\.)*'`;
	const DOUBLE = `"(?:[^"\\\\]|\\\\.)*"`;
	const propRe = new RegExp(`[^\\n]+:\\s*(?:${SINGLE}|${DOUBLE})\\s*,?`, 'g');
	const allMatches = [...sectionContent.matchAll(propRe)];

	if (!allMatches.length) {
		console.error(`  ✘ No string properties found in "${sectionParts.join('.')}" to insert after.`);
		return null;
	}

	const lastMatch = allMatches[allMatches.length - 1];
	const insertAfterIdx = contentStart + lastMatch.index + lastMatch[0].length;
	const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
	const newLine = `\n${leafIndent}${leafKey}: '${escaped}',`;

	return source.slice(0, insertAfterIdx) + newLine + source.slice(insertAfterIdx);
}

function runAdd(map, dryRun) {
	if (dryRun) console.log('Dry run — files will NOT be written.\n');

	let totalWritten = 0, totalSkipped = 0, totalFailed = 0;

	for (const [locale, entries] of map) {
		const filePath = join(I18N_DIR, `${locale}.js`);
		let source = loadSource(locale);
		if (!source) { totalFailed++; continue; }

		console.log(`[${locale.toUpperCase()}]`);
		let updated = source;

		for (const { key, value } of entries) {
			const result = insertKey(updated, key, value);
			if (result === null) totalFailed++;
			else if (result === updated) totalSkipped++;
			else { updated = result; console.log(`  ✓ ${key} = '${value}'`); totalWritten++; }
		}

		if (updated !== source) {
			if (!dryRun) writeFileSync(filePath, updated, 'utf-8');
			else console.log(`  (dry — would write ${locale}.js)`);
		}
		console.log('');
	}

	console.log('─────────────────────────────────');
	console.log(`Written: ${totalWritten}  Skipped: ${totalSkipped}  Failed: ${totalFailed}`);
	if (!dryRun && totalWritten > 0) console.log('\nVerify with: npm run i18n-manager CHECK');
}

// ---------------------------------------------------------------------------
// CHECK mode — compact missing-key report
// ---------------------------------------------------------------------------

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

/**
 * Get nested value by dot-path from an object. Returns undefined if not found.
 */
function getByPath(obj, dotPath) {
	return dotPath.split('.').reduce((acc, k) => acc?.[k], obj);
}

async function runCheck() {
	// Load all locale files as live JS modules
	const data = {};
	for (const loc of ALL_LOCALES) {
		const url = pathToFileURL(resolve(I18N_DIR, `${loc}.js`)).href;
		try {
			const mod = await import(url);
			data[loc] = mod.default;
		} catch {
			console.warn(`  ✘ Could not load ${loc}.js — skipped.`);
		}
	}

	const ref = data['en'];
	if (!ref) { console.error('Could not load en.js as reference.'); process.exit(1); }

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSource(locale) {
	try {
		return readFileSync(join(I18N_DIR, `${locale}.js`), 'utf-8');
	} catch {
		console.error(`✘ File not found: ${locale}.js`);
		return null;
	}
}

function parseAddArgs(args) {
	const map = new Map();
	let currentLocale = null;
	let dryRun = false;

	for (const arg of args) {
		if (arg.toUpperCase() === 'DRY') { dryRun = true; continue; }

		if (KNOWN_LOCALES.has(arg.toLowerCase()) && !arg.includes('=')) {
			currentLocale = arg.toLowerCase();
			if (!map.has(currentLocale)) map.set(currentLocale, []);
			continue;
		}

		const eqIdx = arg.indexOf('=');
		if (eqIdx === -1) { console.warn(`Warning: ignored "${arg}"`); continue; }

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
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
	if (!map.size) { printHelp(); process.exit(0); }
	runAdd(map, dryRun);
} else if (subcommand === 'CHECK') {
	await runCheck();
} else {
	console.error(`Unknown subcommand "${args[0]}". Use ADD, LIST, or CHECK.`);
	printHelp();
	process.exit(1);
}

function printHelp() {
	console.log(`i18n-manager — manage translation keys in locale files

Usage:
  npm run i18n-manager ADD [DRY] <LOCALE> key=value [key2=value2 ...]
  npm run i18n-manager LIST [LOCALE] [path1 path2 ...]
  npm run i18n-manager CHECK

Locale codes (case-insensitive): EN ES DE FR IT JP CN NL PL PT RU TR

Key format:
  section.leaf               register.confirmPassword
  section.subsection.leaf    dmca.advanced.claimLabel

Examples:
  npm run i18n-manager ADD ES register.confirmPassword="Confirmar contraseña"
  npm run i18n-manager ADD ES dmca.advanced.claimLabel="Reclamación"
  npm run i18n-manager ADD DRY ES register.confirmPassword="Confirmar contraseña"
  npm run i18n-manager LIST ES register
  npm run i18n-manager LIST ES register.confirmPassword register.success
  npm run i18n-manager LIST ES dmca.advanced
  npm run i18n-manager LIST dmca.advanced
  npm run i18n-manager CHECK
`);
}
