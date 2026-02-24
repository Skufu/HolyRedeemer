# Architecture Overview

Quick reference for the Holy Redeemer Library API codebase structure, patterns, and conventions.

---

## Directory Structure

```
holy-redeemer-api/
├── cmd/server/main.go          # Entry point, router setup
├── internal/
│   ├── config/config.go        # Environment configuration
│   ├── cache/
│   │   └── cache.go            # In-memory caching layer
│   ├── database/
│   │   ├── db.go               # PostgreSQL connection pool
│   │   ├── migrations/         # Goose SQL migrations
│   │   └── queries/            # sqlc query definitions
│   ├── handlers/               # HTTP request handlers
│   │   ├── auth.go             # Login, logout, refresh, RFID
│   │   ├── books.go            # Book CRUD, copies, categories
│   │   ├── students.go         # Student CRUD, loans, history, favorites, achievements
│   │   ├── circulation.go      # Checkout, return, renew
│   │   ├── fines.go            # Fine management, payments
│   │   ├── reports.go          # Dashboard, charts, activity
│   │   ├── librarians.go       # Librarian management
│   │   ├── admins.go           # Admin management
│   │   ├── notifications.go    # Notification management
│   │   ├── requests.go         # Book requests
│   │   ├── settings.go         # Library settings
│   │   ├── audit.go            # Audit logs
│   │   ├── cache_admin.go      # Cache management
│   │   └── helpers.go          # pgtype conversion utilities
│   ├── middleware/
│   │   ├── auth.go             # JWT authentication
│   │   ├── cors.go             # CORS configuration
│   │   └── logging.go          # Request logging
│   ├── repositories/sqlcdb/    # Generated sqlc code
│   ├── testutil/               # Test utilities, fixtures
│   └── utils/
│       ├── jwt.go              # Token generation/validation
│       ├── password.go         # bcrypt hashing
│       └── qr_code.go          # QR code generation
├── pkg/response/response.go    # Standardized API responses
└── sqlc.yaml                   # sqlc configuration
```

---

## Key Patterns

### Handler Pattern

All handlers follow this structure:

```go
type XxxHandler struct {
    queries *sqlcdb.Queries
    db      *pgxpool.Pool       // For transactions
    config  *config.Config      // Optional, for circulation
    cache   *cache.Cache        // Optional, for caching
}

func NewXxxHandler(q *sqlcdb.Queries, db *pgxpool.Pool, cfg *config.Config, cache *cache.Cache) *XxxHandler {
    return &XxxHandler{queries: q, db: db, config: cfg, cache: cache}
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
response.SuccessWithMeta(c, data, meta)
response.Created(c, data, "message")
response.BadRequest(c, "error message")
response.Unauthorized(c, "error message")
response.Forbidden(c, "error message")
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
| `admins` | Admin profiles | user_id, name |
| `books` | Book catalog | title, author, isbn, category_id |
| `book_copies` | Physical copies | book_id, qr_code, status, condition |
| `categories` | Book categories | name, color_code |
| `transactions` | Circulation | student_id, copy_id, checkout_date, due_date |
| `fines` | Fine records | transaction_id, student_id, amount, status |
| `payments` | Payment records | fine_id, amount, payment_method |
| `notifications` | In-app alerts | user_id, type, title, message |
| `book_requests` | Reservations | student_id, book_id, status |
| `student_favorites` | Bookmarked books | student_id, book_id |
| `achievements` | Gamification badges | name, description, icon |
| `library_settings` | System config | key, value, category |
| `audit_logs` | Security trail | user_id, action, entity_type, old/new values |

### Enums

```sql
-- user_role: super_admin, admin, librarian, student
-- user_status: active, inactive, suspended
-- student_status: active, inactive, graduated, transferred, suspended
-- book_status: active, discontinued, archived
-- copy_status: available, borrowed, damaged, lost, reserved, retired
-- copy_condition: excellent, good, fair, poor
-- transaction_status: borrowed, returned, overdue, lost
-- fine_status: pending, partial, paid, waived
-- request_status: pending, approved, rejected, fulfilled, cancelled
-- notification_type: due_reminder, overdue, fine, request_update, system
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

| Role | Books | Students | Circulation | Fines | Reports | Settings | Admins |
|------|-------|----------|-------------|-------|---------|----------|--------|
| super_admin | Full | Full | Full | Full | Full | Full | Full |
| admin | Full | Full | Full | Full | Full | Full | View |
| librarian | Full | Read | Full | Full | Full | None | None |
| student | Read | Self | Self | Self | None | None | None |

---

## API Route Groups

```go
// Public routes
router.GET("/health")
router.GET("/healthz")
router.POST("/auth/login")
router.POST("/auth/refresh")

// Protected routes (require JWT)
api := router.Group("/api/v1", authMiddleware)

// Staff routes (admin + librarian)
staff := api.Group("", requireRoles("admin", "librarian"))

// Admin only routes
admin := api.Group("", requireRoles("admin", "super_admin"))

// Super admin only routes
superAdmin := api.Group("", requireRoles("super_admin"))
```

---

## Caching Strategy

### When to Use Cache

- Read-heavy operations (book lists, dashboard stats)
- Expensive queries (reports, aggregations)
- Static reference data (categories, settings)

### Cache Pattern

```go
// Check cache first
cacheKey := fmt.Sprintf("books:list:%s", paramsHash)
if cached, found := h.cache.Get(cacheKey); found {
    response.Success(c, cached, "Books retrieved from cache")
    return
}

// Fetch from DB
books, err := h.queries.ListBooks(ctx, params)
// ... process ...

// Store in cache (5 minute TTL)
h.cache.Set(cacheKey, books, 5*time.Minute)
```

### Cache Invalidation

```bash
# Clear all cache (super_admin only)
POST /api/v1/cache/clear
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
| Notifications | `queries/notifications.sql` | `handlers/notifications.go` |
| Settings | `queries/settings.sql` | `handlers/settings.go` |
| Audit logs | `queries/audit_logs.sql` | `handlers/audit.go` |
| Librarians | `queries/librarians.sql` | `handlers/librarians.go` |
| Admins | `queries/admins.sql` | `handlers/admins.go` |
| Requests | `queries/requests.sql` | `handlers/requests.go` |

---

## Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./internal/...

# Run specific package
go test -v ./internal/utils/...

# Run specific test
go test -v ./internal/handlers/... -run TestCheckout
```

### Test Files

- `internal/utils/jwt_test.go` - Token tests
- `internal/utils/password_test.go` - Hashing tests
- `internal/config/config_test.go` - Config validation tests
- `internal/handlers/auth_test.go` - Auth handler tests
- `internal/handlers/students_test.go` - Student handler tests
- `internal/testutil/testutil.go` - Test fixtures

---

## Configuration Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | string | 8080 | Server port |
| DATABASE_URL | string | - | PostgreSQL URL |
| JWT_ACCESS_SECRET | string | - | Access token secret (min 32 chars) |
| JWT_REFRESH_SECRET | string | - | Refresh token secret (min 32 chars) |
| JWT_ACCESS_EXPIRY | duration | 15m | Access token lifetime |
| JWT_REFRESH_EXPIRY | duration | 168h | Refresh token lifetime |
| CORS_ORIGINS | string | * | Comma-separated origins |
| DEFAULT_LOAN_DAYS | int | 14 | Loan period |
| DEFAULT_MAX_BOOKS | int | 5 | Max concurrent loans |
| DEFAULT_FINE_PER_DAY | float | 5.0 | Daily fine rate |
| DEFAULT_GRACE_PERIOD | int | 3 | Grace period before fines |
| DEFAULT_MAX_FINE_CAP | float | 200.0 | Maximum fine per book |
| DEFAULT_BLOCK_THRESHOLD | float | 100.0 | Fine amount that blocks borrowing |

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

---

## Tech Stack Summary

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Go | 1.24.1 |
| Framework | Gin | 1.11.0 |
| Database | PostgreSQL | 15 |
| Query Builder | sqlc | latest |
| Migrations | goose | latest |
| Auth | JWT | v5 |
| Password Hash | bcrypt | latest |
| Testing | testify | latest |

---

## Ports

| Service | Port | Notes |
|---------|------|-------|
| Backend API | 8080 | Main application server |
| Frontend | 4127 | Vite dev server |
| PostgreSQL | 5433 | Docker (not 5432 to avoid conflicts) |

---

## Notes

- QR format: `HR-{book_id[:8]}-C{copy_number}` (e.g., `HR-a1b2c3d4-C1`)
- Date format: Backend `"2006-01-02"`, Frontend `date-fns`
- Demo creds: admin/admin123, librarian/lib123, student001/student123
- Cache clear endpoint: `POST /api/v1/cache/clear` (super_admin only)
- All monetary values stored as `NUMERIC` in PostgreSQL
- All UUIDs use `github.com/google/uuid` (not pgtype.UUID directly)
