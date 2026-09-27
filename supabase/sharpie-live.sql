-- SHARPIE live code view (teacher-only).
-- Safe for a shared project: creates/updates only sharpie_* objects.
-- Run this in Supabase Dashboard -> SQL Editor -> New query.

create table if not exists public.sharpie_live_code (
  login text primary key references public.sharpie_students (login) on delete cascade,
  module text not null default 'final-bosses',
  detail text,
  code text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists sharpie_live_code_updated_idx on public.sharpie_live_code (updated_at desc);

alter table public.sharpie_live_code enable row level security;

-- Students write only their own row; the teacher reads every row.
drop policy if exists sharpie_live_code_read on public.sharpie_live_code;
create policy sharpie_live_code_read on public.sharpie_live_code
  for select to authenticated
  using (login = public.sharpie_login() or public.sharpie_is_teacher());

drop policy if exists sharpie_live_code_insert on public.sharpie_live_code;
create policy sharpie_live_code_insert on public.sharpie_live_code
  for insert to authenticated
  with check (login = public.sharpie_login());

drop policy if exists sharpie_live_code_update on public.sharpie_live_code;
create policy sharpie_live_code_update on public.sharpie_live_code
  for update to authenticated
  using (login = public.sharpie_login())
  with check (login = public.sharpie_login());

grant select, insert, update on public.sharpie_live_code to authenticated;

-- Push every change to subscribed clients (the teacher live view).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sharpie_live_code'
  ) then
    alter publication supabase_realtime add table public.sharpie_live_code;
  end if;
end $$;
