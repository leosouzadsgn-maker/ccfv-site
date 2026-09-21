-- CONFERÊNCIA: 48 jogos = 16 por rodada e 6 por grupo.
select
  round_number as rodada,
  count(*)::integer as jogos
from public.championship_matches m
join public.championships ch on ch.id=m.championship_id
where ch.code='CCFV-CL-S01' and m.phase='GROUP_STAGE'
group by round_number
order by round_number;

select
  coalesce(substring(m.bracket_slot from '^G([A-H])'), '?') as grupo,
  round_number as rodada,
  count(*)::integer as jogos
from public.championship_matches m
join public.championships ch on ch.id=m.championship_id
where ch.code='CCFV-CL-S01' and m.phase='GROUP_STAGE'
group by 1,2
order by 1,2;

select
  p.name as jogador,
  p.ranking_points,
  p.elo,
  p.wins,
  p.draws,
  p.losses
from public.players p
where p.id in (
  select participant_id
  from public.championship_match_points
  where championship_id=(select id from public.championships where code='CCFV-CL-S01')
)
order by p.elo desc;

select
  participant_name,
  matches,
  wins,
  draws,
  losses,
  match_ranking_points,
  championship_elo_delta,
  current_elo
from public.championship_public_player_points
where championship_id=(select id from public.championships where code='CCFV-CL-S01')
order by current_elo desc;
