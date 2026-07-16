-- Online booking window + pre-arrival email tracking

alter table public.park_settings
  add column if not exists online_booking_enabled boolean not null default false,
  add column if not exists online_booking_starts_at timestamptz,
  add column if not exists online_booking_ends_at timestamptz;

alter table public.reservations
  add column if not exists pre_arrival_email_sent_at timestamptz;

comment on column public.park_settings.online_booking_enabled is
  'Master switch for public online bookings';
comment on column public.park_settings.online_booking_starts_at is
  'Optional start of online booking window (inclusive)';
comment on column public.park_settings.online_booking_ends_at is
  'Optional end of online booking window (inclusive)';
comment on column public.reservations.pre_arrival_email_sent_at is
  'When the 24h pre-arrival email (pitch + gate code) was sent';
