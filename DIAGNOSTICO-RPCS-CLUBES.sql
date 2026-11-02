-- CONSULTA SOMENTE LEITURA: definicoes das RPCs administrativas de clubes.
-- Execute no SQL Editor do Supabase e compartilhe o resultado.

SELECT
    p.proname AS funcao,
    pg_get_functiondef(p.oid) AS definicao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'ccfv_league_admin_list_clubs',
      'ccfv_league_admin_review_club',
      'ccfv_league_admin_change_club_status'
  )
ORDER BY p.proname;
