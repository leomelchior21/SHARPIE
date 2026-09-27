-- SHARPIE classroom setup.
-- Project: imodobxbarcsjylvitxt
--
-- SAFE FOR A SHARED PROJECT:
--   * only creates/updates objects named sharpie_*;
--   * never touches other schemas, tables, functions or auth settings;
--   * safe to run more than once.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New query.

create table if not exists public.sharpie_students (
  login text primary key,
  display_name text not null,
  class_code text not null check (class_code in ('9A', '9B', '9C', '9D')),
  group_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.sharpie_progress (
  login text primary key references public.sharpie_students (login) on delete cascade,
  module text not null default 'final-bosses',
  current_boss int not null default 1,
  completed_bosses int[] not null default '{}',
  xp int not null default 0,
  codes jsonb not null default '{}'::jsonb,
  attempts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists sharpie_progress_updated_idx on public.sharpie_progress (updated_at desc);

-- The login is the local part of the signed-in account email.
create or replace function public.sharpie_login()
returns text
language sql
stable
as $$
  select split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1);
$$;

create or replace function public.sharpie_is_teacher()
returns boolean
language sql
stable
as $$
  select public.sharpie_login() = 'leleomaker';
$$;

alter table public.sharpie_students enable row level security;
alter table public.sharpie_progress enable row level security;

-- Students read only their own roster row; the teacher reads every row.
drop policy if exists sharpie_students_read on public.sharpie_students;
create policy sharpie_students_read on public.sharpie_students
  for select to authenticated
  using (login = public.sharpie_login() or public.sharpie_is_teacher());

drop policy if exists sharpie_progress_read on public.sharpie_progress;
create policy sharpie_progress_read on public.sharpie_progress
  for select to authenticated
  using (login = public.sharpie_login() or public.sharpie_is_teacher());

drop policy if exists sharpie_progress_insert on public.sharpie_progress;
create policy sharpie_progress_insert on public.sharpie_progress
  for insert to authenticated
  with check (login = public.sharpie_login());

drop policy if exists sharpie_progress_update on public.sharpie_progress;
create policy sharpie_progress_update on public.sharpie_progress
  for update to authenticated
  using (login = public.sharpie_login())
  with check (login = public.sharpie_login());

grant usage on schema public to authenticated;
grant select on public.sharpie_students to authenticated;
grant select, insert, update on public.sharpie_progress to authenticated;
