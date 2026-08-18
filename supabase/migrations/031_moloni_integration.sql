-- Moloni API credentials + cached IDs (admin-only; server reads via service role)
CREATE TABLE IF NOT EXISTS moloni_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  client_id TEXT,
  client_secret TEXT,
  username TEXT,
  password TEXT,
  company_id INTEGER,
  document_set_id INTEGER,
  payment_method_id INTEGER,
  tax_id_6 INTEGER,
  tax_id_23 INTEGER,
  consumer_customer_id INTEGER,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  product_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT false,
  close_documents BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO moloni_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE moloni_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage moloni settings" ON moloni_settings;
CREATE POLICY "Admin manage moloni settings"
  ON moloni_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS moloni_document_id INTEGER,
  ADD COLUMN IF NOT EXISTS moloni_document_ref TEXT,
  ADD COLUMN IF NOT EXISTS moloni_error TEXT,
  ADD COLUMN IF NOT EXISTS moloni_synced_at TIMESTAMPTZ;

COMMENT ON TABLE moloni_settings IS
  'Moloni API credentials and cached company/tax/product IDs for automatic invoice receipts.';
COMMENT ON COLUMN payments.moloni_document_id IS
  'Moloni invoice-receipt document_id after successful sync.';
