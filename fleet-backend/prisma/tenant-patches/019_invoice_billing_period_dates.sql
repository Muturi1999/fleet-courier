-- Store billing periods as dates so consolidation does not depend on invoice issue/trip dates.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS period_end DATE;

-- Backfill the common labels produced by the invoice form, including "May 2026"
-- and month ranges such as "May 2026 – June 2026".
WITH normalized AS (
  SELECT
    id,
    TRIM(period) AS label,
    regexp_split_to_array(TRIM(period), '\s+(?:-|–|—)\s+') AS parts
  FROM invoices
  WHERE period IS NOT NULL
    AND (period_start IS NULL OR period_end IS NULL)
),
parsed AS (
  SELECT
    id,
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
    END AS parsed_end
  FROM normalized
)
UPDATE invoices i
SET
  period_start = COALESCE(i.period_start, parsed.parsed_start),
  period_end = COALESCE(i.period_end, parsed.parsed_end)
FROM parsed
WHERE i.id = parsed.id
  AND (parsed.parsed_start IS NOT NULL OR parsed.parsed_end IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_invoices_billing_period
  ON invoices (period_start, period_end);
