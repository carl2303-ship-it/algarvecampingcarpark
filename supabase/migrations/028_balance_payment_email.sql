-- Balance payment reminder (~48h before check-in)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS balance_payment_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN reservations.balance_payment_email_sent_at IS
  'When the Stripe balance-payment link email was sent (~48h before check-in).';
