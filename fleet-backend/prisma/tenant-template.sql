-- Applied inside each tenant schema: tenant_{slug}
-- Run via TenantProvisioningService after CREATE SCHEMA

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate VARCHAR(20) NOT NULL,
  cls VARCHAR(20) NOT NULL,
  dest VARCHAR(120) NOT NULL,
  run_type VARCHAR(20) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  days INT NOT NULL DEFAULT 1,
  cost DECIMAL(12,2) NOT NULL,
  vat DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  month VARCHAR(20),
  service_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'saved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate VARCHAR(20) NOT NULL UNIQUE,
  cls VARCHAR(20) NOT NULL,
  run_type VARCHAR(40) NOT NULL,
  runs INT NOT NULL DEFAULT 0,
  days INT NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  dests JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  client VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(40) NOT NULL,
  plate VARCHAR(20) NOT NULL,
  cls VARCHAR(20) NOT NULL,
  route VARCHAR(120) NOT NULL,
  days INT NOT NULL DEFAULT 1,
  net DECIMAL(12,2) NOT NULL,
  vat DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  service_date DATE,
  period VARCHAR(20),
  delivery_note_no VARCHAR(40),
  client_note TEXT,
  etims_ref VARCHAR(80),
  etims_qr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route VARCHAR(120) NOT NULL,
  cls VARCHAR(20) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  category VARCHAR(20) NOT NULL DEFAULT 'nairobi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg VARCHAR(20) NOT NULL,
  m INT NOT NULL DEFAULT 0,
  a INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  service_date DATE,
  period VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safari_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg VARCHAR(20) NOT NULL,
  total INT NOT NULL DEFAULT 0,
  flag VARCHAR(20) NOT NULL DEFAULT '',
  dest VARCHAR(500) NOT NULL,
  service_date DATE,
  period VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  rate7 DECIMAL(12,2) NOT NULL DEFAULT 0,
  rate15 DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(20) NOT NULL DEFAULT 'nairobi',
  trips INT NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  vehicle_type VARCHAR(40),
  driver_name VARCHAR(120) NOT NULL,
  route VARCHAR(200) NOT NULL,
  rate_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
  agreed_rate DECIMAL(12,2) NOT NULL,
  gate_pass_ref VARCHAR(80),
  header_notes VARCHAR(200),
  vehicle_condition JSONB NOT NULL DEFAULT '{}',
  driver_signature VARCHAR(120),
  certification_date DATE,
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

CREATE TABLE IF NOT EXISTS consolidated_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(40) NOT NULL,
  ref_no VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  invoice_date DATE NOT NULL,
  description TEXT NOT NULL,
  payment_terms_days INT NOT NULL DEFAULT 90,
  payment_window_from DATE,
  payment_window_to DATE,
  total_trips INT NOT NULL DEFAULT 0,
  net DECIMAL(14,2) NOT NULL,
  vat DECIMAL(14,2) NOT NULL,
  total DECIMAL(14,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  work_ticket_ids JSONB NOT NULL DEFAULT '[]',
  client_note TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  etims_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  etims_ref VARCHAR(80),
  etims_qr TEXT,
  etims_validated_at TIMESTAMPTZ,
  etims_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS consolidated_invoice_id UUID;

CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience VARCHAR(20) NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  ref_id UUID,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  actor VARCHAR(20) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_plate ON schedules(plate);
CREATE INDEX IF NOT EXISTS idx_invoices_plate ON invoices(plate);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_notifications_audience ON workflow_notifications(audience);
CREATE INDEX IF NOT EXISTS idx_work_tickets_status ON work_tickets(status);
CREATE INDEX IF NOT EXISTS idx_work_tickets_plate ON work_tickets(plate);
CREATE INDEX IF NOT EXISTS idx_work_tickets_serial ON work_tickets(serial_no);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_consolidated_status ON consolidated_invoices(status);
CREATE INDEX IF NOT EXISTS idx_work_tickets_consolidated ON work_tickets(consolidated_invoice_id);
