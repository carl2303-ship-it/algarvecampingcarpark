-- Fourth zone: premium sea view without electricity
INSERT INTO zones (name, slug, capacity, description, description_en, amenities, sort_order)
SELECT
  'Premium Sem Eletricidade',
  'premium-sem-eletricidade',
  GREATEST((SELECT COUNT(*)::int FROM pitch_map_spots WHERE panoramic AND NOT electric), 1),
  'Lugares premium com vista para o mar, sem ligação elétrica.',
  'Premium sea-view pitches without electric hook-up.',
  '["water", "waste", "sea_view"]'::jsonb,
  4
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE slug = 'premium-sem-eletricidade');

-- Rebalance capacity: move panoramic no-electric spots out of sem-eletricidade
UPDATE zones
SET capacity = GREATEST(
  capacity - (SELECT COUNT(*)::int FROM pitch_map_spots WHERE panoramic AND NOT electric),
  0
)
WHERE slug = 'sem-eletricidade';

UPDATE pitch_map_spots
SET zone_slug = 'premium-sem-eletricidade'
WHERE panoramic AND NOT electric;

UPDATE pitches p
SET zone_id = (SELECT id FROM zones WHERE slug = 'premium-sem-eletricidade' LIMIT 1)
FROM pitch_map_spots s
WHERE p.code = s.code
  AND s.zone_slug = 'premium-sem-eletricidade';

-- Mirror pricing from premium with electricity (adjust in admin if needed)
INSERT INTO zone_rates (
  zone_id,
  start_date,
  end_date,
  price_cents_per_night,
  price_cents_3_4_guests,
  min_nights,
  season
)
SELECT
  nz.id,
  zr.start_date,
  zr.end_date,
  zr.price_cents_per_night,
  zr.price_cents_3_4_guests,
  zr.min_nights,
  zr.season
FROM zone_rates zr
JOIN zones oz ON oz.id = zr.zone_id AND oz.slug = 'premium-vista-mar'
JOIN zones nz ON nz.slug = 'premium-sem-eletricidade'
WHERE NOT EXISTS (
  SELECT 1
  FROM zone_rates existing
  WHERE existing.zone_id = nz.id
    AND existing.start_date = zr.start_date
    AND existing.end_date = zr.end_date
);
