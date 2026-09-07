#!/usr/bin/env node
// =============================================================================
// split-i18n.mjs — ONE-SHOT splitter (Phase 3.1 of PLAN.md)
// Reads each public/i18n/{locale}.json monolit and writes one fragment per
// top-level section to i18n/_src/{locale}/{section}.json (outside public/ so
// `wrangler deploy` never uploads the fragments).
// Content-identical relocation: no key is added, removed, or reordered.
// Run once, verify round-trip with build-i18n.mjs, then leave this file alone.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '../../public/i18n');
const SRC_DIR = join(__dirname, '../../i18n/_src');

const locales = readdirSync(I18N_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

let files = 0;
for (const file of locales) {
	const locale = file.slice(0, -'.json'.length);
	const data = JSON.parse(readFileSync(join(I18N_DIR, file), 'utf-8'));
	for (const [section, body] of Object.entries(data)) {
		const dir = join(SRC_DIR, locale);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, `${section}.json`), JSON.stringify(body, null, '\t') + '\n', 'utf-8');
		files++;
	}
	console.log(`[${locale}] ${Object.keys(data).length} sections`);
}

console.log(`\nSplit ${locales.length} monolits into ${files} fragments under i18n/_src/`);
