-- ============================================================
-- CCFV CHAMPIONS — RODADAS + PONTOS + ELO + RANKING
-- Executar UMA vez no Supabase.
-- ============================================================

-- 1) Pontos acumulados do jogador.
alter table public.players
    add column if not exists ranking_points integer not null default 0;

-- 2) Ledger imutável das partidas da Champions.
create table if not exists public.championship_match_points (
    id uuid primary key default gen_random_uuid(),
    championship_id uuid not null references public.championships(id) on delete cascade,
    match_id uuid not null references public.championship_matches(id) on delete cascade,
    participant_id uuid not null references public.players(id) on delete restrict,
    result text not null check (result in ('WIN','DRAW','LOSS')),
    ranking_points integer not null default 0,
    elo_delta integer not null default 0,
    elo_before integer not null default 0,
    elo_after integer not null default 0,
    created_at timestamptz not null default now(),
    unique(match_id, participant_id)
);

create index if not exists championship_match_points_player_idx
    on public.championship_match_points(participant_id, created_at desc);

-- 3) O ranking oficial atual é alimentado a partir de players pelo live engine.
-- Ainda assim, quando ccfv_ranking tiver ranking_points, ele também recebe o valor.
alter table public.ccfv_ranking
    add column if not exists ranking_points integer not null default 0;

-- 4) Corrige os 48 jogos existentes: 3 rodadas por grupo.
-- O mapeamento usa a posição original dos dois participantes no grupo.
update public.championship_matches m
set round_number = case
    when least(gm1.draw_position, gm2.draw_position) = 1
         and greatest(gm1.draw_position, gm2.draw_position) = 4
        then 1
    when least(gm1.draw_position, gm2.draw_position) = 2
         and greatest(gm1.draw_position, gm2.draw_position) = 3
        then 1
    when least(gm1.draw_position, gm2.draw_position) = 1
         and greatest(gm1.draw_position, gm2.draw_position) = 3
        then 2
    when least(gm1.draw_position, gm2.draw_position) = 2
         and greatest(gm1.draw_position, gm2.draw_position) = 4
        then 2
    when least(gm1.draw_position, gm2.draw_position) = 1
         and greatest(gm1.draw_position, gm2.draw_position) = 2
        then 3
    when least(gm1.draw_position, gm2.draw_position) = 3
         and greatest(gm1.draw_position, gm2.draw_position) = 4
        then 3
    else m.round_number
end
from public.championship_group_members gm1
join public.championship_group_members gm2
  on gm2.group_id = gm1.group_id
 and gm2.registration_id <> gm1.registration_id
where m.phase = 'GROUP_STAGE'
  and m.group_id = gm1.group_id
  and (
      m.home_registration_id = gm1.registration_id
      and m.away_registration_id = gm2.registration_id
      or
      m.away_registration_id = gm1.registration_id
      and m.home_registration_id = gm2.registration_id
  );

-- 5) Retira as possíveis linhas duplicadas da correção acima antes do backfill.
-- O UNIQUE(match_id,participant_id) impede dupla contabilização.

-- 6) Função para contabilizar uma partida validada.
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
    v_home_points integer;
    v_away_points integer;
    v_home_elo_delta integer;
    v_away_elo_delta integer;
    v_home_before integer;
    v_away_before integer;
    v_home_after integer;
    v_away_after integer;
begin
    select * into v_match
    from public.championship_matches
    where id = p_match_id;

    if v_match.id is null then
        raise exception 'Partida % não encontrada.', p_match_id;
    end if;

    if exists (
        select 1
        from public.championship_match_points
        where match_id = p_match_id
    ) then
        return;
    end if;

    select participant_id into v_home_player
    from public.championship_registrations
    where id = v_match.home_registration_id;

    select participant_id into v_away_player
    from public.championship_registrations
    where id = v_match.away_registration_id;

    if v_home_player is null or v_away_player is null then
        return;
    end if;

    if v_match.phase = 'GROUP_STAGE' then
        if v_match.home_score > v_match.away_score then
            v_home_result := 'WIN';
            v_away_result := 'LOSS';
            v_home_points := 15;
            v_away_points := 0;
            v_home_elo_delta := 24;
            v_away_elo_delta := -12;
        elsif v_match.home_score < v_match.away_score then
            v_home_result := 'LOSS';
            v_away_result := 'WIN';
            v_home_points := 0;
            v_away_points := 15;
            v_home_elo_delta := -12;
            v_away_elo_delta := 24;
        else
            v_home_result := 'DRAW';
            v_away_result := 'DRAW';
            v_home_points := 5;
            v_away_points := 5;
            v_home_elo_delta := 8;
            v_away_elo_delta := 8;
        end if;
    else
        if v_match.winner_registration_id = v_match.home_registration_id then
            v_home_result := 'WIN';
            v_away_result := 'LOSS';
            v_home_points := 20;
            v_away_points := 0;
            v_home_elo_delta := 28;
            v_away_elo_delta := -14;
        elsif v_match.winner_registration_id = v_match.away_registration_id then
            v_home_result := 'LOSS';
            v_away_result := 'WIN';
            v_home_points := 0;
            v_away_points := 20;
            v_home_elo_delta := -14;
            v_away_elo_delta := 28;
        else
            raise exception 'Mata-mata sem vencedor na partida %.', p_match_id;
        end if;
    end if;

    select coalesce(elo,0)
      into v_home_before
    from public.players
    where id = v_home_player
    for update;

    select coalesce(elo,0)
      into v_away_before
    from public.players
    where id = v_away_player
    for update;

    v_home_after := greatest(0, v_home_before + v_home_elo_delta);
    v_away_after := greatest(0, v_away_before + v_away_elo_delta);

    update public.players
    set elo = v_home_after,
        ranking_points = coalesce(ranking_points,0) + v_home_points,
        wins = coalesce(wins,0) + case when v_home_result='WIN' then 1 else 0 end,
        draws = coalesce(draws,0) + case when v_home_result='DRAW' then 1 else 0 end,
        losses = coalesce(losses,0) + case when v_home_result='LOSS' then 1 else 0 end
    where id = v_home_player;

    update public.players
    set elo = v_away_after,
        ranking_points = coalesce(ranking_points,0) + v_away_points,
        wins = coalesce(wins,0) + case when v_away_result='WIN' then 1 else 0 end,
        draws = coalesce(draws,0) + case when v_away_result='DRAW' then 1 else 0 end,
        losses = coalesce(losses,0) + case when v_away_result='LOSS' then 1 else 0 end
    where id = v_away_player;

    insert into public.championship_match_points(
        championship_id, match_id, participant_id,
        result, ranking_points, elo_delta, elo_before, elo_after
    )
    values
    (v_match.championship_id, p_match_id, v_home_player,
     v_home_result, v_home_points, v_home_elo_delta,
     v_home_before, v_home_after),
    (v_match.championship_id, p_match_id, v_away_player,
     v_away_result, v_away_points, v_away_elo_delta,
     v_away_before, v_away_after);

    -- Sincroniza somente se houver linha correspondente no ranking oficial.
    update public.ccfv_ranking r
    set elo = p.elo,
        wins = p.wins,
        draws = p.draws,
        losses = p.losses,
        ranking_points = p.ranking_points
    from public.players p
    where r.player_id = p.id
      and p.id in (v_home_player, v_away_player);

    -- Recalcula as posições quando a tabela possuir a coluna.
    begin
        with ranked as (
            select r.player_id,
                   row_number() over (
                       order by coalesce(r.elo,0) desc,
                                coalesce(r.wins,0) desc,
                                coalesce(r.draws,0) desc,
                                coalesce(r.losses,0) asc,
                                r.player_id
                   )::integer as pos
            from public.ccfv_ranking r
        )
        update public.ccfv_ranking r
        set ranking_position = ranked.pos
        from ranked
        where r.player_id = ranked.player_id;
    exception
        when undefined_column then null;
        when undefined_table then null;
    end;
end;
$$;

-- 7) Resultado validado dispara pontos/Elo automaticamente.
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
after insert or update of validated, match_id
on public.championship_results
for each row
execute function public.champions_result_points_trigger();

-- 8) Backfill: contabiliza resultados da Champions que já estavam validados
-- antes desta integração existir.
do $$
declare
    r record;
begin
    for r in
        select cr.match_id
        from public.championship_results cr
        join public.championship_matches m on m.id = cr.match_id
        join public.championships ch on ch.id = m.championship_id
        where cr.validated = true
          and ch.code = 'CCFV-CL-S01'
        order by coalesce(m.played_at, m.created_at), m.match_number
    loop
        perform public.champions_apply_player_result(r.match_id);
    end loop;
end $$;

-- 9) Pontuação por jogador da Champions.
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
join public.players p on p.id = cmp.participant_id
group by cmp.championship_id, cmp.participant_id, p.name, p.platform;

grant select on public.championship_public_player_points to anon, authenticated;

notify pgrst, 'reload schema';
