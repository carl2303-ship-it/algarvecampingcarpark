-- Stripe API credentials (admin-only; server reads via service role)
CREATE TABLE IF NOT EXISTS stripe_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  secret_key TEXT,
  publishable_key TEXT,
  webhook_secret TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO stripe_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE stripe_settings ENABLE ROW LEVEL SECURITY;

-- No public access — only admins via is_admin()
DROP POLICY IF EXISTS "Admin manage stripe settings" ON stripe_settings;
CREATE POLICY "Admin manage stripe settings"
  ON stripe_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
