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

-- name: ListRequestsByStudentAndType :many
SELECT br.*, s.student_id, u.name as student_name, b.title as book_title, b.author as book_author
FROM book_requests br
JOIN students s ON br.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN books b ON br.book_id = b.id
WHERE br.student_id = sqlc.arg('student_id')
  AND br.request_type = sqlc.arg('request_type')
  AND (sqlc.narg('status')::request_status IS NULL OR br.status = sqlc.narg('status'))
ORDER BY br.request_date DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: CountPendingRequests :one
SELECT COUNT(*)
FROM book_requests
WHERE status = 'pending';

-- name: HasPendingReservation :one
SELECT EXISTS(
  SELECT 1
  FROM book_requests
  WHERE student_id = $1
    AND book_id = $2
    AND request_type = 'reservation'
    AND status = 'pending'
);

-- name: FulfillReservation :exec
UPDATE book_requests
SET status = 'fulfilled',
    processed_at = CURRENT_TIMESTAMP
WHERE student_id = $1
  AND book_id = $2
  AND request_type = 'reservation'
  AND status = 'approved';

-- name: CancelPendingReservationsForBook :exec
UPDATE book_requests
SET status = 'cancelled',
    auto_cancelled_at = NOW()
WHERE book_id = $1
  AND status = 'pending'
  AND request_type = 'reservation';

-- name: GetNextPendingReservation :one
SELECT *
FROM book_requests
WHERE book_id = $1
  AND status = 'pending'
  AND request_type = 'reservation'
ORDER BY reservation_queue_position ASC
LIMIT 1;

-- name: GetReservationQueuePosition :one
SELECT reservation_queue_position
FROM book_requests
WHERE student_id = $1
  AND book_id = $2
  AND status = 'pending';

-- name: UpdateReservationQueuePositions :exec
UPDATE book_requests
SET reservation_queue_position = reservation_queue_position - 1
WHERE book_id = $1
  AND reservation_queue_position > $2;
