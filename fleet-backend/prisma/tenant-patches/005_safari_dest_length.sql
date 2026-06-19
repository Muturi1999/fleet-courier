-- Widen safari destination summaries (some exceed 120 chars)
ALTER TABLE safari_entries ALTER COLUMN dest TYPE VARCHAR(500);
