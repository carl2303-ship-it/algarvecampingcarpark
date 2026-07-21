-- Store chosen electricity intensity (6A or 10A) on reservations

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS electricity_amperage INTEGER
  CHECK (electricity_amperage IS NULL OR electricity_amperage IN (6, 10));

COMMENT ON COLUMN reservations.electricity_amperage IS
  'Chosen hook-up amperage when electricity is true; null when no electricity.';
