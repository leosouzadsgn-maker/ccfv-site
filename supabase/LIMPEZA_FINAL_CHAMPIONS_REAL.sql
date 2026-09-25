-- ============================================================
-- CCFV CHAMPIONS — LIMPEZA DEFINITIVA DO TESTE
--
-- OBJETIVO
--   1) Remover os 31 jogadores TESTE CHAMPIONS.
--   2) Remover TODOS os dados competitivos da Season 01 de teste.
--   3) Liberar novamente os 32 clubes.
--   4) Voltar a Season 01 para REGISTRATIONS.
--   5) Retirar do ranking do Léo SOMENTE a contribuição da
--      Champions de TESTE, preservando o Elo/pontos que ele já
--      possuía antes do teste.
--   6) Deixar o ambiente pronto para os participantes reais.
--
-- NÃO APAGA:
--   • champions_clubs (catálogo dos 32 clubes)
--   • o jogador real Léo Souza
--   • dados das outras competições
--   • estrutura/RPCs da Champions
--
-- O script ABORTA se não encontrar exatamente 31 jogadores
-- com os identificadores de teste usados no campeonato.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 00. IDs de segurança.
-- ------------------------------------------------------------
create temp table tmp_test_players
on commit drop
as
select id as player_id
from public.players
where lower(coalesce(name,'')) like 'teste champions %'
   or lower(coalesce(instagram,'')) like '@ccfv_test_champions_%';

create temp table tmp_s01_contribution
on commit drop
as
select
    participant_id as player_id,
    coalesce(total_ranking_points,0) as ranking_points_delta,
    coalesce(elo_delta,0) as elo_delta,
    coalesce(wins,0) as wins_delta,
    coalesce(draws,0) as draws_delta,
    coalesce(losses,0) as losses_delta,
    coalesce(titles,0) as titles_delta,
    coalesce(wins,0)
      + coalesce(draws,0)
      + coalesce(losses,0) as matches_delta
from public.ccfv_champions_player_totals_v2
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

do $$
declare
    v_count integer;
begin
    select count(*) into v_count
    from tmp_test_players;

    if v_count <> 31 then
        raise exception
            'LIMPEZA ABORTADA: encontrados % jogadores de teste; esperado exatamente 31.',
            v_count;
    end if;

    if not exists (
        select 1
        from public.championships
        where code='CCFV-CL-S01'
    ) then
        raise exception
            'LIMPEZA ABORTADA: Season 01 CCFV-CL-S01 não encontrada.';
    end if;
end;
$$;

-- ------------------------------------------------------------
-- 01. Guarda o estado do Léo antes da limpeza para auditoria.
-- ------------------------------------------------------------
select
    p.id as player_id,
    p.name,
    p.elo,
    p.ranking_points,
    p.wins,
    p.draws,
    p.losses,
    p.titles
from public.players p
where p.name='Léo Souza'
limit 1;

-- ------------------------------------------------------------
-- 02. Desliga apenas o trigger novo de pontuação da Champions
-- durante a limpeza. Assim os DELETEs de resultados não tentam
-- reconstruir a competição no meio da própria limpeza.
-- ------------------------------------------------------------
drop trigger if exists trg_ccfv_champions_result_points_v2
on public.championship_results;

-- ------------------------------------------------------------
-- 03. Remove a pontuação/ledger da Season 01.
-- ------------------------------------------------------------
delete from public.ccfv_champions_match_points_v2
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 04. Remove os totais da Season 01 DEPOIS de aplicarmos
-- a reversão abaixo.
-- ------------------------------------------------------------
-- A reversão será feita no passo 12.

-- ------------------------------------------------------------
-- 05. Remove ranking points/histórico/awards/Hall da edição.
-- ------------------------------------------------------------
delete from public.championship_ranking_points
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

delete from public.championship_history
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

delete from public.championship_awards
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

delete from public.ccfv_hall_of_fame
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 06. Remove resultados e partidas.
-- ------------------------------------------------------------
delete from public.championship_results
where match_id in (
    select id
    from public.championship_matches
    where championship_id = (
        select id
        from public.championships
        where code='CCFV-CL-S01'
    )
);

delete from public.championship_matches
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 07. Remove classificação, membros, grupos.
-- ------------------------------------------------------------
delete from public.championship_group_standings
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

delete from public.championship_group_members
where group_id in (
    select id
    from public.championship_groups
    where championship_id = (
        select id
        from public.championships
        where code='CCFV-CL-S01'
    )
);

delete from public.championship_groups
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 08. Remove membros/potes.
-- ------------------------------------------------------------
delete from public.championship_pot_members
where pot_id in (
    select id
    from public.championship_pots
    where championship_id = (
        select id
        from public.championships
        where code='CCFV-CL-S01'
    )
);

delete from public.championship_pots
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 09. Remove eventos da Season 01.
-- ------------------------------------------------------------
delete from public.championship_events
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 10. Remove inscrições.
-- ------------------------------------------------------------
delete from public.championship_registrations
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 11. Libera TODOS os 32 clubes da Season 01.
-- O catálogo champions_clubs permanece intacto.
-- ------------------------------------------------------------
update public.championship_clubs
set
    participant_id = null,
    status = 'AVAILABLE',
    pot_number = null
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 12. REVERTE SOMENTE A CONTRIBUIÇÃO DA CHAMPIONS DE TESTE.
--
-- Isso é importante:
-- NÃO vamos zerar o ranking global de todos os jogadores,
-- porque o Léo já tinha Elo/pontos legítimos antes do teste.
--
-- Exemplo:
--   antes do teste: Elo 31
--   Champions teste: +184
--   atual: Elo 215
--   após limpeza: Elo volta para 31
--
-- Os 31 jogadores de teste voltarão a zero e serão apagados.
-- ------------------------------------------------------------
do $$
begin

    -- ranking_points
    if exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='ranking_points'
    ) then
        update public.players p
        set ranking_points =
            greatest(
                0,
                coalesce(p.ranking_points,0)
                - coalesce(c.ranking_points_delta,0)
            )
        from tmp_s01_contribution c
        where p.id=c.player_id;
    end if;

    -- elo
    if exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='elo'
    ) then
        update public.players p
        set elo =
            greatest(
                0,
                coalesce(p.elo,0)
                - coalesce(c.elo_delta,0)
            )
        from tmp_s01_contribution c
        where p.id=c.player_id;
    end if;

    -- wins
    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='wins'
    ) then
        update public.players p
        set wins =
            greatest(
                0,
                coalesce(p.wins,0)
                - coalesce(c.wins_delta,0)
            )
        from tmp_s01_contribution c
        where p.id=c.player_id;
    end if;

    -- draws
    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='draws'
    ) then
        update public.players p
        set draws =
            greatest(
                0,
                coalesce(p.draws,0)
                - coalesce(c.draws_delta,0)
            )
        from tmp_s01_contribution c
        where p.id=c.player_id;
    end if;

    -- losses
    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='losses'
    ) then
        update public.players p
        set losses =
            greatest(
                0,
                coalesce(p.losses,0)
                - coalesce(c.losses_delta,0)
            )
        from tmp_s01_contribution c
        where p.id=c.player_id;
    end if;

    -- titles
    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='titles'
    ) then
        update public.players p
        set titles =
            greatest(
                0,
                coalesce(p.titles,0)
                - coalesce(c.titles_delta,0)
            )
        from tmp_s01_contribution c
        where p.id=c.player_id;
    end if;

    -- matches_played
    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='matches_played'
    ) then
        update public.players p
        set matches_played =
            greatest(
                0,
                coalesce(p.matches_played,0)
                - coalesce(c.matches_delta,0)
            )
        from tmp_s01_contribution c
        where p.id=c.player_id;
    end if;

end;
$$;

-- ------------------------------------------------------------
-- 13. Agora remove os totais da Season 01.
-- ------------------------------------------------------------
delete from public.ccfv_champions_player_totals_v2
where championship_id = (
    select id
    from public.championships
    where code='CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 14. Remove o vínculo Champions em player_competitions
-- somente para os participantes desta Season 01, se a estrutura
-- existir no banco atual.
-- ------------------------------------------------------------
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='player_competitions'
          and column_name='player_id'
    )
    and exists (
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='player_competitions'
          and column_name='competition'
    ) then

        execute $q$
            delete from public.player_competitions pc
            where pc.competition='CHAMPIONS_LEAGUE'
              and exists (
                  select 1
                  from tmp_s01_contribution c
                  where c.player_id=pc.player_id
              )
        $q$;

    end if;
end;
$$;

-- ------------------------------------------------------------
-- 15. Remove dados de teste do ranking oficial.
-- ------------------------------------------------------------
delete from public.ccfv_ranking r
where r.player_id in (
    select player_id
    from tmp_test_players
);

-- ------------------------------------------------------------
-- 16. Remove SOMENTE os 31 jogadores de teste.
-- ------------------------------------------------------------
delete from public.players p
where p.id in (
    select player_id
    from tmp_test_players
);

-- ------------------------------------------------------------
-- 17. Season 01 volta ao início das inscrições.
-- ------------------------------------------------------------
update public.championships
set
    status='REGISTRATIONS',
    start_date=null,
    end_date=null,
    registration_open_at=now(),
    registration_close_at=null,
    draw_at=null,
    observations=null,
    updated_at=now()
where code='CCFV-CL-S01';

-- ------------------------------------------------------------
-- 18. Sincroniza novamente o ranking global.
-- Mantém as estatísticas reais do Léo e demais jogadores.
-- ------------------------------------------------------------
select public.ccfv_champions_sync_global_ranking_v2();

-- ------------------------------------------------------------
-- 19. Recria o trigger automático de pontos da Champions.
-- ------------------------------------------------------------
create or replace function public.ccfv_champions_result_points_trigger_v2()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
    v_match_id uuid;
    v_championship_id uuid;
begin
    v_match_id :=
        case
            when tg_op='DELETE' then old.match_id
            else new.match_id
        end;

    select championship_id
      into v_championship_id
    from public.championship_matches
    where id=v_match_id;

    if v_championship_id is not null then
        perform public.ccfv_champions_rebuild_competitive_stats_v2(
            v_championship_id
        );
    end if;

    return case
        when tg_op='DELETE' then old
        else new
    end;
end;
$$;

create trigger trg_ccfv_champions_result_points_v2
after insert or update or delete
on public.championship_results
for each row
execute function public.ccfv_champions_result_points_trigger_v2();

notify pgrst,'reload schema';

commit;

-- ============================================================
-- RELATÓRIO FINAL DA LIMPEZA
-- ============================================================

select
    'JOGADORES_TESTE' as item,
    count(*)::text as resultado
from public.players
where lower(coalesce(name,'')) like 'teste champions %'
   or lower(coalesce(instagram,'')) like '@ccfv_test_champions_%'

union all

select
    'INSCRICOES_SEASON_01',
    count(*)::text
from public.championship_registrations
where championship_id=(
    select id from public.championships
    where code='CCFV-CL-S01'
)

union all

select
    'CLUBES_OCUPADOS_SEASON_01',
    count(*)::text
from public.championship_clubs
where championship_id=(
    select id from public.championships
    where code='CCFV-CL-S01'
)
and participant_id is not null

union all

select
    'GRUPOS_SEASON_01',
    count(*)::text
from public.championship_groups
where championship_id=(
    select id from public.championships
    where code='CCFV-CL-S01'
)

union all

select
    'JOGOS_SEASON_01',
    count(*)::text
from public.championship_matches
where championship_id=(
    select id from public.championships
    where code='CCFV-CL-S01'
)

union all

select
    'STATUS_SEASON_01',
    status
from public.championships
where code='CCFV-CL-S01';

-- Léo: deve mostrar os números que ele tinha ANTES da Champions de teste.
select
    name,
    elo,
    ranking_points,
    wins,
    draws,
    losses,
    titles
from public.players
where name='Léo Souza'
limit 1;
