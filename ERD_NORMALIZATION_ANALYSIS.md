# School Library Database - ERD Normalization Analysis

## 📊 Normalization Level Achieved: **3NF (Third Normal Form)**

This schema achieves **Third Normal Form** with some intentional denormalization for performance. Here's the breakdown:

### Normal Forms Explained

| Form | Requirement | This Schema | Status |
|------|-------------|-------------|--------|
| **1NF** | Atomic values, no repeating groups | All fields atomic; authors split to junction table | ✅ |
| **2NF** | No partial dependencies (PK is whole key) | All non-key attributes depend on full PK | ✅ |
| **3NF** | No transitive dependencies | Person data in `users`, not duplicated in profiles | ✅ |
| **BCNF** | Every determinant is a candidate key | Achieved for core entities | ✅ |
| **4NF** | No multi-valued dependencies | `book_authors` handles multi-author case | ✅ |

---

## 🎯 Entity-by-Entity Breakdown

### 1. USERS (Authentication Base)

```
users ||--o| student_profiles : "is a (if role=student)"
users ||--o| staff_profiles : "is a (if role=staff)"
```

**What it is:** Central identity/authentication table

**Connected to:**
- `student_profiles` (1:1) — extends users who are students
- `staff_profiles` (1:1) — extends users who are staff
- `refresh_tokens` (1:N) — for JWT token rotation
- `audit_logs` (1:N) — who performed actions
- `notifications` (1:N) — recipient of notifications

**Rationale — WHY this design:**
- **Single Sign-On:** One login for all roles (student, librarian, admin)
- **Avoid Data Duplication:** `name` and `email` stored ONCE, not repeated in every role table
- **Role Flexibility:** A user can have multiple roles over time (student becomes staff)
- **Security:** Password and auth centralized; profile extensions have no auth data

**Pattern Used:** Class Table Inheritance (CTI)
- `users` = supertype (common attributes)
- `student_profiles`, `staff_profiles` = subtypes (role-specific attributes)

**3NF Compliance:**
- ✅ No transitive dependencies (email depends only on user_id)
- ✅ No partial dependencies (all attributes depend on full PK)

---

### 2. STUDENT_PROFILES (Student Extension)

```
student_profiles ||--o{ transactions : "borrows"
student_profiles ||--o{ fines : "owes"
student_profiles ||--o{ book_requests : "makes"
student_profiles ||--o{ favorite_books : "saves"
student_profiles ||--o{ student_achievements : "earns"
student_profiles ||--o{ notifications : "receives"
```

**What it is:** Student-specific data extension

**Connected to:**
- `users` (1:1) — who this student is
- `transactions` (1:N) — books borrowed
- `fines` (1:N) — monetary obligations
- `book_requests` (1:N) — reservation requests
- `favorite_books` (1:N) — bookmarked books
- `student_achievements` (1:N) — earned badges
- `notifications` (1:N) — messages received

**Rationale — WHY separate table:**
- **Not All Users Are Students:** Admins and staff don't need student_id, grade_level, guardian info
- **Data Isolation:** Student PII (guardian contact, address) separated from auth
- **Enrollment Tracking:** `enrollment_date` distinct from `users.created_at` (account creation vs. school enrollment)
- **Cardinalities:** One user = zero or one student profile

**Normalization Note:**
- `grade_level` + `homeroom` could be a separate `classes` table (4NF), but kept here for simplicity
- **Trade-off:** Slight denormalization for query performance (avoids joins for common student queries)

---

### 3. STAFF_PROFILES (Staff Extension)

```
staff_profiles ||--o{ transactions : "processes checkout"
staff_profiles ||--o{ transactions : "processes return"
staff_profiles ||--o{ book_requests : "approves"
staff_profiles ||--o{ payments : "records"
staff_profiles ||--o{ library_settings : "updates"
```

**What it is:** Staff/librarian-specific data extension

**Connected to:**
- `users` (1:1) — who this staff member is
- `transactions` (1:N) — checkouts processed (as `staff_id`)
- `transactions` (1:N) — returns processed (separate relationship)
- `book_requests` (1:N) — approvals made
- `payments` (1:N) — payments recorded
- `library_settings` (1:N) — settings modified

**Rationale — WHY removed name/email:**
```
BEFORE (Violated 3NF):
  staff_profiles.name  → depends on user_id → users.name
  staff_profiles.email → depends on user_id → users.email

AFTER (3NF Compliant):
  staff_profiles only has: employee_number, staff_type, department, hire_date
  name/email accessed via: staff_profiles → users
```

**WHY this matters:**
- **Update Anomaly Prevention:** Change name once in `users`, reflects everywhere
- **Data Consistency:** No risk of `staff_profiles.name` ≠ `users.name`
- **Storage Efficiency:** Eliminates redundant storage

---

### 4. CATEGORIES (Book Classification)

```
categories ||--o{ books : "contains"
categories ||--o{ categories : "parent of (self-reference)"
```

**What it is:** Book categorization with hierarchy support

**Connected to:**
- `books` (1:N) — books in this category
- `categories` (1:N self) — subcategories (parent_id)

**Rationale — WHY separate table:**
- **Dynamic Classification:** Categories change (new genres added)
- **Hierarchy Support:** parent_id allows nested categories (Fiction → Science Fiction → Cyberpunk)
- **Multiple Books:** Many books share one category — classic 1:N relationship

**Alternative Considered:**
- Enum: `book.category = 'fiction'|'non-fiction'|...`
- **Rejected because:** Categories are business-managed, not system constants

---

### 5. BOOKS (Title Master)

```
books ||--o{ book_copies : "has copies"
books ||--o{ book_authors : "authored by"
books ||--o{ favorite_books : "is favorited"
books ||--o{ book_requests : "requested"
```

**What it is:** Catalog of book titles (not physical copies)

**Connected to:**
- `categories` (N:1) — which category
- `book_copies` (1:N) — physical copies of this title
- `book_authors` (1:N) — authors (junction table)
- `favorite_books` (1:N) — who favorited
- `book_requests` (1:N) — reservation requests

**Rationale — WHY title/copy separation:**
- **Inventory Tracking:** 10 copies of "Harry Potter" = 1 book record + 10 book_copies records
- **QR Codes:** Each copy gets unique barcode/QR
- **Condition Tracking:** Each copy has its own condition history
- **Location:** Each copy can have different shelf location (if moved)

**3NF Compliance:**
- ✅ `isbn` → determines title, author, publisher (but ISBN is candidate key, not transitive)
- ✅ All attributes depend directly on `book_id`

---

### 6. BOOK_COPIES (Physical Inventory)

```
book_copies ||--o{ transactions : "checked out in"
```

**What it is:** Individual physical copies

**Connected to:**
- `books` (N:1) — which title
- `transactions` (1:N) — borrowing history

**Rationale — WHY separate from books:**
- **Unique Identifiers:** Each copy needs unique `barcode`
- **Individual Tracking:** Copy #1 lost, Copy #2 damaged, Copy #3 available
- **Circulation History:** Track which specific copy a student borrowed
- **Acquisition:** Different copies acquired at different times/costs

**Real-World Analogy:**
- `books` = Product SKU ("Harry Potter, Hardcover")
- `book_copies` = Individual items in warehouse (Copy #1, Copy #2, etc.)

---

### 7. AUTHORS (Author Master)

```
authors ||--o{ book_authors : "writes"
```

**What it is:** Author information (new table vs. original schema)

**Connected to:**
- `book_authors` (1:N) — books written

**Rationale — WHY added this table:**
```
ORIGINAL SCHEMA (Problematic):
  books.author = "J.K. Rowling"  -- What if book has co-authors?
  books.author = "Rowling, J.K." -- Inconsistent formatting
  
NEW SCHEMA (Normalized):
  authors.name = "J.K. Rowling"
  book_authors: (book_id=1, author_id=1, order=1)
                  (book_id=1, author_id=2, order=2) -- co-author
```

**4NF Compliance:**
- ✅ Handles multi-valued attribute (multiple authors per book)
- ✅ Junction table `book_authors` with ordering support

---

### 8. TRANSACTIONS (Circulation)

```
transactions ||--o| fines : "generates (0 or 1)"
transactions ||--o{ notifications : "triggers"
```

**What it is:** Book checkout/return records

**Connected to:**
- `student_profiles` (N:1) — who borrowed
- `book_copies` (N:1) — which copy
- `staff_profiles` (N:1) — who processed checkout
- `staff_profiles` (N:1) — who processed return (different FK)
- `fines` (1:0..1) — generated fine (if any)
- `notifications` (1:N) — triggered notifications

**Rationale — WHY central table:**
- **Borrowing History:** Complete audit trail of who borrowed what when
- **Overdue Detection:** `due_date < CURRENT_DATE AND return_date IS NULL`
- **Renewal Tracking:** `renewal_count` limits extensions
- **Statistics:** Most borrowed books, peak usage times

**Cardinality — WHY 1:0..1 to fines:**
```
1 transaction → 0 or 1 fine
(Not 1:N because one loan = one fine event)
```

**3NF Note:**
- `status` is derivable (based on dates), but stored for query performance
- **Intentional Denormalization:** Faster filtering by status index

---

### 9. FINES (Monetary Obligations)

```
fines ||--o{ payments : "paid by"
```

**What it is:** Financial penalties (overdue, damage, lost)

**Connected to:**
- `transactions` (N:1, nullable) — which loan caused it
- `student_profiles` (N:1) — who owes it
- `payments` (1:N) — payments made against it

**Rationale — WHY keep student_id (not just transaction_id):**
```
SCENARIO: Manual Fine (No Transaction)
  - Student loses library card → $5 replacement fee
  - This is NOT tied to a book loan
  - So transaction_id = NULL
  - But student_id = required
  
SCENARIO: Loan-Related Fine
  - Book overdue → $10 fine
  - transaction_id = 123
  - student_id = 456 (same as transaction's student)
  - REDUNDANT? Yes, but allows manual fines
```

**Design Decision:**
- Keep `student_id` in `fines` to support non-loan fines
- Accept slight denormalization for business flexibility

---

### 10. PAYMENTS (Financial Transactions)

```
payments }o--|| fines : "belongs to"
```

**What it is:** Payment records against fines

**Connected to:**
- `fines` (N:1) — which fine is being paid
- `staff_profiles` (N:1) — who recorded the payment

**Rationale — WHY removed student_id:**
```
BEFORE (Redundant):
  payments: {fine_id: 1, student_id: 5, amount: 10}
  fines:    {fine_id: 1, student_id: 5, amount: 10}  -- DUPLICATE!
  
AFTER (Normalized):
  payments: {fine_id: 1, amount: 10}  -- student derived from fine
  fines:    {fine_id: 1, student_id: 5, amount: 10}
  
Query to get student: payments → fines → student_profiles
```

**3NF Compliance:**
- ✅ `student_id` removed (transitive dependency eliminated)
- ✅ All attributes depend directly on `payment_id`

**Partial Payments Support:**
- Fine = $100, Payment 1 = $30, Payment 2 = $70
- That's why `fines ||--o{ payments` (1 fine, many payments)

---

### 11. BOOK_REQUESTS (Reservations)

```
book_requests }o--|| student_profiles : "made by"
book_requests }o--|| books : "for book"
```

**What it is:** Book reservation/hold requests

**Connected to:**
- `student_profiles` (N:1) — who requested
- `books` (N:1) — which title
- `staff_profiles` (N:1) — who approved/denied

**Rationale — WHY separate table:**
- **Queue Management:** Popular books have waitlists
- **Request Lifecycle:** pending → approved → fulfilled → completed
- **Notification Triggers:** When book available, notify next in queue
- **Policy Enforcement:** Max 3 active requests per student

---

### 12. FAVORITE_BOOKS (Student Bookmarks)

```
favorite_books }o--|| student_profiles : "saved by"
favorite_books }o--|| books : "is"
```

**What it is:** Many-to-many junction table

**Connected to:**
- `student_profiles` (N:1)
- `books` (N:1)

**Rationale — WHY junction table:**
- **Many-to-Many:** One student favorites many books; one book favorited by many students
- **Timestamp:** When they favorited it (for "recently favorited" lists)
- **No Additional Data:** Just the relationship + timestamp = perfect junction table

---

### 13. SUPPORT TABLES (Secondary)

#### NOTIFICATIONS
```
notifications }o--|| users : "recipient"
```
**Purpose:** In-app messaging system
**Polymorphic Reference:** `related_entity_id` + `related_entity_type` (transaction|fine|request)
**Rationale:** One notification system for all event types

#### AUDIT_LOGS
```
audit_logs }o--|| users : "performed by"
```
**Purpose:** Security/change tracking
**JSON Fields:** `old_values`, `new_values` store complete record state
**Rationale:** Compliance and debugging

#### LIBRARY_SETTINGS
```
library_settings }o--|| staff_profiles : "updated by"
```
**Purpose:** Configurable policies (loan duration, fine rates)
**Key-Value Pattern:** Flexible configuration without schema changes

#### REFRESH_TOKENS
```
refresh_tokens }o--|| users : "belongs to"
```
**Purpose:** JWT refresh token rotation
**Security:** Tokens can be revoked (is_revoked flag)

---

## 📐 Design Patterns Summary

### Pattern 1: Class Table Inheritance (CTI)
**Where:** `users` → `student_profiles`, `staff_profiles`
**Why:** Common auth data in parent, role-specific in children
**Benefit:** No null columns, clean 3NF

### Pattern 2: Junction Tables for Many-to-Many
**Where:** `book_authors`, `favorite_books`, `student_achievements`
**Why:** Proper 4NF handling of multi-valued relationships
**Benefit:** Flexible, extensible, no data duplication

### Pattern 3: Master-Detail (Header-Line)
**Where:** `books` → `book_copies`
**Why:** One catalog entry, many physical items
**Benefit:** Inventory tracking, individual item history

### Pattern 4: Status State Machines
**Where:** `transactions.status`, `fines.status`, `book_requests.status`
**Why:** Track lifecycle of business objects
**Benefit:** Clear process flow, filterable queries

---

## ✅ 3NF Compliance Checklist

| Table | 1NF | 2NF | 3NF | Notes |
|-------|-----|-----|-----|-------|
| users | ✅ | ✅ | ✅ | All attributes depend on user_id |
| student_profiles | ✅ | ✅ | ✅ | No transitive deps on user |
| staff_profiles | ✅ | ✅ | ✅ | Removed name/email duplication |
| books | ✅ | ✅ | ✅ | Authors normalized out |
| book_copies | ✅ | ✅ | ✅ | Each attribute describes one copy |
| transactions | ✅ | ✅ | ⚠️ | Status derivable but stored for perf |
| fines | ✅ | ✅ | ✅ | student_id needed for manual fines |
| payments | ✅ | ✅ | ✅ | Removed student_id transitive dep |
| categories | ✅ | ✅ | ✅ | Hierarchy via self-reference |

**Overall Grade: 3NF+** (with intentional denormalization for performance)

---

## 🎯 Key Design Decisions

### 1. WHY split users from profiles?
**Answer:** Not all users are students. Staff need different fields than students. Admin needs no extension.

### 2. WHY remove name/email from staff_profiles?
**Answer:** 3NF violation. Name depends on user_id, not staff_id. Duplication risks update anomalies.

### 3. WHY keep student_id in fines but remove from payments?
**Answer:** 
- Fines can exist without transactions (manual fees) → need student_id
- Payments ALWAYS have a fine → derive student through fine

### 4. WHY add authors table?
**Answer:** Original schema couldn't handle co-authors. Junction table enables multiple authors per book.

### 5. WHY derive status instead of storing?
**Answer:** Actually stored for performance. Deriving on every query would be slow. Trade 3NF purity for speed.

### 6. WHY junction tables for favorites/achievements?
**Answer:** Classic many-to-many. No other way to model "students have many books, books have many students."

---

## 📋 Where to Find What

| If you need... | Look in... | Related Table |
|----------------|------------|---------------|
| Login credentials | `users` | — |
| Student's grade | `student_profiles` | Join with `users` for name |
| Staff's department | `staff_profiles` | Join with `users` for name |
| Book title info | `books` | Join with `categories` |
| Which copy is available | `book_copies` | Filter by `status='available'` |
| Who wrote the book | `book_authors` → `authors` | Junction table |
| Current loans | `transactions` | Filter by `status='active'` |
| How much student owes | `fines` | Join with `payments` to see paid amount |
| Payment history | `payments` | Join with `fines` for context |
| Book waitlist | `book_requests` | Order by `request_date` |
| Student's favorites | `favorite_books` | Join with `books` for titles |
| Achievement badges | `achievements` | Join with `student_achievements` for earned |

---

## 🚀 Summary

This ERD achieves **Third Normal Form** with strategic denormalization for performance:

✅ **Eliminated duplication:** name/email in one place (users)
✅ **Handled multi-valued attributes:** authors via junction table
✅ **Proper inheritance:** CTI pattern for user types
✅ **Clean relationships:** All cardinalities explicit
✅ **Flexible design:** Supports manual fines, co-authors, partial payments

**The result:** A clean, presentable, normalized database schema ready for production.
