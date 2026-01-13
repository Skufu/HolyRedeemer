-- name: ListUserNotifications :many
SELECT 
    id,
    user_id,
    type,
    title,
    message,
    is_read,
    reference_type,
    reference_id,
    created_at
FROM notifications
WHERE 
    user_id = $1
    AND (
        (sqlc.narg('is_read')::boolean IS NULL) OR
        (is_read = sqlc.narg('is_read'))
    )
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountUserNotifications :one
SELECT COUNT(*)
FROM notifications
WHERE 
    user_id = $1
    AND (
        (sqlc.narg('is_read')::boolean IS NULL) OR
        (is_read = sqlc.narg('is_read'))
    );

-- name: GetUnreadCount :one
SELECT COUNT(*)
FROM notifications
WHERE user_id = $1 AND is_read = false;

-- name: MarkNotificationRead :one
UPDATE notifications
SET is_read = true
WHERE id = $1
RETURNING id, is_read;

-- name: MarkAllNotificationsRead :exec
UPDATE notifications
SET is_read = true
WHERE user_id = $1 AND is_read = false;

-- name: CreateNotification :one
INSERT INTO notifications (
    user_id, 
    type, 
    title, 
    message, 
    reference_type, 
    reference_id
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;
