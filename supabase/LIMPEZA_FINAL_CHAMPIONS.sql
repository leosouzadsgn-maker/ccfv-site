-- ============================================================
-- CCFV CHAMPIONS — LIMPEZA DEFINITIVA DOS DADOS DE TESTE
--
-- OBJETIVO:
--   • remover somente os jogadores TEST-CL-XX
--   • remover toda a estrutura competitiva criada para o teste
--   • manter os 32 clubes oficiais
--   • devolver Season 01 para REGISTRATIONS
--   • liberar novamente os 32 clubes
--   • zerar o ranking CCFV para iniciar a competição real
--   • NÃO apagar jogadores reais
--
-- ATENÇÃO:
-- Este script transforma a Season 01 em uma edição limpa.
-- O campeão de teste deixa de existir no site, como esperado.
-- O próximo campeão será definido pela competição real.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0. Segurança: garante que o código da temporada exista.
-- ------------------------------------------------------------
do $$
begin
    if not exists (
        select 1
        from public.championships
        where code = 'CCFV-CL-S01'
    ) then
        raise exception 'Season 01 CCFV-CL-S01 não encontrada. LIMPEZA ABORTADA.';
    end if;
end;
$$;

-- ------------------------------------------------------------
-- 1. Remove resultados antes das partidas.
-- ------------------------------------------------------------
delete from public.championship_results
where match_id in (
    select m.id
    from public.championship_matches m
    where m.championship_id = (
        select id
        from public.championships
        where code = 'CCFV-CL-S01'
    )
);

-- ------------------------------------------------------------
-- 2. Remove pontos de ranking específicos da Champions.
-- ------------------------------------------------------------
delete from public.championship_ranking_points
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 3. Remove Hall da Fama e premiações da edição de teste.
-- ------------------------------------------------------------
delete from public.ccfv_hall_of_fame
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

delete from public.championship_awards
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 4. Remove histórico da edição de teste.
-- ------------------------------------------------------------
delete from public.championship_history
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 5. Remove partidas.
-- ------------------------------------------------------------
delete from public.championship_matches
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 6. Remove classificação dos grupos.
-- ------------------------------------------------------------
delete from public.championship_group_standings
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 7. Remove membros e grupos.
-- ------------------------------------------------------------
delete from public.championship_group_members
where group_id in (
    select id
    from public.championship_groups
    where championship_id = (
        select id
        from public.championships
        where code = 'CCFV-CL-S01'
    )
);

delete from public.championship_groups
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 8. Remove membros dos potes e os próprios potes.
-- ------------------------------------------------------------
delete from public.championship_pot_members
where pot_id in (
    select id
    from public.championship_pots
    where championship_id = (
        select id
        from public.championships
        where code = 'CCFV-CL-S01'
    )
);

delete from public.championship_pots
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 9. Remove eventos da execução de teste.
-- ------------------------------------------------------------
delete from public.championship_events
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 10. Remove vínculos da Champions no player_competitions.
-- Isso afeta somente a competição CHAMPIONS_LEAGUE.
-- ------------------------------------------------------------
delete from public.player_competitions
where competition = 'CHAMPIONS_LEAGUE';

-- ------------------------------------------------------------
-- 11. Remove todas as inscrições da Season 01.
-- ------------------------------------------------------------
delete from public.championship_registrations
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 12. Libera os 32 clubes da Season 01.
-- NÃO apaga champions_clubs.
-- ------------------------------------------------------------
update public.championship_clubs
set
    participant_id = null,
    status = 'AVAILABLE',
    pot_number = null,
    notes = null,
    updated_at = now()
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 13. Remove SOMENTE os jogadores de teste.
-- ------------------------------------------------------------
delete from public.players
where player_code like 'TEST-CL-%';

-- ------------------------------------------------------------
-- 14. ZERA O RANKING CCFV PARA A ABERTURA REAL.
--
-- Não apaga jogadores reais.
-- Apenas devolve as estatísticas competitivas ao estado inicial.
-- ------------------------------------------------------------
do $$
begin

    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='elo'
    ) then
        update public.players
           set elo = 0;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='ranking_points'
    ) then
        update public.players
           set ranking_points = 0;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='wins'
    ) then
        update public.players
           set wins = 0;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='draws'
    ) then
        update public.players
           set draws = 0;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='losses'
    ) then
        update public.players
           set losses = 0;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='titles'
    ) then
        update public.players
           set titles = 0;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='matches_played'
    ) then
        update public.players
           set matches_played = 0;
    end if;

end;
$$;

-- ------------------------------------------------------------
-- 15. ZERA O ESPELHO DO RANKING OFICIAL.
-- ------------------------------------------------------------
do $$
begin

    if exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public'
          and c.relname='ccfv_ranking'
          and c.relkind in ('r','p')
    ) then

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='elo') then
            update public.ccfv_ranking set elo = 0;
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='ranking_points') then
            update public.ccfv_ranking set ranking_points = 0;
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='wins') then
            update public.ccfv_ranking set wins = 0;
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='draws') then
            update public.ccfv_ranking set draws = 0;
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='losses') then
            update public.ccfv_ranking set losses = 0;
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='titles') then
            update public.ccfv_ranking set titles = 0;
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='matches_played') then
            update public.ccfv_ranking set matches_played = 0;
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='rank_name') then
            update public.ccfv_ranking
               set rank_name = 'INICIANTE';
        end if;

        if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='ranking_position') then
            with ranked as (
                select
                    player_id,
                    row_number() over(order by player_id)::integer as new_position
                from public.ccfv_ranking
            )
            update public.ccfv_ranking r
               set ranking_position = ranked.new_position
              from ranked
             where r.player_id = ranked.player_id;
        end if;

    end if;

end;
$$;

-- ------------------------------------------------------------
-- 16. Devolve a Season 01 ao início das inscrições.
-- ------------------------------------------------------------
update public.championships
set
    status = 'REGISTRATIONS',
    start_date = null,
    end_date = null,
    registration_open_at = now(),
    registration_close_at = null,
    draw_at = null,
    observations = null,
    updated_at = now()
where code = 'CCFV-CL-S01';

-- ------------------------------------------------------------
-- 17. Validação final da limpeza.
-- Esperado:
--   jogadores_teste = 0
--   inscritos = 0
--   clubes_ocupados = 0
--   jogos = 0
--   grupos = 0
--   status = REGISTRATIONS
-- ------------------------------------------------------------
do $$
declare
    v_test_players integer;
    v_registrations integer;
    v_occupied integer;
    v_matches integer;
    v_groups integer;
    v_status text;
begin

    select count(*)
      into v_test_players
    from public.players
    where player_code like 'TEST-CL-%';

    select count(*)
      into v_registrations
    from public.championship_registrations
    where championship_id = (
        select id from public.championships
        where code = 'CCFV-CL-S01'
    );

    select count(*)
      into v_occupied
    from public.championship_clubs
    where championship_id = (
        select id from public.championships
        where code = 'CCFV-CL-S01'
    )
      and participant_id is not null;

    select count(*)
      into v_matches
    from public.championship_matches
    where championship_id = (
        select id from public.championships
        where code = 'CCFV-CL-S01'
    );

    select count(*)
      into v_groups
    from public.championship_groups
    where championship_id = (
        select id from public.championships
        where code = 'CCFV-CL-S01'
    );

    select status
      into v_status
    from public.championships
    where code = 'CCFV-CL-S01';

    if v_test_players <> 0 then
        raise exception 'LIMPEZA FALHOU: ainda existem % jogadores de teste.', v_test_players;
    end if;

    if v_registrations <> 0 then
        raise exception 'LIMPEZA FALHOU: ainda existem % inscrições.', v_registrations;
    end if;

    if v_occupied <> 0 then
        raise exception 'LIMPEZA FALHOU: ainda existem % clubes ocupados.', v_occupied;
    end if;

    if v_matches <> 0 then
        raise exception 'LIMPEZA FALHOU: ainda existem % jogos.', v_matches;
    end if;

    if v_groups <> 0 then
        raise exception 'LIMPEZA FALHOU: ainda existem % grupos.', v_groups;
    end if;

    if v_status <> 'REGISTRATIONS' then
        raise exception 'LIMPEZA FALHOU: Season 01 ficou com status %.', v_status;
    end if;

    raise notice 'LIMPEZA OK — Season 01 limpa e pronta para os jogadores reais.';

end;
$$;

notify pgrst,'reload schema';

commit;

-- ------------------------------------------------------------
-- RELATÓRIO FINAL
-- ------------------------------------------------------------
select
    ch.code,
    ch.season_label,
    ch.status,
    (
        select count(*)
        from public.championship_registrations r
        where r.championship_id = ch.id
    ) as inscricoes,
    (
        select count(*)
        from public.championship_clubs cc
        where cc.championship_id = ch.id
          and cc.participant_id is not null
    ) as clubes_ocupados,
    (
        select count(*)
        from public.championship_matches m
        where m.championship_id = ch.id
    ) as jogos,
    (
        select count(*)
        from public.championship_groups g
        where g.championship_id = ch.id
    ) as grupos
from public.championships ch
where ch.code = 'CCFV-CL-S01';
