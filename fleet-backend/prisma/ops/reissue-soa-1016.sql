-- Reissue SOA 1016 after Digitax credit note on filed SOA 1015 (wrong ex-VAT line qty/trips).
DO $$
DECLARE
  src_id UUID := '2f65b0f7-67aa-45c0-b704-ab14012994c6';
  new_id UUID := gen_random_uuid();
  exists_1016 INT;
BEGIN
  SELECT COUNT(*) INTO exists_1016
  FROM tenant_g4s_kenya.consolidated_invoices WHERE invoice_no = '1016';

  IF exists_1016 > 0 THEN
    RAISE NOTICE 'SOA 1016 already exists — skipping reissue';
    RETURN;
  END IF;

  INSERT INTO tenant_g4s_kenya.consolidated_invoices (
    id, invoice_no, ref_no, period_start, period_end, invoice_date, description,
    payment_terms_days, payment_window_from, payment_window_to,
    total_trips, net, vat, total, status, work_ticket_ids, plate,
    consolidation_type, filter_meta, partner_id, revised_from_id, client_note
  )
  SELECT
    new_id, '1016', '1016', period_start, period_end, CURRENT_DATE, description,
    payment_terms_days, NULL, NULL,
    total_trips, net, vat, total, 'draft', work_ticket_ids, plate,
    consolidation_type, filter_meta, partner_id, src_id,
    'Reissue of SOA 1015 — eTIMS line corrected to qty 1 gross VAT-inclusive total after Digitax credit note.'
  FROM tenant_g4s_kenya.consolidated_invoices WHERE id = src_id;

  UPDATE tenant_g4s_kenya.invoices
  SET consolidated_invoice_id = new_id, etims_status = 'consolidated', updated_at = NOW()
  WHERE consolidated_invoice_id = src_id;

  UPDATE tenant_g4s_kenya.work_tickets
  SET consolidated_invoice_id = new_id, updated_at = NOW()
  WHERE consolidated_invoice_id = src_id;

  UPDATE tenant_g4s_kenya.consolidated_invoices
  SET superseded_by_id = new_id,
      etims_status = 'credited',
      client_note = COALESCE(client_note, '') || ' Superseded by SOA 1016 after Digitax credit note (incorrect ex-VAT trip line on eTIMS).',
      updated_at = NOW()
  WHERE id = src_id;

  UPDATE tenant_g4s_kenya.tenant_sequences
  SET next_value = 1017, updated_at = NOW()
  WHERE key = 'consolidated_invoice_serial' AND next_value < 1017;

  RAISE NOTICE 'Created SOA 1016 (%) and superseded 1015', new_id;
END $$;
