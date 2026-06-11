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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS consolidated_invoice_id UUID;

CREATE INDEX IF NOT EXISTS idx_consolidated_status ON consolidated_invoices(status);
CREATE INDEX IF NOT EXISTS idx_work_tickets_consolidated ON work_tickets(consolidated_invoice_id);
