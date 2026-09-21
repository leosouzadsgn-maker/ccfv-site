-- ============================================================
-- TESTE FINAL — RANKING + CAMPEÃO + HISTÓRICO
-- ============================================================

-- 1. Ranking oficial: os campos que precisam estar preenchidos.
select
    player_id,
    ranking_position,
    name,
    platform,
    matches_played,
    wins,
    draws,
    losses,
    elo,
    ranking_points,
    titles,
    rank_name
from public.ccfv_ranking
order by ranking_position
limit 20;

-- 2. Pontos e partidas do jogador.
select
    name,
    matches_played,
    wins,
    draws,
    losses,
    elo,
    ranking_points,
    titles,
    rank_name
from public.ccfv_ranking
where name = 'Léo Souza';

-- 3. Campeão da Season 01.
select *
from public.ccfv_champions_public_champion_v3
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- 4. Histórico da Season 01.
select
    season_number,
    season_label,
    participant_name,
    platform,
    club_name,
    final_position,
    phase_reached,
    matches_played,
    wins,
    draws,
    losses
from public.ccfv_champions_public_history_v2
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
)
order by final_position nulls last, participant_name;

-- 5. Hall da Fama.
select
    season_number,
    season_label,
    participant_name,
    club_name,
    title
from public.ccfv_champions_public_hall_v2
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
)
order by created_at desc;

-- 6. Deve dar 32 jogadores no histórico.
select count(*) as historico_season_01
from public.championship_history
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- 7. Deve dar 63 jogos oficiais.
select count(*) as jogos_oficiais_season_01
from public.championship_matches
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
)
and status in('VALIDATED','WO','ADMIN_DECISION');
