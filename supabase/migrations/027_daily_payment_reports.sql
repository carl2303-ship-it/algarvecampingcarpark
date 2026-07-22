-- Daily payment PDF reports (generated at 13:00 Lisbon)
CREATE TABLE IF NOT EXISTS daily_payment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  pdf_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_payment_reports_created
  ON daily_payment_reports (created_at DESC);

ALTER TABLE daily_payment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage daily payment reports" ON daily_payment_reports;
CREATE POLICY "Admin manage daily payment reports"
  ON daily_payment_reports FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
