-- eTIMS filing at consolidated SOA level (one KRA receipt per statement).
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS etims_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS etims_ref VARCHAR(80);
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS etims_qr TEXT;
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS etims_validated_at TIMESTAMPTZ;
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS etims_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_consolidated_etims_status ON consolidated_invoices(etims_status);

-- Trip lines on a non-draft SOA are rolled into the statement — exclude from per-invoice eTIMS.
UPDATE invoices i
SET etims_status = 'consolidated', updated_at = NOW()
FROM consolidated_invoices ci
WHERE i.consolidated_invoice_id = ci.id
  AND ci.status <> 'draft'
  AND COALESCE(i.etims_status, 'pending') NOT IN ('submitted', 'valid');
