-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE reservation_status AS ENUM (
  'pending_payment',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'expired'
);

CREATE TYPE pitch_status AS ENUM ('available', 'occupied', 'maintenance');

CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- Zones
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  description TEXT,
  description_en TEXT,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Zone rates (seasonal pricing)
CREATE TABLE zone_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_cents_per_night INTEGER NOT NULL CHECK (price_cents_per_night >= 0),
  min_nights INTEGER NOT NULL DEFAULT 1 CHECK (min_nights >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_zone_rates_zone_dates ON zone_rates(zone_id, start_date, end_date);

-- Physical pitches (assigned at check-in)
CREATE TABLE pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status pitch_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(zone_id, code)
);

CREATE INDEX idx_pitches_zone ON pitches(zone_id);

-- Blocked dates (maintenance, seasonal closure)
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_blocked_dates_zone ON blocked_dates(zone_id, start_date, end_date);

-- Reservations
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id),
  pitch_id UUID REFERENCES pitches(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending_payment',
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  vehicle_plate TEXT,
  num_guests INTEGER NOT NULL DEFAULT 2 CHECK (num_guests >= 1),
  notes TEXT,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  expires_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX idx_reservations_zone_dates ON reservations(zone_id, check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_stripe_session ON reservations(stripe_session_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_reservation ON payments(reservation_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_updated_at BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Count overlapping active reservations for a zone
CREATE OR REPLACE FUNCTION count_zone_bookings(
  p_zone_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  booking_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO booking_count
  FROM reservations r
  WHERE r.zone_id = p_zone_id
    AND r.status IN ('pending_payment', 'confirmed', 'checked_in')
    AND (p_exclude_reservation_id IS NULL OR r.id != p_exclude_reservation_id)
    AND (p_exclude_reservation_id IS NULL OR r.status != 'pending_payment' OR r.expires_at > now())
    AND r.check_in < p_check_out
    AND r.check_out > p_check_in;

  RETURN booking_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check zone availability
CREATE OR REPLACE FUNCTION get_zone_availability(
  p_zone_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS INTEGER AS $$
DECLARE
  zone_cap INTEGER;
  bookings INTEGER;
  blocked INTEGER;
BEGIN
  SELECT capacity INTO zone_cap FROM zones WHERE id = p_zone_id AND active = true;
  IF zone_cap IS NULL THEN RETURN 0; END IF;

  bookings := count_zone_bookings(p_zone_id, p_check_in, p_check_out);

  SELECT COUNT(*)::INTEGER INTO blocked
  FROM blocked_dates bd
  WHERE (bd.zone_id = p_zone_id OR bd.zone_id IS NULL)
    AND bd.start_date < p_check_out
    AND bd.end_date > p_check_in;

  IF blocked > 0 THEN RETURN 0; END IF;

  RETURN GREATEST(0, zone_cap - bookings);
END;
$$ LANGUAGE plpgsql STABLE;

-- Expire stale pending payments
CREATE OR REPLACE FUNCTION expire_pending_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE reservations
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending_payment'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Public read active zones
CREATE POLICY "Public can read active zones"
  ON zones FOR SELECT
  USING (active = true);

-- Admin full access zones
CREATE POLICY "Admin manage zones"
  ON zones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Public read zone rates for active zones
CREATE POLICY "Public can read zone rates"
  ON zone_rates FOR SELECT
  USING (EXISTS (SELECT 1 FROM zones z WHERE z.id = zone_id AND z.active = true));

CREATE POLICY "Admin manage zone rates"
  ON zone_rates FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Pitches: admin only
CREATE POLICY "Admin manage pitches"
  ON pitches FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Blocked dates: admin only
CREATE POLICY "Admin manage blocked dates"
  ON blocked_dates FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reservations: admin full access
CREATE POLICY "Admin manage reservations"
  ON reservations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Payments: admin only
CREATE POLICY "Admin manage payments"
  ON payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
