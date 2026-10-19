-- Habitual clients: hold pitch until admin checks out manually (no auto-checkout).

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS manual_checkout_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN reservations.manual_checkout_required IS
  'When true (Client Habituel), skip auto-checkout and keep the pitch occupied until staff checks out manually — even after the paid check_out date.';

CREATE INDEX IF NOT EXISTS idx_reservations_manual_checkout_hold
  ON reservations (pitch_code)
  WHERE manual_checkout_required = true
    AND status IN ('pending_payment', 'confirmed', 'checked_in');

-- Zone capacity: habitual stays still occupy a slot after paid check_out.
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
    AND (
      p_exclude_reservation_id IS NULL
      OR r.status != 'pending_payment'
      OR r.expires_at > now()
    )
    AND r.check_in < p_check_out
    AND (
      r.check_out > p_check_in
      OR COALESCE(r.manual_checkout_required, false) = true
    );

  RETURN booking_count;
END;
$$ LANGUAGE plpgsql STABLE;
