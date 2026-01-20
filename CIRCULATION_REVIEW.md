# Circulation Handler Security & Integrity Review
**File**: `backend/internal/handlers/circulation.go`
**Date**: 2026-01-20
**Reviewer**: Sisyphus (AI Security Audit)

---

## Executive Summary

**Severity**: CRITICAL
**Total Issues Found**: 8 (2 Critical, 3 High, 2 Medium, 1 Low)

The circulation handler demonstrates good transaction pattern implementation but contains **critical race condition vulnerabilities** and a **severe authorization bug** that could lead to data corruption and security breaches.

### Issues by Severity
- 🔴 **Critical**: 2
- 🟠 **High**: 3
- 🟡 **Medium**: 2
- 🟢 **Low**: 1

---

## 1. Transaction Integrity Analysis

### ✅ PASSED: Checkout Operation (Lines 131-175)

**Transaction Structure**:
```go
// Line 132: Begin transaction
tx, err := h.db.Begin(c.Request.Context())

// Lines 137-139: Defer rollback (BEST PRACTICE)
defer func() {
    _ = tx.Rollback(c.Request.Context())
}()

// Line 142: Use transactional queries
queries := h.queries.WithTx(tx)

// Lines 145-168: Perform operations
queries.CreateTransaction(...)
queries.UpdateCopyStatus(...)

// Line 171: Explicit commit
if err := tx.Commit(c.Request.Context()); err != nil {
    log.Printf("Failed to commit transaction: %v", err)
    response.InternalError(c, "Failed to complete checkout")
    return
}
```

**Findings**:
- ✅ Follows project's "Defer Rollback" pattern correctly
- ✅ All multi-table operations use `queries.WithTx(tx)`
- ✅ Error handling triggers rollback via early returns
- ✅ Commit failures are logged before responding
- ✅ Transaction scope covers all writes (transaction + copy status)

---

### ✅ PASSED: Return Operation (Lines 245-336)

**Transaction Structure**:
```go
// Line 246: Begin transaction
tx, err := h.db.Begin(c.Request.Context())

// Lines 251-253: Defer rollback
defer func() {
    _ = tx.Rollback(c.Request.Context())
}()

// Line 256: Use transactional queries
queries := h.queries.WithTx(tx)

// Lines 260-284: Perform operations
queries.UpdateTransactionReturn(...)
queries.UpdateCopyStatus(...)
queries.CreateFine(...) // Conditional fine creation

// Line 332: Explicit commit
if err := tx.Commit(c.Request.Context()); err != nil {
    log.Printf("Failed to commit transaction: %v", err)
    response.InternalError(c, "Failed to complete return")
    return
}
```

**Findings**:
- ✅ Correct transaction wrapping for return + fine creation
- ✅ Copy status and transaction status updated atomically
- ✅ Fine creation within transaction (lines 307-328)
- ✅ Conditional fine creation with proper error handling (line 326: logs but doesn't fail)
- ⚠️ **Note**: Fine creation failure only logs, doesn't fail transaction (line 326)

**Recommendation**:
Consider whether fine creation should fail the entire return operation. Current behavior allows return to succeed even if fine creation fails. This is likely intentional but worth documenting.

---

### ✅ PASSED: Renew Operation (Lines 392-432)

**Transaction Structure**:
```go
// Line 393: Begin transaction
tx, err := h.db.Begin(c.Request.Context())

// Lines 398-400: Defer rollback
defer func() {
    _ = tx.Rollback(c.Request.Context())
}()

// Line 403: Use transactional queries
queries := h.queries.WithTx(tx)

// Lines 405-424: Perform operations
queries.RenewTransaction(...)
queries.UpdateTransactionStatus(...) // Conditional status update

// Line 428: Explicit commit
if err := tx.Commit(c.Request.Context()); err != nil {
    log.Printf("Failed to commit transaction: %v", err)
    response.InternalError(c, "Failed to complete renewal")
    return
}
```

**Findings**:
- ✅ Transaction covers due date update and status changes
- ✅ Conditional status update (overdue → borrowed) is atomic
- ✅ Proper error handling for both operations

---

## 2. Race Condition Vulnerabilities

### 🔴 CRITICAL: Checkout Race Condition (TOCTOU Vulnerability)

**Location**: Lines 86-132 in `Checkout()` method

**Issue Description**:
The checkout operation performs validation **outside** the transaction, creating a Time-of-Check to Time-of-Use (TOCTOU) vulnerability. Between validation and transaction start, another request can change the state.

**Vulnerable Code Flow**:
```go
// Lines 86-95: Student validation (OUTSIDE transaction)
student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
if !isStudentStatusActive(student.Status) {
    response.BadRequest(c, "Student account is not active")
    return
}

// Lines 97-102: Loan count check (OUTSIDE transaction)
currentLoans, _ := h.queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(studentID))
if currentLoans >= int64(h.config.DefaultMaxBooks) {
    response.BadRequest(c, "Student has reached maximum allowed loans")
    return
}

// Lines 104-109: Fine check (OUTSIDE transaction)
totalFines, _ := h.queries.GetStudentTotalFines(c.Request.Context(), toPgUUID(studentID))
if totalFines >= h.config.DefaultBlockThreshold {
    response.BadRequest(c, "Student is blocked due to unpaid fines")
    return
}

// Lines 112-120: Copy availability check (OUTSIDE transaction)
copy, err := h.queries.GetCopyByID(c.Request.Context(), copyID)
if !copy.Status.Valid || copy.Status.CopyStatus != sqlcdb.CopyStatusAvailable {
    response.BadRequest(c, "Book copy is not available")
    return
}

// RACE WINDOW STARTS HERE

// Line 132: Transaction starts (TOO LATE!)
tx, err := h.db.Begin(c.Request.Context())
```

**Attack Scenario**:
Two concurrent checkout requests for the same copy:

| Time | Request A | Request B |
|------|-----------|-----------|
| T1 | Checks copy status: **available** | - |
| T2 | - | Checks copy status: **available** |
| T3 | Begins transaction | - |
| T4 | Creates transaction, sets copy to **borrowed** | Begins transaction |
| T5 | Commits | Creates transaction, sets copy to **borrowed** |
| T6 | - | Commits |

**Result**: Both requests succeed! Same copy assigned to two different students.

**Impact**:
- ❌ Same book copy checked out to multiple students simultaneously
- ❌ Student can exceed max books limit by racing requests
- ❌ Blocked students can borrow books via race condition
- ❌ Data corruption: One student's return updates copy to available, making it unavailable for the other

**Root Cause**:
- **No row-level locking** before validation
- Validation reads are non-transactional
- No `SELECT FOR UPDATE` or advisory locks used

---

### 🟠 HIGH: Return Race Condition (Multiple Returns for Same Copy)

**Location**: Lines 232-254 in `Return()` method

**Issue Description**:
Similar TOCTOU vulnerability in return operation. The active loan query happens outside the transaction.

**Vulnerable Code**:
```go
// Lines 233-236: Find active loan (OUTSIDE transaction)
loan, err := h.queries.GetActiveLoanByCopy(c.Request.Context(), toPgUUID(copyID))
if err != nil {
    response.NotFound(c, "No active loan found for this copy")
    return
}

// RACE WINDOW

// Line 246: Transaction starts
tx, err := h.db.Begin(c.Request.Context())
```

**Attack Scenario**:
Two librarians simultaneously return the same book:

| Time | Librarian A | Librarian B |
|------|-------------|-------------|
| T1 | Queries active loan: finds **loan #1** | - |
| T2 | - | Queries active loan: finds **loan #1** |
| T3 | Updates loan #1 with return date | Updates loan #1 with return date |
| T4 | Sets copy status to **available** | Sets copy status to **available** |
| T5 | Both commits succeed | Both commits succeed |

**Impact**:
- ❌ Same transaction can be returned multiple times
- ❌ Overdue fines potentially created twice
- ❌ Transaction history corrupted

**SQL Query Reference** (`transactions.sql` line 99-101):
```sql
-- name: GetActiveLoanByCopy :one
SELECT t.* FROM transactions t
WHERE t.copy_id = $1 AND t.status IN ('borrowed', 'overdue');
```

This query has no `FOR UPDATE` clause, so it doesn't lock the row.

---

### 🟠 HIGH: Renewal Race Condition (Bypassing Limits)

**Location**: Lines 361-392 in `Renew()` method

**Issue Description**:
Renewal count check happens outside transaction. Concurrent renewals could exceed the 2-renewal limit.

**Vulnerable Code**:
```go
// Lines 361-365: Get transaction (OUTSIDE transaction)
txn, err := h.queries.GetTransactionByID(c.Request.Context(), txnID)
if err != nil {
    response.NotFound(c, "Transaction not found")
    return
}

// Lines 383-387: Check renewal limit (OUTSIDE transaction)
if fromPgInt4(txn.RenewalCount) >= 2 { // Max 2 renewals
    response.BadRequest(c, "Maximum renewal limit reached")
    return
}

// RACE WINDOW

// Line 393: Transaction starts
tx, err := h.db.Begin(c.Request.Context())
```

**Attack Scenario**:
Two concurrent renewal requests for a book at renewal count = 1:

| Time | Request A | Request B |
|------|-----------|-----------|
| T1 | Reads renewal_count: **1** | - |
| T2 | - | Reads renewal_count: **1** |
| T3 | Begins transaction | Begins transaction |
| T4 | Updates renewal_count to **2** | Updates renewal_count to **2** |
| T5 | Commits | Commits |

**Result**: Book renewed 3 times total (initial + 2 concurrent renewals)!

**Impact**:
- ❌ Renewal limit (2) can be bypassed
- ❌ Students can keep books indefinitely by racing renewals

**SQL Query Reference** (`transactions.sql` lines 32-37):
```sql
-- name: RenewTransaction :one
UPDATE transactions
SET due_date = $2,
    renewal_count = renewal_count + 1
WHERE id = $1
RETURNING *;
```

The `renewal_count = renewal_count + 1` is non-atomic with the check.

---

### ✅ Good Practice: Student Loan Count Query

**Location**: Line 98 in `Checkout()`

**SQL Query** (`students.sql` lines 68-70):
```sql
-- name: GetStudentCurrentLoans :one
SELECT COUNT(*) FROM transactions
WHERE student_id = $1 AND status IN ('borrowed', 'overdue');
```

This query correctly counts only active loans (borrowed + overdue), excluding returned loans.

---

## 3. Fine Calculation Correctness

### ✅ CORRECT: Overdue Days Calculation

**Location**: Lines 293-298 in `Return()` method

**Code**:
```go
loanDueDate := fromPgDate(loan.DueDate)
if loanDueDate.Before(now.Truncate(24 * time.Hour)) {
    daysOverdue := int(now.Truncate(24*time.Hour).Sub(loanDueDate).Hours() / 24)
    if daysOverdue > h.config.DefaultGracePeriod {
        daysOverdue -= h.config.DefaultGracePeriod
    }
```

**Findings**:
- ✅ Uses `now.Truncate(24 * time.Hour)` to compare dates (not times)
- ✅ Grace period is correctly subtracted if days overdue > grace period
- ✅ Integer division ensures whole days

**Example**:
- Due date: 2026-01-15
- Return date: 2026-01-18 (3 days late)
- Grace period: 1 day
- Days overdue: 3 - 1 = **2 days fine** ✅

---

### ✅ CORRECT: Fine Amount Calculation

**Location**: Lines 300-305 in `Return()` method

**Code**:
```go
if daysOverdue > 0 {
    resp.DaysOverdue = daysOverdue
    fineAmount := float64(daysOverdue) * h.config.DefaultFinePerDay
    if fineAmount > h.config.DefaultMaxFineCap {
        fineAmount = h.config.DefaultMaxFineCap
    }
```

**Findings**:
- ✅ Fine = days_overdue × daily_rate
- ✅ Cap is applied AFTER calculation
- ✅ Uses config values (no hard-coded magic numbers)

**Config Defaults** (`config.go` lines 56-61):
```go
DefaultLoanDays:       getIntEnv("DEFAULT_LOAN_DAYS", 7),
DefaultFinePerDay:     getFloatEnv("DEFAULT_FINE_PER_DAY", 5.0),
DefaultGracePeriod:    getIntEnv("DEFAULT_GRACE_PERIOD", 1),
DefaultMaxFineCap:     getFloatEnv("DEFAULT_MAX_FINE_CAP", 200.0),
```

**Example Calculations**:
| Days Overdue | Daily Rate | Subtotal | Cap | Final Fine |
|--------------|------------|----------|-----|------------|
| 2 days | ₱5.00 | ₱10.00 | ₱200.00 | ₱10.00 ✅ |
| 30 days | ₱5.00 | ₱150.00 | ₱200.00 | ₱150.00 ✅ |
| 50 days | ₱5.00 | ₱250.00 | ₱200.00 | ₱200.00 ✅ |

---

### ✅ CORRECT: Fine Creation

**Location**: Lines 307-328 in `Return()` method

**Code**:
```go
fine, err := queries.CreateFine(c.Request.Context(), sqlcdb.CreateFineParams{
    TransactionID: toPgUUID(loan.ID),
    StudentID:     loan.StudentID,
    Amount:        toPgNumeric(fineAmount),
    FineType:      sqlcdb.FineTypeOverdue,
    Description:   toPgText(""),
    Status:        sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatusPending, Valid: true},
})
```

**SQL Query** (`fines.sql` lines 15-18):
```sql
-- name: CreateFine :one
INSERT INTO fines (transaction_id, student_id, amount, fine_type, description, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
```

**Findings**:
- ✅ Fine type is correctly set to `overdue`
- ✅ Status set to `pending` (unpaid)
- ✅ Transaction ID recorded for audit trail
- ✅ Amount stored as `NUMERIC` (PostgreSQL's precise decimal type)

---

### ⚠️ MEDIUM: Fine Description is Empty

**Location**: Line 312 in `Return()` method

**Code**:
```go
Description:   toPgText(""),  // Empty string!
```

**Finding**:
- Fine descriptions are always empty strings
- No context about why the fine was created
- Makes debugging harder

**Recommendation**:
```go
Description: toPgText(fmt.Sprintf("Overdue fine: %d days late", daysOverdue)),
```

---

### ✅ CORRECT: Overdue List Fine Calculation

**Location**: Lines 523-528 in `ListOverdue()` method

**Code**:
```go
daysOverdue := int(l.DaysOverdue)
fineAmount := float64(daysOverdue) * h.config.DefaultFinePerDay
if fineAmount > h.config.DefaultMaxFineCap {
    fineAmount = h.config.DefaultMaxFineCap
}
```

**SQL Query** (`transactions.sql` lines 55-69):
```sql
-- name: ListOverdueTransactions :many
SELECT t.*,
       -- ... other fields ...
       CURRENT_DATE - t.due_date as days_overdue
FROM transactions t
-- ... joins ...
WHERE t.status IN ('borrowed', 'overdue') AND t.due_date < CURRENT_DATE
```

**Findings**:
- ✅ SQL calculates `days_overdue` using `CURRENT_DATE - due_date`
- ✅ Go code applies fine calculation logic identically to `Return()` method
- ⚠️ **Note**: Grace period NOT applied in `ListOverdue()` - displays full days overdue, not billable days

**Recommendation**:
Either:
1. Apply grace period in `ListOverdue()` for consistency, OR
2. Add a field `billable_days_overdue` to the SQL query that accounts for grace period

---

### ✅ CORRECT: NotifyOverdue Fine Calculation

**Location**: Lines 591-602 in `NotifyOverdue()` method

**Code**:
```go
daysOverdue := int(now.Truncate(24*time.Hour).Sub(dueDate).Hours() / 24)
if daysOverdue > h.config.DefaultGracePeriod {
    daysOverdue -= h.config.DefaultGracePeriod
}

fineAmount := 0.0
if daysOverdue > 0 {
    fineAmount = float64(daysOverdue) * h.config.DefaultFinePerDay
    if fineAmount > h.config.DefaultMaxFineCap {
        fineAmount = h.config.DefaultMaxFineCap
    }
}
```

**Findings**:
- ✅ Identical calculation to `Return()` method
- ✅ Grace period correctly applied
- ✅ Cap correctly applied

---

## 4. Data Consistency Analysis

### ✅ GOOD: Copy Status Synced with Transaction Status

**Checkout Flow** (Lines 145-168):
```go
// Step 1: Create transaction with status 'borrowed'
queries.CreateTransaction(c.Request.Context(), sqlcdb.CreateTransactionParams{
    Status: sqlcdb.NullTransactionStatus{TransactionStatus: sqlcdb.TransactionStatusBorrowed, Valid: true},
    // ...
})

// Step 2: Update copy status to 'borrowed'
queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
    Status: sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusBorrowed, Valid: true},
})
```

**Return Flow** (Lines 260-284):
```go
// Step 1: Update transaction with return date and status 'returned'
queries.UpdateTransactionReturn(c.Request.Context(), sqlcdb.UpdateTransactionReturnParams{
    ReturnDate:      toPgTimestampNullable(now, true),
    ReturnedBy:      librarianID,
    ReturnCondition: returnCondition,
    Notes:           toPgText(req.Notes),
})

// Step 2: Update copy status based on return condition
newStatus := sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusAvailable, Valid: true}
if returnCondition.Valid && returnCondition.CopyCondition == sqlcdb.CopyConditionPoor {
    newStatus = sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusDamaged, Valid: true}
}
queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
    Status: newStatus,
})
```

**Status Mapping**:
| Transaction Status | Copy Status | Scenario |
|--------------------|-------------|----------|
| `borrowed` | `borrowed` | Book checked out ✅ |
| `returned` (good condition) | `available` | Book returned ✅ |
| `returned` (poor condition) | `damaged` | Book returned damaged ✅ |

**Findings**:
- ✅ Transaction and copy status changes are atomic (within same transaction)
- ✅ All multi-step operations use transactions
- ✅ Copy status correctly reflects physical state

---

### 🟢 LOW: No 'overdue' Status Update on Checkout

**Location**: Lines 145-154 in `Checkout()` method

**Code**:
```go
queries.CreateTransaction(c.Request.Context(), sqlcdb.CreateTransactionParams{
    StudentID:      toPgUUID(studentID),
    CopyID:         toPgUUID(copyID),
    LibrarianID:    librarianID,
    CheckoutDate:   toPgTimestamp(time.Now()),
    DueDate:        toPgDate(dueDate),
    Status:         sqlcdb.NullTransactionStatus{TransactionStatus: sqlcdb.TransactionStatusBorrowed, Valid: true},
    // ...
})
```

**Finding**:
- New transactions always start with status `borrowed`
- `overdue` status is set by a separate scheduled job (`MarkOverdueTransactions`)
- This is correct design, but worth noting

**SQL Query** (`transactions.sql` lines 131-134):
```sql
-- name: MarkOverdueTransactions :exec
UPDATE transactions
SET status = 'overdue'
WHERE status = 'borrowed' AND due_date < CURRENT_DATE;
```

**Recommendation**:
Ensure `MarkOverdueTransactions` is run periodically (e.g., daily cron job). Consider adding a comment:
```go
// Note: Transaction status transitions from 'borrowed' to 'overdue'
// are handled by the MarkOverdueTransactions scheduled job
```

---

### ✅ GOOD: Condition-Based Copy Status

**Location**: Lines 273-276 in `Return()` method

**Code**:
```go
newStatus := sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusAvailable, Valid: true}
if returnCondition.Valid && returnCondition.CopyCondition == sqlcdb.CopyConditionPoor {
    newStatus = sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusDamaged, Valid: true}
}
```

**Findings**:
- ✅ Poor condition books are marked as `damaged`
- ✅ Good/excellent/fair condition books are marked as `available`
- ✅ Prevents re-circulation of damaged books

**Enum Values** (from schema):
```sql
CREATE TYPE copy_condition AS ENUM ('excellent', 'good', 'fair', 'poor');
CREATE TYPE copy_status AS ENUM ('available', 'borrowed', 'reserved', 'lost', 'damaged', 'retired');
```

---

## 5. Edge Case Handling

### ✅ CORRECT: Student Max Loans Enforcement

**Location**: Lines 97-102 in `Checkout()` method

**Code**:
```go
currentLoans, _ := h.queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(studentID))
if currentLoans >= int64(h.config.DefaultMaxBooks) {
    response.BadRequest(c, "Student has reached maximum allowed loans")
    return
}
```

**SQL Query** (`students.sql` lines 68-70):
```sql
-- name: GetStudentCurrentLoans :one
SELECT COUNT(*) FROM transactions
WHERE student_id = $1 AND status IN ('borrowed', 'overdue');
```

**Findings**:
- ✅ Counts only active loans (excludes returned books)
- ✅ Uses config value (default: 3 books)
- ✅ Uses `>=` comparison (can't exceed max)

**Config** (`config.go` line 57):
```go
DefaultMaxBooks: getIntEnv("DEFAULT_MAX_BOOKS", 3),
```

**Note**: ⚠️ Race condition vulnerability exists (see Section 2)

---

### ✅ CORRECT: Fine Blocking Threshold

**Location**: Lines 104-109 in `Checkout()` method

**Code**:
```go
totalFines, _ := h.queries.GetStudentTotalFines(c.Request.Context(), toPgUUID(studentID))
if totalFines >= h.config.DefaultBlockThreshold {
    response.BadRequest(c, "Student is blocked due to unpaid fines")
    return
}
```

**SQL Query** (`students.sql` lines 72-74):
```sql
-- name: GetStudentTotalFines :one
SELECT COALESCE(SUM(amount), 0)::float8 FROM fines
WHERE student_id = $1 AND status = 'pending';
```

**Findings**:
- ✅ Sums only `pending` fines (excludes paid/waived)
- ✅ Uses `COALESCE(SUM(amount), 0)` to handle student with no fines
- ✅ Uses config value (default: ₱100.00)

**Config** (`config.go` line 61):
```go
DefaultBlockThreshold: getFloatEnv("DEFAULT_BLOCK_THRESHOLD", 100.0),
```

**Note**: ⚠️ Race condition vulnerability exists (see Section 2)

---

### ✅ CORRECT: Copy Availability Check

**Location**: Lines 112-121 in `Checkout()` method

**Code**:
```go
copy, err := h.queries.GetCopyByID(c.Request.Context(), copyID)
if err != nil {
    response.NotFound(c, "Book copy not found")
    return
}

if !copy.Status.Valid || copy.Status.CopyStatus != sqlcdb.CopyStatusAvailable {
    response.BadRequest(c, "Book copy is not available")
    return
}
```

**SQL Query** (`copies.sql` lines 1-5):
```sql
-- name: GetCopyByID :one
SELECT bc.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn
FROM book_copies bc
JOIN books b ON bc.book_id = b.id
WHERE bc.id = $1;
```

**Findings**:
- ✅ Validates copy exists
- ✅ Validates copy status is `available`
- ✅ Handles nullable status field correctly (`!copy.Status.Valid`)

**Copy Status Values** (from schema):
```sql
CREATE TYPE copy_status AS ENUM ('available', 'borrowed', 'reserved', 'lost', 'damaged', 'retired');
```

Allowed checkout statuses:
- ✅ `available` - Ready for checkout
- ❌ `borrowed` - Already checked out
- ❌ `reserved` - Reserved for another student
- ❌ `lost` - Marked as lost
- ❌ `damaged` - Needs repair
- ❌ `retired` - Out of circulation

**Note**: ⚠️ Race condition vulnerability exists (see Section 2)

---

### ✅ CORRECT: Renewal Limit Enforcement

**Location**: Lines 383-387 in `Renew()` method

**Code**:
```go
if fromPgInt4(txn.RenewalCount) >= 2 { // Max 2 renewals
    response.BadRequest(c, "Maximum renewal limit reached")
    return
}
```

**Findings**:
- ✅ Hardcoded limit of 2 renewals
- ✅ Uses `>=` comparison (cannot renew at 2)

**Recommendation**:
Consider making this configurable:
```go
if fromPgInt4(txn.RenewalCount) >= h.config.DefaultMaxRenewals {
    response.BadRequest(c, "Maximum renewal limit reached")
    return
}
```

Add to config:
```go
DefaultMaxRenewals: getIntEnv("DEFAULT_MAX_RENEWALS", 2),
```

**Note**: ⚠️ Race condition vulnerability exists (see Section 2)

---

### ✅ CORRECT: Returned Book Cannot Be Renewed

**Location**: Lines 377-381 in `Renew()` method

**Code**:
```go
if txn.Status.Valid && txn.Status.TransactionStatus == sqlcdb.TransactionStatusReturned {
    response.BadRequest(c, "Cannot renew a returned book")
    return
}
```

**Findings**:
- ✅ Explicitly checks for `returned` status
- ✅ Prevents renewal of completed transactions
- ✅ Handles nullable status field correctly

---

### ✅ CORRECT: Overdue Book Can Be Renewed

**Location**: Lines 414-425 in `Renew()` method

**Code**:
```go
// Update overdue status if was overdue
if txn.Status.Valid && txn.Status.TransactionStatus == sqlcdb.TransactionStatusOverdue {
    err = queries.UpdateTransactionStatus(c.Request.Context(), sqlcdb.UpdateTransactionStatusParams{
        ID:     txnID,
        Status: sqlcdb.NullTransactionStatus{TransactionStatus: sqlcdb.TransactionStatusBorrowed, Valid: true},
    })
    if err != nil {
        log.Printf("Failed to update transaction status: %v", err)
        response.InternalError(c, "Failed to update transaction status")
        return
    }
}
```

**Findings**:
- ✅ Overdue books can be renewed (status changes from `overdue` to `borrowed`)
- ✅ Transaction status update is atomic with due date update
- ✅ Status change resets the "overdue" clock for the new due date

---

### ⚠️ MEDIUM: Due Date Validation Not Explicitly Checked

**Location**: Lines 389-390 in `Renew()` method

**Code**:
```go
// Calculate new due date
newDueDate := time.Now().AddDate(0, 0, h.config.DefaultLoanDays)
```

**Finding**:
- No explicit check if `newDueDate` is in the future
- No check if due date extension is reasonable

**Edge Case**:
If `time.Now()` is corrupted or system clock is wrong, due date could be invalid.

**Recommendation**:
```go
newDueDate := time.Now().AddDate(0, 0, h.config.DefaultLoanDays)
if newDueDate.Before(time.Now()) {
    response.BadRequest(c, "Invalid due date calculation")
    return
}
```

---

## 6. Authorization & Security

### 🔴 CRITICAL: Student Can Renew Others' Books (Authorization Bypass)

**Location**: Line 371 in `Renew()` method

**Vulnerable Code**:
```go
authUser := middleware.GetAuthUser(c)
if authUser.Role == "student" {
    student, _ := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(uuid.MustParse(authUser.ID)))
    if student.ID != txn.ID {  // ❌ BUG: Comparing wrong IDs!
        response.Forbidden(c, "Cannot renew other student's loans")
        return
    }
}
```

**The Bug**:
- `student.ID` is a `UUID` (student's database ID)
- `txn.ID` is a `UUID` (transaction's database ID)
- **These are comparing DIFFERENT entities!**

**Variable Types** (from schema):
```sql
-- students table
CREATE TABLE students (
    id UUID PRIMARY KEY,           -- student.ID
    user_id UUID REFERENCES users(id),
    -- ...
);

-- transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY,           -- txn.ID
    student_id UUID REFERENCES students(id),  -- txn.StudentID
    -- ...
);
```

**Attack Scenario**:
1. Student A (user_id: `user-a`) borrows a book → transaction #1 (id: `txn-1`)
2. Student B (user_id: `user-b`) knows transaction #1's ID
3. Student B sends renewal request for transaction #1

**Code Execution**:
```go
// Student B's auth context
authUser.ID = "user-b"

// Get student record for user-b
student.ID = "student-b-id"

// Get transaction #1
txn.ID = "txn-1"

// Comparison: "student-b-id" != "txn-1"
// Result: FALSE (different UUIDs will never match)
// Access: ALLOWED! ❌
```

**Why It Works**:
- The comparison always fails (student ID != transaction ID)
- Students can renew ANY transaction they know the ID of
- They can find transaction IDs from API responses or the UI

**Impact**:
- ❌ Students can renew other students' books
- ❌ Students can abuse this to reduce others' overdue fines
- ❌ Complete authorization bypass for renewals

**Correct Code**:
```go
if authUser.Role == "student" {
    student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(uuid.MustParse(authUser.ID)))
    if err != nil {
        response.Forbidden(c, "Unauthorized")
        return
    }
    // ✅ CORRECT: Compare student IDs, not student ID vs transaction ID
    if student.ID != fromPgUUID(txn.StudentID) {
        response.Forbidden(c, "Cannot renew other student's loans")
        return
    }
}
```

---

### ✅ CORRECT: Librarian Tracking in Checkout

**Location**: Lines 76-83 in `Checkout()` method

**Code**:
```go
authUser := middleware.GetAuthUser(c)
librarianUserID, _ := uuid.Parse(authUser.ID)
librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
librarianID := pgtype.UUID{Valid: false}
if err == nil {
    librarianID = toPgUUID(librarian.ID)
}
```

**Finding**:
- ✅ Gets librarian record from user_id
- ✅ Sets librarian_id to NULL if user is not a librarian
- ✅ Librarian ID is recorded in transaction for audit trail

**Transaction Creation** (Lines 145-154):
```go
queries.CreateTransaction(c.Request.Context(), sqlcdb.CreateTransactionParams{
    LibrarianID: librarianID,  // Can be NULL for self-service
    // ...
})
```

---

### ✅ CORRECT: Librarian Tracking in Return

**Location**: Lines 223-230 in `Return()` method

**Code**:
```go
authUser := middleware.GetAuthUser(c)
librarianUserID, _ := uuid.Parse(authUser.ID)
librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
librarianID := pgtype.UUID{Valid: false}
if err == nil {
    librarianID = toPgUUID(librarian.ID)
}
```

**Finding**:
- ✅ Same pattern as checkout
- ✅ Librarian ID stored in transaction's `returned_by` field

**Transaction Update** (Lines 260-266):
```go
queries.UpdateTransactionReturn(c.Request.Context(), sqlcdb.UpdateTransactionReturnParams{
    ReturnDate:      toPgTimestampNullable(now, true),
    ReturnedBy:      librarianID,  // NULL for self-service
    // ...
})
```

---

### ⚠️ MEDIUM: Missing Role Check for Checkout/Return

**Location**: Lines 56-239 in `Checkout()` and `Return()` methods

**Finding**:
- No explicit role check before allowing checkout/return
- Relies on middleware to protect routes
- If middleware is bypassed, any authenticated user can perform these operations

**Current Design**:
Checkout/return likely require `librarian` role, but this is enforced at the route level, not handler level.

**Recommendation**:
Add explicit role checks in handlers for defense-in-depth:
```go
func (h *CirculationHandler) Checkout(c *gin.Context) {
    authUser := middleware.GetAuthUser(c)
    if authUser.Role != "librarian" && authUser.Role != "admin" && authUser.Role != "super_admin" {
        response.Forbidden(c, "Insufficient permissions")
        return
    }
    // ... rest of checkout logic
}
```

---

### ✅ CORRECT: Student Account Status Check

**Location**: Lines 86-95 in `Checkout()` method

**Code**:
```go
student, err := h.queries.GetStudentByID(c.Request.Context(), studentID)
if err != nil {
    response.NotFound(c, "Student not found")
    return
}

if !isStudentStatusActive(student.Status) {
    response.BadRequest(c, "Student account is not active")
    return
}
```

**Helper Function** (`helpers.go` lines 131-133):
```go
func isStudentStatusActive(status sqlcdb.NullStudentStatus) bool {
    return status.Valid && status.StudentStatus == sqlcdb.StudentStatusActive
}
```

**Student Status Values** (from schema):
```sql
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'transferred');
```

**Findings**:
- ✅ Inactive students cannot check out books
- ✅ Graduated/transferred students are blocked
- ✅ Handles nullable status field correctly

---

## Summary of Findings

### Critical Issues (Must Fix)

1. **🔴 Race Condition: Checkout Vulnerability** (Lines 86-132)
   - **Impact**: Same book can be checked out to multiple students simultaneously
   - **Fix**: Move validation into transaction and use `SELECT FOR UPDATE`

2. **🔴 Authorization Bypass: Student Can Renew Others' Books** (Line 371)
   - **Impact**: Students can renew any transaction they know the ID of
   - **Fix**: Compare `student.ID` with `txn.StudentID`, not `txn.ID`

### High Issues (Should Fix)

3. **🟠 Race Condition: Return Vulnerability** (Lines 233-254)
   - **Impact**: Same transaction can be returned multiple times
   - **Fix**: Use `SELECT FOR UPDATE` when querying active loan

4. **🟠 Race Condition: Renewal Limit Bypass** (Lines 361-392)
   - **Impact**: Students can exceed 2-renewal limit
   - **Fix**: Use `SELECT FOR UPDATE` when querying transaction

5. **🟠 Missing Explicit Role Checks** (Lines 56-239)
   - **Impact**: If middleware is bypassed, any user can checkout/return
   - **Fix**: Add role validation in handlers

### Medium Issues (Recommended)

6. **⚠️ Fine Description is Empty** (Line 312)
   - **Impact**: Poor debugging experience
   - **Fix**: Add descriptive message to fine record

7. **⚠️ Due Date Validation Missing** (Lines 389-390)
   - **Impact**: Potential edge case with system clock issues
   - **Fix**: Validate due date is in the future

### Low Issues (Nice to Have)

8. **🟢 No Transaction Status Comment** (Line 152)
   - **Impact**: Code clarity
   - **Fix**: Add comment explaining overdue status is set by scheduled job

---

## Recommended Fixes

### Fix 1: Checkout Race Condition (Critical)

**Create new SQL query** (`transactions.sql`):
```sql
-- name: GetCopyByIDForUpdate :one
SELECT bc.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn
FROM book_copies bc
JOIN books b ON bc.book_id = b.id
WHERE bc.id = $1
FOR UPDATE;
```

**Update `Checkout()` method**:
```go
func (h *CirculationHandler) Checkout(c *gin.Context) {
    var req CheckoutRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.BadRequest(c, "Invalid request body")
        return
    }

    studentID, err := uuid.Parse(req.StudentID)
    if err != nil {
        response.BadRequest(c, "Invalid student ID")
        return
    }

    copyID, err := uuid.Parse(req.CopyID)
    if err != nil {
        response.BadRequest(c, "Invalid copy ID")
        return
    }

    // Get librarian ID from auth
    authUser := middleware.GetAuthUser(c)
    librarianUserID, _ := uuid.Parse(authUser.ID)
    librarian, err := h.queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
    librarianID := pgtype.UUID{Valid: false}
    if err == nil {
        librarianID = toPgUUID(librarian.ID)
    }

    // ✅ Begin transaction BEFORE any validation
    tx, err := h.db.Begin(c.Request.Context())
    if err != nil {
        response.InternalError(c, "Failed to begin transaction")
        return
    }
    defer func() {
        _ = tx.Rollback(c.Request.Context())
    }()

    // ✅ Use transactional queries
    queries := h.queries.WithTx(tx)

    // ✅ Validate student within transaction
    student, err := queries.GetStudentByID(c.Request.Context(), studentID)
    if err != nil {
        response.NotFound(c, "Student not found")
        return
    }

    if !isStudentStatusActive(student.Status) {
        response.BadRequest(c, "Student account is not active")
        return
    }

    // ✅ Check student's current loans within transaction
    currentLoans, err := queries.GetStudentCurrentLoans(c.Request.Context(), toPgUUID(studentID))
    if err != nil {
        response.InternalError(c, "Failed to check current loans")
        return
    }
    if currentLoans >= int64(h.config.DefaultMaxBooks) {
        response.BadRequest(c, "Student has reached maximum allowed loans")
        return
    }

    // ✅ Check student's fines within transaction
    totalFines, err := queries.GetStudentTotalFines(c.Request.Context(), toPgUUID(studentID))
    if err != nil {
        response.InternalError(c, "Failed to check fines")
        return
    }
    if totalFines >= h.config.DefaultBlockThreshold {
        response.BadRequest(c, "Student is blocked due to unpaid fines")
        return
    }

    // ✅ Validate copy with row lock
    copy, err := queries.GetCopyByIDForUpdate(c.Request.Context(), copyID)
    if err != nil {
        response.NotFound(c, "Book copy not found")
        return
    }

    if !copy.Status.Valid || copy.Status.CopyStatus != sqlcdb.CopyStatusAvailable {
        response.BadRequest(c, "Book copy is not available")
        return
    }

    // Calculate due date
    dueDate := time.Now().AddDate(0, 0, h.config.DefaultLoanDays)
    if req.DueDate != "" {
        if parsed, parseErr := time.Parse("2006-01-02", req.DueDate); parseErr == nil {
            dueDate = parsed
        }
    }

    // Create transaction
    txn, err := queries.CreateTransaction(c.Request.Context(), sqlcdb.CreateTransactionParams{
        StudentID:      toPgUUID(studentID),
        CopyID:         toPgUUID(copyID),
        LibrarianID:    librarianID,
        CheckoutDate:   toPgTimestamp(time.Now()),
        DueDate:        toPgDate(dueDate),
        Status:         sqlcdb.NullTransactionStatus{TransactionStatus: sqlcdb.TransactionStatusBorrowed, Valid: true},
        CheckoutMethod:  sqlcdb.NullCheckoutMethod{CheckoutMethod: sqlcdb.CheckoutMethodCounter, Valid: true},
        Notes:          toPgText(req.Notes),
    })
    if err != nil {
        response.InternalError(c, "Failed to create transaction")
        return
    }

    // Update copy status
    err = queries.UpdateCopyStatus(c.Request.Context(), sqlcdb.UpdateCopyStatusParams{
        ID:     copyID,
        Status: sqlcdb.NullCopyStatus{CopyStatus: sqlcdb.CopyStatusBorrowed, Valid: true},
    })
    if err != nil {
        response.InternalError(c, "Failed to update copy status")
        return
    }

    // Commit transaction
    if err := tx.Commit(c.Request.Context()); err != nil {
        log.Printf("Failed to commit transaction: %v", err)
        response.InternalError(c, "Failed to complete checkout")
        return
    }

    resp := CheckoutResponse{
        TransactionID: txn.ID.String(),
        CheckoutDate:  formatPgTimestamp(txn.CheckoutDate, time.RFC3339),
        DueDate:       formatPgDate(txn.DueDate, "2006-01-02"),
    }
    resp.Student.Name = student.UserName
    resp.Student.StudentID = student.StudentID
    resp.Book.Title = copy.BookTitle
    resp.Book.CopyNumber = copy.CopyNumber

    response.Success(c, resp, "Book checked out successfully")
}
```

---

### Fix 2: Authorization Bypass in Renew (Critical)

**Update `Renew()` method** (Line 371):
```go
// Check authorization
authUser := middleware.GetAuthUser(c)
if authUser.Role == "student" {
    student, err := h.queries.GetStudentByUserID(c.Request.Context(), toPgUUID(uuid.MustParse(authUser.ID)))
    if err != nil {
        response.Forbidden(c, "Unauthorized")
        return
    }
    // ✅ CORRECT: Compare student IDs, not student ID vs transaction ID
    if student.ID != fromPgUUID(txn.StudentID) {
        response.Forbidden(c, "Cannot renew other student's loans")
        return
    }
}
```

---

### Fix 3: Return Race Condition (High)

**Create new SQL query** (`transactions.sql`):
```sql
-- name: GetActiveLoanByCopyForUpdate :one
SELECT t.* FROM transactions t
WHERE t.copy_id = $1 AND t.status IN ('borrowed', 'overdue')
FOR UPDATE;
```

**Update `Return()` method** (Lines 232-254):
```go
// ✅ Begin transaction BEFORE validation
tx, err := h.db.Begin(c.Request.Context())
if err != nil {
    response.InternalError(c, "Failed to begin transaction")
    return
}
defer func() {
    _ = tx.Rollback(c.Request.Context())
}()

// ✅ Use transactional queries
queries := h.queries.WithTx(tx)

// Get librarian ID from auth
authUser := middleware.GetAuthUser(c)
librarianUserID, _ := uuid.Parse(authUser.ID)
librarian, err := queries.GetLibrarianByUserID(c.Request.Context(), toPgUUID(librarianUserID))
librarianID := pgtype.UUID{Valid: false}
if err == nil {
    librarianID = toPgUUID(librarian.ID)
}

// ✅ Find active loan within transaction with row lock
loan, err := queries.GetActiveLoanByCopyForUpdate(c.Request.Context(), toPgUUID(copyID))
if err != nil {
    response.NotFound(c, "No active loan found for this copy")
    return
}
```

---

### Fix 4: Renewal Race Condition (High)

**Create new SQL query** (`transactions.sql`):
```sql
-- name: GetTransactionByIDForUpdate :one
SELECT t.*,
       b.title as book_title, b.author as book_author,
       bc.copy_number, bc.qr_code,
       s.student_id as student_number,
       u.name as student_name
FROM transactions t
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
JOIN students s ON t.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE t.id = $1
FOR UPDATE;
```

**Update `Renew()` method** (Lines 361-392):
```go
// ✅ Begin transaction BEFORE validation
tx, err := h.db.Begin(c.Request.Context())
if err != nil {
    response.InternalError(c, "Failed to begin transaction")
    return
}
defer func() {
    _ = tx.Rollback(c.Request.Context())
}()

// ✅ Use transactional queries
queries := h.queries.WithTx(tx)

// ✅ Get transaction with row lock
txn, err := queries.GetTransactionByIDForUpdate(c.Request.Context(), txnID)
if err != nil {
    response.NotFound(c, "Transaction not found")
    return
}
```

---

### Fix 5: Add Role Checks (High)

**Add at the start of `Checkout()` and `Return()`**:
```go
func (h *CirculationHandler) Checkout(c *gin.Context) {
    authUser := middleware.GetAuthUser(c)

    // ✅ Explicit role check for defense-in-depth
    if authUser.Role != "librarian" && authUser.Role != "admin" && authUser.Role != "super_admin" {
        response.Forbidden(c, "Insufficient permissions")
        return
    }

    // ... rest of checkout logic
}
```

---

### Fix 6: Add Fine Description (Medium)

**Update `Return()` method** (Line 312):
```go
fine, err := queries.CreateFine(c.Request.Context(), sqlcdb.CreateFineParams{
    TransactionID: toPgUUID(loan.ID),
    StudentID:     loan.StudentID,
    Amount:        toPgNumeric(fineAmount),
    FineType:      sqlcdb.FineTypeOverdue,
    Description:   toPgText(fmt.Sprintf("Overdue fine: %d days late (returned %s)", daysOverdue, now.Format("2006-01-02"))),
    Status:        sqlcdb.NullFineStatus{FineStatus: sqlcdb.FineStatusPending, Valid: true},
})
```

---

### Fix 7: Validate Due Date (Medium)

**Update `Renew()` method** (Lines 389-390):
```go
// Calculate new due date
newDueDate := time.Now().AddDate(0, 0, h.config.DefaultLoanDays)

// ✅ Validate due date is in the future
if newDueDate.Before(time.Now()) || newDueDate.Equal(time.Now()) {
    response.BadRequest(c, "Invalid due date calculation")
    return
}
```

---

### Fix 8: Add Transaction Status Comment (Low)

**Update `Checkout()` method** (around line 152):
```go
Status: sqlcdb.NullTransactionStatus{
    TransactionStatus: sqlcdb.TransactionStatusBorrowed,
    Valid: true,
},
// Note: Transaction status transitions from 'borrowed' to 'overdue'
// are handled by the MarkOverdueTransactions scheduled job
// (backend/internal/database/queries/transactions.sql:131)
```

---

## Testing Recommendations

### Race Condition Testing

1. **Concurrent Checkout Test**:
   ```go
   func TestConcurrentCheckout(t *testing.T) {
       // Spawn 10 goroutines trying to checkout the same copy
       // Only 1 should succeed
   }
   ```

2. **Concurrent Return Test**:
   ```go
   func TestConcurrentReturn(t *testing.T) {
       // Spawn 2 goroutines returning the same copy
       // Only 1 should succeed
   }
   ```

3. **Concurrent Renewal Test**:
   ```go
   func TestConcurrentRenewal(t *testing.T) {
       // Spawn 3 goroutines renewing the same book at count=1
       // Only 1 should succeed (count should end at 2)
   }
   ```

### Authorization Testing

```go
func TestStudentRenewOtherStudentsBook(t *testing.T) {
    // Login as student A
    // Attempt to renew student B's transaction
    // Should return 403 Forbidden
}
```

---

## Conclusion

The circulation handler demonstrates **good transaction management practices** (defer rollback, explicit commit, proper error handling) but contains **critical security vulnerabilities** that must be addressed before production use.

### Priority Order:
1. **IMMEDIATE**: Fix authorization bypass in Renew (Line 371)
2. **IMMEDIATE**: Fix race conditions in Checkout/Return/Renew
3. **SOON**: Add explicit role checks
4. **LATER**: Improve fine descriptions and due date validation

### Code Quality Score
- Transaction Integrity: ✅ 9/10
- Race Condition Safety: ❌ 2/10
- Fine Calculation: ✅ 9/10
- Data Consistency: ✅ 8/10
- Edge Case Handling: ⚠️ 6/10
- Authorization/Security: ❌ 3/10

**Overall Score**: 6.2/10

---

**Review Completed**: 2026-01-20
**Reviewer**: Sisyphus (AI Security Audit)
**Document Version**: 1.0
