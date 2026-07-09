-- Panoramic without electricity belongs in sem-eletricidade, not premium
UPDATE pitch_map_spots
SET zone_slug = CASE
  WHEN panoramic AND electric THEN 'premium-vista-mar'
  WHEN NOT electric THEN 'sem-eletricidade'
  ELSE 'com-eletricidade'
END
WHERE zone_slug IS NULL
   OR (panoramic AND NOT electric AND zone_slug = 'premium-vista-mar');
