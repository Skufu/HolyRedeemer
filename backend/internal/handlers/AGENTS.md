# AGENTS.md - Backend Handlers

Business logic layer. Fat handlers pattern (no service layer).

## STRUCTURE

```
handlers/
├── auth.go          # Login, logout, refresh, RFID lookup
├── books.go         # Book + copy CRUD, QR generation
├── circulation.go   # Checkout, return, renew (COMPLEX)
├── fines.go         # Fine management, payments
├── students.go      # Student CRUD, loans, history (COMPLEX)
├── librarians.go    # Librarian accounts
├── reports.go       # Dashboard stats, charts
├── notifications.go # User notifications
├── settings.go      # Library settings
├── audit.go         # Audit log queries
└── *_test.go        # Test files
```

## CONVENTIONS

### Handler Pattern
```go
type BookHandler struct {
    queries *sqlcdb.Queries
    db      *pgxpool.Pool  // REQUIRED for transactions
    config  *config.Config
}

func NewBookHandler(q *sqlcdb.Queries, db *pgxpool.Pool, cfg *config.Config) *BookHandler {
    return &BookHandler{queries: q, db: db, config: cfg}
}
```

### Response Pattern
```go
response.Success(c, data, "message")
response.SuccessWithMeta(c, data, meta)
response.BadRequest(c, "error message")
response.NotFound(c, "not found")
response.InternalError(c, "failed")
```

### Type Conversions
```go
toPgUUID(uuid.UUID) pgtype.UUID
fromPgUUID(pgtype.UUID) uuid.UUID
toPgText(string) pgtype.Text
fromPgText(pgtype.Text) string
toPgNumeric(float64) pgtype.Numeric
```

## TRANSACTIONS (CRITICAL)

Multi-step operations MUST use transactions:

```go
tx, err := h.db.Begin(c.Request.Context())
if err != nil {
    response.InternalError(c, "Failed to begin transaction")
    return
}
defer tx.Rollback(c.Request.Context())

queries := h.queries.WithTx(tx)
// ... operations with queries ...

if err := tx.Commit(c.Request.Context()); err != nil {
    response.InternalError(c, "Failed to commit")
    return
}
```

**Required for:** Checkout, Return, Renew, CreateBook+Copies

## ANTI-PATTERNS

- **NEVER** use `_ =` to ignore errors in transactions
- **NEVER** call `h.queries` directly in transactional code (use `queries := h.queries.WithTx(tx)`)
- **NEVER** put complex business logic in SQL - keep in handlers

## HOTSPOTS

| File | Issue | Recommendation |
|------|-------|----------------|
| `circulation.go` L287-329 | Fine calc embedded | Extract to helper |
| `students.go` L665-763 | ReserveBook too complex | Consider service layer |

## TESTING

```bash
go test ./internal/handlers/... -v
go test ./internal/handlers/... -run TestCheckout -v
```

Test files use testify/assert. Mock with testutil package.
