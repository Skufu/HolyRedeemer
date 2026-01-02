-- name: GetStudentByID :one
SELECT s.*, u.username, u.email as user_email, u.name as user_name, u.status as user_status
FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.id = $1;

-- name: GetStudentByUserID :one
SELECT s.*, u.username, u.email as user_email, u.name as user_name, u.status as user_status
FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.user_id = $1;

-- name: GetStudentByStudentID :one
SELECT s.*, u.username, u.email as user_email, u.name as user_name, u.status as user_status
FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.student_id = $1;

-- name: GetStudentByRFID :one
SELECT s.*, u.username, u.email as user_email, u.name as user_name, u.status as user_status
FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.rfid_code = $1;

-- name: CreateStudent :one
INSERT INTO students (user_id, student_id, grade_level, section, rfid_code, contact_info, guardian_name, guardian_contact, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateStudent :one
UPDATE students
SET grade_level = COALESCE(sqlc.narg('grade_level'), grade_level),
    section = COALESCE(sqlc.narg('section'), section),
    rfid_code = COALESCE(sqlc.narg('rfid_code'), rfid_code),
    contact_info = COALESCE(sqlc.narg('contact_info'), contact_info),
    guardian_name = COALESCE(sqlc.narg('guardian_name'), guardian_name),
    guardian_contact = COALESCE(sqlc.narg('guardian_contact'), guardian_contact),
    status = COALESCE(sqlc.narg('status'), status)
WHERE id = $1
RETURNING *;

-- name: ListStudents :many
SELECT s.*, u.username, u.email as user_email, u.name as user_name, u.status as user_status,
       (SELECT COUNT(*) FROM transactions t WHERE t.student_id = s.id AND t.status IN ('borrowed', 'overdue')) as current_loans,
       (SELECT COALESCE(SUM(f.amount), 0) FROM fines f WHERE f.student_id = s.id AND f.status = 'pending') as total_fines
FROM students s
JOIN users u ON s.user_id = u.id
WHERE (sqlc.narg('grade_level')::int IS NULL OR s.grade_level = sqlc.narg('grade_level'))
  AND (sqlc.narg('section')::text IS NULL OR s.section ILIKE '%' || sqlc.narg('section') || '%')
  AND (sqlc.narg('status')::student_status IS NULL OR s.status = sqlc.narg('status'))
  AND (sqlc.narg('search')::text IS NULL OR 
       u.name ILIKE '%' || sqlc.narg('search') || '%' OR 
       s.student_id ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY s.created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountStudents :one
SELECT COUNT(*)
FROM students s
JOIN users u ON s.user_id = u.id
WHERE (sqlc.narg('grade_level')::int IS NULL OR s.grade_level = sqlc.narg('grade_level'))
  AND (sqlc.narg('section')::text IS NULL OR s.section ILIKE '%' || sqlc.narg('section') || '%')
  AND (sqlc.narg('status')::student_status IS NULL OR s.status = sqlc.narg('status'))
  AND (sqlc.narg('search')::text IS NULL OR 
       u.name ILIKE '%' || sqlc.narg('search') || '%' OR 
       s.student_id ILIKE '%' || sqlc.narg('search') || '%');

-- name: GetStudentCurrentLoans :one
SELECT COUNT(*) FROM transactions
WHERE student_id = $1 AND status IN ('borrowed', 'overdue');

-- name: GetStudentTotalFines :one
SELECT COALESCE(SUM(amount), 0)::float8 FROM fines
WHERE student_id = $1 AND status = 'pending';

-- name: RegisterStudentRFID :exec
UPDATE students SET rfid_code = $2 WHERE user_id = $1;
