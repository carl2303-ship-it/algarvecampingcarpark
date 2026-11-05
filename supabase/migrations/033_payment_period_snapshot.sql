-- Freeze the stay period covered by each payment at payment time.
-- Changing reservation check_in/check_out must not rewrite past payment rows.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS period_check_in DATE,
  ADD COLUMN IF NOT EXISTS period_check_out DATE;

COMMENT ON COLUMN payments.period_check_in IS
  'Stay period start covered by this payment (snapshot at payment time).';
COMMENT ON COLUMN payments.period_check_out IS
  'Stay period end covered by this payment (snapshot at payment time).';

-- Backfill existing rows from the current reservation dates (best available snapshot).
UPDATE payments p
SET
  period_check_in = r.check_in,
  period_check_out = r.check_out
FROM reservations r
WHERE p.reservation_id = r.id
  AND (p.period_check_in IS NULL OR p.period_check_out IS NULL);
