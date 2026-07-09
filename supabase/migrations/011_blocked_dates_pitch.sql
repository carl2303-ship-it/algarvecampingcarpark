-- Block dates per pitch (A1, B2…) instead of only by zone
ALTER TABLE blocked_dates
  ADD COLUMN IF NOT EXISTS pitch_code TEXT REFERENCES pitch_map_spots(code) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_blocked_dates_pitch ON blocked_dates(pitch_code, start_date, end_date);
