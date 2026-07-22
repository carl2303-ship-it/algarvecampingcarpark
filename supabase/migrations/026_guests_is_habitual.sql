-- Flag for regular / habitual guests (CRM)
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS is_habitual BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_guests_vehicle_plate ON guests (vehicle_plate)
  WHERE vehicle_plate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guests_is_habitual ON guests (is_habitual)
  WHERE is_habitual = true;
