-- name: UpdateLibrarian :one
UPDATE librarians
SET employee_id = COALESCE(sqlc.narg('employee_id'), employee_id),
    phone = COALESCE(sqlc.narg('phone'), phone),
    department = COALESCE(sqlc.narg('department'), department),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, user_id, employee_id, name, email, phone, department, created_at, updated_at;

-- name: DeleteLibrarian :exec
DELETE FROM librarians WHERE id = $1;

-- name: GetLibrarianByIDWithUser :one
SELECT l.*, u.username
FROM librarians l
LEFT JOIN users u ON l.user_id = u.id
WHERE l.id = $1;
