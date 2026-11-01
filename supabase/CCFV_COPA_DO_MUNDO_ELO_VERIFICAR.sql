-- Verificação pós-migração: somente leitura.

-- 1. Conferir os resultados e vínculos de jogadores por partida.
SELECT
    m.stage,
    m.match_order,
    m.status,
    h.name AS selecao_casa,
    ph.name AS jogador_casa,
    m.home_score,
    m.away_score,
    pa.name AS jogador_visitante,
    a.name AS selecao_visitante,
    m.winner_team_id
FROM public.ccfv_world_cup_matches m
JOIN public.ccfv_world_cup_teams h ON h.id=m.home_team_id
JOIN public.ccfv_world_cup_teams a ON a.id=m.away_team_id
LEFT JOIN public.players ph ON ph.id=h.participant_id
LEFT JOIN public.players pa ON pa.id=a.participant_id
WHERE m.season_id = (
    SELECT id FROM public.ccfv_world_cup_seasons
    ORDER BY season_number DESC LIMIT 1
)
ORDER BY m.match_order;

-- 2. Histórico de Elo da Copa, incluindo antes/depois.
SELECT
    a.created_at,
    s.season_label,
    a.event_key,
    a.result_code,
    p.name AS jogador,
    a.elo_delta,
    a.elo_before,
    a.elo_after
FROM public.ccfv_world_cup_elo_awards a
JOIN public.ccfv_world_cup_seasons s ON s.id=a.season_id
JOIN public.players p ON p.id=a.player_id
ORDER BY a.created_at DESC;

-- 3. Resumo da quantidade de créditos por temporada e tipo de evento.
SELECT
    s.season_label,
    a.result_code,
    COUNT(*) AS creditos,
    SUM(a.elo_delta) AS soma_deltas
FROM public.ccfv_world_cup_elo_awards a
JOIN public.ccfv_world_cup_seasons s ON s.id=a.season_id
GROUP BY s.season_label,a.result_code
ORDER BY s.season_label,a.result_code;
