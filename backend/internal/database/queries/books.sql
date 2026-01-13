-- name: GetBookByID :one
SELECT b.*, c.name as category_name, c.color_code as category_color,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'available') as available_copies
FROM books b
LEFT JOIN categories c ON b.category_id = c.id
WHERE b.id = $1;

-- name: GetBookByISBN :one
SELECT b.*, c.name as category_name, c.color_code as category_color,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'available') as available_copies
FROM books b
LEFT JOIN categories c ON b.category_id = c.id
WHERE b.isbn = $1;

-- name: CreateBook :one
INSERT INTO books (isbn, title, author, category_id, publisher, publication_year, description, cover_url, shelf_location, replacement_cost, status, is_data_complete)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: UpdateBook :one
UPDATE books
SET isbn = COALESCE(sqlc.narg('isbn'), isbn),
    title = COALESCE(sqlc.narg('title'), title),
    author = COALESCE(sqlc.narg('author'), author),
    category_id = COALESCE(sqlc.narg('category_id'), category_id),
    publisher = COALESCE(sqlc.narg('publisher'), publisher),
    publication_year = COALESCE(sqlc.narg('publication_year'), publication_year),
    description = COALESCE(sqlc.narg('description'), description),
    cover_url = COALESCE(sqlc.narg('cover_url'), cover_url),
    shelf_location = COALESCE(sqlc.narg('shelf_location'), shelf_location),
    replacement_cost = COALESCE(sqlc.narg('replacement_cost'), replacement_cost),
    status = COALESCE(sqlc.narg('status'), status),
    is_data_complete = COALESCE(sqlc.narg('is_data_complete'), is_data_complete)
WHERE id = $1
RETURNING *;

-- name: DeleteBook :exec
UPDATE books SET status = 'archived' WHERE id = $1;

-- name: ListBooks :many
SELECT b.*, c.name as category_name, c.color_code as category_color,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'available') as available_copies
FROM books b
LEFT JOIN categories c ON b.category_id = c.id
WHERE b.status != 'archived'
  AND (sqlc.narg('category_id')::uuid IS NULL OR b.category_id = sqlc.narg('category_id'))
  AND (sqlc.narg('status')::book_status IS NULL OR b.status = sqlc.narg('status'))
  AND (sqlc.narg('search')::text IS NULL OR 
       b.title ILIKE '%' || sqlc.narg('search') || '%' OR 
       b.author ILIKE '%' || sqlc.narg('search') || '%' OR 
       b.isbn ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY b.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListBooksAvailableOnly :many
SELECT b.*, c.name as category_name, c.color_code as category_color,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as total_copies,
       (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'available') as available_copies
FROM books b
LEFT JOIN categories c ON b.category_id = c.id
WHERE b.status = 'active'
  AND EXISTS (SELECT 1 FROM book_copies bc WHERE bc.book_id = b.id AND bc.status = 'available')
  AND (sqlc.narg('category_id')::uuid IS NULL OR b.category_id = sqlc.narg('category_id'))
  AND (sqlc.narg('search')::text IS NULL OR 
       b.title ILIKE '%' || sqlc.narg('search') || '%' OR 
       b.author ILIKE '%' || sqlc.narg('search') || '%' OR 
       b.isbn ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY b.title ASC
LIMIT $1 OFFSET $2;

-- name: CountBooks :one
SELECT COUNT(*)
FROM books b
WHERE b.status != 'archived'
  AND (sqlc.narg('category_id')::uuid IS NULL OR b.category_id = sqlc.narg('category_id'))
  AND (sqlc.narg('status')::book_status IS NULL OR b.status = sqlc.narg('status'))
  AND (sqlc.narg('search')::text IS NULL OR 
       b.title ILIKE '%' || sqlc.narg('search') || '%' OR 
       b.author ILIKE '%' || sqlc.narg('search') || '%' OR 
       b.isbn ILIKE '%' || sqlc.narg('search') || '%');

-- name: GetTotalBooksCount :one
SELECT COUNT(*) FROM books WHERE status = 'active';

-- Category queries
-- name: ListCategories :many
SELECT id, name, description, color_code, created_at
FROM categories ORDER BY name;

-- name: GetCategoryByID :one
SELECT id, name, description, color_code, created_at
FROM categories WHERE id = $1;

-- name: GetCategoryByName :one
SELECT id, name, description, color_code, created_at
FROM categories WHERE name = $1;

-- name: CreateCategory :one
INSERT INTO categories (name, description, color_code)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateCategory :one
UPDATE categories
SET name = COALESCE(sqlc.narg('name'), name),
    description = COALESCE(sqlc.narg('description'), description),
    color_code = COALESCE(sqlc.narg('color_code'), color_code)
WHERE id = $1
RETURNING *;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1;
