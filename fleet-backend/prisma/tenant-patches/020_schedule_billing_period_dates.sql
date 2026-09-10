-- Billing period dates on schedules (parity with invoices).
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE schedules ALTER COLUMN month TYPE VARCHAR(40);

-- Backfill from month label (e.g. "May 2026", "May 2026 – June 2026")
-- and fall back to calendar month of service_date when label is missing.
WITH normalized AS (
  SELECT
    id,
    TRIM(month) AS label,
    service_date,
    regexp_split_to_array(TRIM(month), '\s+(?:-|–|—)\s+') AS parts
  FROM schedules
  WHERE period_start IS NULL OR period_end IS NULL
),
parsed AS (
  SELECT
    id,
    service_date,
    CASE
      WHEN label ~* '^[A-Za-z]+ [0-9]{4}$'
        THEN make_date(
          RIGHT(label, 4)::int,
          CASE LEFT(LOWER(label), 3)
            WHEN 'jan' THEN 1 WHEN 'feb' THEN 2 WHEN 'mar' THEN 3
            WHEN 'apr' THEN 4 WHEN 'may' THEN 5 WHEN 'jun' THEN 6
            WHEN 'jul' THEN 7 WHEN 'aug' THEN 8 WHEN 'sep' THEN 9
            WHEN 'oct' THEN 10 WHEN 'nov' THEN 11 WHEN 'dec' THEN 12
          END,
          1
        )
      WHEN array_length(parts, 1) = 2
        AND parts[1] ~* '^[A-Za-z]+ [0-9]{4}$'
        AND parts[2] ~* '^[A-Za-z]+ [0-9]{4}$'
        THEN make_date(
          RIGHT(parts[1], 4)::int,
          CASE LEFT(LOWER(parts[1]), 3)
            WHEN 'jan' THEN 1 WHEN 'feb' THEN 2 WHEN 'mar' THEN 3
            WHEN 'apr' THEN 4 WHEN 'may' THEN 5 WHEN 'jun' THEN 6
            WHEN 'jul' THEN 7 WHEN 'aug' THEN 8 WHEN 'sep' THEN 9
            WHEN 'oct' THEN 10 WHEN 'nov' THEN 11 WHEN 'dec' THEN 12
          END,
          1
        )
      WHEN label ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}\s+(?:-|–|—)\s+[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        THEN to_date(parts[1], 'DD/MM/YYYY')
      WHEN service_date IS NOT NULL
        THEN date_trunc('month', service_date)::date
    END AS parsed_start,
    CASE
      WHEN label ~* '^[A-Za-z]+ [0-9]{4}$'
        THEN (
          make_date(
            RIGHT(label, 4)::int,
            CASE LEFT(LOWER(label), 3)
              WHEN 'jan' THEN 1 WHEN 'feb' THEN 2 WHEN 'mar' THEN 3
              WHEN 'apr' THEN 4 WHEN 'may' THEN 5 WHEN 'jun' THEN 6
              WHEN 'jul' THEN 7 WHEN 'aug' THEN 8 WHEN 'sep' THEN 9
              WHEN 'oct' THEN 10 WHEN 'nov' THEN 11 WHEN 'dec' THEN 12
            END,
            1
          ) + interval '1 month - 1 day'
        )::date
      WHEN array_length(parts, 1) = 2
        AND parts[1] ~* '^[A-Za-z]+ [0-9]{4}$'
        AND parts[2] ~* '^[A-Za-z]+ [0-9]{4}$'
        THEN (
          make_date(
            RIGHT(parts[2], 4)::int,
            CASE LEFT(LOWER(parts[2]), 3)
              WHEN 'jan' THEN 1 WHEN 'feb' THEN 2 WHEN 'mar' THEN 3
              WHEN 'apr' THEN 4 WHEN 'may' THEN 5 WHEN 'jun' THEN 6
              WHEN 'jul' THEN 7 WHEN 'aug' THEN 8 WHEN 'sep' THEN 9
              WHEN 'oct' THEN 10 WHEN 'nov' THEN 11 WHEN 'dec' THEN 12
            END,
            1
          ) + interval '1 month - 1 day'
        )::date
      WHEN label ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}\s+(?:-|–|—)\s+[0-9]{2}/[0-9]{2}/[0-9]{4}$'
        THEN to_date(parts[2], 'DD/MM/YYYY')
      WHEN service_date IS NOT NULL
        THEN (date_trunc('month', service_date) + interval '1 month - 1 day')::date
    END AS parsed_end
  FROM normalized
)
UPDATE schedules s
SET
  period_start = COALESCE(s.period_start, parsed.parsed_start),
  period_end = COALESCE(s.period_end, parsed.parsed_end),
  month = COALESCE(
    NULLIF(TRIM(s.month), ''),
    to_char(COALESCE(parsed.parsed_start, s.service_date), 'Mon YYYY')
  )
FROM parsed
WHERE s.id = parsed.id
  AND (parsed.parsed_start IS NOT NULL OR parsed.parsed_end IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_schedules_billing_period
  ON schedules (period_start, period_end);
