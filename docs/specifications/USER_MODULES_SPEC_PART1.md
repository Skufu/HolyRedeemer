# User Modules Implementation Specification

**Version**: 1.0  
**Created**: 2026-01-21  
**Status**: Ready for Implementation

---

## Executive Summary

This specification addresses 10 critical issues identified in user modules review.

### Critical Issues
1. **8 Missing Handler Functions** (HIGH RISK)
   - Librarian: Create, Get, Update, Delete
   - Admin: List, Create, Get, Update, Delete

2. **Transaction Gaps** (HIGH RISK)
   - CreateStudent lacks transaction
   - UpdateStudent lacks transaction

3. **Validation Gaps** (MEDIUM RISK)
   - RFID registration has no uniqueness check
   - No password strength requirements

### Effort Estimate
- Critical Tasks: 28-32 hours
- High Priority: 14-18 hours
- Medium Priority: 6-8 hours
- **Total: 48-58 hours**

---

## Part 1: Librarian Module Implementation

### 1.1 CreateLibrarian Handler

**File**: `backend/internal/handlers/librarians.go`

**Transaction Pattern Required**:
```go
func (h *LibrarianHandler) CreateLibrarian(c *gin.Context) {
    // 1. Begin transaction
    tx, err := h.db.Begin(c.Request.Context())
    if err != nil {
        response.InternalError(c, "Failed to begin transaction")
        return
    }
    defer tx.Rollback(c.Request.Context())
    
    queries := h.queries.WithTx(tx)
    
    // 2. Create user
    user, err := queries.CreateUser(ctx, CreateUserParams{
        Username:     req.Username,
        PasswordHash: passwordHash,
        Role:         UserRoleLibrarian,
        Name:         req.Name,
        Email:        toPgText(req.Email),
        Status:       NullUserStatus{UserStatus: UserStatusActive, Valid: true},
    })
    
    // 3. Create librarian profile
    librarian, err := queries.CreateLibrarian(ctx, CreateLibrarianParams{
        UserID:     toPgUUID(user.ID),
        EmployeeID: req.EmployeeID,
        Name:       req.Name,
        Email:      toPgText(req.Email),
        Phone:       toPgText(req.Phone),
        Department:  toPgText(req.Department),
    })
    
    // 4. Commit
    tx.Commit(ctx)
    
    response.Created(c, librarian, "Librarian created")
}
```

**Acceptance Criteria**:
- [ ] Uses transaction for atomic operation
- [ ] Creates user with role='librarian'
- [ ] Creates librarian profile linked to user
- [ ] Rolls back on any failure
- [ ] Returns 201 on success
- [ ] Returns 409 if username exists

---

### 1.2 Other Librarian Handlers

**Required Functions**:
- GetLibrarian(ctx, id) - Returns single librarian
- UpdateLibrarian(ctx, id, data) - Updates both user and librarian
- DeleteLibrarian(ctx, id) - Deletes (hard or soft)

**Routes to Add**:
```go
librarians.POST("", librarianHandler.CreateLibrarian)
librarians.GET("/:id", librarianHandler.GetLibrarian)
librarians.PUT("/:id", librarianHandler.UpdateLibrarian)
librarians.DELETE("/:id", librarianHandler.DeleteLibrarian)
```

---

## Part 2: Admin Module Implementation

### 2.1 New Admin Handler File

**File**: `backend/internal/handlers/admins.go` (NEW)

**Required Functions**:
- ListAdmins(ctx, page, perPage, search, status)
- CreateAdmin(ctx, data) - Creates user with admin/super_admin role
- GetAdmin(ctx, id) - Returns single admin
- UpdateAdmin(ctx, id, data) - Updates user
- DeleteAdmin(ctx, id) - Deletes user

**Routes**:
```go
admins := v1.Group("/admins")
admins.Use(RequireRoles("super_admin"))
{
    admins.GET("", adminHandler.ListAdmins)
    admins.POST("", adminHandler.CreateAdmin)
    admins.GET("/:id", adminHandler.GetAdmin)
    admins.PUT("/:id", adminHandler.UpdateAdmin)
    admins.DELETE("/:id", adminHandler.DeleteAdmin)
}
```

---

## Part 3: Student Transaction Fixes

### 3.1 CreateStudent Transaction

**Current Issue**: Lines 238-279 have no transaction

**Fix Required**:
```go
// Add transaction wrapper BEFORE CreateUser
tx, err := h.db.Begin(ctx)
defer tx.Rollback(ctx)
queries := h.queries.WithTx(tx)

// Then use queries.* for all operations
// Finally: tx.Commit(ctx)
```

**Acceptance**:
- [ ] Cannot leave orphaned user records
- [ ] Atomic multi-table insert
- [ ] Auto-rollback on failure

---

### 3.2 UpdateStudent Transaction

**Current Issue**: Lines 317-342 have no transaction

**Fix Required**: Same transaction pattern

---

## Part 4: RFID Validation

### 4.1 Add Validation to RegisterRFID

**Current Issue**: auth.go lines 254-283 have no validation

**Add Before Registration**:
```go
// Check RFID not already assigned
existing, _ := h.queries.GetStudentByRFID(ctx, req.RFIDCode)
if existing.ID != uuid.Nil {
    response.Conflict(c, "RFID already assigned")
    return
}

// Check user doesn't already have RFID
current, _ := h.queries.GetStudentByUserID(ctx, userID)
if current.RfidCode.Valid {
    response.Conflict(c, "User already has RFID")
    return
}
```

---

## Testing Requirements

Each handler requires:
- [ ] Unit test: Success path
- [ ] Unit test: Failure path
- [ ] Unit test: Transaction rollback
- [ ] Integration test: Full flow

---

**End of Part 1**
