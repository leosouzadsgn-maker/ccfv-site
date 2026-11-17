-- ============================================================================
-- CCFV LIGA — PERFIS PÚBLICOS DE CLUBES V1
--
-- Disponibiliza, somente para participantes autenticados e com vínculo ativo:
--   1) foto/nome do próprio jogador vinculado;
--   2) catálogo de clubes aprovados;
--   3) perfil público de um clube aprovado por slug.
--
-- Nenhuma tabela é alterada. Nenhum dado pessoal privado é exposto.
-- Os campos usados já existem no cadastro CCFV:
-- players.photo_url, players.name e as colunas da ccfv_league_clubs.
-- Execute uma vez no Supabase SQL Editor como administrador.
-- ============================================================================

BEGIN;

-- 1. Dados do próprio jogador: necessário para montar o cabeçalho social.
CREATE OR REPLACE FUNCTION public.ccfv_league_get_my_player_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_player jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Você precisa estar autenticado para acessar seu perfil.';
    END IF;

    SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'player_code', p.player_code,
        'photo_url', p.photo_url
    )
      INTO v_player
      FROM public.ccfv_league_player_accounts AS a
      JOIN public.players AS p ON p.id = a.player_id
     WHERE a.auth_user_id = auth.uid()
       AND a.link_status = 'ACTIVE'
       AND upper(btrim(coalesce(p.status, ''))) = 'ACTIVE'
     LIMIT 1;

    IF v_player IS NULL THEN
        RAISE EXCEPTION 'Seu vínculo de jogador precisa estar aprovado e ativo.';
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'player', v_player);
END;
$function$;

-- 2. Catálogo: só clubes aprovados, com responsável CCFV ativo e vínculo ativo.
CREATE OR REPLACE FUNCTION public.ccfv_league_get_public_clubs()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_clubs jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
          FROM public.ccfv_league_player_accounts AS a
          JOIN public.players AS me ON me.id = a.player_id
         WHERE a.auth_user_id = auth.uid()
           AND a.link_status = 'ACTIVE'
           AND upper(btrim(coalesce(me.status, ''))) = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'Apenas participantes ativos da Liga podem consultar os perfis dos clubes.';
    END IF;

    SELECT coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'short_name', c.short_name,
                'slug', c.slug,
                'crest_url', c.crest_url,
                'banner_url', c.banner_url,
                'primary_color', c.primary_color,
                'secondary_color', c.secondary_color,
                'accent_color', c.accent_color,
                'motto', c.motto,
                'description', c.description,
                'city', c.city,
                'founded_year', c.founded_year,
                'player_name', p.name,
                'player_photo_url', p.photo_url,
                'division', current_entry.division,
                'season_name', current_entry.season_name
            ) ORDER BY c.name
        ),
        '[]'::jsonb
    )
      INTO v_clubs
      FROM public.ccfv_league_clubs AS c
      JOIN public.players AS p ON p.id = c.owner_player_id
      LEFT JOIN LATERAL (
          SELECT sc.division, s.name AS season_name
            FROM public.ccfv_league_season_clubs AS sc
            JOIN public.ccfv_league_seasons AS s ON s.id = sc.season_id
           WHERE sc.club_id = c.id
             AND sc.status = 'CONFIRMED'
           ORDER BY s.starts_on DESC, sc.created_at DESC
           LIMIT 1
      ) AS current_entry ON TRUE
     WHERE upper(btrim(coalesce(c.status, ''))) = 'ACTIVE'
       AND upper(btrim(coalesce(p.status, ''))) = 'ACTIVE'
       AND EXISTS (
           SELECT 1
             FROM public.ccfv_league_player_accounts AS owner_account
            WHERE owner_account.player_id = p.id
              AND owner_account.link_status = 'ACTIVE'
       );

    RETURN jsonb_build_object('success', TRUE, 'clubs', v_clubs);
END;
$function$;

-- 3. Perfil individual: mesmas regras do catálogo, com consulta por slug.
CREATE OR REPLACE FUNCTION public.ccfv_league_get_public_club_profile(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_club jsonb;
    v_slug text := lower(btrim(coalesce(p_slug, '')));
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
          FROM public.ccfv_league_player_accounts AS a
          JOIN public.players AS me ON me.id = a.player_id
         WHERE a.auth_user_id = auth.uid()
           AND a.link_status = 'ACTIVE'
           AND upper(btrim(coalesce(me.status, ''))) = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'Apenas participantes ativos da Liga podem consultar os perfis dos clubes.';
    END IF;

    IF v_slug = '' THEN
        RAISE EXCEPTION 'Informe o identificador do clube.';
    END IF;

    SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'short_name', c.short_name,
        'slug', c.slug,
        'crest_url', c.crest_url,
        'banner_url', c.banner_url,
        'primary_color', c.primary_color,
        'secondary_color', c.secondary_color,
        'accent_color', c.accent_color,
        'motto', c.motto,
        'description', c.description,
        'city', c.city,
        'founded_year', c.founded_year,
        'created_at', c.created_at,
        'player_name', p.name,
        'player_photo_url', p.photo_url,
        'division', current_entry.division,
        'season_name', current_entry.season_name
    )
      INTO v_club
      FROM public.ccfv_league_clubs AS c
      JOIN public.players AS p ON p.id = c.owner_player_id
      LEFT JOIN LATERAL (
          SELECT sc.division, s.name AS season_name
            FROM public.ccfv_league_season_clubs AS sc
            JOIN public.ccfv_league_seasons AS s ON s.id = sc.season_id
           WHERE sc.club_id = c.id
             AND sc.status = 'CONFIRMED'
           ORDER BY s.starts_on DESC, sc.created_at DESC
           LIMIT 1
      ) AS current_entry ON TRUE
     WHERE lower(c.slug) = v_slug
       AND upper(btrim(coalesce(c.status, ''))) = 'ACTIVE'
       AND upper(btrim(coalesce(p.status, ''))) = 'ACTIVE'
       AND EXISTS (
           SELECT 1
             FROM public.ccfv_league_player_accounts AS owner_account
            WHERE owner_account.player_id = p.id
              AND owner_account.link_status = 'ACTIVE'
       )
     LIMIT 1;

    IF v_club IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Clube não encontrado ou ainda não aprovado pela administração.'
        );
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'club', v_club);
END;
$function$;

-- Acesso somente autenticado. As funções verificam o vínculo internamente.
REVOKE ALL ON FUNCTION public.ccfv_league_get_my_player_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ccfv_league_get_public_clubs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ccfv_league_get_public_club_profile(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ccfv_league_get_my_player_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_league_get_public_clubs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_league_get_public_club_profile(text) TO authenticated;

COMMIT;

-- Verificação das três funções e das permissões de execução.
SELECT
    p.proname AS funcao,
    p.prosecdef AS security_definer,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'ccfv_league_get_my_player_profile',
      'ccfv_league_get_public_clubs',
      'ccfv_league_get_public_club_profile'
  )
ORDER BY p.proname;
