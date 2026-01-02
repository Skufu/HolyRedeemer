# Holy Redeemer School Library Management System

A complete library management system for Holy Redeemer School of Cabuyao, featuring RFID-based circulation, fine management, and comprehensive reporting.

## 📁 Project Structure

```
HolyRedeemer/
├── backend/              # Go REST API
│   ├── cmd/server/       # Application entry point
│   ├── internal/         # Private packages
│   └── README.md         # Backend-specific docs
├── frontend/             # React web application
│   ├── src/              # Source code
│   └── README.md         # Frontend-specific docs
├── docs/                 # Project documentation
│   ├── api/              # API reference
│   ├── architecture/     # System architecture
│   ├── guides/           # Development guides
│   └── project/          # Project specifications
└── .github/workflows/    # CI/CD pipelines
```

## 🚀 Quick Start

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database URL
make install-tools
make migrate-up
make dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📚 Documentation

| Category | Description |
|----------|-------------|
| [API Reference](docs/api/API.md) | Complete endpoint documentation |
| [Architecture](docs/architecture/ARCHITECTURE.md) | System design and patterns |
| [Contributing](docs/guides/CONTRIBUTING.md) | Development setup and guidelines |
| [Specification](docs/project/SPECIFICATION.md) | Full project requirements |

## 🔧 Tech Stack

**Backend:**
- Go 1.22+ with Gin framework
- PostgreSQL (Neon serverless)
- sqlc for type-safe queries
- JWT authentication

**Frontend:**
- React 18 with TypeScript
- Vite build tool
- TailwindCSS styling
- Shadcn/UI components

## 📄 License

MIT License
