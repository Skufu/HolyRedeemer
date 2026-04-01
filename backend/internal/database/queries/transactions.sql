-- name: GetTransactionByID :one
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
WHERE t.id = $1;

-- name: CreateTransaction :one
INSERT INTO transactions (student_id, copy_id, librarian_id, checkout_date, due_date, status, checkout_method, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateTransactionReturn :one
UPDATE transactions
SET return_date = $2,
    returned_by = $3,
    status = 'returned',
    return_condition = $4,
    notes = COALESCE($5, notes)
WHERE id = $1
RETURNING *;

-- name: UpdateTransactionStatus :exec
UPDATE transactions SET status = $2 WHERE id = $1;

-- name: RenewTransaction :one
UPDATE transactions
SET due_date = $2,
    renewal_count = renewal_count + 1
WHERE id = $1
RETURNING *;

-- name: ListActiveTransactions :many
SELECT t.*, 
       b.title as book_title, b.author as book_author, b.id as book_id,
       bc.copy_number, bc.qr_code,
       s.student_id as student_number, s.id as student_uuid,
       u.name as student_name
FROM transactions t
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
JOIN students s ON t.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE t.status IN ('borrowed', 'overdue')
  AND (sqlc.narg('student_id')::uuid IS NULL OR t.student_id = sqlc.narg('student_id'))
ORDER BY t.due_date ASC
LIMIT $1 OFFSET $2;

-- name: ListOverdueTransactions :many
SELECT t.*, 
       b.title as book_title, b.author as book_author, b.id as book_id,
       bc.copy_number, bc.qr_code,
       s.student_id as student_number, s.id as student_uuid,
       u.name as student_name,
       CURRENT_DATE - t.due_date as days_overdue
FROM transactions t
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
JOIN students s ON t.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE t.status IN ('borrowed', 'overdue') AND t.due_date < CURRENT_DATE
ORDER BY t.due_date ASC
LIMIT $1 OFFSET $2;

-- name: ListTransactionsByStudent :many
SELECT t.*,
       b.title as book_title, b.author as book_author, b.id as book_id,
       bc.copy_number, bc.qr_code
FROM transactions t
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
WHERE t.student_id = $1
ORDER BY t.checkout_date DESC
LIMIT $2 OFFSET $3;

-- name: CountTransactionsByStudent :one
SELECT COUNT(*) FROM transactions WHERE student_id = $1;

-- name: ListDueTodayTransactions :many
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
WHERE t.status IN ('borrowed', 'overdue') AND t.due_date = CURRENT_DATE
ORDER BY u.name ASC;

-- name: GetActiveLoanByCopy :one
SELECT t.* FROM transactions t
WHERE t.copy_id = $1 AND t.status IN ('borrowed', 'overdue');

-- name: CountActiveLoans :one
SELECT COUNT(*) FROM transactions WHERE status IN ('borrowed', 'overdue');

-- name: CountActiveTransactionsByStudent :one
SELECT COUNT(*) FROM transactions
WHERE student_id = $1 AND status IN ('borrowed', 'overdue');

-- name: CountOverdueLoans :one
SELECT COUNT(*)
FROM transactions
WHERE status IN ('borrowed', 'overdue') AND due_date < CURRENT_DATE;

-- name: CountStudentOverdueLoans :one
SELECT COUNT(*)
FROM transactions
WHERE student_id = $1
  AND status IN ('borrowed', 'overdue')
  AND due_date < CURRENT_DATE;

-- name: CountTodayCheckouts :one
SELECT COUNT(*)
FROM transactions
WHERE checkout_date >= CURRENT_DATE
  AND checkout_date < CURRENT_DATE + INTERVAL '1 day';

-- name: CountTodayReturns :one
SELECT COUNT(*)
FROM transactions
WHERE return_date >= CURRENT_DATE
  AND return_date < CURRENT_DATE + INTERVAL '1 day';

-- name: CountDueToday :one
SELECT COUNT(*) FROM transactions WHERE due_date = CURRENT_DATE AND status IN ('borrowed', 'overdue');

-- name: MarkOverdueTransactions :exec
UPDATE transactions 
SET status = 'overdue' 
WHERE status = 'borrowed' AND due_date < CURRENT_DATE;

-- name: GetActiveLoanByCopyForUpdate :one
SELECT t.* FROM transactions t
WHERE t.copy_id = $1 AND t.status IN ('borrowed', 'overdue')
FOR UPDATE;


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

-- name: UpdateTransactionReturnWithStatus :one
UPDATE transactions
SET return_date = $2,
    returned_by = $3,
    status = 'returned',
    return_condition = $4,
    circulation_status = 'returned',
    receipt_no = $5,
    notes = COALESCE(sqlc.narg('notes'), notes)
WHERE id = $1
RETURNING *;

-- name: MarkTransactionLost :one
UPDATE transactions
SET status = 'lost',
    circulation_status = 'lost',
    incident_type = 'lost',
    receipt_no = $2,
    replacement_cost_applied = $3,
    incident_details = COALESCE(sqlc.narg('incident_details'), incident_details)
WHERE id = $1
RETURNING *;

-- name: MarkTransactionDamaged :one
UPDATE transactions
SET status = 'damaged',
    circulation_status = 'damaged',
    incident_type = 'damage',
    receipt_no = $2,
    incident_details = COALESCE(sqlc.narg('incident_details'), incident_details)
WHERE id = $1
RETURNING *;

-- name: GetTransactionByReceiptNo :one
SELECT * FROM transactions WHERE receipt_no = $1;

-- name: ListDamageLostIncidents :many
SELECT dli.*,
       t.receipt_no as transaction_receipt_no,
       t.circulation_status,
       t.status as transaction_status,
       bc.copy_number,
       b.title as book_title,
       b.author as book_author,
       s.student_id as student_number,
       s.grade_level,
       u.name as student_name
FROM damage_lost_incidents dli
JOIN transactions t ON dli.transaction_id = t.id
JOIN book_copies bc ON dli.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
JOIN students s ON dli.student_id = s.id
JOIN users u ON s.user_id = u.id
ORDER BY dli.reported_at DESC;

-- name: CreateDamageLostIncident :one
INSERT INTO damage_lost_incidents (
    transaction_id,
    copy_id,
    student_id,
    incident_type,
    severity,
    description,
    assessed_cost,
    receipt_no,
    reported_by,
    reported_at,
    status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetTransactionWithCirculationStatus :one
SELECT t.*, 
       b.title as book_title,
       b.author as book_author,
       bc.copy_number,
       bc.qr_code,
       s.student_id as student_number,
       s.grade_level,
       u.name as student_name
FROM transactions t
JOIN book_copies bc ON t.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
JOIN students s ON t.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE t.id = $1;
