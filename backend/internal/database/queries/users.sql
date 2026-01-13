-- name: GetUserByID :one
SELECT id, username, password_hash, role, email, name, status, created_at, updated_at
FROM users WHERE id = $1;

-- name: GetUserByUsername :one
SELECT id, username, password_hash, role, email, name, status, created_at, updated_at
FROM users WHERE username = $1;

-- name: CreateUser :one
INSERT INTO users (username, password_hash, role, email, name, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET username = COALESCE(sqlc.narg('username'), username),
    email = COALESCE(sqlc.narg('email'), email),
    name = COALESCE(sqlc.narg('name'), name),
    status = COALESCE(sqlc.narg('status'), status)
WHERE id = $1
RETURNING *;

-- name: UpdateUserPassword :exec
UPDATE users SET password_hash = $2 WHERE id = $1;

-- name: ListUsers :many
SELECT id, username, password_hash, role, email, name, status, created_at, updated_at
FROM users
WHERE (sqlc.narg('role')::user_role IS NULL OR role = sqlc.narg('role'))
  AND (sqlc.narg('status')::user_status IS NULL OR status = sqlc.narg('status'))
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountUsers :one
SELECT COUNT(*) FROM users
WHERE (sqlc.narg('role')::user_role IS NULL OR role = sqlc.narg('role'))
  AND (sqlc.narg('status')::user_status IS NULL OR status = sqlc.narg('status'));

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- Refresh Token queries
-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetRefreshToken :one
SELECT id, user_id, token_hash, expires_at, created_at
FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW();

-- name: DeleteRefreshToken :exec
DELETE FROM refresh_tokens WHERE token_hash = $1;

-- name: DeleteUserRefreshTokens :exec
DELETE FROM refresh_tokens WHERE user_id = $1;

 -- name: DeleteExpiredRefreshTokens :exec
 DELETE FROM refresh_tokens WHERE expires_at < NOW();

-- name: ListLibrarians :many
SELECT l.id, l.user_id, l.employee_id, l.name, l.email, l.phone, l.department, l.created_at, l.updated_at, u.username
FROM librarians l
LEFT JOIN users u ON l.user_id = u.id
ORDER BY l.created_at DESC
LIMIT sqlc.narg('limit') OFFSET sqlc.narg('offset');

