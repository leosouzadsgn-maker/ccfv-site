-- ============================================================
-- TESTE DA INTEGRAÇÃO DE PONTOS / ELO
-- Execute depois de lançar pelo menos um resultado no Admin.
-- ============================================================

select
    p.name as jogador,
    p.platform,
    p.elo,
    p.wins,
    p.draws,
    p.losses
from public.players p
where p.id in (
    select participant_id
    from public.championship_match_points
    group by participant_id
)
order by p.elo desc, p.wins desc;

select
    participant_name as jogador,
    matches,
    wins,
    draws,
    losses,
    match_ranking_points,
    championship_elo_delta,
    current_elo
from public.championship_public_player_points
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
)
order by current_elo desc, wins desc;

select
    result,
    count(*) as total_resultados,
    sum(ranking_points)::integer as pontos_de_partida,
    sum(elo_delta)::integer as delta_elo
from public.championship_match_points
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
)
group by result
order by result;
