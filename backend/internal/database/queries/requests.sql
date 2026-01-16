-- name: GetRequestByID :one
SELECT br.*,
       s.student_id,
       u.name as student_name,
       b.title as book_title,
       b.author as book_author
FROM book_requests br
JOIN students s ON br.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN books b ON br.book_id = b.id
WHERE br.id = $1;

-- name: CreateRequest :one
INSERT INTO book_requests (student_id, book_id, request_type, notes)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ApproveRequest :one
UPDATE book_requests
SET status = 'approved',
    processed_by = $2,
    processed_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: RejectRequest :one
UPDATE book_requests
SET status = 'rejected',
    notes = COALESCE($2, notes),
    processed_by = $3,
    processed_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: ListRequests :many
SELECT br.*,
       s.student_id,
       u.name as student_name,
       b.title as book_title,
       b.author as book_author
FROM book_requests br
JOIN students s ON br.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN books b ON br.book_id = b.id
WHERE (sqlc.narg('status')::request_status IS NULL OR br.status = sqlc.narg('status'))
  AND (sqlc.narg('student_id')::uuid IS NULL OR br.student_id = sqlc.narg('student_id'))
ORDER BY br.request_date DESC
LIMIT $1 OFFSET $2;

-- name: CountPendingRequests :one
SELECT COUNT(*)
FROM book_requests
WHERE status = 'pending';
