-- ============================================================
-- CCFV LIBERTADORES — NÚCLEO ISOLADO E SEGURO
--
-- Objetivo:
--   Criar a competição Libertadores sem alterar as tabelas/motores
--   existentes do Brasileirão, Champions, Night Cup ou Mobile.
--
-- Base esportiva: formato CONMEBOL Libertadores 2026:
--   32 clubes / 8 grupos de 4 / 6 jogos por clube na fase de grupos.
--   Oitavas, quartas e semifinais em ida e volta; final em jogo único.
--   Pontuação: 3 vitória / 1 empate / 0 derrota.
--
-- Os RPCs deste arquivo centralizam as operações críticas no banco.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 0) FONTE OFICIAL DE TÍTULOS (segura se já existir)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ccfv_titles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    competition_code text NOT NULL,
    competition_name text NOT NULL,
    season text NOT NULL,
    platform text,
    team_name text,
    club_name text,
    club_logo text,
    title text NOT NULL DEFAULT 'CAMPEÃO',
    source_id uuid,
    awarded_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (player_id, competition_code, season)
);

CREATE INDEX IF NOT EXISTS idx_ccfv_titles_competition
    ON public.ccfv_titles (competition_code, season);

CREATE INDEX IF NOT EXISTS idx_ccfv_titles_player
    ON public.ccfv_titles (player_id, awarded_at DESC);

-- ------------------------------------------------------------
-- 1) TEMPORADAS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ccfv_libertadores_seasons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    season_number integer NOT NULL UNIQUE,
    season_label text NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','REGISTRATIONS','DRAW','GROUP_STAGE','KNOCKOUT','FINISHED')),
    phase text NOT NULL DEFAULT 'REGISTRATIONS'
        CHECK (phase IN ('REGISTRATIONS','DRAW','GROUP_STAGE','ROUND_OF_16','QUARTERFINALS','SEMIFINALS','FINAL','FINISHED')),
    start_at timestamptz,
    end_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2) CLUBES / VAGAS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ccfv_libertadores_clubs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL REFERENCES public.ccfv_libertadores_seasons(id) ON DELETE CASCADE,
    slot integer NOT NULL CHECK (slot BETWEEN 1 AND 32),
    name text NOT NULL,
    slug text NOT NULL,
    country text NOT NULL,
    logo_path text,
    pot integer CHECK (pot BETWEEN 1 AND 4),
    from_preliminary boolean NOT NULL DEFAULT false,
    group_code text CHECK (group_code IN ('A','B','C','D','E','F','G','H')),
    group_position integer CHECK (group_position BETWEEN 1 AND 4),
    participant_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
    performance_seed integer CHECK (performance_seed BETWEEN 1 AND 16),
    status text NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE','RESERVED','CONFIRMED','ELIMINATED','CHAMPION')),
    draw_seed double precision NOT NULL DEFAULT random(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (season_id, slot),
    UNIQUE (season_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ccfv_libertadores_club_player
    ON public.ccfv_libertadores_clubs (season_id, participant_id)
    WHERE participant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ccfv_libertadores_clubs_season_group
    ON public.ccfv_libertadores_clubs (season_id, group_code, group_position);

-- ------------------------------------------------------------
-- 3) PARTIDAS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ccfv_libertadores_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL REFERENCES public.ccfv_libertadores_seasons(id) ON DELETE CASCADE,
    stage text NOT NULL
        CHECK (stage IN ('GROUP_STAGE','ROUND_OF_16','QUARTERFINALS','SEMIFINALS','FINAL')),
    group_code text,
    tie_code text,
    leg integer NOT NULL DEFAULT 1 CHECK (leg IN (1,2)),
    match_order integer NOT NULL,
    home_club_id uuid NOT NULL REFERENCES public.ccfv_libertadores_clubs(id) ON DELETE RESTRICT,
    away_club_id uuid NOT NULL REFERENCES public.ccfv_libertadores_clubs(id) ON DELETE RESTRICT,
    scheduled_at timestamptz,
    status text NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED','VALIDATED','WO','ADMIN_DECISION','CANCELLED')),
    home_score integer CHECK (home_score >= 0),
    away_score integer CHECK (away_score >= 0),
    home_extra_score integer NOT NULL DEFAULT 0 CHECK (home_extra_score >= 0),
    away_extra_score integer NOT NULL DEFAULT 0 CHECK (away_extra_score >= 0),
    home_penalties integer CHECK (home_penalties IS NULL OR home_penalties >= 0),
    away_penalties integer CHECK (away_penalties IS NULL OR away_penalties >= 0),
    winner_club_id uuid REFERENCES public.ccfv_libertadores_clubs(id) ON DELETE RESTRICT,
    red_cards_home integer NOT NULL DEFAULT 0 CHECK (red_cards_home >= 0),
    red_cards_away integer NOT NULL DEFAULT 0 CHECK (red_cards_away >= 0),
    yellow_cards_home integer NOT NULL DEFAULT 0 CHECK (yellow_cards_home >= 0),
    yellow_cards_away integer NOT NULL DEFAULT 0 CHECK (yellow_cards_away >= 0),
    notes text,
    evidence_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (season_id, stage, match_order)
);

CREATE INDEX IF NOT EXISTS idx_ccfv_libertadores_matches_stage
    ON public.ccfv_libertadores_matches (season_id, stage, match_order);

CREATE INDEX IF NOT EXISTS idx_ccfv_libertadores_matches_group
    ON public.ccfv_libertadores_matches (season_id, group_code, match_order);

-- ------------------------------------------------------------
-- 4) AUDITORIA
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ccfv_libertadores_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid REFERENCES public.ccfv_libertadores_seasons(id) ON DELETE CASCADE,
    action text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    actor_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 5) SEED OFICIAL 2026 — 32 CLUBES DA FASE DE GRUPOS
--    (pot / país / equipes provenientes da fase preliminar)
-- ------------------------------------------------------------

DO $$
DECLARE
    v_season uuid;
BEGIN
    SELECT id INTO v_season
    FROM public.ccfv_libertadores_seasons
    WHERE code = 'CCFV-LIB-S01';

    IF v_season IS NULL THEN
        INSERT INTO public.ccfv_libertadores_seasons
            (code, season_number, season_label, status, phase)
        VALUES
            ('CCFV-LIB-S01', 1, 'SEASON 01', 'REGISTRATIONS', 'REGISTRATIONS')
        RETURNING id INTO v_season;
    END IF;

    -- Só semeia se a temporada ainda não tiver clubes.
    IF NOT EXISTS (
        SELECT 1 FROM public.ccfv_libertadores_clubs WHERE season_id = v_season
    ) THEN
        INSERT INTO public.ccfv_libertadores_clubs
            (season_id, slot, name, slug, country, pot, from_preliminary, logo_path)
        VALUES
            (v_season,  1, 'Flamengo', 'flamengo', 'Brasil', 1, false, '/assets/images/clubs/flamengo.png'),
            (v_season,  2, 'Palmeiras', 'palmeiras', 'Brasil', 1, false, '/assets/images/clubs/palmeiras.png'),
            (v_season,  3, 'Boca Juniors', 'boca-juniors', 'Argentina', 1, false, null),
            (v_season,  4, 'Peñarol', 'penarol', 'Uruguai', 1, false, null),
            (v_season,  5, 'Nacional', 'nacional', 'Uruguai', 1, false, null),
            (v_season,  6, 'LDU Quito', 'ldu-quito', 'Equador', 1, false, null),
            (v_season,  7, 'Fluminense', 'fluminense', 'Brasil', 1, false, '/assets/images/clubs/fluminense.png'),
            (v_season,  8, 'Independiente del Valle', 'independiente-del-valle', 'Equador', 1, false, null),

            (v_season,  9, 'Lanús', 'lanus', 'Argentina', 2, false, null),
            (v_season, 10, 'Libertad', 'libertad', 'Paraguai', 2, false, null),
            (v_season, 11, 'Estudiantes de La Plata', 'estudiantes', 'Argentina', 2, false, null),
            (v_season, 12, 'Cerro Porteño', 'cerro-porteno', 'Paraguai', 2, false, null),
            (v_season, 13, 'Corinthians', 'corinthians', 'Brasil', 2, false, '/assets/images/clubs/corinthians.png'),
            (v_season, 14, 'Bolívar', 'bolivar', 'Bolívia', 2, false, null),
            (v_season, 15, 'Cruzeiro', 'cruzeiro', 'Brasil', 2, false, '/assets/images/clubs/cruzeiro.png'),
            (v_season, 16, 'Universitario', 'universitario', 'Peru', 2, false, null),

            (v_season, 17, 'Junior', 'junior', 'Colômbia', 3, false, null),
            (v_season, 18, 'Universidad Católica', 'universidad-catolica', 'Chile', 3, false, null),
            (v_season, 19, 'Rosario Central', 'rosario-central', 'Argentina', 3, false, null),
            (v_season, 20, 'Santa Fe', 'santa-fe', 'Colômbia', 3, false, null),
            (v_season, 21, 'Always Ready', 'always-ready', 'Bolívia', 3, false, null),
            (v_season, 22, 'Coquimbo Unido', 'coquimbo-unido', 'Chile', 3, false, null),
            (v_season, 23, 'Deportivo La Guaira', 'deportivo-la-guaira', 'Venezuela', 3, false, null),
            (v_season, 24, 'Cusco', 'cusco', 'Peru', 3, false, null),

            (v_season, 25, 'Universidad Central', 'universidad-central', 'Venezuela', 4, false, null),
            (v_season, 26, 'Platense', 'platense', 'Argentina', 4, false, null),
            (v_season, 27, 'Independiente Rivadavia', 'independiente-rivadavia', 'Argentina', 4, false, null),
            (v_season, 28, 'Mirassol', 'mirassol', 'Brasil', 4, false, '/assets/images/clubs/mirassol.png'),
            (v_season, 29, 'Independiente Medellín', 'independiente-medellin', 'Colômbia', 4, true, null),
            (v_season, 30, 'Deportes Tolima', 'deportes-tolima', 'Colômbia', 4, true, null),
            (v_season, 31, 'Sporting Cristal', 'sporting-cristal', 'Peru', 4, true, null),
            (v_season, 32, 'Barcelona', 'barcelona', 'Equador', 4, true, null);

        UPDATE public.ccfv_libertadores_clubs
        SET status = 'AVAILABLE';
    END IF;
END $$;

-- ------------------------------------------------------------
-- 6) VIEWS PÚBLICAS
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public.ccfv_libertadores_public_seasons
AS
SELECT
    id,
    code,
    season_number,
    season_label,
    status,
    phase,
    start_at,
    end_at
FROM public.ccfv_libertadores_seasons;

CREATE OR REPLACE VIEW public.ccfv_libertadores_public_clubs
AS
SELECT
    c.id,
    c.season_id,
    c.slot,
    c.name,
    c.slug,
    c.country,
    c.logo_path,
    c.pot,
    c.from_preliminary,
    c.group_code,
    c.group_position,
    c.performance_seed,
    c.status,
    c.participant_id,
    p.name AS participant_name,
    p.platform AS participant_platform
FROM public.ccfv_libertadores_clubs c
LEFT JOIN public.players p ON p.id = c.participant_id;

-- ------------------------------------------------------------
-- 7) VIEW DE CLASSIFICAÇÃO (CRITÉRIOS OFICIAIS DISPONÍVEIS)
--
-- Desempate implementado em ordem:
--   pontos H2H -> saldo H2H -> gols H2H -> saldo geral -> gols geral
--   -> cartões vermelhos -> cartões amarelos -> seed de sorteio.
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public.ccfv_libertadores_public_standings
AS
WITH base AS (
    SELECT
        c.id AS club_id,
        c.season_id,
        c.group_code,
        c.group_position,
        c.name,
        c.slug,
        c.logo_path,
        c.participant_name,
        c.status AS club_status,
        COALESCE(SUM(CASE WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN 1 ELSE 0 END),0)::int AS played,
        COALESCE(SUM(CASE
            WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
                CASE WHEN m.home_club_id = c.id THEN m.home_score ELSE m.away_score END
            ELSE 0 END),0)::int AS gf,
        COALESCE(SUM(CASE
            WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
                CASE WHEN m.home_club_id = c.id THEN m.away_score ELSE m.home_score END
            ELSE 0 END),0)::int AS ga,
        COALESCE(SUM(CASE
            WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
                CASE
                    WHEN (CASE WHEN m.home_club_id = c.id THEN m.home_score ELSE m.away_score END)
                       > (CASE WHEN m.home_club_id = c.id THEN m.away_score ELSE m.home_score END) THEN 3
                    WHEN (CASE WHEN m.home_club_id = c.id THEN m.home_score ELSE m.away_score END)
                       = (CASE WHEN m.home_club_id = c.id THEN m.away_score ELSE m.home_score END) THEN 1
                    ELSE 0
                END
            ELSE 0 END),0)::int AS points,
        COALESCE(SUM(CASE
            WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
                CASE
                    WHEN (CASE WHEN m.home_club_id = c.id THEN m.home_score ELSE m.away_score END)
                       > (CASE WHEN m.home_club_id = c.id THEN m.away_score ELSE m.home_score END) THEN 1
                    ELSE 0
                END
            ELSE 0 END),0)::int AS wins,
        COALESCE(SUM(CASE
            WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') AND
                 (CASE WHEN m.home_club_id = c.id THEN m.home_score ELSE m.away_score END) =
                 (CASE WHEN m.home_club_id = c.id THEN m.away_score ELSE m.home_score END)
            THEN 1 ELSE 0 END),0)::int AS draws,
        COALESCE(SUM(CASE
            WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') AND
                 (CASE WHEN m.home_club_id = c.id THEN m.home_score ELSE m.away_score END) <
                 (CASE WHEN m.home_club_id = c.id THEN m.away_score ELSE m.home_score END)
            THEN 1 ELSE 0 END),0)::int AS losses,
        COALESCE(SUM(CASE WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
            CASE WHEN m.home_club_id = c.id THEN m.red_cards_home ELSE m.red_cards_away END
            ELSE 0 END),0)::int AS red_cards,
        COALESCE(SUM(CASE WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
            CASE WHEN m.home_club_id = c.id THEN m.yellow_cards_home ELSE m.yellow_cards_away END
            ELSE 0 END),0)::int AS yellow_cards,
        c.draw_seed
    FROM public.ccfv_libertadores_clubs c
    LEFT JOIN public.ccfv_libertadores_matches m
      ON m.season_id = c.season_id
     AND m.stage = 'GROUP_STAGE'
     AND m.group_code = c.group_code
     AND (m.home_club_id = c.id OR m.away_club_id = c.id)
    WHERE c.group_code IS NOT NULL
    GROUP BY c.id, c.season_id, c.group_code, c.group_position, c.name, c.slug,
             c.logo_path, c.participant_name, c.status, c.draw_seed
),
h2h AS (
    SELECT
        b.club_id,
        COALESCE(SUM(CASE
            WHEN m.home_club_id = b.club_id THEN
                CASE WHEN m.home_score > m.away_score THEN 3
                     WHEN m.home_score = m.away_score THEN 1 ELSE 0 END
            ELSE
                CASE WHEN m.away_score > m.home_score THEN 3
                     WHEN m.away_score = m.home_score THEN 1 ELSE 0 END
        END),0)::int AS h2h_points,
        COALESCE(SUM(CASE
            WHEN m.home_club_id = b.club_id THEN m.home_score - m.away_score
            ELSE m.away_score - m.home_score
        END),0)::int AS h2h_gd,
        COALESCE(SUM(CASE
            WHEN m.home_club_id = b.club_id THEN m.home_score
            ELSE m.away_score
        END),0)::int AS h2h_gf
    FROM base b
    LEFT JOIN public.ccfv_libertadores_matches m
      ON m.season_id = b.season_id
     AND m.stage = 'GROUP_STAGE'
     AND m.group_code = b.group_code
     AND m.status IN ('VALIDATED','WO','ADMIN_DECISION')
     AND (m.home_club_id = b.club_id OR m.away_club_id = b.club_id)
    JOIN base opp
      ON opp.club_id = CASE WHEN m.home_club_id = b.club_id THEN m.away_club_id ELSE m.home_club_id END
     AND opp.season_id = b.season_id
     AND opp.group_code = b.group_code
     AND opp.points = b.points
    GROUP BY b.club_id
),
joined AS (
    SELECT
        b.*,
        COALESCE(h.h2h_points,0) AS h2h_points,
        COALESCE(h.h2h_gd,0) AS h2h_gd,
        COALESCE(h.h2h_gf,0) AS h2h_gf,
        (b.gf - b.ga) AS gd
    FROM base b
    LEFT JOIN h2h h ON h.club_id = b.club_id
)
SELECT
    j.*,
    ROW_NUMBER() OVER (
        PARTITION BY j.season_id, j.group_code
        ORDER BY
            j.points DESC,
            j.h2h_points DESC,
            j.h2h_gd DESC,
            j.h2h_gf DESC,
            j.gd DESC,
            j.gf DESC,
            j.red_cards ASC,
            j.yellow_cards ASC,
            j.draw_seed ASC,
            j.name ASC
    )::int AS position,
    CASE WHEN ROW_NUMBER() OVER (
        PARTITION BY j.season_id, j.group_code
        ORDER BY
            j.points DESC,
            j.h2h_points DESC,
            j.h2h_gd DESC,
            j.h2h_gf DESC,
            j.gd DESC,
            j.gf DESC,
            j.red_cards ASC,
            j.yellow_cards ASC,
            j.draw_seed ASC,
            j.name ASC
    ) <= 2 THEN true ELSE false END AS qualified
FROM joined j;

CREATE OR REPLACE VIEW public.ccfv_libertadores_public_matches
AS
SELECT
    m.id,
    m.season_id,
    m.stage,
    m.group_code,
    m.tie_code,
    m.leg,
    m.match_order,
    m.scheduled_at,
    m.status,
    m.home_score,
    m.away_score,
    m.home_extra_score,
    m.away_extra_score,
    m.home_penalties,
    m.away_penalties,
    m.winner_club_id,
    h.name AS home_name,
    h.logo_path AS home_logo_path,
    a.name AS away_name,
    a.logo_path AS away_logo_path
FROM public.ccfv_libertadores_matches m
JOIN public.ccfv_libertadores_clubs h ON h.id = m.home_club_id
JOIN public.ccfv_libertadores_clubs a ON a.id = m.away_club_id;

-- ------------------------------------------------------------
-- 8) RPC: CRIAR TEMPORADA
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_create_season(
    p_season_number integer,
    p_season_label text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id uuid;
    v_code text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    IF p_season_number IS NULL OR p_season_number < 1 THEN
        RAISE EXCEPTION 'NÚMERO DE TEMPORADA INVÁLIDO.';
    END IF;

    v_code := 'CCFV-LIB-S' || LPAD(p_season_number::text, 2, '0');

    INSERT INTO public.ccfv_libertadores_seasons
        (code, season_number, season_label, status, phase)
    VALUES
        (v_code, p_season_number, COALESCE(NULLIF(trim(p_season_label),''), 'SEASON ' || LPAD(p_season_number::text,2,'0')), 'REGISTRATIONS', 'REGISTRATIONS')
    RETURNING id INTO v_id;

    INSERT INTO public.ccfv_libertadores_clubs
        (season_id, slot, name, slug, country, pot, from_preliminary, logo_path)
    SELECT
        v_id, slot, name, slug, country, pot, from_preliminary, logo_path
    FROM public.ccfv_libertadores_clubs
    WHERE season_id = (SELECT id FROM public.ccfv_libertadores_seasons WHERE code = 'CCFV-LIB-S01')
    ORDER BY slot;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (v_id, 'CREATE_SEASON', jsonb_build_object('season_number',p_season_number,'season_label',p_season_label), auth.uid());

    RETURN v_id;
END;
$$;

-- ------------------------------------------------------------
-- 9) RPC: VINCULAR JOGADOR A CLUBE
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_register_participant(
    p_season_id uuid,
    p_club_id uuid,
    p_player_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_phase text;
    v_club public.ccfv_libertadores_clubs%ROWTYPE;
    v_player public.players%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT phase INTO v_phase
    FROM public.ccfv_libertadores_seasons
    WHERE id = p_season_id
    FOR UPDATE;

    IF v_phase IS NULL THEN
        RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.';
    END IF;

    IF v_phase NOT IN ('REGISTRATIONS','DRAW') THEN
        RAISE EXCEPTION 'AS INSCRIÇÕES ESTÃO BLOQUEADAS NESTA FASE.';
    END IF;

    SELECT * INTO v_club
    FROM public.ccfv_libertadores_clubs
    WHERE id = p_club_id AND season_id = p_season_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CLUBE NÃO ENCONTRADO NESTA TEMPORADA.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'JOGADOR NÃO ENCONTRADO.';
    END IF;

    IF v_club.participant_id IS NOT NULL AND v_club.participant_id <> p_player_id THEN
        RAISE EXCEPTION 'ESTE CLUBE JÁ FOI SELECIONADO POR OUTRO JOGADOR.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.ccfv_libertadores_clubs
        WHERE season_id = p_season_id
          AND participant_id = p_player_id
          AND id <> p_club_id
    ) THEN
        RAISE EXCEPTION 'ESTE JOGADOR JÁ ESTÁ VINCULADO A OUTRO CLUBE DA LIBERTADORES.';
    END IF;

    UPDATE public.ccfv_libertadores_clubs
    SET participant_id = p_player_id,
        status = 'CONFIRMED',
        updated_at = now()
    WHERE id = p_club_id;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (
        p_season_id,
        'REGISTER_PARTICIPANT',
        jsonb_build_object('club_id',p_club_id,'player_id',p_player_id,'player_name',v_player.name),
        auth.uid()
    );

    RETURN jsonb_build_object('ok',true,'club_id',p_club_id,'player_id',p_player_id);
END;
$$;

-- ------------------------------------------------------------
-- 10) RPC: REMOVER VÍNCULO (somente antes do sorteio)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_unregister_participant(
    p_season_id uuid,
    p_club_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_phase text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT phase INTO v_phase
    FROM public.ccfv_libertadores_seasons
    WHERE id = p_season_id;

    IF v_phase IS NULL THEN
        RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.';
    END IF;

    IF v_phase NOT IN ('REGISTRATIONS','DRAW') THEN
        RAISE EXCEPTION 'AS INSCRIÇÕES ESTÃO BLOQUEADAS NESTA FASE.';
    END IF;

    UPDATE public.ccfv_libertadores_clubs
    SET participant_id = NULL,
        status = 'AVAILABLE',
        updated_at = now()
    WHERE id = p_club_id
      AND season_id = p_season_id;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (p_season_id, 'UNREGISTER_PARTICIPANT', jsonb_build_object('club_id',p_club_id), auth.uid());

    RETURN true;
END;
$$;

-- ------------------------------------------------------------
-- 11) RPC: SORTEIO DE GRUPOS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_draw_groups(
    p_season_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt integer;
    v_ok boolean;
    v_pot integer;
    v_group integer;
    v_club record;
    v_assignment uuid[] := ARRAY[]::uuid[];
    v_used uuid[] := ARRAY[]::uuid[];
    v_selected uuid;
    v_name text;
    v_country text;
    v_from_preliminary boolean;
    v_group_code text;
    v_phase text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT phase INTO v_phase FROM public.ccfv_libertadores_seasons WHERE id=p_season_id FOR UPDATE;
    IF v_phase IS NULL THEN RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.'; END IF;
    IF v_phase NOT IN ('REGISTRATIONS','DRAW') THEN
        RAISE EXCEPTION 'O SORTEIO DE GRUPOS ESTÁ BLOQUEADO NESTA FASE.';
    END IF;

    IF (SELECT COUNT(*) FROM public.ccfv_libertadores_clubs WHERE season_id=p_season_id) <> 32 THEN
        RAISE EXCEPTION 'A temporada precisa ter exatamente 32 clubes.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.ccfv_libertadores_clubs
        WHERE season_id=p_season_id AND participant_id IS NULL
    ) THEN
        RAISE EXCEPTION 'TODOS OS 32 CLUBES PRECISAM ESTAR VINCULADOS A JOGADORES ANTES DO SORTEIO.';
    END IF;

    -- Limpa grupos anteriores somente quando a fase ainda não saiu do DRAW.
    UPDATE public.ccfv_libertadores_clubs
    SET group_code=NULL, group_position=NULL, performance_seed=NULL, updated_at=now()
    WHERE season_id=p_season_id;

    FOR v_attempt IN 1..5000 LOOP
        v_ok := true;
        v_assignment := ARRAY[]::uuid[];
        v_used := ARRAY[]::uuid[];

        -- Pote 1 abre os grupos A-H.
        FOR v_club IN
            SELECT id, country, from_preliminary
            FROM public.ccfv_libertadores_clubs
            WHERE season_id=p_season_id AND pot=1
            ORDER BY random()
        LOOP
            v_group := COALESCE(array_length(v_assignment,1),0) + 1;
            v_assignment := array_append(v_assignment, v_club.id);
            UPDATE public.ccfv_libertadores_clubs
            SET group_code=CHR(64+v_group), group_position=1
            WHERE id=v_club.id;
        END LOOP;

        -- Potes 2-4: escolhe clube sem conflito de país no grupo,
        -- permitindo a exceção de clube proveniente da fase preliminar.
        FOR v_pot IN 2..4 LOOP
            FOR v_group IN 1..8 LOOP
                v_group_code := CHR(64+v_group);

                SELECT c.id, c.name, c.country, c.from_preliminary
                INTO v_selected, v_name, v_country, v_from_preliminary
                FROM public.ccfv_libertadores_clubs c
                WHERE c.season_id=p_season_id
                  AND c.pot=v_pot
                  AND NOT (c.id = ANY(v_used))
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.ccfv_libertadores_clubs g
                      WHERE g.season_id=p_season_id
                        AND g.group_code=v_group_code
                        AND (
                            g.country=c.country
                            AND NOT (g.from_preliminary OR c.from_preliminary)
                        )
                  )
                ORDER BY random()
                LIMIT 1;

                IF v_selected IS NULL THEN
                    v_ok := false;
                    EXIT;
                END IF;

                v_used := array_append(v_used, v_selected);

                UPDATE public.ccfv_libertadores_clubs
                SET group_code=v_group_code, group_position=v_pot
                WHERE id=v_selected;
            END LOOP;

            IF NOT v_ok THEN EXIT; END IF;
        END LOOP;

        IF v_ok THEN EXIT; END IF;

        UPDATE public.ccfv_libertadores_clubs
        SET group_code=NULL, group_position=NULL
        WHERE season_id=p_season_id;
    END LOOP;

    IF NOT v_ok THEN
        RAISE EXCEPTION 'NÃO FOI POSSÍVEL ENCONTRAR UMA COMBINAÇÃO VÁLIDA DE GRUPOS.';
    END IF;

    UPDATE public.ccfv_libertadores_seasons
    SET phase='GROUP_STAGE', status='GROUP_STAGE', updated_at=now()
    WHERE id=p_season_id;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (p_season_id, 'DRAW_GROUPS', jsonb_build_object('groups',8,'clubs',32), auth.uid());

    RETURN jsonb_build_object('ok',true,'groups',8,'clubs',32);
END;
$$;

-- ------------------------------------------------------------
-- 12) RPC: GERAR 48 JOGOS DE GRUPOS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_generate_group_matches(
    p_season_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_phase text;
    v_group text;
    v_group_number integer;
    v_ids uuid[];
    v_count integer := 0;
    v_base integer;
    v1 uuid; v2 uuid; v3 uuid; v4 uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT phase INTO v_phase
    FROM public.ccfv_libertadores_seasons
    WHERE id=p_season_id
    FOR UPDATE;

    IF v_phase IS NULL THEN
        RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.';
    END IF;

    IF v_phase NOT IN ('DRAW','GROUP_STAGE') THEN
        RAISE EXCEPTION 'A GERAÇÃO DA FASE DE GRUPOS ESTÁ BLOQUEADA NESTA FASE.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage='GROUP_STAGE') THEN
        RETURN (SELECT COUNT(*)::integer FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage='GROUP_STAGE');
    END IF;

    FOR v_group, v_group_number IN SELECT chr(64+i), i FROM generate_series(1,8) i LOOP
        SELECT ARRAY_AGG(id ORDER BY group_position)
        INTO v_ids
        FROM public.ccfv_libertadores_clubs
        WHERE season_id=p_season_id AND group_code=v_group;

        IF COALESCE(array_length(v_ids,1),0) <> 4 THEN
            RAISE EXCEPTION 'Grupo % não possui 4 clubes.', v_group;
        END IF;

        v1 := v_ids[1]; v2 := v_ids[2]; v3 := v_ids[3]; v4 := v_ids[4];
        v_base := (v_group_number - 1) * 12;

        -- 6 rodadas por grupo / 2 partidas por rodada = 12 partidas por grupo.
        -- Cada clube enfrenta os outros três em casa e fora (6 jogos por clube).
        INSERT INTO public.ccfv_libertadores_matches
            (season_id,stage,group_code,leg,match_order,home_club_id,away_club_id)
        VALUES
            (p_season_id,'GROUP_STAGE',v_group,1,v_base+1,v1,v2),
            (p_season_id,'GROUP_STAGE',v_group,1,v_base+2,v3,v4),
            (p_season_id,'GROUP_STAGE',v_group,1,v_base+3,v2,v3),
            (p_season_id,'GROUP_STAGE',v_group,1,v_base+4,v4,v1),
            (p_season_id,'GROUP_STAGE',v_group,1,v_base+5,v1,v3),
            (p_season_id,'GROUP_STAGE',v_group,1,v_base+6,v2,v4),
            (p_season_id,'GROUP_STAGE',v_group,2,v_base+7,v2,v1),
            (p_season_id,'GROUP_STAGE',v_group,2,v_base+8,v4,v3),
            (p_season_id,'GROUP_STAGE',v_group,2,v_base+9,v3,v2),
            (p_season_id,'GROUP_STAGE',v_group,2,v_base+10,v1,v4),
            (p_season_id,'GROUP_STAGE',v_group,2,v_base+11,v3,v1),
            (p_season_id,'GROUP_STAGE',v_group,2,v_base+12,v4,v2);

        v_count := v_count + 12;
    END LOOP;

    UPDATE public.ccfv_libertadores_seasons
    SET phase='GROUP_STAGE', status='GROUP_STAGE', updated_at=now()
    WHERE id=p_season_id;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (p_season_id, 'GENERATE_GROUP_MATCHES', jsonb_build_object('matches',v_count,'rounds',6,'matches_per_group',12), auth.uid());

    RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 13) RPC: RESULTADO DE PARTIDA
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_submit_result(
    p_match_id uuid,
    p_home_score integer,
    p_away_score integer,
    p_home_extra_score integer DEFAULT 0,
    p_away_extra_score integer DEFAULT 0,
    p_home_penalties integer DEFAULT NULL,
    p_away_penalties integer DEFAULT NULL,
    p_home_red integer DEFAULT 0,
    p_away_red integer DEFAULT 0,
    p_home_yellow integer DEFAULT 0,
    p_away_yellow integer DEFAULT 0,
    p_notes text DEFAULT NULL,
    p_evidence_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match public.ccfv_libertadores_matches%ROWTYPE;
    v_home integer;
    v_away integer;
    v_winner uuid := NULL;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    IF p_home_score IS NULL OR p_away_score IS NULL OR p_home_score < 0 OR p_away_score < 0 THEN
        RAISE EXCEPTION 'PLACAR INVÁLIDO.';
    END IF;

    SELECT * INTO v_match
    FROM public.ccfv_libertadores_matches
    WHERE id=p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTIDA NÃO ENCONTRADA.';
    END IF;

    v_home := p_home_score + GREATEST(p_home_extra_score,0);
    v_away := p_away_score + GREATEST(p_away_extra_score,0);

    IF v_match.stage = 'FINAL' THEN
        IF v_home > v_away THEN
            v_winner := v_match.home_club_id;
        ELSIF v_away > v_home THEN
            v_winner := v_match.away_club_id;
        ELSIF p_home_penalties IS NOT NULL AND p_away_penalties IS NOT NULL AND p_home_penalties <> p_away_penalties THEN
            v_winner := CASE WHEN p_home_penalties > p_away_penalties THEN v_match.home_club_id ELSE v_match.away_club_id END;
        END IF;
    ELSIF v_match.leg = 2 THEN
        -- Agregado da chave.
        DECLARE
            v_first public.ccfv_libertadores_matches%ROWTYPE;
            v_agg_home integer;
            v_agg_away integer;
        BEGIN
            SELECT * INTO v_first
            FROM public.ccfv_libertadores_matches
            WHERE season_id=v_match.season_id
              AND stage=v_match.stage
              AND tie_code=v_match.tie_code
              AND leg=1
            FOR UPDATE;

            v_agg_home := COALESCE(v_first.home_score,0) + COALESCE(v_first.home_extra_score,0)
                        + CASE WHEN v_first.home_club_id=v_match.home_club_id THEN v_home ELSE v_away END;
            v_agg_away := COALESCE(v_first.away_score,0) + COALESCE(v_first.away_extra_score,0)
                        + CASE WHEN v_first.away_club_id=v_match.away_club_id THEN v_away ELSE v_home END;

            IF v_match.home_club_id = v_first.home_club_id THEN
                v_agg_home := COALESCE(v_first.home_score,0)+COALESCE(v_first.home_extra_score,0)+v_home;
                v_agg_away := COALESCE(v_first.away_score,0)+COALESCE(v_first.away_extra_score,0)+v_away;
            ELSE
                v_agg_home := COALESCE(v_first.home_score,0)+COALESCE(v_first.home_extra_score,0)+v_away;
                v_agg_away := COALESCE(v_first.away_score,0)+COALESCE(v_first.away_extra_score,0)+v_home;
            END IF;

            IF v_agg_home > v_agg_away THEN
                v_winner := v_match.home_club_id;
            ELSIF v_agg_away > v_agg_home THEN
                v_winner := v_match.away_club_id;
            ELSIF p_home_penalties IS NOT NULL AND p_away_penalties IS NOT NULL AND p_home_penalties <> p_away_penalties THEN
                v_winner := CASE WHEN p_home_penalties > p_away_penalties THEN v_match.home_club_id ELSE v_match.away_club_id END;
            END IF;
        END;
    ELSIF v_match.stage = 'GROUP_STAGE' THEN
        -- Resultado de grupos não tem vencedor de chave.
        v_winner := NULL;
    ELSE
        -- Leg 1 do mata-mata aguarda a volta.
        v_winner := NULL;
    END IF;

    UPDATE public.ccfv_libertadores_matches
    SET home_score=p_home_score,
        away_score=p_away_score,
        home_extra_score=GREATEST(p_home_extra_score,0),
        away_extra_score=GREATEST(p_away_extra_score,0),
        home_penalties=p_home_penalties,
        away_penalties=p_away_penalties,
        winner_club_id=v_winner,
        red_cards_home=GREATEST(p_home_red,0),
        red_cards_away=GREATEST(p_away_red,0),
        yellow_cards_home=GREATEST(p_home_yellow,0),
        yellow_cards_away=GREATEST(p_away_yellow,0),
        status='VALIDATED',
        notes=p_notes,
        evidence_url=p_evidence_url,
        updated_at=now()
    WHERE id=p_match_id;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (
        v_match.season_id,
        'SUBMIT_RESULT',
        jsonb_build_object('match_id',p_match_id,'home_score',p_home_score,'away_score',p_away_score,'winner_club_id',v_winner),
        auth.uid()
    );

    RETURN jsonb_build_object('ok',true,'winner_club_id',v_winner);
END;
$$;

-- ------------------------------------------------------------
-- 14) RPC: GERAR OITAVAS (SORTEIO OFICIAL)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_generate_r16(
    p_season_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_count integer;
    v_completed integer;
    v_seed integer := 0;
    v_runner record;
    v_winner_id uuid;
    v_used uuid[] := ARRAY[]::uuid[];
    v_attempt integer;
    v_ok boolean;
    v_runner_id uuid;
    v_runner_group text;
    v_tie integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

    IF (SELECT phase FROM public.ccfv_libertadores_seasons WHERE id=p_season_id FOR UPDATE) <> 'GROUP_STAGE' THEN
        RAISE EXCEPTION 'AS OITAVAS SÓ PODEM SER GERADAS APÓS A FASE DE GRUPOS.';
    END IF;

    SELECT COUNT(*) INTO v_group_count FROM public.ccfv_libertadores_clubs WHERE season_id=p_season_id AND group_code IS NOT NULL;
    IF v_group_count <> 32 THEN RAISE EXCEPTION 'A fase de grupos precisa estar formada com 32 clubes.'; END IF;

    SELECT COUNT(*) INTO v_completed
    FROM public.ccfv_libertadores_matches
    WHERE season_id=p_season_id AND stage='GROUP_STAGE' AND status IN ('VALIDATED','WO','ADMIN_DECISION');

    IF v_completed <> 96 THEN RAISE EXCEPTION 'As 96 partidas da fase de grupos precisam estar encerradas.'; END IF;

    IF EXISTS (SELECT 1 FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage='ROUND_OF_16') THEN
        RETURN jsonb_build_object('ok',true,'existing',true);
    END IF;

    -- Numeração de performance: vencedores 1..8 e segundos 9..16.
    WITH s AS (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY season_id ORDER BY points DESC, h2h_points DESC, h2h_gd DESC, h2h_gf DESC, gd DESC, gf DESC, red_cards ASC, yellow_cards ASC, draw_seed ASC, name) AS overall_rank,
               ROW_NUMBER() OVER (PARTITION BY season_id, (position=1) ORDER BY points DESC, h2h_points DESC, h2h_gd DESC, h2h_gf DESC, gd DESC, gf DESC, red_cards ASC, yellow_cards ASC, draw_seed ASC, name) AS role_rank
        FROM public.ccfv_libertadores_public_standings
        WHERE season_id=p_season_id AND position IN (1,2)
    )
    UPDATE public.ccfv_libertadores_clubs c
    SET performance_seed = CASE WHEN s.position=1 THEN s.role_rank ELSE 8+s.role_rank END,
        updated_at=now()
    FROM s
    WHERE c.id=s.club_id;

    -- Oitavas: cada vice enfrenta um vencedor de grupo distinto do próprio grupo.
    FOR v_attempt IN 1..5000 LOOP
        v_used := ARRAY[]::uuid[];
        v_ok := true;
        v_tie := 0;

        FOR v_runner IN
            SELECT c.id, c.group_code
            FROM public.ccfv_libertadores_clubs c
            JOIN public.ccfv_libertadores_public_standings s ON s.club_id=c.id
            WHERE c.season_id=p_season_id AND s.position=2
            ORDER BY random()
        LOOP
            SELECT c.id INTO v_winner_id
            FROM public.ccfv_libertadores_clubs c
            JOIN public.ccfv_libertadores_public_standings s ON s.club_id=c.id
            WHERE c.season_id=p_season_id
              AND s.position=1
              AND NOT (c.id=ANY(v_used))
              AND c.group_code <> v_runner.group_code
            ORDER BY random()
            LIMIT 1;

            IF v_winner_id IS NULL THEN
                v_ok := false;
                EXIT;
            END IF;

            v_used := array_append(v_used, v_winner_id);
            v_tie := v_tie + 1;

            INSERT INTO public.ccfv_libertadores_matches
                (season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
            VALUES
                (p_season_id,'ROUND_OF_16', 'R16-'||CHR(64+v_tie), 1, (v_tie*2)-1, v_runner.id, v_winner_id),
                (p_season_id,'ROUND_OF_16', 'R16-'||CHR(64+v_tie), 2, (v_tie*2), v_winner_id, v_runner.id);
        END LOOP;

        IF v_ok THEN EXIT; END IF;
        DELETE FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage='ROUND_OF_16';
    END LOOP;

    IF NOT v_ok THEN RAISE EXCEPTION 'Não foi possível montar o sorteio das oitavas.'; END IF;

    UPDATE public.ccfv_libertadores_seasons
    SET phase='ROUND_OF_16', status='KNOCKOUT', updated_at=now()
    WHERE id=p_season_id;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (p_season_id,'GENERATE_R16',jsonb_build_object('ties',8),auth.uid());

    RETURN jsonb_build_object('ok',true,'ties',8,'matches',16);
END;
$$;

-- ------------------------------------------------------------
-- 15) RPC: GERAR PRÓXIMA FASE DO MATA-MATA
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_generate_next_knockout(
    p_season_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_phase text;
    v_prev text;
    v_required integer;
    v_finished integer;
    v_next text;
    v_match record;
    v_winners uuid[] := ARRAY[]::uuid[];
    v_best uuid;
    v_worst uuid;
    v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_e uuid; v_f uuid; v_g uuid; v_h uuid;
    v_seed_a integer; v_seed_b integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

    SELECT phase INTO v_phase FROM public.ccfv_libertadores_seasons WHERE id=p_season_id FOR UPDATE;
    IF v_phase IS NULL THEN RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.'; END IF;

    IF v_phase='ROUND_OF_16' THEN
        v_prev := 'ROUND_OF_16'; v_required := 16; v_next := 'QUARTERFINALS';
    ELSIF v_phase='QUARTERFINALS' THEN
        v_prev := 'QUARTERFINALS'; v_required := 8; v_next := 'SEMIFINALS';
    ELSIF v_phase='SEMIFINALS' THEN
        v_prev := 'SEMIFINALS'; v_required := 4; v_next := 'FINAL';
    ELSE
        RAISE EXCEPTION 'Não há próxima fase automática a partir de %.', v_phase;
    END IF;

    SELECT COUNT(*) INTO v_finished
    FROM public.ccfv_libertadores_matches
    WHERE season_id=p_season_id AND stage=v_prev AND leg=2 AND status IN ('VALIDATED','WO','ADMIN_DECISION') AND winner_club_id IS NOT NULL;

    IF v_finished <> v_required/2 THEN
        RAISE EXCEPTION 'A fase anterior ainda não está completamente decidida.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_next) THEN
        RETURN jsonb_build_object('ok',true,'existing',true,'stage',v_next);
    END IF;

    IF v_next='QUARTERFINALS' THEN
        -- S1=A-H, S2=B-G, S3=C-F, S4=D-E.
        SELECT winner_club_id INTO v_a FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-A' AND leg=2;
        SELECT winner_club_id INTO v_b FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-B' AND leg=2;
        SELECT winner_club_id INTO v_c FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-C' AND leg=2;
        SELECT winner_club_id INTO v_d FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-D' AND leg=2;
        SELECT winner_club_id INTO v_e FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-E' AND leg=2;
        SELECT winner_club_id INTO v_f FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-F' AND leg=2;
        SELECT winner_club_id INTO v_g FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-G' AND leg=2;
        SELECT winner_club_id INTO v_h FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='R16-H' AND leg=2;

        -- A volta é do melhor seed: leg 1 do pior para o melhor, leg 2 inverso.
        INSERT INTO public.ccfv_libertadores_matches(season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
        VALUES
            (p_season_id,'QUARTERFINALS','QF-A',1,1, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_a) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_h) THEN v_a ELSE v_h END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_a) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_h) THEN v_h ELSE v_a END),
            (p_season_id,'QUARTERFINALS','QF-A',2,2, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_a) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_h) THEN v_h ELSE v_a END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_a) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_h) THEN v_a ELSE v_h END);

        INSERT INTO public.ccfv_libertadores_matches(season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
        VALUES
            (p_season_id,'QUARTERFINALS','QF-B',1,3, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_b) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_g) THEN v_b ELSE v_g END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_b) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_g) THEN v_g ELSE v_b END),
            (p_season_id,'QUARTERFINALS','QF-B',2,4, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_b) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_g) THEN v_g ELSE v_b END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_b) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_g) THEN v_b ELSE v_g END),
            (p_season_id,'QUARTERFINALS','QF-C',1,5, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_c) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_f) THEN v_c ELSE v_f END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_c) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_f) THEN v_f ELSE v_c END),
            (p_season_id,'QUARTERFINALS','QF-C',2,6, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_c) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_f) THEN v_f ELSE v_c END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_c) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_f) THEN v_c ELSE v_f END),
            (p_season_id,'QUARTERFINALS','QF-D',1,7, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_d) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_e) THEN v_d ELSE v_e END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_d) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_e) THEN v_e ELSE v_d END),
            (p_season_id,'QUARTERFINALS','QF-D',2,8, CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_d) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_e) THEN v_e ELSE v_d END,
                                              CASE WHEN (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_d) > (SELECT performance_seed FROM public.ccfv_libertadores_clubs WHERE id=v_e) THEN v_d ELSE v_e END);

        UPDATE public.ccfv_libertadores_seasons SET phase='QUARTERFINALS', status='KNOCKOUT', updated_at=now() WHERE id=p_season_id;
    ELSIF v_next='SEMIFINALS' THEN
        SELECT winner_club_id INTO v_a FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='QF-A' AND leg=2;
        SELECT winner_club_id INTO v_b FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='QF-B' AND leg=2;
        SELECT winner_club_id INTO v_c FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='QF-C' AND leg=2;
        SELECT winner_club_id INTO v_d FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='QF-D' AND leg=2;

        -- S1 vs S4 = F1 ; S2 vs S3 = F2, melhor seed volta em casa.
        INSERT INTO public.ccfv_libertadores_matches(season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
        SELECT p_season_id,'SEMIFINALS','SF-A',1,1,
               CASE WHEN ca.performance_seed > cd.performance_seed THEN v_a ELSE v_d END,
               CASE WHEN ca.performance_seed > cd.performance_seed THEN v_d ELSE v_a END
        FROM public.ccfv_libertadores_clubs ca, public.ccfv_libertadores_clubs cd
        WHERE ca.id=v_a AND cd.id=v_d;
        INSERT INTO public.ccfv_libertadores_matches(season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
        SELECT p_season_id,'SEMIFINALS','SF-A',2,2,
               CASE WHEN ca.performance_seed > cd.performance_seed THEN v_d ELSE v_a END,
               CASE WHEN ca.performance_seed > cd.performance_seed THEN v_a ELSE v_d END
        FROM public.ccfv_libertadores_clubs ca, public.ccfv_libertadores_clubs cd
        WHERE ca.id=v_a AND cd.id=v_d;

        INSERT INTO public.ccfv_libertadores_matches(season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
        SELECT p_season_id,'SEMIFINALS','SF-B',1,3,
               CASE WHEN cb.performance_seed > cc.performance_seed THEN v_b ELSE v_c END,
               CASE WHEN cb.performance_seed > cc.performance_seed THEN v_c ELSE v_b END
        FROM public.ccfv_libertadores_clubs cb, public.ccfv_libertadores_clubs cc
        WHERE cb.id=v_b AND cc.id=v_c;
        INSERT INTO public.ccfv_libertadores_matches(season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
        SELECT p_season_id,'SEMIFINALS','SF-B',2,4,
               CASE WHEN cb.performance_seed > cc.performance_seed THEN v_c ELSE v_b END,
               CASE WHEN cb.performance_seed > cc.performance_seed THEN v_b ELSE v_c END
        FROM public.ccfv_libertadores_clubs cb, public.ccfv_libertadores_clubs cc
        WHERE cb.id=v_b AND cc.id=v_c;

        UPDATE public.ccfv_libertadores_seasons SET phase='SEMIFINALS', status='KNOCKOUT', updated_at=now() WHERE id=p_season_id;
    ELSIF v_next='FINAL' THEN
        SELECT winner_club_id INTO v_a FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='SF-A' AND leg=2;
        SELECT winner_club_id INTO v_b FROM public.ccfv_libertadores_matches WHERE season_id=p_season_id AND stage=v_prev AND tie_code='SF-B' AND leg=2;
        INSERT INTO public.ccfv_libertadores_matches(season_id,stage,tie_code,leg,match_order,home_club_id,away_club_id)
        VALUES (p_season_id,'FINAL','FINAL',1,1,v_a,v_b);
        UPDATE public.ccfv_libertadores_seasons SET phase='FINAL', status='KNOCKOUT', updated_at=now() WHERE id=p_season_id;
    END IF;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (p_season_id,'GENERATE_NEXT_KNOCKOUT',jsonb_build_object('stage',v_next),auth.uid());

    RETURN jsonb_build_object('ok',true,'stage',v_next);
END;
$$;

-- ------------------------------------------------------------
-- 16) RPC: FINALIZAR / REGISTRAR CAMPEÃO + HISTÓRIA
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ccfv_libertadores_finish_season(
    p_season_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match public.ccfv_libertadores_matches%ROWTYPE;
    v_club public.ccfv_libertadores_clubs%ROWTYPE;
    v_player public.players%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

    IF (SELECT phase FROM public.ccfv_libertadores_seasons WHERE id=p_season_id FOR UPDATE) <> 'FINAL' THEN
        RAISE EXCEPTION 'A TEMPORADA AINDA NÃO ESTÁ NA FINAL.';
    END IF;

    SELECT * INTO v_match
    FROM public.ccfv_libertadores_matches
    WHERE season_id=p_season_id AND stage='FINAL'
    ORDER BY match_order DESC LIMIT 1;

    IF v_match.winner_club_id IS NULL THEN
        RAISE EXCEPTION 'A FINAL PRECISA TER UM CAMPEÃO DEFINIDO.';
    END IF;

    SELECT * INTO v_club FROM public.ccfv_libertadores_clubs WHERE id=v_match.winner_club_id;
    IF v_club.participant_id IS NULL THEN RAISE EXCEPTION 'O CAMPEÃO NÃO POSSUI JOGADOR VINCULADO.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id=v_club.participant_id;

    UPDATE public.ccfv_libertadores_clubs SET status='CHAMPION', updated_at=now() WHERE id=v_club.id;
    UPDATE public.ccfv_libertadores_seasons SET phase='FINISHED', status='FINISHED', end_at=now(), updated_at=now() WHERE id=p_season_id;

    INSERT INTO public.ccfv_titles(
        player_id, competition_code, competition_name, season, platform,
        team_name, club_name, club_logo, title, source_id
    )
    VALUES (
        v_club.participant_id,
        'LIBERTADORES',
        'LIBERTADORES CCFV',
        (SELECT season_label FROM public.ccfv_libertadores_seasons WHERE id=p_season_id),
        v_player.platform,
        v_club.name,
        v_club.name,
        v_club.logo_path,
        'CAMPEÃO',
        v_match.id
    )
    ON CONFLICT (player_id, competition_code, season) DO NOTHING;

    INSERT INTO public.ccfv_libertadores_audit(season_id, action, payload, actor_id)
    VALUES (p_season_id,'FINISH_SEASON',jsonb_build_object('champion_club_id',v_club.id,'champion_player_id',v_player.id,'champion_player_name',v_player.name),auth.uid());

    RETURN jsonb_build_object('ok',true,'champion_club_id',v_club.id,'champion_player_id',v_player.id);
END;
$$;

-- ------------------------------------------------------------
-- 17) RLS + GRANTS
-- ------------------------------------------------------------

ALTER TABLE public.ccfv_libertadores_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccfv_libertadores_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccfv_libertadores_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccfv_libertadores_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ccfv_libertadores_seasons' AND policyname='ccfv_lib_auth_seasons_all') THEN
        CREATE POLICY ccfv_lib_auth_seasons_all ON public.ccfv_libertadores_seasons
            FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ccfv_libertadores_clubs' AND policyname='ccfv_lib_auth_clubs_all') THEN
        CREATE POLICY ccfv_lib_auth_clubs_all ON public.ccfv_libertadores_clubs
            FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ccfv_libertadores_matches' AND policyname='ccfv_lib_auth_matches_all') THEN
        CREATE POLICY ccfv_lib_auth_matches_all ON public.ccfv_libertadores_matches
            FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ccfv_libertadores_audit' AND policyname='ccfv_lib_auth_audit_all') THEN
        CREATE POLICY ccfv_lib_auth_audit_all ON public.ccfv_libertadores_audit
            FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

GRANT SELECT ON public.ccfv_libertadores_public_seasons TO anon, authenticated;
GRANT SELECT ON public.ccfv_libertadores_public_clubs TO anon, authenticated;
GRANT SELECT ON public.ccfv_libertadores_public_standings TO anon, authenticated;
GRANT SELECT ON public.ccfv_libertadores_public_matches TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_create_season(integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_register_participant(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_unregister_participant(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_draw_groups(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_generate_group_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_submit_result(uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_generate_r16(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_generate_next_knockout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_finish_season(uuid) TO authenticated;

COMMIT;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT 'LIB_SEASONS' AS item, COUNT(*)::int AS total FROM public.ccfv_libertadores_seasons
UNION ALL
SELECT 'LIB_CLUBS', COUNT(*)::int FROM public.ccfv_libertadores_clubs
UNION ALL
SELECT 'LIB_MATCHES', COUNT(*)::int FROM public.ccfv_libertadores_matches;
