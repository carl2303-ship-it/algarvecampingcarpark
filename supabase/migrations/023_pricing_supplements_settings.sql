-- Configurable pricing supplements in admin settings

ALTER TABLE park_settings
  ADD COLUMN IF NOT EXISTS extra_guest_cents_per_night INTEGER NOT NULL DEFAULT 150
    CHECK (extra_guest_cents_per_night >= 0),
  ADD COLUMN IF NOT EXISTS long_motorhome_cents_per_night INTEGER NOT NULL DEFAULT 200
    CHECK (long_motorhome_cents_per_night >= 0),
  ADD COLUMN IF NOT EXISTS electricity_10a_surcharge_cents_per_night INTEGER NOT NULL DEFAULT 50
    CHECK (electricity_10a_surcharge_cents_per_night >= 0);
