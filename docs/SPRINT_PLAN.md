# Next Sprint Plan - Architectural Improvements

**Duration**: 2-3 Weeks  
**Target Date**: February 2026

## Overview

Sprint addressing deferred issues from code review:
1. Rate limiting on authentication
2. Bulk insert optimization  
3. Query optimization (CTE + JOIN)
4. httpOnly cookies for tokens
5. Service layer architecture

---

## Issue 1: Rate Limiting

**Priority**: HIGH  
**Approach**: Token bucket with in-memory limiter

**Implementation**:
- Week 1: In-memory rate limiter (golang.org/x/time/rate)
- Week 2: Redis integration (optional)
- Add to /login, /refresh endpoints
- 5 requests/5 seconds per IP

**Files**:
- `backend/internal/middleware/ratelimit.go` (NEW)
- `backend/internal/middleware/ratelimit_test.go` (NEW)

---

## Issue 2: Bulk Insert Optimization

**Priority**: HIGH  
**Approach**: Bulk INSERT with UPSERT

**Implementation**:
- Add `CreateCopiesBulk` query to `copies.sql`
- Update `CreateBook` handler to use bulk insert
- Performance: 10-100x faster

**SQL Query**:
```sql
INSERT INTO book_copies (book_id, copy_number, qr_code, status, condition)
SELECT unnest($1::uuid[]), generate_series(1, $2), unnest($3::text[]), unnest($4::copy_status[]), unnest($5::copy_condition[])
ON CONFLICT (book_id, copy_number) DO UPDATE SET ...
```

---

## Issue 3: Query Optimization

**Priority**: HIGH  
**Approach**: CTE + LEFT JOIN

**Implementation**:
- Replace correlated subqueries in `ListBooks`
- Single CTE aggregation then JOIN
- Performance: 50-100x faster

**Optimized Query**:
```sql
WITH book_copy_counts AS (
    SELECT book_id, COUNT(*) as total_copies
    FROM book_copies GROUP BY book_id
)
SELECT b.*, c.name as category_name,
       COALESCE(bcc.total_copies, 0) as total_copies
FROM books b
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN book_copy_counts bcc ON bcc.book_id = b.id
```

---

## Issue 4: httpOnly Cookies

**Priority**: LOW  
**Approach**: Secure httpOnly cookies

**Implementation**:
- Set tokens as httpOnly, Secure cookies
- Remove localStorage token storage
- Update CORS for credentials
- Backend sets cookies, frontend sends automatically

**Cookie Configuration**:
- httpOnly: true
- Secure: true (HTTPS only)
- SameSite: Strict
- Path: /

---

## Issue 5: Service Layer

**Priority**: MEDIUM  
**Approach**: Extract business logic

**Implementation**:
- Create `backend/internal/services/` package
- Move circulation logic from handlers
- Move book logic from handlers
- Handlers become thin HTTP layer

**Service Package**:
```
internal/services/
├── circulation_service.go
├── book_service.go
├── student_service.go
└── fine_service.go
```

---

## Timeline

### Week 1
- Rate limiter implementation
- Bulk insert SQL query
- Service layer scaffolding

### Week 2
- Integrate rate limiter
- Update handlers for bulk insert
- Move first service (circulation)

### Week 3
- Complete service layer migration
- Query optimization
- Cookie authentication
- Testing & documentation

---

## Success Criteria

- [ ] Rate limiting prevents 6th login attempt
- [ ] 100 copies created in < 500ms
- [ ] ListBooks (1000 items) in < 200ms
- [ ] Tokens in httpOnly cookies
- [ ] Service layer unit tests (80%+ coverage)
- [ ] Integration tests passing
- [ ] Documentation complete

---

## Notes

- All changes backward compatible
- Feature flags for gradual rollout
- Rollback plans for each feature
- Security review before deployment
