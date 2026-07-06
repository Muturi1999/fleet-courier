-- Optional work ticket serial on invoices (auto-filled from linked work tickets; manual entry supported)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS work_ticket_serial_no VARCHAR(40);

UPDATE invoices
SET work_ticket_serial_no = delivery_note_no
WHERE work_ticket_id IS NOT NULL
  AND work_ticket_serial_no IS NULL
  AND delivery_note_no IS NOT NULL;
