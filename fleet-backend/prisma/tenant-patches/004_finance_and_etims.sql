CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  vehicle_plate VARCHAR(20),
  month VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'recorded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier JSONB NOT NULL,
  client JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS etims_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS etims_validated_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS etims_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_invoices_etims_status ON invoices(etims_status);
