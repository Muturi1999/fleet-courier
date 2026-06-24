-- Performance indexes for paginated list queries (safe, idempotent)
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_service_date ON invoices (service_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_tickets_trip_date ON work_tickets (trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_tickets_created_at ON work_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_partner_status ON invoices (partner_id, status, created_at DESC);
