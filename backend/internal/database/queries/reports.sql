-- Dashboard Statistics
-- name: GetDashboardStats :one
WITH book_stats AS (
    SELECT COUNT(*) FILTER (WHERE status = 'active') as total_books
    FROM books
),
copy_stats AS (
    SELECT COUNT(*) FILTER (WHERE status != 'retired') as total_copies
    FROM book_copies
),
student_stats AS (
    SELECT COUNT(*) FILTER (WHERE status = 'active') as active_students
    FROM students
),
transaction_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE status IN ('borrowed', 'overdue')) as current_loans,
        COUNT(*) FILTER (WHERE status IN ('borrowed', 'overdue') AND due_date < CURRENT_DATE) as overdue_books,
        COUNT(*) FILTER (
            WHERE checkout_date >= CURRENT_DATE
              AND checkout_date < CURRENT_DATE + INTERVAL '1 day'
        ) as checkouts_today,
        COUNT(*) FILTER (
            WHERE return_date >= CURRENT_DATE
              AND return_date < CURRENT_DATE + INTERVAL '1 day'
        ) as returns_today,
        COUNT(*) FILTER (
            WHERE due_date = CURRENT_DATE
              AND status IN ('borrowed', 'overdue')
        ) as due_today
    FROM transactions
),
fine_stats AS (
    SELECT COALESCE(SUM(amount), 0)::float8 as total_fines
    FROM fines
    WHERE status = 'pending'
)
SELECT
    bs.total_books,
    cs.total_copies,
    ss.active_students,
    ts.current_loans,
    ts.overdue_books,
    fs.total_fines,
    ts.checkouts_today,
    ts.returns_today,
    ts.due_today
FROM book_stats bs, copy_stats cs, student_stats ss, transaction_stats ts, fine_stats fs;

-- Books by category for chart
-- name: GetBooksByCategory :many
SELECT c.name, COUNT(b.id) as count, c.color_code
FROM categories c
LEFT JOIN books b ON c.id = b.category_id AND b.status = 'active'
GROUP BY c.id, c.name, c.color_code
ORDER BY count DESC;

-- Transaction status distribution
-- name: GetTransactionStatusDistribution :many
SELECT status, COUNT(*) as count
FROM transactions
WHERE checkout_date > CURRENT_DATE - INTERVAL '30 days'
GROUP BY status;

-- Top borrowed books
-- name: GetTopBorrowedBooks :many
SELECT b.title, COUNT(t.id) as borrow_count
FROM books b
JOIN book_copies bc ON b.id = bc.book_id
JOIN transactions t ON bc.id = t.copy_id
WHERE t.checkout_date > CURRENT_DATE - INTERVAL '90 days'
GROUP BY b.id, b.title
ORDER BY borrow_count DESC
LIMIT 5;

-- Monthly trends (last 6 months)
-- name: GetMonthlyTrends :many
SELECT 
    TO_CHAR(DATE_TRUNC('month', checkout_date), 'Mon') as month,
    COUNT(*) FILTER (WHERE checkout_date IS NOT NULL) as checkouts,
    COUNT(*) FILTER (WHERE return_date IS NOT NULL) as returns
FROM transactions
WHERE checkout_date > CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', checkout_date)
ORDER BY DATE_TRUNC('month', checkout_date);

-- Recent activity
-- name: GetRecentActivity :many
SELECT 
    t.id,
    CASE 
        WHEN t.return_date IS NOT NULL THEN 'return'
        WHEN t.status = 'overdue' THEN 'overdue'
        ELSE 'checkout'
    END as activity_type,
    b.title as book_title,
    u.name as student_name,
    COALESCE(t.return_date, t.checkout_date) as activity_time
FROM transactions t
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
JOIN students s ON t.student_id = s.id
JOIN users u ON s.user_id = u.id
ORDER BY COALESCE(t.return_date, t.checkout_date) DESC
LIMIT 10;

-- Librarian queries
-- name: GetLibrarianByUserID :one
SELECT id, user_id, employee_id, name, email, phone, department, created_at, updated_at
FROM librarians WHERE user_id = $1;

-- name: GetLibrarianByID :one
SELECT id, user_id, employee_id, name, email, phone, department, created_at, updated_at
FROM librarians WHERE id = $1;

-- name: CreateLibrarian :one
INSERT INTO librarians (user_id, employee_id, name, email, phone, department)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetStudentsByGradeLevel :many
SELECT grade_level, COUNT(*) as count
FROM students
WHERE status = 'active'
GROUP BY grade_level
ORDER BY grade_level;

-- name: GetLoansByGradeLevel :many
SELECT s.grade_level, COUNT(t.id) as count
FROM transactions t
JOIN students s ON t.student_id = s.id
WHERE t.circulation_status = 'active'
GROUP BY s.grade_level
ORDER BY s.grade_level;

-- name: GetOverdueByGradeLevel :many
SELECT s.grade_level, COUNT(t.id) as count
FROM transactions t
JOIN students s ON t.student_id = s.id
WHERE t.circulation_status = 'overdue'
   OR (t.status IN ('borrowed', 'overdue') AND t.due_date < CURRENT_DATE)
GROUP BY s.grade_level
ORDER BY s.grade_level;

-- name: GetFinesByGradeLevel :many
SELECT s.grade_level, COALESCE(SUM(f.amount), 0)::float8 as total_amount
FROM fines f
JOIN students s ON f.student_id = s.id
WHERE f.status = 'pending'
GROUP BY s.grade_level
ORDER BY s.grade_level;

-- name: GetMonthlyTrendsByYear :many
SELECT EXTRACT(YEAR FROM checkout_date)::int as year,
       TO_CHAR(DATE_TRUNC('month', checkout_date), 'Mon') as month,
       COUNT(*) as checkouts,
       COUNT(*) FILTER (WHERE return_date IS NOT NULL) as returns
FROM transactions
WHERE checkout_date > CURRENT_DATE - INTERVAL '2 years'
GROUP BY EXTRACT(YEAR FROM checkout_date), TO_CHAR(DATE_TRUNC('month', checkout_date), 'Mon'), DATE_TRUNC('month', checkout_date)
ORDER BY EXTRACT(YEAR FROM checkout_date), DATE_TRUNC('month', checkout_date);

-- name: GetCategoryUsageByGradeLevel :many
SELECT s.grade_level,
       c.name as category,
       COUNT(t.id) as borrow_count
FROM transactions t
JOIN students s ON t.student_id = s.id
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
LEFT JOIN categories c ON b.category_id = c.id
GROUP BY s.grade_level, c.name
ORDER BY s.grade_level, borrow_count DESC;

-- name: GetTopBorrowedByGradeLevel :many
SELECT s.grade_level,
       b.title,
       COUNT(t.id) as borrow_count
FROM transactions t
JOIN students s ON t.student_id = s.id
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
GROUP BY s.grade_level, b.title
ORDER BY s.grade_level, borrow_count DESC;

-- name: GetDashboardStatsEnhanced :one
WITH book_stats AS (
    SELECT COUNT(*) FILTER (WHERE status = 'active') as total_books
    FROM books
),
copy_stats AS (
    SELECT COUNT(*) FILTER (WHERE status != 'retired') as total_copies
    FROM book_copies
),
student_stats AS (
    SELECT COUNT(*) FILTER (WHERE status = 'active') as active_students
    FROM students
),
transaction_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE status IN ('borrowed', 'overdue')) as current_loans,
        COUNT(*) FILTER (WHERE status IN ('borrowed', 'overdue') AND due_date < CURRENT_DATE) as overdue_books,
        COUNT(*) FILTER (
            WHERE checkout_date >= CURRENT_DATE
              AND checkout_date < CURRENT_DATE + INTERVAL '1 day'
        ) as checkouts_today,
        COUNT(*) FILTER (
            WHERE return_date >= CURRENT_DATE
              AND return_date < CURRENT_DATE + INTERVAL '1 day'
        ) as returns_today,
        COUNT(*) FILTER (
            WHERE due_date = CURRENT_DATE
              AND status IN ('borrowed', 'overdue')
        ) as due_today,
        COUNT(*) FILTER (WHERE circulation_status = 'lost') as lost_books,
        COUNT(*) FILTER (WHERE circulation_status = 'damaged') as damaged_books
    FROM transactions
),
fine_stats AS (
    SELECT COALESCE(SUM(amount), 0)::float8 as total_fines
    FROM fines
    WHERE status = 'pending'
),
incident_stats AS (
    SELECT COUNT(*) FILTER (WHERE status = 'pending') as pending_incidents
    FROM damage_lost_incidents
),
reservation_stats AS (
    SELECT COUNT(*) as total_reservations
    FROM book_requests
    WHERE request_type = 'reservation'
      AND status = 'pending'
)
SELECT
    bs.total_books,
    cs.total_copies,
    ss.active_students,
    ts.current_loans,
    ts.overdue_books,
    fs.total_fines,
    ts.checkouts_today,
    ts.returns_today,
    ts.due_today,
    ts.lost_books,
    ts.damaged_books,
    ins.pending_incidents,
    rs.total_reservations
FROM book_stats bs,
     copy_stats cs,
     student_stats ss,
     transaction_stats ts,
     fine_stats fs,
     incident_stats ins,
     reservation_stats rs;

-- name: GetCirculationStatusDistribution :many
SELECT circulation_status, COUNT(*) as count
FROM transactions
WHERE checkout_date > CURRENT_DATE - INTERVAL '30 days'
GROUP BY circulation_status;

-- name: GetDamageLostStats :one
SELECT COUNT(*) FILTER (WHERE incident_type = 'damage') as damage_count,
       COUNT(*) FILTER (WHERE incident_type = 'lost') as lost_count,
       COALESCE(SUM(assessed_cost), 0)::float8 as total_cost
FROM damage_lost_incidents;
