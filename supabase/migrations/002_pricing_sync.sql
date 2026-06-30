-- Season label for pricing display grouping
ALTER TABLE zone_rates
  ADD COLUMN IF NOT EXISTS season TEXT CHECK (season IN ('summer', 'winter'));

UPDATE zone_rates SET season = 'summer'
WHERE start_date >= '2025-06-15' AND end_date <= '2025-09-15'
   OR (start_date >= '2026-06-15' AND end_date <= '2026-09-15');

UPDATE zone_rates SET season = 'winter' WHERE season IS NULL;

ALTER TABLE zone_rates ALTER COLUMN season SET NOT NULL;

-- Additional services (synced with public pricing page)
CREATE TABLE IF NOT EXISTS service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  price_cents INTEGER,
  price_label_pt TEXT,
  price_label_en TEXT,
  icon TEXT NOT NULL DEFAULT 'sparkles',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER service_items_updated_at BEFORE UPDATE ON service_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active service items"
  ON service_items FOR SELECT
  USING (active = true);

CREATE POLICY "Admin manage service items"
  ON service_items FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Default services
INSERT INTO service_items (name, name_en, description, description_en, price_cents, price_label_pt, price_label_en, icon, sort_order) VALUES
(
  'Eletricidade 16A',
  '16A electricity',
  'Incluída nas zonas com eletricidade',
  'Included in electric zones',
  NULL,
  'Incluído na zona',
  'Included in zone',
  'zap',
  1
),
(
  'Água potável',
  'Fresh water',
  'Acesso a água no parque',
  'Water access on site',
  NULL,
  'Incluído',
  'Included',
  'droplets',
  2
),
(
  'Esgotos',
  'Waste disposal',
  'Despejo de águas residuais',
  'Grey and black water disposal',
  NULL,
  'Incluído',
  'Included',
  'trash-2',
  3
),
(
  'Wi-Fi',
  'Wi-Fi',
  'Internet wireless no parque',
  'Wireless internet on site',
  NULL,
  'Gratuito',
  'Free',
  'wifi',
  4
);
