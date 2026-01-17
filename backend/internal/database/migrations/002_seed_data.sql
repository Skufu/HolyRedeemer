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

-- Get category IDs for book insertion
WITH cat_ids AS (
    SELECT id, name FROM categories
),
-- Insert books
book_inserts AS (
    INSERT INTO books (id, isbn, title, author, category_id, publisher, publication_year, description, shelf_location, replacement_cost)
    SELECT
        gen_random_uuid(),
        b.isbn,
        b.title,
        b.author,
        cat.id,
        b.publisher,
        b.publication_year,
        b.description,
        b.shelf_location,
        b.replacement_cost
    FROM cat_ids cat
    CROSS JOIN (
        VALUES
            -- Fiction (7 books)
            ('978-9712723516', 'Noli Me Tangere', 'Jose Rizal', 'Fiction', 'Vibal Publishing', 2020, 'A classic Filipino novel exposing abuses of Spanish colonial rule.', 'A-001', 450.00),
            ('978-9712723523', 'El Filibusterismo', 'Jose Rizal', 'Fiction', 'Vibal Publishing', 2020, 'The sequel to Noli Me Tangere, depicting revolution against colonial power.', 'A-002', 450.00),
            ('978-0743273565', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', 'Scribner', 1925, 'A critique of American Dream set in the Jazz Age.', 'A-003', 320.00),
            ('978-0451524935', '1984', 'George Orwell', 'Fiction', 'Signet Classic', 1949, 'A dystopian novel about totalitarianism and surveillance.', 'A-004', 380.00),
            ('978-0061120084', 'To Kill a Mockingbird', 'Harper Lee', 'Fiction', 'Harper Perennial', 1960, 'A novel about racial injustice in the American South.', 'A-005', 350.00),
            ('978-0747532743', 'Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', 'Fiction', 'Bloomsbury', 1997, 'The first book in the beloved fantasy series about a young wizard.', 'A-006', 520.00),
            ('978-0316769488', 'The Catcher in the Rye', 'J.D. Salinger', 'Fiction', 'Little, Brown', 1951, 'A controversial novel about teenage alienation and loss.', 'A-007', 330.00),
            -- Non-Fiction (4 books)
            ('978-0140283297', 'The Diary of a Young Girl', 'Anne Frank', 'Non-Fiction', 'Penguin Books', 1995, 'A Jewish girl''s diary during World War II.', 'B-001', 290.00),
            ('978-1400034710', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Non-Fiction', 'Farrar, Straus and Giroux', 2011, 'A psychologist explores the two systems of thinking.', 'B-002', 580.00),
            ('978-1451648539', 'Steve Jobs', 'Walter Isaacson', 'Non-Fiction', 'Simon & Schuster', 2011, 'The definitive biography of Apple co-founder Steve Jobs.', 'B-003', 620.00),
            ('978-0385348174', 'The 7 Habits of Highly Effective People', 'Stephen Covey', 'Non-Fiction', 'Simon & Schuster', 1989, 'A self-help book about personal and professional effectiveness.', 'B-004', 470.00),
            -- Reference (4 books)
            ('978-0199571127', 'Oxford Dictionary of English', 'Oxford University Press', 'Reference', 'Oxford University Press', 2023, 'A comprehensive English language dictionary.', 'C-001', 1850.00),
            ('978-0789493870', 'World Atlas', 'DK Publishing', 'Reference', 'DK Publishing', 2022, 'A detailed geographical atlas of world.', 'C-002', 1200.00),
            ('978-1426216891', 'National Geographic Visual History', 'National Geographic', 'Reference', 'National Geographic', 2021, 'A visual encyclopedia of world history.', 'C-003', 2100.00),
            ('978-1405373629', 'Encyclopedia of Science', 'DK Publishing', 'Reference', 'DK Publishing', 2020, 'A comprehensive science reference book.', 'C-004', 1650.00),
            -- Science (4 books)
            ('978-0716723420', 'The Selfish Gene', 'Richard Dawkins', 'Science', 'Oxford University Press', 1976, 'A book on evolution from the gene''s perspective.', 'D-001', 540.00),
            ('978-0393355472', 'A Brief History of Time', 'Stephen Hawking', 'Science', 'Bantam Books', 1988, 'An accessible introduction to cosmology.', 'D-002', 490.00),
            ('978-0307741803', 'Cosmos', 'Carl Sagan', 'Science', 'Ballantine Books', 1980, 'A journey through the universe and human civilization.', 'D-003', 560.00),
            ('978-0393334163', 'The Double Helix', 'James Watson', 'Science', 'Touchstone', 1968, 'A personal account of the discovery of DNA structure.', 'D-004', 410.00),
            -- History (5 books)
            ('978-0143036571', 'Guns, Germs, and Steel', 'Jared Diamond', 'History', 'W. W. Norton & Company', 1997, 'A comprehensive history of human societies.', 'E-001', 550.00),
            ('978-0394745186', 'A People''s History of United States', 'Howard Zinn', 'History', 'Harper Perennial', 1980, 'American history from the perspective of ordinary people.', 'E-002', 530.00),
            ('978-1400032069', 'The Silk Roads', 'Peter Frankopan', 'History', 'Bloomsbury Press', 2015, 'A new history of the world through Eastern trade routes.', 'E-003', 680.00),
            ('978-0395959322', '1776', 'David McCullough', 'History', 'Simon & Schuster', 2005, 'The story of America''s founding year.', 'E-004', 460.00),
            ('978-1451669439', 'Philippine History', 'Teodoro Agoncillo', 'History', 'University of the Philippines Press', 1990, 'A comprehensive history of Philippines.', 'E-005', 520.00),
            -- Mathematics (5 books)
            ('978-0062316097', 'The Music of the Primes', 'Marcus du Sautoy', 'Mathematics', 'Harper Perennial', 2003, 'An exploration of prime numbers.', 'F-001', 420.00),
            ('978-0399578508', 'Infinite Powers', 'Steven Strogatz', 'Mathematics', 'Houghton Mifflin', 2019, 'How calculus shaped the modern world.', 'F-002', 510.00),
            ('978-0199658310', 'The Oxford Handbook of Mathematics', 'Roger Astley', 'Mathematics', 'Oxford University Press', 2018, 'A comprehensive mathematics reference.', 'F-003', 1750.00),
            ('978-1584885113', 'Introduction to Linear Algebra', 'Gilbert Strang', 'Mathematics', 'Wellesley-Cambridge Press', 2016, 'A textbook on linear algebra.', 'F-004', 890.00),
            ('978-0385371992', 'Algebra for College Students', 'Robert Blitzer', 'Mathematics', 'Pearson', 2021, 'A comprehensive algebra textbook.', 'F-005', 950.00),
            -- Literature (6 books)
            ('978-0142437247', 'Wuthering Heights', 'Emily Brontë', 'Literature', 'Penguin Classics', 1847, 'A passionate story of love and revenge on the moors.', 'G-001', 340.00),
            ('978-0141439663', 'Pride and Prejudice', 'Jane Austen', 'Literature', 'Penguin Classics', 1813, 'A romantic novel of manners and marriage.', 'G-002', 320.00),
            ('978-0743477109', 'Romeo and Juliet', 'William Shakespeare', 'Literature', 'Washington Square Press', 1597, 'The tragic tale of star-crossed lovers.', 'G-003', 280.00),
            ('978-0679736459', 'Hamlet', 'William Shakespeare', 'Literature', 'Vintage', 1998, 'A tragedy about a Danish prince seeking revenge.', 'G-004', 300.00),
            ('978-0140283358', 'The Canterbury Tales', 'Geoffrey Chaucer', 'Literature', 'Penguin Classics', 1400, 'A collection of stories from medieval pilgrims.', 'G-005', 380.00),
            ('978-0451527737', 'Don Quixote', 'Miguel de Cervantes', 'Literature', 'Signet Classic', 1605, 'The story of an aging knight''s adventures.', 'G-006', 410.00),
            -- Biography (4 books)
            ('978-0140283334', 'The Story of My Life', 'Helen Keller', 'Biography', 'Penguin Classics', 1903, 'An inspiring autobiography of Helen Keller.', 'H-001', 290.00),
            ('978-0060927353', 'Long Walk to Freedom', 'Nelson Mandela', 'Biography', 'Back Bay Books', 1994, 'The autobiography of Nelson Mandela.', 'H-002', 460.00),
            ('978-0743273225', 'Einstein: His Life and Universe', 'Walter Isaacson', 'Biography', 'Simon & Schuster', 2007, 'A biography of Albert Einstein.', 'H-003', 590.00),
            ('978-0553447680', 'Becoming', 'Michelle Obama', 'Biography', 'Crown Publishing', 2018, 'The memoir of former First Lady Michelle Obama.', 'H-004', 540.00),
            -- Textbook (5 books)
            ('978-1337614088', 'Biology: Concepts and Connections', 'Neil Campbell', 'Textbook', 'Cengage Learning', 2020, 'A comprehensive biology textbook.', 'I-001', 1250.00),
            ('978-1337690986', 'Chemistry: The Central Science', 'Theodore Brown', 'Textbook', 'Pearson', 2021, 'A foundational chemistry textbook.', 'I-002', 1350.00),
            ('978-0135189405', 'Physics for Scientists and Engineers', 'Raymond Serway', 'Textbook', 'Cengage Learning', 2019, 'A comprehensive physics textbook.', 'I-003', 1450.00),
            ('978-0321982384', 'Calculus: Early Transcendentals', 'James Stewart', 'Textbook', 'Cengage Learning', 2020, 'A standard calculus textbook.', 'I-004', 1380.00),
            ('978-0321973610', 'Algebra and Trigonometry', 'Robert Sullivan', 'Textbook', 'Pearson', 2021, 'A mathematics textbook covering algebra and trigonometry.', 'I-005', 1180.00),
            -- Periodical (3 books)
            ('978-0025347102', 'TIME Magazine Annual Collection', 'TIME Inc.', 'Periodical', 'Time Inc.', 2023, 'Collection of TIME magazine articles from the year.', 'J-001', 850.00),
            ('978-0060926904', 'National Geographic Magazine Collection', 'National Geographic', 'Periodical', 'National Geographic', 2023, 'A year of National Geographic issues.', 'J-002', 1200.00),
            ('978-0061228524', 'Scientific American Annual', 'Scientific American', 'Periodical', 'Nature America', 2023, 'A collection of science articles.', 'J-003', 920.00)
    ) AS b(isbn, title, author, category_name, publisher, publication_year, description, shelf_location, replacement_cost)
    WHERE cat.name = b.category_name
    RETURNING id, title, isbn
),
-- Insert book copies
books_with_copies AS (
    SELECT
        id,
        title,
        isbn,
        CASE
            WHEN isbn IN ('978-0199571127', '978-0789493870', '978-1426216891', '978-1405373629', '978-0199658310', '978-1337614088', '978-1337690986', '978-0135189405', '978-0321982384', '978-0321973610')
            THEN 2  -- Reference and textbooks: 2 copies
            WHEN isbn IN ('978-9712723516', '978-9712723523', '978-0747532743', '978-0061120084')
            THEN 4  -- Popular Filipino and popular fiction: 4 copies
            ELSE 3  -- Standard: 3 copies
        END as num_copies
    FROM book_inserts
)
INSERT INTO book_copies (book_id, copy_number, qr_code, status, condition, acquisition_date)
SELECT
    bwc.id,
    n,
    'HR-' || RIGHT(bwc.id::text, 8) || '-C' || n AS qr_code,
    'available',
    'good',
    CURRENT_DATE - (FLOOR(RANDOM() * 730) * INTERVAL '1 day')
FROM books_with_copies bwc
CROSS JOIN generate_series(1, bwc.num_copies) AS n
ORDER BY bwc.title, n;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM book_copies WHERE book_id IN (
    SELECT id FROM books WHERE isbn IN (
        '978-9712723516', '978-9712723523', '978-0743273565', '978-0451524935', '978-0061120084',
        '978-0747532743', '978-0316769488', '978-0140283297', '978-1400034710', '978-1451648539',
        '978-0385348174', '978-0199571127', '978-0789493870', '978-1426216891', '978-1405373629',
        '978-0716723420', '978-0393355472', '978-0307741803', '978-0393334163', '978-0143036571',
        '978-0394745186', '978-1400032069', '978-0395959322', '978-1451669439', '978-0062316097',
        '978-0399578508', '978-0199658310', '978-1584885113', '978-0385371992', '978-0142437247',
        '978-0141439663', '978-0743477109', '978-0679736459', '978-0140283358', '978-0451527737',
        '978-0140283334', '978-0060927353', '978-0743273225', '978-0553447680', '978-1337614088',
        '978-1337690986', '978-0135189405', '978-0321982384', '978-0321973610', '978-0025347102',
        '978-0060926904', '978-0061228524'
    )
);
DELETE FROM books WHERE isbn IN (
    '978-9712723516', '978-9712723523', '978-0743273565', '978-0451524935', '978-0061120084',
    '978-0747532743', '978-0316769488', '978-0140283297', '978-1400034710', '978-1451648539',
    '978-0385348174', '978-0199571127', '978-0789493870', '978-1426216891', '978-1405373629',
    '978-0716723420', '978-0393355472', '978-0307741803', '978-0393334163', '978-0143036571',
    '978-0394745186', '978-1400032069', '978-0395959322', '978-1451669439', '978-0062316097',
    '978-0399578508', '978-0199658310', '978-1584885113', '978-0385371992', '978-0142437247',
    '978-0141439663', '978-0743477109', '978-0679736459', '978-0140283358', '978-0451527737',
    '978-0140283334', '978-0060927353', '978-0743273225', '978-0553447680', '978-1337614088',
    '978-1337690986', '978-0135189405', '978-0321982384', '978-0321973610', '978-0025347102',
    '978-0060926904', '978-0061228524'
);
DELETE FROM students WHERE id = 'c0000000-0000-0000-0000-000000000001';
DELETE FROM librarians WHERE id IN ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002');
DELETE FROM users WHERE id IN ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003');
DELETE FROM library_settings;
DELETE FROM categories;
-- +goose StatementEnd
