-- Gate / barrier access code sent in booking confirmation emails
ALTER TABLE park_settings
  ADD COLUMN IF NOT EXISTS gate_access_code TEXT;
