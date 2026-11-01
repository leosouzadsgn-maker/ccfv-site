-- ============================================================
-- CCFV — ELO AUTOMÁTICO DA COPA DO MUNDO
-- Migração isolada: usa as tabelas/RPCs existentes da Copa.
-- Não altera Champions, Brasileirão, Night Cup ou ranking trigger.
-- Regras: grupos V +24 / E +8 / D -12; mata-mata +28 / -14.
-- Título: campeão +150; vice +75, apenas no encerramento manual.
-- ============================================================

BEGIN;

-- Pré-validação: aborta antes de alterar qualquer coisa se o motor
-- da Copa não estiver instalado com os nomes conhecidos.
DO $preflight$
BEGIN
    IF to_regclass('public.ccfv_world_cup_seasons') IS NULL
       OR to_regclass('public.ccfv_world_cup_teams') IS NULL
       OR to_regclass('public.ccfv_world_cup_matches') IS NULL
       OR to_regclass('public.ccfv_world_cup_audit') IS NULL
       OR to_regclass('public.players') IS NULL
       OR to_regclass('public.ccfv_titles') IS NULL THEN
        RAISE EXCEPTION 'CCFV: faltam tabelas existentes da Copa/players/títulos. Migração cancelada sem alterações.';
    END IF;
END;
$preflight$;

-- Registro próprio para não pontuar o mesmo jogo/título duas vezes.
CREATE TABLE IF NOT EXISTS public.ccfv_world_cup_elo_awards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL REFERENCES public.ccfv_world_cup_seasons(id) ON DELETE CASCADE,
    event_key text NOT NULL,
    source_match_id uuid,
    player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    result_code text NOT NULL CHECK (result_code IN ('WIN','DRAW','LOSS','CHAMPION','RUNNER_UP')),
    elo_delta integer NOT NULL,
    elo_before integer NOT NULL,
    elo_after integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ccfv_world_cup_elo_awards_once UNIQUE (season_id,event_key,player_id)
);

CREATE INDEX IF NOT EXISTS idx_ccfv_world_cup_elo_awards_player
    ON public.ccfv_world_cup_elo_awards(player_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ccfv_world_cup_elo_awards_season
    ON public.ccfv_world_cup_elo_awards(season_id,created_at DESC);

ALTER TABLE public.ccfv_world_cup_elo_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ccfv_world_cup_elo_awards FROM PUBLIC, anon, authenticated;

-- Função interna para creditar Elo exatamente uma vez por evento/jogador.
CREATE OR REPLACE FUNCTION public.ccfv_world_cup_apply_elo(
    p_season_id uuid,
    p_event_key text,
    p_source_match_id uuid,
    p_awards jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item record;
    v_award_id uuid;
    v_before integer;
    v_after integer;
    v_applied integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    IF p_season_id IS NULL OR NULLIF(p_event_key,'') IS NULL THEN
        RAISE EXCEPTION 'TEMPORADA/EVENTO OBRIGATÓRIO.';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_season_id::text || ':' || p_event_key,0)
    );

    FOR v_item IN
        SELECT
            NULLIF(e.value->>'player_id','')::uuid AS player_id,
            COALESCE(NULLIF(e.value->>'delta','')::integer,0) AS elo_delta,
            COALESCE(NULLIF(e.value->>'result',''),'WIN') AS result_code
        FROM jsonb_array_elements(COALESCE(p_awards,'[]'::jsonb)) AS e(value)
        WHERE NULLIF(e.value->>'player_id','') IS NOT NULL
    LOOP
        IF v_item.result_code NOT IN ('WIN','DRAW','LOSS','CHAMPION','RUNNER_UP') THEN
            RAISE EXCEPTION 'TIPO DE RESULTADO DE ELO INVÁLIDO.';
        END IF;

        SELECT COALESCE(p.elo,0)
        INTO v_before
        FROM public.players p
        WHERE p.id = v_item.player_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'JOGADOR % NÃO ENCONTRADO.',v_item.player_id;
        END IF;

        v_award_id := NULL;
        INSERT INTO public.ccfv_world_cup_elo_awards(
            season_id,event_key,source_match_id,player_id,result_code,
            elo_delta,elo_before,elo_after
        )
        VALUES(
            p_season_id,p_event_key,p_source_match_id,v_item.player_id,
            v_item.result_code,v_item.elo_delta,v_before,NULL
        )
        ON CONFLICT (season_id,event_key,player_id) DO NOTHING
        RETURNING id INTO v_award_id;

        -- Já contabilizado: não mexer de novo no Elo.
        IF v_award_id IS NULL THEN
            CONTINUE;
        END IF;

        UPDATE public.players
        SET elo = GREATEST(0,COALESCE(elo,0) + v_item.elo_delta)
        WHERE id = v_item.player_id
        RETURNING COALESCE(elo,0) INTO v_after;

        UPDATE public.ccfv_world_cup_elo_awards
        SET elo_after = v_after
        WHERE id = v_award_id;

        v_applied := v_applied + 1;
    END LOOP;

    RETURN v_applied;
END;
$$;

REVOKE ALL ON FUNCTION public.ccfv_world_cup_apply_elo(uuid,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;

-- Resultado da Copa: mantém os mesmos argumentos/RPC usados pelo Admin,
-- aplica Elo automaticamente após validar o placar.
CREATE OR REPLACE FUNCTION public.ccfv_world_cup_set_result(
    p_match_id uuid,
    p_home_score integer,
    p_away_score integer,
    p_home_penalties integer DEFAULT NULL,
    p_away_penalties integer DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m public.ccfv_world_cup_matches%ROWTYPE;
    w uuid;
    v_home_player uuid;
    v_away_player uuid;
    v_awards jsonb;
    v_applied integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

    SELECT * INTO m
    FROM public.ccfv_world_cup_matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'PARTIDA NÃO ENCONTRADA.'; END IF;
    IF p_home_score IS NULL OR p_away_score IS NULL OR p_home_score < 0 OR p_away_score < 0 THEN
        RAISE EXCEPTION 'PLACAR INVÁLIDO.';
    END IF;

    -- Se o jogo já pontuou no Elo, não permitir alterar o placar por esta RPC.
    -- Isso evita manter um ranking incompatível com o resultado registrado.
    IF EXISTS (
        SELECT 1
        FROM public.ccfv_world_cup_elo_awards a
        WHERE a.season_id = m.season_id
          AND a.event_key = 'MATCH:' || m.id::text
    ) AND (
        p_home_score IS DISTINCT FROM m.home_score
        OR p_away_score IS DISTINCT FROM m.away_score
        OR p_home_penalties IS DISTINCT FROM m.home_penalties
        OR p_away_penalties IS DISTINCT FROM m.away_penalties
    ) THEN
        RAISE EXCEPTION 'ESTE JOGO JÁ FOI CONTABILIZADO NO ELO. O PLACAR NÃO PODE SER ALTERADO POR ESTA ROTINA.';
    END IF;

    IF p_home_score > p_away_score THEN
        w := m.home_team_id;
    ELSIF p_away_score > p_home_score THEN
        w := m.away_team_id;
    ELSE
        IF m.stage = 'GROUP_STAGE' THEN
            w := NULL;
        ELSE
            IF p_home_penalties IS NULL OR p_away_penalties IS NULL OR p_home_penalties = p_away_penalties THEN
                RAISE EXCEPTION 'EMPATE NO MATA-MATA EXIGE PÊNALTIS COM VENCEDOR.';
            ELSIF p_home_penalties > p_away_penalties THEN
                w := m.home_team_id;
            ELSE
                w := m.away_team_id;
            END IF;
        END IF;
    END IF;

    UPDATE public.ccfv_world_cup_matches
    SET home_score = p_home_score,
        away_score = p_away_score,
        home_penalties = p_home_penalties,
        away_penalties = p_away_penalties,
        winner_team_id = w,
        status = 'VALIDATED',
        notes = p_notes,
        updated_at = now()
    WHERE id = p_match_id;

    SELECT h.participant_id, a.participant_id
    INTO v_home_player, v_away_player
    FROM public.ccfv_world_cup_teams h
    JOIN public.ccfv_world_cup_teams a ON a.id = m.away_team_id
    WHERE h.id = m.home_team_id;

    IF m.stage = 'GROUP_STAGE' THEN
        IF p_home_score > p_away_score THEN
            v_awards := jsonb_build_array(
                jsonb_build_object('player_id',v_home_player,'delta',24,'result','WIN'),
                jsonb_build_object('player_id',v_away_player,'delta',-12,'result','LOSS')
            );
        ELSIF p_home_score < p_away_score THEN
            v_awards := jsonb_build_array(
                jsonb_build_object('player_id',v_home_player,'delta',-12,'result','LOSS'),
                jsonb_build_object('player_id',v_away_player,'delta',24,'result','WIN')
            );
        ELSE
            v_awards := jsonb_build_array(
                jsonb_build_object('player_id',v_home_player,'delta',8,'result','DRAW'),
                jsonb_build_object('player_id',v_away_player,'delta',8,'result','DRAW')
            );
        END IF;
    ELSE
        IF w IS NULL THEN RAISE EXCEPTION 'VENCEDOR NÃO DEFINIDO PARA O MATA-MATA.'; END IF;
        IF w = m.home_team_id THEN
            v_awards := jsonb_build_array(
                jsonb_build_object('player_id',v_home_player,'delta',28,'result','WIN'),
                jsonb_build_object('player_id',v_away_player,'delta',-14,'result','LOSS')
            );
        ELSE
            v_awards := jsonb_build_array(
                jsonb_build_object('player_id',v_home_player,'delta',-14,'result','LOSS'),
                jsonb_build_object('player_id',v_away_player,'delta',28,'result','WIN')
            );
        END IF;
    END IF;

    v_applied := public.ccfv_world_cup_apply_elo(
        m.season_id,
        'MATCH:' || m.id::text,
        m.id,
        v_awards
    );

    INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
    VALUES(
        m.season_id,
        'SET_RESULT',
        jsonb_build_object(
            'match_id',p_match_id,
            'winner_team_id',w,
            'elo_entries_applied',v_applied
        ),
        auth.uid()
    );

    RETURN jsonb_build_object(
        'ok',true,
        'winner_team_id',w,
        'elo_entries_applied',v_applied
    );
END;
$$;

-- Encerramento oficial: só concede bônus no clique manual, de forma idempotente.
-- Mantém o registro do título e a criação automática da próxima temporada.
CREATE OR REPLACE FUNCTION public.ccfv_world_cup_finish_season(p_season_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_season public.ccfv_world_cup_seasons%ROWTYPE;
    v_final public.ccfv_world_cup_matches%ROWTYPE;
    v_winner public.ccfv_world_cup_teams%ROWTYPE;
    v_runner public.ccfv_world_cup_teams%ROWTYPE;
    v_next uuid;
    v_title_id uuid;
    v_awards jsonb;
    v_applied integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

    SELECT * INTO v_season
    FROM public.ccfv_world_cup_seasons
    WHERE id = p_season_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.'; END IF;

    SELECT * INTO v_final
    FROM public.ccfv_world_cup_matches
    WHERE season_id = p_season_id AND stage = 'FINAL'
    ORDER BY match_order DESC
    LIMIT 1;

    IF NOT FOUND OR v_final.status NOT IN ('VALIDATED','WO','ADMIN_DECISION') THEN
        RAISE EXCEPTION 'A FINAL DA COPA AINDA NÃO FOI VALIDADA.';
    END IF;

    IF v_final.winner_team_id IS NULL THEN
        RAISE EXCEPTION 'A FINAL PRECISA TER UM CAMPEÃO.';
    END IF;

    -- Cliques repetidos não recreditam bônus nem recriam títulos.
    IF v_season.status = 'FINISHED' OR v_season.phase = 'FINISHED' THEN
        SELECT id INTO v_next
        FROM public.ccfv_world_cup_seasons
        WHERE season_number = v_season.season_number + 1;
        RETURN jsonb_build_object(
            'ok',true,
            'already_finished',true,
            'champion_team_id',v_final.winner_team_id,
            'next_season_id',v_next
        );
    END IF;

    IF v_season.phase <> 'FINAL' THEN
        RAISE EXCEPTION 'A TEMPORADA PRECISA ESTAR NA FINAL PARA SER ENCERRADA.';
    END IF;

    SELECT * INTO v_winner
    FROM public.ccfv_world_cup_teams
    WHERE id = v_final.winner_team_id;

    SELECT * INTO v_runner
    FROM public.ccfv_world_cup_teams
    WHERE id = CASE
        WHEN v_final.home_team_id = v_winner.id THEN v_final.away_team_id
        ELSE v_final.home_team_id
    END;

    -- Bônus de título separados do Elo dos jogos: campeão +150, vice +75.
    v_awards := jsonb_build_array(
        jsonb_build_object('player_id',v_winner.participant_id,'delta',150,'result','CHAMPION'),
        jsonb_build_object('player_id',v_runner.participant_id,'delta',75,'result','RUNNER_UP')
    );

    v_applied := public.ccfv_world_cup_apply_elo(
        p_season_id,
        'TITLE:' || p_season_id::text,
        v_final.id,
        v_awards
    );

    UPDATE public.ccfv_world_cup_teams
    SET status = CASE
        WHEN id = v_winner.id THEN 'CHAMPION'
        WHEN id = v_runner.id THEN 'ELIMINATED'
        ELSE status
    END,
    updated_at = now()
    WHERE season_id = p_season_id;

    UPDATE public.ccfv_world_cup_seasons
    SET status = 'FINISHED', phase = 'FINISHED', updated_at = now()
    WHERE id = p_season_id;

    v_title_id := NULL;
    IF v_winner.participant_id IS NOT NULL THEN
        INSERT INTO public.ccfv_titles(
            player_id,competition_code,competition_name,season,platform,
            team_name,club_name,club_logo,title,source_id
        )
        SELECT
            v_winner.participant_id,
            'COPA_DO_MUNDO',
            'COPA DO MUNDO',
            v_season.season_label,
            p.platform,
            v_winner.name,
            v_winner.name,
            NULL,
            'CAMPEÃO',
            v_final.id
        FROM public.players p
        WHERE p.id = v_winner.participant_id
        ON CONFLICT (player_id,competition_code,season) DO NOTHING
        RETURNING id INTO v_title_id;

        IF v_title_id IS NOT NULL THEN
            UPDATE public.players
            SET wins = COALESCE(wins,0) + 1,
                titles = COALESCE(titles,0) + 1
            WHERE id = v_winner.participant_id;
        END IF;
    END IF;

    INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
    VALUES(
        p_season_id,
        'FINISH_SEASON',
        jsonb_build_object(
            'champion_team_id',v_winner.id,
            'runner_up_team_id',v_runner.id,
            'elo_entries_applied',v_applied
        ),
        auth.uid()
    );

    SELECT public.ccfv_world_cup_create_next_season(
        v_season.season_number + 1,
        'SEASON ' || lpad((v_season.season_number + 1)::text,2,'0')
    ) INTO v_next;

    RETURN jsonb_build_object(
        'ok',true,
        'champion_team_id',v_winner.id,
        'runner_up_team_id',v_runner.id,
        'next_season_id',v_next,
        'elo_entries_applied',v_applied
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_set_result(uuid,integer,integer,integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_finish_season(uuid) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
