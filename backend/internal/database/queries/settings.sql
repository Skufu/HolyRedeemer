-- name: ListSettings :many
SELECT key, value, COALESCE(description, ''), COALESCE(category, '')
FROM library_settings
WHERE category = sqlc.narg('category') OR sqlc.narg('category') IS NULL
ORDER BY category, key;

-- name: GetSetting :one
SELECT key, value, COALESCE(description, ''), COALESCE(category, '')
FROM library_settings
WHERE key = sqlc.narg('key');

-- name: UpdateSetting :exec
UPDATE library_settings
SET value = sqlc.narg('value'),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = sqlc.narg('updated_by')
WHERE key = sqlc.narg('key');

-- name: CreateSetting :one
INSERT INTO library_settings (key, value, description, category, updated_by)
VALUES (sqlc.narg('key'), sqlc.narg('value'), sqlc.narg('description'), sqlc.narg('category'), sqlc.narg('updated_by'))
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, library_settings.description),
    category = COALESCE(EXCLUDED.category, library_settings.category),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = EXCLUDED.updated_by
RETURNING *;
