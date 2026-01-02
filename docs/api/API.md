# API Reference

Complete endpoint reference for the Holy Redeemer Library API.

**Base URL**: `http://localhost:8080/api/v1`

---

## Authentication

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

### POST /auth/rfid-lookup
Lookup student by RFID card.

**Request:**
```json
{
  "rfid_code": "ABC123456"
}
```

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
      "totalCopies": 5,
      "availableCopies": 3,
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
Get book details.

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
Archive book. **Staff only.**

### GET /books/:id/copies
List all copies of a book.

### POST /books/:id/copies
Add copy to book. **Staff only.**

### GET /copies/qr/:code
Lookup copy by QR code.

---

## Categories

### GET /categories
List all categories.

### POST /categories
Create category. **Staff only.**

---

## Students

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
Create student. **Staff only.**

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

### GET /circulation/loans
List all active loans. **Staff only.**

### GET /circulation/overdue
List overdue loans. **Staff only.**

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

---

## Reports

### GET /reports/dashboard
Dashboard statistics.

**Response:**
```json
{
  "data": {
    "totalBooks": 500,
    "totalCopies": 1200,
    "activeStudents": 300,
    "currentLoans": 150,
    "overdueBooks": 12,
    "totalFines": 2500.00,
    "checkoutsToday": 25,
    "returnsToday": 18,
    "dueToday": 8
  }
}
```

### GET /reports/books-by-category
Books grouped by category for charts.

### GET /reports/monthly-trends
Monthly checkout/return trends.

### GET /reports/top-books
Most borrowed books.

### GET /reports/activity
Recent library activity.

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

## Authentication Header

All protected endpoints require:

```
Authorization: Bearer <access_token>
```
