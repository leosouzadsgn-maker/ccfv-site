-- CCFV LIGA — CONTEXTO SEGURO DO PAINEL DO PARTICIPANTE
-- Cria uma RPC de leitura que retorna exclusivamente os dados do usuário autenticado.
-- Não cria, altera ou remove registros da Liga.

BEGIN;

CREATE OR REPLACE FUNCTION public.ccfv_league_get_my_player_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_auth_user_id uuid := auth.uid();
    v_player_id uuid;
    v_link_status text;
    v_player_name text;
    v_player_code text;
    v_club jsonb := NULL;
    v_registrations jsonb := '[]'::jsonb;
    v_seasons jsonb := '[]'::jsonb;
BEGIN
    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Você precisa estar autenticado para acessar o painel.';
    END IF;

    -- Busca somente o vínculo pertencente à sessão atual.
    SELECT a.player_id, a.link_status
      INTO v_player_id, v_link_status
      FROM public.ccfv_league_player_accounts AS a
     WHERE a.auth_user_id = v_auth_user_id
     LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'link_status', 'NOT_LINKED',
            'player_id', NULL,
            'player', NULL,
            'club', NULL,
            'registrations', '[]'::jsonb,
            'seasons', '[]'::jsonb
        );
    END IF;

    -- Um vínculo só libera os dados competitivos quando está ACTIVE.
    IF v_link_status <> 'ACTIVE' THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'link_status', v_link_status,
            'player_id', NULL,
            'player', NULL,
            'club', NULL,
            'registrations', '[]'::jsonb,
            'seasons', '[]'::jsonb
        );
    END IF;

    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'O vínculo está ACTIVE, mas não possui player_id associado. A administração precisa revisar esse vínculo.';
    END IF;

    SELECT p.name, p.player_code
      INTO v_player_name, v_player_code
      FROM public.players AS p
     WHERE p.id = v_player_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'O jogador associado ao vínculo não foi encontrado na base CCFV.';
    END IF;

    -- Retorna somente o clube pertencente ao jogador autenticado.
    SELECT jsonb_build_object(
        'id', c.id,
        'owner_player_id', c.owner_player_id,
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
        'status', c.status,
        'created_at', c.created_at,
        'updated_at', c.updated_at
    )
      INTO v_club
      FROM public.ccfv_league_clubs AS c
     WHERE c.owner_player_id = v_player_id
     ORDER BY c.created_at DESC
     LIMIT 1;

    -- Inscrições são vinculadas ao clube, não diretamente ao jogador.
    IF v_club IS NOT NULL THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', sc.id,
                    'enrollment_id', sc.id,
                    'season_id', sc.season_id,
                    'club_id', sc.club_id,
                    'club_name', COALESCE(sc.snapshot_name, c.name),
                    'club_crest_url', COALESCE(sc.snapshot_crest_url, c.crest_url),
                    'division', sc.division,
                    'status', sc.status,
                    'qualifier_position', sc.qualifier_position,
                    'created_at', sc.created_at,
                    'season_name', s.name,
                    'season_code', s.season_code
                ) ORDER BY sc.created_at DESC
            ),
            '[]'::jsonb
        )
          INTO v_registrations
          FROM public.ccfv_league_season_clubs AS sc
          JOIN public.ccfv_league_clubs AS c ON c.id = sc.club_id
          JOIN public.ccfv_league_seasons AS s ON s.id = sc.season_id
         WHERE sc.club_id = (v_club ->> 'id')::uuid
           AND c.owner_player_id = v_player_id;
    END IF;

    -- Lista os ciclos com inscrições abertas, sem expor dados de outros participantes.
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'season_code', s.season_code,
                'name', s.name,
                'starts_on', s.starts_on,
                'ends_on', s.ends_on,
                'status', s.status,
                'is_test', s.is_test,
                'monthly_fee', s.monthly_fee,
                'max_clubs', s.max_clubs
            ) ORDER BY s.starts_on ASC, s.created_at ASC
        ),
        '[]'::jsonb
    )
      INTO v_seasons
      FROM public.ccfv_league_seasons AS s
     WHERE s.status = 'REGISTRATION';

    RETURN jsonb_build_object(
        'success', TRUE,
        'link_status', v_link_status,
        'player_id', v_player_id,
        'player', jsonb_build_object(
            'id', v_player_id,
            'player_id', v_player_id,
            'name', v_player_name,
            'player_code', v_player_code
        ),
        'club', v_club,
        'registrations', v_registrations,
        'seasons', v_seasons
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.ccfv_league_get_my_player_dashboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ccfv_league_get_my_player_dashboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.ccfv_league_get_my_player_dashboard() TO authenticated;

COMMIT;

-- Verificação da existência e da permissão de execução.
SELECT
    p.proname AS funcao,
    p.prosecdef AS security_definer,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'ccfv_league_get_my_player_dashboard';
