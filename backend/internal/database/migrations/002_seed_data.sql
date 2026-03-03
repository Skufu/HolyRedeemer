-- +goose Up

-- Categories
INSERT INTO categories (id, name, description, color_code) VALUES
    ('d0000001-0000-0000-0000-000000000001', 'Fiction', 'Novels, short stories, and literary works', '#3B82F6'),
    ('d0000001-0000-0000-0000-000000000002', 'Non-Fiction', 'Factual books, biographies, essays', '#10B981'),
    ('d0000001-0000-0000-0000-000000000003', 'Reference', 'Dictionaries, encyclopedias, atlases', '#F59E0B'),
    ('d0000001-0000-0000-0000-000000000004', 'Science', 'Science and technology books', '#8B5CF6'),
    ('d0000001-0000-0000-0000-000000000005', 'History', 'Historical books and accounts', '#EF4444'),
    ('d0000001-0000-0000-0000-000000000006', 'Mathematics', 'Math textbooks and workbooks', '#06B6D4'),
    ('d0000001-0000-0000-0000-000000000007', 'Literature', 'Classic and modern literature', '#EC4899'),
    ('d0000001-0000-0000-0000-000000000008', 'Biography', 'Biographical works', '#6366F1'),
    ('d0000001-0000-0000-0000-000000000009', 'Textbook', 'Educational textbooks', '#14B8A6'),
    ('d0000001-0000-0000-0000-000000000010', 'Periodical', 'Magazines, journals, newspapers', '#84CC16');

-- Library settings
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

-- Users (admin, librarians, students)
INSERT INTO users (id, username, password_hash, role, email, name) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin', '$2a$10$o6Vuflqw9E5yELbLkgOw8.6B4qKkxLOQJpYwGuosB4aAh7SngQ0zC', 'super_admin', 'admin@holyredeemer.edu.ph', 'Dr. Maria Santos'),
    ('a0000000-0000-0000-0000-000000000002', 'librarian', '$2a$10$2OZujduLf1qRTOqcenVQ6ek.VlaRzF/ZyW3kDEI9oCCIa65AxyeY2', 'librarian', 'areyes@holyredeemer.edu.ph', 'Ms. Ana Reyes'),
    ('a0000000-0000-0000-0000-000000000010', 'librarian2', '$2a$10$2OZujduLf1qRTOqcenVQ6ek.VlaRzF/ZyW3kDEI9oCCIa65AxyeY2', 'librarian', 'jcruz@holyredeemer.edu.ph', 'Mr. Jose Cruz'),
    ('a0000000-0000-0000-0000-000000000003', 'student001', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'jdelacruz@student.holyredeemer.edu.ph', 'Juan Dela Cruz'),
    ('a0000000-0000-0000-0000-000000000004', 'student002', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'mgarcia@student.holyredeemer.edu.ph', 'Maria Garcia'),
    ('a0000000-0000-0000-0000-000000000005', 'student003', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'preyes@student.holyredeemer.edu.ph', 'Paolo Reyes'),
    ('a0000000-0000-0000-0000-000000000006', 'student004', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'asantos@student.holyredeemer.edu.ph', 'Angela Santos'),
    ('a0000000-0000-0000-0000-000000000007', 'student005', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'rmendoza@student.holyredeemer.edu.ph', 'Roberto Mendoza'),
    ('a0000000-0000-0000-0000-000000000008', 'student006', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'crivera@student.holyredeemer.edu.ph', 'Carmen Rivera'),
    ('a0000000-0000-0000-0000-000000000009', 'student007', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'dcastro@student.holyredeemer.edu.ph', 'Daniel Castro'),
    ('a0000000-0000-0000-0000-000000000012', 'student008', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'lflores@student.holyredeemer.edu.ph', 'Lucia Flores'),
    ('a0000000-0000-0000-0000-000000000013', 'student009', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'mbautista@student.holyredeemer.edu.ph', 'Miguel Bautista'),
    ('a0000000-0000-0000-0000-000000000014', 'student010', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'sramos@student.holyredeemer.edu.ph', 'Sofia Ramos'),
    ('a0000000-0000-0000-0000-000000000015', 'student011', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'atorrejon@student.holyredeemer.edu.ph', 'Antonio Torrejon'),
    ('a0000000-0000-0000-0000-000000000016', 'student012', '$2a$10$08loBCgmLNf14zUQIen8QeWbswqZNGOc4z/zZF5oCX7ekXQ/eJ4pm', 'student', 'igomez@student.holyredeemer.edu.ph', 'Isabella Gomez');

-- Librarians
INSERT INTO librarians (id, user_id, employee_id, name, email, department) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EMP-001', 'Dr. Maria Santos', 'admin@holyredeemer.edu.ph', 'Administration'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'EMP-010', 'Ms. Ana Reyes', 'areyes@holyredeemer.edu.ph', 'Library'),
    ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 'EMP-011', 'Mr. Jose Cruz', 'jcruz@holyredeemer.edu.ph', 'Library');

-- Students
INSERT INTO students (id, user_id, student_id, grade_level, section, rfid_code, guardian_name, guardian_contact, status) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', '2024-0001', 7, 'St. Augustine', 'RFID-001-2024', 'Pedro Dela Cruz', '09171234567', 'active'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', '2024-0002', 7, 'St. Augustine', 'RFID-002-2024', 'Rosa Garcia', '09181234568', 'active'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', '2024-0003', 8, 'St. Peter', 'RFID-003-2024', 'Manuel Reyes', '09191234569', 'active'),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', '2024-0004', 8, 'St. Peter', 'RFID-004-2024', 'Linda Santos', '09201234570', 'active'),
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', '2024-0005', 9, 'St. Francis', 'RFID-005-2024', 'Carlos Mendoza', '09211234571', 'active'),
    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000008', '2024-0006', 9, 'St. Francis', 'RFID-006-2024', 'Elena Rivera', '09221234572', 'active'),
    ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000009', '2024-0007', 10, 'St. Therese', 'RFID-007-2024', 'Roberto Castro', '09231234573', 'active'),
    ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000012', '2024-0008', 10, 'St. Joseph', 'RFID-008-2024', 'Ana Flores', '09241234574', 'active'),
    ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000013', '2024-0009', 11, 'STEM', 'RFID-009-2024', 'Marco Bautista', '09251234575', 'active'),
    ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000014', '2024-0010', 11, 'ABM', 'RFID-010-2024', 'Teresa Ramos', '09261234576', 'active'),
    ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000015', '2024-0011', 12, 'HUMSS', 'RFID-011-2024', 'Jose Torrejon Sr.', '09271234577', 'active'),
    ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000016', '2024-0012', 12, 'ABM', 'RFID-012-2024', 'Carmen Gomez', '09281234578', 'active');

-- Books
INSERT INTO books (id, isbn, title, author, category_id, publisher, publication_year, description, shelf_location, replacement_cost) VALUES
    ('e0000000-0000-0000-0000-000000000001', '978-9712723516', 'Noli Me Tangere', 'Jose Rizal', 'd0000001-0000-0000-0000-000000000001', 'Vibal Publishing', 2020, 'A classic Filipino novel.', 'A-001', 450.00),
    ('e0000000-0000-0000-0000-000000000002', '978-9712723523', 'El Filibusterismo', 'Jose Rizal', 'd0000001-0000-0000-0000-000000000001', 'Vibal Publishing', 2020, 'The sequel to Noli Me Tangere.', 'A-002', 450.00),
    ('e0000000-0000-0000-0000-000000000003', '978-0743273565', 'The Great Gatsby', 'F. Scott Fitzgerald', 'd0000001-0000-0000-0000-000000000001', 'Scribner', 1925, 'A critique of the American Dream.', 'A-003', 320.00),
    ('e0000000-0000-0000-0000-000000000004', '978-0451524935', '1984', 'George Orwell', 'd0000001-0000-0000-0000-000000000001', 'Signet Classic', 1949, 'A dystopian novel.', 'A-004', 380.00),
    ('e0000000-0000-0000-0000-000000000005', '978-0061120084', 'To Kill a Mockingbird', 'Harper Lee', 'd0000001-0000-0000-0000-000000000001', 'Harper Perennial', 1960, 'A novel about racial injustice.', 'A-005', 350.00),
    ('e0000000-0000-0000-0000-000000000006', '978-0747532743', 'Harry Potter', 'J.K. Rowling', 'd0000001-0000-0000-0000-000000000001', 'Bloomsbury', 1997, 'A fantasy series about a young wizard.', 'A-006', 520.00),
    ('e0000000-0000-0000-0000-000000000007', '978-0140283297', 'The Diary of a Young Girl', 'Anne Frank', 'd0000001-0000-0000-0000-000000000002', 'Penguin Books', 1995, 'A diary during World War II.', 'B-001', 290.00),
    ('e0000000-0000-0000-0000-000000000008', '978-1400034710', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'd0000001-0000-0000-0000-000000000002', 'FSG', 2011, 'Two systems of thinking.', 'B-002', 580.00),
    ('e0000000-0000-0000-0000-000000000009', '978-0199571127', 'Oxford Dictionary of English', 'Oxford University Press', 'd0000001-0000-0000-0000-000000000003', 'Oxford', 2023, 'A comprehensive dictionary.', 'C-001', 1850.00),
    ('e0000000-0000-0000-0000-000000000010', '978-0393355472', 'A Brief History of Time', 'Stephen Hawking', 'd0000001-0000-0000-0000-000000000004', 'Bantam', 1988, 'Introduction to cosmology.', 'D-001', 490.00),
    ('e0000000-0000-0000-0000-000000000011', '978-0143036571', 'Guns, Germs, and Steel', 'Jared Diamond', 'd0000001-0000-0000-0000-000000000005', 'Norton', 1997, 'History of human societies.', 'E-001', 550.00),
    ('e0000000-0000-0000-0000-000000000012', '978-1451669439', 'Philippine History', 'Teodoro Agoncillo', 'd0000001-0000-0000-0000-000000000005', 'UP Press', 1990, 'Comprehensive history of Philippines.', 'E-002', 520.00),
    ('e0000000-0000-0000-0000-000000000013', '978-0062316097', 'The Music of the Primes', 'Marcus du Sautoy', 'd0000001-0000-0000-0000-000000000006', 'Harper', 2003, 'Exploration of prime numbers.', 'F-001', 420.00),
    ('e0000000-0000-0000-0000-000000000014', '978-0142437247', 'Wuthering Heights', 'Emily Bronte', 'd0000001-0000-0000-0000-000000000007', 'Penguin', 1847, 'A story of love and revenge.', 'G-001', 340.00),
    ('e0000000-0000-0000-0000-000000000015', '978-0141439663', 'Pride and Prejudice', 'Jane Austen', 'd0000001-0000-0000-0000-000000000007', 'Penguin', 1813, 'A romantic novel.', 'G-002', 320.00),
    ('e0000000-0000-0000-0000-000000000016', '978-0060927353', 'Long Walk to Freedom', 'Nelson Mandela', 'd0000001-0000-0000-0000-000000000008', 'Back Bay', 1994, 'Autobiography of Mandela.', 'H-001', 460.00),
    ('e0000000-0000-0000-0000-000000000017', '978-1337614088', 'Biology: Concepts', 'Neil Campbell', 'd0000001-0000-0000-0000-000000000009', 'Cengage', 2020, 'Biology textbook.', 'I-001', 1250.00),
    ('e0000000-0000-0000-0000-000000000018', '978-1337690986', 'Chemistry: Central Science', 'Theodore Brown', 'd0000001-0000-0000-0000-000000000009', 'Pearson', 2021, 'Chemistry textbook.', 'I-002', 1350.00);

-- Book copies
INSERT INTO book_copies (id, book_id, copy_number, qr_code, status, condition, acquisition_date) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 1, 'HR-00000001-C1', 'available', 'good', CURRENT_DATE - 365),
    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 2, 'HR-00000001-C2', 'available', 'good', CURRENT_DATE - 365),
    ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 1, 'HR-00000002-C1', 'borrowed', 'good', CURRENT_DATE - 300),
    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 2, 'HR-00000002-C2', 'available', 'good', CURRENT_DATE - 300),
    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003', 1, 'HR-00000003-C1', 'borrowed', 'excellent', CURRENT_DATE - 200),
    ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004', 1, 'HR-00000004-C1', 'available', 'good', CURRENT_DATE - 180),
    ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000005', 1, 'HR-00000005-C1', 'borrowed', 'good', CURRENT_DATE - 150),
    ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000006', 1, 'HR-00000006-C1', 'available', 'fair', CURRENT_DATE - 400),
    ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000006', 2, 'HR-00000006-C2', 'borrowed', 'good', CURRENT_DATE - 400),
    ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000007', 1, 'HR-00000007-C1', 'available', 'good', CURRENT_DATE - 250),
    ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000008', 1, 'HR-00000008-C1', 'available', 'good', CURRENT_DATE - 100),
    ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000009', 1, 'HR-00000009-C1', 'available', 'excellent', CURRENT_DATE - 50),
    ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000010', 1, 'HR-00000010-C1', 'lost', 'good', CURRENT_DATE - 500),
    ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000011', 1, 'HR-00000011-C1', 'available', 'good', CURRENT_DATE - 350),
    ('f0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000012', 1, 'HR-00000012-C1', 'available', 'good', CURRENT_DATE - 280),
    ('f0000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000013', 1, 'HR-00000013-C1', 'available', 'good', CURRENT_DATE - 120),
    ('f0000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000014', 1, 'HR-00000014-C1', 'available', 'good', CURRENT_DATE - 600),
    ('f0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000015', 1, 'HR-00000015-C1', 'available', 'good', CURRENT_DATE - 550),
    ('f0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000016', 1, 'HR-00000016-C1', 'available', 'good', CURRENT_DATE - 450),
    ('f0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000017', 1, 'HR-00000017-C1', 'available', 'good', CURRENT_DATE - 90),
    ('f0000000-0000-0000-0000-000000000021', 'e0000000-0000-0000-0000-000000000018', 1, 'HR-00000018-C1', 'available', 'good', CURRENT_DATE - 80);

-- Transactions: Active borrows
INSERT INTO transactions (id, student_id, copy_id, librarian_id, checkout_date, due_date, status, checkout_method) VALUES
    ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_DATE + 4, 'borrowed', 'counter'),
    ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_DATE + 2, 'borrowed', 'counter'),
    ('10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_DATE + 5, 'borrowed', 'self_service'),
    ('10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_DATE + 1, 'borrowed', 'counter');

-- Transactions: Returned
INSERT INTO transactions (id, student_id, copy_id, librarian_id, checkout_date, due_date, return_date, returned_by, status, checkout_method, return_condition) VALUES
    ('10000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_DATE - 13, CURRENT_TIMESTAMP - INTERVAL '14 days', 'b0000000-0000-0000-0000-000000000002', 'returned', 'counter', 'good'),
    ('10000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_DATE - 18, CURRENT_TIMESTAMP - INTERVAL '19 days', 'b0000000-0000-0000-0000-000000000010', 'returned', 'counter', 'excellent'),
    ('10000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_DATE - 23, CURRENT_TIMESTAMP - INTERVAL '24 days', 'b0000000-0000-0000-0000-000000000002', 'returned', 'counter', 'good'),
    ('10000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '35 days', CURRENT_DATE - 28, CURRENT_TIMESTAMP - INTERVAL '29 days', 'b0000000-0000-0000-0000-000000000010', 'returned', 'counter', 'fair'),
    ('10000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_DATE - 33, CURRENT_TIMESTAMP - INTERVAL '34 days', 'b0000000-0000-0000-0000-000000000002', 'returned', 'self_service', 'good'),
    ('10000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_DATE - 38, CURRENT_TIMESTAMP - INTERVAL '39 days', 'b0000000-0000-0000-0000-000000000002', 'returned', 'counter', 'good');

-- Transactions: Overdue
INSERT INTO transactions (id, student_id, copy_id, librarian_id, checkout_date, due_date, status, checkout_method, notes) VALUES
    ('10000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_DATE - 8, 'overdue', 'counter', 'Student notified'),
    ('10000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000010', CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_DATE - 11, 'overdue', 'counter', 'Second notice sent');

-- Transactions: Lost
INSERT INTO transactions (id, student_id, copy_id, librarian_id, checkout_date, due_date, status, checkout_method, notes) VALUES
    ('10000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '50 days', CURRENT_DATE - 43, 'lost', 'counter', 'Student reported book lost');

-- Fines
INSERT INTO fines (id, transaction_id, student_id, amount, fine_type, description, status) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000011', 40.00, 'overdue', 'Overdue: 8 days late', 'pending'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000012', 55.00, 'overdue', 'Overdue: 11 days late', 'partial'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001', 490.00, 'lost', 'Lost book replacement', 'pending');

-- Payments
INSERT INTO payments (id, fine_id, student_id, amount, payment_method, reference_number, processed_by, payment_date, notes) VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000012', 25.00, 'gcash', 'GC-20260120-001', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Partial payment via GCash');

-- Book requests
INSERT INTO book_requests (id, student_id, book_id, request_type, status, request_date, notes, processed_by, processed_at) VALUES
    ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'reservation', 'pending', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Would like to reserve', NULL, NULL),
    ('40000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'reservation', 'approved', CURRENT_TIMESTAMP - INTERVAL '5 days', 'Reserved for next week', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('40000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000010', 'request', 'pending', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Need for research', NULL, NULL),
    ('40000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000012', 'reservation', 'fulfilled', CURRENT_TIMESTAMP - INTERVAL '10 days', 'Fulfilled', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '8 days');

-- Notifications
INSERT INTO notifications (id, user_id, type, title, message, is_read, reference_type, reference_id, created_at) VALUES
    ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'due_reminder', 'Book Due Soon', 'Your borrowed book is due soon.', false, 'transaction', '10000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000015', 'overdue', 'Overdue Notice', 'Your book is overdue. Please return immediately.', false, 'transaction', '10000000-0000-0000-0000-000000000011', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('50000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000016', 'fine', 'Fine Notice', 'You have an outstanding fine of P55.00.', false, 'fine', '20000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('50000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'request_update', 'Reservation Approved', 'Your book reservation has been approved.', true, 'book_request', '40000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('50000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'system', 'System Update', 'Library system updated to v2.1.', true, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Audit logs
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_values, ip_address, user_agent, created_at) VALUES
    ('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'login', 'user', 'a0000000-0000-0000-0000-000000000002', NULL, '192.168.1.50', 'Mozilla/5.0', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    ('60000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'checkout', 'transaction', '10000000-0000-0000-0000-000000000001', '{"student_id": "c0000000-0000-0000-0000-000000000001"}', '192.168.1.50', 'Mozilla/5.0', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('60000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'return', 'transaction', '10000000-0000-0000-0000-000000000005', '{"return_condition": "good"}', '192.168.1.50', 'Mozilla/5.0', CURRENT_TIMESTAMP - INTERVAL '14 days'),
    ('60000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'fine_created', 'fine', '20000000-0000-0000-0000-000000000001', '{"amount": 40.00}', '192.168.1.50', 'Mozilla/5.0', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('60000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'create', 'book', 'e0000000-0000-0000-0000-000000000001', '{"title": "Noli Me Tangere"}', '192.168.1.10', 'Mozilla/5.0', CURRENT_TIMESTAMP - INTERVAL '365 days');

-- +goose Down
DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM book_requests;
DELETE FROM payments;
DELETE FROM fines;
DELETE FROM transactions;
DELETE FROM book_copies;
DELETE FROM books;
DELETE FROM students;
DELETE FROM librarians;
DELETE FROM users;
DELETE FROM library_settings;
DELETE FROM categories;
