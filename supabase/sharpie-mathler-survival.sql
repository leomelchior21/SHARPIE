-- Run after sharpie-setup.sql in the Supabase SQL editor.
create table if not exists public.sharpie_mathler_scores (
  login text primary key references public.sharpie_students (login) on delete cascade,
  display_name text not null,
  class_code text not null,
  best_score integer not null default 0 check (best_score >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  time_attack_best integer not null default 0 check (time_attack_best >= 0),
  updated_at timestamptz not null default now()
);

alter table public.sharpie_mathler_scores
  add column if not exists time_attack_best integer not null default 0 check (time_attack_best >= 0);

create index if not exists sharpie_mathler_scores_rank_idx
  on public.sharpie_mathler_scores (best_streak desc, best_score desc);

create index if not exists sharpie_mathler_time_attack_rank_idx
  on public.sharpie_mathler_scores (time_attack_best desc);

alter table public.sharpie_mathler_scores enable row level security;

drop policy if exists sharpie_mathler_scores_read on public.sharpie_mathler_scores;
create policy sharpie_mathler_scores_read on public.sharpie_mathler_scores
  for select to authenticated using (true);

grant select on public.sharpie_mathler_scores to authenticated;

create or replace function public.sharpie_record_mathler_survival(p_score integer, p_streak integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.sharpie_students%rowtype;
begin
  if auth.uid() is null or p_score < 0 or p_score > 2000000000 or p_streak < 0 or p_streak > 2000000000 then
    raise exception 'Invalid survival score';
  end if;

  select * into student_row from public.sharpie_students
  where login = public.sharpie_login();
  if not found then
    raise exception 'Student account not found';
  end if;

  insert into public.sharpie_mathler_scores
    (login, display_name, class_code, best_score, best_streak)
  values
    (student_row.login, student_row.display_name, student_row.class_code, p_score, p_streak)
  on conflict (login) do update set
    display_name = excluded.display_name,
    class_code = excluded.class_code,
    best_score = greatest(public.sharpie_mathler_scores.best_score, excluded.best_score),
    best_streak = greatest(public.sharpie_mathler_scores.best_streak, excluded.best_streak),
    updated_at = now();
end;
$$;

revoke all on function public.sharpie_record_mathler_survival(integer, integer) from public;
grant execute on function public.sharpie_record_mathler_survival(integer, integer) to authenticated;

create or replace function public.sharpie_record_mathler_time_attack(p_correct integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.sharpie_students%rowtype;
begin
  if auth.uid() is null or p_correct < 0 or p_correct > 2000000000 then
    raise exception 'Invalid time attack score';
  end if;

  select * into student_row from public.sharpie_students
  where login = public.sharpie_login();
  if not found then
    raise exception 'Student account not found';
  end if;

  insert into public.sharpie_mathler_scores
    (login, display_name, class_code, time_attack_best)
  values
    (student_row.login, student_row.display_name, student_row.class_code, p_correct)
  on conflict (login) do update set
    display_name = excluded.display_name,
    class_code = excluded.class_code,
    time_attack_best = greatest(public.sharpie_mathler_scores.time_attack_best, excluded.time_attack_best),
    updated_at = now();
end;
$$;

revoke all on function public.sharpie_record_mathler_time_attack(integer) from public;
grant execute on function public.sharpie_record_mathler_time_attack(integer) to authenticated;
