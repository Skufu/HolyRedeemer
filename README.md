# Holy Redeemer School Library Management System

A complete library management system for Holy Redeemer School of Cabuyao, featuring RFID-based circulation, QR code tracking, fine management, and comprehensive reporting.

**Status:** ~85% Complete | [Paper Implementation Check](docs/PAPER_IMPLEMENTATION_CHECK.md)

---

## ✨ Key Features

- **🎯 Role-Based Access Control** - Admin, Librarian, and Student portals with appropriate permissions
- **📚 Book Management** - Full CRUD operations with multiple copy tracking
- **🔍 Catalog Search** - Full-text search by title, author, ISBN, and category
- **📦 QR Code System** - Automatic QR generation for every book copy (format: `HR-XXXXXXX-C1`)
- **🔄 Circulation** - RFID/QR-based checkout, return, and renewal
- **💰 Fine Management** - Automatic fine calculation, partial payments, and tracking
- **📊 Analytics & Reports** - Interactive charts, usage statistics, and exportable reports
- **🔐 Security** - JWT authentication, audit logging, password hashing
- **📱 Responsive Design** - Mobile-friendly interface for students

---

## 🚀 Quick Start

### Option 1: One-Command Setup (Recommended)

Run everything with a single command:

```bash
# First time setup
./setup_and_run.sh --setup

# After setup, run the application
./setup_and_run.sh --run

# Reset database with seed data (runs migrations that include seed inserts)
./setup_and_run.sh --seed
```

This script:
- ✅ Sets up environment variables
- ✅ Starts PostgreSQL database via Docker
- ✅ Installs Go tools (air, goose, sqlc)
- ✅ Runs database migrations and seeds
- ✅ Installs frontend dependencies
- ✅ Starts both backend and frontend servers

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Create environment file
cp .env.example .env
# Edit .env with your database URL

# Install Go tools
go install github.com/air-verse/air@latest
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Run migrations
goose -dir internal/database/migrations postgres "$DATABASE_URL" up

# Start dev server (with hot reload)
make dev
```

Backend runs on: **http://localhost:8080**

#### Frontend

```bash
cd frontend

# Create environment file
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs on: **http://localhost:4127**

---

## 🔑 Demo Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Super Admin | `admin` | `admin123` | Full system access |
| Librarian | `librarian` | `lib123` | Circulation, books, reports |
| Student | `student001` | `student123` | Catalog, account, requests |

---

## 📁 Project Structure

```
HolyRedeemer/
├── backend/              # Go REST API
│   ├── cmd/server/       # Application entry point
│   ├── internal/
│   │   ├── config/       # Configuration management
│   │   ├── database/     # DB connection & migrations
│   │   │   ├── migrations/  # SQL migration files
│   │   │   └── queries/     # sqlc query definitions
│   │   ├── handlers/     # HTTP request handlers
│   │   ├── middleware/   # Auth, CORS, logging
│   │   ├── repositories/ # Generated sqlc code
│   │   └── utils/        # JWT, password, QR utilities
│   ├── pkg/response/      # Standardized API responses
│   ├── Makefile           # Build commands
│   └── README.md         # Backend-specific docs
│
├── frontend/             # React web application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React Context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components by role
│   │   │   ├── admin/    # Admin pages
│   │   │   ├── librarian/ # Librarian pages
│   │   │   └── student/  # Student pages
│   │   ├── services/      # API service layer
│   │   └── stores/       # Zustand state stores
│   ├── package.json
│   └── README.md         # Frontend-specific docs
│
├── docs/                 # Project documentation
│   ├── api/              # API reference
│   ├── architecture/     # System architecture
│   ├── guides/           # Development guides
│   └── project/         # Project specifications
│
├── .github/workflows/    # CI/CD pipelines
├── setup_and_run.sh      # Quick setup script
├── docker-compose.yml     # Database container
└── README.md            # This file
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/api/API.md) | Complete REST API documentation |
| [Architecture](docs/architecture/ARCHITECTURE.md) | System design, code patterns, database schema |
| [Contributing](docs/guides/CONTRIBUTING.md) | Development setup and guidelines |
| [Specification](docs/project/SPECIFICATION.md) | Full project requirements |
| [Paper Implementation Check](docs/PAPER_IMPLEMENTATION_CHECK.md) | Analysis of research paper alignment |
| [Implementation Status](docs/project/IMPLEMENTATION_STATUS.md) | Current implementation status |

---

## 🔧 Tech Stack

### Backend
- **Language:** Go 1.24+
- **Framework:** Gin
- **Database:** PostgreSQL 15 (Neon serverless)
- **Tools:**
  - sqlc - Type-safe SQL code generation
  - goose - Database migrations
  - Bcrypt - Password hashing
  - JWT - Authentication

### Frontend
- **Framework:** React 18
- **Language:** TypeScript 5.8
- **Build Tool:** Vite 5.4
- **Styling:** TailwindCSS 3.4
- **UI Components:** Shadcn/UI (Radix UI)
- **State Management:**
  - TanStack Query 5.83 - Server state & caching
  - Zustand 5.0 - Client state
- **Specialized Libraries:**
  - html5-qrcode - QR/barcode scanning
  - qrcode.react - QR generation
  - Recharts - Charts for reports
  - date-fns - Date manipulation
  - xlsx - Excel import/export
  - React Router DOM - Client routing
  - React Hook Form - Form management
  - Zod - Schema validation

### Infrastructure
- **Database:** PostgreSQL 15 (via Docker for local dev, Neon for production)
- **Authentication:** JWT (15min access, 7 day refresh)
- **API:** RESTful API with Gin framework

---

## 🎯 Core Features

### Admin Module
- **Dashboard** - System-wide statistics and overview
- **User Management** - Create, edit, and archive users (students, librarians, admins)
- **Book Management** - Full CRUD for books and categories with Excel import/export
- **QR Management** - Generate and print QR codes for book copies
- **Settings** - Configure library policies (fine rates, loan periods, limits)
- **Audit Logs** - Track all system actions for security
- **Reports** - Visual analytics and downloadable reports

### Librarian Module
- **Dashboard** - Daily operations overview
- **Circulation** - RFID/QR-based checkout and return station
- **Student Lookup** - Find students, view their loans, fines, and history
- **Book Catalog** - Search and manage book inventory
- **Daily Operations** - Review due items, overdue books, and pending requests
- **Reports** - Operational reports and statistics

### Student Module
- **Catalog** - Search and browse library inventory
- **Dashboard** - Personal overview of active loans and fines
- **Account** - View borrowing history, active requests, and fine details
- **Notifications** - In-app alerts for due dates and request updates
- **Book Requests** - Reserve or request unavailable books

---

## 🛠️ Development

### Backend Commands

```bash
cd backend

make dev          # Start with hot reload (air)
make run          # Build and run
make test         # Run tests
make lint         # Run linter (golangci-lint)
make sqlc         # Regenerate sqlc code
make migrate-up   # Apply database migrations
make migrate-down # Rollback migration
make reset-db     # Drop schema + re-migrate
make build        # Build binary
make clean        # Remove build artifacts
```

### Frontend Commands

```bash
cd frontend

npm run dev          # Start dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run test         # Run Vitest tests
npm run lint         # Run ESLint
```

---

## 📊 Database Schema

### Key Tables

- **users** - Authentication and user accounts
- **students** - Student profiles with RFID codes
- **librarians** - Staff accounts
- **books** - Book catalog
- **book_copies** - Individual physical copies with QR codes
- **transactions** - Circulation records (checkout/return)
- **fines** - Fine records
- **payments** - Fine payment history
- **book_requests** - Reservation system
- **notifications** - In-app user notifications
- **audit_logs** - Security audit trail
- **library_settings** - System configuration
- **categories** - Book categorization
- **refresh_tokens** - JWT refresh token management

See [Architecture](docs/architecture/ARCHITECTURE.md) for complete schema details.

---

## 🔐 Security

- **Authentication:** JWT tokens with automatic refresh
- **Password Hashing:** Bcrypt (cost: 10)
- **Role-Based Access:** Middleware enforces role permissions
- **Audit Logging:** All sensitive actions logged
- **CORS Protection:** Configurable allowed origins
- **Input Validation:** Request validation on all endpoints
- **SQL Injection Protection:** Parameterized queries via sqlc

---

## 📝 Implementation Status

The system is approximately **85% complete** relative to the research paper requirements.

**Implemented:**
- ✅ Complete circulation workflow (checkout, return, renewal)
- ✅ RFID and QR code integration
- ✅ Fine calculation and payment tracking
- ✅ Student, librarian, and admin portals
- ✅ Book management with categories
- ✅ Reports and analytics
- ✅ Role-based access control
- ✅ Audit logging

**Pending:**
- ⚠️ New School Year Setup workflow
- ⚠️ Automated database backups (relies on provider)
- ⚠️ Receipt generation
- ⚠️ Email notifications (in-app only)

See [Paper Implementation Check](docs/PAPER_IMPLEMENTATION_CHECK.md) for detailed analysis.

---

## 🚦 Testing

### Backend Tests

```bash
cd backend
make test
```

Current coverage: ~87% for handlers

### Frontend Tests

```bash
cd frontend
npm run test
```

Current status: 89/92 tests passing (3 known jsdom issues)

---

## 🐛 Known Issues

1. **Frontend Login Tests** - 3 tests fail in Vitest due to jsdom not providing `ResizeObserver` API. This is a test environment issue only; the feature works correctly in browsers.

---

## 📄 License

MIT License

---

## 🤝 Contributing

Please see [Contributing Guide](docs/guides/CONTRIBUTING.md) for development setup and guidelines.

---

## 👥 Authors

Holy Redeemer School of Cabuyao - Library Management System Development Team

---

## 📞 Support

For questions or issues, please refer to the documentation in the `docs/` directory or check the [Implementation Status](docs/project/IMPLEMENTATION_STATUS.md).
