# Contributing to Holy Redeemer Library System

Thank you for your interest in contributing. This guide will help you get started.

## Development Setup

### Prerequisites

- Go 1.24+
- Node.js 18+ and npm
- PostgreSQL 15+ (or Docker)
- Make (optional but recommended)

### Quick Start (Recommended)

Use the setup script for automatic configuration:

```bash
# First time setup
./setup_and_run.sh --setup

# Run the application
./setup_and_run.sh --run

# Reset database with seed data
./setup_and_run.sh --seed
```

### Manual Setup

#### Backend Setup

```bash
cd backend

# Install Go tools
go install github.com/air-verse/air@latest
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start database (if using Docker)
docker run -d --name library-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=library_dev \
  -p 5433:5432 postgres:15

# Run migrations
make migrate-up

# Seed demo data
make seed

# Start development server
make dev
```

Backend will be available at: **http://localhost:8080**

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:4127**

---

## Code Standards

### Go Style

- Follow [Effective Go](https://go.dev/doc/effective_go)
- Run `make fmt` before committing
- Run `make lint` to check for issues
- Use `make sqlc` after modifying SQL queries
- All handlers must use transactions for multi-step operations

### TypeScript/React Style

- Follow the existing component structure
- Use shadcn/ui components where possible
- Run `npm run lint` before committing
- Use TypeScript strict mode
- Prefer functional components with hooks

### Commit Messages

Use conventional commits:

```
feat: add book reservation feature
fix: correct fine calculation for grace period
docs: update API documentation
test: add circulation handler tests
refactor: simplify auth middleware
```

### Branch Naming

```
feature/book-reservations
fix/overdue-calculation
docs/api-updates
```

---

## Project Structure

### Backend

```
backend/
├── cmd/server/           # Application entry point
├── internal/
│   ├── handlers/         # HTTP handlers (add new endpoints here)
│   ├── middleware/       # HTTP middleware
│   ├── database/
│   │   ├── queries/      # sqlc SQL queries (add new queries here)
│   │   └── migrations/   # Database migrations
│   ├── cache/            # In-memory caching
│   └── utils/            # Utility functions
└── pkg/response/         # Standardized API responses
```

### Frontend

```
frontend/
├── src/
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui components
│   ├── pages/            # Page components by role
│   │   ├── admin/
│   │   ├── librarian/
│   │   └── student/
│   ├── services/         # API service layer
│   ├── hooks/            # Custom React hooks
│   └── stores/           # Zustand state stores
```

---

## Adding Features

### 1. New Database Query

Add query to appropriate file in `internal/database/queries/`:

```sql
-- name: GetBooksByAuthor :many
SELECT * FROM books WHERE author ILIKE '%' || $1 || '%';
```

Then regenerate:

```bash
make sqlc
```

### 2. New Migration

```bash
make migrate-create name=add_reservations_table
```

Edit the migration file, then:

```bash
make migrate-up
```

### 3. New Handler

Create or update handler in `internal/handlers/`:

```go
func (h *BookHandler) GetByAuthor(c *gin.Context) {
    author := c.Query("author")
    books, err := h.queries.GetBooksByAuthor(c.Request.Context(), author)
    // ...
}
```

Register route in `cmd/server/main.go`.

### 4. Add Tests

Add tests in `*_test.go` files:

```go
func TestBookHandler_GetByAuthor(t *testing.T) {
    // ...
}
```

Run tests:

```bash
make test
```

### 5. Add Frontend Service

Add to `frontend/src/services/`:

```typescript
export const booksService = {
  getByAuthor: async (author: string) => {
    const response = await api.get('/books', { params: { author } });
    return response.data;
  }
};
```

Add corresponding hook in `frontend/src/hooks/`.

---

## Database Patterns

### Transactions (Required)

Always use transactions for multi-step operations:

```go
tx, err := h.db.Begin(c.Request.Context())
if err != nil {
    response.InternalError(c, "Failed to begin transaction")
    return
}
defer tx.Rollback(c.Request.Context())

queries := h.queries.WithTx(tx)
// ... use queries for all DB operations ...

if err := tx.Commit(c.Request.Context()); err != nil {
    response.InternalError(c, "Failed to commit")
    return
}
```

### Caching (Recommended)

Use caching for read-heavy operations:

```go
cacheKey := fmt.Sprintf("books:list:%s", paramsHash)
if cached, found := h.cache.Get(cacheKey); found {
    response.Success(c, cached, "Books retrieved from cache")
    return
}

// ... fetch from DB ...

h.cache.Set(cacheKey, books, 5*time.Minute)
```

---

## Testing Guidelines

### Backend Tests

```bash
# Run all tests
make test

# Run with coverage
make test TEST_FLAGS="-cover"

# Run specific test
go test ./internal/handlers/... -run TestCheckout -v
```

### Frontend Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

---

## Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated (README, API docs)
- [ ] `make lint` passes (backend)
- [ ] `npm run lint` passes (frontend)
- [ ] `make test` passes (backend)
- [ ] `npm run test:run` passes (frontend)
- [ ] Commit messages follow convention

---

## Environment Variables

### Backend (.env)

```env
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5433/library_dev?sslmode=disable
JWT_ACCESS_SECRET=your-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-here-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h
CORS_ORIGINS=http://localhost:4127,http://localhost:3000
DEFAULT_LOAN_DAYS=14
DEFAULT_MAX_BOOKS=5
DEFAULT_FINE_PER_DAY=5.0
DEFAULT_GRACE_PERIOD=3
DEFAULT_MAX_FINE_CAP=200.0
DEFAULT_BLOCK_THRESHOLD=100.0
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# View database logs
docker logs library-db

# Reset database (DESTRUCTIVE)
make reset-db
```

### Backend Issues

```bash
# Rebuild and run
make clean && make run

# Check for linting errors
make lint

# Regenerate sqlc after query changes
make sqlc
```

### Frontend Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for linting errors
npm run lint
```

---

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Include reproduction steps for bugs
- For security issues, please contact the maintainers directly

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `admin123` |
| Librarian | `librarian` | `lib123` |
| Student | `student001` | `student123` |

---

## Resources

- [API Documentation](../api/API.md)
- [Architecture Overview](../architecture/ARCHITECTURE.md)
- [Database Schema](../../DATABASE_SCHEMA.md)

---

Thank you for contributing to Holy Redeemer Library Management System.
