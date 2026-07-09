-- Align data model: Guests + canonical pitches + booking extensions

CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  vehicle_plate TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS guests_updated_at ON guests;
CREATE TRIGGER guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_guests_email ON guests (lower(email));

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage guests" ON guests;
CREATE POLICY "Admin manage guests"
  ON guests FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Canonical pitch fields on pitch_map_spots (A1, B2…)
ALTER TABLE pitch_map_spots
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS max_amperage INTEGER NOT NULL DEFAULT 16 CHECK (max_amperage >= 0),
  ADD COLUMN IF NOT EXISTS status pitch_status NOT NULL DEFAULT 'available';

UPDATE pitch_map_spots
SET category = CASE
  WHEN panoramic AND electric THEN 'vista_mar'
  WHEN panoramic THEN 'panoramico'
  WHEN electric THEN 'standard'
  ELSE 'sem_eletricidade'
END
WHERE category IS NULL;

UPDATE pitch_map_spots
SET max_amperage = CASE
  WHEN electric THEN 16
  ELSE 0
END
WHERE max_amperage IS NULL OR max_amperage = 16 AND NOT electric;

-- Reservation extensions
DO $$ BEGIN
  CREATE TYPE booking_payment_status AS ENUM (
    'pending',
    'paid_stripe',
    'paid_manual',
    'partial',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS electricity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS operational_notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

-- Backfill guests from existing reservations
INSERT INTO guests (name, email, phone, vehicle_plate)
SELECT DISTINCT ON (lower(r.guest_email))
  r.guest_name,
  r.guest_email,
  r.guest_phone,
  r.vehicle_plate
FROM reservations r
WHERE r.guest_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM guests g WHERE lower(g.email) = lower(r.guest_email)
  )
ORDER BY lower(r.guest_email), r.created_at DESC;

UPDATE reservations r
SET guest_id = g.id
FROM guests g
WHERE lower(g.email) = lower(r.guest_email)
  AND r.guest_id IS NULL;

UPDATE reservations
SET payment_status = CASE
  WHEN status = 'cancelled' THEN 'refunded'
  WHEN paid_cents >= total_cents AND total_cents > 0 AND stripe_payment_intent_id IS NOT NULL THEN 'paid_stripe'
  WHEN paid_cents >= total_cents AND total_cents > 0 THEN 'paid_manual'
  WHEN paid_cents > 0 THEN 'partial'
  ELSE 'pending'
END
WHERE payment_status = 'pending';

UPDATE reservations r
SET electricity = COALESCE(
  (SELECT p.electric FROM pitch_map_spots p WHERE p.code = r.pitch_code),
  true
)
WHERE r.pitch_code IS NOT NULL;
