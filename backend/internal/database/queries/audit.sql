-- name: ListAuditLogs :many
SELECT
    id,
    user_id,
    action::text,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
FROM audit_logs
WHERE (sqlc.narg('user_id')::uuid IS NULL OR user_id = sqlc.narg('user_id')::uuid)
  AND (sqlc.narg('action')::audit_action IS NULL OR action = sqlc.narg('action')::audit_action)
  AND (sqlc.narg('entity_type') IS NULL OR entity_type = sqlc.narg('entity_type'))
  AND (sqlc.narg('from_date')::timestamp IS NULL OR created_at >= sqlc.narg('from_date')::timestamp)
  AND (sqlc.narg('to_date')::timestamp IS NULL OR created_at <= sqlc.narg('to_date')::timestamp)
ORDER BY created_at DESC
LIMIT sqlc.narg('limit') OFFSET sqlc.narg('offset');

-- name: GetRecentAuditLogs :many
SELECT
    id,
    user_id,
    action::text,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT sqlc.narg('limit');
