-- Safe to re-run on existing tenant schemas
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_note_no VARCHAR(40);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  id_number VARCHAR(40),
  license_expiry DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no VARCHAR(20) NOT NULL,
  branch VARCHAR(80) NOT NULL DEFAULT 'Embakasi',
  trip_date DATE NOT NULL,
  plate VARCHAR(20) NOT NULL,
  make VARCHAR(40) NOT NULL,
  driver_name VARCHAR(120) NOT NULL,
  route VARCHAR(200) NOT NULL,
  rate_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
  agreed_rate DECIMAL(12,2) NOT NULL,
  gate_pass_ref VARCHAR(80),
  header_notes VARCHAR(200),
  legs JSONB NOT NULL DEFAULT '[]',
  private_km INT NOT NULL DEFAULT 0,
  official_km INT NOT NULL DEFAULT 0,
  net DECIMAL(12,2) NOT NULL,
  vat DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  attachment_name VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  client_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_tickets_status ON work_tickets(status);
CREATE INDEX IF NOT EXISTS idx_work_tickets_plate ON work_tickets(plate);
CREATE INDEX IF NOT EXISTS idx_work_tickets_serial ON work_tickets(serial_no);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
