#!/usr/bin/env bash
# Full DB backup then purge tenant operational data (keeps vehicles + rates).
# Usage on server: bash backup-and-purge.sh
set -euo pipefail

TS="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-/opt/swiftfleet/backups}"
DUMP="${BACKUP_DIR}/fleet_courier-${TS}.dump"
META="${BACKUP_DIR}/fleet_courier-${TS}.meta"

mkdir -p "$BACKUP_DIR"

echo "==> Backing up fleet_courier to ${DUMP}"
docker exec swiftfleet-postgres pg_dump -U fleet -d fleet_courier -Fc -f "/tmp/fleet-${TS}.dump"
docker cp "swiftfleet-postgres:/tmp/fleet-${TS}.dump" "$DUMP"
docker exec swiftfleet-postgres rm -f "/tmp/fleet-${TS}.dump"

ls -lh "$DUMP" | tee "$META"
echo "backup_ts=${TS}" >> "$META"
echo "backup_file=${DUMP}" >> "$META"

echo "==> Purging tenant data (keeping vehicles + rates)..."
docker exec -i swiftfleet-postgres psql -U fleet -d fleet_courier -v ON_ERROR_STOP=1 <<'SQL'
CREATE OR REPLACE FUNCTION purge_tenant_data(schema_name text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
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
SQL

echo "==> Post-purge counts (g4s-kenya):"
docker exec swiftfleet-postgres psql -U fleet -d fleet_courier -c "
SELECT relname, n_live_tup FROM pg_stat_user_tables
WHERE schemaname = 'tenant_g4s_kenya' AND relname NOT LIKE '\_%'
ORDER BY relname;
"

echo "Done. Backup: ${DUMP}"
