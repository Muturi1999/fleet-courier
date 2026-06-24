-- Atomic serial allocation for invoice numbers and work-ticket serials
CREATE TABLE IF NOT EXISTS tenant_sequences (
  key TEXT PRIMARY KEY,
  next_value BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed from existing data (idempotent — only raises, never lowers)
INSERT INTO tenant_sequences (key, next_value)
SELECT 'invoice_no',
       GREATEST(
         17206,
         COALESCE(
           (SELECT MAX(CAST(REGEXP_REPLACE(invoice_no, '\D', '', 'g') AS BIGINT)) + 1 FROM invoices),
           17206
         )
       )
ON CONFLICT (key) DO UPDATE
SET next_value = GREATEST(tenant_sequences.next_value, EXCLUDED.next_value),
    updated_at = NOW();

INSERT INTO tenant_sequences (key, next_value)
SELECT 'work_ticket_serial',
       GREATEST(
         1189100,
         COALESCE(
           (SELECT MAX(CAST(REGEXP_REPLACE(serial_no, '\D', '', 'g') AS BIGINT)) + 1 FROM work_tickets),
           1189100
         )
       )
ON CONFLICT (key) DO UPDATE
SET next_value = GREATEST(tenant_sequences.next_value, EXCLUDED.next_value),
    updated_at = NOW();
