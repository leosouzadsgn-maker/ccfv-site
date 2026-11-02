-- CCFV LIGA — VERIFICAÇÃO DO MOTOR COMPETITIVO V1 (SOMENTE LEITURA)
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('ccfv_league_competitions','ccfv_league_competition_entries','ccfv_league_matches')
ORDER BY table_name;

SELECT p.proname AS funcao,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'ccfv_league_admin_%_v2'
ORDER BY p.proname;

SELECT c.season_id,c.competition_code,c.name,c.status,
       count(m.id)::integer AS total_partidas,
       count(m.id) FILTER (WHERE m.status='PLAYED')::integer AS partidas_com_resultado
FROM public.ccfv_league_competitions c
LEFT JOIN public.ccfv_league_matches m ON m.competition_id=c.id
GROUP BY c.season_id,c.competition_code,c.name,c.status
ORDER BY c.season_id,c.competition_code;

-- Quando as três ligas forem geradas, o esperado é 132 jogos em cada uma (396 no total).
SELECT c.season_id,c.competition_code,count(m.id)::integer AS total_partidas
FROM public.ccfv_league_competitions c
LEFT JOIN public.ccfv_league_matches m ON m.competition_id=c.id
WHERE c.competition_type='LEAGUE'
GROUP BY c.season_id,c.competition_code
ORDER BY c.season_id,c.competition_code;
