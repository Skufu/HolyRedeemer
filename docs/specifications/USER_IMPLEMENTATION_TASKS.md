# User Modules Implementation Tasks

**Created**: 2026-01-21  
**Based on**: USER_MODULES_ANALYSIS.md

## Critical Tasks (Priority 1)

### Task 1: Implement Missing Librarian Handlers
- CreateLibrarian (with transaction)
- GetLibrarian  
- UpdateLibrarian (with transaction)
- DeleteLibrarian
- Add routes to main.go

### Task 2: Implement Missing Admin Handlers
- Create admin handler file
- ListAdmins
- CreateAdmin
- GetAdmin
- UpdateAdmin
- DeleteAdmin
- Add /admins route group to main.go

### Task 3: Fix CreateStudent Transaction
- Add transaction wrapper
- Use queries.WithTx(tx)
- Remove manual cleanup
- Add commit error logging

### Task 4: Add RFID Validation
- Check RFID uniqueness
- Check user doesn't already have RFID
- Make registration idempotent

## High Priority Tasks (Priority 2)

### Task 5: Fix UpdateStudent Transaction
- Add transaction wrapper
- Ensure atomic updates

### Task 6: Implement Soft Delete
- Create migration for deleted_at columns
- Update queries to filter deleted_at IS NULL
- Replace hard deletes with soft deletes

### Task 7: Add Rate Limiting
- Install rate limit library
- Implement rate limit middleware
- Apply to auth endpoints
- 5 attempts per minute per IP

### Task 8: Add Password Validation
- Implement password strength checker
- Require uppercase, lowercase, digit, special char
- Apply to all user creation handlers

## Medium Priority Tasks (Priority 3)

### Task 9: Optimize Student List Query
- Replace subqueries with CTEs
- Improve performance

### Task 10: Add Audit Logging
- Log user management operations
- Track who did what when

## Total Effort Estimate
- Critical Tasks: 28-32 hours
- High Priority: 14-18 hours  
- Medium Priority: 6-8 hours
- **Total: 48-58 hours**

## Next Steps
1. Start with Task 1 (Librarian handlers)
2. Move to Task 2 (Admin handlers)
3. Fix student transactions (Tasks 3, 5)
4. Add validation (Tasks 4, 8)
5. Implement improvements (Tasks 6, 7, 9, 10)
