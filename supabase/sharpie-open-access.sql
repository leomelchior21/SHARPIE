-- SHARPIE open access. Run after sharpie-setup.sql and sharpie-mathler-survival.sql
-- in Supabase Dashboard -> SQL Editor -> New query. Safe to run more than once.
--
-- Students no longer sign in to Supabase Auth: they type their roster login
-- (firstnamelastname) and the site saves through these functions, which only
-- accept logins that exist in sharpie_students. The teacher still signs in to
-- read the whole class.

-- 1. Retire the live code view. Every keystroke used to upsert a row here and
--    Realtime decoded each write, which drained the project's Disk IO budget.
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sharpie_live_code'
  ) then
    alter publication supabase_realtime drop table public.sharpie_live_code;
  end if;
end $$;

drop table if exists public.sharpie_live_code;

-- 2. Progress. Merges the given codes into the row and only writes when
--    something actually changed, so repeated saves cost no Disk IO.
create or replace function public.sharpie_save_progress(
  p_login text,
  p_codes jsonb default '{}'::jsonb,
  p_current_boss integer default null,
  p_completed_bosses integer[] default null,
  p_xp integer default null,
  p_attempts jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.sharpie_students where login = p_login) then
    raise exception 'Unknown student';
  end if;
  if jsonb_typeof(coalesce(p_codes, '{}'::jsonb)) <> 'object'
    or pg_column_size(p_codes) > 262144
    or (p_attempts is not null and jsonb_typeof(p_attempts) <> 'object') then
    raise exception 'Invalid progress';
  end if;

  insert into public.sharpie_progress as saved (login, codes, current_boss, completed_bosses, xp, attempts)
  values (
    p_login,
    coalesce(p_codes, '{}'::jsonb),
    coalesce(p_current_boss, 1),
    coalesce(p_completed_bosses, '{}'),
    coalesce(p_xp, 0),
    coalesce(p_attempts, '{}'::jsonb)
  )
  on conflict (login) do update set
    codes = saved.codes || excluded.codes,
    current_boss = coalesce(p_current_boss, saved.current_boss),
    completed_bosses = coalesce(p_completed_bosses, saved.completed_bosses),
    xp = coalesce(p_xp, saved.xp),
    attempts = coalesce(p_attempts, saved.attempts),
    updated_at = now()
  where saved.codes || excluded.codes is distinct from saved.codes
    or coalesce(p_current_boss, saved.current_boss) is distinct from saved.current_boss
    or coalesce(p_completed_bosses, saved.completed_bosses) is distinct from saved.completed_bosses
    or coalesce(p_xp, saved.xp) is distinct from saved.xp
    or coalesce(p_attempts, saved.attempts) is distinct from saved.attempts;
end;
$$;

create or replace function public.sharpie_get_progress(p_login text)
returns table (current_boss integer, completed_bosses integer[], xp integer, codes jsonb, attempts jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select current_boss, completed_bosses, xp, codes, attempts
  from public.sharpie_progress
  where login = p_login;
$$;

revoke all on function public.sharpie_save_progress(text, jsonb, integer, integer[], integer, jsonb) from public;
revoke all on function public.sharpie_get_progress(text) from public;
grant execute on function public.sharpie_save_progress(text, jsonb, integer, integer[], integer, jsonb) to anon, authenticated;
grant execute on function public.sharpie_get_progress(text) to anon, authenticated;

-- 3. Module 04 (Mathler) scores and steps, by roster login.
grant select on public.sharpie_mathler_scores to anon;
drop policy if exists sharpie_mathler_scores_read on public.sharpie_mathler_scores;
create policy sharpie_mathler_scores_read on public.sharpie_mathler_scores
  for select to anon, authenticated using (true);

create or replace function public.sharpie_record_mathler_score(
  p_login text,
  p_score integer default 0,
  p_streak integer default 0,
  p_time_attack integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.sharpie_students%rowtype;
begin
  if p_score < 0 or p_score > 2000000000 or p_streak < 0 or p_streak > 2000000000
    or p_time_attack < 0 or p_time_attack > 2000000000 then
    raise exception 'Invalid mathler score';
  end if;

  select * into student_row from public.sharpie_students where login = p_login;
  if not found then
    raise exception 'Unknown student';
  end if;

  insert into public.sharpie_mathler_scores as saved
    (login, display_name, class_code, best_score, best_streak, time_attack_best)
  values
    (student_row.login, student_row.display_name, student_row.class_code, p_score, p_streak, p_time_attack)
  on conflict (login) do update set
    best_score = greatest(saved.best_score, excluded.best_score),
    best_streak = greatest(saved.best_streak, excluded.best_streak),
    time_attack_best = greatest(saved.time_attack_best, excluded.time_attack_best),
    updated_at = now()
  where excluded.best_score > saved.best_score
    or excluded.best_streak > saved.best_streak
    or excluded.time_attack_best > saved.time_attack_best;
end;
$$;

create or replace function public.sharpie_record_mathler_steps(
  p_login text,
  p_warmup integer,
  p_rush_completed boolean,
  p_rush_rounds integer,
  p_target integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.sharpie_students%rowtype;
begin
  if p_warmup < 0 or p_warmup > 1000
    or p_rush_rounds < 0 or p_rush_rounds > 100
    or p_target < 0 or p_target > 1000 then
    raise exception 'Invalid mathler progress';
  end if;

  select * into student_row from public.sharpie_students where login = p_login;
  if not found then
    raise exception 'Unknown student';
  end if;

  insert into public.sharpie_mathler_progress as saved
    (login, display_name, class_code, warmup_solved, rush_completed, rush_rounds, target_completed)
  values
    (student_row.login, student_row.display_name, student_row.class_code, p_warmup, p_rush_completed, p_rush_rounds, p_target)
  on conflict (login) do update set
    warmup_solved = greatest(saved.warmup_solved, excluded.warmup_solved),
    rush_completed = saved.rush_completed or excluded.rush_completed,
    rush_rounds = greatest(saved.rush_rounds, excluded.rush_rounds),
    target_completed = greatest(saved.target_completed, excluded.target_completed),
    updated_at = now()
  where excluded.warmup_solved > saved.warmup_solved
    or (excluded.rush_completed and not saved.rush_completed)
    or excluded.rush_rounds > saved.rush_rounds
    or excluded.target_completed > saved.target_completed;
end;
$$;

revoke all on function public.sharpie_record_mathler_score(text, integer, integer, integer) from public;
revoke all on function public.sharpie_record_mathler_steps(text, integer, boolean, integer, integer) from public;
grant execute on function public.sharpie_record_mathler_score(text, integer, integer, integer) to anon, authenticated;
grant execute on function public.sharpie_record_mathler_steps(text, integer, boolean, integer, integer) to anon, authenticated;
