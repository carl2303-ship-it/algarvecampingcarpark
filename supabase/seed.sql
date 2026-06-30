-- Seed zones (57 total capacity)
INSERT INTO zones (name, slug, capacity, description, description_en, amenities, sort_order) VALUES
(
  'Com Eletricidade',
  'com-eletricidade',
  30,
  'Lugares com ligação elétrica 16A. Ideal para estadias prolongadas.',
  'Pitches with 16A electric hook-up. Ideal for longer stays.',
  '["electricity", "water", "waste"]'::jsonb,
  1
),
(
  'Sem Eletricidade',
  'sem-eletricidade',
  17,
  'Lugares em ambiente natural, sem ligação elétrica.',
  'Natural setting pitches without electric hook-up.',
  '["water", "waste"]'::jsonb,
  2
),
(
  'Premium Vista Mar',
  'premium-vista-mar',
  10,
  'Lugares privilegiados com vista para o mar e eletricidade.',
  'Premium sea-view pitches with electricity.',
  '["electricity", "water", "waste", "sea_view"]'::jsonb,
  3
);

-- Default rates (year-round placeholder - adjust seasonally)
INSERT INTO zone_rates (zone_id, start_date, end_date, price_cents_per_night, min_nights)
SELECT id, '2025-01-01'::date, '2025-06-14'::date, 1800, 1 FROM zones WHERE slug = 'com-eletricidade'
UNION ALL
SELECT id, '2025-06-15'::date, '2025-09-15'::date, 2800, 2 FROM zones WHERE slug = 'com-eletricidade'
UNION ALL
SELECT id, '2025-09-16'::date, '2026-12-31'::date, 1800, 1 FROM zones WHERE slug = 'com-eletricidade'
UNION ALL
SELECT id, '2025-01-01'::date, '2025-06-14'::date, 1400, 1 FROM zones WHERE slug = 'sem-eletricidade'
UNION ALL
SELECT id, '2025-06-15'::date, '2025-09-15'::date, 2200, 2 FROM zones WHERE slug = 'sem-eletricidade'
UNION ALL
SELECT id, '2025-09-16'::date, '2026-12-31'::date, 1400, 1 FROM zones WHERE slug = 'sem-eletricidade'
UNION ALL
SELECT id, '2025-01-01'::date, '2025-06-14'::date, 2500, 1 FROM zones WHERE slug = 'premium-vista-mar'
UNION ALL
SELECT id, '2025-06-15'::date, '2025-09-15'::date, 3800, 2 FROM zones WHERE slug = 'premium-vista-mar'
UNION ALL
SELECT id, '2025-09-16'::date, '2026-12-31'::date, 2500, 1 FROM zones WHERE slug = 'premium-vista-mar';

-- Generate pitches per zone
INSERT INTO pitches (zone_id, code)
SELECT z.id, LPAD(s.n::text, 2, '0')
FROM zones z
CROSS JOIN generate_series(1, z.capacity) AS s(n)
ORDER BY z.sort_order, s.n;
