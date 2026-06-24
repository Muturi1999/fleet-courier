-- Partner-scoped data isolation within a tenant workspace
ALTER TABLE billing_profiles ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE consolidated_invoices ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE workflow_notifications ADD COLUMN IF NOT EXISTS partner_id UUID;

CREATE INDEX IF NOT EXISTS idx_invoices_partner_id ON invoices (partner_id);
CREATE INDEX IF NOT EXISTS idx_work_tickets_partner_id ON work_tickets (partner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_partner_id ON workflow_notifications (partner_id);
