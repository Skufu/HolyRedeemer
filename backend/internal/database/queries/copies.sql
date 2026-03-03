-- name: GetCopyByID :one
SELECT bc.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn
FROM book_copies bc
JOIN books b ON bc.book_id = b.id
WHERE bc.id = $1;

-- name: ListBookCopiesWithBorrower :many
SELECT
  bc.id AS copy_id,
  bc.book_id,
  bc.copy_number,
  bc.qr_code,
  bc.status,
  bc.condition,

  t.id AS transaction_id,
  t.student_id AS borrower_id,
  t.checkout_date,
  t.due_date,

  s.student_id AS borrower_student_number,
  u.name AS borrower_name

FROM book_copies bc
LEFT JOIN transactions t
  ON t.copy_id = bc.id AND t.status IN ('borrowed', 'overdue')
LEFT JOIN students s
  ON s.id = t.student_id
LEFT JOIN users u
  ON u.id = s.user_id

WHERE bc.book_id = $1
ORDER BY bc.copy_number ASC;


-- name: GetCopyByQRCode :one
SELECT bc.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn, b.id as book_id
FROM book_copies bc
JOIN books b ON bc.book_id = b.id
WHERE bc.qr_code = $1;

-- name: CreateCopy :one
INSERT INTO book_copies (book_id, copy_number, qr_code, barcode, status, condition, acquisition_date, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateCopy :one
UPDATE book_copies
SET status = COALESCE(sqlc.narg('status'), status),
    condition = COALESCE(sqlc.narg('condition'), condition),
    notes = COALESCE(sqlc.narg('notes'), notes)
WHERE id = $1
RETURNING *;

-- name: UpdateCopyStatus :exec
UPDATE book_copies SET status = $2 WHERE id = $1;

-- name: ListCopiesByBook :many
SELECT bc.*, 
       CASE WHEN t.id IS NOT NULL THEN true ELSE false END as is_borrowed,
       t.student_id as borrower_id,
       t.due_date as due_date
FROM book_copies bc
LEFT JOIN transactions t
  ON t.copy_id = bc.id AND t.status IN ('borrowed', 'overdue')
WHERE bc.book_id = $1
ORDER BY bc.copy_number;

-- name: GetNextCopyNumber :one
SELECT COALESCE(MAX(copy_number), 0) + 1 FROM book_copies WHERE book_id = $1;

-- name: GetAvailableCopy :one
SELECT bc.* FROM book_copies bc
WHERE bc.book_id = $1 AND bc.status = 'available'
ORDER BY bc.copy_number
LIMIT 1;

-- name: CountCopiesByStatus :many
SELECT status, COUNT(*) as count
FROM book_copies
GROUP BY status;

-- name: DeleteCopy :exec
UPDATE book_copies SET status = 'retired' WHERE id = $1;

-- name: GetCopyByIDForUpdate :one
SELECT bc.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn
FROM book_copies bc
JOIN books b ON bc.book_id = b.id
WHERE bc.id = $1
FOR UPDATE;

