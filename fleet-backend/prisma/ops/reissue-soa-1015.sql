-- One-off: G4S billing PIN correction — SOA 1015 replaces eTIMS-credited SOA 1014
-- Run against tenant_g4s_kenya only. Idempotent: skips if 1015 already exists.

DO $$
DECLARE
  src_id UUID := '2288176f-6026-4029-bf1c-446bb586b70f';
  new_id UUID := gen_random_uuid();
  exists_1015 INT;
BEGIN
  SELECT COUNT(*) INTO exists_1015
  FROM tenant_g4s_kenya.consolidated_invoices WHERE invoice_no = '1015';

  IF exists_1015 > 0 THEN
    RAISE NOTICE 'SOA 1015 already exists — skipping reissue';
    RETURN;
  END IF;

  -- Correct G4S buyer details for all future eTIMS filings
  UPDATE tenant_g4s_kenya.billing_profiles
  SET client = client
    || jsonb_build_object(
      'pin', 'P000618582J',
      'name', 'G4S KENYA LIMITED',
      'legalName', 'G4S KENYA LIMITED'
    );

  INSERT INTO tenant_g4s_kenya.consolidated_invoices (
    id, invoice_no, ref_no, period_start, period_end, invoice_date, description,
    payment_terms_days, payment_window_from, payment_window_to,
    total_trips, net, vat, total, status, work_ticket_ids, plate,
    consolidation_type, filter_meta, partner_id, revised_from_id, client_note
  )
  SELECT
    new_id, '1015', '1015', period_start, period_end, CURRENT_DATE, description,
    payment_terms_days, NULL, NULL,
    total_trips, net, vat, total, 'draft', work_ticket_ids, plate,
    consolidation_type, filter_meta, partner_id, src_id,
    'Reissue of SOA 1014 with corrected G4S KRA PIN (P000618582J) after Digitax credit note on KRACU0400003993.'
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
      client_note = COALESCE(client_note, '') || ' Superseded by SOA 1015 after Digitax credit note (KRACU0400003993).',
      updated_at = NOW()
  WHERE id = src_id;

  UPDATE tenant_g4s_kenya.tenant_sequences
  SET next_value = 1016, updated_at = NOW()
  WHERE key = 'consolidated_invoice_serial' AND next_value < 1016;

  RAISE NOTICE 'Created SOA 1015 (%) and superseded 1014', new_id;
END $$;
