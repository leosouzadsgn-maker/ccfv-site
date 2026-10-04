-- ============================================================
-- CCFV COPA DO MUNDO — CORREÇÕES FINAIS
-- 1) Corrige o acesso público do Admin (sem SELECT direto nas tabelas-base)
-- 2) Adiciona estatísticas completas aos grupos
-- 3) Expõe jogador/foto nos jogos e nas classificações
-- 4) Cria desvinculação segura de participante
-- ============================================================

BEGIN;

CREATE OR REPLACE VIEW public.ccfv_world_cup_public_seasons AS
SELECT
    id,
    code,
    season_number,
    season_label,
    status,
    phase,
    created_at,
    updated_at
FROM public.ccfv_world_cup_seasons;


CREATE OR REPLACE VIEW public.ccfv_world_cup_public_teams AS
SELECT
    t.id,
    t.season_id,
    t.slot,
    t.name,
    t.slug,
    t.confederation,
    t.logo_path,
    t.pot,
    t.group_code,
    t.group_position,
    t.status,
    t.participant_id,
    p.name AS participant_name,
    p.platform AS participant_platform,
    p.photo_url AS participant_photo_url
FROM public.ccfv_world_cup_teams t
LEFT JOIN public.players p
    ON p.id = t.participant_id;


CREATE OR REPLACE VIEW public.ccfv_world_cup_public_matches AS
SELECT
    m.id,
    m.season_id,
    m.stage,
    m.group_code,
    m.tie_code,
    m.match_order,
    m.scheduled_at,
    m.status,
    m.home_score,
    m.away_score,
    m.home_penalties,
    m.away_penalties,
    m.winner_team_id,
    m.notes,

    h.name AS home_name,
    h.slug AS home_slug,
    h.logo_path AS home_logo_path,
    h.participant_id AS home_participant_id,
    hp.name AS home_player_name,
    hp.photo_url AS home_player_photo_url,

    a.name AS away_name,
    a.slug AS away_slug,
    a.logo_path AS away_logo_path,
    a.participant_id AS away_participant_id,
    ap.name AS away_player_name,
    ap.photo_url AS away_player_photo_url

FROM public.ccfv_world_cup_matches m
JOIN public.ccfv_world_cup_teams h
    ON h.id = m.home_team_id
JOIN public.ccfv_world_cup_teams a
    ON a.id = m.away_team_id
LEFT JOIN public.players hp
    ON hp.id = h.participant_id
LEFT JOIN public.players ap
    ON ap.id = a.participant_id;


CREATE OR REPLACE VIEW public.ccfv_world_cup_public_standings AS
WITH base AS (
    SELECT
        t.id AS team_id,
        t.season_id,
        t.group_code,
        t.group_position,
        t.name,
        t.slug,
        t.logo_path,
        t.participant_id,
        p.name AS participant_name,
        p.platform AS participant_platform,
        p.photo_url AS participant_photo_url,

        COALESCE(
            SUM(
                CASE
                    WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN 1
                    ELSE 0
                END
            ),
            0
        )::int AS played,

        COALESCE(
            SUM(
                CASE
                    WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
                        CASE
                            WHEN m.home_team_id = t.id THEN COALESCE(m.home_score,0)
                            ELSE COALESCE(m.away_score,0)
                        END
                    ELSE 0
                END
            ),
            0
        )::int AS goals_for,

        COALESCE(
            SUM(
                CASE
                    WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
                        CASE
                            WHEN m.home_team_id = t.id THEN COALESCE(m.away_score,0)
                            ELSE COALESCE(m.home_score,0)
                        END
                    ELSE 0
                END
            ),
            0
        )::int AS goals_against,

        COALESCE(
            SUM(
                CASE
                    WHEN m.status NOT IN ('VALIDATED','WO','ADMIN_DECISION') THEN 0
                    WHEN m.winner_team_id = t.id THEN 3
                    WHEN m.winner_team_id IS NOT NULL THEN 0
                    WHEN COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END,
                        0
                    ) > COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END,
                        0
                    ) THEN 3
                    WHEN COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END,
                        0
                    ) = COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END,
                        0
                    ) THEN 1
                    ELSE 0
                END
            ),
            0
        )::int AS points,

        COALESCE(
            SUM(
                CASE
                    WHEN m.status NOT IN ('VALIDATED','WO','ADMIN_DECISION') THEN 0
                    WHEN m.winner_team_id = t.id THEN 1
                    WHEN m.winner_team_id IS NOT NULL THEN 0
                    WHEN COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END,
                        0
                    ) > COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END,
                        0
                    ) THEN 1
                    ELSE 0
                END
            ),
            0
        )::int AS wins,

        COALESCE(
            SUM(
                CASE
                    WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION')
                     AND m.winner_team_id IS NULL
                     AND COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END,
                        0
                     ) = COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END,
                        0
                     )
                    THEN 1
                    ELSE 0
                END
            ),
            0
        )::int AS draws,

        COALESCE(
            SUM(
                CASE
                    WHEN m.status NOT IN ('VALIDATED','WO','ADMIN_DECISION') THEN 0
                    WHEN m.winner_team_id IS NOT NULL AND m.winner_team_id <> t.id THEN 1
                    WHEN m.winner_team_id IS NULL AND COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END,
                        0
                    ) < COALESCE(
                        CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END,
                        0
                    ) THEN 1
                    ELSE 0
                END
            ),
            0
        )::int AS losses

    FROM public.ccfv_world_cup_teams t
    LEFT JOIN public.ccfv_world_cup_matches m
        ON m.season_id = t.season_id
       AND m.stage = 'GROUP_STAGE'
       AND m.group_code = t.group_code
       AND (m.home_team_id = t.id OR m.away_team_id = t.id)
    LEFT JOIN public.players p
        ON p.id = t.participant_id
    WHERE t.group_code IS NOT NULL
    GROUP BY
        t.id,
        t.season_id,
        t.group_code,
        t.group_position,
        t.name,
        t.slug,
        t.logo_path,
        t.participant_id,
        p.name,
        p.platform,
        p.photo_url
)
SELECT
    team_id,
    season_id,
    group_code,
    group_position,
    name,
    slug,
    logo_path,
    participant_id,
    participant_name,
    participant_platform,
    participant_photo_url,
    played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    (goals_for - goals_against)::int AS goal_difference,
    points,
    ROW_NUMBER() OVER (
        PARTITION BY season_id, group_code
        ORDER BY
            points DESC,
            (goals_for - goals_against) DESC,
            goals_for DESC,
            wins DESC,
            name ASC
    )::int AS position,
    (
        ROW_NUMBER() OVER (
            PARTITION BY season_id, group_code
            ORDER BY
                points DESC,
                (goals_for - goals_against) DESC,
                goals_for DESC,
                wins DESC,
                name ASC
        ) <= 2
    ) AS qualified
FROM base;


CREATE OR REPLACE FUNCTION public.ccfv_world_cup_unregister_participant(
    p_season_id uuid,
    p_team_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_phase text;
    v_player_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    SELECT phase
    INTO v_phase
    FROM public.ccfv_world_cup_seasons
    WHERE id = p_season_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TEMPORADA DA COPA NÃO ENCONTRADA.';
    END IF;

    IF v_phase NOT IN ('REGISTRATIONS','DRAW') THEN
        RAISE EXCEPTION 'A DESVINCULAÇÃO ESTÁ BLOQUEADA APÓS O SORTEIO.';
    END IF;

    SELECT participant_id
    INTO v_player_id
    FROM public.ccfv_world_cup_teams
    WHERE id = p_team_id
      AND season_id = p_season_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SELEÇÃO NÃO ENCONTRADA NESTA TEMPORADA.';
    END IF;

    UPDATE public.ccfv_world_cup_teams
    SET
        participant_id = NULL,
        status = 'AVAILABLE',
        group_code = NULL,
        group_position = NULL,
        updated_at = now()
    WHERE id = p_team_id
      AND season_id = p_season_id;

    INSERT INTO public.ccfv_world_cup_audit(
        season_id,
        action,
        payload,
        actor_id
    )
    VALUES(
        p_season_id,
        'UNREGISTER_PARTICIPANT',
        jsonb_build_object(
            'team_id', p_team_id,
            'player_id', v_player_id
        ),
        auth.uid()
    );

    RETURN jsonb_build_object(
        'ok', true,
        'team_id', p_team_id,
        'player_id', v_player_id
    );
END;
$$;


GRANT EXECUTE
ON FUNCTION public.ccfv_world_cup_unregister_participant(uuid,uuid)
TO authenticated;


GRANT SELECT
ON public.ccfv_world_cup_public_seasons,
   public.ccfv_world_cup_public_teams,
   public.ccfv_world_cup_public_matches,
   public.ccfv_world_cup_public_standings
TO anon, authenticated;

COMMIT;
