-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS favorite_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, book_id)
);

CREATE INDEX idx_favorite_books_student_id ON favorite_books(student_id);
CREATE INDEX idx_favorite_books_book_id ON favorite_books(book_id);

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student achievements junction table
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, achievement_id)
);

CREATE INDEX idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX idx_student_achievements_achievement_id ON student_achievements(achievement_id);

INSERT INTO achievements (code, name, description, icon, color, requirement_type, requirement_value) VALUES
('first_book', 'First Book', 'Borrowed your first book from the library', 'book-open', 'blue', 'books_borrowed', 1),
('bookworm', 'Bookworm', 'Read 10 or more books', 'book-open', 'green', 'books_read', 10),
('speed_reader', 'Speed Reader', 'Returned a book within 3 days', 'zap', 'yellow', 'quick_return', 1),
('no_fines_30', 'Perfect Record', '30 days without any fines', 'shield', 'green', 'no_fines_days', 30),
('genre_explorer', 'Genre Explorer', 'Read books from 5 different categories', 'compass', 'purple', 'categories_read', 5),
('favorites_collector', 'Favorites Collector', 'Added 5 books to your favorites', 'heart', 'red', 'favorites_added', 5)
ON CONFLICT (code) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS student_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS favorite_books;

-- +goose StatementEnd
