#!/usr/bin/env tsx
// =========================================================================================================
// i18n Checker
// =========================================================================================================
// Purpose: Detect missing, extra, or mismatched keys across all i18n locale files.
// Usage: npm run check-i18n
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';

// =========================================================================================================
// Types
// =========================================================================================================

type FlatKeys = Record<string, string>;

interface LocaleData {
	locale: string;
	file: string;
	keys: FlatKeys;
}

interface CheckResult {
	missingKeys: Record<string, string[]>; // key → locales missing it
	extraKeys: Record<string, string[]>; // key → locales that have it extra (not in reference)
}

// =========================================================================================================
// ANSI Colors
// =========================================================================================================

const c = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	bgRed: '\x1b[41m',
	bgGreen: '\x1b[42m',
};

const ok = `${c.green}✔${c.reset}`;
const err = `${c.red}✘${c.reset}`;
const warn = `${c.yellow}⚠${c.reset}`;

// =========================================================================================================
// Helpers
// =========================================================================================================

/**
 * Recursively flattens a nested object into dot-notation keys.
 * Example: { nav: { home: 'Home' } } → { 'nav.home': 'Home' }
 */
function flattenObject(obj: unknown, prefix = ''): FlatKeys {
	if (typeof obj !== 'object' || obj === null) {
		return { [prefix]: String(obj) };
	}

	const result: FlatKeys = {};

	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;

		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			Object.assign(result, flattenObject(value, fullKey));
		} else {
			result[fullKey] = String(value);
		}
	}

	return result;
}

/**
 * Strips the ES module boilerplate from a .js locale file and evaluates its
 * default export as a plain object. Works with the VRCStorage locale format:
 *   export default { ... };
 */
async function parseLocaleFile(filePath: string): Promise<FlatKeys> {
	const raw = await readFile(filePath, 'utf-8');

	// Remove "export default" so we can eval it as a plain JS expression.
	const cleaned = raw
		.replace(/^\s*\/\/.*$/gm, '') // strip line comments
		.replace(/export\s+default\s+/, 'return ') // replace export default with return
		.trim();

	try {
		// eslint-disable-next-line no-new-func
		const fn = new Function(cleaned);
		const obj = fn();
		return flattenObject(obj);
	} catch (e) {
		throw new Error(`Failed to parse locale file "${filePath}": ${e}`);
	}
}

/**
 * Discovers all .js locale files in the given directory.
 */
async function discoverLocales(dir: string): Promise<LocaleData[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const jsFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.js')).map((e) => e.name);

	const locales: LocaleData[] = [];

	for (const file of jsFiles) {
		const filePath = join(dir, file);
		const locale = file.replace('.js', '');
		const keys = await parseLocaleFile(filePath);
		locales.push({ locale, file, keys });
	}

	return locales.sort((a, b) => a.locale.localeCompare(b.locale));
}

/**
 * Given all locale data, computes:
 * - Keys present in SOME locales but missing in others.
 * - The "union" of all keys serves as the reference — any partial presence = problem.
 */
function analyzeKeys(locales: LocaleData[]): CheckResult {
	// Build a map of key → set of locales that have it
	const keyPresence = new Map<string, Set<string>>();

	for (const { locale, keys } of locales) {
		for (const key of Object.keys(keys)) {
			if (!keyPresence.has(key)) keyPresence.set(key, new Set());
			keyPresence.get(key)!.add(locale);
		}
	}

	const allLocales = new Set(locales.map((l) => l.locale));
	const missingKeys: Record<string, string[]> = {};
	const extraKeys: Record<string, string[]> = {};

	for (const [key, presentIn] of keyPresence.entries()) {
		const missingIn = [...allLocales].filter((l) => !presentIn.has(l));

		if (missingIn.length > 0) {
			// Key is in SOME but not ALL locales
			if (missingIn.length === allLocales.size - 1) {
				// Only one locale has it → treat as "extra" in that locale
				const onlyLocale = [...presentIn][0];
				if (!extraKeys[key]) extraKeys[key] = [];
				extraKeys[key].push(onlyLocale);
			} else if (missingIn.length >= allLocales.size) {
				// Shouldn't happen, but guard anyway
			} else {
				// Missing in multiple locales — report as missing
				missingKeys[key] = missingIn;
			}
		}
	}

	return { missingKeys, extraKeys };
}

// =========================================================================================================
// Report Rendering
// =========================================================================================================

function renderHeader(title: string): void {
	const line = '─'.repeat(60);
	console.log(`\n${c.bold}${c.cyan}${line}${c.reset}`);
	console.log(`${c.bold}${c.cyan}  ${title}${c.reset}`);
	console.log(`${c.bold}${c.cyan}${line}${c.reset}`);
}

function renderLocaleTable(locales: LocaleData[]): void {
	renderHeader('Discovered Locale Files');
	for (const { locale, file, keys } of locales) {
		const count = Object.keys(keys).length;
		console.log(`  ${ok} ${c.bold}${locale}${c.reset}  ${c.dim}(${file})${c.reset}  →  ${c.white}${count} keys${c.reset}`);
	}
}

function renderMissingKeys(missing: Record<string, string[]>, locales: LocaleData[]): void {
	const keys = Object.keys(missing).sort();

	if (keys.length === 0) {
		console.log(`\n  ${ok} ${c.green}No missing keys found across all locales.${c.reset}`);
		return;
	}

	renderHeader(`Missing Keys  (${keys.length} issue${keys.length !== 1 ? 's' : ''})`);

	// Group by category (first segment of dot path)
	const byCategory = new Map<string, string[]>();
	for (const key of keys) {
		const cat = key.split('.')[0];
		if (!byCategory.has(cat)) byCategory.set(cat, []);
		byCategory.get(cat)!.push(key);
	}

	for (const [cat, catKeys] of [...byCategory.entries()].sort()) {
		console.log(`\n  ${c.bold}${c.yellow}[${cat}]${c.reset}`);
		for (const key of catKeys) {
			const missingIn = missing[key];
			const presentIn = locales.map((l) => l.locale).filter((l) => !missingIn.includes(l));
			console.log(`    ${err} ${c.white}${key}${c.reset}`);
			console.log(`       ${c.dim}Missing in:  ${c.reset}${c.red}${missingIn.join(', ')}${c.reset}`);
			console.log(`       ${c.dim}Present in:  ${c.reset}${c.green}${presentIn.join(', ')}${c.reset}`);
		}
	}
}

function renderExtraKeys(extra: Record<string, string[]>, locales: LocaleData[]): void {
	const keys = Object.keys(extra).sort();

	if (keys.length === 0) {
		console.log(`\n  ${ok} ${c.green}No unique/orphan keys detected.${c.reset}`);
		return;
	}

	renderHeader(`Orphan Keys  (present in only 1 locale — ${keys.length} found)`);

	for (const key of keys) {
		const onlyIn = extra[key];
		console.log(`  ${warn} ${c.white}${key}${c.reset}`);
		console.log(`     ${c.dim}Only in: ${c.reset}${c.yellow}${onlyIn.join(', ')}${c.reset}`);
	}
}

function renderMissingCategories(locales: LocaleData[]): void {
	// Collect top-level categories per locale
	const allCategories = new Set<string>();
	const localeCategories = new Map<string, Set<string>>();

	for (const { locale, keys } of locales) {
		const cats = new Set(Object.keys(keys).map((k) => k.split('.')[0]));
		localeCategories.set(locale, cats);
		cats.forEach((cat) => allCategories.add(cat));
	}

	const issues: { locale: string; missing: string[] }[] = [];

	for (const { locale } of locales) {
		const has = localeCategories.get(locale)!;
		const missing = [...allCategories].filter((cat) => !has.has(cat)).sort();
		if (missing.length > 0) {
			issues.push({ locale, missing });
		}
	}

	if (issues.length === 0) {
		console.log(`\n  ${ok} ${c.green}All locales have the same top-level categories.${c.reset}`);
		return;
	}

	renderHeader('Missing Categories');
	for (const { locale, missing } of issues) {
		console.log(`  ${err} ${c.bold}${locale}${c.reset} is missing categories:`);
		for (const cat of missing) {
			console.log(`     ${c.red}● ${cat}${c.reset}`);
		}
	}
}

function renderSummary(locales: LocaleData[], missing: Record<string, string[]>, extra: Record<string, string[]>): void {
	renderHeader('Summary');

	const missingCount = Object.keys(missing).length;
	const extraCount = Object.keys(extra).length;
	const hasIssues = missingCount > 0 || extraCount > 0;

	console.log(`  Locales checked:   ${c.bold}${locales.length}${c.reset}`);
	console.log(`  Missing keys:      ${missingCount > 0 ? c.red : c.green}${missingCount}${c.reset}`);
	console.log(`  Orphan keys:       ${extraCount > 0 ? c.yellow : c.green}${extraCount}${c.reset}`);

	if (hasIssues) {
		console.log(`\n  ${c.bgRed}${c.bold}  ✘ i18n check FAILED — fix the issues above  ${c.reset}\n`);
	} else {
		console.log(`\n  ${c.bgGreen}${c.bold}  ✔ i18n check PASSED — all locales are in sync  ${c.reset}\n`);
	}
}

// =========================================================================================================
// Main
// =========================================================================================================

async function main() {
	const i18nDir = resolve(process.cwd(), 'public/js/i18n');

	console.log(`\n${c.bold}${c.white}VRCStorage i18n Checker${c.reset}`);
	console.log(`${c.dim}Scanning: ${i18nDir}${c.reset}`);

	let locales: LocaleData[];

	try {
		locales = await discoverLocales(i18nDir);
	} catch (e) {
		console.error(`\n${c.red}ERROR: Could not read i18n directory: ${e}${c.reset}\n`);
		process.exit(1);
	}

	if (locales.length === 0) {
		console.error(`\n${c.red}ERROR: No .js locale files found in ${i18nDir}${c.reset}\n`);
		process.exit(1);
	}

	renderLocaleTable(locales);

	// =========================================================================================================
	// Category-level check
	// =========================================================================================================
	console.log('');
	renderMissingCategories(locales);

	// =========================================================================================================
	// Key-level analysis
	// =========================================================================================================
	const { missingKeys, extraKeys } = analyzeKeys(locales);

	renderMissingKeys(missingKeys, locales);
	renderExtraKeys(extraKeys, locales);

	renderSummary(locales, missingKeys, extraKeys);

	// Exit with non-zero code if there are issues (useful for CI)
	if (Object.keys(missingKeys).length > 0 || Object.keys(extraKeys).length > 0) {
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(`\n${c.red}Unexpected error: ${e}${c.reset}\n`);
	process.exit(1);
});
