-- +goose Up
-- +goose StatementBegin

-- Default categories matching frontend mockData
INSERT INTO categories (name, description, color_code) VALUES
    ('Fiction', 'Novels, short stories, and literary works', '#3B82F6'),
    ('Non-Fiction', 'Factual books, biographies, essays', '#10B981'),
    ('Reference', 'Dictionaries, encyclopedias, atlases', '#F59E0B'),
    ('Science', 'Science and technology books', '#8B5CF6'),
    ('History', 'Historical books and accounts', '#EF4444'),
    ('Mathematics', 'Math textbooks and workbooks', '#06B6D4'),
    ('Literature', 'Classic and modern literature', '#EC4899'),
    ('Biography', 'Biographical works', '#6366F1'),
    ('Textbook', 'Educational textbooks', '#14B8A6'),
    ('Periodical', 'Magazines, journals, newspapers', '#84CC16');

-- Default library settings
INSERT INTO library_settings (key, value, description, category) VALUES
    ('loan_duration_days', '7', 'Default number of days for book loans', 'borrowing'),
    ('max_books_per_student', '3', 'Maximum books a student can borrow at once', 'borrowing'),
    ('max_renewals', '2', 'Maximum times a book can be renewed', 'borrowing'),
    ('fine_per_day', '5.00', 'Fine amount per day for overdue books (PHP)', 'fines'),
    ('fine_grace_period_days', '1', 'Grace period before fines start accumulating', 'fines'),
    ('max_fine_cap', '200.00', 'Maximum fine amount per book (PHP)', 'fines'),
    ('fine_block_threshold', '100.00', 'Total fine amount that blocks new borrowing (PHP)', 'fines'),
    ('school_year', '2024-2025', 'Current school year', 'general'),
    ('library_name', 'Holy Redeemer School Library', 'Library display name', 'general'),
    ('reading_quota_per_year', '12', 'Required books per student per school year', 'quota');

-- Create super admin user (password: admin123)
INSERT INTO users (id, username, password_hash, role, email, name) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin', '$2a$10$o6Vuflqw9E5yELbLkgOw8.6B4qKkxLOQJpYwGuosB4aAh7SngQ0zC', 'admin', 'admin@holyredeemer.edu.ph', 'Dr. Maria Santos');

-- Create admin staff record
INSERT INTO librarians (id, user_id, employee_id, name, email, department) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EMP-001', 'Dr. Maria Santos', 'admin@holyredeemer.edu.ph', 'Administration');

-- Create librarian user (password: lib123)
INSERT INTO users (id, username, password_hash, role, email, name) VALUES
    ('a0000000-0000-0000-0000-000000000002', 'librarian', '$2a$10$2OZujduLf1qRTOqcenVQ6ek.VlaRzF/ZyW3kDEI9oCCIa65AxyeY2', 'librarian', 'areyes@holyredeemer.edu.ph', 'Ms. Ana Reyes');

-- Create librarian staff record
INSERT INTO librarians (id, user_id, employee_id, name, email, department) VALUES
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'EMP-010', 'Ms. Ana Reyes', 'areyes@holyredeemer.edu.ph', 'Library');

-- Create student user (password: student123)
INSERT INTO users (id, username, password_hash, role, email, name) VALUES
    ('a0000000-0000-0000-0000-000000000003', 'student001', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'jdelacruz@student.holyredeemer.edu.ph', 'Juan Dela Cruz');

-- Create student record
INSERT INTO students (id, user_id, student_id, grade_level, section, rfid_code, guardian_name, guardian_contact, status) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', '2024-0001', 12, 'St. Augustine', 'RFID-001-2024', 'Pedro Dela Cruz', '09171234567', 'active');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM students WHERE id = 'c0000000-0000-0000-0000-000000000001';
DELETE FROM librarians WHERE id IN ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002');
DELETE FROM users WHERE id IN ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003');
DELETE FROM library_settings;
DELETE FROM categories;
-- +goose StatementEnd
