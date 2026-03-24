# Holy Redeemer Library Management System - Backend API

A robust Go-based REST API for school library management, featuring JWT authentication, role-based access control, comprehensive circulation management, and in-memory caching.

## Documentation

- [API Reference](../docs/api/API.md)
- [Architecture Overview](../docs/architecture/ARCHITECTURE.md)
- [Database Schema](../DATABASE_SCHEMA.md)
- [Contributing Guide](../docs/guides/CONTRIBUTING.md)

## Quick Start

### Using Setup Script (Recommended)

```bash
# From project root
./setup_and_run.sh --setup   # First time setup
./setup_and_run.sh --run     # Start both backend + frontend
```

### Manual Setup

```bash
cd backend

# Copy environment file
cp .env.example .env
# Edit .env with your database URL and secrets (min 32 chars for JWT)

# Install tools
make install-tools

# Run migrations
make migrate-up

# Seed demo data
make seed

# Start development server
make dev
```

## Requirements

- Go 1.24+
- PostgreSQL 15+ (or Neon serverless)
- sqlc (installed via `make install-tools`)
- goose (installed via `make install-tools`)
- air (installed via `make install-tools`)

## Project Structure

```
backend/
├── cmd/server/           # Application entry point
├── internal/
│   ├── config/           # Configuration management
│   ├── database/         # Database connection & migrations
│   │   ├── migrations/   # SQL migration files
│   │   └── queries/      # sqlc query definitions
│   ├── handlers/         # HTTP request handlers
│   ├── middleware/       # Auth, CORS, logging middleware
│   ├── repositories/     # Generated sqlc code
│   ├── cache/            # In-memory caching layer
│   ├── testutil/         # Test utilities & fixtures
│   └── utils/            # JWT, password, QR utilities
├── pkg/response/         # Standardized API responses
├── Makefile              # Build & development commands
└── sqlc.yaml             # sqlc configuration
```

## Authentication

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `admin123` |
| Librarian | `librarian` | `lib123` |
| Student | `student001` | `student123` |

### JWT Tokens

- Access Token: 15 minutes (configurable)
- Refresh Token: 7 days (configurable)
- Secrets: Must be at least 32 characters

Generate secrets:
```bash
openssl rand -base64 32
```

## Development

### Make Commands

```bash
make dev            # Run with hot reload (air)
make run            # Build and run
make build          # Build binary
make test           # Run tests
make lint           # Run linter
make sqlc           # Regenerate sqlc code
make migrate-up     # Apply migrations
make migrate-down   # Rollback migration
make migrate-create name=xyz  # Create migration
make seed           # Seed demo data
make reset-db       # Drop and re-create database (DESTRUCTIVE)
make clean          # Clean build artifacts
make install-tools  # Install development tools
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Server port | No | 8080 |
| DATABASE_URL | PostgreSQL connection string | Yes | - |
| JWT_ACCESS_SECRET | Access token secret (>=32 chars) | Yes | - |
| JWT_REFRESH_SECRET | Refresh token secret (>=32 chars) | Yes | - |
| JWT_ACCESS_EXPIRY | Access token lifetime | No | 15m |
| JWT_REFRESH_EXPIRY | Refresh token lifetime | No | 168h |
| CORS_ORIGINS | Allowed origins (comma-separated) | No | * |
| DEFAULT_LOAN_DAYS | Default loan period | No | 14 |
| DEFAULT_MAX_BOOKS | Max books per student | No | 5 |
| DEFAULT_FINE_PER_DAY | Daily fine rate | No | 5.0 |
| DEFAULT_GRACE_PERIOD | Grace period before fines | No | 3 |
| DEFAULT_MAX_FINE_CAP | Maximum fine per book | No | 200.0 |
| DEFAULT_BLOCK_THRESHOLD | Fine amount that blocks borrowing | No | 100.0 |

## Database

### Migrations

```bash
# Create new migration
make migrate-create name=add_new_table

# Apply migrations
make migrate-up

# Rollback one migration
make migrate-down

# Reset database (DESTRUCTIVE)
make reset-db
```

### Regenerating sqlc Code

After modifying SQL queries:

```bash
make sqlc
```

Generated files go to `internal/repositories/sqlcdb/`.

## Testing

```bash
# Run all tests
make test

# Run with coverage
make test TEST_FLAGS="-cover"

# Run specific package
go test -v ./internal/handlers/...

# Run specific test
go test -v ./internal/handlers/... -run TestCheckout
```

### Test Coverage

Current coverage: ~87% for handlers

## Deployment

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `cd backend && go build -o bin/server ./cmd/server`
4. Set start command: `./backend/bin/server`
5. Add environment variables

### Docker (Database Only)

```bash
docker run -d --name library-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=library_dev \
  -p 5433:5432 postgres:15
```

## API Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| /health | GET | Health check | Public |
| /healthz | GET | Lightweight health check | Public |
| /api/v1/auth/login | POST | Login | Public |
| /api/v1/auth/refresh | POST | Refresh token | Public |
| /api/v1/auth/logout | POST | Logout | Required |
| /api/v1/auth/rfid/lookup | POST | RFID lookup | Required |
| /api/v1/books | GET | List books | Required |
| /api/v1/books | POST | Create book | Staff |
| /api/v1/books/:id | GET | Get book | Required |
| /api/v1/books/:id | PUT | Update book | Staff |
| /api/v1/books/:id | DELETE | Delete book | Admin |
| /api/v1/circulation/checkout | POST | Checkout book | Staff |
| /api/v1/circulation/return | POST | Return book | Staff |
| /api/v1/circulation/renew | POST | Renew loan | Required |
| /api/v1/students | GET | List students | Staff |
| /api/v1/students/:id | GET | Get student | Required |
| /api/v1/reports/dashboard | GET | Dashboard stats | Required |
| /api/v1/cache/clear | POST | Clear cache | Super Admin |

See [API Reference](../docs/api/API.md) for complete documentation.

## Caching

The API uses an in-memory cache for performance optimization:

- Book lists
- Dashboard statistics
- Reports and analytics
- Settings

Cache can be cleared via: `POST /api/v1/cache/clear` (super_admin only)

## License

MIT License

## Contributing

Please see [Contributing Guide](../docs/guides/CONTRIBUTING.md) for development setup and guidelines.
