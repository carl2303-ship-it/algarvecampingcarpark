-- Staff team chat + shared notepad (admin-only via is_admin())

create table if not exists public.staff_notepad (
  id boolean primary key default true check (id),
  body text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  updated_by_email text,
  updated_at timestamptz not null default now()
);

insert into public.staff_notepad (id, body)
values (true, '')
on conflict (id) do nothing;

create table if not exists public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_email text not null,
  author_name text,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists staff_messages_created_at_idx
  on public.staff_messages (created_at desc);

alter table public.staff_notepad enable row level security;
alter table public.staff_messages enable row level security;

drop policy if exists "Admins manage staff notepad" on public.staff_notepad;
create policy "Admins manage staff notepad"
  on public.staff_notepad
  for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "Admins manage staff messages" on public.staff_messages;
create policy "Admins manage staff messages"
  on public.staff_messages
  for all
  using (is_admin())
  with check (is_admin());

comment on table public.staff_notepad is 'Shared notepad for admin/staff team';
comment on table public.staff_messages is 'Internal chat messages between admin users';
