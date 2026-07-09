-- Admin manual reservations: pitch code and payment tracking
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS pitch_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  ADD COLUMN IF NOT EXISTS partial_payment_cents INTEGER NOT NULL DEFAULT 0 CHECK (partial_payment_cents >= 0),
  ADD COLUMN IF NOT EXISTS partial_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
