-- Three pitch types: com-eletricidade, sem-eletricidade, adaptada-9m
-- Remove premium zones; add electricity distance per pitch

ALTER TABLE pitch_map_spots
  ADD COLUMN IF NOT EXISTS electricity_distance_m NUMERIC(6,1);

-- New zone for pitches adapted to motorhomes over 9 m
INSERT INTO zones (name, slug, capacity, description, description_en, amenities, sort_order, active)
SELECT
  'Adaptada +9m',
  'adaptada-9m',
  1,
  'Lugares adaptados para autocaravanas com mais de 9 metros.',
  'Pitches adapted for motorhomes over 9 metres.',
  '["electricity", "water", "waste"]'::jsonb,
  3,
  true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE slug = 'adaptada-9m');

-- Mirror pricing from com-eletricidade
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
JOIN zones oz ON oz.id = zr.zone_id AND oz.slug = 'com-eletricidade'
JOIN zones nz ON nz.slug = 'adaptada-9m'
WHERE NOT EXISTS (
  SELECT 1
  FROM zone_rates existing
  WHERE existing.zone_id = nz.id
    AND existing.start_date = zr.start_date
    AND existing.end_date = zr.end_date
);

-- Migrate premium spots into standard types
UPDATE pitch_map_spots
SET
  zone_slug = 'com-eletricidade',
  panoramic = false,
  electric = true,
  category = 'standard'
WHERE zone_slug = 'premium-vista-mar'
   OR (panoramic = true AND electric = true);

UPDATE pitch_map_spots
SET
  zone_slug = 'sem-eletricidade',
  panoramic = false,
  electric = false,
  category = 'sem_eletricidade'
WHERE zone_slug = 'premium-sem-eletricidade'
   OR (panoramic = true AND electric = false);

UPDATE pitch_map_spots
SET panoramic = false
WHERE panoramic = true;

-- Point inventory pitches at non-premium zones
UPDATE pitches p
SET zone_id = z.id
FROM pitch_map_spots s
JOIN zones z ON z.slug = COALESCE(s.zone_slug, CASE WHEN s.electric THEN 'com-eletricidade' ELSE 'sem-eletricidade' END)
WHERE p.code = s.code
  AND p.zone_id IN (SELECT id FROM zones WHERE slug IN ('premium-vista-mar', 'premium-sem-eletricidade'));

-- Deactivate premium zones (keep history; hide from booking)
UPDATE zones
SET active = false
WHERE slug IN ('premium-vista-mar', 'premium-sem-eletricidade');

-- Recompute capacities for the three active pitch-map zones
UPDATE zones z
SET capacity = GREATEST(
  (SELECT COUNT(*)::int FROM pitch_map_spots s WHERE s.zone_slug = z.slug),
  1
)
WHERE z.slug IN ('com-eletricidade', 'sem-eletricidade', 'adaptada-9m');
