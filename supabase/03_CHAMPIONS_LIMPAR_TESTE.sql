-- ============================================================
-- CCFV CHAMPIONS — LIMPAR TESTE
-- Remove SOMENTE os 32 jogadores de teste e as inscrições deles.
-- Também limpa potes/grupos/jogos gerados pelo teste e deixa a
-- Season 01 de volta em REGISTRATIONS.
-- NÃO APAGA os 32 clubes.
-- NÃO APAGA o Léo Souza.
-- ============================================================

begin;

-- Limpa os objetos do campeonato gerados durante o teste.
delete from public.championship_results
where match_id in (
    select m.id
    from public.championship_matches m
    join public.championships ch on ch.id = m.championship_id
    where ch.code = 'CCFV-CL-S01'
);

delete from public.championship_matches
where championship_id = (
    select id from public.championships where code = 'CCFV-CL-S01'
);

delete from public.championship_group_standings
where championship_id = (
    select id from public.championships where code = 'CCFV-CL-S01'
);

delete from public.championship_group_members
where group_id in (
    select id from public.championship_groups
    where championship_id = (select id from public.championships where code = 'CCFV-CL-S01')
);

delete from public.championship_groups
where championship_id = (
    select id from public.championships where code = 'CCFV-CL-S01'
);

delete from public.championship_pot_members
where pot_id in (
    select id from public.championship_pots
    where championship_id = (select id from public.championships where code = 'CCFV-CL-S01')
);

delete from public.championship_pots
where championship_id = (
    select id from public.championships where code = 'CCFV-CL-S01'
);

-- Remove vínculos dos testes.
delete from public.player_competitions
where player_id in (
    select id from public.players where player_code like 'TEST-CL-%'
);

delete from public.championship_registrations
where participant_id in (
    select id from public.players where player_code like 'TEST-CL-%'
);

update public.championship_clubs
set
    participant_id = null,
    status = 'AVAILABLE',
    pot_number = null,
    updated_at = now()
where championship_id = (
    select id from public.championships where code = 'CCFV-CL-S01'
)
and participant_id in (
    select id from public.players where player_code like 'TEST-CL-%'
);

delete from public.players
where player_code like 'TEST-CL-%';

-- Restaura estado de inscrições.
update public.championships
set
    status = 'REGISTRATIONS',
    updated_at = now()
where code = 'CCFV-CL-S01';

commit;

select
    ch.code,
    ch.status,
    (
        select count(*) from public.championship_registrations r
        where r.championship_id = ch.id and r.status='CONFIRMED'
    ) as participantes,
    (
        select count(*) from public.championship_clubs cc
        where cc.championship_id = ch.id and cc.participant_id is not null
    ) as clubes_ocupados
from public.championships ch
where ch.code = 'CCFV-CL-S01';
