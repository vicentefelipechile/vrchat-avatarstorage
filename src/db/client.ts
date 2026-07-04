// =========================================================================================================
// DB CLIENT HELPERS
// =========================================================================================================
// Thin, typed helpers over the raw D1 binding. Repositories use these instead of
// touching `c.env.DB.prepare(...)` directly, so the SQL surface is uniform and
// single-row / list / write semantics read the same everywhere.
//
// This is deliberately NOT an ORM. It is a set of ergonomic wrappers that keep
// prepared statements and bindings together and return well-typed results.
// =========================================================================================================

// =========================================================================================================
// Types
// =========================================================================================================

/** Anything a repository accepts to run queries — always the D1 binding. */
export type DB = D1Database;

// =========================================================================================================
// Query helpers
// =========================================================================================================

/**
 * Fetches a single row or null. Mirrors `.first<T>()` but keeps the bind call
 * co-located so callers never desync the placeholders and params.
 */
export async function queryOne<T>(db: DB, sql: string, params: unknown[] = []): Promise<T | null> {
	return db
		.prepare(sql)
		.bind(...params)
		.first<T>();
}

/**
 * Fetches all matching rows. Returns the array directly (never the D1 wrapper),
 * so callers work with a plain `T[]`.
 */
export async function queryAll<T>(db: DB, sql: string, params: unknown[] = []): Promise<T[]> {
	const { results } = await db
		.prepare(sql)
		.bind(...params)
		.all<T>();
	return results;
}

/**
 * Runs a write (INSERT/UPDATE/DELETE) and returns the D1 metadata (`changes`,
 * `last_row_id`, etc.).
 */
export async function execute(db: DB, sql: string, params: unknown[] = []): Promise<D1Result> {
	return db
		.prepare(sql)
		.bind(...params)
		.run();
}

/**
 * Runs a set of prepared statements atomically in a single D1 batch (transaction).
 * Build statements with `db.prepare(...).bind(...)` and pass the array.
 */
export async function batch(db: DB, statements: D1PreparedStatement[]): Promise<D1Result[]> {
	return db.batch(statements);
}
