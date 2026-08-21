#!/usr/bin/env node
// =========================================================================================================
// generate-llms.mjs — Build-time renderer for llms artefacts
// =========================================================================================================
// Renders the registry into three static files under public/ for preview/CI diff:
//
//   public/llms.txt        — curated overview (same as GET /llms.txt)
//   public/llms-full.txt   — exhaustive reference (same as GET /llms-full.txt)
//   public/api-docs.json   — machine-readable manifest (same as GET /api/docs)
//
// Run: node src/tools/generate-llms.mjs        (or: npm run docs:build)
// Requires `tsx` so .ts imports work without a prior build.
// =========================================================================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '..', '..');

try {
	const { buildLlmsTxt, buildLlmsFullTxt } = await import(pathToFileURL(join(ROOT, 'src/docs/generator.ts')).href);
	const { buildManifest } = await import(pathToFileURL(join(ROOT, 'src/docs/registry.ts')).href);

	const curated = buildLlmsTxt();
	const full = buildLlmsFullTxt();
	const json = JSON.stringify(buildManifest(), null, 2);

	writeFileSync(join(ROOT, 'public', 'llms.txt'), curated, 'utf8');
	writeFileSync(join(ROOT, 'public', 'llms-full.txt'), full, 'utf8');
	mkdirSync(join(ROOT, 'public', 'api'), { recursive: true });
	writeFileSync(join(ROOT, 'public', 'api-docs.json'), json, 'utf8');

	console.log(`✔ Wrote public/llms.txt        (${curated.length} bytes, ${curated.split('\n').length} lines)`);
	console.log(`✔ Wrote public/llms-full.txt   (${full.length} bytes, ${full.split('\n').length} lines)`);
	console.log(`✔ Wrote public/api-docs.json   (${json.length} bytes)`);
} catch (e) {
	console.error('generate-llms failed:', e);
	process.exit(1);
}
