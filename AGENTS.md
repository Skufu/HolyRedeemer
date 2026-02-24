# AGENTS.md - Development Guide for Agentic Coding

**Generated:** 2026-02-25 | **Branch:** main

Holy Redeemer Library Management System - Go 1.24 backend + React 18.3 frontend for school library circulation.

## STRUCTURE

```
HolyRedeemer/
├── backend/               # Go 1.24 + Gin REST API
│   ├── cmd/server/        # Entry point (main.go)
│   └── internal/          # Private packages
│       ├── handlers/      # HTTP handlers (fat - business logic here)
│       ├── database/      # Migrations + SQL queries for sqlc
│       ├── repositories/  # Generated sqlc code (DO NOT EDIT)
│       ├── middleware/    # Auth, CORS, logging
│       ├── cache/         # In-memory caching layer
│       ├── utils/         # JWT, password, QR code utilities
│       └── testutil/      # Test helpers
├── frontend/              # React 18.3 + TypeScript 5.8 + Vite
│   └── src/
│       ├── services/      # Axios API layer
│       ├── hooks/         # TanStack Query wrappers
│       ├── pages/         # Role-based: admin/, librarian/, student/
│       ├── components/    # UI components (shadcn/ui in ui/)
│       └── test/          # Test setup and utilities
├── docs/                  # Project documentation
└── setup_and_run.sh       # One-command setup script
```

## COMMANDS

### Quick Start
```bash
./setup_and_run.sh --setup    # First time setup (DB + deps + migrations)
./setup_and_run.sh --run      # Start both backend + frontend
./setup_and_run.sh --seed     # Reset DB with seed data
```

### Backend (Go)
```bash
cd backend

# Development
make dev                      # Hot reload with Air (port 8080)
make run                      # Build + run

# Testing
make test                     # Run all tests
make test TEST_FLAGS="-v"     # Run all tests with verbose output
go test ./... -run TestName   # Run single test by name
go test -v ./internal/handlers/... -run TestCheckout  # Run specific test

# Code Quality
make fmt                      # Format with gofmt
make lint                     # Run golangci-lint
make tidy                     # Tidy go.mod

# Database
make sqlc                     # Regenerate sqlc after SQL changes
make migrate-up               # Apply pending migrations
make migrate-down             # Rollback one migration
make migrate-create name=xyz  # Create new migration
make reset-db                 # Drop + remigrate (DESTRUCTIVE)
```

### Frontend (TypeScript/React)
```bash
cd frontend

# Development
npm run dev                   # Dev server (port 4127)
npm run build                 # Production build
npm run preview               # Preview production build

# Testing
npm run test                  # Run vitest in watch mode
npm run test:run              # Run tests once
npm run test:run -- src/services/auth.test.ts   # Run single test file
npm run test:run -- --reporter=verbose          # Verbose output
npm run test:coverage         # Run with coverage report
npm run test:e2e              # Run Playwright E2E tests
npm run test:e2e:ui           # Run E2E tests with UI

# Code Quality
npm run lint                  # Run ESLint
```

## CODE STYLE GUIDELINES

### Go (Backend)

#### Imports
```go
import (
    // Standard library
    "context"
    "fmt"
    "time"
    
    // Third-party
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgtype"
    
    // Internal (grouped by module)
    "github.com/holyredeemer/library-api/internal/repositories/sqlcdb"
    "github.com/holyredeemer/library-api/pkg/response"
)
```

#### Naming Conventions
- **Files**: snake_case.go (e.g., `circulation.go`)
- **Structs**: PascalCase (e.g., `BookHandler`, `CheckoutRequest`)
- **Interfaces**: PascalCase with -er suffix (e.g., `BookRepository`)
- **Methods**: PascalCase for exported, camelCase for private
- **Variables**: camelCase (e.g., `studentID`, `bookCount`)
- **Constants**: PascalCase for exported, camelCase for private
- **SQL Enums**: UPPER_SNAKE_CASE in DB, PascalCase in Go

#### Error Handling
```go
// Always handle errors explicitly
if err != nil {
    response.InternalError(c, "Failed to fetch books")
    return
}

// Use specific response helpers
response.Success(c, data, "message")
response.SuccessWithMeta(c, data, meta)
response.BadRequest(c, "validation failed")
response.NotFound(c, "book not found")
response.Unauthorized(c, "invalid credentials")
response.Forbidden(c, "insufficient permissions")
```

#### Type Conversions (Required)
```go
// Always use helpers for pgtype conversions
toPgUUID(uuid.UUID) pgtype.UUID
fromPgUUID(pgtype.UUID) uuid.UUID
toPgText(string) pgtype.Text
fromPgText(pgtype.Text) string
toPgNumeric(float64) pgtype.Numeric
toPgDate(time.Time) pgtype.Date
toPgTimestamp(time.Time) pgtype.Timestamp
fromPgTimestamp(pgtype.Timestamp) time.Time
```

### TypeScript/React (Frontend)

#### Imports
```typescript
// React and libraries first
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Internal with @/ alias
import { api, ApiResponse, getErrorMessage } from '@/services/api';
import { booksService, Book } from '@/services/books';
```

#### Naming Conventions
- **Files**: camelCase.ts for utilities, PascalCase.tsx for components
- **Components**: PascalCase (e.g., `BookCard`, `StudentList`)
- **Hooks**: camelCase starting with "use" (e.g., `useBooks`, `useStudent`)
- **Services**: camelCase ending with "Service" (e.g., `booksService`)
- **Interfaces**: PascalCase (e.g., `Book`, `StudentProfile`)
- **Types**: PascalCase (e.g., `BookStatus`, `UserRole`)
- **Enums**: PascalCase for keys (e.g., `status: 'active' | 'inactive'`)

#### Error Handling
```typescript
import { getErrorMessage } from '@/services/api';

try {
  await booksService.create(data);
} catch (error) {
  const message = getErrorMessage(error);
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
}
```

#### Service Pattern
```typescript
export const booksService = {
  list: async (params?: ListBooksParams): Promise<ApiResponse<Book[]>> => {
    const response = await api.get<ApiResponse<Book[]>>('/books', { params });
    return response.data;
  },
  // ... other methods
};
```

## CRITICAL PATTERNS

### Go Transactions (MANDATORY)
```go
tx, err := h.db.Begin(c.Request.Context())
if err != nil {
    response.InternalError(c, "Failed to begin transaction")
    return
defer tx.Rollback(c.Request.Context())

queries := h.queries.WithTx(tx)
// ... all DB operations use queries ...

if err := tx.Commit(c.Request.Context()); err != nil {
    response.InternalError(c, "Failed to commit")
    return
}
```

### Caching Pattern (MANDATORY for read-heavy operations)
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

// Store in cache
h.cache.Set(cacheKey, books, 5*time.Minute)
```

### Frontend Query Keys
```typescript
// Domain-based query keys for proper caching
['books']                    // List
['books', id]               // Single item
['books', params]           // Filtered list
['student-loans', id]       // Related data
['dashboard']               // Dashboard stats
['student-favorites']       // Student favorites
['achievements']            // Gamification
```

## ANTI-PATTERNS

- **NEVER** edit `backend/internal/repositories/sqlcdb/*` - generated by sqlc
- **NEVER** use `as any`, `@ts-ignore`, `@ts-expect-error` in TypeScript
- **NEVER** ignore transaction errors with `_ =`
- **NEVER** commit `.env` files
- **NEVER** put business logic in SQL queries - keep in handlers
- **NEVER** use inline styles in React - use Tailwind classes
- **NEVER** call `h.queries` directly in transactional code
- **NEVER** cache without cache invalidation strategy

## TESTING

### Go Tests
```bash
# Run all handler tests
go test ./internal/handlers/... -v

# Run single test
go test ./internal/handlers/... -run TestCheckout -v

# Run with coverage
go test ./... -cover
```

### Frontend Tests
```bash
# Run specific test file
npm run test:run -- src/services/auth.test.ts

# Run tests matching pattern
npm run test:run -- --grep "login"

# Debug mode
npm run test -- --reporter=verbose

# E2E tests
npm run test:e2e
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `backend/internal/handlers/` | Create handler, add route in main.go |
| Add SQL query | `backend/internal/database/queries/*.sql` | Run `make sqlc` after |
| Add frontend page | `frontend/src/pages/{role}/` | Add route in App.tsx |
| Add API service | `frontend/src/services/` | Add hook in `hooks/` |
| Modify auth | `backend/internal/middleware/auth.go` | JWT logic here |
| Change fine rules | `backend/internal/handlers/circulation.go` | Fine calc embedded |
| QR code format | `backend/internal/utils/qr_code.go` | Format: `HR-{id[:8]}-C{n}` |
| Cache management | `backend/internal/cache/cache.go` | In-memory cache |
| Admin handlers | `backend/internal/handlers/admins.go` | Admin CRUD operations |
| Student features | `backend/internal/handlers/students.go` | Favorites, achievements |

## ENVIRONMENT

```bash
# Frontend (.env)
VITE_API_URL=http://localhost:8080

# Backend (.env)
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5433/library_dev?sslmode=disable
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGINS=http://localhost:4127,http://localhost:3000,http://localhost:5173
```

## NOTES

- Docker PostgreSQL runs on port **5433** (not 5432) to avoid conflicts
- QR format: `HR-{book_id[:8]}-C{copy_number}` (e.g., `HR-a1b2c3d4-C1`)
- Date format: Backend `"2006-01-02"`, Frontend `date-fns`
- Demo creds: admin/admin123, librarian/lib123, student001/student123
- Ports: Frontend 4127, Backend 8080, PostgreSQL 5433
- Go version: 1.24.1
- React version: 18.3.1
- TypeScript version: 5.8.3
- Cache invalidation: Call `POST /api/v1/cache/clear` as super_admin when needed
