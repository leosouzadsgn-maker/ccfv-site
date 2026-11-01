-- CCFV // Verificação da contabilização de ELO
-- Execute depois de validar uma partida no Admin.

-- 1) Eventos recentes contabilizados uma única vez.
SELECT competition_code, season_id, event_key, source_match_id, player_id,
       result_code, elo_delta, elo_before, elo_after, created_at
FROM public.ccfv_competition_elo_awards
ORDER BY created_at DESC
LIMIT 30;

-- 2) Elo e estatísticas atuais dos jogadores afetados.
SELECT p.id, p.name, p.elo, p.wins, p.draws, p.losses, p.titles
FROM public.players p
WHERE p.id IN (
    SELECT DISTINCT player_id
    FROM public.ccfv_competition_elo_awards
    ORDER BY player_id
    LIMIT 40
)
ORDER BY p.elo DESC, p.name;

-- 3) Verificar duplicidade (o resultado esperado é zero linhas).
SELECT competition_code, event_key, player_id, COUNT(*) AS total
FROM public.ccfv_competition_elo_awards
GROUP BY competition_code, event_key, player_id
HAVING COUNT(*) > 1;
