# AGENTS.md - Development Guide for Agentic Coding

This file guides AI agents working on Holy Redeemer Library Management System.

## Quick Reference

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm run dev                    # Start dev server (http://localhost:4127)
npm run test                    # Run Vitest tests (watch mode)
npm run test:run                # Run tests once
npm run test:coverage           # Run tests with coverage
npx vitest run <pattern>        # Run specific test file (e.g., books.test.ts)
npm run lint                    # ESLint
npm run build                   # Production build
```

### Backend (Go + Gin + PostgreSQL)
```bash
cd backend
make dev                        # Hot reload with Air (port 8080)
make test                       # Run all Go tests
go test ./internal/handlers/... -v  # Run tests for specific package
make lint                       # golangci-lint
make fmt                        # go fmt
make sqlc                       # Regenerate sqlc code after query changes
make migrate-up                 # Apply migrations
make migrate-down               # Rollback migration
make migrate-status             # Check migration status
make reset-db                   # Drop schema and re-migrate
```

## Code Style Guidelines

### Frontend (TypeScript/React)
- **Imports**: Use `@/` alias for src: `import { booksService } from '@/services/books';`
- **Naming**: Components PascalCase (`BookCover.tsx`), hooks `useBooks`, services `booksService`, types PascalCase (`Book`)
- **Service Pattern**: Each API domain has service in `src/services/` with methods like `list`, `get`, `create`, `update`, `delete`
- **React Query**: Hooks in `src/hooks/`, queryKey arrays for caching, invalidateQueries on mutations
- **Testing**: Test files co-located (`*.test.ts`), use MSW for mocking, `describe/it/expect` from vitest
- **State**: TanStack Query for server state, Zustand for client state
- **Styling**: Tailwind CSS + shadcn/ui, delegate visual changes to `frontend-ui-ux-engineer`
- **TypeScript**: `noImplicitAny: true`, `strictNullChecks: true`, unused vars allowed
- **Error**: Use `getErrorMessage()` from `services/api`

### Backend (Go + Gin)
- **Packages**: lowercase (`handlers`, `utils`)
- **Handlers**: PascalCase exported functions (`ListBooks`), structs with Handler suffix (`BookHandler`)
- **Database**: Define SQL in `internal/database/queries/*.sql`, run `make sqlc` to generate code
- **Response**: Use `pkg/response` package: `response.Success()`, `response.BadRequest()`, `response.NotFound()`
- **Testing**: `*_test.go` files, use `assert.Equal(t, expected, actual)` from testify
- **Code Quality**: Run `make fmt` before commit, `make lint` (golangci-lint) must pass
- **Database Transactions**: CRITICAL - Always use transactions for multi-step operations (see pattern below)
- **Helper Functions**: Use `toPg*`/`fromPg*` functions from `handlers/helpers.go` for pgtype conversions

## Key Patterns

**Frontend Service Example**:
```typescript
export const booksService = {
  list: async (params?: ListBooksParams): Promise<ApiResponse<Book[]>> => {
    const response = await api.get<ApiResponse<Book[]>>('/books', { params });
    return response.data;
  },
};
```

**Frontend Hook Example**:
```typescript
export const useCreateBook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (book: CreateBookRequest) => booksService.create(book),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Success', description: 'Book created successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};
```

**Backend Handler Example**:
```go
func (h *BookHandler) ListBooks(c *gin.Context) {
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    books, err := h.queries.ListBooks(c.Request.Context(), params)
    if err != nil {
        response.InternalError(c, "Failed to fetch books")
        return
    }
    response.SuccessWithMeta(c, bookResponses, meta)
}
```

**Transactional Operations Pattern (CRITICAL - Use for Multi-Step Operations)**:
```go
type Handler struct {
    queries *sqlcdb.Queries
    db      *pgxpool.Pool  // Required for transactions
}

// Constructor must receive database pool
func NewHandler(queries *sqlcdb.Queries, db *pgxpool.Pool) *Handler {
    return &Handler{queries: queries, db: db}
}

func (h *Handler) MultiStepOperation(c *gin.Context) {
    // Begin transaction
    tx, err := h.db.Begin(c.Request.Context())
    if err != nil {
        response.InternalError(c, "Failed to begin transaction")
        return
    }
    defer tx.Rollback(c.Request.Context())  // Auto-rollback if not committed

    // Use transactional queries
    queries := h.queries.WithTx(tx)

    // Step 1: Create record
    result1, err := queries.CreateSomething(c.Request.Context(), params)
    if err != nil {
        return  // Triggers defer rollback
    }

    // Step 2: Update related record
    err = queries.UpdateSomething(c.Request.Context(), updateParams)
    if err != nil {
        return  // Triggers defer rollback
    }

    // Commit transaction
    if err := tx.Commit(c.Request.Context()); err != nil {
        log.Printf("Failed to commit transaction: %v", err)
        response.InternalError(c, "Failed to complete operation")
        return
    }

    response.Success(c, result1, "Operation completed successfully")
}
```

**When to Use Transactions**: Checkout, Return, Renew, Create Book with copies, any multi-table write.

**Transaction Rules**:
1. Include `*pgxpool.Pool` in handler struct
2. Pass `db.Pool` from `main.go` to constructor
3. Use `defer tx.Rollback(ctx)` after Begin
4. Use `queries.WithTx(tx)` for transactional ops
5. Return on error (triggers rollback)
6. Commit only after all succeed
7. Log commit failures
8. Never ignore errors (no `_ =`)

## Authentication
- Frontend: Access token `localStorage.getItem('lms_access_token')` (15min), refresh token (7 days), auto-refresh on 401 in `services/api.ts`
- Backend: JWT middleware, access token 15min, refresh token 7 days, roles: `super_admin`, `admin`, `librarian`, `student`

## API Response Format
```json
{ "success": true, "data": {...}, "meta": { "page": 1, "total": 100 } }
{ "success": false, "error": { "code": "ERROR", "message": "..." } }
```

## Environment Variables
Frontend: `VITE_API_URL=http://localhost:8080`
Backend: `PORT=8080`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`

## Common Tasks
- Add API: SQL query → `make sqlc` → handler → route → frontend types → frontend service
- Add component: PascalCase file, Tailwind classes, test file if has logic
- Single test: `npx vitest run books.test.ts` (frontend), `go test ./internal/handlers/... -v` (backend)

## Tech Stack
Frontend: React 18, TypeScript 5.8, Vite, Tailwind, shadcn/ui, TanStack Query, Zustand, Vitest, MSW
Backend: Go 1.24, Gin, PostgreSQL, sqlc, JWT, golangci-lint

## Important Notes
- Ports: Frontend 4127, Backend 8080. Never commit `.env` files. Run `make sqlc` after SQL changes
- Use `@/` imports in frontend. Visual changes → delegate to `frontend-ui-ux-engineer`
- QR format: `HR-{book_id_short}-C{copy_number}`. Date format: Backend `"2006-01-02"`, Frontend `date-fns`
