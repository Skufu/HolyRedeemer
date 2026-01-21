# AGENTS.md - Database Layer

SQL definitions + sqlc code generation. Migrations via goose.

## STRUCTURE

```
database/
├── migrations/           # goose SQL migrations
│   ├── 001_init_schema.sql    # Tables, types, indexes, triggers
│   └── 002_seed_data.sql      # Categories, settings, admin user
├── queries/              # sqlc query definitions
│   ├── books.sql
│   ├── students.sql
│   ├── transactions.sql
│   ├── fines.sql
│   ├── copies.sql
│   ├── users.sql
│   ├── reports.sql
│   ├── settings.sql
│   ├── notifications.sql
│   ├── requests.sql
│   └── audit.sql
└── connection.go         # DB connection setup
```

## WORKFLOW

1. Edit `.sql` file in `queries/`
2. Run `make sqlc` from backend/
3. Generated code appears in `../repositories/sqlcdb/`
4. Use in handlers via `h.queries.YourQuery(ctx, params)`

## QUERY SYNTAX

```sql
-- name: GetBookByID :one
SELECT * FROM books WHERE id = $1;

-- name: ListBooks :many
SELECT * FROM books WHERE status = 'active' ORDER BY title LIMIT $1 OFFSET $2;

-- name: CreateBook :one
INSERT INTO books (title, author, isbn) VALUES ($1, $2, $3) RETURNING *;

-- name: UpdateBook :exec
UPDATE books SET title = $1 WHERE id = $2;

-- name: DeleteBook :exec
UPDATE books SET status = 'archived' WHERE id = $1;
```

## MIGRATIONS

```bash
make migrate-up      # Apply pending migrations
make migrate-down    # Rollback one migration
make reset-db        # Drop schema + reapply all
```

New migration:
```bash
make migrate-create name=add_new_table
```

## ANTI-PATTERNS

- **NEVER** edit files in `../repositories/sqlcdb/` - they're generated
- **NEVER** put business logic in SQL (calculations, conditionals)
- **NEVER** use raw SQL in handlers - always use sqlc queries

## KEY TABLES

| Table | Purpose |
|-------|---------|
| `users` | Auth accounts (all roles) |
| `students` | Student profiles + RFID |
| `books` | Book catalog |
| `book_copies` | Physical copies with QR |
| `transactions` | Checkout/return records |
| `fines` | Overdue/damage fines |
| `payments` | Fine payment history |
