
-- CCFV MOBILE - isolated data layer
create extension if not exists pgcrypto;

create table if not exists public.ccfv_mobile_matches (
  id uuid primary key default gen_random_uuid(),
  competition text not null check (competition in ('BRASILEIRAO_MOBILE','ARENA_CUP')),
  stage text not null,
  round_number integer not null default 1,
  home_player_id uuid not null references public.players(id),
  away_player_id uuid not null references public.players(id),
  home_team text not null,
  away_team text not null,
  home_score integer not null default 0,
  away_score integer not null default 0,
  status text not null default 'FINALIZADA',
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ccfv_mobile_matches_comp_idx on public.ccfv_mobile_matches(competition, round_number, played_at desc);

create table if not exists public.ccfv_mobile_ranking (
  player_id uuid primary key references public.players(id) on delete cascade,
  elo integer not null default 0,
  matches_played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  titles integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.register_ccfv_mobile_match(
  p_competition text,
  p_stage text,
  p_round_number integer,
  p_home_player_id uuid,
  p_away_player_id uuid,
  p_home_team text,
  p_away_team text,
  p_home_score integer,
  p_away_score integer,
  p_played_at timestamptz
) returns json
language plpgsql
security definer
set search_path=public
as $$
declare
  hid integer := 0;
  aid integer := 0;
  hwin boolean;
  draw boolean;
  base integer := 30;
  helo integer;
  aelo integer;
  newh integer;
  newa integer;
  match_id uuid;
begin
  if p_home_player_id = p_away_player_id then raise exception 'Jogadores diferentes são obrigatórios.'; end if;
  if not exists(select 1 from players where id=p_home_player_id and upper(platform)='MOBILE') then raise exception 'Jogador da casa não é MOBILE.'; end if;
  if not exists(select 1 from players where id=p_away_player_id and upper(platform)='MOBILE') then raise exception 'Jogador visitante não é MOBILE.'; end if;
  select elo into helo from ccfv_mobile_ranking where player_id=p_home_player_id;
  if helo is null then helo:=0; insert into ccfv_mobile_ranking(player_id,elo) values(p_home_player_id,0) on conflict do nothing; end if;
  select elo into aelo from ccfv_mobile_ranking where player_id=p_away_player_id;
  if aelo is null then aelo:=0; insert into ccfv_mobile_ranking(player_id,elo) values(p_away_player_id,0) on conflict do nothing; end if;
  hwin := p_home_score > p_away_score;
  draw := p_home_score = p_away_score;
  newh := helo; newa := aelo;
  if not draw then
    if hwin then newh := helo + base; newa := greatest(0,aelo-base); else newh := greatest(0,helo-base); newa := aelo+base; end if;
  end if;
  insert into ccfv_mobile_matches(competition,stage,round_number,home_player_id,away_player_id,home_team,away_team,home_score,away_score,status,played_at)
  values(p_competition,p_stage,p_round_number,p_home_player_id,p_away_player_id,p_home_team,p_away_team,p_home_score,p_away_score,'FINALIZADA',coalesce(p_played_at,now())) returning id into match_id;
  insert into ccfv_mobile_ranking(player_id,elo,matches_played,wins,draws,losses,updated_at) values(p_home_player_id,newh,1,case when hwin then 1 else 0 end,case when draw then 1 else 0 end,case when (not hwin and not draw) then 1 else 0 end,now())
  on conflict(player_id) do update set elo=excluded.elo,matches_played=ccfv_mobile_ranking.matches_played+1,wins=ccfv_mobile_ranking.wins+excluded.wins,draws=ccfv_mobile_ranking.draws+excluded.draws,losses=ccfv_mobile_ranking.losses+excluded.losses,updated_at=now();
  insert into ccfv_mobile_ranking(player_id,elo,matches_played,wins,draws,losses,updated_at) values(p_away_player_id,newa,1,case when not hwin and not draw then 1 else 0 end,case when draw then 1 else 0 end,case when hwin then 1 else 0 end,now())
  on conflict(player_id) do update set elo=excluded.elo,matches_played=ccfv_mobile_ranking.matches_played+1,wins=ccfv_mobile_ranking.wins+excluded.wins,draws=ccfv_mobile_ranking.draws+excluded.draws,losses=ccfv_mobile_ranking.losses+excluded.losses,updated_at=now();
  return json_build_object('id',match_id,'home_elo',newh,'away_elo',newa);
end;
$$;

create or replace function public.get_ccfv_mobile_matches()
returns setof public.ccfv_mobile_matches
language sql
security definer
set search_path=public
as $$ select * from public.ccfv_mobile_matches order by played_at desc $$;

create or replace function public.get_ccfv_mobile_ranking()
returns table(player_id uuid,name text,instagram text,photo_url text,elo integer,matches_played integer,wins integer,draws integer,losses integer,titles integer,rank_name text)
language sql
security definer
set search_path=public
as $$
select r.player_id,p.name,p.instagram,p.photo_url,r.elo,r.matches_played,r.wins,r.draws,r.losses,r.titles,
case when r.elo>=3000 then 'LENDA' when r.elo>=2000 then 'PROFISSIONAL' when r.elo>=1000 then 'AMADOR' else 'INICIANTE' end
from ccfv_mobile_ranking r join players p on p.id=r.player_id where upper(p.platform)='MOBILE' order by r.elo desc,p.name;
$$;

revoke all on function public.register_ccfv_mobile_match(text,text,integer,uuid,uuid,text,text,integer,integer,timestamptz) from public;
grant execute on function public.register_ccfv_mobile_match(text,text,integer,uuid,uuid,text,text,integer,integer,timestamptz) to authenticated;
grant execute on function public.get_ccfv_mobile_matches() to anon,authenticated;
grant execute on function public.get_ccfv_mobile_ranking() to anon,authenticated;
revoke all on table public.ccfv_mobile_matches from anon,authenticated;
revoke all on table public.ccfv_mobile_ranking from anon,authenticated;
notify pgrst,'reload schema';
