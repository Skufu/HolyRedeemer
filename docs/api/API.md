# API Reference

Complete endpoint reference for the Holy Redeemer Library API.

**Base URL**: `http://localhost:8080/api/v1`

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### POST /auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "username": "admin",
      "name": "Administrator",
      "role": "admin"
    }
  }
}
```

### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

### POST /auth/logout
Invalidate refresh token.

### POST /auth/rfid/lookup
Lookup student by RFID card.

**Request:**
```json
{
  "rfid_code": "ABC123456"
}
```

### POST /auth/rfid/register
Register RFID card (student only).

---

## Books

### GET /books
List books with pagination and filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| per_page | int | Items per page (max: 100) |
| search | string | Search title/author/ISBN |
| category_id | uuid | Filter by category |
| status | string | Filter by status |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Book Title",
      "author": "Author Name",
      "isbn": "978-...",
      "category": "Fiction",
      "total_copies": 5,
      "available_copies": 3,
      "status": "active"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### GET /books/:id
Get book details with copies.

### POST /books
Create new book. **Staff only.**

**Request:**
```json
{
  "title": "New Book",
  "author": "Author",
  "isbn": "978-...",
  "category_id": "uuid",
  "publisher": "Publisher",
  "publication_year": 2024,
  "description": "Description",
  "shelf_location": "A-1",
  "replacement_cost": 500.00,
  "initial_copies": 3
}
```

### PUT /books/:id
Update book. **Staff only.**

### DELETE /books/:id
Archive book. **Admin only.**

### GET /books/:id/copies
List all copies of a book.

### POST /books/:id/copies
Add copy to book. **Staff only.**

---

## Categories

### GET /categories
List all categories.

### POST /categories
Create category. **Admin only.**

**Request:**
```json
{
  "name": "Science Fiction",
  "description": "Sci-fi books",
  "color_code": "#3B82F6"
}
```

### PUT /categories/:id
Update category. **Admin only.**

### DELETE /categories/:id
Delete category. **Admin only.**

---

## Book Copies

### GET /copies/:qr_code
Lookup copy by QR code.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "qr_code": "HR-a1b2c3d4-C1",
    "book": {
      "id": "uuid",
      "title": "Book Title",
      "author": "Author"
    },
    "status": "available",
    "condition": "good"
  }
}
```

### POST /copies/:qr_code/regenerate
Regenerate QR code. **Admin only.**

### POST /books/:id/copies/bulk-regenerate
Bulk regenerate QR codes. **Admin only.**

---

## Students

### GET /students/me
Get current student profile.

### GET /students/me/dashboard
Get student dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "current_loans": 3,
    "overdue_books": 1,
    "total_fines": 50.00,
    "books_read_this_year": 12,
    "achievements_count": 5,
    "recent_activity": []
  }
}
```

### GET /students/me/favorites
Get student's favorite books.

### POST /students/me/favorites
Add book to favorites.

**Request:**
```json
{
  "book_id": "uuid"
}
```

### DELETE /students/me/favorites/:bookId
Remove book from favorites.

### GET /students/me/achievements
Get student's achievements.

### GET /students
List students. **Staff only.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Name or student ID |
| grade_level | int | Filter by grade |
| section | string | Filter by section |
| status | string | active/inactive |

### GET /students/:id
Get student details.

### POST /students
Create student. **Admin only.**

**Request:**
```json
{
  "username": "student1",
  "password": "password",
  "student_id": "2024-0001",
  "name": "John Doe",
  "email": "john@school.edu",
  "grade_level": 10,
  "section": "A",
  "guardian_name": "Parent Name",
  "guardian_contact": "09123456789"
}
```

### PUT /students/:id
Update student. **Staff only.**

### GET /students/:id/loans
Get student's current loans.

### GET /students/:id/history
Get student's borrowing history.

### GET /students/:id/fines
Get student's fines.

### GET /students/:id/requests
Get student's requests.

---

## Circulation

### POST /circulation/checkout
Checkout book to student. **Staff only.**

**Request:**
```json
{
  "student_id": "uuid",
  "copy_id": "uuid",
  "due_date": "2024-02-01",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "student": {
      "name": "John Doe",
      "student_id": "2024-0001"
    },
    "book": {
      "title": "Book Title",
      "copy_number": 1
    },
    "checkout_date": "2024-01-15T10:00:00Z",
    "due_date": "2024-01-29"
  }
}
```

### POST /circulation/return
Return borrowed book. **Staff only.**

**Request:**
```json
{
  "copy_id": "uuid",
  "condition": "good",
  "notes": "Optional"
}
```

**Response includes fine if overdue:**
```json
{
  "data": {
    "transaction_id": "uuid",
    "return_date": "2024-02-05T10:00:00Z",
    "days_overdue": 7,
    "fine": {
      "id": "uuid",
      "amount": 35.00,
      "type": "overdue"
    }
  }
}
```

### POST /circulation/renew
Renew loan (extend due date).

**Request:**
```json
{
  "transaction_id": "uuid"
}
```

### GET /circulation/current
List all active loans. **Staff only.**

### GET /circulation/overdue
List overdue loans. **Staff only.**

---

## Transactions

### GET /transactions
List all transactions.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number |
| per_page | int | Items per page |
| student_id | uuid | Filter by student |
| status | string | borrowed/returned/overdue |
| start_date | date | Filter from date |
| end_date | date | Filter to date |

---

## Fines

### GET /fines
List all fines. **Staff only.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | pending/partial/paid/waived |
| student_id | uuid | Filter by student |

### GET /fines/:id
Get fine details with payments.

### POST /fines/:id/pay
Record payment. **Staff only.**

**Request:**
```json
{
  "amount": 50.00,
  "payment_method": "cash",
  "reference_number": "REC-001",
  "notes": "Partial payment"
}
```

### POST /fines/:id/waive
Waive fine. **Admin only.**

**Request:**
```json
{
  "reason": "Financial hardship"
}
```

---

## Reports

### GET /reports/dashboard
Dashboard statistics.

**Response:**
```json
{
  "data": {
    "total_books": 500,
    "total_copies": 1200,
    "active_students": 300,
    "current_loans": 150,
    "overdue_books": 12,
    "total_fines": 2500.00,
    "checkouts_today": 25,
    "returns_today": 18,
    "due_today": 8
  }
}
```

### GET /reports/charts/categories
Books grouped by category for charts.

### GET /reports/charts/trends
Monthly checkout/return trends.

### GET /reports/charts/top-borrowed
Most borrowed books.

### GET /reports/activity
Recent library activity.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| limit | int | Number of items (default: 50) |

---

## Notifications

### GET /notifications
List notifications.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| is_read | bool | Filter by read status |
| type | string | Filter by type |

### GET /notifications/unread-count
Get unread notification count.

### PUT /notifications/:id/read
Mark notification as read.

### PUT /notifications/read-all
Mark all notifications as read.

---

## Librarians

### GET /librarians
List librarians. **Admin only.**

### GET /librarians/:id
Get librarian details. **Admin only.**

### POST /librarians
Create librarian. **Admin only.**

**Request:**
```json
{
  "username": "librarian1",
  "password": "password",
  "name": "Jane Smith",
  "email": "jane@school.edu",
  "phone": "09123456789",
  "department": "Library"
}
```

### PUT /librarians/:id
Update librarian. **Admin only.**

### DELETE /librarians/:id
Delete librarian. **Admin only.**

---

## Admins

### GET /admins
List admins. **Super Admin only.**

### GET /admins/:id
Get admin details. **Super Admin only.**

### POST /admins
Create admin. **Super Admin only.**

### PUT /admins/:id
Update admin. **Super Admin only.**

### DELETE /admins/:id
Delete admin. **Super Admin only.**

---

## Audit Logs

### GET /audit-logs
Get audit logs. **Admin only.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| user_id | uuid | Filter by user |
| action | string | Filter by action type |
| entity_type | string | Filter by entity type |
| start_date | date | Filter from date |
| end_date | date | Filter to date |
| page | int | Page number |
| per_page | int | Items per page |

---

## Settings

### GET /settings
List all settings.

### GET /settings/:key
Get specific setting.

### PUT /settings
Update settings. **Admin only.**

**Request:**
```json
{
  "loan_duration_days": "7",
  "max_books_per_student": "3",
  "fine_per_day": "5.00"
}
```

### GET /settings/borrowing
Get borrowing-related settings.

### GET /settings/fines
Get fine-related settings.

---

## Cache Management

### POST /cache/clear
Clear server cache. **Super Admin only.**

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

## Technical Specification

Detailed technical documentation for API implementation.

### Architecture

```
┌─────────────────┐
│   Frontend    │
│   (React)     │
└───────┬─────────┘
        │ HTTP/JSON
        ▼
┌──────────────────────────────────────────┐
│          Gin Router                 │
│  (main.go - Route Registration)    │
└─────────────────┬──────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌─────────────┐
│   Middleware  │   │   Handlers  │
│   - Auth     │   │ (12 files)  │
│   - RBAC     │   │  65+ methods│
│   - Logging   │   └──────┬──────┘
└───────────────┘          │
                           ▼
                  ┌────────────────┐
                  │ sqlc Queries │
                  │   (70+ ops)  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌────────────────┐
                  │  PostgreSQL   │
                  └────────────────┘
```

### Tech Stack

- **Backend**: Go 1.24 + Gin framework
- **Database**: PostgreSQL with sqlc (type-safe queries)
- **Authentication**: JWT (15min access, 7 days refresh)
- **API Response Format**:
  ```json
  {
    "success": true,
    "data": {...},
    "meta": {"page": 1, "total": 100},
    "message": "Operation successful"
  }
  ```

### User Roles

| Role | Description | Permissions |
|------|-------------|--------------|
| `student` | Regular student users | View books, self-loans, fines, create requests |
| `librarian` | Library staff | Full circulation, book management, fines |
| `admin` | Administrators | All librarian + user management + settings |
| `super_admin` | Super administrator | All admin privileges + audit logs + cache management |

### Middleware Stack

1. **Auth Middleware** (`middleware.Auth`):
   - Validates JWT access token
   - Extracts user info (ID, role, username)
   - Adds `authUser` to context

2. **RBAC Middleware** (`middleware.RequireRoles`):
   - Checks if user has required role
   - Supports multiple roles (OR logic)

3. **Logger Middleware** (`middleware.Logger`):
   - Logs all HTTP requests
   - Records method, path, status, duration

4. **Recovery Middleware** (`middleware.Recovery`):
   - Catches panics
   - Returns 500 error response

5. **CORS Middleware** (`middleware.CORSConfig`):
   - Configurable origins
   - Handles preflight OPTIONS

### Endpoint Specifications

#### System Endpoints

**Health Check** - `GET /health`
- **Authentication**: Public
- **Purpose**: Infrastructure monitoring - checks database connectivity

**Lightweight Health Check** - `GET /healthz`
- **Authentication**: Public
- **Purpose**: Uptime monitoring (no DB check to avoid load)

#### Authentication Endpoints

**Login** - `POST /api/v1/auth/login`
- **Handler**: `authHandler.Login` (auth.go:54)
- **Flow**:
  1. Query user by username (`GetUserByUsername`)
  2. Verify password hash (`utils.CheckPassword`)
  3. Check user status (must be `active`)
  4. Generate JWT pair (access + refresh)
  5. Store refresh token hash in database (`CreateRefreshToken`)
- **Database Queries**: `GetUserByUsername`, `CreateRefreshToken`

**Refresh Token** - `POST /api/v1/auth/refresh`
- **Handler**: `authHandler.RefreshToken` (auth.go:125)
- **Flow**:
  1. Validate refresh token JWT
  2. Verify token hash exists in database (`GetRefreshToken`)
  3. Get user to ensure still active
  4. Generate new access token
  5. Return new access token
- **Database Queries**: `GetRefreshToken`, `GetUserByID`

**Logout** - `POST /api/v1/auth/logout`
- **Handler**: `authHandler.Logout` (auth.go:177)
- **Flow**:
  1. Delete refresh token hash from database if provided
  2. Return success (access token still valid until expiry)
- **Database Queries**: `DeleteRefreshToken`

**RFID Lookup** - `POST /api/v1/auth/rfid/lookup`
- **Handler**: `authHandler.RFIDLookup` (auth.go:209)
- **Flow**:
  1. Find student by RFID code (`GetStudentByRFID`)
  2. Get current loans count (`GetStudentCurrentLoans`)
  3. Get total unpaid fines (`GetStudentTotalFines`)
  4. Check if has overdue loans (`CountStudentOverdueLoans`)
  5. Return student eligibility data
- **Database Queries**: `GetStudentByRFID`, `GetStudentCurrentLoans`, `GetStudentTotalFines`, `CountStudentOverdueLoans`

**Register RFID** - `POST /api/v1/auth/rfid/register`
- **Handler**: `authHandler.RegisterRFID` (auth.go:254)
- **Flow**:
  1. Verify user is `student` role
  2. Parse user ID from JWT
  3. Update student record with RFID code (`RegisterStudentRFID`)
- **Database Queries**: `RegisterStudentRFID`

#### Book Management

**List Books** - `GET /api/v1/books`
- **Handler**: `bookHandler.ListBooks` (books.go:52)
- **Flow**:
  1. Parse pagination parameters
  2. Parse category ID if provided
  3. Query books with filters (`ListBooks`)
  4. Count total matching books (`CountBooks`)
  5. Transform to response format with copy counts
- **Database Queries**: `ListBooks`, `CountBooks`

**Get Book** - `GET /api/v1/books/:id`
- **Handler**: `bookHandler.GetBook` (books.go:125)
- **Flow**:
  1. Parse book ID from URL
  2. Query book by ID with copy counts (`GetBookByID`)
  3. Return book details
- **Database Queries**: `GetBookByID`

**Create Book** - `POST /api/v1/books`
- **Handler**: `bookHandler.CreateBook` (books.go:174)
- **Flow** (Transaction-based):
  1. Parse request body
  2. Begin database transaction
  3. Create book record (`CreateBook`)
  4. Loop to create N initial copies with auto-generated QR codes
  5. Commit transaction
  6. Return created book ID and copy count
- **Database Queries**: `CreateBook`, `CreateCopy`, `GetNextCopyNumber`

**Update Book** - `PUT /api/v1/books/:id`
- **Handler**: `bookHandler.UpdateBook` (books.go:251)
- **Flow**:
  1. Parse book ID
  2. Parse request body
  3. Update book record (`UpdateBook`)
- **Database Queries**: `UpdateBook`

**Delete Book** - `DELETE /api/v1/books/:id`
- **Handler**: `bookHandler.DeleteBook` (books.go:292)
- **Flow**:
  1. Parse book ID
  2. Soft delete by setting status to `archived` (`DeleteBook`)
  3. Note: Does NOT delete copies or transactions (historical data preserved)
- **Database Queries**: `DeleteBook`

**List Book Copies** - `GET /api/v1/books/:id/copies`
- **Handler**: `bookHandler.ListCopies` (books.go:323)
- **Flow**:
  1. Parse book ID
  2. Query all copies (`ListCopiesByBook`)
  3. Include current loan info if borrowed
- **Database Queries**: `ListCopiesByBook`

**Create Copy** - `POST /api/v1/books/:id/copies`
- **Handler**: `bookHandler.CreateCopy` (books.go:370)
- **Flow**:
  1. Parse book ID
  2. Get next copy number (`GetNextCopyNumber`)
  3. Generate QR code: `HR-{book_id[:8]}-C{number}`
  4. Create copy record (`CreateCopy`)
- **Database Queries**: `GetNextCopyNumber`, `CreateCopy`

**Get Copy by QR** - `GET /api/v1/copies/:qr_code`
- **Handler**: `bookHandler.GetCopyByQR` (books.go:493)
- **Flow**:
  1. Parse QR code from URL
  2. Query copy by QR code (`GetCopyByQRCode`)
  3. If borrowed, get active loan details (`GetActiveLoanByCopy`)
  4. Return copy info with current loan if applicable
- **Database Queries**: `GetCopyByQRCode`, `GetActiveLoanByCopy`

**Regenerate QR Code** - `POST /api/v1/copies/:qr_code/regenerate`
- **Handler**: `bookHandler.RegenerateQRCode` (books.go:413)
- **Flow**:
  1. Parse existing QR code
  2. Find copy (`GetCopyByQRCode`)
  3. Get next copy number (`GetNextCopyNumber`)
  4. Generate new QR code
  5. Update copy (`UpdateCopyQRCode`)
- **Database Queries**: `GetCopyByQRCode`, `GetNextCopyNumber`, `UpdateCopyQRCode`

**Bulk Regenerate QR Codes** - `POST /api/v1/books/:id/copies/bulk-regenerate`
- **Handler**: `bookHandler.BulkRegenerateQRCodes` (books.go:455)
- **Flow**:
  1. Parse book ID
  2. List all copies (`ListCopiesByBook`)
  3. For each copy: regenerate QR code
  4. Return count of updated codes
- **Database Queries**: `ListCopiesByBook`, `UpdateCopyQRCode`

**List Categories** - `GET /api/v1/categories`
- **Handler**: `bookHandler.ListCategories` (books.go:531)
- **Database Queries**: `ListCategories`

**Create Category** - `POST /api/v1/categories`
- **Handler**: `bookHandler.CreateCategory` (books.go:559)
- **Database Queries**: `CreateCategory`

#### Student Management

**Get Me** - `GET /api/v1/students/me`
- **Handler**: `studentHandler.GetMe` (students.go:170)
- **Flow**:
  1. Get user ID from JWT
  2. Find student by user ID (`GetStudentByUserID`)
  3. Get current loans and fines
  4. Return student profile
- **Database Queries**: `GetStudentByUserID`, `GetStudentCurrentLoans`, `GetStudentTotalFines`

**List Students** - `GET /api/v1/students`
- **Handler**: `studentHandler.ListStudents` (students.go:43)
- **Flow**:
  1. Parse filters
  2. Query students with subquery aggregates (`ListStudents`)
  3. Count matching students (`CountStudents`)
  4. Return paginated list with loans and fines
- **Database Queries**: `ListStudents`, `CountStudents`

**Get Student** - `GET /api/v1/students/:id`
- **Handler**: `studentHandler.GetStudent` (students.go:119)
- **Authorization**: Students can only view their own profile; Staff can view any student
- **Flow**:
  1. Parse student ID
  2. If student role: verify owns this profile
  3. Query student (`GetStudentByID`)
  4. Get loans and fines
  5. Return student details
- **Database Queries**: `GetStudentByID`, `GetStudentCurrentLoans`, `GetStudentTotalFines`

**Create Student** - `POST /api/v1/students`
- **Handler**: `studentHandler.CreateStudent` (students.go:223)
- **Flow**:
  1. Hash password
  2. Create user record (`CreateUser`)
  3. Create student record (`CreateStudent`)
  4. If student creation fails: rollback user deletion
  5. Return created IDs
- **Database Queries**: `CreateUser`, `CreateStudent`, `DeleteUser`

**Update Student** - `PUT /api/v1/students/:id`
- **Handler**: `studentHandler.UpdateStudent` (students.go:295)
- **Flow**:
  1. Parse student ID
  2. Get existing student to get user ID
  3. If name/email provided: update user record (`UpdateUser`)
  4. Update student fields (`UpdateStudent`)
  5. Return success
- **Database Queries**: `GetStudentByID`, `UpdateUser`, `UpdateStudent`

**Get Student Loans** - `GET /api/v1/students/:id/loans`
- **Handler**: `studentHandler.GetStudentLoans` (students.go:365)
- **Flow**:
  1. Parse student ID and pagination
  2. Query active loans for student (`ListActiveTransactions` filtered by student)
  3. Count total loans (`CountActiveTransactionsByStudent`)
  4. Return paginated loan list
- **Database Queries**: `ListActiveTransactions`, `CountActiveTransactionsByStudent`

**Get Student History** - `GET /api/v1/students/:id/history`
- **Handler**: `studentHandler.GetStudentHistory` (students.go:431)
- **Flow**:
  1. Query all transactions (including returned) (`ListTransactionsByStudent`)
  2. Count total transactions (`CountTransactionsByStudent`)
  3. Return paginated history
- **Database Queries**: `ListTransactionsByStudent`, `CountTransactionsByStudent`

**Get Student Fines** - `GET /api/v1/students/:id/fines`
- **Handler**: `studentHandler.GetStudentFines` (students.go:514)
- **Flow**:
  1. Query fines for student (`ListFinesByStudent`)
  2. Count fines (`CountFinesByStudent`)
  3. Return paginated fines
- **Database Queries**: `ListFinesByStudent`, `CountFinesByStudent`

#### Circulation

**Checkout** - `POST /api/v1/circulation/checkout`
- **Handler**: `circulationHandler.Checkout` (circulation.go:57)
- **Flow** (Critical Transaction):
  1. Get librarian ID from JWT
  2. Begin database transaction
  3. Validate student: exists, active status, loans < max, fines < threshold
  4. Validate copy with row lock: exists, status is `available`
  5. Calculate due date (default: 14 days, or custom)
  6. Create transaction (`CreateTransaction`)
  7. Update copy status to `borrowed` (`UpdateCopyStatus`)
  8. Commit transaction
  9. Return checkout details
- **Database Queries**: `GetStudentByID`, `GetStudentCurrentLoans`, `GetStudentTotalFines`, `GetCopyByIDForUpdate`, `CreateTransaction`, `UpdateCopyStatus`

**Return** - `POST /api/v1/circulation/return`
- **Handler**: `circulationHandler.Return` (circulation.go:225)
- **Flow** (Critical Transaction):
  1. Get librarian ID from JWT
  2. Begin database transaction
  3. Find active loan with row lock (`GetActiveLoanByCopyForUpdate`)
  4. Determine return condition (default: good)
  5. Update transaction with return info (`UpdateTransactionReturn`)
  6. Update copy status (poor → `damaged`, else `available`)
  7. Check if overdue: calculate days, apply grace period, create fine if applicable
  8. Commit transaction
  9. Return return info with fine if created
- **Database Queries**: `GetActiveLoanByCopyForUpdate`, `UpdateTransactionReturn`, `UpdateCopyStatus`, `CreateFine`

**Renew** - `POST /api/v1/circulation/renew`
- **Handler**: `circulationHandler.Renew` (circulation.go:370)
- **Flow** (Transaction):
  1. Begin transaction
  2. Get transaction with row lock (`GetTransactionByIDForUpdate`)
  3. If student role: verify transaction belongs to them
  4. Validate: not returned, renewal count < 2
  5. Extend due date by default loan period (14 days)
  6. Update transaction (`RenewTransaction`)
  7. If was overdue: update status back to `borrowed`
  8. Commit transaction
  9. Return new due date
- **Database Queries**: `GetTransactionByIDForUpdate`, `RenewTransaction`, `UpdateTransactionStatus`, `GetStudentByUserID`

**List Current Loans** - `GET /api/v1/circulation/current`
- **Handler**: `circulationHandler.ListCurrentLoans` (circulation.go:482)
- **Flow**:
  1. Parse pagination
  2. Query all active loans (`ListActiveTransactions`)
  3. Count total active loans (`CountActiveLoans`)
  4. Return paginated list
- **Database Queries**: `ListActiveTransactions`, `CountActiveLoans`

**List Overdue Loans** - `GET /api/v1/circulation/overdue`
- **Handler**: `circulationHandler.ListOverdue` (circulation.go:532)
- **Flow**:
  1. Parse pagination
  2. Query overdue loans (`ListOverdueTransactions`)
  3. Count overdue loans (`CountOverdueLoans`)
  4. Calculate fine amounts for each loan
  5. Return paginated list with days overdue and fine amounts
- **Database Queries**: `ListOverdueTransactions`, `CountOverdueLoans`

#### Fines Management

**List Fines** - `GET /api/v1/fines`
- **Handler**: `fineHandler.ListFines` (fines.go:23)
- **Flow**:
  1. Parse filters
  2. Query fines (`ListFines`)
  3. Count fines (`CountFines`)
  4. Return paginated list
- **Database Queries**: `ListFines`, `CountFines`

**Get Fine** - `GET /api/v1/fines/:id`
- **Handler**: `fineHandler.GetFine` (fines.go:81)
- **Flow**:
  1. Parse fine ID
  2. Query fine (`GetFineByID`)
  3. Query payments for this fine (`ListPaymentsByFine`)
  4. Calculate total paid (`GetTotalPaidForFine`)
  5. Return fine with payment history and remaining balance
- **Database Queries**: `GetFineByID`, `ListPaymentsByFine`, `GetTotalPaidForFine`

**Pay Fine** - `POST /api/v1/fines/:id/pay`
- **Handler**: `fineHandler.PayFine` (fines.go:137)
- **Flow**:
  1. Get fine details
  2. Validate not already paid or waived
  3. Get librarian ID
  4. Record payment (`CreatePayment`)
  5. Check if fully paid and update status accordingly
  6. Return payment details with remaining balance
- **Database Queries**: `GetFineByID`, `CreatePayment`, `GetTotalPaidForFine`, `UpdateFineStatus`

**Waive Fine** - `POST /api/v1/fines/:id/waive`
- **Handler**: `fineHandler.WaiveFine` (fines.go:223)
- **Flow**:
  1. Parse fine ID
  2. Validate not already paid
  3. Update status to `waived` (`UpdateFineStatus`)
  4. Return success
- **Database Queries**: `GetFineByID`, `UpdateFineStatus`

#### Requests & Reservations

**List Requests** - `GET /api/v1/requests`
- **Handler**: `requestHandler.ListRequests` (requests.go:23)
- **Flow**:
  1. Parse filters
  2. Query requests (`ListRequests`)
  3. Return list with student and book info
- **Database Queries**: `ListRequests`

**Create Request** - `POST /api/v1/requests`
- **Handler**: `requestHandler.CreateRequest` (requests.go:80)
- **Flow**:
  1. Get user ID from JWT
  2. Find student by user ID (`GetStudentByUserID`)
  3. Parse book ID
  4. Create request (`CreateRequest`)
  5. Return created request ID
- **Database Queries**: `GetStudentByUserID`, `CreateRequest`

**Get Pending Count** - `GET /api/v1/requests/pending-count`
- **Handler**: `requestHandler.GetPendingCount` (requests.go:131)
- **Database Queries**: `CountPendingRequests`

**Approve Request** - `PUT /api/v1/requests/:id/approve`
- **Handler**: `requestHandler.ApproveRequest` (requests.go:142)
- **Flow**:
  1. Parse request ID
  2. Get librarian ID from JWT
  3. Verify librarian exists (`GetLibrarianByUserID`)
  4. Update request status to `approved` (`ApproveRequest`)
  5. Return success
- **Database Queries**: `GetLibrarianByUserID`, `ApproveRequest`

**Reject Request** - `PUT /api/v1/requests/:id/reject`
- **Handler**: `requestHandler.RejectRequest` (requests.go:181)
- **Flow**:
  1. Parse request ID
  2. Get librarian ID
  3. Update request status to `rejected` with notes (`RejectRequest`)
  4. Return success
- **Database Queries**: `GetLibrarianByUserID`, `RejectRequest`

#### Librarian Management

**List Librarians** - `GET /api/v1/librarians`
- **Handler**: `librarianHandler.ListLibrarians` (librarians.go:52)
- **Database Queries**: `ListLibrarians`

**Get Librarian** - `GET /api/v1/librarians/:id`
- **Handler**: `librarianHandler.GetLibrarian` (librarians.go:87)
- **Database Queries**: `GetLibrarianByID`, `GetUserByID`

**Create Librarian** - `POST /api/v1/librarians`
- **Handler**: `librarianHandler.CreateLibrarian` (librarians.go:119)
- **Flow** (Transaction):
  1. Begin transaction
  2. Create user record (`CreateUser`) with `librarian` role
  3. Create librarian record (`CreateLibrarian`)
  4. Commit transaction
  5. Return created librarian
- **Database Queries**: `CreateUser`, `CreateLibrarian`

**Update Librarian** - `PUT /api/v1/librarians/:id`
- **Handler**: `librarianHandler.UpdateLibrarian` (librarians.go:178)
- **Flow** (Transaction):
  1. Parse librarian ID
  2. Get existing librarian
  3. Begin transaction
  4. If name/email provided: update user (`UpdateUser`)
  5. Update librarian fields (`UpdateLibrarian`)
  6. Commit transaction
  7. Return success
- **Database Queries**: `GetLibrarianByID`, `UpdateUser`, `UpdateLibrarian`

**Delete Librarian** - `DELETE /api/v1/librarians/:id`
- **Handler**: `librarianHandler.DeleteLibrarian` (librarians.go:225)
- **Flow**:
  1. Parse librarian ID
  2. Get librarian to get user ID
  3. Delete user record (cascades to librarian) (`DeleteUser`)
  4. Return success
- **Database Queries**: `GetLibrarianByID`, `DeleteUser`

#### Admin Management

**List Admins** - `GET /api/v1/admins`
- **Handler**: `adminHandler.ListAdmins` (admins.go)
- **Database Queries**: `ListAdmins`

**Get Admin** - `GET /api/v1/admins/:id`
- **Handler**: `adminHandler.GetAdmin` (admins.go)
- **Database Queries**: `GetAdminByID`

**Create Admin** - `POST /api/v1/admins`
- **Handler**: `adminHandler.CreateAdmin` (admins.go)
- **Flow** (Transaction):
  1. Begin transaction
  2. Create user record with `admin` role
  3. Create admin record
  4. Commit transaction
  5. Return created admin

**Update Admin** - `PUT /api/v1/admins/:id`
- **Handler**: `adminHandler.UpdateAdmin` (admins.go)

**Delete Admin** - `DELETE /api/v1/admins/:id`
- **Handler**: `adminHandler.DeleteAdmin` (admins.go)

#### Reports & Analytics

**Get Dashboard Stats** - `GET /api/v1/reports/dashboard`
- **Handler**: `reportHandler.GetDashboardStats` (reports.go:31)
- **Database Queries**: `GetDashboardStats`

**Get Books by Category** - `GET /api/v1/reports/charts/categories`
- **Handler**: `reportHandler.GetBooksByCategory` (reports.go:59)
- **Database Queries**: `GetBooksByCategory`

**Get Monthly Trends** - `GET /api/v1/reports/charts/trends`
- **Handler**: `reportHandler.GetMonthlyTrends` (reports.go:86)
- **Database Queries**: `GetMonthlyTrends`

**Get Top Borrowed Books** - `GET /api/v1/reports/charts/top-borrowed`
- **Handler**: `reportHandler.GetTopBorrowedBooks` (reports.go:106)
- **Database Queries**: `GetTopBorrowedBooks`

**Get Recent Activity** - `GET /api/v1/reports/activity`
- **Handler**: `reportHandler.GetRecentActivity` (reports.go:133)
- **Database Queries**: `GetRecentActivity`

#### Notifications

**List Notifications** - `GET /api/v1/notifications`
- **Handler**: `notificationHandler.ListNotifications` (notifications.go:34)
- **Flow**:
  1. Get user ID from JWT
  2. Parse read filter
  3. Query notifications (`ListUserNotifications`)
  4. Count notifications (`CountUserNotifications`)
  5. Return paginated list
- **Database Queries**: `ListUserNotifications`, `CountUserNotifications`

**Get Unread Count** - `GET /api/v1/notifications/unread-count`
- **Handler**: `notificationHandler.GetUnreadCount` (notifications.go:107)
- **Database Queries**: `GetUnreadCount`

**Mark Notification as Read** - `PUT /api/v1/notifications/:id/read`
- **Handler**: `notificationHandler.MarkAsRead` (notifications.go:129)
- **Database Queries**: `MarkNotificationRead`

**Mark All Notifications as Read** - `PUT /api/v1/notifications/read-all`
- **Handler**: `notificationHandler.MarkAllAsRead` (notifications.go:145)
- **Database Queries**: `MarkAllNotificationsRead`

#### Settings

**List Settings** - `GET /api/v1/settings`
- **Handler**: `settingsHandler.ListSettings` (settings.go:31)
- **Database Queries**: `ListSettings`

**Get Setting** - `GET /api/v1/settings/:key`
- **Handler**: `settingsHandler.GetSetting` (settings.go:58)
- **Database Queries**: `GetSetting`

**Update Settings** - `PUT /api/v1/settings`
- **Handler**: `settingsHandler.UpdateSettings` (settings.go:78)
- **Flow**:
  1. Parse settings object
  2. Get admin user ID
  3. Loop through each key/value pair
  4. Update each setting (`UpdateSetting`)
  5. Return success
- **Database Queries**: `UpdateSetting`

**Get Borrowing Settings** - `GET /api/v1/settings/borrowing`
- **Handler**: `settingsHandler.GetBorrowingSettings` (settings.go:108)
- **Database Queries**: `ListSettings`

**Get Fine Settings** - `GET /api/v1/settings/fines`
- **Handler**: `settingsHandler.GetFineSettings` (settings.go:125)
- **Database Queries**: `ListSettings`

#### Audit Logs

**List Audit Logs** - `GET /api/v1/audit-logs`
- **Handler**: `auditHandler.ListAuditLogs` (audit.go:35)
- **Flow**:
  1. Parse filters
  2. Query audit logs (`ListAuditLogs`)
  3. Return paginated list with JSON old/new values
- **Database Queries**: `ListAuditLogs`

#### Cache Management

**Clear Cache** - `POST /api/v1/cache/clear`
- **Handler**: `cacheAdminHandler.Clear` (cache_admin.go)

### Transaction Integrity

| Operation | Handler | Transaction Used |
|-----------|----------|-----------------|
| Create Book | `CreateBook` | ✅ Yes |
| Create Librarian | `CreateLibrarian` | ✅ Yes |
| Update Librarian | `UpdateLibrarian` | ✅ Yes |
| Create Admin | `CreateAdmin` | ✅ Yes |
| Update Admin | `UpdateAdmin` | ✅ Yes |
| Checkout | `Checkout` | ✅ Yes |
| Return | `Return` | ✅ Yes |
| Renew | `Renew` | ✅ Yes |
| Pay Fine | `PayFine` | ✅ Yes |
| Create Student | `CreateStudent` | ✅ Yes |

### Database Schema Coverage

Tables with Full CRUD Implementation:
- ✅ `users` (auth.go)
- ✅ `students` (students.go)
- ✅ `librarians` (librarians.go)
- ✅ `admins` (admins.go)
- ✅ `books` (books.go)
- ✅ `categories` (books.go)
- ✅ `book_copies` (books.go)
- ✅ `transactions` (circulation.go)
- ✅ `fines` (fines.go)
- ✅ `payments` (fines.go)
- ✅ `requests` (requests.go)
- ✅ `notifications` (notifications.go)
- ✅ `settings` (settings.go)
- ✅ `audit_logs` (audit.go - read only)
- ✅ `student_favorites` (students.go)
- ✅ `achievements` (students.go)

---

## Book Requests

### GET /requests
List book requests. **Staff only.**

### POST /requests
Create book request.

**Request:**
```json
{
  "book_id": "uuid",
  "request_type": "reservation",
  "notes": "For research project"
}
```

### GET /requests/pending-count
Get pending requests count.

### PUT /requests/:id/approve
Approve request. **Staff only.**

### PUT /requests/:id/reject
Reject request. **Staff only.**

### PUT /requests/:id/fulfill
Mark request as fulfilled. **Staff only.**

---

## Achievements

### GET /achievements
List all available achievements.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "first_book",
      "name": "First Book",
      "description": "Borrowed your first book",
      "icon": "book-open",
      "color": "blue",
      "requirement_type": "books_borrowed",
      "requirement_value": 1
    }
  ]
}
```

---

## Health Checks

### GET /health
Full health check with database connection.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### GET /healthz
Lightweight health check (no database query).

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Description of the error"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Error |

---

## Rate Limits

API requests are subject to rate limiting:
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## Authentication Header

All protected endpoints require:

```
Authorization: Bearer <access_token>
```
