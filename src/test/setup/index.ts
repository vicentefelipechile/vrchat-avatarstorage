// ============================================================================
// Vitest setupFiles — applies schema + seeds Miniflare's in-memory D1.
// Runs INSIDE the Cloudflare Worker sandbox (nodejs_compat enabled).
// Uses env.DB directly — the SAME D1 instance the tests see.
// ============================================================================

import { env } from 'cloudflare:test';
import { buildSQL } from './populate';

// Vite ?raw imports — these are resolved at build time by vite-node
import schemaInit from '../../../sql/SCHEMA_INIT.sql?raw';
import schemaMig1 from '../../../sql/SCHEMA_EDIT_2026-02-15_12-01.sql?raw';
import schemaMig2 from '../../../sql/SCHEMA_EDIT_2026-02-23_21-03.sql?raw';
import schemaMig3 from '../../../sql/SCHEMA_EDIT_2026-02-23_23-03.sql?raw';
import schemaMig4 from '../../../sql/SCHEMA_EDIT_2026-02-24_17-44.sql?raw';

// ── Helper ───────────────────────────────────────────────────────────────────
// Parses a SQL script into individual statements, correctly handling -- comments
// (which are line-terminated and must be stripped BEFORE collapsing newlines).

function splitSQL(script: string): string[] {
    // Quote-aware SQL splitter.
    // - Handles -- line comments ONLY when outside a string literal
    // - Handles '' escaped quotes inside strings
    // - Skips PRAGMA / BEGIN / COMMIT (Miniflare manages transactions)
    const statements: string[] = [];
    let current = '';
    let inString = false;

    for (let i = 0; i < script.length; i++) {
        const ch = script[i];

        if (inString) {
            if (ch === "'") {
                if (script[i + 1] === "'") {
                    // Escaped '' quote — keep both chars
                    current += "''";
                    i++;
                } else {
                    inString = false;
                    current += ch;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === "'") {
                inString = true;
                current += ch;
            } else if (ch === '-' && script[i + 1] === '-') {
                // Line comment outside string — skip to end of line
                while (i < script.length && script[i] !== '\n') i++;
            } else if (ch === ';') {
                const stmt = current.trim();
                if (
                    stmt.length > 0 &&
                    !stmt.toUpperCase().startsWith('PRAGMA') &&
                    !stmt.toUpperCase().startsWith('BEGIN') &&
                    !stmt.toUpperCase().startsWith('COMMIT')
                ) {
                    statements.push(stmt);
                }
                current = '';
            } else {
                current += ch;
            }
        }
    }

    return statements;
}

async function execScript(script: string, throwOnError = false): Promise<void> {
    for (const stmt of splitSQL(script)) {
        try {
            await env.DB.prepare(stmt).run();
        } catch (err: Error | any) {
            // For schema: silently ignore "already exists" type errors
            if (!throwOnError) continue;
            // For seeds: only ignore DELETE on non-existent tables
            if (stmt.toUpperCase().startsWith('DELETE') && err.message?.includes('no such table')) continue;
            // Anything else is a real error
            console.error('[setup] SQL error:', err.message?.slice(0, 200));
            console.error('[setup] Statement:', stmt.slice(0, 200));
            throw err;
        }
    }
}

// ── 1. Apply schema (in order) ───────────────────────────────────────────────

await execScript(schemaInit);
await execScript(schemaMig1);
await execScript(schemaMig2);
await execScript(schemaMig3);
await execScript(schemaMig4);

// ── 2. Seed data ─────────────────────────────────────────────────────────────

await execScript(buildSQL(), true);

