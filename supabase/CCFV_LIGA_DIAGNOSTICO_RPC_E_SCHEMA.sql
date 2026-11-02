-- CCFV LIGA — DIAGNÓSTICO SEGURO (SOMENTE LEITURA)
-- Não cria, altera ou apaga dados, funções, policies ou tabelas.

-- 1) Corpos completos das RPCs que ainda precisam de validação de contrato.
SELECT p.proname AS funcao,
       pg_get_function_arguments(p.oid) AS parametros,
       pg_get_function_result(p.oid) AS retorno,
       p.prosecdef AS security_definer,
       pg_get_functiondef(p.oid) AS definicao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ccfv_league_admin_review_club',
    'ccfv_league_admin_change_club_status',
    'ccfv_league_admin_create_season',
    'ccfv_league_admin_change_season_status',
    'ccfv_league_admin_decide_season_club',
    'ccfv_league_admin_confirm_season_club',
    'ccfv_league_admin_assign_divisions',
    'ccfv_league_admin_list_clubs',
    'ccfv_league_admin_list_seasons',
    'ccfv_league_admin_list_season_clubs',
    'ccfv_league_admin_dashboard',
    'ccfv_league_register_my_club',
    'ccfv_league_create_club',
    'ccfv_league_update_my_club'
  )
ORDER BY p.proname;

-- 2) Colunas reais das tabelas principais (o banco atual prevalece sobre migrations antigas).
SELECT table_name, ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'ccfv_league_player_accounts',
    'ccfv_league_seasons',
    'ccfv_league_clubs',
    'ccfv_league_season_clubs',
    'ccfv_league_audit_logs'
  )
ORDER BY table_name, ordinal_position;

-- 3) CHECKs, UNIQUEs e FKs que determinam os valores/estados permitidos.
SELECT conrelid::regclass AS tabela,
       conname AS constraint_name,
       contype AS constraint_type,
       pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text LIKE 'ccfv_league_%'
ORDER BY conrelid::regclass::text, conname;

-- 4) RLS e FORCE RLS das tabelas da Liga.
SELECT c.relname AS tabela,
       c.relrowsecurity AS rls_habilitado,
       c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'ccfv_league_%'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- 5) Policies existentes nas tabelas da Liga.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ccfv_league_%'
ORDER BY tablename, policyname;

-- 6) Auditoria: confirma campos e nulabilidade.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ccfv_league_audit_logs'
ORDER BY ordinal_position;
