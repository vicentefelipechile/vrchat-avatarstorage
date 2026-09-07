#!/usr/bin/env node
// =============================================================================
// build-i18n.mjs — Permanent i18n generator (Phase 3.2 of PLAN.md)
// Source of truth: i18n/_src/{locale}/{section}.json (hand-edited, kept out
// of public/ so `wrangler deploy` never uploads the fragments — Workers
// Static Assets has no `exclude` option, everything under public/ is synced).
// Artifacts: public/i18n/{locale}.json (generated, committed, never hand-edited).
// Output is deterministic: layered section order + alphabetical leaves with
// nested sub-groups last, tabs, trailing newline — so regeneration diffs are
// minimal and `build(split(x)) == x` byte-for-byte.
// Also importable: i18n-manager.mjs reuses SECTION_ORDER + buildI18n() for its
// consistency check instead of duplicating the layout rules.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '../../public/i18n');
const SRC_DIR = join(__dirname, '../../i18n/_src');

// Layered layout: global → discovery → resource → identity → content (§4.1).
export const SECTION_ORDER = [
	'common', 'nav', 'pagination', 'confirm', 'notifications', 'updates', 'home', 'cats',
	'category', 'card', 'sort', 'filterPanel', 'favorites', 'collections', 'item', 'comment',
	'edit', 'history', 'upload', 'meta', 'authorProfile', 'register', 'oauthRegister',
	'login', 'settings', 'admin', 'chat', 'blog', 'wiki', 'dmca',
];

export const KNOWN_LOCALES = ['cn', 'de', 'en', 'es', 'fr', 'it', 'jp', 'nl', 'pl', 'pt', 'ru', 'tr'];

// Alphabetical leaves, nested sub-group objects last (sorted, recursively).
export function sortKeys(obj) {
	const leaves = [];
	const groups = [];
	for (const [k, v] of Object.entries(obj)) {
		if (v && typeof v === 'object') groups.push(k);
		else leaves.push(k);
	}
	leaves.sort();
	groups.sort();
	const out = {};
	for (const k of leaves) out[k] = obj[k];
	for (const k of groups) out[k] = sortKeys(obj[k]);
	return out;
}

export function loadFragments(locale) {
	const dir = join(SRC_DIR, locale);
	const out = {};
	for (const section of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
		out[section.slice(0, -'.json'.length)] = JSON.parse(readFileSync(join(dir, section), 'utf-8'));
	}
	return out;
}

// Assembles one monolit string without touching disk (used by the CHECK).
export function assembleMonolit(locale) {
	const frags = loadFragments(locale);
	const out = {};
	for (const s of SECTION_ORDER) if (frags[s] !== undefined) out[s] = sortKeys(frags[s]);
	for (const s of Object.keys(frags).sort()) if (out[s] === undefined) out[s] = sortKeys(frags[s]);
	return JSON.stringify(out, null, '\t') + '\n';
}

export function buildI18n(locales = KNOWN_LOCALES) {
	const refSections = new Set(Object.keys(loadFragments('en')));
	for (const locale of locales) {
		const frags = loadFragments(locale);
		const missing = [...refSections].filter((s) => frags[s] === undefined);
		if (missing.length) console.warn(`  ⚠ [${locale}] sections absent from _src (kept out of monolit): ${missing.join(', ')}`);
		writeFileSync(join(I18N_DIR, `${locale}.json`), assembleMonolit(locale), 'utf-8');
	}
	return locales.length;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
	if (!existsSync(SRC_DIR)) {
		console.error('✘ i18n/_src/ not found. Run node src/tools/split-i18n.mjs first.');
		process.exit(1);
	}
	const n = buildI18n();
	console.log(`✔ Rebuilt ${n} monolits from i18n/_src/`);
}
