-- CCFV MOBILE v2 — required RPC updates

create or replace function public.get_ccfv_mobile_matches()
returns table(
  id uuid,
  competition text,
  stage text,
  round_number integer,
  home_player_id uuid,
  away_player_id uuid,
  home_team text,
  away_team text,
  home_score integer,
  away_score integer,
  status text,
  played_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  home_player_name text,
  away_player_name text
)
language sql
security definer
set search_path=public
as $$
  select
    m.id,m.competition,m.stage,m.round_number,m.home_player_id,m.away_player_id,
    m.home_team,m.away_team,m.home_score,m.away_score,m.status,m.played_at,m.created_at,m.updated_at,
    hp.name as home_player_name,
    ap.name as away_player_name
  from public.ccfv_mobile_matches m
  left join public.players hp on hp.id=m.home_player_id
  left join public.players ap on ap.id=m.away_player_id
  order by m.played_at desc, m.created_at desc;
$$;

create or replace function public.get_ccfv_mobile_ranking()
returns table(
  player_id uuid,
  name text,
  instagram text,
  photo_url text,
  platform text,
  elo integer,
  matches_played integer,
  wins integer,
  draws integer,
  losses integer,
  titles integer,
  rank_name text
)
language sql
security definer
set search_path=public
as $$
  select
    p.id,
    p.name,
    p.instagram,
    p.photo_url as photo_url,
    p.platform,
    coalesce(r.elo,0) as elo,
    coalesce(r.matches_played,0) as matches_played,
    coalesce(r.wins,0) as wins,
    coalesce(r.draws,0) as draws,
    coalesce(r.losses,0) as losses,
    coalesce(r.titles,0) as titles,
    case
      when coalesce(r.elo,0) >= 3000 then 'LENDA'
      when coalesce(r.elo,0) >= 2000 then 'PROFISSIONAL'
      when coalesce(r.elo,0) >= 1000 then 'AMADOR'
      else 'INICIANTE'
    end as rank_name
  from public.players p
  left join public.ccfv_mobile_ranking r on r.player_id=p.id
  where upper(coalesce(p.platform,''))='MOBILE'
    and upper(coalesce(p.status,'ACTIVE'))='ACTIVE'
  order by coalesce(r.elo,0) desc, p.name asc;
$$;

revoke all on function public.get_ccfv_mobile_matches() from public;
grant execute on function public.get_ccfv_mobile_matches() to anon, authenticated;
revoke all on function public.get_ccfv_mobile_ranking() from public;
grant execute on function public.get_ccfv_mobile_ranking() to anon, authenticated;

notify pgrst,'reload schema';
