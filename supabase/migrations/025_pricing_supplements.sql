-- Configurable nightly pricing supplements (system + custom)

CREATE TABLE IF NOT EXISTS pricing_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name_pt TEXT NOT NULL,
  name_en TEXT,
  description_pt TEXT,
  description_en TEXT,
  amount_cents_per_night INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents_per_night >= 0),
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN (
      'extra_guest',
      'motorhome_over_9m',
      'electricity_10a',
      'manual_per_night'
    )
  ),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  applies_online BOOLEAN NOT NULL DEFAULT true,
  applies_admin BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS manual_supplement_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON TABLE pricing_supplements IS
  'Nightly surcharges applied automatically or selected manually on reservations.';
COMMENT ON COLUMN reservations.manual_supplement_ids IS
  'IDs of manual_per_night supplements selected on admin reservations.';

DROP TRIGGER IF EXISTS pricing_supplements_updated_at ON pricing_supplements;
CREATE TRIGGER pricing_supplements_updated_at BEFORE UPDATE ON pricing_supplements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pricing_supplements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active pricing supplements" ON pricing_supplements;
CREATE POLICY "Public read active pricing supplements"
  ON pricing_supplements FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Admin manage pricing supplements" ON pricing_supplements;
CREATE POLICY "Admin manage pricing supplements"
  ON pricing_supplements FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

INSERT INTO pricing_supplements (
  slug,
  name_pt,
  name_en,
  description_pt,
  description_en,
  amount_cents_per_night,
  trigger_type,
  trigger_config,
  is_system,
  applies_online,
  applies_admin,
  sort_order
)
SELECT
  v.slug,
  v.name_pt,
  v.name_en,
  v.description_pt,
  v.description_en,
  v.amount_cents,
  v.trigger_type,
  v.trigger_config::jsonb,
  true,
  true,
  true,
  v.sort_order
FROM (
  VALUES
    (
      'extra_guest',
      'Pessoa extra (a partir da 5ª)',
      'Extra guest (from 5th)',
      'Suplemento por pessoa por noite acima de 4 pessoas.',
      'Per-guest nightly surcharge above 4 guests.',
      COALESCE((SELECT extra_guest_cents_per_night FROM park_settings WHERE id = true LIMIT 1), 150),
      'extra_guest',
      '{"guest_threshold": 4}',
      1
    ),
    (
      'motorhome_over_9m',
      'Camping-car +9 m',
      'Motorhome +9 m',
      'Suplemento por noite para veículos com mais de 9 metros.',
      'Nightly surcharge for vehicles over 9 metres.',
      COALESCE((SELECT long_motorhome_cents_per_night FROM park_settings WHERE id = true LIMIT 1), 200),
      'motorhome_over_9m',
      '{}',
      2
    ),
    (
      'electricity_10a',
      'Eletricidade 10A',
      '10A electricity',
      'Suplemento por noite quando se escolhe 10A.',
      'Nightly surcharge when 10A hook-up is selected.',
      COALESCE((SELECT electricity_10a_surcharge_cents_per_night FROM park_settings WHERE id = true LIMIT 1), 50),
      'electricity_10a',
      '{}',
      3
    )
) AS v(slug, name_pt, name_en, description_pt, description_en, amount_cents, trigger_type, trigger_config, sort_order)
ON CONFLICT (slug) DO NOTHING;
