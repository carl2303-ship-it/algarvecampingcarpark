-- Historique des e-mails envoyés par réservation
CREATE TABLE IF NOT EXISTS reservation_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (
    email_type = ANY (
      ARRAY[
        'confirmation'::text,
        'balance_payment'::text,
        'pre_arrival'::text,
        'payment_receipt'::text,
        'extension_link'::text
      ]
    )
  ),
  sent_to TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_emails_reservation_created
  ON reservation_emails (reservation_id, created_at DESC);

ALTER TABLE reservation_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage reservation emails" ON reservation_emails;
CREATE POLICY "Admin manage reservation emails"
  ON reservation_emails FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Backfill depuis les timestamps existants
INSERT INTO reservation_emails (reservation_id, email_type, sent_to, subject, created_at)
SELECT
  r.id,
  'pre_arrival',
  COALESCE(NULLIF(r.guest_email, ''), 'inconnu'),
  NULL,
  r.pre_arrival_email_sent_at
FROM reservations r
WHERE r.pre_arrival_email_sent_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_emails re
    WHERE re.reservation_id = r.id
      AND re.email_type = 'pre_arrival'
  );

INSERT INTO reservation_emails (reservation_id, email_type, sent_to, subject, created_at)
SELECT
  r.id,
  'balance_payment',
  COALESCE(NULLIF(r.guest_email, ''), 'inconnu'),
  NULL,
  r.balance_payment_email_sent_at
FROM reservations r
WHERE r.balance_payment_email_sent_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_emails re
    WHERE re.reservation_id = r.id
      AND re.email_type = 'balance_payment'
  );
