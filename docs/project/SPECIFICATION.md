# Holy Redeemer School Library Management System

## Technical Specification Document

**Version:** 1.0
**Date:** December 31, 2024
**Project:** Computerized Library Management System
**Client:** Holy Redeemer School of Cabuyao

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Specification](#5-api-specification)
6. [Feature Specifications](#6-feature-specifications)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Lovable Prototype Prompt](#9-lovable-prototype-prompt)
10. [Implementation Plan](#10-implementation-plan)
11. [Deployment Strategy](#11-deployment-strategy)

---

## 1. Executive Summary

### 1.1 Project Overview

The Holy Redeemer School Library Management System is a web-based application designed to replace the current manual library operations (Excel spreadsheets and physical index cards) with a centralized digital platform.

### 1.2 Core Problems Addressed

- Manual record-keeping leading to errors and lost records
- Difficulty tracking borrowed books and student histories
- No real-time visibility into book availability
- Time-consuming borrowing/returning process
- Lack of accountability for individual book copies

### 1.3 Solution Highlights

- **QR Code Integration**: Each physical book copy gets a unique QR code for precise tracking
- **RFID Support**: Leverages existing student RFID cards for identification
- **Real-time Circulation**: Instant checkout/return with automatic status updates
- **Comprehensive Reporting**: Analytics, transaction history, and overdue tracking
- **Multi-role Access**: Separate portals for Admin, Librarian, and Students

### 1.4 Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend Architecture | Monolithic with layers | Simpler for small team, clear separation |
| Student Auth | Web accounts + RFID | Full self-service plus physical checkout |
| QR Scanning | Webcam + USB scanner | Flexibility for different scenarios |
| Connectivity | Online-only | Simpler implementation, school has stable internet |
| Session Management | JWT with refresh tokens | Industry standard security |
| Database | Neon (PostgreSQL) | Generous free tier, serverless |
| Backend Hosting | Render | Simple deploys, good free/paid tiers |
| Frontend Hosting | Vercel | Excellent for React, free tier |
| State Management | Zustand + TanStack Query | Lightweight, modern, excellent DX |
| API Style | REST | Simpler, well understood |

---

## 2. Tech Stack

### 2.1 Backend

```
Language:       Go 1.21+
Framework:      Gin (HTTP router)
Database:       PostgreSQL 15+ (Neon)
ORM/Query:      sqlc (type-safe SQL)
Migrations:     goose
Authentication: JWT (access + refresh tokens)
Validation:     go-playground/validator
```

### 2.2 Frontend

```
Framework:      React 18+ with TypeScript
Build Tool:     Vite
Styling:        Tailwind CSS
UI Components:  shadcn/ui
State:          Zustand (client state)
Server State:   TanStack Query (React Query)
Routing:        React Router v6
Charts:         Recharts
Icons:          Lucide React
QR Generation:  qrcode.react
QR Scanning:    html5-qrcode
```

### 2.3 Infrastructure

```
Database:       Neon (serverless PostgreSQL)
Backend:        Render (Web Service)
Frontend:       Vercel
File Storage:   Cloudinary (book covers) or local
```

### 2.4 Development Tools

```
Version Control:    Git + GitHub
API Testing:        Bruno or Insomnia
Database Client:    pgAdmin or DBeaver
Code Editor:        VS Code
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   Admin     │  Librarian  │   Student   │   Circulation Station │
│   Portal    │   Portal    │   Portal    │      (Kiosk Mode)     │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────┬───────────┘
       │             │             │                   │
       └─────────────┴──────┬──────┴───────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Vercel CDN  │
                    │  (React SPA)  │
                    └───────┬───────┘
                            │ HTTPS
                    ┌───────▼───────┐
                    │  Render       │
                    │  (Go API)     │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Neon         │
                    │  (PostgreSQL) │
                    └───────────────┘
```

### 3.2 Backend Package Structure

```
holy-redeemer-api/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Environment configuration
│   ├── database/
│   │   ├── db.go                # Database connection
│   │   ├── queries/             # SQL queries (sqlc)
│   │   │   ├── users.sql
│   │   │   ├── books.sql
│   │   │   ├── transactions.sql
│   │   │   └── ...
│   │   └── migrations/          # Goose migrations
│   │       ├── 001_init_schema.sql
│   │       ├── 002_seed_data.sql
│   │       └── ...
│   ├── handlers/                # HTTP handlers
│   │   ├── auth.go
│   │   ├── books.go
│   │   ├── users.go
│   │   ├── circulation.go
│   │   ├── reports.go
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── auth_service.go
│   │   ├── book_service.go
│   │   ├── circulation_service.go
│   │   ├── fine_service.go
│   │   └── ...
│   ├── repositories/            # Data access (generated by sqlc)
│   │   └── db.go
│   ├── middleware/
│   │   ├── auth.go              # JWT middleware
│   │   ├── cors.go
│   │   ├── logging.go
│   │   └── ratelimit.go
│   ├── models/                  # Domain models
│   │   ├── user.go
│   │   ├── book.go
│   │   └── ...
│   └── utils/
│       ├── jwt.go
│       ├── password.go
│       ├── qrcode.go
│       └── validator.go
├── pkg/                         # Shared packages
│   └── response/
│       └── response.go          # Standard API responses
├── sqlc.yaml                    # sqlc configuration
├── go.mod
├── go.sum
└── Makefile
```

### 3.3 Frontend Structure

```
holy-redeemer-web/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   ├── common/
│   │   │   ├── DataTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ...
│   │   └── features/
│   │       ├── books/
│   │       ├── circulation/
│   │       ├── users/
│   │       └── reports/
│   ├── pages/
│   │   ├── auth/
│   │   │   └── Login.tsx
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── BooksManagement.tsx
│   │   │   ├── UsersManagement.tsx
│   │   │   └── ...
│   │   ├── librarian/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CirculationStation.tsx
│   │   │   └── ...
│   │   └── student/
│   │       ├── Dashboard.tsx
│   │       ├── Catalog.tsx
│   │       └── MyAccount.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBooks.ts
│   │   └── ...
│   ├── services/
│   │   ├── api.ts               # Axios instance
│   │   ├── auth.ts
│   │   ├── books.ts
│   │   └── ...
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── ...
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │  students   │       │ librarians  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ user_id(FK) │       │ user_id(FK) │──────►│
│ username    │       │ student_id  │       │ employee_id │
│ password    │       │ grade_level │       │ name        │
│ role        │       │ section     │       │ email       │
│ email       │       │ rfid_code   │       └─────────────┘
│ status      │       │ status      │
└─────────────┘       └──────┬──────┘
                             │
                             │ borrows
                             ▼
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│ categories  │       │  transactions   │       │   fines     │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)         │◄──────│ trans_id(FK)│
│ name        │       │ student_id (FK) │       │ student_id  │
│ description │       │ copy_id (FK)    │       │ amount      │
└──────┬──────┘       │ librarian_id    │       │ type        │
       │              │ checkout_date   │       │ status      │
       │              │ due_date        │       └─────────────┘
       │              │ return_date     │
       │              │ status          │
       │              └────────┬────────┘
       │                       │
       │                       │ references
       ▼                       ▼
┌─────────────┐       ┌─────────────────┐
│   books     │       │   book_copies   │
├─────────────┤       ├─────────────────┤
│ id (PK)     │◄──────│ book_id (FK)    │
│ isbn        │       │ id (PK)         │
│ title       │       │ copy_number     │
│ author      │       │ qr_code         │
│ category_id │       │ status          │
│ publisher   │       │ condition       │
│ description │       └─────────────────┘
│ cover_url   │
└─────────────┘
```

### 4.2 Complete Schema Definition

```sql
-- migrations/001_init_schema.sql

-- =============================================
-- USERS & AUTHENTICATION
-- =============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'librarian', 'student');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    email           VARCHAR(100),
    name            VARCHAR(100) NOT NULL,
    status          user_status DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- STUDENTS
-- =============================================

CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'transferred');

CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id      VARCHAR(20) UNIQUE NOT NULL,  -- School's student ID format
    grade_level     INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
    section         VARCHAR(20) NOT NULL,
    rfid_code       VARCHAR(50) UNIQUE,
    contact_info    VARCHAR(100),
    guardian_name   VARCHAR(100),
    guardian_contact VARCHAR(50),
    status          student_status DEFAULT 'active',
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- LIBRARIANS
-- =============================================

CREATE TABLE librarians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id     VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100),
    phone           VARCHAR(20),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BOOK CATALOG
-- =============================================

CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    color_code      VARCHAR(7),  -- Hex color for UI
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE book_status AS ENUM ('active', 'archived', 'discontinued');

CREATE TABLE books (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isbn            VARCHAR(17),  -- Can be null for old/local books
    title           VARCHAR(255) NOT NULL,
    author          VARCHAR(255) NOT NULL,
    category_id     UUID REFERENCES categories(id),
    publisher       VARCHAR(100),
    publication_year INTEGER,
    description     TEXT,
    cover_url       VARCHAR(500),
    shelf_location  VARCHAR(50),
    replacement_cost DECIMAL(10, 2),  -- Optional, for lost book fines
    status          book_status DEFAULT 'active',
    is_data_complete BOOLEAN DEFAULT false,  -- Flag for incomplete imports
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BOOK COPIES (Individual physical copies)
-- =============================================

CREATE TYPE copy_status AS ENUM ('available', 'borrowed', 'reserved', 'lost', 'damaged', 'retired');
CREATE TYPE copy_condition AS ENUM ('excellent', 'good', 'fair', 'poor');

CREATE TABLE book_copies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID REFERENCES books(id) ON DELETE CASCADE,
    copy_number     INTEGER NOT NULL,  -- e.g., Copy 1, Copy 2 of same book
    qr_code         VARCHAR(100) UNIQUE NOT NULL,  -- Unique QR identifier
    barcode         VARCHAR(50),  -- Optional physical barcode
    status          copy_status DEFAULT 'available',
    condition       copy_condition DEFAULT 'good',
    acquisition_date DATE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id, copy_number)
);

-- =============================================
-- CIRCULATION (Transactions)
-- =============================================

CREATE TYPE transaction_status AS ENUM ('borrowed', 'returned', 'overdue', 'lost');
CREATE TYPE checkout_method AS ENUM ('counter', 'self_service');

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID REFERENCES students(id),
    copy_id         UUID REFERENCES book_copies(id),
    librarian_id    UUID REFERENCES librarians(id),  -- Who processed checkout
    checkout_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date        DATE NOT NULL,
    return_date     TIMESTAMP,
    returned_by     UUID REFERENCES librarians(id),  -- Who processed return
    status          transaction_status DEFAULT 'borrowed',
    checkout_method checkout_method DEFAULT 'counter',
    renewal_count   INTEGER DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- FINES & PAYMENTS
-- =============================================

CREATE TYPE fine_type AS ENUM ('overdue', 'lost', 'damaged', 'other');
CREATE TYPE fine_status AS ENUM ('pending', 'partial', 'paid', 'waived');
CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'bank_transfer', 'other');

CREATE TABLE fines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID REFERENCES transactions(id),
    student_id      UUID REFERENCES students(id),
    amount          DECIMAL(10, 2) NOT NULL,
    fine_type       fine_type NOT NULL,
    description     TEXT,
    status          fine_status DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fine_id         UUID REFERENCES fines(id),
    student_id      UUID REFERENCES students(id),
    amount          DECIMAL(10, 2) NOT NULL,
    payment_method  payment_method NOT NULL,
    reference_number VARCHAR(100),
    notes           TEXT,
    processed_by    UUID REFERENCES librarians(id),
    payment_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BOOK REQUESTS (Simple reservation system)
-- =============================================

CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled');
CREATE TYPE request_type AS ENUM ('reservation', 'request');

CREATE TABLE book_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID REFERENCES students(id),
    book_id         UUID REFERENCES books(id),
    request_type    request_type NOT NULL,
    status          request_status DEFAULT 'pending',
    request_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    processed_by    UUID REFERENCES librarians(id),
    processed_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- LIBRARY SETTINGS
-- =============================================

CREATE TABLE library_settings (
    key             VARCHAR(50) PRIMARY KEY,
    value           TEXT NOT NULL,
    description     TEXT,
    category        VARCHAR(50),
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by      UUID REFERENCES users(id)
);

-- =============================================
-- AUDIT LOG
-- =============================================

CREATE TYPE audit_action AS ENUM (
    'login', 'logout',
    'create', 'update', 'delete',
    'checkout', 'return', 'renew',
    'fine_created', 'payment_received',
    'settings_changed'
);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    action          audit_action NOT NULL,
    entity_type     VARCHAR(50),  -- e.g., 'book', 'transaction', 'user'
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NOTIFICATIONS (In-app only)
-- =============================================

CREATE TYPE notification_type AS ENUM ('due_reminder', 'overdue', 'fine', 'request_update', 'system');

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    type            notification_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT false,
    reference_type  VARCHAR(50),  -- e.g., 'transaction', 'fine'
    reference_id    UUID,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_students_rfid ON students(rfid_code);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_grade ON students(grade_level, section);

CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_category ON books(category_id);

CREATE INDEX idx_book_copies_qr ON book_copies(qr_code);
CREATE INDEX idx_book_copies_status ON book_copies(status);

CREATE INDEX idx_transactions_student ON transactions(student_id);
CREATE INDEX idx_transactions_copy ON transactions(copy_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_due_date ON transactions(due_date);

CREATE INDEX idx_fines_student ON fines(student_id);
CREATE INDEX idx_fines_status ON fines(status);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_students_timestamp BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_books_timestamp BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_book_copies_timestamp BEFORE UPDATE ON book_copies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_timestamp BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_fines_timestamp BEFORE UPDATE ON fines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.3 Seed Data Migration

```sql
-- migrations/002_seed_data.sql

-- Default categories
INSERT INTO categories (name, description, color_code) VALUES
    ('Fiction', 'Novels, short stories, and literary works', '#3B82F6'),
    ('Non-Fiction', 'Factual books, biographies, essays', '#10B981'),
    ('Reference', 'Dictionaries, encyclopedias, atlases', '#F59E0B'),
    ('Science', 'Science and technology books', '#8B5CF6'),
    ('History', 'Historical books and accounts', '#EF4444'),
    ('Mathematics', 'Math textbooks and workbooks', '#06B6D4'),
    ('Filipino', 'Filipino literature and language', '#EC4899'),
    ('Religion', 'Religious and spiritual texts', '#6366F1'),
    ('Periodicals', 'Magazines, journals, newspapers', '#84CC16');

-- Default library settings
INSERT INTO library_settings (key, value, description, category) VALUES
    ('loan_duration_days', '7', 'Default number of days for book loans', 'borrowing'),
    ('max_books_per_student', '3', 'Maximum books a student can borrow at once', 'borrowing'),
    ('max_renewals', '2', 'Maximum times a book can be renewed', 'borrowing'),
    ('fine_per_day', '5.00', 'Fine amount per day for overdue books (PHP)', 'fines'),
    ('fine_grace_period_days', '1', 'Grace period before fines start accumulating', 'fines'),
    ('max_fine_cap', '200.00', 'Maximum fine amount per book (PHP)', 'fines'),
    ('fine_block_threshold', '100.00', 'Total fine amount that blocks new borrowing (PHP)', 'fines'),
    ('school_year', '2024-2025', 'Current school year', 'general'),
    ('library_name', 'Holy Redeemer School Library', 'Library display name', 'general'),
    ('reading_quota_per_year', '12', 'Required books per student per school year', 'quota');

-- Create super admin user (password: admin123 - CHANGE IN PRODUCTION)
INSERT INTO users (username, password_hash, role, email, name)
VALUES (
    'superadmin',
    '$2a$10$rPJjXpxPfLYHgk.NGJKMxe4Q9OM/YhPAYTxfIAqNBW9HZC1JFTaXa',  -- bcrypt hash
    'super_admin',
    'admin@holyredeemer.edu.ph',
    'System Administrator'
);
```

---

## 5. API Specification

### 5.1 API Overview

**Base URL:** `https://api.holyredeemer-library.com/api/v1`

**Authentication:** Bearer token (JWT) in Authorization header

**Response Format:**
```json
{
    "success": true,
    "data": { },
    "message": "Success message",
    "meta": {
        "page": 1,
        "per_page": 20,
        "total": 100,
        "total_pages": 5
    }
}
```

**Error Response:**
```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
            { "field": "email", "message": "Invalid email format" }
        ]
    }
}
```

### 5.2 Authentication Endpoints

#### POST /auth/login
Login and receive tokens.

**Request:**
```json
{
    "username": "student001",
    "password": "password123"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
        "expires_in": 900,
        "user": {
            "id": "uuid",
            "username": "student001",
            "role": "student",
            "name": "Juan Dela Cruz"
        }
    }
}
```

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

#### POST /auth/logout
Invalidate refresh token.

#### POST /auth/rfid/register
Self-register RFID card (student only).

**Request:**
```json
{
    "rfid_code": "ABC123456"
}
```

#### POST /auth/rfid/lookup
Lookup user by RFID code (for circulation station).

**Request:**
```json
{
    "rfid_code": "ABC123456"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "student": {
            "id": "uuid",
            "student_id": "2024-00001",
            "name": "Juan Dela Cruz",
            "grade_level": 7,
            "section": "St. Peter",
            "current_loans": 2,
            "has_overdue": false,
            "total_fines": 0
        }
    }
}
```

### 5.3 Book Endpoints

#### GET /books
List all books with pagination and filters.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20, max: 100)
- `search` (string): Search title, author, ISBN
- `category_id` (uuid): Filter by category
- `status` (string): Filter by status
- `available_only` (bool): Only show books with available copies

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "isbn": "978-0-123456-78-9",
            "title": "Introduction to Programming",
            "author": "John Smith",
            "category": {
                "id": "uuid",
                "name": "Science",
                "color_code": "#8B5CF6"
            },
            "publisher": "Tech Books Inc.",
            "publication_year": 2023,
            "cover_url": "https://...",
            "total_copies": 5,
            "available_copies": 3,
            "status": "active"
        }
    ],
    "meta": { ... }
}
```

#### GET /books/:id
Get book details with copies.

#### POST /books
Create new book (admin/librarian only).

**Request:**
```json
{
    "isbn": "978-0-123456-78-9",
    "title": "Introduction to Programming",
    "author": "John Smith",
    "category_id": "uuid",
    "publisher": "Tech Books Inc.",
    "publication_year": 2023,
    "description": "A beginner's guide...",
    "shelf_location": "A-101",
    "initial_copies": 3
}
```

#### PUT /books/:id
Update book details.

#### DELETE /books/:id
Soft delete (archive) book.

#### POST /books/:id/copies
Add new copy to book.

**Request:**
```json
{
    "condition": "good",
    "acquisition_date": "2024-01-15",
    "notes": "Donated by alumni"
}
```

#### GET /books/:id/copies
List all copies of a book.

### 5.4 Book Copy Endpoints

#### GET /copies/:qr_code
Lookup copy by QR code (for scanning).

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "qr_code": "HR-BOOK-001-C1",
        "copy_number": 1,
        "status": "available",
        "condition": "good",
        "book": {
            "id": "uuid",
            "title": "Introduction to Programming",
            "author": "John Smith"
        },
        "current_loan": null
    }
}
```

#### PUT /copies/:id
Update copy status/condition.

#### GET /copies/:id/qr
Generate QR code image for copy.

### 5.5 Circulation Endpoints

#### POST /circulation/checkout
Checkout book to student.

**Request:**
```json
{
    "student_id": "uuid",
    "copy_id": "uuid",
    "due_date": "2024-02-01",
    "notes": ""
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "transaction_id": "uuid",
        "student": {
            "name": "Juan Dela Cruz",
            "student_id": "2024-00001"
        },
        "book": {
            "title": "Introduction to Programming",
            "copy_number": 1
        },
        "checkout_date": "2024-01-25T10:30:00Z",
        "due_date": "2024-02-01"
    },
    "message": "Book checked out successfully"
}
```

#### POST /circulation/return
Return a book.

**Request:**
```json
{
    "copy_id": "uuid",
    "condition": "good",
    "notes": ""
}
```

**Response includes any fines generated:**
```json
{
    "success": true,
    "data": {
        "transaction_id": "uuid",
        "return_date": "2024-02-05T14:20:00Z",
        "days_overdue": 4,
        "fine": {
            "id": "uuid",
            "amount": 20.00,
            "type": "overdue"
        }
    }
}
```

#### POST /circulation/renew
Renew a borrowed book.

**Request:**
```json
{
    "transaction_id": "uuid"
}
```

#### GET /circulation/current
Get all current (active) loans.

**Query Parameters:**
- `student_id` (uuid): Filter by student
- `overdue_only` (bool): Only show overdue
- `due_today` (bool): Only show due today

#### GET /circulation/history
Get transaction history.

### 5.6 Student Endpoints

#### GET /students
List all students (admin/librarian).

#### GET /students/:id
Get student details with loan summary.

#### POST /students
Create new student.

**Request:**
```json
{
    "student_id": "2024-00001",
    "name": "Juan Dela Cruz",
    "grade_level": 7,
    "section": "St. Peter",
    "email": "juan@student.holyredeemer.edu.ph",
    "contact_info": "09171234567",
    "guardian_name": "Maria Dela Cruz",
    "guardian_contact": "09181234567"
}
```

#### PUT /students/:id
Update student details.

#### GET /students/:id/loans
Get student's current loans.

#### GET /students/:id/history
Get student's borrowing history.

#### GET /students/:id/fines
Get student's fines.

#### GET /students/:id/quota
Get student's reading quota progress.

**Response:**
```json
{
    "success": true,
    "data": {
        "required": 12,
        "completed": 8,
        "remaining": 4,
        "percentage": 66.67,
        "by_category": [
            { "category": "Fiction", "count": 3 },
            { "category": "Science", "count": 2 }
        ]
    }
}
```

### 5.7 Fine & Payment Endpoints

#### GET /fines
List all fines (filterable).

#### GET /fines/:id
Get fine details.

#### POST /fines
Create manual fine (e.g., damaged/lost book).

**Request:**
```json
{
    "student_id": "uuid",
    "transaction_id": "uuid",
    "amount": 150.00,
    "fine_type": "damaged",
    "description": "Water damage to pages"
}
```

#### POST /fines/:id/pay
Record payment for fine.

**Request:**
```json
{
    "amount": 50.00,
    "payment_method": "cash",
    "reference_number": "",
    "notes": "Partial payment"
}
```

#### POST /fines/:id/waive
Waive fine (admin only).

### 5.8 Book Request Endpoints

#### GET /requests
List book requests (librarian/admin).

#### POST /requests
Create book request (student).

**Request:**
```json
{
    "book_id": "uuid",
    "request_type": "request",
    "notes": "For research project"
}
```

#### PUT /requests/:id/approve
Approve request.

#### PUT /requests/:id/reject
Reject request.

### 5.9 Report Endpoints

#### GET /reports/dashboard
Get dashboard statistics.

**Response:**
```json
{
    "success": true,
    "data": {
        "summary": {
            "total_books": 500,
            "total_copies": 850,
            "total_students": 1200,
            "active_loans": 156,
            "overdue_count": 12,
            "pending_fines_total": 580.00
        },
        "today": {
            "checkouts": 23,
            "returns": 18,
            "due_today": 15
        },
        "charts": {
            "loans_by_category": [...],
            "monthly_trend": [...],
            "top_borrowed": [...]
        }
    }
}
```

#### GET /reports/inventory
Generate inventory report.

#### GET /reports/transactions
Generate transaction report.

#### GET /reports/overdue
Generate overdue report.

#### GET /reports/fines
Generate fines collection report.

### 5.10 Settings Endpoints

#### GET /settings
Get all settings (admin).

#### PUT /settings
Update settings (admin).

**Request:**
```json
{
    "loan_duration_days": "7",
    "max_books_per_student": "3",
    "fine_per_day": "5.00"
}
```

### 5.11 Audit Log Endpoints

#### GET /audit-logs
Get audit logs (admin only).

**Query Parameters:**
- `user_id` (uuid): Filter by user
- `action` (string): Filter by action type
- `entity_type` (string): Filter by entity
- `from_date` (date): Start date
- `to_date` (date): End date

### 5.12 Import/Export Endpoints

#### POST /import/books
Import books from Excel.

**Request:** Multipart form with Excel file.

**Response:**
```json
{
    "success": true,
    "data": {
        "total_rows": 150,
        "imported": 145,
        "skipped": 3,
        "errors": 2,
        "incomplete_data": 12,
        "details": [
            { "row": 45, "error": "Invalid ISBN format" }
        ]
    }
}
```

#### POST /import/students
Import students from Excel.

#### GET /export/books
Export books to Excel.

#### GET /export/transactions
Export transactions to Excel.

---

## 6. Feature Specifications

### 6.1 Circulation Station (Dedicated Mode)

The circulation station is a full-screen, distraction-free interface optimized for rapid checkout/return operations.

**Flow: Checkout**
1. Station shows "Scan Student ID" prompt with large input field
2. Librarian scans student RFID (or types student ID)
3. System displays student info, current loans, any blocks
4. If no blocks, prompts "Scan Book QR Code"
5. Librarian scans book QR
6. System shows book info, confirms checkout
7. Audio confirmation sound
8. System returns to step 4 (scan more books) or step 1 (new student)

**Flow: Return**
1. Switch to "Return Mode" tab
2. Prompt "Scan Book QR Code"
3. Scan book
4. System shows book info, borrower info, return status
5. If overdue, show fine amount
6. Confirm return
7. Audio confirmation
8. Loop to step 2

**UI Requirements:**
- Large, high-contrast text
- Keyboard shortcuts (Enter to confirm, Esc to cancel)
- Audio feedback (success beep, error sound)
- Auto-focus on input fields
- Clear error messages
- Session timeout warning

### 6.2 Fine Management System

**Automatic Fine Calculation:**
```
fine_amount = max(0, days_overdue - grace_period) × fine_per_day
final_fine = min(fine_amount, max_fine_cap)
```

**Fine Blocking Logic:**
```
can_borrow = total_pending_fines < fine_block_threshold
           AND active_overdue_count == 0
```

**Payment Recording:**
- Support partial payments
- Track payment method (cash, GCash, bank transfer)
- Optional reference number for digital payments
- Generate receipt (printable)
- Daily collection report for reconciliation

### 6.3 Book Request System

Simple request workflow:

1. **Student submits request**
   - Browse catalog, find unavailable book
   - Click "Request" button
   - Optionally add notes

2. **Librarian reviews**
   - Daily Operations page shows pending requests
   - Can approve or reject with notes

3. **Fulfillment**
   - When book becomes available, librarian marks fulfilled
   - Student notified (in-app)
   - Book held for 48 hours

### 6.4 QR Code Generation

**QR Code Format:**
```
HR-{BOOK_ID_SHORT}-C{COPY_NUMBER}

Example: HR-ABC123-C1, HR-ABC123-C2
```

**Generation Flow:**
1. When book copy is created, generate QR code
2. Store QR string in database
3. Generate QR image on-demand via API
4. Batch print functionality for labels

**Label Format:**
```
┌─────────────────────────┐
│     [QR CODE IMAGE]     │
│                         │
│  Title: Introduction... │
│  ISBN: 978-0-123456...  │
│  Copy: HR-ABC123-C1     │
└─────────────────────────┘
```

### 6.5 Excel Import/Export

**Import Template (Books):**
| ISBN | Title | Author | Category | Publisher | Year | Shelf Location | Copies |
|------|-------|--------|----------|-----------|------|----------------|--------|
| 978-... | Book Title | Author Name | Fiction | Publisher | 2023 | A-101 | 2 |

**Import Logic:**
1. Validate file format
2. Parse rows
3. For each row:
   - Validate required fields
   - Match category by name (create if needed)
   - Check for duplicates by ISBN
   - Create book record
   - Create N copies with generated QR codes
   - Flag as incomplete if missing data
4. Return summary with any errors

### 6.6 Reading Quota Tracking

**Quota Calculation:**
- Count distinct books returned by student in current school year
- Exclude renewals (same book doesn't count twice)
- Display progress: X/Y books (Z%)

**Dashboard Widget:**
- Progress bar showing quota completion
- Breakdown by category
- "Books needed" countdown

---

## 7. User Roles & Permissions

### 7.1 Role Hierarchy

```
Super Admin
    └── Admin
        └── Librarian
            └── Student
```

### 7.2 Permission Matrix

| Permission | Super Admin | Admin | Librarian | Student |
|------------|:-----------:|:-----:|:---------:|:-------:|
| **Users** |
| Create/edit admins | ✓ | - | - | - |
| Create/edit librarians | ✓ | ✓ | - | - |
| Create/edit students | ✓ | ✓ | ✓ | - |
| View all users | ✓ | ✓ | ✓ | - |
| **Books** |
| Create/edit books | ✓ | ✓ | ✓ | - |
| Delete books | ✓ | ✓ | - | - |
| Import books | ✓ | ✓ | ✓ | - |
| View catalog | ✓ | ✓ | ✓ | ✓ |
| **Circulation** |
| Checkout/return | ✓ | ✓ | ✓ | - |
| View all transactions | ✓ | ✓ | ✓ | - |
| View own transactions | ✓ | ✓ | ✓ | ✓ |
| **Fines** |
| Create fines | ✓ | ✓ | ✓ | - |
| Record payments | ✓ | ✓ | ✓ | - |
| Waive fines | ✓ | ✓ | - | - |
| View own fines | ✓ | ✓ | ✓ | ✓ |
| **Reports** |
| View all reports | ✓ | ✓ | ✓ | - |
| Export reports | ✓ | ✓ | ✓ | - |
| **Settings** |
| Modify settings | ✓ | ✓ | - | - |
| View audit logs | ✓ | ✓ | - | - |

---

## 8. UI/UX Specifications

### 8.1 Design System

**Colors:**
```css
/* Primary - School Maroon */
--primary-50: #fdf2f4;
--primary-100: #fce7eb;
--primary-500: #8B1538;
--primary-600: #7a1230;
--primary-700: #680f28;

/* Secondary - Gold */
--secondary-400: #FACC15;
--secondary-500: #D4AF37;

/* Semantic */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* Neutral */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-900: #111827;
```

**Typography:**
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-display: 'Poppins', sans-serif;
```

**Spacing Scale:**
```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
```

### 8.2 Component Specifications

**Status Badges:**
| Status | Color | Background |
|--------|-------|------------|
| Available | Green | `bg-green-100 text-green-800` |
| Borrowed | Blue | `bg-blue-100 text-blue-800` |
| Overdue | Red | `bg-red-100 text-red-800` |
| Reserved | Yellow | `bg-yellow-100 text-yellow-800` |
| Lost | Gray | `bg-gray-100 text-gray-800` |
| Damaged | Orange | `bg-orange-100 text-orange-800` |

**Data Tables:**
- Pagination: 20 items default
- Sortable columns with indicators
- Search with debounce (300ms)
- Row actions via dropdown menu
- Bulk selection where applicable

**Forms:**
- Inline validation
- Error messages below fields
- Required field indicators (*)
- Loading state on submit
- Success toast on completion

### 8.3 Page Layouts

**Admin/Librarian Layout:**
```
┌────────────────────────────────────────────────────┐
│ Header: Logo | Search | Notifications | User Menu  │
├──────────┬─────────────────────────────────────────┤
│          │                                         │
│ Sidebar  │           Main Content Area             │
│          │                                         │
│ - Nav    │  ┌─────────────────────────────────┐   │
│ - Items  │  │ Page Title + Actions            │   │
│          │  ├─────────────────────────────────┤   │
│          │  │                                 │   │
│          │  │ Content (tables, forms, etc.)   │   │
│          │  │                                 │   │
│          │  └─────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────┘
```

**Circulation Station Layout:**
```
┌────────────────────────────────────────────────────┐
│ Header: Mode Toggle (Checkout | Return) | Exit     │
├────────────────────────────────────────────────────┤
│                                                    │
│              ┌──────────────────────┐              │
│              │   SCAN STUDENT ID    │              │
│              │                      │              │
│              │  [________________]  │              │
│              │                      │              │
│              │    or enter ID       │              │
│              └──────────────────────┘              │
│                                                    │
│  ┌─────────────────┐    ┌─────────────────┐       │
│  │ Student Info    │    │ Current Session │       │
│  │ Name: ___       │    │ Books: 3        │       │
│  │ Grade: ___      │    │ - Book 1        │       │
│  │ Loans: ___      │    │ - Book 2        │       │
│  └─────────────────┘    └─────────────────┘       │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 9. Lovable Prototype Prompt

Use this prompt in Lovable to generate the UI prototype:

```
Create a comprehensive Library Management System for Holy Redeemer School of Cabuyao with the following specifications:

## Brand & Theme
- Primary color: #8B1538 (Maroon/Cardinal Red - school color)
- Secondary color: #D4AF37 (Gold accents)
- Clean, professional, modern UI with a school/academic feel
- Use the school name "Holy Redeemer School" with "Library Management System" subtitle
- Include a placeholder for school logo in header

## Authentication
- Login page with username/password
- Role-based authentication (Super Admin, Admin, Librarian, Student)
- "Remember me" checkbox
- "Forgot password" link
- Demo credentials display for testing:
  - Admin: admin / admin123
  - Librarian: librarian / lib123
  - Student: student001 / student123

## Layout Structure
- Responsive sidebar navigation (collapsible on mobile)
- Top header with: school name, notification bell with badge, user role badge, user name dropdown, logout
- Main content area with breadcrumbs
- Footer with version number

---

## ADMIN DASHBOARD

### Sidebar Navigation:
1. Dashboard (home icon)
2. Books Management (book icon)
3. QR/Copy Management (qr-code icon)
4. Excel Migration (upload icon)
5. User Management (users icon)
6. Reports & Analytics (bar-chart icon)
7. Settings (settings icon)
8. Audit Logs (clipboard icon)

### Dashboard Page:
- Welcome message with date
- Summary cards row:
  - Total Books (with icon)
  - Active Students
  - Current Loans
  - Overdue Books (highlighted if > 0)
- Charts section (2 columns):
  - Transaction Status Distribution (donut chart - Borrowed/Returned/Overdue)
  - Books by Category (donut chart with legend)
- Second row charts:
  - Top 5 Most Borrowed Books (horizontal bar chart)
  - Monthly Transaction Trends (line chart with Checkouts/Returns)
- Outstanding Fines summary card
- Recent Activity feed

### Books Management Page:
- Page header with "Add New Book" button
- Filter bar: Search input, Category dropdown, Status dropdown, "Available Only" toggle
- Data table columns: Cover (thumbnail), Title, Author, ISBN, Category, Copies (available/total), Status, Actions
- Actions dropdown: Edit, View Copies, Add Copy, Archive
- Pagination
- Add/Edit Book modal with tabs:
  - Basic Info: Title*, Author*, ISBN, Category, Publisher, Year
  - Details: Description (textarea), Shelf Location, Replacement Cost
  - Cover: Image upload or URL input with preview

### QR/Copy Management Page:
- Filter by book (searchable dropdown)
- Grid view of book copies as cards:
  - Each card shows: QR code image (generated), Book Title, ISBN, Copy ID (e.g., "Copy #1"), Status badge, Condition badge
- "Print Selected" button (checkbox selection)
- "Generate All QR Labels" button
- Print preview modal showing label layout

### Excel Migration Page:
- Two sections: Import Books | Import Students (tabs)
- Each section:
  - Download template button
  - File upload dropzone (drag & drop)
  - Preview table after upload (first 10 rows)
  - Field mapping interface (source column -> target field)
  - Import button with progress bar
  - Results summary: Total, Imported, Skipped, Errors
  - Error details expandable list

### User Management Page:
- Tabs: Students | Librarians | Admins
- Students tab:
  - Filter: Search, Grade Level dropdown, Section, Status
  - Table: Student ID, Name, Grade-Section, RFID (masked), Status, Loans, Fines, Actions
  - Actions: View, Edit, Reset Password, Deactivate
  - "Add Student" button
  - "Import Students" button
- Add/Edit Student modal:
  - Student ID*, Name*, Email, Grade Level*, Section*, Contact, Guardian Name, Guardian Contact
  - RFID Registration section (shows current RFID or "Not registered")

### Reports & Analytics Page:
- Report type selector cards:
  - Inventory Report
  - Transaction History
  - Overdue Report
  - Fine Collection Report
  - Student Activity Report
  - Reading Quota Report
- Date range picker
- Generate button
- Preview area (table format)
- Export buttons: PDF, Excel

### Settings Page:
- Sections as cards:
  - General Settings: School Year, Library Name
  - Borrowing Rules: Max Books/Student, Loan Duration (days), Max Renewals
  - Fine Settings: Fine per Day (₱), Grace Period (days), Max Fine Cap, Block Threshold
  - Reading Quota: Required Books per Year
- Save Changes button
- Reset to Defaults button

### Audit Logs Page:
- Filter bar: User dropdown, Action type dropdown, Date range
- Table: Timestamp, User, Action, Entity Type, Entity ID, Details (expandable JSON)
- Export button

---

## LIBRARIAN DASHBOARD

### Sidebar Navigation:
1. Dashboard
2. Circulation Station (highlighted - main feature)
3. Student Lookup
4. Book Management
5. Daily Operations
6. Reports

### Dashboard:
- Today's summary cards: Due Today, Overdue, Checkouts Today, Returns Today
- Quick action buttons: "Start Checkout", "Process Return"
- Pending requests count
- Recent transactions list (last 10)

### Circulation Station Page (FULL SCREEN MODE):
- Header: Large mode toggle (CHECKOUT | RETURN tabs), "Exit Station" button
- CHECKOUT mode:
  - Left panel: "Scan Student" section
    - Large input field with camera icon button
    - "Use Camera" toggle to show video scanner
    - Student info card after scan (name, ID, grade, photo placeholder)
    - Current loans count, overdue warning if any
    - "Clear" button
  - Right panel: "Scan Books" section (enabled after student selected)
    - Large input field with camera icon
    - Session books list (books scanned this session)
    - Each item shows: title, copy #, due date
    - "Complete Checkout" button
    - "Cancel" button
  - Bottom: Last transaction confirmation banner
- RETURN mode:
  - Single panel: "Scan Book to Return"
  - Large input with camera option
  - After scan shows: Book info, Borrower info, Days overdue (if any), Fine amount
  - Condition dropdown (Good, Fair, Poor, Damaged)
  - "Confirm Return" button
  - Success animation on completion

### Student Lookup Page:
- Search bar (by name, student ID, or RFID)
- Student profile card:
  - Photo placeholder, Name, Student ID, Grade-Section
  - Status badges
  - Stats: Total Borrowed, Currently Borrowed, Total Fines
- Tabs below profile:
  - Current Loans (table with renew/return actions)
  - Borrowing History (paginated table)
  - Fines (with pay button)
  - Reading Quota (progress bar + breakdown)

### Daily Operations Page:
- Tabs: Urgent (badge count) | Overdue | Due Today | Pending Requests | Summary
- Urgent tab: Combined overdue + pending payments needing attention
- Overdue tab: Table of overdue items with student contact info, days overdue, send reminder action
- Due Today tab: Books due today list
- Pending Requests tab:
  - Table: Request ID, Student, Book, Request Date, Type (reservation/request), Actions
  - Actions: Approve, Reject (with reason modal)
- Summary tab: Daily statistics, charts

---

## STUDENT PORTAL

### Sidebar Navigation:
1. Dashboard
2. Book Catalog
3. My Account
4. Notifications (with badge)

### Dashboard:
- Welcome message with student name
- Reading quota progress card (circular progress)
- Current loans cards:
  - Each shows: Book cover placeholder, Title, Due Date
  - Countdown: "Due in X days" or "OVERDUE" badge
  - Renew button (if allowed)
- Outstanding fines alert (if any)
- Recent activity

### Book Catalog Page:
- View toggle: Grid | List
- Search bar with filters: Category, Availability
- Book cards (grid view):
  - Cover image placeholder
  - Title
  - Author
  - Category badge
  - Availability: "X copies available" or "Not available"
  - "Request" button (if unavailable)
- Book detail modal:
  - Full info display
  - Copy availability list
  - Request button

### My Account Page:
- Account Information card (read-only):
  - Student ID, Name, Grade Level, Section, Email, Registration Date
- Borrowing History section:
  - Search/filter
  - Table: Book, Author, Checkout Date, Due Date, Return Date, Fine, Status
  - Pagination
- Outstanding Fines section:
  - Table: Book, Status, Fine Amount, checkbox
  - "Total Selected" display
  - "Pay Fines" button
- Pay Fines modal:
  - Checkbox list of fines with amounts
  - Total Selected: ₱XXX
  - Payment Method dropdown: "Pay at Library Counter"
  - Notes textarea
  - "Submit Payment Request" button
  - Note: "This creates a payment request. Please bring cash to the library counter for verification."

### Notifications Page:
- Filter: All | Unread
- Notification cards:
  - Icon based on type
  - Title
  - Message preview
  - Timestamp
  - Mark as read action
- Mark all as read button

---

## SHARED COMPONENTS

### Data Tables:
- Column sorting (click header)
- Pagination with: "Showing X-Y of Z", page size selector (10, 20, 50), page numbers
- Empty state with illustration
- Loading skeleton

### Modals:
- Consistent header with title and close button
- Form validation with inline errors
- Cancel and Submit buttons
- Loading state on submit

### Toast Notifications:
- Success (green)
- Error (red)
- Warning (yellow)
- Info (blue)
- Auto-dismiss after 5s

### Camera Scanner Component:
- Video preview area
- "Scanning..." overlay
- Cancel button
- Flash toggle (if supported)
- Manual entry fallback link

---

## Mock Data to Include:
- 15+ sample books across categories
- 10+ students across grade levels (7-12)
- 2 librarians
- 1 admin
- Sample transactions (active, returned, overdue)
- Sample fines (pending, paid)
- Sample book requests

## Technical Requirements:
- React 18+ with TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts for charts
- Lucide React icons
- React Router v6
- Responsive design (mobile-first)
- Dark mode support (optional toggle in header)

Generate a fully functional frontend prototype with all pages navigable, mock data displayed, and interactive components working with local state.
```

---

## 10. Implementation Plan

### 10.1 Phase Overview

| Phase | Focus | Duration |
|-------|-------|----------|
| Phase 1 | Foundation & Auth | Week 1-2 |
| Phase 2 | Book Management | Week 2-3 |
| Phase 3 | User Management | Week 3-4 |
| Phase 4 | Circulation | Week 4-5 |
| Phase 5 | Fines & Payments | Week 5-6 |
| Phase 6 | Reports & Analytics | Week 6-7 |
| Phase 7 | Polish & Deploy | Week 7-8 |

### 10.2 Phase 1: Foundation & Auth

**Backend Tasks:**
- [ ] Initialize Go project with Gin
- [ ] Set up sqlc and goose
- [ ] Create initial migrations (users, settings)
- [ ] Implement JWT authentication
- [ ] Create auth handlers (login, refresh, logout)
- [ ] Set up middleware (auth, CORS, logging)
- [ ] Create audit logging service

**Frontend Tasks:**
- [ ] Initialize React + Vite project
- [ ] Set up Tailwind + shadcn/ui
- [ ] Create layout components (Sidebar, Header)
- [ ] Implement auth pages (Login)
- [ ] Set up React Router with protected routes
- [ ] Create auth store (Zustand)
- [ ] Set up TanStack Query

### 10.3 Phase 2: Book Management

**Backend Tasks:**
- [ ] Create book/category/copy migrations
- [ ] Implement book CRUD handlers
- [ ] Implement category handlers
- [ ] Implement book copy handlers
- [ ] Create QR code generation service
- [ ] Implement book search/filter

**Frontend Tasks:**
- [ ] Books list page with data table
- [ ] Add/Edit book modal
- [ ] Category management
- [ ] Book copies view
- [ ] QR code display/print
- [ ] Book search and filters

### 10.4 Phase 3: User Management

**Backend Tasks:**
- [ ] Create student/librarian migrations
- [ ] Implement student CRUD handlers
- [ ] Implement librarian CRUD handlers
- [ ] RFID registration endpoint
- [ ] Excel import service (books, students)

**Frontend Tasks:**
- [ ] User management pages (tabs)
- [ ] Add/Edit user modals
- [ ] RFID registration flow
- [ ] Excel import interface
- [ ] Role-based navigation

### 10.5 Phase 4: Circulation

**Backend Tasks:**
- [ ] Create transaction migration
- [ ] Implement checkout handler
- [ ] Implement return handler
- [ ] Implement renewal handler
- [ ] QR/RFID lookup endpoints
- [ ] Transaction history endpoints
- [ ] Book request handlers

**Frontend Tasks:**
- [ ] Circulation station (full screen)
- [ ] Checkout flow UI
- [ ] Return flow UI
- [ ] Camera scanner integration
- [ ] Student lookup page
- [ ] Transaction history views
- [ ] Book request system

### 10.6 Phase 5: Fines & Payments

**Backend Tasks:**
- [ ] Create fines/payments migrations
- [ ] Fine calculation service
- [ ] Fine CRUD handlers
- [ ] Payment recording handlers
- [ ] Fine waiver endpoint

**Frontend Tasks:**
- [ ] Fines management page
- [ ] Payment recording modal
- [ ] Student fines view
- [ ] Payment request (student)
- [ ] Daily collection report

### 10.7 Phase 6: Reports & Analytics

**Backend Tasks:**
- [ ] Dashboard stats endpoint
- [ ] Report generation handlers
- [ ] Export to Excel service
- [ ] Reading quota calculation

**Frontend Tasks:**
- [ ] Admin dashboard with charts
- [ ] Librarian dashboard
- [ ] Student dashboard
- [ ] Report generation pages
- [ ] Export functionality
- [ ] Reading quota display

### 10.8 Phase 7: Polish & Deploy

**Tasks:**
- [ ] Error handling improvements
- [ ] Loading states everywhere
- [ ] Notification system
- [ ] Settings page
- [ ] Audit log viewer
- [ ] Performance optimization
- [ ] Security review
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Configure Neon database
- [ ] Set up monitoring
- [ ] Create user documentation

---

## 11. Deployment Strategy

### 11.1 Environment Variables

**Backend (.env):**
```env
# Server
PORT=8080
ENV=production

# Database
DATABASE_URL=postgres://user:pass@host/dbname?sslmode=require

# JWT
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

# CORS
ALLOWED_ORIGINS=https://holyredeemer-library.vercel.app
```

**Frontend (.env):**
```env
VITE_API_URL=https://api.holyredeemer-library.onrender.com
VITE_APP_NAME=Holy Redeemer Library
```

### 11.2 Deployment Checklist

**Pre-deployment:**
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Seed data applied
- [ ] SSL certificates ready

**Backend (Render):**
- [ ] Connect GitHub repository
- [ ] Set build command: `go build -o main ./cmd/server`
- [ ] Set start command: `./main`
- [ ] Configure environment variables
- [ ] Set up health check endpoint
- [ ] Enable auto-deploy from main branch

**Frontend (Vercel):**
- [ ] Connect GitHub repository
- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Configure environment variables
- [ ] Set up custom domain (optional)

**Database (Neon):**
- [ ] Create project
- [ ] Run migrations
- [ ] Apply seed data
- [ ] Note connection string
- [ ] Set up connection pooling

### 11.3 Monitoring & Maintenance

- **Uptime monitoring:** Use Render's built-in monitoring or UptimeRobot
- **Error tracking:** Consider Sentry integration
- **Database backups:** Neon handles automatic backups
- **Log retention:** Render retains logs for 7 days on free tier

---

## Appendix A: Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_INVALID_CREDENTIALS | 401 | Invalid username or password |
| AUTH_TOKEN_EXPIRED | 401 | Access token has expired |
| AUTH_UNAUTHORIZED | 403 | User not authorized for action |
| VALIDATION_ERROR | 400 | Request validation failed |
| RESOURCE_NOT_FOUND | 404 | Requested resource not found |
| RESOURCE_CONFLICT | 409 | Resource already exists |
| BORROWING_BLOCKED | 403 | Student blocked from borrowing |
| BOOK_UNAVAILABLE | 409 | No available copies |
| MAX_LOANS_REACHED | 409 | Student has max allowed loans |
| INTERNAL_ERROR | 500 | Internal server error |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Copy | Individual physical instance of a book |
| RFID | Radio-Frequency Identification (student ID cards) |
| QR Code | Quick Response code (unique per book copy) |
| Transaction | A checkout or return event |
| Circulation | The process of checking out and returning books |
| Fine | Monetary penalty for overdue/damaged/lost books |
| Quota | Required number of books per student per year |

---

*Document Version: 1.0*
*Last Updated: December 31, 2024*
*Authors: Development Team*
