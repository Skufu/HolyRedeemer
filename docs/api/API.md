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
