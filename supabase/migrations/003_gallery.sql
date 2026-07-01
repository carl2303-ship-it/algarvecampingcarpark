-- Gallery images (About page carousel)
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  src TEXT NOT NULL,
  title_pt TEXT NOT NULL,
  title_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS gallery_images_updated_at ON gallery_images;
CREATE TRIGGER gallery_images_updated_at BEFORE UPDATE ON gallery_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active gallery images" ON gallery_images;
CREATE POLICY "Public can read active gallery images"
  ON gallery_images FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Admin manage gallery images" ON gallery_images;
CREATE POLICY "Admin manage gallery images"
  ON gallery_images FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Storage bucket for gallery uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read gallery storage" ON storage.objects;
CREATE POLICY "Public read gallery storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Admin manage gallery storage" ON storage.objects;
CREATE POLICY "Admin manage gallery storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'gallery' AND is_admin())
  WITH CHECK (bucket_id = 'gallery' AND is_admin());

-- Seed existing gallery (public folder paths)
INSERT INTO gallery_images (src, title_pt, title_en, sort_order) VALUES
  ('/gallery/04-vista-mar.jpg', 'Vista aérea com mar e Armação de Pêra', 'Aerial view with sea and Armação de Pêra', 1),
  ('/gallery/03-vista-aerea.jpg', 'Vista aérea do parque', 'Aerial view of the park', 2),
  ('/gallery/01-parque-zonas.jpg', 'Zonas do parque entre a vegetação', 'Park zones among the vegetation', 3),
  ('/gallery/02-recepcao.jpg', 'Recepção do parque', 'Park reception', 4),
  ('/gallery/05-entrada.jpg', 'Entrada e serviços do parque', 'Park entrance and services', 5),
  ('/gallery/06-autocaravanas.jpg', 'Autocaravanas estacionadas no parque', 'Motorhomes parked at the park', 6),
  ('/gallery/07-caminhos.jpg', 'Caminhos e zona de convívio', 'Paths and social area', 7),
  ('/gallery/08-esplanada.jpg', 'Esplanada ao ar livre', 'Outdoor terrace', 8),
  ('/gallery/10-lounge.jpg', 'Zona de descanso exterior', 'Outdoor lounge area', 9),
  ('/gallery/09-acesso.jpg', 'Acesso ao parque', 'Park access road', 10)
ON CONFLICT DO NOTHING;
