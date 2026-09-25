-- ============================================================
-- CCFV CHAMPIONS — TESTE FINAL DA SEASON 01
-- Execute ANTES da limpeza.
--
-- Este teste não altera dados.
-- Ele valida:
--   1) 1 campeão
--   2) histórico com 32 participantes
--   3) 63 jogos oficiais
--   4) ranking do Léo com estatísticas > 0
--   5) view pública do campeão com treinador + clube
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONTAGEM DOS JOGOS OFICIAIS
-- Esperado: 63
-- ------------------------------------------------------------
select count(*) as jogos_oficiais_season_01
from public.championship_matches
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
)
and status in ('VALIDATED','WO','ADMIN_DECISION');

-- ------------------------------------------------------------
-- 2. CAMPEÃO DA SEASON 01
-- Esperado: Barcelona / Léo Souza / final_position 1
-- ------------------------------------------------------------
select
    championship_id,
    season_number,
    season_label,
    participant_id,
    participant_name,
    platform,
    photo_url,
    club_id,
    club_name,
    club_slug,
    logo_path,
    final_position,
    phase_reached
from public.ccfv_champions_public_champion_v3
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 3. HISTÓRICO COMPLETO DA SEASON 01
-- A tabela não possui participant_name/club_name diretamente,
-- então fazemos JOIN nos cadastros oficiais.
-- Esperado: 32 linhas.
-- ------------------------------------------------------------
select
    p.name as participant_name,
    p.platform,
    c.name as club_name,
    ch.final_position,
    ch.phase_reached,
    ch.matches_played,
    ch.wins,
    ch.draws,
    ch.losses
from public.championship_history ch
join public.players p
  on p.id = ch.participant_id
join public.champions_clubs c
  on c.id = ch.club_id
where ch.championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
)
order by ch.final_position nulls last, p.name;

-- ------------------------------------------------------------
-- 4. CONTAGEM DO HISTÓRICO
-- Esperado: 32
-- ------------------------------------------------------------
select count(*) as historico_season_01
from public.championship_history
where championship_id = (
    select id
    from public.championships
    where code = 'CCFV-CL-S01'
);

-- ------------------------------------------------------------
-- 5. RANKING DO LÉO
-- Esperado: partidas > 0, vitórias > 0, Elo/pontos > 0.
-- ------------------------------------------------------------
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
where name = 'Léo Souza';

-- ------------------------------------------------------------
-- 6. TESTE AUTOMÁTICO COM ASSERTIONS
-- Se tudo estiver certo, retorna:
-- "TESTE FINAL OK — PRONTO PARA LIMPEZA"
-- ------------------------------------------------------------
do $$
declare
    v_championship_id uuid;
    v_matches integer;
    v_history integer;
    v_champions integer;
    v_leo_matches integer;
    v_leo_wins integer;
    v_leo_elo integer;
    v_leo_points integer;
    v_champion_club text;
    v_champion_player text;
begin
    select id
      into v_championship_id
    from public.championships
    where code = 'CCFV-CL-S01';

    if v_championship_id is null then
        raise exception 'FALHA: Season 01 CCFV-CL-S01 não encontrada.';
    end if;

    select count(*)
      into v_matches
    from public.championship_matches
    where championship_id = v_championship_id
      and status in ('VALIDATED','WO','ADMIN_DECISION');

    if v_matches <> 63 then
        raise exception 'FALHA: esperado 63 jogos oficiais, encontrado %.', v_matches;
    end if;

    select count(*)
      into v_history
    from public.championship_history
    where championship_id = v_championship_id;

    if v_history <> 32 then
        raise exception 'FALHA: esperado 32 registros de histórico, encontrado %.', v_history;
    end if;

    select count(*), min(club_name), min(participant_name)
      into v_champions, v_champion_club, v_champion_player
    from public.ccfv_champions_public_champion_v3
    where championship_id = v_championship_id;

    if v_champions <> 1 then
        raise exception 'FALHA: esperado 1 campeão público, encontrado %.', v_champions;
    end if;

    if coalesce(v_champion_club,'') <> 'Barcelona' then
        raise exception 'FALHA: campeão esperado Barcelona, encontrado %.', v_champion_club;
    end if;

    if coalesce(v_champion_player,'') <> 'Léo Souza' then
        raise exception 'FALHA: treinador campeão esperado Léo Souza, encontrado %.', v_champion_player;
    end if;

    select
        coalesce(matches_played,0),
        coalesce(wins,0),
        coalesce(elo,0),
        coalesce(ranking_points,0)
      into
        v_leo_matches,
        v_leo_wins,
        v_leo_elo,
        v_leo_points
    from public.ccfv_ranking
    where name = 'Léo Souza'
    limit 1;

    if v_leo_matches <= 0 then
        raise exception 'FALHA: Léo Souza está com matches_played=%.', v_leo_matches;
    end if;

    if v_leo_wins <= 0 then
        raise exception 'FALHA: Léo Souza está com wins=%.', v_leo_wins;
    end if;

    if v_leo_elo <= 0 then
        raise exception 'FALHA: Léo Souza está com Elo=%.', v_leo_elo;
    end if;

    if v_leo_points <= 0 then
        raise exception 'FALHA: Léo Souza está com ranking_points=%.', v_leo_points;
    end if;

    raise notice 'TESTE FINAL OK — 63 jogos + 32 históricos + campeão + ranking validados.';
end;
$$;
