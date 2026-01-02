# Contributing to Holy Redeemer Library System

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Go 1.22+
- PostgreSQL 14+ (or Docker)
- Make (optional but recommended)

### Quick Start

```bash
# Clone repository
git clone https://github.com/skufu/HolyRedeemer.git
cd HolyRedeemer/holy-redeemer-api

# Install development tools
make install-tools

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start database (if using Docker)
docker run -d --name library-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=library_dev \
  -p 5432:5432 postgres:14

# Run migrations
make migrate-up

# Seed demo data
make seed

# Start development server
make dev
```

## Code Standards

### Go Style

- Follow [Effective Go](https://go.dev/doc/effective_go)
- Run `make fmt` before committing
- Run `make lint` to check for issues

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

## Project Structure

```
internal/
├── handlers/     # HTTP handlers (add new endpoints here)
├── middleware/   # HTTP middleware
├── database/
│   ├── queries/  # sqlc SQL queries (add new queries here)
│   └── migrations/ # Database migrations
└── utils/        # Utility functions
```

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

## Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated (README, API docs)
- [ ] `make lint` passes
- [ ] `make test` passes
- [ ] Commit messages follow convention

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Include reproduction steps for bugs
