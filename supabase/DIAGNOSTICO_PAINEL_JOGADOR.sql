-- CCFV LIGA — DIAGNÓSTICO DO PAINEL DO PARTICIPANTE
-- SOMENTE LEITURA. Não cria, altera ou remove dados, funções, tabelas ou policies.

-- 1) Corpos das funções que sustentam criação, edição e inscrição do clube.
SELECT
    p.proname AS funcao,
    pg_get_function_arguments(p.oid) AS parametros,
    pg_get_function_result(p.oid) AS retorno,
    p.prosecdef AS security_definer,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
    pg_get_functiondef(p.oid) AS definicao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'ccfv_league_get_my_player_link',
      'ccfv_league_create_club',
      'ccfv_league_update_my_club',
      'ccfv_league_register_my_club',
      'ccfv_league_request_player_link'
  )
ORDER BY p.proname;

-- 2) Policies reais das tabelas que o painel do jogador precisa consultar.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'ccfv_league_player_accounts',
      'ccfv_league_clubs',
      'ccfv_league_seasons',
      'ccfv_league_season_clubs'
  )
ORDER BY tablename, policyname;

-- 3) Grants de leitura para authenticated nas tabelas do painel.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
  AND table_name IN (
      'ccfv_league_player_accounts',
      'ccfv_league_clubs',
      'ccfv_league_seasons',
      'ccfv_league_season_clubs'
  )
ORDER BY table_name, privilege_type;

-- 4) Colunas atuais relevantes (não confiar em migrations antigas).
SELECT table_name, ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'ccfv_league_player_accounts',
      'ccfv_league_clubs',
      'ccfv_league_seasons',
      'ccfv_league_season_clubs'
  )
ORDER BY table_name, ordinal_position;
