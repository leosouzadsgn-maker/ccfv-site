-- CCFV LIGA — STORAGE EXCLUSIVO PARA ESCUDOS E BANNERS DE CLUBES
-- Execute no Supabase SQL Editor como administrador.
-- Bucket PÚBLICO para leitura das imagens nas páginas e tabelas da Liga.
-- Upload, substituição e exclusão permanecem restritos ao dono autenticado do clube.
-- Arquivos usam o caminho: <auth.uid>/<club_id>/<crest|banner>-<uuid>.<ext>

BEGIN;

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'ccfv-club-assets',
    'ccfv-club-assets',
    TRUE,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    public = TRUE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Função auxiliar: autoriza apenas jogador CCFV ativo, com vínculo ACTIVE,
-- que já possua um clube próprio em estado DRAFT, ACTIVE ou INACTIVE.
CREATE OR REPLACE FUNCTION public.ccfv_league_can_manage_my_club_assets()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_player_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT account.player_id
    INTO v_player_id
    FROM public.ccfv_league_player_accounts AS account
    JOIN public.players AS player
      ON player.id = account.player_id
    WHERE account.auth_user_id = auth.uid()
      AND account.link_status = 'ACTIVE'
      AND UPPER(BTRIM(COALESCE(player.status, ''))) = 'ACTIVE'
    LIMIT 1;

    IF v_player_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.ccfv_league_clubs AS club
        WHERE club.owner_player_id = v_player_id
          AND club.status IN ('DRAFT', 'ACTIVE', 'INACTIVE')
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.ccfv_league_can_manage_my_club_assets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ccfv_league_can_manage_my_club_assets() FROM anon;
GRANT EXECUTE ON FUNCTION public.ccfv_league_can_manage_my_club_assets() TO authenticated;

DROP POLICY IF EXISTS ccfv_league_club_assets_insert ON storage.objects;
DROP POLICY IF EXISTS ccfv_league_club_assets_update ON storage.objects;
DROP POLICY IF EXISTS ccfv_league_club_assets_delete ON storage.objects;

CREATE POLICY ccfv_league_club_assets_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ccfv-club-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND public.ccfv_league_can_manage_my_club_assets()
);

CREATE POLICY ccfv_league_club_assets_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'ccfv-club-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND public.ccfv_league_can_manage_my_club_assets()
)
WITH CHECK (
    bucket_id = 'ccfv-club-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND public.ccfv_league_can_manage_my_club_assets()
);

CREATE POLICY ccfv_league_club_assets_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'ccfv-club-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND public.ccfv_league_can_manage_my_club_assets()
);

COMMIT;

-- Verificação após executar:
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'ccfv-club-assets';

SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'ccfv_league_club_assets_%'
ORDER BY policyname;
