-- Widen invoices.period for billing date ranges (was VARCHAR(20), e.g. "01/06/2026 – 30/06/2026")
ALTER TABLE invoices ALTER COLUMN period TYPE VARCHAR(120);
