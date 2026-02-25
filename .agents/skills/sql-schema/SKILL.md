---
name: SQL Schema Migrations
description: Guidelines for managing database schema migrations in the VRCStorage project.
---

# SQL Schema Migrations

This project uses a file-based SQL migration system to manage database schema changes. The system is designed to be **idempotent**, meaning each migration runs only once, even if executed multiple times.

## File Structure

```
sql/
├── SCHEMA_INIT.sql                    # Initial base schema
├── SCHEMA_EDIT_AAAA-MM-DD_HH-MM.sql   # Incremental changes
└── ...
```

### Naming Conventions

- **SCHEMA_INIT.sql**: Contains all base tables. Runs first.
- **SCHEMA_EDIT_AAAA-MM-DD_HH-MM.sql**: Each subsequent change is saved in a separate file where:
  - `AAAA`: Year (4 digits)
  - `MM`: Month (2 digits)
  - `DD`: Day (2 digits)
  - `HH`: Hour (2 digits)
  - `MM`: Minutes (2 digits)

## Why This System?

### 1. Idempotency
Each ALTER/CREATE file runs once. Cloudflare D1 handles this automatically - if a migration was already applied, it is skipped.

### 2. Visible History
You can see exactly what changes were made and when by looking at the file names.

### 3. Easy Rollback
If you need to revert a change, it's easy to identify which file contains which change.

### 4. D1 Compatible
Wrangler executes migrations in alphabetical order automatically.

## How to Create a New Migration

### Step 1: Create the File

Create a new file in the `sql/` directory with the appropriate name:

```bash
# Example: Change made on February 25, 2026 at 14:30
sql/SCHEMA_EDIT_2026-02-25_14-30.sql
```

### Step 2: Write the SQL

```sql
-- ============================================================================
-- SCHEMA EDIT 2026-02-25 14:30
-- ============================================================================
-- Brief description of the change
-- ============================================================================

-- Example: Add new column
ALTER TABLE users ADD COLUMN new_column TEXT;
```

### Step 3: Apply the Migration

```bash
# For local development
npx wrangler d1 migrations apply DB --local

# For production
npx wrangler d1 migrations apply DB
```

## Rules

1. **DO NOT use `IF NOT EXISTS` for ALTER TABLE**: D1 already handles this. If the column exists, the migration will fail but can be ignored.

2. **Always include comments**: Explain what each change does.

3. **Chronological order**: Files must be named in chronological order so they execute in the correct order.

4. **One migration per change**: It's better to have many small files than one large one.

5. **Keep schema.sql updated**: Update `schema.sql` as a visual reference (but not for migrations).

## Technical Notes

### SQL Statement Types

- **CREATE TABLE**: Create new tables
- **ALTER TABLE ADD COLUMN**: Add columns to existing tables
- **CREATE INDEX**: Create indexes for performance

### SQLite/D1 Considerations

- Does not support all standard SQL features
- FTS5 can cause problems (avoid if possible)
- Transactions work in a limited way

## References

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler Migrations](https://developers.cloudflare.com/d1/migrations/)
