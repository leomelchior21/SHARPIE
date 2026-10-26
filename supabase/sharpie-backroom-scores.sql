-- Backrooms Run · The Deep top scores. Run after sharpie-setup.sql in the Supabase SQL editor.
-- The site is open (no login), so anyone can read the board and record a run under a typed name.
create table if not exists public.sharpie_backroom_scores (
  player_key text primary key check (char_length(player_key) between 1 and 64),
  display_name text not null check (char_length(display_name) between 1 and 24),
  gates integer not null default 0 check (gates >= 0),
  xp integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists sharpie_backroom_scores_rank_idx
  on public.sharpie_backroom_scores (gates desc, xp desc);

alter table public.sharpie_backroom_scores enable row level security;

drop policy if exists sharpie_backroom_scores_read on public.sharpie_backroom_scores;
create policy sharpie_backroom_scores_read on public.sharpie_backroom_scores
  for select to anon, authenticated using (true);

grant select on public.sharpie_backroom_scores to anon, authenticated;

-- Keeps each player's best gates and best XP; writes only go through this function.
create or replace function public.sharpie_record_backroom_score(p_key text, p_name text, p_gates integer, p_xp integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key is null or char_length(p_key) not between 1 and 64
    or p_name is null or char_length(btrim(p_name)) not between 1 and 24
    or p_gates < 1 or p_gates > 100000 or p_xp < 0 or p_xp > 100000000 then
    raise exception 'Invalid backroom score';
  end if;

  insert into public.sharpie_backroom_scores (player_key, display_name, gates, xp)
  values (p_key, btrim(p_name), p_gates, p_xp)
  on conflict (player_key) do update set
    display_name = excluded.display_name,
    gates = greatest(public.sharpie_backroom_scores.gates, excluded.gates),
    xp = greatest(public.sharpie_backroom_scores.xp, excluded.xp),
    updated_at = now();
end;
$$;

revoke all on function public.sharpie_record_backroom_score(text, text, integer, integer) from public;
grant execute on function public.sharpie_record_backroom_score(text, text, integer, integer) to anon, authenticated;
