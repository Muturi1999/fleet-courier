-- Purge operational data in a tenant schema.
-- PRESERVES: vehicles, rates (rate cards), _schema_patches
-- Run after full pg_dump backup.

\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION purge_tenant_data(schema_name text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('SET search_path TO %I', schema_name);

  -- Clear FK links first
  EXECUTE format('UPDATE %I.work_tickets SET consolidated_invoice_id = NULL WHERE consolidated_invoice_id IS NOT NULL', schema_name);

  EXECUTE format('TRUNCATE TABLE %I.workflow_notifications', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.invoices', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.consolidated_invoices', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.work_tickets', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.schedules', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.local_deliveries', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.safari_entries', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.routes', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.drivers', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.expenses', schema_name);
  EXECUTE format('TRUNCATE TABLE %I.billing_profiles', schema_name);
END;
$$;

SELECT purge_tenant_data('tenant_g4s_kenya');
SELECT purge_tenant_data('tenant_super_metro');

DROP FUNCTION purge_tenant_data(text);
