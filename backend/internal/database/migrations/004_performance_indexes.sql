-- +goose Up
-- +goose StatementBegin

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON books USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_author_trgm ON books USING gin (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_isbn_trgm ON books USING gin (isbn gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_student_id_trgm ON students USING gin (student_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_status_created ON books (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_category_status_created ON books (category_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_students_status_grade_created ON students (status, grade_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_grade_section_status ON students (grade_level, section, status);

CREATE INDEX IF NOT EXISTS idx_transactions_active_due_student ON transactions (status, due_date, student_id)
    WHERE status IN ('borrowed', 'overdue');
CREATE INDEX IF NOT EXISTS idx_transactions_student_status_due ON transactions (student_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_fines_student_status_created ON fines (student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fines_pending_student_created ON fines (student_id, created_at DESC)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_book_copies_available ON book_copies (book_id, copy_number)
    WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, created_at DESC)
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_requests_pending ON book_requests (request_date DESC)
    WHERE status = 'pending';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_requests_pending;
DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_book_copies_available;
DROP INDEX IF EXISTS idx_fines_pending_student_created;
DROP INDEX IF EXISTS idx_fines_student_status_created;
DROP INDEX IF EXISTS idx_transactions_student_status_due;
DROP INDEX IF EXISTS idx_transactions_active_due_student;
DROP INDEX IF EXISTS idx_students_grade_section_status;
DROP INDEX IF EXISTS idx_students_status_grade_created;
DROP INDEX IF EXISTS idx_books_category_status_created;
DROP INDEX IF EXISTS idx_books_status_created;
DROP INDEX IF EXISTS idx_students_student_id_trgm;
DROP INDEX IF EXISTS idx_users_name_trgm;
DROP INDEX IF EXISTS idx_books_isbn_trgm;
DROP INDEX IF EXISTS idx_books_author_trgm;
DROP INDEX IF EXISTS idx_books_title_trgm;

DROP EXTENSION IF EXISTS pg_trgm;

-- +goose StatementEnd
