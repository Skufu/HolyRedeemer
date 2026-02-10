-- name: ListFavoriteBooks :many
SELECT 
    fb.id,
    fb.book_id,
    b.title,
    b.author,
    b.isbn,
    b.cover_url,
    fb.created_at
FROM favorite_books fb
JOIN books b ON fb.book_id = b.id
WHERE fb.student_id = $1
ORDER BY fb.created_at DESC;

-- name: AddFavoriteBook :one
INSERT INTO favorite_books (student_id, book_id)
VALUES ($1, $2)
RETURNING *;

-- name: RemoveFavoriteBook :exec
DELETE FROM favorite_books
WHERE student_id = $1 AND book_id = $2;

-- name: IsBookFavorited :one
SELECT EXISTS (
    SELECT 1 FROM favorite_books
    WHERE student_id = $1 AND book_id = $2
) as is_favorited;

-- name: ListAchievements :many
SELECT * FROM achievements
ORDER BY name;

-- name: GetStudentAchievements :many
SELECT 
    a.id,
    a.code,
    a.name,
    a.description,
    a.icon,
    a.color,
    a.requirement_type,
    a.requirement_value,
    sa.unlocked_at
FROM achievements a
LEFT JOIN student_achievements sa ON a.id = sa.achievement_id AND sa.student_id = $1
ORDER BY sa.unlocked_at DESC NULLS LAST, a.name;

-- name: UnlockAchievement :one
INSERT INTO student_achievements (student_id, achievement_id)
VALUES ($1, $2)
RETURNING *;

-- name: HasAchievement :one
SELECT EXISTS (
    SELECT 1 FROM student_achievements
    WHERE student_id = $1 AND achievement_id = $2
) as has_achievement;

-- name: CountFavoritesByStudent :one
SELECT COUNT(*) FROM favorite_books
WHERE student_id = $1;
