# User Testing Guide

## Testing Overview

This document contains discovered testing knowledge for the Holy Redeemer Library system.

## Environment Setup

### Services

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 5433 | Docker container `library_db` |
| Backend API | 8080 | Go server |

### Starting Services

```powershell
# Check if database is running
docker ps

# Start backend server (from backend directory)
go build -o server.exe ./cmd/server
Start-Process -FilePath "server.exe" -WindowStyle Hidden

# Check server health
curl.exe -s http://localhost:8080/health
```

### Test Users

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| super_admin | admin | admin123 | Full access to all endpoints |
| librarian | librarian | lib123 | Library operations access |
| admin | adminuser | lib123 | Admin-only functions (created for testing) |

**Note:** The seed data does not include an `admin` role user by default. Create one if needed for testing:
```sql
INSERT INTO users (id, username, password_hash, role, email, name) 
VALUES ('a0000000-0000-0000-0000-000000000099', 'adminuser', '$2a$10$2OZujduLf1qRTOqcenVQ6ek.VlaRzF/ZyW3kDEI9oCCIa65AxyeY2', 'admin', 'adminuser@holyredeemer.edu.ph', 'Admin User');
```

### Getting JWT Tokens

```powershell
# Login and get token
$response = curl.exe -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" --data-raw '{\"username\":\"librarian\",\"password\":\"lib123\"}'
$token = ($response | ConvertFrom-Json).data.access_token
```

## Testing Tools

### API Testing with curl.exe

On Windows PowerShell, use `curl.exe` (not `curl` alias) with `--data-raw` for JSON payloads:

```powershell
# Correct format for JSON in PowerShell
curl.exe -s -X POST http://localhost:8080/api/v1/books -H "Content-Type: application/json" -H "Authorization: Bearer $token" --data-raw '{\"title\":\"Test Book\",\"author\":\"Test Author\"}'
```

Alternatively, use a JSON file:
```powershell
'{"title":"Test Book","author":"Test Author"}' | Out-File -FilePath "test.json" -Encoding ascii
curl.exe -s -X POST http://localhost:8080/api/v1/books -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d @test.json
```

## Backend API Request Formats

### Books

```json
// POST /api/v1/books
{
  "title": "Book Title",
  "author": "Author Name",
  "isbn": "1234567890",
  "category_id": "d0000001-0000-0000-0000-000000000001",
  "publisher": "Publisher Name",
  "publication_year": 2024,
  "description": "Description",
  "shelf_location": "A-001",
  "replacement_cost": 100.00,
  "initial_copies": 1
}

// PUT /api/v1/books/:id
{
  "title": "Updated Title",
  "author": "Updated Author"
}

// POST /api/v1/books/:id/copies
{
  "initial_copies": 1
}
```

### Fines

```json
// POST /api/v1/fines/:id/pay
{
  "amount": 10.00,
  "payment_method": "cash"
}

// POST /api/v1/fines/:id/waive
{}
```

## Validation Concurrency

### Backend API Testing

Max concurrent validators: 5 (API calls are stateless and don't interfere)

## Flow Validator Guidance: Backend API

### Isolation Rules

1. Each validator should use unique test data (book IDs, copy numbers) to avoid conflicts
2. Avoid modifying shared test fixtures during parallel testing
3. Clean up created test data after validation if possible

### Endpoints Requiring Sequential Testing

None identified for backend permissions. All permission assertions can run in parallel.

## PowerShell Quirks

- Use `curl.exe` instead of `curl` (PowerShell alias for Invoke-WebRequest)
- Use `--data-raw` with escaped quotes `\"` for inline JSON
- JSON file input with `-d @file.json` is most reliable
- Use `Set-Location` instead of `cd` for directory changes
- Chain commands with `;` instead of `&&`

## Frontend Routes Testing

### Services

| Service | Port | URL |
|---------|------|-----|
| Frontend Dev Server | 4127 | http://localhost:4127 |
| Backend API | 8080 | http://localhost:8080 |

### Starting Frontend

```powershell
cd frontend
npm run dev
# Frontend runs on port 4127
```

## Flow Validator Guidance: Frontend Routes

### Testing Tool

Use `agent-browser` skill for browser automation testing of frontend routes.

### Isolation Rules

1. Each validator should use a separate browser session (--session parameter)
2. Do not share cookies/localStorage between validators
3. Test user login credentials are provided per-assertion group

### Test Users

| Role | Username | Password | Access |
|------|----------|----------|--------|
| librarian | librarian | lib123 | /librarian/* routes |
| admin | admin | admin123 | /admin/* routes |
| super_admin | admin | admin123 | Both /admin/* and /librarian/* routes |

### Assertions to Test

- VAL-ROUTES-001: /admin/books redirects to /librarian/books-management
- VAL-ROUTES-002: /admin/qr-management redirects to /librarian/qr-management
- VAL-ROUTES-003: /admin/excel-migration redirects to /librarian/excel-migration
- VAL-ROUTES-004: /admin/reports redirects to /librarian/reports
- VAL-ROUTES-005: /librarian/books-management renders BooksManagement component
- VAL-ROUTES-006: /librarian/qr-management renders QRManagement component
- VAL-ROUTES-007: /librarian/excel-migration renders ExcelMigration component
- VAL-ROUTES-008: Librarian can navigate to all librarian routes without auth errors

### Concurrency

Max concurrent validators: 2 (browser instances are resource-intensive)

## Flow Validator Guidance: Sidebar Navigation

### Testing Tool

Use `agent-browser` skill for browser automation testing of sidebar navigation.

### Isolation Rules

1. Each validator should use a separate browser session (--session parameter)
2. Do not share cookies/localStorage between validators
3. Test user login credentials are provided per-assertion group
4. Sidebar tests should not modify any data - they are read-only verification

### Test Users

| Role | Username | Password | Expected Sidebar Items |
|------|----------|----------|------------------------|
| admin | admin | admin123 | Dashboard, Users Management, Audit Logs, School Year Setup, Settings, User Settings |
| librarian | librarian | lib123 | Dashboard, Circulation, Books Catalog, Book Management, QR Management, Excel Migration, Student Lookup, Daily Operations, Reports, Settings |
| super_admin | admin | admin123 | Same as admin |

### Assertions to Test

- VAL-SIDEBAR-001: Admin sidebar has no "Books Management" link
- VAL-SIDEBAR-002: Admin sidebar has no "QR/Copy Management" link
- VAL-SIDEBAR-003: Admin sidebar has no "Excel Migration" link
- VAL-SIDEBAR-004: Admin sidebar has no "Circulation" link
- VAL-SIDEBAR-005: Admin sidebar shows required admin links (Users Management, Audit Logs, School Year Setup, Settings, User Settings)
- VAL-SIDEBAR-006: Librarian sidebar has "Book Management" link
- VAL-SIDEBAR-007: Librarian sidebar has "QR Management" link
- VAL-SIDEBAR-008: Librarian sidebar has "Excel Migration" link
- VAL-SIDEBAR-009: Librarian sidebar has "Circulation" link
- VAL-SIDEBAR-010: Librarian sidebar has no "Users Management" link
- VAL-SIDEBAR-011: Sidebar link navigation behavior

### Concurrency

Max concurrent validators: 2 (browser instances are resource-intensive)

### Testing Approach

1. Login as the test user
2. Navigate to the dashboard
3. Wait for sidebar to load
4. Extract all sidebar navigation labels
5. Verify presence/absence of expected labels
6. For VAL-SIDEBAR-011, click each link and verify navigation
