-- Rename draft May SOA M-1018 → M-1019 (layout-only update; same trips and totals).
UPDATE tenant_g4s_kenya.consolidated_invoices
SET invoice_no = 'M-1019',
    ref_no = 'M-1019',
    updated_at = NOW()
WHERE invoice_no = 'M-1018'
  AND status = 'draft';
