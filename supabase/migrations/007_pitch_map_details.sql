-- Pitch map spot details: photo, dimensions, zone for booking
ALTER TABLE pitch_map_spots
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS width_m NUMERIC(5, 2) CHECK (width_m IS NULL OR width_m > 0),
  ADD COLUMN IF NOT EXISTS length_m NUMERIC(5, 2) CHECK (length_m IS NULL OR length_m > 0),
  ADD COLUMN IF NOT EXISTS zone_slug TEXT;

-- Backfill zone_slug from existing flags
UPDATE pitch_map_spots
SET zone_slug = CASE
  WHEN panoramic THEN 'premium-vista-mar'
  WHEN NOT electric THEN 'sem-eletricidade'
  ELSE 'com-eletricidade'
END
WHERE zone_slug IS NULL;

-- Storage bucket for pitch photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pitch-photos',
  'pitch-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read pitch photos storage" ON storage.objects;
CREATE POLICY "Public read pitch photos storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pitch-photos');

DROP POLICY IF EXISTS "Admin manage pitch photos storage" ON storage.objects;
CREATE POLICY "Admin manage pitch photos storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'pitch-photos' AND is_admin())
  WITH CHECK (bucket_id = 'pitch-photos' AND is_admin());
