/* ============================================================
   CCFV — INSCRIÇÃO PÚBLICA
   Instalação isolada.

   O que este SQL faz:
   - adiciona somente os campos públicos necessários ao player;
   - cria um bucket exclusivo para fotos de inscrição;
   - permite apenas upload público no bucket novo;
   - cria uma RPC SECURITY DEFINER para criar o jogador;
   - força ELO/estatísticas/títulos iniciais para zero;
   - não cria vínculo com competição;
   - não altera motores de partidas/ranking existentes.
   ============================================================ */

BEGIN;

/* ------------------------------------------------------------
   01. CAMPOS DO PLAYER
   ------------------------------------------------------------ */

ALTER TABLE public.players
    ADD COLUMN IF NOT EXISTS whatsapp text;

ALTER TABLE public.players
    ADD COLUMN IF NOT EXISTS team_name text;


/* ------------------------------------------------------------
   02. BUCKET EXCLUSIVO DE INSCRIÇÃO
   ------------------------------------------------------------ */

INSERT INTO storage.buckets (id, name, public)
VALUES (
    'ccfv-public-player-photos',
    'ccfv-public-player-photos',
    true
)
ON CONFLICT (id)
DO UPDATE SET public = true;


/* ------------------------------------------------------------
   03. STORAGE — SOMENTE INSERT PARA ANON/AUTHENTICATED
       O LEITOR PÚBLICO DO BUCKET É INTENCIONAL.
   ------------------------------------------------------------ */

DROP POLICY IF EXISTS "CCFV public registration upload"
ON storage.objects;

CREATE POLICY "CCFV public registration upload"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'ccfv-public-player-photos'
);


DROP POLICY IF EXISTS "CCFV public registration read"
ON storage.objects;

CREATE POLICY "CCFV public registration read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'ccfv-public-player-photos'
);


/* ------------------------------------------------------------
   04. RPC SEGURA DE CADASTRO
   ------------------------------------------------------------ */

CREATE OR REPLACE FUNCTION public.ccfv_public_register_player(
    p_player_id uuid,
    p_name text,
    p_whatsapp text,
    p_instagram text,
    p_platform text,
    p_team_name text,
    p_photo_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_name text;
    v_whatsapp text;
    v_instagram text;
    v_platform text;
    v_team_name text;
    v_player_code text;
    v_existing_id uuid;
    v_next_code integer;
    v_has_code boolean;
BEGIN

    /* --------------------------------------------------------
       Normalização
       -------------------------------------------------------- */

    v_name := trim(coalesce(p_name, ''));
    v_whatsapp := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
    v_instagram := regexp_replace(trim(coalesce(p_instagram, '')), '^@+', '');
    v_platform := upper(trim(coalesce(p_platform, '')));
    v_team_name := trim(coalesce(p_team_name, ''));


    /* --------------------------------------------------------
       Validações
       -------------------------------------------------------- */

    IF p_player_id IS NULL THEN
        RAISE EXCEPTION 'Identificador de jogador inválido.';
    END IF;

    IF length(v_name) < 3 THEN
        RAISE EXCEPTION 'Informe o nome completo.';
    END IF;

    IF length(v_whatsapp) < 10 OR length(v_whatsapp) > 13 THEN
        RAISE EXCEPTION 'Informe um WhatsApp válido.';
    END IF;

    IF length(v_instagram) < 2 THEN
        RAISE EXCEPTION 'Informe o Instagram.';
    END IF;

    IF v_platform NOT IN ('PC', 'CONSOLE', 'MOBILE') THEN
        RAISE EXCEPTION 'Plataforma inválida.';
    END IF;

    IF length(v_team_name) < 2 THEN
        RAISE EXCEPTION 'Informe o nome do time.';
    END IF;

    IF p_photo_url IS NULL OR trim(p_photo_url) = '' THEN
        RAISE EXCEPTION 'A foto do jogador é obrigatória.';
    END IF;


    /* --------------------------------------------------------
       Anti-duplicação por WhatsApp.
       -------------------------------------------------------- */

    SELECT p.id
    INTO v_existing_id
    FROM public.players p
    WHERE regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g') = v_whatsapp
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este WhatsApp já possui um jogador cadastrado na CCFV.';
    END IF;


    /* --------------------------------------------------------
       Geração segura do player_code.
       O advisory lock impede colisão entre dois cadastros
       simultâneos.
       -------------------------------------------------------- */

    PERFORM pg_advisory_xact_lock(hashtextextended('CCFV_PLAYER_CODE', 0));

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'players'
          AND column_name = 'player_code'
    )
    INTO v_has_code;

    IF v_has_code THEN

        SELECT COALESCE(
            MAX(
                NULLIF(
                    regexp_replace(p.player_code, '[^0-9]', '', 'g'),
                    ''
                )::integer
            ),
            0
        ) + 1
        INTO v_next_code
        FROM public.players p
        WHERE p.player_code ~ '^CCFV-[0-9]+$';

        v_player_code := 'CCFV-' || lpad(v_next_code::text, 3, '0');

    ELSE
        /* A instalação atual do CCFV possui player_code.
           Este fallback existe apenas para tornar a função
           explicitamente defensiva. */
        v_player_code := NULL;
    END IF;


    /* --------------------------------------------------------
       Cria o jogador.

       Não recebe da página:
       - Elo
       - vitórias
       - empates
       - derrotas
       - títulos
       - competição
       - ranking_points
       -------------------------------------------------------- */

    INSERT INTO public.players (
        id,
        player_code,
        name,
        instagram,
        whatsapp,
        platform,
        photo_url,
        team_name,
        elo,
        wins,
        draws,
        losses,
        titles,
        status
    )
    VALUES (
        p_player_id,
        v_player_code,
        v_name,
        v_instagram,
        v_whatsapp,
        v_platform,
        trim(p_photo_url),
        v_team_name,
        0,
        0,
        0,
        0,
        0,
        'ACTIVE'
    );


    RETURN jsonb_build_object(
        'ok', true,
        'id', p_player_id,
        'player_code', v_player_code,
        'player', jsonb_build_object(
            'id', p_player_id,
            'player_code', v_player_code,
            'name', v_name,
            'instagram', v_instagram,
            'whatsapp', v_whatsapp,
            'platform', v_platform,
            'photo_url', trim(p_photo_url),
            'team_name', v_team_name,
            'elo', 0,
            'wins', 0,
            'draws', 0,
            'losses', 0,
            'titles', 0,
            'status', 'ACTIVE'
        )
    );

END;
$$;


/* ------------------------------------------------------------
   05. PERMISSÕES DA RPC
   ------------------------------------------------------------ */

REVOKE ALL ON FUNCTION public.ccfv_public_register_player(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ccfv_public_register_player(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
) TO anon, authenticated;


COMMIT;


/* ------------------------------------------------------------
   06. VERIFICAÇÃO
   ------------------------------------------------------------ */

SELECT
    'RPC' AS item,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = 'ccfv_public_register_player'
        )
        THEN 'OK'
        ELSE 'FALTANDO'
    END AS status

UNION ALL

SELECT
    'WHATSAPP COLUMN',
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'players'
              AND column_name = 'whatsapp'
        )
        THEN 'OK'
        ELSE 'FALTANDO'
    END

UNION ALL

SELECT
    'TEAM_NAME COLUMN',
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'players'
              AND column_name = 'team_name'
        )
        THEN 'OK'
        ELSE 'FALTANDO'
    END

UNION ALL

SELECT
    'PHOTO BUCKET',
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM storage.buckets
            WHERE id = 'ccfv-public-player-photos'
        )
        THEN 'OK'
        ELSE 'FALTANDO'
    END;
