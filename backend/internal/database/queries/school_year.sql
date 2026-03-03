-- name: ExportTransactions :many
SELECT
    t.id,
    s.student_id,
    u.name AS student_name,
    b.title AS book_title,
    bc.copy_number,
    t.status,
    t.checkout_date,
    t.due_date,
    t.return_date,
    t.renewal_count,
    t.notes
FROM transactions t
JOIN students s ON t.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
WHERE (sqlc.narg('start_date')::date IS NULL OR t.checkout_date::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR t.checkout_date::date <= sqlc.narg('end_date'))
ORDER BY t.checkout_date DESC;

-- name: ExportFines :many
SELECT
    f.id,
    s.student_id,
    u.name AS student_name,
    f.amount,
    f.fine_type,
    f.description,
    f.status,
    f.created_at,
    f.updated_at
FROM fines f
JOIN students s ON f.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE (sqlc.narg('start_date')::date IS NULL OR f.created_at::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR f.created_at::date <= sqlc.narg('end_date'))
ORDER BY f.created_at DESC;

-- name: ExportPayments :many
SELECT
    p.id,
    s.student_id,
    u.name AS student_name,
    p.amount,
    p.payment_method,
    p.reference_number,
    p.notes,
    p.payment_date,
    p.created_at
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE (sqlc.narg('start_date')::date IS NULL OR p.payment_date::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR p.payment_date::date <= sqlc.narg('end_date'))
ORDER BY p.payment_date DESC;

-- name: ExportRequests :many
SELECT
    r.id,
    s.student_id,
    u.name AS student_name,
    b.title AS book_title,
    r.request_type,
    r.status,
    r.request_date,
    r.processed_at,
    r.notes
FROM book_requests r
JOIN students s ON r.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN books b ON r.book_id = b.id
WHERE (sqlc.narg('start_date')::date IS NULL OR r.request_date::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR r.request_date::date <= sqlc.narg('end_date'))
ORDER BY r.request_date DESC;

-- name: ExportNotifications :many
SELECT
    n.id,
    u.username,
    u.name AS user_name,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.reference_type,
    n.reference_id,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE (sqlc.narg('start_date')::date IS NULL OR n.created_at::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR n.created_at::date <= sqlc.narg('end_date'))
ORDER BY n.created_at DESC;

-- name: ExportAuditLogs :many
SELECT
    a.id,
    u.username,
    u.name AS user_name,
    a.action,
    a.entity_type,
    a.entity_id,
    a.old_values,
    a.new_values,
    a.ip_address,
    a.user_agent,
    a.created_at
FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id
WHERE (sqlc.narg('start_date')::date IS NULL OR a.created_at::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR a.created_at::date <= sqlc.narg('end_date'))
ORDER BY a.created_at DESC;

-- name: ExportStudents :many
SELECT
    s.id,
    s.student_id,
    u.username,
    u.name AS student_name,
    u.email,
    s.grade_level,
    s.section,
    s.rfid_code,
    s.contact_info,
    s.guardian_name,
    s.guardian_contact,
    s.status,
    s.registration_date,
    s.created_at
FROM students s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC;

-- name: UpdateStudentsStatusByIDs :exec
UPDATE students
SET status = $2
WHERE id = ANY($1::uuid[]);

-- name: UpdateUsersStatusByStudentIDs :exec
UPDATE users u
SET status = $2
FROM students s
WHERE s.user_id = u.id
  AND s.id = ANY($1::uuid[]);

-- name: DeleteRefreshTokensByStudentIDs :exec
DELETE FROM refresh_tokens
WHERE user_id IN (
    SELECT user_id FROM students WHERE id = ANY($1::uuid[])
);

-- name: CountActiveLoansByStudentIDs :one
SELECT COUNT(*)
FROM transactions
WHERE student_id = ANY($1::uuid[])
  AND status IN ('borrowed', 'overdue');

-- name: GetYearEndSummary :one
WITH txn AS (
    SELECT
        COUNT(*) AS total_transactions,
        COUNT(*) FILTER (WHERE status = 'returned') AS returned_count,
        COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'lost') AS lost_count,
        COUNT(*) FILTER (WHERE status IN ('borrowed', 'overdue')) AS active_loans
    FROM transactions
    WHERE (sqlc.narg('start_date')::date IS NULL OR checkout_date::date >= sqlc.narg('start_date'))
      AND (sqlc.narg('end_date')::date IS NULL OR checkout_date::date <= sqlc.narg('end_date'))
),
fines_summary AS (
    SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::float8 AS pending_fines,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float8 AS paid_fines,
        COALESCE(SUM(amount) FILTER (WHERE status = 'waived'), 0)::float8 AS waived_fines
    FROM fines
    WHERE (sqlc.narg('start_date')::date IS NULL OR created_at::date >= sqlc.narg('start_date'))
      AND (sqlc.narg('end_date')::date IS NULL OR created_at::date <= sqlc.narg('end_date'))
),
requests_summary AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_requests,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved_requests,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_requests,
        COUNT(*) FILTER (WHERE status = 'fulfilled') AS fulfilled_requests
    FROM book_requests
    WHERE (sqlc.narg('start_date')::date IS NULL OR request_date::date >= sqlc.narg('start_date'))
      AND (sqlc.narg('end_date')::date IS NULL OR request_date::date <= sqlc.narg('end_date'))
),
student_summary AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS active_students,
        COUNT(*) FILTER (WHERE status = 'graduated') AS graduated_students
    FROM students
)
SELECT
    txn.total_transactions,
    txn.returned_count,
    txn.overdue_count,
    txn.lost_count,
    txn.active_loans,
    fines_summary.pending_fines,
    fines_summary.paid_fines,
    fines_summary.waived_fines,
    requests_summary.pending_requests,
    requests_summary.approved_requests,
    requests_summary.rejected_requests,
    requests_summary.fulfilled_requests,
    student_summary.active_students,
    student_summary.graduated_students
FROM txn, fines_summary, requests_summary, student_summary;

-- name: GetResetCounts :one
SELECT
    (SELECT COUNT(*) FROM transactions
        WHERE (sqlc.narg('start_date')::date IS NULL OR checkout_date::date >= sqlc.narg('start_date'))
          AND (sqlc.narg('end_date')::date IS NULL OR checkout_date::date <= sqlc.narg('end_date'))
    ) AS transactions_count,
    (SELECT COUNT(*) FROM fines
        WHERE (sqlc.narg('start_date')::date IS NULL OR created_at::date >= sqlc.narg('start_date'))
          AND (sqlc.narg('end_date')::date IS NULL OR created_at::date <= sqlc.narg('end_date'))
    ) AS fines_count,
    (SELECT COUNT(*) FROM payments
        WHERE (sqlc.narg('start_date')::date IS NULL OR payment_date::date >= sqlc.narg('start_date'))
          AND (sqlc.narg('end_date')::date IS NULL OR payment_date::date <= sqlc.narg('end_date'))
    ) AS payments_count,
    (SELECT COUNT(*) FROM book_requests
        WHERE (sqlc.narg('start_date')::date IS NULL OR request_date::date >= sqlc.narg('start_date'))
          AND (sqlc.narg('end_date')::date IS NULL OR request_date::date <= sqlc.narg('end_date'))
    ) AS requests_count,
    (SELECT COUNT(*) FROM notifications
        WHERE (sqlc.narg('start_date')::date IS NULL OR created_at::date >= sqlc.narg('start_date'))
          AND (sqlc.narg('end_date')::date IS NULL OR created_at::date <= sqlc.narg('end_date'))
    ) AS notifications_count,
    (SELECT COUNT(*) FROM audit_logs
        WHERE (sqlc.narg('start_date')::date IS NULL OR created_at::date >= sqlc.narg('start_date'))
          AND (sqlc.narg('end_date')::date IS NULL OR created_at::date <= sqlc.narg('end_date'))
    ) AS audit_logs_count,
    (SELECT COUNT(*) FROM favorite_books) AS favorites_count,
    (SELECT COUNT(*) FROM student_achievements) AS achievements_count;

-- name: DeletePaymentsByDateRange :exec
DELETE FROM payments
WHERE (sqlc.narg('start_date')::date IS NULL OR payment_date::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR payment_date::date <= sqlc.narg('end_date'));

-- name: DeleteFinesByDateRange :exec
DELETE FROM fines
WHERE (sqlc.narg('start_date')::date IS NULL OR created_at::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR created_at::date <= sqlc.narg('end_date'));

-- name: DeleteTransactionsByDateRange :exec
DELETE FROM transactions
WHERE (sqlc.narg('start_date')::date IS NULL OR checkout_date::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR checkout_date::date <= sqlc.narg('end_date'));

-- name: DeleteRequestsByDateRange :exec
DELETE FROM book_requests
WHERE (sqlc.narg('start_date')::date IS NULL OR request_date::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR request_date::date <= sqlc.narg('end_date'));

-- name: DeleteNotificationsByDateRange :exec
DELETE FROM notifications
WHERE (sqlc.narg('start_date')::date IS NULL OR created_at::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR created_at::date <= sqlc.narg('end_date'));

-- name: DeleteAuditLogsByDateRange :exec
DELETE FROM audit_logs
WHERE (sqlc.narg('start_date')::date IS NULL OR created_at::date >= sqlc.narg('start_date'))
  AND (sqlc.narg('end_date')::date IS NULL OR created_at::date <= sqlc.narg('end_date'));

-- name: DeletePayments :exec
DELETE FROM payments;

-- name: DeleteFines :exec
DELETE FROM fines;

-- name: DeleteTransactions :exec
DELETE FROM transactions;

-- name: DeleteRequests :exec
DELETE FROM book_requests;

-- name: DeleteNotifications :exec
DELETE FROM notifications;

-- name: DeleteFavorites :exec
DELETE FROM favorite_books;

-- name: DeleteStudentAchievements :exec
DELETE FROM student_achievements;
