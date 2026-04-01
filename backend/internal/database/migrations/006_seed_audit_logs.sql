-- +goose Up
-- +goose StatementBegin

INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
SELECT
    gen_random_uuid(),
    u.id,
    v.action::audit_action,
    v.entity_type,
    gen_random_uuid(),
    CASE WHEN v.action IN ('update', 'delete') THEN v.details_json::jsonb ELSE NULL END,
    CASE WHEN v.action IN ('create', 'update') THEN v.details_json::jsonb ELSE NULL END,
    '192.168.1.' || (floor(random() * 254 + 1)::int)::text,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    NOW() - (random() * interval '30 days')
FROM (
    SELECT id FROM users WHERE role IN ('admin', 'librarian') LIMIT 3
) u
CROSS JOIN (
    VALUES
        ('login', 'user', '{"username": "student001"}'),
        ('logout', 'user', '{"username": "student001"}'),
        ('checkout', 'transaction', '{"book": "Noli Me Tangere", "student": "Juan Dela Cruz"}'),
        ('return', 'transaction', '{"book": "El Filibusterismo", "condition": "good"}'),
        ('renew', 'transaction', '{"book": "1984", "new_due_date": "+7 days"}'),
        ('create', 'book', '{"title": "The Great Gatsby", "author": "F. Scott Fitzgerald"}'),
        ('update', 'book', '{"title": "To Kill a Mockingbird", "field": "shelf_location"}'),
        ('create', 'student', '{"student_id": "2024-0013", "name": "New Student"}'),
        ('update', 'student', '{"student_id": "2024-0001", "field": "section"}'),
        ('fine_created', 'fine', '{"type": "overdue", "amount": 25.00}'),
        ('payment_received', 'fine', '{"amount": 25.00, "method": "cash"}'),
        ('settings_changed', 'settings', '{"key": "max_loan_days", "old": 7, "new": 14}'),
        ('checkout', 'transaction', '{"book": "Harry Potter", "method": "qr_scan"}'),
        ('return', 'transaction', '{"book": "Biology Textbook", "condition": "poor"}'),
        ('create', 'book', '{"title": "Chemistry: Central Science", "copies": 2}'),
        ('settings_changed', 'settings', '{"key": "fine_per_day", "old": 5, "new": 10}'),
        ('login', 'user', '{"username": "librarian", "device": "new"}'),
        ('checkout', 'transaction', '{"book": "Pride and Prejudice", "type": "reservation"}'),
        ('return', 'transaction', '{"book": "Oxford Dictionary", "condition": "damaged"}'),
        ('delete', 'book', '{"title": "Retired Book", "reason": "worn_out"}')
) v(action, entity_type, details_json)
ORDER BY random()
LIMIT 150;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DELETE FROM audit_logs
WHERE user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  AND created_at > NOW() - interval '31 days';

-- +goose StatementEnd
