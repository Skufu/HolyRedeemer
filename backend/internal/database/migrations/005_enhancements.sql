-- +goose Up
-- +goose StatementBegin

ALTER TABLE transactions ADD COLUMN circulation_status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE transactions ADD COLUMN receipt_no VARCHAR(50) UNIQUE;
ALTER TABLE transactions ADD COLUMN incident_type VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE transactions ADD COLUMN replacement_cost_applied DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN incident_details TEXT;

ALTER TABLE transactions
    ADD CONSTRAINT chk_transactions_circulation_status
    CHECK (circulation_status IN ('active', 'returned', 'overdue', 'lost', 'damaged'));

ALTER TABLE transactions
    ADD CONSTRAINT chk_transactions_incident_type
    CHECK (incident_type IN ('none', 'damage', 'lost'));

ALTER TABLE book_requests ADD COLUMN auto_cancelled_at TIMESTAMP;
ALTER TABLE book_requests ADD COLUMN reservation_queue_position INTEGER;

ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'damaged';

CREATE TABLE damage_lost_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    copy_id UUID NOT NULL REFERENCES book_copies(id),
    student_id UUID NOT NULL REFERENCES students(id),
    incident_type VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    assessed_cost DECIMAL(10,2),
    receipt_no VARCHAR(50) UNIQUE,
    reported_by UUID REFERENCES librarians(id),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_circulation_status ON transactions(circulation_status);
CREATE INDEX idx_transactions_receipt_no ON transactions(receipt_no);
CREATE INDEX idx_transactions_incident_type ON transactions(incident_type);
CREATE INDEX idx_transactions_replacement_cost_applied ON transactions(replacement_cost_applied);
CREATE INDEX idx_transactions_incident_details ON transactions(incident_details);

CREATE INDEX idx_book_requests_auto_cancelled_at ON book_requests(auto_cancelled_at);
CREATE INDEX idx_book_requests_reservation_queue_position ON book_requests(reservation_queue_position);

CREATE INDEX idx_damage_lost_incidents_transaction_id ON damage_lost_incidents(transaction_id);
CREATE INDEX idx_damage_lost_incidents_copy_id ON damage_lost_incidents(copy_id);
CREATE INDEX idx_damage_lost_incidents_student_id ON damage_lost_incidents(student_id);
CREATE INDEX idx_damage_lost_incidents_incident_type ON damage_lost_incidents(incident_type);
CREATE INDEX idx_damage_lost_incidents_severity ON damage_lost_incidents(severity);
CREATE INDEX idx_damage_lost_incidents_description ON damage_lost_incidents(description);
CREATE INDEX idx_damage_lost_incidents_assessed_cost ON damage_lost_incidents(assessed_cost);
CREATE INDEX idx_damage_lost_incidents_receipt_no ON damage_lost_incidents(receipt_no);
CREATE INDEX idx_damage_lost_incidents_reported_by ON damage_lost_incidents(reported_by);
CREATE INDEX idx_damage_lost_incidents_reported_at ON damage_lost_incidents(reported_at);
CREATE INDEX idx_damage_lost_incidents_status ON damage_lost_incidents(status);
CREATE INDEX idx_damage_lost_incidents_created_at ON damage_lost_incidents(created_at);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_damage_lost_incidents_created_at;
DROP INDEX IF EXISTS idx_damage_lost_incidents_status;
DROP INDEX IF EXISTS idx_damage_lost_incidents_reported_at;
DROP INDEX IF EXISTS idx_damage_lost_incidents_reported_by;
DROP INDEX IF EXISTS idx_damage_lost_incidents_receipt_no;
DROP INDEX IF EXISTS idx_damage_lost_incidents_assessed_cost;
DROP INDEX IF EXISTS idx_damage_lost_incidents_description;
DROP INDEX IF EXISTS idx_damage_lost_incidents_severity;
DROP INDEX IF EXISTS idx_damage_lost_incidents_incident_type;
DROP INDEX IF EXISTS idx_damage_lost_incidents_student_id;
DROP INDEX IF EXISTS idx_damage_lost_incidents_copy_id;
DROP INDEX IF EXISTS idx_damage_lost_incidents_transaction_id;

DROP INDEX IF EXISTS idx_book_requests_reservation_queue_position;
DROP INDEX IF EXISTS idx_book_requests_auto_cancelled_at;

DROP INDEX IF EXISTS idx_transactions_incident_details;
DROP INDEX IF EXISTS idx_transactions_replacement_cost_applied;
DROP INDEX IF EXISTS idx_transactions_incident_type;
DROP INDEX IF EXISTS idx_transactions_receipt_no;
DROP INDEX IF EXISTS idx_transactions_circulation_status;

DROP TABLE IF EXISTS damage_lost_incidents;

ALTER TABLE book_requests DROP COLUMN IF EXISTS reservation_queue_position;
ALTER TABLE book_requests DROP COLUMN IF EXISTS auto_cancelled_at;

ALTER TABLE transactions DROP COLUMN IF EXISTS incident_details;
ALTER TABLE transactions DROP COLUMN IF EXISTS replacement_cost_applied;
ALTER TABLE transactions DROP COLUMN IF EXISTS incident_type;
ALTER TABLE transactions DROP COLUMN IF EXISTS receipt_no;
ALTER TABLE transactions DROP COLUMN IF EXISTS circulation_status;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_incident_type;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_circulation_status;

-- +goose StatementEnd
