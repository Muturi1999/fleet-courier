-- Track revised consolidated SOA copies (rejected → corrected resubmit)
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS revised_from_id UUID;
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS superseded_by_id UUID;

CREATE INDEX IF NOT EXISTS idx_consolidated_revised_from ON consolidated_invoices (revised_from_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_superseded_by ON consolidated_invoices (superseded_by_id);
