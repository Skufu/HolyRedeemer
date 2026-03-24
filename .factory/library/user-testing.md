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
