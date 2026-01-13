-- name: UpdateCopyQRCode :one
UPDATE book_copies
SET qr_code = $2
WHERE id = $1
RETURNING id, book_id, copy_number, qr_code, barcode, status, condition, acquisition_date, notes, created_at, updated_at;
