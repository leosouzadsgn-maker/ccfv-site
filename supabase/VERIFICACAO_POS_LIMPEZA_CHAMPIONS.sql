-- ============================================================
-- CCFV — VERIFICAÇÃO PÓS-LIMPEZA
-- ============================================================

select
    'TESTE PLAYERS' as item,
    count(*)::text as resultado
from public.players
where lower(coalesce(name,'')) like 'teste champions %'
   or lower(coalesce(instagram,'')) like '@ccfv_test_champions_%'

union all
select
    'TESTE RANKING',
    count(*)::text
from public.ccfv_ranking
where player_id not in (
    select id from public.players
)

union all
select
    'INSCRICOES',
    count(*)::text
from public.championship_registrations
where championship_id=(
    select id from public.championships where code='CCFV-CL-S01'
)

union all
select
    'JOGOS',
    count(*)::text
from public.championship_matches
where championship_id=(
    select id from public.championships where code='CCFV-CL-S01'
)

union all
select
    'GRUPOS',
    count(*)::text
from public.championship_groups
where championship_id=(
    select id from public.championships where code='CCFV-CL-S01'
)

union all
select
    'CLUBES_OCUPADOS',
    count(*)::text
from public.championship_clubs
where championship_id=(
    select id from public.championships where code='CCFV-CL-S01'
)
and participant_id is not null

union all
select
    'STATUS',
    status
from public.championships
where code='CCFV-CL-S01';

select
    name,
    elo,
    ranking_points,
    wins,
    draws,
    losses,
    titles
from public.players
where name='Léo Souza';
