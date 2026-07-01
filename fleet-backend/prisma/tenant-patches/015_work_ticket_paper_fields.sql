-- G4S paper work ticket fields (vehicle type, condition checklist, driver certification)
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(40);
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS vehicle_condition JSONB NOT NULL DEFAULT '{}';
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS driver_signature VARCHAR(120);
ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS certification_date DATE;
