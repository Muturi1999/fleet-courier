-- Renumber consolidated invoices to plain sequential serials; seed sequence for new rows
DO $$
DECLARE
  schema_name TEXT := current_schema();
BEGIN
  WITH numbered AS (
    SELECT id, (1000 + ROW_NUMBER() OVER (ORDER BY created_at ASC, invoice_no ASC))::bigint AS serial
    FROM consolidated_invoices
  )
  UPDATE consolidated_invoices ci
  SET invoice_no = n.serial::text,
      ref_no = n.serial::text,
      updated_at = NOW()
  FROM numbered n
  WHERE ci.id = n.id;

  INSERT INTO tenant_sequences (key, next_value)
  SELECT 'consolidated_invoice_serial',
         GREATEST(
           1001,
           COALESCE(
             (SELECT MAX(CAST(invoice_no AS BIGINT)) + 1 FROM consolidated_invoices WHERE invoice_no ~ '^\d+$'),
             1001
           )
         )
  ON CONFLICT (key) DO UPDATE
  SET next_value = GREATEST(tenant_sequences.next_value, EXCLUDED.next_value),
      updated_at = NOW();
END $$;
