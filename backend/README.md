# Holy Redeemer Library Management System - Backend API

A robust Go-based REST API for school library management, featuring JWT authentication, role-based access control, and comprehensive circulation management.

## 📚 Documentation

- [API Reference](../docs/api/API.md)
- [Architecture Overview](../docs/architecture/ARCHITECTURE.md)
- [Contributing Guide](../docs/guides/CONTRIBUTING.md)

## 🚀 Quick Start

```bash
cd backend

# Copy environment file
cp .env.example .env
# Edit .env with your database URL and secrets

# Install tools
make install-tools

# Run migrations
make migrate-up

# Seed demo data
make seed

# Start development server
make dev
```

## 📋 Requirements

- **Go** 1.22+
- **PostgreSQL** 14+ (or Neon serverless)
- **sqlc** (installed via `make install-tools`)
- **goose** (installed via `make install-tools`)

## 🏗️ Project Structure

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
│   ├── testutil/         # Test utilities & fixtures
│   └── utils/            # JWT, password utilities
├── pkg/response/         # Standardized API responses
├── Makefile              # Build & development commands
└── sqlc.yaml             # sqlc configuration
```

## 🔐 Authentication

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Librarian | `librarian` | `librarian123` |
| Student | `student` | `student123` |

### JWT Tokens

- **Access Token**: 15 minutes (configurable)
- **Refresh Token**: 7 days (configurable)

## 🛠️ Development

### Make Commands

```bash
make build          # Build binary
make run            # Run server
make dev            # Run with hot-reload
make test           # Run tests
make lint           # Run linter
make sqlc           # Regenerate sqlc code
make migrate-up     # Apply migrations
make migrate-down   # Rollback migration
make seed           # Seed demo data
```

## 🔧 Configuration

See `.env.example` for all configuration options:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_ACCESS_SECRET` | Access token secret | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:3000` |

## 🚢 Deployment

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `cd backend && go build -o bin/server ./cmd/server`
4. Set start command: `./backend/bin/server`
5. Add environment variables

## 📄 License

MIT License
