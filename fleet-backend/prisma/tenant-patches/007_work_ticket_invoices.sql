-- Link per-trip invoices to work tickets and consolidated billing
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS work_ticket_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS consolidated_invoice_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_work_ticket_id
  ON invoices (work_ticket_id) WHERE work_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_wt_consolidated
  ON invoices (consolidated_invoice_id) WHERE consolidated_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_plate_service_date
  ON invoices (plate, service_date);

ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS plate VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_consolidated_invoices_plate ON consolidated_invoices (plate);
