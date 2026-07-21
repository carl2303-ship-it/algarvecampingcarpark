-- Manual +9 m vehicle surcharge on admin reservations (independent of pitch type)

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS motorhome_over_9m BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN reservations.motorhome_over_9m IS
  'When true, apply long motorhome nightly surcharge (vehicle over 9 m), regardless of pitch.';
