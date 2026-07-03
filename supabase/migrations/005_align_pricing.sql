-- Align zone_rates with public pricing (August / Summer / Low, 2 vs 3-4 guests)

ALTER TABLE zone_rates
  ADD COLUMN IF NOT EXISTS price_cents_3_4_guests INTEGER;

ALTER TABLE zone_rates DROP CONSTRAINT IF EXISTS zone_rates_season_check;

ALTER TABLE zone_rates
  ADD CONSTRAINT zone_rates_season_check
  CHECK (season IN ('august', 'summer', 'low', 'winter'));

DELETE FROM zone_rates;

-- Helper: insert rates for one calendar year (non-overlapping periods)
CREATE OR REPLACE FUNCTION seed_pricing_year(p_year INTEGER) RETURNS void AS $$
DECLARE
  z_electric UUID;
  z_no_electric UUID;
  z_premium UUID;
BEGIN
  SELECT id INTO z_electric FROM zones WHERE slug = 'com-eletricidade';
  SELECT id INTO z_no_electric FROM zones WHERE slug = 'sem-eletricidade';
  SELECT id INTO z_premium FROM zones WHERE slug = 'premium-vista-mar';

  -- Low: 01/01 — 14/06
  INSERT INTO zone_rates (zone_id, start_date, end_date, price_cents_per_night, price_cents_3_4_guests, min_nights, season) VALUES
    (z_electric, make_date(p_year, 1, 1), make_date(p_year, 6, 14), 1250, 1450, 1, 'low'),
    (z_no_electric, make_date(p_year, 1, 1), make_date(p_year, 6, 14), 900, 1100, 1, 'low'),
    (z_premium, make_date(p_year, 1, 1), make_date(p_year, 6, 14), 1350, 1550, 1, 'low');

  -- Summer: 15/06 — 31/07
  INSERT INTO zone_rates (zone_id, start_date, end_date, price_cents_per_night, price_cents_3_4_guests, min_nights, season) VALUES
    (z_electric, make_date(p_year, 6, 15), make_date(p_year, 7, 31), 1350, 1550, 1, 'summer'),
    (z_no_electric, make_date(p_year, 6, 15), make_date(p_year, 7, 31), 1000, 1200, 1, 'summer'),
    (z_premium, make_date(p_year, 6, 15), make_date(p_year, 7, 31), 1450, 1650, 1, 'summer');

  -- August: 01/08 — 31/08
  INSERT INTO zone_rates (zone_id, start_date, end_date, price_cents_per_night, price_cents_3_4_guests, min_nights, season) VALUES
    (z_electric, make_date(p_year, 8, 1), make_date(p_year, 8, 31), 1450, 1650, 1, 'august'),
    (z_no_electric, make_date(p_year, 8, 1), make_date(p_year, 8, 31), 1100, 1300, 1, 'august'),
    (z_premium, make_date(p_year, 8, 1), make_date(p_year, 8, 31), 1550, 1750, 1, 'august');

  -- Summer: 01/09 — 15/09
  INSERT INTO zone_rates (zone_id, start_date, end_date, price_cents_per_night, price_cents_3_4_guests, min_nights, season) VALUES
    (z_electric, make_date(p_year, 9, 1), make_date(p_year, 9, 15), 1350, 1550, 1, 'summer'),
    (z_no_electric, make_date(p_year, 9, 1), make_date(p_year, 9, 15), 1000, 1200, 1, 'summer'),
    (z_premium, make_date(p_year, 9, 1), make_date(p_year, 9, 15), 1450, 1650, 1, 'summer');

  -- Low: 16/09 — 31/12
  INSERT INTO zone_rates (zone_id, start_date, end_date, price_cents_per_night, price_cents_3_4_guests, min_nights, season) VALUES
    (z_electric, make_date(p_year, 9, 16), make_date(p_year, 12, 31), 1250, 1450, 1, 'low'),
    (z_no_electric, make_date(p_year, 9, 16), make_date(p_year, 12, 31), 900, 1100, 1, 'low'),
    (z_premium, make_date(p_year, 9, 16), make_date(p_year, 12, 31), 1350, 1550, 1, 'low');
END;
$$ LANGUAGE plpgsql;

SELECT seed_pricing_year(2025);
SELECT seed_pricing_year(2026);
SELECT seed_pricing_year(2027);

DROP FUNCTION seed_pricing_year(INTEGER);

ALTER TABLE zone_rates
  ALTER COLUMN price_cents_3_4_guests SET NOT NULL;
