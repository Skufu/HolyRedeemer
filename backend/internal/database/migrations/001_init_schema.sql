-- +goose Up
-- +goose StatementBegin

-- =============================================
-- USERS & AUTHENTICATION
-- =============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'librarian', 'student');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    email           VARCHAR(100),
    name            VARCHAR(100) NOT NULL,
    status          user_status DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- STUDENTS
-- =============================================

CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'transferred');

CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id      VARCHAR(20) UNIQUE NOT NULL,
    grade_level     INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
    section         VARCHAR(50) NOT NULL,
    rfid_code       VARCHAR(50) UNIQUE,
    contact_info    VARCHAR(100),
    guardian_name   VARCHAR(100),
    guardian_contact VARCHAR(50),
    status          student_status DEFAULT 'active',
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- LIBRARIANS / STAFF
-- =============================================

CREATE TABLE librarians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id     VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100),
    phone           VARCHAR(20),
    department      VARCHAR(50) DEFAULT 'Library',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BOOK CATALOG
-- =============================================

CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    color_code      VARCHAR(7),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE book_status AS ENUM ('active', 'archived', 'discontinued');

CREATE TABLE books (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isbn            VARCHAR(17),
    title           VARCHAR(255) NOT NULL,
    author          VARCHAR(255) NOT NULL,
    category_id     UUID REFERENCES categories(id),
    publisher       VARCHAR(100),
    publication_year INTEGER,
    description     TEXT,
    cover_url       VARCHAR(500),
    shelf_location  VARCHAR(50),
    replacement_cost DECIMAL(10, 2) DEFAULT 0,
    status          book_status DEFAULT 'active',
    is_data_complete BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BOOK COPIES
-- =============================================

CREATE TYPE copy_status AS ENUM ('available', 'borrowed', 'reserved', 'lost', 'damaged', 'retired');
CREATE TYPE copy_condition AS ENUM ('excellent', 'good', 'fair', 'poor');

CREATE TABLE book_copies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID REFERENCES books(id) ON DELETE CASCADE,
    copy_number     INTEGER NOT NULL,
    qr_code         VARCHAR(100) UNIQUE NOT NULL,
    barcode         VARCHAR(50),
    status          copy_status DEFAULT 'available',
    condition       copy_condition DEFAULT 'good',
    acquisition_date DATE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id, copy_number)
);

-- =============================================
-- CIRCULATION (Transactions)
-- =============================================

CREATE TYPE transaction_status AS ENUM ('borrowed', 'returned', 'overdue', 'lost');
CREATE TYPE checkout_method AS ENUM ('counter', 'self_service');

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID REFERENCES students(id),
    copy_id         UUID REFERENCES book_copies(id),
    librarian_id    UUID REFERENCES librarians(id),
    checkout_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date        DATE NOT NULL,
    return_date     TIMESTAMP,
    returned_by     UUID REFERENCES librarians(id),
    status          transaction_status DEFAULT 'borrowed',
    checkout_method checkout_method DEFAULT 'counter',
    renewal_count   INTEGER DEFAULT 0,
    return_condition copy_condition,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- FINES & PAYMENTS
-- =============================================

CREATE TYPE fine_type AS ENUM ('overdue', 'lost', 'damaged', 'other');
CREATE TYPE fine_status AS ENUM ('pending', 'partial', 'paid', 'waived');
CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'bank_transfer', 'other');

CREATE TABLE fines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID REFERENCES transactions(id),
    student_id      UUID REFERENCES students(id),
    amount          DECIMAL(10, 2) NOT NULL,
    fine_type       fine_type NOT NULL,
    description     TEXT,
    status          fine_status DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fine_id         UUID REFERENCES fines(id),
    student_id      UUID REFERENCES students(id),
    amount          DECIMAL(10, 2) NOT NULL,
    payment_method  payment_method NOT NULL,
    reference_number VARCHAR(100),
    notes           TEXT,
    processed_by    UUID REFERENCES librarians(id),
    payment_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BOOK REQUESTS
-- =============================================

CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled');
CREATE TYPE request_type AS ENUM ('reservation', 'request');

CREATE TABLE book_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID REFERENCES students(id),
    book_id         UUID REFERENCES books(id),
    request_type    request_type NOT NULL,
    status          request_status DEFAULT 'pending',
    request_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    processed_by    UUID REFERENCES librarians(id),
    processed_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- LIBRARY SETTINGS
-- =============================================

CREATE TABLE library_settings (
    key             VARCHAR(50) PRIMARY KEY,
    value           TEXT NOT NULL,
    description     TEXT,
    category        VARCHAR(50),
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by      UUID REFERENCES users(id)
);

-- =============================================
-- AUDIT LOG
-- =============================================

CREATE TYPE audit_action AS ENUM (
    'login', 'logout',
    'create', 'update', 'delete',
    'checkout', 'return', 'renew',
    'fine_created', 'payment_received',
    'settings_changed'
);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    action          audit_action NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE TYPE notification_type AS ENUM ('due_reminder', 'overdue', 'fine', 'request_update', 'system');

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    type            notification_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT false,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_students_rfid ON students(rfid_code);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_grade ON students(grade_level, section);

CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_category ON books(category_id);

CREATE INDEX idx_book_copies_qr ON book_copies(qr_code);
CREATE INDEX idx_book_copies_status ON book_copies(status);
CREATE INDEX idx_book_copies_book_id ON book_copies(book_id);

CREATE INDEX idx_transactions_student ON transactions(student_id);
CREATE INDEX idx_transactions_copy ON transactions(copy_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_due_date ON transactions(due_date);

CREATE INDEX idx_fines_student ON fines(student_id);
CREATE INDEX idx_fines_status ON fines(status);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_students_timestamp BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_librarians_timestamp BEFORE UPDATE ON librarians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_books_timestamp BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_book_copies_timestamp BEFORE UPDATE ON book_copies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_timestamp BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_fines_timestamp BEFORE UPDATE ON fines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS update_fines_timestamp ON fines;
DROP TRIGGER IF EXISTS update_transactions_timestamp ON transactions;
DROP TRIGGER IF EXISTS update_book_copies_timestamp ON book_copies;
DROP TRIGGER IF EXISTS update_books_timestamp ON books;
DROP TRIGGER IF EXISTS update_librarians_timestamp ON librarians;
DROP TRIGGER IF EXISTS update_students_timestamp ON students;
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
DROP FUNCTION IF EXISTS update_updated_at();

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS library_settings;
DROP TABLE IF EXISTS book_requests;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS fines;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS book_copies;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS librarians;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS audit_action;
DROP TYPE IF EXISTS request_type;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS fine_status;
DROP TYPE IF EXISTS fine_type;
DROP TYPE IF EXISTS checkout_method;
DROP TYPE IF EXISTS transaction_status;
DROP TYPE IF EXISTS copy_condition;
DROP TYPE IF EXISTS copy_status;
DROP TYPE IF EXISTS book_status;
DROP TYPE IF EXISTS student_status;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS user_role;
-- +goose StatementEnd
