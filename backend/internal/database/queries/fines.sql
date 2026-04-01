-- name: GetFineByID :one
SELECT f.*, 
       t.copy_id,
       b.title as book_title,
       s.student_id as student_number,
       u.name as student_name
FROM fines f
LEFT JOIN transactions t ON f.transaction_id = t.id
LEFT JOIN book_copies bc ON t.copy_id = bc.id
LEFT JOIN books b ON bc.book_id = b.id
JOIN students s ON f.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE f.id = $1;

-- name: CreateFine :one
INSERT INTO fines (transaction_id, student_id, amount, fine_type, description, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateFineStatus :one
UPDATE fines SET status = $2 WHERE id = $1 RETURNING *;

-- name: ListFines :many
SELECT f.*, 
       b.title as book_title,
       s.student_id as student_number,
       u.name as student_name
FROM fines f
LEFT JOIN transactions t ON f.transaction_id = t.id
LEFT JOIN book_copies bc ON t.copy_id = bc.id
LEFT JOIN books b ON bc.book_id = b.id
JOIN students s ON f.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE (sqlc.narg('student_id')::uuid IS NULL OR f.student_id = sqlc.narg('student_id'))
  AND (sqlc.narg('status')::fine_status IS NULL OR f.status = sqlc.narg('status'))
ORDER BY f.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListFinesByStudent :many
SELECT f.*,
       b.title as book_title
FROM fines f
LEFT JOIN transactions t ON f.transaction_id = t.id
LEFT JOIN book_copies bc ON t.copy_id = bc.id
LEFT JOIN books b ON bc.book_id = b.id
WHERE f.student_id = $1
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountFinesByStudent :one
SELECT COUNT(*) FROM fines WHERE student_id = $1;

-- name: GetPendingFinesByStudent :many
SELECT f.* FROM fines f
WHERE f.student_id = $1 AND f.status = 'pending';

-- name: CountFines :one
SELECT COUNT(*)
FROM fines f
WHERE (sqlc.narg('student_id')::uuid IS NULL OR f.student_id = sqlc.narg('student_id'))
  AND (sqlc.narg('status')::fine_status IS NULL OR f.status = sqlc.narg('status'));

-- name: GetTotalPendingFines :one
SELECT COALESCE(SUM(amount), 0)::float8 FROM fines WHERE status = 'pending';

-- Payment queries
-- name: CreatePayment :one
INSERT INTO payments (fine_id, student_id, amount, payment_method, reference_number, notes, processed_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListPaymentsByFine :many
SELECT p.*, l.name as processed_by_name
FROM payments p
LEFT JOIN librarians l ON p.processed_by = l.id
WHERE p.fine_id = $1
ORDER BY p.payment_date DESC;

-- name: ListPaymentsByStudent :many
SELECT p.*, l.name as processed_by_name
FROM payments p
LEFT JOIN librarians l ON p.processed_by = l.id
WHERE p.student_id = $1
ORDER BY p.payment_date DESC;

-- name: GetTotalPaidForFine :one
SELECT COALESCE(SUM(amount), 0)::float8 FROM payments WHERE fine_id = $1;

-- name: CreateFineForIncident :one
INSERT INTO fines (transaction_id, student_id, amount, fine_type, description)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
