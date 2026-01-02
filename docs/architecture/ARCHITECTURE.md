# Architecture Overview

Quick reference for the Holy Redeemer Library API codebase structure, patterns, and conventions.

---

## Directory Structure

```
holy-redeemer-api/
├── cmd/server/main.go          # Entry point, router setup
├── internal/
│   ├── config/config.go        # Environment configuration
│   ├── database/
│   │   ├── db.go               # PostgreSQL connection pool
│   │   ├── migrations/         # Goose SQL migrations
│   │   └── queries/            # sqlc query definitions
│   ├── handlers/               # HTTP request handlers
│   │   ├── auth.go             # Login, logout, refresh, RFID
│   │   ├── books.go            # Book CRUD, copies, categories
│   │   ├── students.go         # Student CRUD, loans, history
│   │   ├── circulation.go      # Checkout, return, renew
│   │   ├── fines.go            # Fine management, payments
│   │   ├── reports.go          # Dashboard, charts, activity
│   │   └── helpers.go          # pgtype conversion utilities
│   ├── middleware/
│   │   ├── auth.go             # JWT authentication
│   │   ├── cors.go             # CORS configuration
│   │   └── logging.go          # Request logging
│   ├── repositories/sqlcdb/    # Generated sqlc code
│   ├── testutil/               # Test utilities, fixtures
│   └── utils/
│       ├── jwt.go              # Token generation/validation
│       └── password.go         # bcrypt hashing
└── pkg/response/response.go    # Standardized API responses
```

---

## Key Patterns

### Handler Pattern
All handlers follow this structure:
```go
type XxxHandler struct {
    queries *sqlcdb.Queries
    config  *config.Config  // Optional, for circulation
}

func NewXxxHandler(q *sqlcdb.Queries) *XxxHandler {
    return &XxxHandler{queries: q}
}

func (h *XxxHandler) Action(c *gin.Context) {
    // 1. Parse request
    // 2. Validate authorization
    // 3. Execute database query
    // 4. Return response
}
```

### Response Format
All responses use `pkg/response`:
```go
response.Success(c, data, "message")
response.Created(c, data, "message")
response.BadRequest(c, "error message")
response.Unauthorized(c, "error message")
response.NotFound(c, "error message")
response.InternalError(c, "error message")
```

### Type Conversions (pgtype)
Use helpers in `handlers/helpers.go`:
```go
toPgUUID(uuid)             // uuid.UUID → pgtype.UUID
fromPgUUID(pgUUID)         // pgtype.UUID → uuid.UUID
toPgText(string)           // string → pgtype.Text
fromPgText(pgText)         // pgtype.Text → string
toPgTimestamp(time)        // time.Time → pgtype.Timestamp
fromPgTimestamp(ts)        // pgtype.Timestamp → time.Time
toPgDate(time)             // time.Time → pgtype.Date
formatPgDate(d, layout)    // pgtype.Date → formatted string
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Authentication | username, password_hash, role, status |
| `students` | Student profiles | user_id, student_id, grade_level, rfid_code |
| `librarians` | Staff profiles | user_id, employee_id, department |
| `books` | Book catalog | title, author, isbn, category_id |
| `book_copies` | Physical copies | book_id, qr_code, status, condition |
| `categories` | Book categories | name, color_code |
| `transactions` | Circulation | student_id, copy_id, checkout_date, due_date |
| `fines` | Fine records | transaction_id, student_id, amount, status |
| `payments` | Payment records | fine_id, amount, payment_method |

### Enums

```sql
-- user_role: admin, librarian, student
-- user_status: active, inactive, suspended
-- student_status: active, inactive, graduated, suspended
-- book_status: active, discontinued, archived
-- copy_status: available, borrowed, damaged, lost, reserved
-- transaction_status: borrowed, returned, overdue, lost
-- fine_status: pending, partial, paid, waived
```

---

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  /login     │────▶│  Database   │
│             │     │             │     │             │
│             │◀────│ JWT Tokens  │◀────│ User + Hash │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       │ Authorization: Bearer <access_token>
       ▼
┌─────────────┐     ┌─────────────┐
│  Protected  │────▶│ Auth        │
│  Endpoint   │     │ Middleware  │
│             │◀────│ + Claims    │
└─────────────┘     └─────────────┘
```

### Role Permissions

| Role | Books | Students | Circulation | Fines | Reports |
|------|-------|----------|-------------|-------|---------|
| admin | Full | Full | Full | Full | Full |
| librarian | Full | Read | Full | Full | Full |
| student | Read | Self | Self | Self | None |

---

## API Route Groups

```go
// Public routes
router.POST("/login")
router.POST("/refresh")

// Protected routes (require JWT)
api := router.Group("/api/v1", authMiddleware)

// Staff routes (admin + librarian)
staff := api.Group("", requireRoles("admin", "librarian"))

// Admin only routes
admin := api.Group("", requireRoles("admin"))
```

---

## Query Locations

| Feature | Query File | Handler |
|---------|------------|---------|
| User auth | `queries/users.sql` | `handlers/auth.go` |
| Students | `queries/students.sql` | `handlers/students.go` |
| Books | `queries/books.sql` | `handlers/books.go` |
| Copies | `queries/copies.sql` | `handlers/books.go` |
| Transactions | `queries/transactions.sql` | `handlers/circulation.go` |
| Fines | `queries/fines.sql` | `handlers/fines.go` |
| Reports | `queries/reports.sql` | `handlers/reports.go` |

---

## Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./internal/...

# Run specific package
go test -v ./internal/utils/...
```

### Test Files
- `internal/utils/jwt_test.go` - Token tests
- `internal/utils/password_test.go` - Hashing tests
- `internal/testutil/testutil.go` - Test fixtures

---

## Configuration Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | string | 8080 | Server port |
| DATABASE_URL | string | - | PostgreSQL URL |
| JWT_ACCESS_SECRET | string | - | Access token secret |
| JWT_REFRESH_SECRET | string | - | Refresh token secret |
| JWT_ACCESS_EXPIRY | duration | 15m | Access token lifetime |
| JWT_REFRESH_EXPIRY | duration | 168h | Refresh token lifetime |
| CORS_ORIGINS | string | * | Comma-separated origins |
| DEFAULT_LOAN_DAYS | int | 14 | Loan period |
| DEFAULT_MAX_BOOKS | int | 5 | Max concurrent loans |
| DEFAULT_FINE_PER_DAY | float | 5.0 | Daily fine rate |

---

## Common Operations

### Adding a New Endpoint

1. Add SQL query to `internal/database/queries/xxx.sql`
2. Run `make sqlc` to regenerate types
3. Add handler method in `internal/handlers/xxx.go`
4. Register route in `cmd/server/main.go`
5. Update API documentation

### Adding a New Migration

```bash
make migrate-create name=add_new_table
# Edit the new file in internal/database/migrations/
make migrate-up
make sqlc  # If tables changed
```

### Regenerating sqlc Code

```bash
make sqlc
# Files generated to internal/repositories/sqlcdb/
```
