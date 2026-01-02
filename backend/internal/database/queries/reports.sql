-- Dashboard Statistics
-- name: GetDashboardStats :one
SELECT 
    (SELECT COUNT(*) FROM books WHERE status = 'active') as total_books,
    (SELECT COUNT(*) FROM book_copies WHERE status != 'retired') as total_copies,
    (SELECT COUNT(*) FROM students WHERE status = 'active') as active_students,
    (SELECT COUNT(*) FROM transactions WHERE status IN ('borrowed', 'overdue')) as current_loans,
    (SELECT COUNT(*) FROM transactions WHERE status IN ('borrowed', 'overdue') AND due_date < CURRENT_DATE) as overdue_books,
    (SELECT COALESCE(SUM(amount), 0)::float8 FROM fines WHERE status = 'pending') as total_fines,
    (SELECT COUNT(*) FROM transactions WHERE DATE(checkout_date) = CURRENT_DATE) as checkouts_today,
    (SELECT COUNT(*) FROM transactions WHERE DATE(return_date) = CURRENT_DATE) as returns_today,
    (SELECT COUNT(*) FROM transactions WHERE due_date = CURRENT_DATE AND status IN ('borrowed', 'overdue')) as due_today;

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
SELECT * FROM librarians WHERE user_id = $1;

-- name: GetLibrarianByID :one
SELECT * FROM librarians WHERE id = $1;

-- name: CreateLibrarian :one
INSERT INTO librarians (user_id, employee_id, name, email, phone, department)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
