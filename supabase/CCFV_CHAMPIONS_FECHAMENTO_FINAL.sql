-- ============================================================
-- CCFV CHAMPIONS — FECHAMENTO FINAL
--
-- Corrige, sem apagar as tabelas oficiais:
-- 1. Pontos por partida: V=15 / E=5 / D=0
-- 2. Elo: grupos +24/+8/-12 | mata-mata +28/-14
-- 3. Bônus de campanha somente no fechamento:
--    grupos 20 | oitavas 35 | quartas 50 | semi 65
--    vice 80 | campeão 100
-- 4. Reprocessamento idempotente da competição
-- 5. Ranking CCFV (players + ccfv_ranking)
-- 6. Histórico + Hall da Fama
-- 7. Campeão público
-- 8. Nova temporada pela tela Temporada do Admin
--
-- NÃO mexe nos layouts de grupos/partidas já aprovados.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 01. Campos globais necessários
-- ------------------------------------------------------------
alter table public.players
    add column if not exists ranking_points integer not null default 0;

-- ccfv_ranking é uma tabela na instalação atual; se for VIEW, o bloco ignora.
do $$
begin
    if exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public'
          and c.relname='ccfv_ranking'
          and c.relkind in ('r','p')
    ) then
        execute 'alter table public.ccfv_ranking add column if not exists ranking_points integer not null default 0';
    end if;
end;
$$;

-- Configuração oficial para todas as novas edições Champions.
update public.championship_settings s
set ranking_points = jsonb_build_object(
    'GROUP_STAGE',20,
    'ROUND_OF_16',35,
    'QUARTERFINALS',50,
    'SEMIFINALS',65,
    'RUNNER_UP',80,
    'CHAMPION',100
)
where exists (
    select 1 from public.championships c
    where c.id=s.championship_id
);

-- ------------------------------------------------------------
-- 02. Ledger seguro desta integração.
-- Usa nomes próprios para não brigar com tentativas anteriores.
-- ------------------------------------------------------------
create table if not exists public.ccfv_champions_match_points_v2 (
    id uuid primary key default gen_random_uuid(),
    championship_id uuid not null references public.championships(id) on delete cascade,
    match_id uuid not null references public.championship_matches(id) on delete cascade,
    participant_id uuid not null references public.players(id) on delete restrict,
    result text not null check (result in ('WIN','DRAW','LOSS')),
    ranking_points integer not null default 0,
    elo_delta integer not null default 0,
    created_at timestamptz not null default now(),
    unique(match_id,participant_id)
);

create index if not exists ccfv_champions_match_points_v2_player_idx
    on public.ccfv_champions_match_points_v2(participant_id, created_at desc);

create table if not exists public.ccfv_champions_player_totals_v2 (
    championship_id uuid not null references public.championships(id) on delete cascade,
    participant_id uuid not null references public.players(id) on delete restrict,
    match_points integer not null default 0,
    stage_points integer not null default 0,
    total_ranking_points integer not null default 0,
    elo_delta integer not null default 0,
    wins integer not null default 0,
    draws integer not null default 0,
    losses integer not null default 0,
    titles integer not null default 0,
    phase_reached text,
    updated_at timestamptz not null default now(),
    primary key(championship_id,participant_id)
);

-- ------------------------------------------------------------
-- 03. Views públicas V2: evitam conflitos com views antigas.
-- ------------------------------------------------------------
create or replace view public.ccfv_champions_public_history_v2 as
select
    h.id,
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
    h.matches_played,
    h.wins,
    h.draws,
    h.losses,
    h.created_at
from public.championship_history h
join public.championships ch on ch.id=h.championship_id
join public.players p on p.id=h.participant_id
join public.champions_clubs c on c.id=h.club_id;

create or replace view public.ccfv_champions_public_hall_v2 as
select
    hf.id,
    hf.championship_id,
    ch.season_number,
    ch.season_label,
    hf.participant_id,
    p.name as participant_name,
    p.platform,
    p.photo_url,
    hf.club_id,
    c.slug as club_slug,
    c.name as club_name,
    c.short_name as club_short_name,
    c.logo_path,
    c.country,
    hf.title,
    hf.season,
    hf.created_at
from public.ccfv_hall_of_fame hf
join public.championships ch on ch.id=hf.championship_id
join public.players p on p.id=hf.participant_id
join public.champions_clubs c on c.id=hf.club_id;

create or replace view public.ccfv_champions_public_champion_v2 as
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
    h.phase_reached,
    h.created_at
from public.championship_history h
join public.championships ch on ch.id=h.championship_id
join public.players p on p.id=h.participant_id
join public.champions_clubs c on c.id=h.club_id
where h.final_position=1;

grant select on public.ccfv_champions_public_history_v2 to anon,authenticated;
grant select on public.ccfv_champions_public_hall_v2 to anon,authenticated;
grant select on public.ccfv_champions_public_champion_v2 to anon,authenticated;

-- ------------------------------------------------------------
-- 04. Sincroniza ranking oficial quando ccfv_ranking for TABLE.
-- ------------------------------------------------------------
create or replace function public.ccfv_champions_sync_global_ranking_v2()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
    v_relkind char;
    v_has_player_id boolean;
    v_set text := '';
begin
    select c.relkind
      into v_relkind
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='ccfv_ranking';

    if v_relkind is null or v_relkind not in ('r','p') then
        return;
    end if;

    select exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ccfv_ranking'
          and column_name='player_id'
    ) into v_has_player_id;

    if not v_has_player_id then
        return;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='elo') then
        v_set := v_set || 'r.elo=p.elo,';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='ranking_points') then
        v_set := v_set || 'r.ranking_points=p.ranking_points,';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='wins') then
        v_set := v_set || 'r.wins=p.wins,';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='draws') then
        v_set := v_set || 'r.draws=p.draws,';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='losses') then
        v_set := v_set || 'r.losses=p.losses,';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='titles') then
        v_set := v_set || 'r.titles=p.titles,';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='name') then
        v_set := v_set || 'r.name=p.name,';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='platform') then
        v_set := v_set || 'r.platform=p.platform,';
    end if;

    if v_set <> '' then
        v_set := left(v_set,length(v_set)-1);
        execute format(
            'update public.ccfv_ranking r set %s from public.players p where r.player_id=p.id',
            v_set
        );
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='ccfv_ranking' and column_name='ranking_position') then
        execute $q$
            with ranked as (
                select
                    r.player_id,
                    row_number() over(
                        order by
                            coalesce(r.elo,0) desc,
                            coalesce(r.ranking_points,0) desc,
                            coalesce(r.wins,0) desc,
                            coalesce(r.draws,0) desc,
                            coalesce(r.losses,0) asc,
                            r.player_id
                    )::integer as pos
                from public.ccfv_ranking r
            )
            update public.ccfv_ranking r
               set ranking_position=ranked.pos
              from ranked
             where ranked.player_id=r.player_id
        $q$;
    end if;
end;
$$;

-- ------------------------------------------------------------
-- 05. Reconstroi integralmente uma Champions sem duplicar.
-- ------------------------------------------------------------
create or replace function public.ccfv_champions_rebuild_competitive_stats_v2(
    p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
    v_status text;
    v_winner uuid;
    v_runner uuid;
    v_count integer := 0;
begin
    select status into v_status
    from public.championships
    where id=p_championship_id;

    if v_status is null then
        raise exception 'Championship % não encontrada.',p_championship_id;
    end if;

    -- Retira somente a contribuição já aplicada desta Champions.
    update public.players p
       set ranking_points=greatest(0,coalesce(p.ranking_points,0)-t.total_ranking_points),
           elo=greatest(0,coalesce(p.elo,0)-t.elo_delta),
           wins=greatest(0,coalesce(p.wins,0)-t.wins),
           draws=greatest(0,coalesce(p.draws,0)-t.draws),
           losses=greatest(0,coalesce(p.losses,0)-t.losses),
           titles=greatest(0,coalesce(p.titles,0)-t.titles)
      from public.ccfv_champions_player_totals_v2 t
     where t.championship_id=p_championship_id
       and p.id=t.participant_id;

    delete from public.ccfv_champions_match_points_v2
    where championship_id=p_championship_id;

    delete from public.ccfv_champions_player_totals_v2
    where championship_id=p_championship_id;

    select m.winner_registration_id
      into v_winner
    from public.championship_matches m
    where m.championship_id=p_championship_id
      and m.phase='FINAL'
      and m.status in('VALIDATED','WO','ADMIN_DECISION')
    order by m.match_number desc
    limit 1;

    if v_winner is not null then
        select case
            when m.home_registration_id=v_winner then m.away_registration_id
            else m.home_registration_id
        end
        into v_runner
        from public.championship_matches m
        where m.championship_id=p_championship_id
          and m.phase='FINAL'
          and m.status in('VALIDATED','WO','ADMIN_DECISION')
        order by m.match_number desc
        limit 1;
    end if;

    -- Partidas: pontos de partida são sempre 15 / 5 / 0.
    insert into public.ccfv_champions_match_points_v2(
        championship_id,match_id,participant_id,result,ranking_points,elo_delta
    )
    select
        m.championship_id,
        m.id,
        r.participant_id,
        case
            when m.winner_registration_id=r.id then 'WIN'
            when m.phase='GROUP_STAGE' and m.winner_registration_id is null and m.home_score=m.away_score then 'DRAW'
            else 'LOSS'
        end,
        case
            when m.winner_registration_id=r.id then 15
            when m.phase='GROUP_STAGE' and m.winner_registration_id is null and m.home_score=m.away_score then 5
            else 0
        end,
        case
            when m.phase='GROUP_STAGE' and m.winner_registration_id is null and m.home_score=m.away_score then 8
            when m.winner_registration_id=r.id and m.phase='GROUP_STAGE' then 24
            when m.winner_registration_id is not null and m.phase='GROUP_STAGE' then -12
            when m.winner_registration_id=r.id and m.phase<>'GROUP_STAGE' then 28
            when m.winner_registration_id is not null and m.phase<>'GROUP_STAGE' then -14
            else 0
        end
    from public.championship_matches m
    join public.championship_registrations r on r.id=m.home_registration_id
    where m.championship_id=p_championship_id
      and m.status in('VALIDATED','WO','ADMIN_DECISION')

    union all

    select
        m.championship_id,
        m.id,
        r.participant_id,
        case
            when m.winner_registration_id=r.id then 'WIN'
            when m.phase='GROUP_STAGE' and m.winner_registration_id is null and m.home_score=m.away_score then 'DRAW'
            else 'LOSS'
        end,
        case
            when m.winner_registration_id=r.id then 15
            when m.phase='GROUP_STAGE' and m.winner_registration_id is null and m.home_score=m.away_score then 5
            else 0
        end,
        case
            when m.phase='GROUP_STAGE' and m.winner_registration_id is null and m.home_score=m.away_score then 8
            when m.winner_registration_id=r.id and m.phase='GROUP_STAGE' then 24
            when m.winner_registration_id is not null and m.phase='GROUP_STAGE' then -12
            when m.winner_registration_id=r.id and m.phase<>'GROUP_STAGE' then 28
            when m.winner_registration_id is not null and m.phase<>'GROUP_STAGE' then -14
            else 0
        end
    from public.championship_matches m
    join public.championship_registrations r on r.id=m.away_registration_id
    where m.championship_id=p_championship_id
      and m.status in('VALIDATED','WO','ADMIN_DECISION');

    -- Totais por participante.
    insert into public.ccfv_champions_player_totals_v2(
        championship_id,participant_id,match_points,stage_points,
        total_ranking_points,elo_delta,wins,draws,losses,titles,
        phase_reached,updated_at
    )
    select
        p_championship_id,
        reg.participant_id,
        coalesce(sum(mp.ranking_points),0)::integer as match_points,
        case
            when v_status in('CLOSED','ARCHIVED') then
                case
                    when reg.id=v_winner then 100
                    when reg.id=v_runner then 80
                    when exists(
                        select 1 from public.championship_matches x
                        where x.championship_id=p_championship_id
                          and x.phase='SEMIFINALS'
                          and x.status in('VALIDATED','WO','ADMIN_DECISION')
                          and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)
                    ) then 65
                    when exists(
                        select 1 from public.championship_matches x
                        where x.championship_id=p_championship_id
                          and x.phase='QUARTERFINALS'
                          and x.status in('VALIDATED','WO','ADMIN_DECISION')
                          and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)
                    ) then 50
                    when exists(
                        select 1 from public.championship_matches x
                        where x.championship_id=p_championship_id
                          and x.phase='ROUND_OF_16'
                          and x.status in('VALIDATED','WO','ADMIN_DECISION')
                          and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)
                    ) then 35
                    else 20
                end
            else 0
        end::integer as stage_points,
        (
            coalesce(sum(mp.ranking_points),0)
            + case
                when v_status in('CLOSED','ARCHIVED') then
                    case
                        when reg.id=v_winner then 100
                        when reg.id=v_runner then 80
                        when exists(select 1 from public.championship_matches x where x.championship_id=p_championship_id and x.phase='SEMIFINALS' and x.status in('VALIDATED','WO','ADMIN_DECISION') and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)) then 65
                        when exists(select 1 from public.championship_matches x where x.championship_id=p_championship_id and x.phase='QUARTERFINALS' and x.status in('VALIDATED','WO','ADMIN_DECISION') and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)) then 50
                        when exists(select 1 from public.championship_matches x where x.championship_id=p_championship_id and x.phase='ROUND_OF_16' and x.status in('VALIDATED','WO','ADMIN_DECISION') and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)) then 35
                        else 20
                    end
                else 0
              end
        )::integer as total_ranking_points,
        coalesce(sum(mp.elo_delta),0)::integer as elo_delta,
        count(*) filter(where mp.result='WIN')::integer as wins,
        count(*) filter(where mp.result='DRAW')::integer as draws,
        count(*) filter(where mp.result='LOSS')::integer as losses,
        case when v_status in('CLOSED','ARCHIVED') and reg.id=v_winner then 1 else 0 end::integer as titles,
        case
            when v_status in('CLOSED','ARCHIVED') and reg.id=v_winner then 'CHAMPION'
            when v_status in('CLOSED','ARCHIVED') and reg.id=v_runner then 'RUNNER_UP'
            when exists(select 1 from public.championship_matches x where x.championship_id=p_championship_id and x.phase='SEMIFINALS' and x.status in('VALIDATED','WO','ADMIN_DECISION') and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)) then 'SEMIFINALS'
            when exists(select 1 from public.championship_matches x where x.championship_id=p_championship_id and x.phase='QUARTERFINALS' and x.status in('VALIDATED','WO','ADMIN_DECISION') and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)) then 'QUARTERFINALS'
            when exists(select 1 from public.championship_matches x where x.championship_id=p_championship_id and x.phase='ROUND_OF_16' and x.status in('VALIDATED','WO','ADMIN_DECISION') and (x.home_registration_id=reg.id or x.away_registration_id=reg.id)) then 'ROUND_OF_16'
            else 'GROUP_STAGE'
        end,
        now()
    from public.championship_registrations reg
    left join public.ccfv_champions_match_points_v2 mp
      on mp.championship_id=p_championship_id
     and mp.participant_id=reg.participant_id
    where reg.championship_id=p_championship_id
    group by reg.id,reg.participant_id;

    -- Aplica somente a contribuição calculada desta Champions.
    update public.players p
       set ranking_points=coalesce(p.ranking_points,0)+t.total_ranking_points,
           elo=greatest(0,coalesce(p.elo,0)+t.elo_delta),
           wins=coalesce(p.wins,0)+t.wins,
           draws=coalesce(p.draws,0)+t.draws,
           losses=coalesce(p.losses,0)+t.losses,
           titles=coalesce(p.titles,0)+t.titles
      from public.ccfv_champions_player_totals_v2 t
     where t.championship_id=p_championship_id
       and p.id=t.participant_id;

    perform public.ccfv_champions_sync_global_ranking_v2();

    select count(*) into v_count
    from public.ccfv_champions_player_totals_v2
    where championship_id=p_championship_id;

    return jsonb_build_object(
        'success',true,
        'championship_id',p_championship_id,
        'participants',v_count,
        'status',v_status,
        'winner_registration_id',v_winner,
        'runner_up_registration_id',v_runner
    );
end;
$$;

-- ------------------------------------------------------------
-- 06. Trigger: resultado novo/alterado/removido mantém pontos.
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
    v_match_id := case when tg_op='DELETE' then old.match_id else new.match_id end;

    select championship_id into v_championship_id
    from public.championship_matches
    where id=v_match_id;

    if v_championship_id is not null then
        perform public.ccfv_champions_rebuild_competitive_stats_v2(v_championship_id);
    end if;

    return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_ccfv_champions_result_points_v2
on public.championship_results;

create trigger trg_ccfv_champions_result_points_v2
after insert or update or delete
on public.championship_results
for each row
execute function public.ccfv_champions_result_points_trigger_v2();

-- ------------------------------------------------------------
-- 07. Finalização: Ranking + Histórico + Hall.
-- ------------------------------------------------------------
create or replace function public.champions_finalize_ranking_and_history(
    p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
    v_status text;
    v_winner uuid;
    v_runner uuid;
    v_season_label text;
begin
    select status,season_label
      into v_status,v_season_label
    from public.championships
    where id=p_championship_id;

    if v_status not in('CLOSED','ARCHIVED') then
        raise exception 'A temporada precisa estar CLOSED ou ARCHIVED.';
    end if;

    select winner_registration_id into v_winner
    from public.championship_matches
    where championship_id=p_championship_id
      and phase='FINAL'
      and status in('VALIDATED','WO','ADMIN_DECISION')
    order by match_number desc
    limit 1;

    if v_winner is null then
        raise exception 'Campeão não encontrado.';
    end if;

    select case when home_registration_id=v_winner then away_registration_id else home_registration_id end
      into v_runner
    from public.championship_matches
    where championship_id=p_championship_id
      and phase='FINAL'
      and status in('VALIDATED','WO','ADMIN_DECISION')
    order by match_number desc
    limit 1;

    perform public.ccfv_champions_rebuild_competitive_stats_v2(p_championship_id);

    delete from public.championship_ranking_points
    where championship_id=p_championship_id;

    insert into public.championship_ranking_points(championship_id,participant_id,stage,points)
    select championship_id,participant_id,phase_reached,stage_points
    from public.ccfv_champions_player_totals_v2
    where championship_id=p_championship_id
      and stage_points>0;

    delete from public.championship_history
    where championship_id=p_championship_id;

    insert into public.championship_history(
        championship_id,participant_id,club_id,final_position,phase_reached,
        matches_played,wins,draws,losses
    )
    select
        p_championship_id,
        reg.participant_id,
        c.id,
        case when reg.id=v_winner then 1 when reg.id=v_runner then 2 else null end,
        coalesce(t.phase_reached,'GROUP_STAGE'),
        coalesce(t.wins,0)+coalesce(t.draws,0)+coalesce(t.losses,0),
        coalesce(t.wins,0),
        coalesce(t.draws,0),
        coalesce(t.losses,0)
    from public.championship_registrations reg
    join public.championship_clubs cc on cc.id=reg.selected_club_id
    join public.champions_clubs c on c.id=cc.club_id
    left join public.ccfv_champions_player_totals_v2 t
      on t.championship_id=p_championship_id
     and t.participant_id=reg.participant_id
    where reg.championship_id=p_championship_id;

    delete from public.championship_awards
    where championship_id=p_championship_id;

    insert into public.championship_awards(
        championship_id,participant_id,club_id,award_type,title,award_data
    )
    select
        p_championship_id,reg.participant_id,c.id,
        'CHAMPION','CAMPEÃO',
        jsonb_build_object('phase','FINAL','season',v_season_label)
    from public.championship_registrations reg
    join public.championship_clubs cc on cc.id=reg.selected_club_id
    join public.champions_clubs c on c.id=cc.club_id
    where reg.id=v_winner;

    insert into public.championship_awards(
        championship_id,participant_id,club_id,award_type,title,award_data
    )
    select
        p_championship_id,reg.participant_id,c.id,
        'RUNNER_UP','VICE-CAMPEÃO',
        jsonb_build_object('phase','FINAL','season',v_season_label)
    from public.championship_registrations reg
    join public.championship_clubs cc on cc.id=reg.selected_club_id
    join public.champions_clubs c on c.id=cc.club_id
    where reg.id=v_runner;

    delete from public.ccfv_hall_of_fame
    where championship_id=p_championship_id;

    insert into public.ccfv_hall_of_fame(
        championship_id,participant_id,club_id,title,season
    )
    select
        p_championship_id,reg.participant_id,c.id,'CAMPEÃO',v_season_label
    from public.championship_registrations reg
    join public.championship_clubs cc on cc.id=reg.selected_club_id
    join public.champions_clubs c on c.id=cc.club_id
    where reg.id=v_winner;

    insert into public.championship_events(
        championship_id,event_type,phase,payload,created_by
    )
    values(
        p_championship_id,
        'RANKING_HISTORY_FINALIZED',
        'CLOSED',
        jsonb_build_object(
            'champion',v_winner,
            'runner_up',v_runner,
            'season',v_season_label
        ),
        auth.uid()
    );

    return jsonb_build_object(
        'success',true,
        'champion_registration_id',v_winner,
        'runner_up_registration_id',v_runner
    );
end;
$$;

-- ------------------------------------------------------------
-- 08. Finish é idempotente: pode ser executado mesmo se CLOSED.
-- ------------------------------------------------------------
create or replace function public.champions_finish_season(
    p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
    v_status text;
    v_close jsonb := '{}'::jsonb;
    v_final jsonb;
begin
    perform public.champions_require_authenticated();

    select status into v_status
    from public.championships
    where id=p_championship_id;

    if v_status is null then
        raise exception 'Temporada não encontrada.';
    end if;

    if v_status not in('CLOSED','ARCHIVED') then
        v_close:=public.champions_close_final(p_championship_id);
    end if;

    v_final:=public.champions_finalize_ranking_and_history(p_championship_id);

    return jsonb_build_object(
        'success',true,
        'close',v_close,
        'finalize',v_final
    );
end;
$$;

-- ------------------------------------------------------------
-- 09. Criação de nova temporada pela tela do Admin.
-- ------------------------------------------------------------
create or replace function public.champions_create_season(
    p_season_number integer default null,
    p_season_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
    v_number integer;
    v_label text;
    v_code text;
    v_id uuid;
    v_clubs integer;
begin
    perform public.champions_require_authenticated();

    if exists(
        select 1 from public.championships
        where status not in('CLOSED','ARCHIVED')
    ) then
        raise exception 'Já existe uma temporada da Champions em andamento.';
    end if;

    if p_season_number is null then
        select coalesce(max(season_number),0)+1 into v_number
        from public.championships;
    else
        v_number:=p_season_number;
    end if;

    if v_number<=0 then
        raise exception 'Número de temporada inválido.';
    end if;

    if exists(select 1 from public.championships where season_number=v_number) then
        raise exception 'A Season % já existe.',v_number;
    end if;

    v_label:=coalesce(nullif(trim(p_season_label),''),'SEASON '||lpad(v_number::text,2,'0'));
    v_code:='CCFV-CL-S'||lpad(v_number::text,2,'0');

    if (select count(*) from public.champions_clubs where active=true) < 32 then
        raise exception 'O catálogo Champions precisa ter pelo menos 32 clubes ativos.';
    end if;

    insert into public.championships(
        code,name,season_number,season_label,status,platform_scope,
        max_participants,total_clubs,total_groups,clubs_per_group,
        participants_per_group,qualifiers_per_group,single_leg,
        observations,created_by
    )
    values(
        v_code,'CCFV Champions League',v_number,v_label,'REGISTRATIONS','PC_CONSOLE',
        32,32,8,4,4,2,true,
        'Champions League CCFV PC + Console — 32 clubes, 8 grupos de 4, dois classificados por grupo e mata-mata em jogo único.',
        auth.uid()
    )
    returning id into v_id;

    insert into public.championship_settings(
        championship_id,match_team_mode,match_minutes,condition_mode,
        extra_time_group,penalties_group,extra_time_knockout,penalties_knockout,
        registered_club_required,draw_pots,clubs_per_pot,ranking_points,public_visible
    )
    values(
        v_id,'AUTHENTIC',10,'NORMAL',false,false,true,true,true,4,8,
        '{"GROUP_STAGE":20,"ROUND_OF_16":35,"QUARTERFINALS":50,"SEMIFINALS":65,"RUNNER_UP":80,"CHAMPION":100}'::jsonb,
        true
    );

    insert into public.championship_clubs(championship_id,club_id,status)
    select v_id,c.id,'AVAILABLE'
    from public.champions_clubs c
    where c.active=true
    order by c.sort_order
    limit 32;

    select count(*) into v_clubs
    from public.championship_clubs
    where championship_id=v_id;

    if v_clubs<>32 then
        raise exception 'Não foi possível montar as 32 vagas da nova temporada.';
    end if;

    insert into public.championship_pots(championship_id,pot_number,name)
    select v_id,n,'POTE '||n from generate_series(1,4) n;

    insert into public.championship_groups(
        championship_id,group_code,group_name,display_order,status
    )
    select v_id,chr(64+n),'GRUPO '||chr(64+n),n,'READY'
    from generate_series(1,8) n;

    return jsonb_build_object(
        'success',true,
        'championship_id',v_id,
        'code',v_code,
        'season_number',v_number,
        'season_label',v_label,
        'status','REGISTRATIONS',
        'clubs',32,
        'groups',8,
        'pots',4
    );
end;
$$;

-- ------------------------------------------------------------
-- 10. Backfill/repair automático da Season 01 já encerrada.
-- Se ela estiver CLOSED/ARCHIVED, corrige ranking/histórico agora.
-- ------------------------------------------------------------
do $$
declare
    v_s01 uuid;
    v_status text;
begin
    select id,status into v_s01,v_status
    from public.championships
    where code='CCFV-CL-S01';

    if v_s01 is not null and v_status in('CLOSED','ARCHIVED') then
        perform public.champions_finalize_ranking_and_history(v_s01);
    end if;
end;
$$;

-- ------------------------------------------------------------
-- 11. Permissões das funções de escrita.
-- ------------------------------------------------------------
revoke all on function public.ccfv_champions_rebuild_competitive_stats_v2(uuid) from public;
revoke all on function public.ccfv_champions_sync_global_ranking_v2() from public;
revoke all on function public.champions_finalize_ranking_and_history(uuid) from public;
revoke all on function public.champions_finish_season(uuid) from public;
revoke all on function public.champions_create_season(integer,text) from public;

grant execute on function public.ccfv_champions_rebuild_competitive_stats_v2(uuid) to authenticated;
grant execute on function public.ccfv_champions_sync_global_ranking_v2() to authenticated;
grant execute on function public.champions_finalize_ranking_and_history(uuid) to authenticated;
grant execute on function public.champions_finish_season(uuid) to authenticated;
grant execute on function public.champions_create_season(integer,text) to authenticated;

notify pgrst,'reload schema';

commit;
