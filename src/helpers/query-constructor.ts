// =========================================================================================================
// VRCSTORAGE - Search Query Constructor
// =========================================================================================================
//
// Fluent query builder for dynamic SQL queries on D1 (SQLite) with Cloudflare Workers + Hono.
//
// MOTIVATION:
//   Building dynamic queries by hand means maintaining two parallel arrays (clauses and params)
//   that are easy to desync. This class keeps them together: every .where() call appends
//   both the condition and its bound values atomically.
//
// BASIC USAGE:
//   const { sql, params } = new QueryBuilder('resources', 'r')
//     .select(['r.uuid', 'r.title', 'm.r2_key AS thumbnail_key'])
//     .join('LEFT JOIN media m ON r.thumbnail_uuid = m.uuid')
//     .where('r.is_active = 1')
//     .whereIf(!!category, 'r.category = ?', category)
//     .withFts('resources_fts', 'fts', query, 'r.uuid')
//     .orderBy('r.created_at', 'DESC')
//     .paginate(page, 15)
//     .build();
//
//   const { results } = await c.env.DB.prepare(sql).bind(...params).all();
//
// =========================================================================================================

export class QueryBuilder {
	private _selects: string[] = [];
	private _joins: string[] = [];
	private _wheres: string[] = [];
	private _params: unknown[] = [];
	private _orderBy: string | null = null;
	private _limit: number | null = null;
	private _offset: number | null = null;
	private _hasFts = false;

	constructor(
		private readonly table: string,
		private readonly alias: string,
	) {}

	// -------------------------------------------------------------------------
	// SELECT
	// -------------------------------------------------------------------------

	/**
	 * Columns to select. Can be called multiple times — columns accumulate.
	 *
	 * @example
	 *   .select(['r.uuid', 'r.title', 'm.r2_key AS thumbnail_key'])
	 */
	select(columns: string[]): this {
		this._selects.push(...columns);
		return this;
	}

	// -------------------------------------------------------------------------
	// JOIN
	// -------------------------------------------------------------------------

	/**
	 * Appends a raw JOIN clause (LEFT JOIN, INNER JOIN, etc.).
	 * Called multiple times — joins accumulate in order.
	 *
	 * @example
	 *   .join('LEFT JOIN media m ON r.thumbnail_uuid = m.uuid')
	 *   .join('LEFT JOIN users u ON r.author_uuid = u.uuid')
	 */
	join(clause: string): this {
		this._joins.push(clause);
		return this;
	}

	// -------------------------------------------------------------------------
	// WHERE
	// -------------------------------------------------------------------------

	/**
	 * Appends an unconditional WHERE clause.
	 * Accepts `?` placeholders and their corresponding values.
	 * Multiple calls are joined with AND.
	 *
	 * @example
	 *   .where('r.is_active = 1')
	 *   .where('r.category = ?', category)
	 */
	where(condition: string, ...values: unknown[]): this {
		this._wheres.push(condition);
		this._params.push(...values);
		return this;
	}

	/**
	 * Appends a WHERE clause only if `condition` is true.
	 * Designed for optional query param filters — if the param is absent,
	 * the clause is simply skipped without any branching in your route handler.
	 *
	 * @example
	 *   .whereIf(!!category, 'r.category = ?', category)
	 *   .whereIf(!!authorUuid, 'r.author_uuid = ?', authorUuid)
	 */
	whereIf(condition: boolean, clause: string, ...values: unknown[]): this {
		if (condition) {
			this._wheres.push(clause);
			this._params.push(...values);
		}
		return this;
	}

	/**
	 * Enables Full-Text Search using an FTS5 virtual table.
	 *
	 * Internally this adds a JOIN to the FTS virtual table and a MATCH clause.
	 * When FTS is active, ORDER BY automatically prepends `rank` (FTS5 relevance
	 * score) before the user-defined sort column, so results are ranked by
	 * relevance first.
	 *
	 * NOTE: D1 requires the module name in lowercase — `fts5`, not `FTS5`.
	 *       See fts_schema.sql for the virtual table and trigger definitions.
	 *
	 * @param ftsTable   Name of the FTS5 virtual table (e.g. 'resources_fts')
	 * @param ftsAlias   Alias to use in the JOIN (e.g. 'fts')
	 * @param query      Raw search string from the `q` query param
	 * @param idColumn   Column on the main alias to JOIN against (e.g. 'r.uuid')
	 *
	 * @example
	 *   .withFts('resources_fts', 'fts', query, 'r.uuid')
	 *   // Generates: JOIN resources_fts fts ON fts.uuid = r.uuid
	 *   //            WHERE fts MATCH '"search term"'
	 */
	withFts(ftsTable: string, ftsAlias: string, query: string, idColumn: string): this {
		this._hasFts = true;

		// FTS JOIN goes first so rank is available for ORDER BY
		this._joins.unshift(`JOIN ${ftsTable} ${ftsAlias} ON ${ftsAlias}.uuid = ${idColumn}`);
		this._wheres.push(`${ftsAlias} MATCH ?`);
		this._params.push(this._sanitizeFtsQuery(query));

		return this;
	}

	/**
	 * Sanitizes raw user input for FTS5 MATCH queries.
	 *
	 * FTS5 has its own query language where characters like `"`, `*`, `-`
	 * carry special meaning. By default this method wraps the input as a
	 * phrase query (double-quoted), which means it matches the exact sequence
	 * of words regardless of FTS5 operators.
	 *
	 * If you want to expose advanced FTS5 operators to the user (AND, OR, NOT,
	 * prefix with `*`), remove the phrase wrapping here and manually strip any
	 * characters you don't want to allow.
	 *
	 * @param raw  Raw string from the user
	 * @returns    FTS5-safe MATCH expression
	 */
	private _sanitizeFtsQuery(raw: string): string {
		// Escape internal double quotes, then wrap as an exact phrase
		const escaped = raw.trim().replace(/"/g, '""');
		return `"${escaped}"`;
	}

	/**
	 * Filters by exact tag names (array).
	 * A resource matches if it has AT LEAST ONE of the given tags (OR semantics).
	 *
	 * If you need AND semantics (resource must have ALL tags), you would need
	 * a GROUP BY / HAVING COUNT(DISTINCT t.name) = tagsList.length approach,
	 * which requires a more complex query structure outside this builder.
	 *
	 * @example
	 *   .tags(['unity', 'quest', 'avatar'])
	 */
	tags(tagsList: string[]): this {
		if (tagsList.length === 0) return this;

		const placeholders = tagsList.map(() => '?').join(', ');
		this._wheres.push(`EXISTS (
            SELECT 1
            FROM resource_tags rt
            JOIN tags t ON rt.tag_id = t.id
            WHERE rt.resource_uuid = r.uuid
              AND t.name IN (${placeholders})
        )`);
		this._params.push(...tagsList);

		return this;
	}

	// -------------------------------------------------------------------------
	// ORDER BY
	// -------------------------------------------------------------------------

	/**
	 * Sets the ORDER BY column and direction. Calling this multiple times
	 * overwrites the previous value.
	 *
	 * IMPORTANT: never interpolate user input directly here — always use a
	 * server-side whitelist to map query param values to actual column names.
	 * See the SORT_COLUMNS constant in the endpoint below.
	 *
	 * When FTS is active, `rank` is automatically prepended to this so results
	 * are sorted by relevance first, then by the specified column as a tiebreaker.
	 *
	 * @example
	 *   .orderBy('r.created_at', 'DESC')
	 */
	orderBy(column: string, direction: 'ASC' | 'DESC' = 'DESC'): this {
		this._orderBy = `${column} ${direction}`;
		return this;
	}

	// -------------------------------------------------------------------------
	// PAGINATION
	// -------------------------------------------------------------------------

	/**
	 * Adds LIMIT and OFFSET based on a 1-indexed page number.
	 *
	 * Uses the +1 trick: requests `limit + 1` rows so the caller can detect
	 * whether a next page exists without running a separate COUNT(*) query.
	 *
	 * The caller is responsible for slicing:
	 *   const hasNextPage = results.length > limit;
	 *   const pageResults = results.slice(0, limit);
	 *
	 * @param page   Current page number (1-indexed)
	 * @param limit  Number of results per page
	 */
	paginate(page: number, limit: number): this {
		this._limit = limit;
		this._offset = (page - 1) * limit;
		return this;
	}

	// -------------------------------------------------------------------------
	// BUILD
	// -------------------------------------------------------------------------

	/**
	 * Assembles and returns the final SQL string and its bound parameters.
	 *
	 * Call this last after chaining all your builder methods.
	 * The returned `params` array is ready to spread into D1's `.bind()`:
	 *   const { sql, params } = qb.build();
	 *   await c.env.DB.prepare(sql).bind(...params).all();
	 *
	 * @throws Error if no columns have been defined via .select()
	 */
	build(): { sql: string; params: unknown[] } {
		if (this._selects.length === 0) {
			throw new Error('QueryBuilder: at least one column must be defined via .select()');
		}

		const select = this._selects.join(',\n    ');
		const from = `${this.table} ${this.alias}`;
		const joins = this._joins.join('\n');
		const where = this._wheres.length > 0 ? `WHERE ${this._wheres.join('\n    AND ')}` : '';

		let orderBy = '';
		if (this._orderBy) {
			// When FTS is active, rank by relevance first, then by the user column
			orderBy = this._hasFts ? `ORDER BY rank, ${this._orderBy}` : `ORDER BY ${this._orderBy}`;
		}

		const limit = this._limit !== null ? `LIMIT  ${this._limit}` : '';
		const offset = this._offset !== null ? `OFFSET ${this._offset}` : '';

		const sql = [`SELECT`, `    ${select}`, `FROM ${from}`, joins, where, orderBy, limit, offset].filter(Boolean).join('\n').trim();

		return { sql, params: this._params };
	}
}

// =========================================================================================================
// Endpoint GET / — Resource search
// =========================================================================================================
//
// Drop-in replacement for the resources.get('/', ...) handler in resources.ts
//
// Supported query params:
//   q          Free-text search (FTS5 MATCH against title and description)
//   category   Category filter  (avatars | worlds | assets | clothes)
//   tags       Comma-separated exact tag names (e.g. "unity,quest")
//   sort_by    Sort column (created_at | download_count | title) — default: created_at
//   sort_order Sort direction (asc | desc) — default: desc
//   page       Page number, 1-indexed — default: 1
//
// =========================================================================================================

/*

// Whitelist of sortable columns.
// Never interpolate user input directly into ORDER BY — use this map instead.
const SORT_COLUMNS: Record<string, string> = {
    created_at:     'r.created_at',
    download_count: 'r.download_count',
    title:          'r.title',
};

resources.get('/', async (c) => {
    const page      = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit     = 15;

    const query     = c.req.query('q')?.trim();
    const category  = c.req.query('category');
    const tagsParam = c.req.query('tags');
    const sortBy    = c.req.query('sort_by');
    const sortOrder = (c.req.query('sort_order') || 'desc').toUpperCase() as 'ASC' | 'DESC';

    const orderColumn = SORT_COLUMNS[sortBy ?? ''] ?? 'r.created_at';

    // Parse comma-separated tags: "unity,quest,avatar" → ['unity', 'quest', 'avatar']
    const tagsList = tagsParam
        ? tagsParam.split(',').map(t => t.trim()).filter(Boolean)
        : [];

    try {
        const qb = new QueryBuilder('resources', 'r')
            .select([
                'r.uuid',
                'r.title',
                'r.description',
                'r.category',
                'r.thumbnail_uuid',
                'r.download_count',
                'r.created_at',
                'm.r2_key     AS thumbnail_key',
                'u.username   AS author_username',
                'u.avatar_url AS author_avatar',
            ])
            .join('LEFT JOIN media m ON r.thumbnail_uuid = m.uuid')
            .join('LEFT JOIN users u ON r.author_uuid = u.uuid')
            .where('r.is_active = 1')
            .whereIf(
                !!category && RESOURCE_CATEGORIES.includes(category as ResourceCategory),
                'r.category = ?',
                category
            )
            .tags(tagsList)
            .orderBy(orderColumn, sortOrder)
            .paginate(page, limit);

        // Only enable FTS when the user actually typed something.
        // Without a query, the search falls back to standard filter + sort.
        if (query) {
            qb.withFts('resources_fts', 'fts', query, 'r.uuid');
        }

        const { sql, params } = qb.build();

        console.log('[Search SQL]',    sql);
        console.log('[Search Params]', params);

        const { results } = await c.env.DB.prepare(sql).bind(...params).all<any>();

        const hasNextPage = results.length > limit;
        const pageResults = hasNextPage ? results.slice(0, limit) : results;

        const mapped = pageResults.map((r: any) => ({
            uuid:           r.uuid,
            title:          r.title,
            description:    r.description,
            category:       r.category,
            thumbnail_uuid: r.thumbnail_uuid,
            thumbnail_key:  r.thumbnail_key,
            download_count: r.download_count,
            timestamp:      r.created_at * 1000,
            author: r.author_username
                ? { username: r.author_username, avatar_url: r.author_avatar }
                : null,
        }));

        return c.json({
            resources: mapped,
            pagination: {
                page,
                hasNextPage,
                hasPrevPage: page > 1,
            },
        });

    } catch (e) {
        console.error('[Search Error]', e);
        return c.json({ error: 'Search failed' }, 500);
    }
});

*/
