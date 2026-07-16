-- +9m is a pitch attribute, not a pricing zone.
-- Pricing zones remain: com-eletricidade / sem-eletricidade.

alter table public.pitch_map_spots
  add column if not exists over_9m boolean not null default false;

comment on column public.pitch_map_spots.over_9m is
  'Long pitch (+9 m). Pricing uses electricity zone only.';

-- Migrate former adaptada-9m spots onto electricity-based zones
update public.pitch_map_spots
set
  over_9m = true,
  zone_slug = case
    when electric then 'com-eletricidade'
    else 'sem-eletricidade'
  end
where zone_slug = 'adaptada-9m';

-- Remove dedicated +9m tariffs (same price as -9m electricity zones)
delete from public.zone_rates
where zone_id in (select id from public.zones where slug = 'adaptada-9m');

-- Hide adaptada-9m from booking/pricing (keep row for history if referenced)
update public.zones
set active = false,
    updated_at = now()
where slug = 'adaptada-9m';
