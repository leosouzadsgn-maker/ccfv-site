-- ============================================================
-- CCFV CHAMPIONS LEAGUE — CORREÇÃO DEFINITIVA DO BANCO
-- Objetivos:
-- 1) Permitir ao Admin autenticado consultar/editar as inscrições
--    e vínculos de clubes da Champions.
-- 2) Corrigir a view pública championship_public_clubs sem depender
--    de uma coluna sort_order que não existe na view atual.
-- 3) Não apagar clubes, jogadores ou temporada.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. PERMISSÕES DAS TABELAS USADAS PELO CADASTRO DO ADMIN
-- ------------------------------------------------------------

ALTER TABLE public.championship_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.championship_registrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public'
          AND tablename='championship_clubs'
          AND policyname='ccfv_authenticated_championship_clubs_all'
    ) THEN
        CREATE POLICY ccfv_authenticated_championship_clubs_all
        ON public.championship_clubs
        FOR ALL
        TO authenticated
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public'
          AND tablename='championship_registrations'
          AND policyname='ccfv_authenticated_championship_registrations_all'
    ) THEN
        CREATE POLICY ccfv_authenticated_championship_registrations_all
        ON public.championship_registrations
        FOR ALL
        TO authenticated
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.championship_clubs
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.championship_registrations
TO authenticated;

GRANT SELECT
ON public.championship_clubs
TO anon, authenticated;

GRANT SELECT
ON public.championship_registrations
TO authenticated;

-- ------------------------------------------------------------
-- 2. PERMISSÃO DE LEITURA DO CATÁLOGO OFICIAL DE 32 CLUBES
-- ------------------------------------------------------------

GRANT SELECT
ON public.champions_clubs
TO anon, authenticated;

-- ------------------------------------------------------------
-- 3. REFAZER VIEW PÚBLICA DOS CLUBES
--    A versão quebrada referenciava sort_order como coluna da view.
--    Aqui sort_order é calculado pelo catálogo oficial.
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.championship_public_clubs;

CREATE VIEW public.championship_public_clubs
WITH (security_invoker = true)
AS
SELECT
    cc.id AS championship_club_id,
    cc.championship_id,
    cc.club_id,
    cat.name,
    cat.slug,
    COALESCE(cat.sort_order,
        ROW_NUMBER() OVER (
            PARTITION BY cc.championship_id
            ORDER BY cat.name
        )::integer
    )::integer AS sort_order,
    cc.status,
    cc.participant_id,
    p.name AS participant_name
FROM public.championship_clubs cc
JOIN public.champions_clubs cat
  ON cat.id = cc.club_id
LEFT JOIN public.players p
  ON p.id = cc.participant_id;

GRANT SELECT
ON public.championship_public_clubs
TO anon, authenticated;

COMMIT;

-- ------------------------------------------------------------
-- 4. VERIFICAÇÃO FINAL
-- ------------------------------------------------------------

SELECT
    'CHAMPIONS_CLUBS' AS item,
    COUNT(*)::integer AS total
FROM public.champions_clubs
UNION ALL
SELECT
    'CHAMPIONSHIP_CLUBS_SEASON_01',
    COUNT(*)::integer
FROM public.championship_clubs cc
JOIN public.championships ch
  ON ch.id = cc.championship_id
WHERE ch.code = 'CCFV-CL-S01'
UNION ALL
SELECT
    'CHAMPIONSHIP_REGISTRATIONS_SEASON_01',
    COUNT(*)::integer
FROM public.championship_registrations r
JOIN public.championships ch
  ON ch.id = r.championship_id
WHERE ch.code = 'CCFV-CL-S01';
