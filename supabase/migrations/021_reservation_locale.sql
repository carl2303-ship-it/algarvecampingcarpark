-- Store the public site locale used when the guest booked (for emails).
alter table public.reservations
  add column if not exists locale text not null default 'pt'
  check (locale in ('pt', 'en', 'fr', 'de', 'es'));

comment on column public.reservations.locale is
  'Public site locale (pt|en|fr|de|es) used for guest-facing emails';
