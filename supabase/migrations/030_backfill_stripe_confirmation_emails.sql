-- Backfill historique e-mails: confirmation + reçu après paiement Stripe
-- (approximation: horodatage du paiement Stripe réussi)

INSERT INTO reservation_emails (reservation_id, email_type, sent_to, subject, created_at)
SELECT
  r.id,
  'confirmation',
  COALESCE(NULLIF(r.guest_email, ''), 'inconnu'),
  NULL,
  p.first_paid_at
FROM reservations r
INNER JOIN LATERAL (
  SELECT MIN(created_at) AS first_paid_at
  FROM payments
  WHERE reservation_id = r.id
    AND status = 'succeeded'
    AND payment_method = 'stripe'
) p ON p.first_paid_at IS NOT NULL
WHERE r.status IN ('confirmed', 'checked_in', 'checked_out')
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_emails re
    WHERE re.reservation_id = r.id
      AND re.email_type = 'confirmation'
  );

INSERT INTO reservation_emails (reservation_id, email_type, sent_to, subject, created_at)
SELECT
  r.id,
  'payment_receipt',
  COALESCE(NULLIF(r.guest_email, ''), 'inconnu'),
  NULL,
  pay.created_at
FROM payments pay
JOIN reservations r ON r.id = pay.reservation_id
WHERE pay.status = 'succeeded'
  AND pay.payment_method = 'stripe'
  AND r.status IN ('confirmed', 'checked_in', 'checked_out')
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_emails re
    WHERE re.reservation_id = r.id
      AND re.email_type = 'payment_receipt'
      AND re.created_at = pay.created_at
  );
