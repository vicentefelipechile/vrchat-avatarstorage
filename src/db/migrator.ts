// =========================================================================================================
// MIGRATION RUNNER
// =========================================================================================================
// A real, versioned migration system to replace `CREATE TABLE IF NOT EXISTS` guessing.
//
// Each migration is an object `{ id, name, up }`. Applied migrations are recorded in
// a `_migrations` table with their id and timestamp, so the runner knows exactly which
// have run and applies only the pending ones, in order, idempotently.
//
// Wrangler's own `d1 migrations` command manages the `.sql` files in migrations/ for
// production. This runner exists so the SAME schema can be applied programmatically in
// tests (against an in-memory / miniflare D1) without shelling out to wrangler — which
// is what makes the per-endpoint tests possible.
// =========================================================================================================

// =========================================================================================================
// Imports
// =========================================================================================================

import type { DB } from './client';

// =========================================================================================================
// Types
// =========================================================================================================

export interface Migration {
	/** Monotonic integer id. Migrations run in ascending id order. */
	id: number;
	/** Human-readable name, stored for auditing. */
	name: string;
	/** One or more SQL statements to apply. Split into an array so each runs as its own statement. */
	up: string[];
}

// =========================================================================================================
// Runner
// =========================================================================================================

async function ensureMigrationsTable(db: DB): Promise<void> {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS _migrations (
				id INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at INTEGER NOT NULL DEFAULT (unixepoch())
			)`,
		)
		.run();
}

async function appliedIds(db: DB): Promise<Set<number>> {
	const { results } = await db.prepare('SELECT id FROM _migrations').all<{ id: number }>();
	return new Set(results.map((r) => r.id));
}

/**
 * Applies all pending migrations in ascending id order. Returns the ids that were
 * applied in this run (empty if the DB was already up to date).
 *
 * Each migration's statements are executed, then its id is recorded in a single
 * batch so a migration is all-or-nothing.
 */
export async function migrate(db: DB, migrations: Migration[]): Promise<number[]> {
	await ensureMigrationsTable(db);
	const done = await appliedIds(db);

	const pending = migrations.filter((m) => !done.has(m.id)).sort((a, b) => a.id - b.id);

	const applied: number[] = [];
	for (const m of pending) {
		const statements = m.up.map((sql) => db.prepare(sql));
		statements.push(db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').bind(m.id, m.name));
		await db.batch(statements);
		applied.push(m.id);
	}

	return applied;
}
