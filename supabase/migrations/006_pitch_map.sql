-- Pitch map layout (aerial photo overlay positions)
CREATE TABLE IF NOT EXISTS pitch_map_spots (
  code TEXT PRIMARY KEY,
  x NUMERIC(5, 2) NOT NULL CHECK (x >= 0 AND x <= 100),
  y NUMERIC(5, 2) NOT NULL CHECK (y >= 0 AND y <= 100),
  panoramic BOOLEAN NOT NULL DEFAULT false,
  electric BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS pitch_map_spots_updated_at ON pitch_map_spots;
CREATE TRIGGER pitch_map_spots_updated_at BEFORE UPDATE ON pitch_map_spots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pitch_map_spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read pitch map spots" ON pitch_map_spots;
CREATE POLICY "Public can read pitch map spots"
  ON pitch_map_spots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage pitch map spots" ON pitch_map_spots;
CREATE POLICY "Admin manage pitch map spots"
  ON pitch_map_spots FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Default layout from hand-drawn plan (initial estimate; editable in admin)
INSERT INTO pitch_map_spots (code, x, y, panoramic, electric, sort_order) VALUES
  ('A1', 7.00, 10.50, false, true, 1),
  ('A2', 11.12, 10.50, false, true, 2),
  ('A3', 15.25, 10.50, false, true, 3),
  ('A4', 19.38, 10.50, false, true, 4),
  ('A5', 23.50, 10.50, false, true, 5),
  ('A6', 27.62, 10.50, false, true, 6),
  ('A7', 31.75, 10.50, false, true, 7),
  ('A8', 35.88, 10.50, false, true, 8),
  ('A9', 40.00, 10.50, false, true, 9),
  ('B1', 42.50, 10.50, false, true, 10),
  ('B2', 46.00, 10.50, false, true, 11),
  ('B3', 49.50, 10.50, false, true, 12),
  ('B4', 53.00, 10.50, false, true, 13),
  ('B5', 56.50, 10.50, false, true, 14),
  ('C1', 68.00, 8.50, false, true, 15),
  ('C2', 74.00, 8.50, false, true, 16),
  ('C3', 80.00, 8.50, false, true, 17),
  ('A10', 5.00, 23.50, true, true, 18),
  ('A11', 9.83, 23.50, true, true, 19),
  ('A12', 14.67, 23.50, true, true, 20),
  ('A13', 19.50, 23.50, true, true, 21),
  ('A14', 24.33, 23.50, true, true, 22),
  ('A15', 29.17, 23.50, true, true, 23),
  ('A16', 34.00, 23.50, true, true, 24),
  ('B6', 36.50, 23.50, true, true, 25),
  ('B7', 40.67, 23.50, true, true, 26),
  ('B8', 44.83, 23.50, true, true, 27),
  ('B9', 49.00, 23.50, true, true, 28),
  ('C4', 66.00, 23.50, false, true, 29),
  ('C5', 72.00, 23.50, false, true, 30),
  ('C6', 78.00, 23.50, false, true, 31),
  ('E1', 5.00, 31.00, false, true, 32),
  ('E2', 9.50, 31.00, false, true, 33),
  ('E3', 14.00, 31.00, false, true, 34),
  ('E4', 18.50, 31.00, false, true, 35),
  ('E5', 23.00, 31.00, false, true, 36),
  ('E6', 27.50, 31.00, false, true, 37),
  ('E7', 32.00, 31.00, false, true, 38),
  ('D1', 35.00, 31.00, false, true, 39),
  ('D2', 39.50, 31.00, false, true, 40),
  ('D3', 44.00, 31.00, false, true, 41),
  ('D7', 50.50, 31.00, false, true, 42),
  ('C7', 66.00, 31.00, false, true, 43),
  ('C8', 72.00, 31.00, false, true, 44),
  ('C9', 78.00, 31.00, false, true, 45),
  ('E8', 5.00, 41.50, false, true, 46),
  ('E9', 10.00, 41.50, false, true, 47),
  ('E10', 15.00, 41.50, false, true, 48),
  ('E11', 20.00, 41.50, false, true, 49),
  ('E12', 25.00, 41.50, false, true, 50),
  ('E13', 30.00, 41.50, false, true, 51),
  ('D4', 34.50, 41.50, true, true, 52),
  ('D5', 40.50, 41.50, true, true, 53),
  ('D6', 46.50, 41.50, true, true, 54),
  ('F3', 36.00, 49.50, false, true, 55),
  ('F2', 41.00, 49.50, false, true, 56),
  ('F1', 46.00, 49.50, false, true, 57),
  ('F8', 8.00, 62.50, false, true, 58),
  ('F7', 14.25, 62.50, false, true, 59),
  ('F6', 20.50, 62.50, false, true, 60),
  ('F5', 26.75, 62.50, false, true, 61),
  ('F4', 33.00, 62.50, false, true, 62)
ON CONFLICT (code) DO NOTHING;
