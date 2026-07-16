-- Resend / email credentials (admin-only; server reads via service role)
CREATE TABLE IF NOT EXISTS email_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  resend_api_key TEXT,
  email_from TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO email_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage email settings" ON email_settings;
CREATE POLICY "Admin manage email settings"
  ON email_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
