-- ============================================================
-- CCFV CHAMPIONS — TESTE REAL COM DADOS DE TESTE
--
-- IMPORTANTE:
-- - Não apaga os 32 clubes.
-- - Não sobrescreve o Léo Souza/Barcelona.
-- - Cria 32 jogadores de teste, mas usa 31 vagas de teste +
--   o Léo Souza como 32º participante, porque Barcelona já é dele.
-- - O jogador TEST-CL-32 fica criado, mas fora da Champions.
--
-- Execute DEPOIS do SQL CCFV_CHAMPIONS_CORRECAO_FINAL_ADMIN.sql.
-- ============================================================

do $$
declare
    v_uid uuid;
    v_count integer;
    v_free integer;
    v_season uuid;
begin
    -- Simula uma sessão autenticada no SQL Editor usando o primeiro
    -- usuário disponível. A função auth.uid() passa a enxergá-lo.
    select id into v_uid from auth.users order by created_at limit 1;
    if v_uid is null then
        raise exception 'Nenhum usuário existe em auth.users.';
    end if;

    perform set_config(
        'request.jwt.claim.sub',
        v_uid::text,
        true
    );

    select id into v_season
    from public.championships
    where code = 'CCFV-CL-S01';

    if v_season is null then
        raise exception 'CCFV-CL-S01 não encontrada.';
    end if;

    -- ---------------------------------------------------------
    -- LIMPA SOMENTE TESTES ANTERIORES
    -- ---------------------------------------------------------
    delete from public.player_competitions
    where player_id in (
        select id from public.players
        where player_code like 'TEST-CL-%'
    );

    delete from public.championship_registrations
    where participant_id in (
        select id from public.players
        where player_code like 'TEST-CL-%'
    );

    update public.championship_clubs
    set
        participant_id = null,
        status = 'AVAILABLE',
        pot_number = null,
        updated_at = now()
    where championship_id = v_season
      and participant_id in (
        select id from public.players
        where player_code like 'TEST-CL-%'
      );

    delete from public.players
    where player_code like 'TEST-CL-%';

    -- Não mexemos no Léo.
    -- ---------------------------------------------------------
    -- CRIA 32 JOGADORES DE TESTE
    -- ---------------------------------------------------------
    insert into public.players(
        id,
        player_code,
        name,
        instagram,
        platform,
        photo_url,
        elo,
        wins,
        draws,
        losses,
        titles,
        status
    )
    select
        gen_random_uuid(),
        'TEST-CL-' || lpad(g::text,2,'0'),
        'TESTE CHAMPIONS ' || lpad(g::text,2,'0'),
        'teste.champions.' || lpad(g::text,2,'0'),
        case when g <= 16 then 'PC' else 'CONSOLE' end,
        null,
        0,0,0,0,0,
        'ACTIVE'
    from generate_series(1,32) g;

    -- ---------------------------------------------------------
    -- GARANTE 31 CLUBES LIVRES ALÉM DO BARCELONA DO LÉO
    -- ---------------------------------------------------------
    select count(*) into v_free
    from public.championship_clubs
    where championship_id = v_season
      and participant_id is null
      and status = 'AVAILABLE';

    if v_free < 31 then
        raise exception 'Há somente % clubes livres. O teste precisa de 31, pois Barcelona já é do Léo.', v_free;
    end if;

    -- ---------------------------------------------------------
    -- REGISTRA OS 31 TESTES NOS 31 CLUBES LIVRES
    -- ---------------------------------------------------------
    with test_players as (
        select
            id,
            row_number() over(order by player_code) as rn
        from public.players
        where player_code like 'TEST-CL-%'
        and player_code <> 'TEST-CL-32'
    ),
    free_clubs as (
        select
            id,
            row_number() over(order by id) as rn
        from public.championship_clubs
        where championship_id = v_season
          and participant_id is null
          and status = 'AVAILABLE'
          and club_id <> (
              select id from public.champions_clubs where slug = 'barcelona'
          )
        limit 31
    )
    insert into public.championship_registrations(
        championship_id,
        participant_id,
        priorities,
        selected_club_id,
        status,
        accepted_at,
        confirmed_by,
        confirmation_notes
    )
    select
        v_season,
        t.id,
        '[]'::jsonb,
        c.id,
        'CONFIRMED',
        now(),
        v_uid,
        'TESTE AUTOMATIZADO — CCFV Champions'
    from test_players t
    join free_clubs c on c.rn = t.rn;

    update public.championship_clubs cc
    set
        participant_id = r.participant_id,
        status = 'CONFIRMED',
        updated_at = now()
    from public.championship_registrations r
    where r.championship_id = v_season
      and r.selected_club_id = cc.id
      and r.status = 'CONFIRMED';

    insert into public.player_competitions(
        player_id,
        competition,
        team_name
    )
    select
        r.participant_id,
        'CHAMPIONS_LEAGUE',
        c.name
    from public.championship_registrations r
    join public.championship_clubs cc on cc.id = r.selected_club_id
    join public.champions_clubs c on c.id = cc.club_id
    where r.championship_id = v_season
      and r.status = 'CONFIRMED'
      and not exists (
          select 1 from public.player_competitions pc
          where pc.player_id = r.participant_id
            and upper(coalesce(pc.competition,'')) = 'CHAMPIONS_LEAGUE'
      );

    -- Léo/Barcelona é o 32º e permanece como já estava.
    -- ---------------------------------------------------------
    -- VALIDADORES
    -- ---------------------------------------------------------
    select count(*) into v_count
    from public.championship_clubs
    where championship_id = v_season
      and participant_id is not null;

    raise notice 'TREINADORES/CLUBES OCUPADOS: % / 32', v_count;

    select count(*) into v_count
    from public.championship_registrations
    where championship_id = v_season
      and status = 'CONFIRMED';

    raise notice 'INSCRIÇÕES CONFIRMED: % / 32', v_count;
end $$;

-- Resultado visual de conferência.
select
    'JOGADORES TESTE CRIADOS' as item,
    count(*)::integer as total
from public.players
where player_code like 'TEST-CL-%'

union all

select
    'PARTICIPANTES CHAMPIONS',
    count(*)::integer
from public.championship_registrations r
join public.championships ch on ch.id = r.championship_id
where ch.code = 'CCFV-CL-S01'
  and r.status = 'CONFIRMED'

union all

select
    'CLUBES OCUPADOS',
    count(*)::integer
from public.championship_clubs cc
join public.championships ch on ch.id = cc.championship_id
where ch.code = 'CCFV-CL-S01'
  and cc.participant_id is not null;

-- Confira especialmente Barcelona / Léo.
select
    c.name as clube,
    p.name as treinador,
    p.platform,
    cc.status
from public.championship_clubs cc
join public.champions_clubs c on c.id = cc.club_id
left join public.players p on p.id = cc.participant_id
join public.championships ch on ch.id = cc.championship_id
where ch.code = 'CCFV-CL-S01'
order by c.sort_order;
