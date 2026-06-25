-- Period-based consolidation (all vehicles in a date range) vs vehicle batch (plate set).
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS consolidation_type VARCHAR(20) NOT NULL DEFAULT 'vehicle';
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS filter_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_consolidated_type ON consolidated_invoices (consolidation_type);
