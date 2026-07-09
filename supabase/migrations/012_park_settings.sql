-- Park-wide hours (reception, check-in, check-out)
CREATE TABLE IF NOT EXISTS park_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  reception_open TEXT NOT NULL DEFAULT '09:00' CHECK (reception_open ~ '^\d{2}:\d{2}$'),
  reception_close TEXT NOT NULL DEFAULT '18:00' CHECK (reception_close ~ '^\d{2}:\d{2}$'),
  check_in_time TEXT NOT NULL DEFAULT '11:00' CHECK (check_in_time ~ '^\d{2}:\d{2}$'),
  check_out_time TEXT NOT NULL DEFAULT '11:00' CHECK (check_out_time ~ '^\d{2}:\d{2}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO park_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE park_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read park settings" ON park_settings;
CREATE POLICY "Public can read park settings"
  ON park_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage park settings" ON park_settings;
CREATE POLICY "Admin manage park settings"
  ON park_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
