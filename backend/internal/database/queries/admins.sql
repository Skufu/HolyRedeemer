-- Admin queries - Admins are users with role 'admin' or 'super_admin'

-- name: ListAdmins :many
SELECT id, username, password_hash, role, email, name, status, created_at, updated_at
FROM users
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountAdmins :one
SELECT COUNT(*) FROM users
WHERE role IN ('admin', 'super_admin');

-- name: GetAdminByID :one
SELECT id, username, password_hash, role, email, name, status, created_at, updated_at
FROM users
WHERE id = $1 AND role IN ('admin', 'super_admin');

-- name: CreateAdmin :one
INSERT INTO users (username, password_hash, role, email, name, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateAdmin :one
UPDATE users
SET username = COALESCE(sqlc.narg('username'), username),
    email = COALESCE(sqlc.narg('email'), email),
    name = COALESCE(sqlc.narg('name'), name),
    status = COALESCE(sqlc.narg('status'), status),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND role IN ('admin', 'super_admin')
RETURNING *;

-- name: DeleteAdmin :exec
DELETE FROM users WHERE id = $1 AND role IN ('admin', 'super_admin');
