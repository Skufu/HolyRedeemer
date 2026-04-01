-- +goose Up
-- +goose StatementBegin

-- Demo transactions with varied statuses for analytics
-- Active loans (circulation_status = 'active')
INSERT INTO transactions (id, student_id, copy_id, status, circulation_status, incident_type, checkout_date, due_date, receipt_no) VALUES
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'borrowed', 'active', 'none', NOW() - interval '5 days', NOW() + interval '2 days', 'RCT-20260327-0001'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000005', 'borrowed', 'active', 'none', NOW() - interval '3 days', NOW() + interval '4 days', 'RCT-20260329-0002'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000007', 'borrowed', 'active', 'none', NOW() - interval '2 days', NOW() + interval '5 days', 'RCT-20260330-0003'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000009', 'borrowed', 'active', 'none', NOW() - interval '1 day', NOW() + interval '6 days', 'RCT-20260331-0004'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000002', 'borrowed', 'active', 'none', NOW() - interval '4 days', NOW() + interval '3 days', 'RCT-20260328-0005'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000004', 'borrowed', 'active', 'none', NOW() - interval '6 days', NOW() + interval '1 day', 'RCT-20260326-0006'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000006', 'borrowed', 'active', 'none', NOW() - interval '2 days', NOW() + interval '5 days', 'RCT-20260330-0007'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000008', 'borrowed', 'active', 'none', NOW() - interval '3 days', NOW() + interval '4 days', 'RCT-20260329-0008'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000010', 'borrowed', 'active', 'none', NOW() - interval '1 day', NOW() + interval '6 days', 'RCT-20260331-0009'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000011', 'borrowed', 'active', 'none', NOW() - interval '5 days', NOW() + interval '2 days', 'RCT-20260327-0010'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000012', 'borrowed', 'active', 'none', NOW() - interval '4 days', NOW() + interval '3 days', 'RCT-20260328-0011');

-- Overdue loans (circulation_status = 'overdue')
INSERT INTO transactions (id, student_id, copy_id, status, circulation_status, incident_type, checkout_date, due_date, receipt_no) VALUES
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000014', 'overdue', 'overdue', 'none', NOW() - interval '21 days', NOW() - interval '14 days', 'RCT-20260311-0012'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000015', 'overdue', 'overdue', 'none', NOW() - interval '18 days', NOW() - interval '11 days', 'RCT-20260314-0013'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000016', 'overdue', 'overdue', 'none', NOW() - interval '15 days', NOW() - interval '8 days', 'RCT-20260317-0014'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000017', 'overdue', 'overdue', 'none', NOW() - interval '25 days', NOW() - interval '18 days', 'RCT-20260307-0015');

-- Returned loans (circulation_status = 'returned')
INSERT INTO transactions (id, student_id, copy_id, status, circulation_status, incident_type, checkout_date, due_date, return_date, receipt_no) VALUES
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'returned', 'returned', 'none', NOW() - interval '30 days', NOW() - interval '23 days', NOW() - interval '24 days', 'RCT-20260302-0016'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 'returned', 'returned', 'none', NOW() - interval '28 days', NOW() - interval '21 days', NOW() - interval '22 days', 'RCT-20260304-0017'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000005', 'returned', 'returned', 'none', NOW() - interval '25 days', NOW() - interval '18 days', NOW() - interval '19 days', 'RCT-20260307-0018'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000007', 'returned', 'returned', 'none', NOW() - interval '20 days', NOW() - interval '13 days', NOW() - interval '14 days', 'RCT-20260312-0019'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000009', 'returned', 'returned', 'none', NOW() - interval '15 days', NOW() - interval '8 days', NOW() - interval '9 days', 'RCT-20260317-0020'),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000002', 'returned', 'returned', 'none', NOW() - interval '10 days', NOW() - interval '3 days', NOW() - interval '4 days', 'RCT-20260322-0021');

-- Demo damage/lost incidents
INSERT INTO damage_lost_incidents (id, transaction_id, copy_id, student_id, incident_type, severity, description, assessed_cost, receipt_no, reported_by, reported_at, status) VALUES
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' ORDER BY checkout_date DESC LIMIT 1),
     'f0000000-0000-0000-0000-000000000014',
     'c0000000-0000-0000-0000-000000000001',
     'damage', 'moderate', 'Water damage on pages 45-60, cover torn',
     150.00, 'INC-20260325-0001',
     'b0000000-0000-0000-0000-000000000002',
     NOW() - interval '6 days', 'assessed'),
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' ORDER BY checkout_date DESC LIMIT 1 OFFSET 1),
     'f0000000-0000-0000-0000-000000000015',
     'c0000000-0000-0000-0000-000000000003',
     'lost', 'total_loss', 'Book not returned after multiple reminders',
     520.00, 'INC-20260322-0002',
     'b0000000-0000-0000-0000-000000000002',
     NOW() - interval '9 days', 'pending'),
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' ORDER BY checkout_date DESC LIMIT 1 OFFSET 2),
     'f0000000-0000-0000-0000-000000000016',
     'c0000000-0000-0000-0000-000000000005',
     'damage', 'severe', 'Spine broken, multiple pages missing',
     380.00, 'INC-20260320-0003',
     'b0000000-0000-0000-0000-000000000010',
     NOW() - interval '11 days', 'resolved'),
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' ORDER BY checkout_date DESC LIMIT 1 OFFSET 3),
     'f0000000-0000-0000-0000-000000000017',
     'c0000000-0000-0000-0000-000000000007',
     'damage', 'minor', 'Small tear on back cover, minor creasing',
     75.00, 'INC-20260318-0004',
     'b0000000-0000-0000-0000-000000000002',
     NOW() - interval '13 days', 'resolved');

-- Demo fines
INSERT INTO fines (id, transaction_id, student_id, amount, fine_type, description, status, created_at) VALUES
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' LIMIT 1),
     'c0000000-0000-0000-0000-000000000001',
     70.00, 'overdue', '14 days overdue at ₱5/day', 'pending', NOW() - interval '6 days'),
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' LIMIT 1 OFFSET 1),
     'c0000000-0000-0000-0000-000000000003',
     55.00, 'overdue', '11 days overdue at ₱5/day', 'pending', NOW() - interval '3 days'),
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' LIMIT 1 OFFSET 2),
     'c0000000-0000-0000-0000-000000000005',
     40.00, 'overdue', '8 days overdue at ₱5/day', 'pending', NOW() - interval '1 day'),
    (gen_random_uuid(),
     (SELECT id FROM transactions WHERE circulation_status = 'overdue' LIMIT 1 OFFSET 3),
     'c0000000-0000-0000-0000-000000000007',
     90.00, 'overdue', '18 days overdue at ₱5/day', 'pending', NOW() - interval '7 days'),
    (gen_random_uuid(),
     (SELECT transaction_id FROM damage_lost_incidents WHERE incident_type = 'damage' AND severity = 'severe' LIMIT 1),
     'c0000000-0000-0000-0000-000000000005',
     380.00, 'damaged', 'Replacement cost for severely damaged book', 'pending', NOW() - interval '11 days'),
    (gen_random_uuid(),
     (SELECT transaction_id FROM damage_lost_incidents WHERE incident_type = 'lost' LIMIT 1),
     'c0000000-0000-0000-0000-000000000003',
     520.00, 'lost', 'Replacement cost for lost book', 'pending', NOW() - interval '9 days');

-- Demo book requests (reservations)
INSERT INTO book_requests (id, student_id, book_id, request_type, status, notes, created_at, reservation_queue_position) VALUES
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'reservation', 'pending', 'Waiting for copy to be available', NOW() - interval '2 days', 1),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'reservation', 'pending', 'Need for research paper', NOW() - interval '1 day', 2),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006', 'reservation', 'pending', 'Personal reading', NOW() - interval '3 days', 1),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', 'reservation', 'approved', 'Approved by librarian', NOW() - interval '5 days', NULL),
    (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000004', 'reservation', 'pending', 'Class assignment', NOW() - interval '4 days', 1);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DELETE FROM fines WHERE fine_type IN ('overdue', 'damaged', 'lost') AND amount <= 520;
DELETE FROM book_requests WHERE request_type = 'reservation';
DELETE FROM damage_lost_incidents WHERE receipt_no LIKE 'INC-%';
DELETE FROM transactions WHERE receipt_no LIKE 'RCT-202603%';

-- +goose StatementEnd
