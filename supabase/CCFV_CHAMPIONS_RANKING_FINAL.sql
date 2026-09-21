-- ============================================================
-- CCFV CHAMPIONS — RANKING + CAMPEÃO — FINAL ANTES DO GIT
--
-- Corrige:
-- 1) SET dinâmico inválido no ccfv_ranking.
-- 2) matches_played permanecendo 0.
-- 3) sincronização de nome/plataforma/foto/rank.
-- 4) campeão público robusto.
-- 5) reparo da Season 01 já encerrada.
--
-- Não apaga a estrutura existente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 01. Campos que o sistema precisa manter no jogador.
-- ------------------------------------------------------------
alter table public.players
    add column if not exists ranking_points integer not null default 0;

do $$
begin
    if exists (
        select 1
        from pg_class c
        join pg_namespace n
          on n.oid=c.relnamespace
        where n.nspname='public'
          and c.relname='ccfv_ranking'
          and c.relkind in('r','p')
    ) then
        execute '
            alter table public.ccfv_ranking
            add column if not exists ranking_points integer not null default 0
        ';

        execute '
            alter table public.ccfv_ranking
            add column if not exists matches_played integer not null default 0
        ';
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='matches_played'
    ) then
        update public.players
           set matches_played =
               coalesce(wins,0) +
               coalesce(draws,0) +
               coalesce(losses,0);
    end if;
end;
$$;

-- ------------------------------------------------------------
-- 02. Sync global ranking.
--
-- IMPORTANTE:
-- No PostgreSQL o lado esquerdo do SET não pode ser "r.coluna".
-- ------------------------------------------------------------
create or replace function public.ccfv_champions_sync_global_ranking_final()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
    v_relkind char;
    v_set text := '';
begin

    select c.relkind
      into v_relkind
    from pg_class c
    join pg_namespace n
      on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='ccfv_ranking';

    if v_relkind is null or v_relkind not in('r','p') then
        return;
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='elo'
    ) then
        v_set := v_set || 'elo=p.elo,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='ranking_points'
    ) then
        v_set := v_set || 'ranking_points=p.ranking_points,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='wins'
    ) then
        v_set := v_set || 'wins=p.wins,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='draws'
    ) then
        v_set := v_set || 'draws=p.draws,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='losses'
    ) then
        v_set := v_set || 'losses=p.losses,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='titles'
    ) then
        v_set := v_set || 'titles=p.titles,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='name'
    ) then
        v_set := v_set || 'name=p.name,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='instagram'
    ) then
        v_set := v_set || 'instagram=p.instagram,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='platform'
    ) then
        v_set := v_set || 'platform=p.platform,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='photo_url'
    ) then
        v_set := v_set || 'photo_url=p.photo_url,';
    end if;

    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='matches_played'
    ) then
        v_set := v_set || 'matches_played=(coalesce(p.wins,0)+coalesce(p.draws,0)+coalesce(p.losses,0)),';
    end if;

    -- Atualiza a linha existente correspondente ao jogador.
    if v_set <> '' then
        v_set := left(v_set,length(v_set)-1);

        execute format(
            'update public.ccfv_ranking
                set %s
              from public.players p
             where public.ccfv_ranking.player_id=p.id',
            v_set
        );
    end if;

    -- Recalcula rank_name conforme o Elo.
    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='rank_name'
    ) then
        execute $q$
            update public.ccfv_ranking
               set rank_name =
                   case
                       when coalesce(elo,0) >= 3000 then 'LENDA'
                       when coalesce(elo,0) >= 2000 then 'PROFISSIONAL'
                       when coalesce(elo,0) >= 1000 then 'AMADOR'
                       else 'INICIANTE'
                   end
        $q$;
    end if;

    -- Ranking oficial por Elo -> pontos -> vitórias.
    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='ranking_position'
    ) then
        execute $q$
            with ranked as(
                select
                    player_id,
                    row_number() over(
                        order by
                            coalesce(elo,0) desc,
                            coalesce(ranking_points,0) desc,
                            coalesce(wins,0) desc,
                            coalesce(draws,0) desc,
                            coalesce(losses,0) asc,
                            player_id
                    )::integer as new_position
                from public.ccfv_ranking
            )
            update public.ccfv_ranking r
               set ranking_position=ranked.new_position
              from ranked
             where r.player_id=ranked.player_id
        $q$;
    end if;

end;
$$;

-- ------------------------------------------------------------
-- 03. Também mantém players.matches_played coerente.
-- ------------------------------------------------------------
do $$
begin
    if exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='players'
          and column_name='matches_played'
    ) then
        update public.players
           set matches_played =
               coalesce(wins,0) +
               coalesce(draws,0) +
               coalesce(losses,0);
    end if;
end;
$$;


-- ------------------------------------------------------------
-- 03B. SUBSTITUI A VERSÃO ANTIGA DO SYNC.
--
-- O rebuild da Champions existente chama esta função V2.
-- Portanto ela também precisa usar o SET correto do PostgreSQL.
-- ------------------------------------------------------------
create or replace function public.ccfv_champions_sync_global_ranking_v2()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
    v_relkind char;
    v_set text := '';
begin

    select c.relkind
      into v_relkind
    from pg_class c
    join pg_namespace n
      on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='ccfv_ranking';

    if v_relkind is null or v_relkind not in('r','p') then
        return;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='elo')
        then v_set := v_set || 'elo=p.elo,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='ranking_points')
        then v_set := v_set || 'ranking_points=p.ranking_points,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='wins')
        then v_set := v_set || 'wins=p.wins,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='draws')
        then v_set := v_set || 'draws=p.draws,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='losses')
        then v_set := v_set || 'losses=p.losses,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='titles')
        then v_set := v_set || 'titles=p.titles,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='name')
        then v_set := v_set || 'name=p.name,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='instagram')
        then v_set := v_set || 'instagram=p.instagram,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='platform')
        then v_set := v_set || 'platform=p.platform,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='photo_url')
        then v_set := v_set || 'photo_url=p.photo_url,';
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='matches_played')
        then v_set := v_set || 'matches_played=(coalesce(p.wins,0)+coalesce(p.draws,0)+coalesce(p.losses,0)),';
    end if;

    if v_set <> '' then
        v_set := left(v_set,length(v_set)-1);

        execute format(
            'update public.ccfv_ranking
                set %s
              from public.players p
             where public.ccfv_ranking.player_id=p.id',
            v_set
        );
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='rank_name') then
        execute $q$
            update public.ccfv_ranking
               set rank_name =
                   case
                       when coalesce(elo,0) >= 3000 then 'LENDA'
                       when coalesce(elo,0) >= 2000 then 'PROFISSIONAL'
                       when coalesce(elo,0) >= 1000 then 'AMADOR'
                       else 'INICIANTE'
                   end
        $q$;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='ranking_position') then
        execute $q$
            with ranked as(
                select
                    player_id,
                    row_number() over(
                        order by
                            coalesce(elo,0) desc,
                            coalesce(ranking_points,0) desc,
                            coalesce(wins,0) desc,
                            coalesce(draws,0) desc,
                            coalesce(losses,0) asc,
                            player_id
                    )::integer as new_position
                from public.ccfv_ranking
            )
            update public.ccfv_ranking r
               set ranking_position=ranked.new_position
              from ranked
             where r.player_id=ranked.player_id
        $q$;
    end if;

end;
$$;

-- ------------------------------------------------------------
-- 04. View pública definitiva do campeão.
-- ------------------------------------------------------------
create or replace view public.ccfv_champions_public_champion_v3 as
select
    h.championship_id,
    ch.season_number,
    ch.season_label,
    h.participant_id,
    p.name as participant_name,
    p.platform,
    p.photo_url,
    h.club_id,
    c.slug as club_slug,
    c.name as club_name,
    c.short_name as club_short_name,
    c.logo_path,
    c.country,
    h.final_position,
    h.phase_reached,
    h.created_at
from public.championship_history h
join public.championships ch
  on ch.id=h.championship_id
join public.players p
  on p.id=h.participant_id
join public.champions_clubs c
  on c.id=h.club_id
where h.final_position=1;

grant select
on public.ccfv_champions_public_champion_v3
to anon,authenticated;

-- ------------------------------------------------------------
-- 05. Repara a Season 01 se já estiver fechada.
-- ------------------------------------------------------------
do $$
declare
    v_s01 uuid;
    v_status text;
begin

    select id,status
      into v_s01,v_status
    from public.championships
    where code='CCFV-CL-S01';

    if v_s01 is not null and v_status in('CLOSED','ARCHIVED') then

        -- A função oficial recria ranking, histórico, awards e Hall.
        perform public.champions_finalize_ranking_and_history(v_s01);

        -- Depois garante que os campos globais do ranking estejam certos.
        perform public.ccfv_champions_sync_global_ranking_final();

    end if;

end;
$$;

-- ------------------------------------------------------------
-- 06. Permissões.
-- ------------------------------------------------------------
revoke all
on function public.ccfv_champions_sync_global_ranking_final()
from public;

grant execute
on function public.ccfv_champions_sync_global_ranking_final()
to authenticated;

notify pgrst,'reload schema';

commit;
