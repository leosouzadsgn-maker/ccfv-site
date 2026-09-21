-- ============================================================
-- CCFV CHAMPIONS — PONTUAÇÃO COMPETITIVA + ELO CCFV
--
-- Objetivo:
-- • Vitória na Champions: +15 pontos de ranking de partida
-- • Empate: +5
-- • Derrota: +0
--
-- Elo CCFV:
-- • Vitória fase de grupos: +24
-- • Empate fase de grupos: +8
-- • Derrota fase de grupos: -12
-- • Vitória no mata-mata: +28
-- • Derrota no mata-mata: -14
--
-- O Elo começa no valor atual do jogador e nunca fica abaixo de 0.
-- Os bônus por fase são deliberadamente pequenos:
-- Grupo 20 / Oitavas 35 / Quartas 50 / Semi 65 / Vice 80 / Campeão 100.
-- Isso evita subir de faixa depois de poucas partidas.
--
-- Este é o Elo competitivo da CCFV, numa escala 0+.
-- ============================================================

create table if not exists public.championship_match_points (
    id uuid primary key default gen_random_uuid(),
    championship_id uuid not null
        references public.championships(id) on delete cascade,
    match_id uuid not null
        references public.championship_matches(id) on delete cascade,
    participant_id uuid not null
        references public.players(id) on delete restrict,
    result text not null
        check (result in ('WIN','DRAW','LOSS')),
    ranking_points integer not null default 0,
    elo_delta integer not null default 0,
    elo_before integer not null default 0,
    elo_after integer not null default 0,
    created_at timestamptz not null default now(),
    unique(match_id, participant_id)
);

create index if not exists championship_match_points_participant_idx
    on public.championship_match_points(participant_id, created_at desc);

create index if not exists championship_match_points_championship_idx
    on public.championship_match_points(championship_id, participant_id);

-- ============================================================
-- Sincroniza a tabela ccfv_ranking quando ela for uma TABLE.
-- Se ccfv_ranking for uma VIEW/MATERIALIZED VIEW, o próprio
-- ranking deve derivar de players/consulta existente.
-- ============================================================

create or replace function public.champions_sync_ccfv_ranking()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_relkind "char";
    v_has_player_id boolean;
    v_has_elo boolean;
    v_has_wins boolean;
    v_has_draws boolean;
    v_has_losses boolean;
    v_has_titles boolean;
    v_has_name boolean;
    v_has_platform boolean;
    v_has_photo boolean;
    v_has_ranking_position boolean;
    v_set text := '';
begin

    select c.relkind
    into v_relkind
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'ccfv_ranking';

    if v_relkind is distinct from 'r' then
        return;
    end if;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='player_id'
    ) into v_has_player_id;

    if not v_has_player_id then
        return;
    end if;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='elo'
    ) into v_has_elo;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='wins'
    ) into v_has_wins;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='draws'
    ) into v_has_draws;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='losses'
    ) into v_has_losses;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='titles'
    ) into v_has_titles;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='name'
    ) into v_has_name;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='platform'
    ) into v_has_platform;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name in ('photo','photo_url')
    ) into v_has_photo;

    select exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ccfv_ranking'
          and column_name='ranking_position'
    ) into v_has_ranking_position;

    if v_has_elo then
        v_set := v_set || 'r.elo = p.elo,';
    end if;

    if v_has_wins then
        v_set := v_set || 'r.wins = p.wins,';
    end if;

    if v_has_draws then
        v_set := v_set || 'r.draws = p.draws,';
    end if;

    if v_has_losses then
        v_set := v_set || 'r.losses = p.losses,';
    end if;

    if v_has_titles then
        v_set := v_set || 'r.titles = p.titles,';
    end if;

    if v_has_name then
        v_set := v_set || 'r.name = p.name,';
    end if;

    if v_has_platform then
        v_set := v_set || 'r.platform = p.platform,';
    end if;

    if v_set <> '' then
        v_set := left(v_set, length(v_set)-1);

        execute format(
            'update public.ccfv_ranking r
             set %s
             from public.players p
             where r.player_id = p.id',
            v_set
        );
    end if;

    if v_has_ranking_position then

        execute '
            with ranked as (
                select
                    r.player_id,
                    row_number() over (
                        order by
                            coalesce(r.elo,0) desc,
                            coalesce(r.wins,0) desc,
                            coalesce(r.draws,0) desc,
                            coalesce(r.losses,0) asc,
                            r.player_id
                    )::integer as new_position
                from public.ccfv_ranking r
            )
            update public.ccfv_ranking r
            set ranking_position = ranked.new_position
            from ranked
            where r.player_id = ranked.player_id
        ';

    end if;

exception
    when undefined_table then
        return;
    when undefined_column then
        return;
end;
$$;

-- ============================================================
-- Aplica um resultado da Champions aos dois sistemas:
-- 1) histórico de partidas do player
-- 2) pontos competitivos
-- 3) Elo CCFV
-- ============================================================

create or replace function public.champions_apply_player_result(
    p_match_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_match public.championship_matches%rowtype;

    v_home_player uuid;
    v_away_player uuid;

    v_home_result text;
    v_away_result text;

    v_home_rank_points integer;
    v_away_rank_points integer;

    v_home_elo_delta integer;
    v_away_elo_delta integer;

    v_home_elo_before integer;
    v_away_elo_before integer;

    v_home_elo_after integer;
    v_away_elo_after integer;
begin

    select *
    into v_match
    from public.championship_matches
    where id = p_match_id;

    if v_match.id is null then
        raise exception 'Partida % não encontrada.', p_match_id;
    end if;

    select participant_id
    into v_home_player
    from public.championship_registrations
    where id = v_match.home_registration_id;

    select participant_id
    into v_away_player
    from public.championship_registrations
    where id = v_match.away_registration_id;

    if v_home_player is null or v_away_player is null then
        return;
    end if;

    -- Não contabiliza novamente uma partida já processada.
    if exists (
        select 1
        from public.championship_match_points
        where match_id = p_match_id
    ) then
        return;
    end if;

    -- ----------------------------------------------------------
    -- FASE DE GRUPOS
    -- ----------------------------------------------------------

    if v_match.phase = 'GROUP_STAGE' then

        if v_match.home_score > v_match.away_score then
            v_home_result := 'WIN';
            v_away_result := 'LOSS';

            v_home_rank_points := 15;
            v_away_rank_points := 0;

            v_home_elo_delta := 24;
            v_away_elo_delta := -12;

        elsif v_match.home_score < v_match.away_score then
            v_home_result := 'LOSS';
            v_away_result := 'WIN';

            v_home_rank_points := 0;
            v_away_rank_points := 15;

            v_home_elo_delta := -12;
            v_away_elo_delta := 24;

        else
            v_home_result := 'DRAW';
            v_away_result := 'DRAW';

            v_home_rank_points := 5;
            v_away_rank_points := 5;

            v_home_elo_delta := 8;
            v_away_elo_delta := 8;
        end if;

    -- ----------------------------------------------------------
    -- MATA-MATA
    -- ----------------------------------------------------------

    else

        if v_match.winner_registration_id = v_match.home_registration_id then
            v_home_result := 'WIN';
            v_away_result := 'LOSS';

            v_home_rank_points := 20;
            v_away_rank_points := 0;

            v_home_elo_delta := 28;
            v_away_elo_delta := -14;

        elsif v_match.winner_registration_id = v_match.away_registration_id then
            v_home_result := 'LOSS';
            v_away_result := 'WIN';

            v_home_rank_points := 0;
            v_away_rank_points := 20;

            v_home_elo_delta := -14;
            v_away_elo_delta := 28;

        else
            raise exception
                'Resultado do mata-mata não possui vencedor na partida %.',
                p_match_id;
        end if;

    end if;

    select coalesce(elo,0)
    into v_home_elo_before
    from public.players
    where id = v_home_player
    for update;

    select coalesce(elo,0)
    into v_away_elo_before
    from public.players
    where id = v_away_player
    for update;

    v_home_elo_after :=
        greatest(0, v_home_elo_before + v_home_elo_delta);

    v_away_elo_after :=
        greatest(0, v_away_elo_before + v_away_elo_delta);

    -- ----------------------------------------------------------
    -- PLAYER CASA
    -- ----------------------------------------------------------

    update public.players
    set
        elo = v_home_elo_after,
        wins = coalesce(wins,0) + case when v_home_result='WIN' then 1 else 0 end,
        draws = coalesce(draws,0) + case when v_home_result='DRAW' then 1 else 0 end,
        losses = coalesce(losses,0) + case when v_home_result='LOSS' then 1 else 0 end
    where id = v_home_player;

    -- ----------------------------------------------------------
    -- PLAYER FORA
    -- ----------------------------------------------------------

    update public.players
    set
        elo = v_away_elo_after,
        wins = coalesce(wins,0) + case when v_away_result='WIN' then 1 else 0 end,
        draws = coalesce(draws,0) + case when v_away_result='DRAW' then 1 else 0 end,
        losses = coalesce(losses,0) + case when v_away_result='LOSS' then 1 else 0 end
    where id = v_away_player;

    -- ----------------------------------------------------------
    -- LEDGER DE PONTOS
    -- ----------------------------------------------------------

    insert into public.championship_match_points(
        championship_id,
        match_id,
        participant_id,
        result,
        ranking_points,
        elo_delta,
        elo_before,
        elo_after
    )
    values
    (
        v_match.championship_id,
        p_match_id,
        v_home_player,
        v_home_result,
        v_home_rank_points,
        v_home_elo_delta,
        v_home_elo_before,
        v_home_elo_after
    ),
    (
        v_match.championship_id,
        p_match_id,
        v_away_player,
        v_away_result,
        v_away_rank_points,
        v_away_elo_delta,
        v_away_elo_before,
        v_away_elo_after
    );

    perform public.champions_sync_ccfv_ranking();

end;
$$;

-- ============================================================
-- Trigger: resultado validado alimenta ranking automaticamente.
-- ============================================================

create or replace function public.champions_result_points_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.validated = true then
        perform public.champions_apply_player_result(new.match_id);
    end if;

    return new;
end;
$$;

drop trigger if exists trg_champions_result_points
on public.championship_results;

create trigger trg_champions_result_points
after insert
on public.championship_results
for each row
execute function public.champions_result_points_trigger();

-- ============================================================
-- Garante os bônus pequenos de fase no fechamento.
-- Recriamos somente o finalizer oficial já existente.
-- ============================================================

create or replace function public.champions_finalize_ranking_and_history(
  p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champion uuid;
  v_runner uuid;
  v_season_label text;
begin
  perform public.champions_require_authenticated();

  if (
    select status
    from public.championships
    where id = p_championship_id
  ) <> 'CLOSED' then
    raise exception 'A temporada precisa estar CLOSED.';
  end if;

  select winner_registration_id
    into v_champion
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'FINAL'
  limit 1;

  if v_champion is null then
    raise exception 'Campeão não encontrado.';
  end if;

  select case
    when home_registration_id = v_champion
      then away_registration_id
    else home_registration_id
  end
  into v_runner
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'FINAL'
  limit 1;

  select season_label
    into v_season_label
  from public.championships
  where id = p_championship_id;

  delete from public.championship_ranking_points
  where championship_id = p_championship_id;

  delete from public.championship_history
  where championship_id = p_championship_id;

  -- Eliminados nos grupos
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select distinct
    p_championship_id,
    reg.participant_id,
    'GROUP_STAGE',
    20
  from public.championship_registrations reg
  join public.championship_group_standings standing
    on standing.registration_id = reg.id
   and standing.championship_id = p_championship_id
  where reg.championship_id = p_championship_id
    and standing.qualified = false;

  -- Perdedor das oitavas
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'ROUND_OF_16',
    35
  from public.championship_matches match
  join public.championship_registrations reg
    on reg.id = case
      when match.winner_registration_id = match.home_registration_id
        then match.away_registration_id
      else match.home_registration_id
    end
  where match.championship_id = p_championship_id
    and match.phase = 'ROUND_OF_16';

  -- Perdedor das quartas
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'QUARTERFINALS',
    50
  from public.championship_matches match
  join public.championship_registrations reg
    on reg.id = case
      when match.winner_registration_id = match.home_registration_id
        then match.away_registration_id
      else match.home_registration_id
    end
  where match.championship_id = p_championship_id
    and match.phase = 'QUARTERFINALS';

  -- Perdedor da semifinal
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'SEMIFINALS',
    65
  from public.championship_matches match
  join public.championship_registrations reg
    on reg.id = case
      when match.winner_registration_id = match.home_registration_id
        then match.away_registration_id
      else match.home_registration_id
    end
  where match.championship_id = p_championship_id
    and match.phase = 'SEMIFINALS';

  -- Vice
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'RUNNER_UP',
    80
  from public.championship_registrations reg
  where reg.id = v_runner;

  -- Campeão
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'CHAMPION',
    100
  from public.championship_registrations reg
  where reg.id = v_champion;

  -- Histórico
  insert into public.championship_history(
    championship_id,
    participant_id,
    club_id,
    final_position,
    phase_reached,
    matches_played,
    wins,
    draws,
    losses
  )
  select
    p_championship_id,
    reg.participant_id,
    catalog.id,
    case
      when reg.id = v_champion then 1
      when reg.id = v_runner then 2
      else null
    end,
    case
      when reg.id = v_champion then 'CHAMPION'
      when reg.id = v_runner then 'FINAL'
      when exists (
        select 1
        from public.championship_matches m
        where m.championship_id = p_championship_id
          and m.phase = 'SEMIFINALS'
          and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
      ) then 'SEMIFINALS'
      when exists (
        select 1
        from public.championship_matches m
        where m.championship_id = p_championship_id
          and m.phase = 'QUARTERFINALS'
          and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
      ) then 'QUARTERFINALS'
      when exists (
        select 1
        from public.championship_matches m
        where m.championship_id = p_championship_id
          and m.phase = 'ROUND_OF_16'
          and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
      ) then 'ROUND_OF_16'
      else 'GROUP_STAGE'
    end,
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
    ),
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and m.winner_registration_id = reg.id
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
    ),
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
        and m.winner_registration_id is null
        and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
    ),
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and m.winner_registration_id is not null
        and m.winner_registration_id <> reg.id
        and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
    )
  from public.championship_registrations reg
  join public.championship_clubs assignment
    on assignment.id = reg.selected_club_id
  join public.champions_clubs catalog
    on catalog.id = assignment.club_id
  where reg.championship_id = p_championship_id
  on conflict(championship_id, participant_id)
  do update set
    club_id = excluded.club_id,
    final_position = excluded.final_position,
    phase_reached = excluded.phase_reached,
    matches_played = excluded.matches_played,
    wins = excluded.wins,
    draws = excluded.draws,
    losses = excluded.losses;

  insert into public.championship_awards(
    championship_id,
    participant_id,
    club_id,
    award_type,
    title,
    award_data
  )
  select
    p_championship_id,
    reg.participant_id,
    catalog.id,
    'RUNNER_UP',
    'VICE-CAMPEÃO',
    jsonb_build_object('phase','FINAL')
  from public.championship_registrations reg
  join public.championship_clubs assignment
    on assignment.id = reg.selected_club_id
  join public.champions_clubs catalog
    on catalog.id = assignment.club_id
  where reg.id = v_runner
  on conflict do nothing;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values(
    p_championship_id,
    'RANKING_HISTORY_FINALIZED',
    'CLOSED',
    jsonb_build_object(
      'champion', v_champion,
      'runner_up', v_runner,
      'season', v_season_label
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'champion', v_champion,
    'runner_up', v_runner
  );
end;
$$;

-- ============================================================
-- View de resumo da pontuação individual da Champions.
-- ============================================================

create or replace view public.championship_public_player_points
as
select
    cmp.championship_id,
    cmp.participant_id,
    p.name as participant_name,
    p.platform,
    count(*)::integer as matches,
    count(*) filter (where cmp.result='WIN')::integer as wins,
    count(*) filter (where cmp.result='DRAW')::integer as draws,
    count(*) filter (where cmp.result='LOSS')::integer as losses,
    coalesce(sum(cmp.ranking_points),0)::integer as match_ranking_points,
    coalesce(sum(cmp.elo_delta),0)::integer as championship_elo_delta,
    max(cmp.elo_after)::integer as current_elo
from public.championship_match_points cmp
join public.players p
  on p.id = cmp.participant_id
group by
    cmp.championship_id,
    cmp.participant_id,
    p.name,
    p.platform;

grant select
on public.championship_public_player_points
to anon, authenticated;

notify pgrst, 'reload schema';
