-- Logistics OS core tables (Phase 1–3) — safe for all tenants; APIs gated by feature flags.

-- Fleet extended fields (Phase 1)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS odometer_km INT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_capacity_l DECIMAL(8,2);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone VARCHAR(40);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS portal_pin VARCHAR(8);

-- Phase 1: transport orders
CREATE TABLE IF NOT EXISTS transport_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(30) NOT NULL,
  partner_id UUID,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(40),
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  route_hint VARCHAR(200),
  pickup_at TIMESTAMPTZ,
  delivery_due_at TIMESTAMPTZ,
  cargo_description TEXT,
  weight_kg DECIMAL(10,2),
  quoted_amount DECIMAL(12,2),
  recurring_rule JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'booked',
  notes TEXT,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_orders_no ON transport_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_transport_orders_status ON transport_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_orders_partner ON transport_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_transport_orders_pickup ON transport_orders(pickup_at);

-- Phase 1: dispatch assignments
CREATE TABLE IF NOT EXISTS dispatch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES transport_orders(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  plate VARCHAR(20) NOT NULL,
  driver_name VARCHAR(120) NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'assigned',
  trip_notes TEXT,
  pod_signature TEXT,
  pod_photo_url TEXT,
  pod_notes TEXT,
  reassigned_from_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_order ON dispatch_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_driver ON dispatch_assignments(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_dispatch_status_date ON dispatch_assignments(status, assigned_at DESC);

-- Phase 1: GPS / telematics
CREATE TABLE IF NOT EXISTS gps_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  plate VARCHAR(20) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'traccar',
  external_id VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_id)
);

CREATE TABLE IF NOT EXISTS vehicle_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES gps_devices(id) ON DELETE CASCADE,
  plate VARCHAR(20) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed_kph DECIMAL(6,2),
  heading DECIMAL(5,2),
  ignition BOOLEAN,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_positions_plate_time ON vehicle_positions(plate, recorded_at DESC);

CREATE TABLE IF NOT EXISTS gps_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate VARCHAR(20) NOT NULL,
  alert_type VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  ref_id UUID,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gps_alerts_open ON gps_alerts(acknowledged, created_at DESC);

-- Phase 1: fuel logs
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  plate VARCHAR(20) NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  liters DECIMAL(10,2) NOT NULL,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  odometer_km INT,
  station VARCHAR(120),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_plate ON fuel_logs(plate, logged_at DESC);

-- Phase 2: maintenance
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  plate VARCHAR(20) NOT NULL,
  service_type VARCHAR(60) NOT NULL,
  interval_km INT,
  interval_days INT,
  last_service_at DATE,
  last_odometer_km INT,
  next_due_at DATE,
  next_due_km INT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maint_sched_plate ON maintenance_schedules(plate);

CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  plate VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  garage_name VARCHAR(120),
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at DATE,
  odometer_km INT,
  parts_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  labor_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  expense_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mwo_plate_status ON maintenance_work_orders(plate, status);

-- Phase 3: AI / intel cache
CREATE TABLE IF NOT EXISTS ops_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(40) NOT NULL,
  entity_type VARCHAR(40),
  entity_id UUID,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  score DECIMAL(6,2),
  payload JSONB,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ops_insights_open ON ops_insights(dismissed, created_at DESC);
