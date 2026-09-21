-- CCFV — conferência pós-correção

-- 1) Temporada atual
select id, code, season_number, season_label, status
from public.championships
order by season_number desc;

-- 2) Campeão atual
select *
from public.ccfv_champions_public_champion_v2
where championship_id=(select id from public.championships where code='CCFV-CL-S01');

-- 3) Histórico: deve retornar 32 participantes na Season 01
select
  count(*) as historico_total,
  count(*) filter(where final_position=1) as campeao,
  count(*) filter(where final_position=2) as vice
from public.ccfv_champions_public_history_v2
where championship_id=(select id from public.championships where code='CCFV-CL-S01');

-- 4) Pontuação da Champions por jogador
select
  p.name,
  p.platform,
  p.ranking_points,
  p.elo,
  p.wins,
  p.draws,
  p.losses,
  t.match_points,
  t.stage_points,
  t.total_ranking_points,
  t.elo_delta,
  t.phase_reached
from public.players p
join public.ccfv_champions_player_totals_v2 t
  on t.participant_id=p.id
where t.championship_id=(select id from public.championships where code='CCFV-CL-S01')
order by p.elo desc, p.ranking_points desc, p.name;

-- 5) Conferência dos jogos encerrados: 63 na Season 01
select
  count(*) as jogos_total,
  count(*) filter(where phase='GROUP_STAGE') as grupos,
  count(*) filter(where phase='ROUND_OF_16') as oitavas,
  count(*) filter(where phase='QUARTERFINALS') as quartas,
  count(*) filter(where phase='SEMIFINALS') as semifinais,
  count(*) filter(where phase='FINAL') as final
from public.championship_matches
where championship_id=(select id from public.championships where code='CCFV-CL-S01');

-- 6) Ranking oficial, quando ccfv_ranking for TABLE
select *
from public.ccfv_ranking
order by ranking_position nulls last
limit 20;
