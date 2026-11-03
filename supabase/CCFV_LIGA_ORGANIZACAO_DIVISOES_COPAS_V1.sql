-- ============================================================================
-- CCFV LIGA — ORGANIZAÇÃO ESPORTIVA: DIVISÕES, COPAS E SORTEIOS
-- Etapa 02 | 03/11/2026
--
-- Pré-requisito: CCFV_LIGA_MOTOR_COMPETICO_V1.sql instalado.
-- Este patch NÃO cria temporada, NÃO aprova clubes e NÃO gera o Campeonato
-- CCFV. Ele adiciona a RPC para gerar copas com seleção validada e sorteio
-- aleatório registrado no próprio banco.
--
-- Execute uma vez no Supabase SQL Editor, depois de conferir backup/schema.
-- ============================================================================

BEGIN;

-- 1) PADRONIZA OS NOMES PÚBLICOS DAS COMPETIÇÕES DA LIGA ----------------------
CREATE OR REPLACE FUNCTION public.ccfv_league_set_official_competition_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
    IF NEW.competition_code = 'LEAGUE_A' THEN
        NEW.name := 'Campeonato CCFV — Série Colosseum';
    ELSIF NEW.competition_code = 'LEAGUE_B' THEN
        NEW.name := 'Campeonato CCFV — Série Gladiadores';
    ELSIF NEW.competition_code = 'LEAGUE_C' THEN
        NEW.name := 'Campeonato CCFV — Série Legionários';
    ELSIF NEW.competition_code = 'INTERDIVISIONAL' THEN
        NEW.name := 'Copa Interdivisional CCFV';
    ELSIF NEW.competition_code = 'ELITE' THEN
        NEW.name := 'Copa Elite CCFV';
    ELSIF NEW.competition_code = 'INTEGRACAO' THEN
        NEW.name := 'Copa Integração CCFV';
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ccfv_league_official_competition_name
    ON public.ccfv_league_competitions;

CREATE TRIGGER trg_ccfv_league_official_competition_name
BEFORE INSERT OR UPDATE OF competition_code, name
ON public.ccfv_league_competitions
FOR EACH ROW
EXECUTE FUNCTION public.ccfv_league_set_official_competition_name();

-- Corrige também os nomes de competições já criadas, sem alterar resultados.
UPDATE public.ccfv_league_competitions
SET name = CASE competition_code
    WHEN 'LEAGUE_A' THEN 'Campeonato CCFV — Série Colosseum'
    WHEN 'LEAGUE_B' THEN 'Campeonato CCFV — Série Gladiadores'
    WHEN 'LEAGUE_C' THEN 'Campeonato CCFV — Série Legionários'
    WHEN 'INTERDIVISIONAL' THEN 'Copa Interdivisional CCFV'
    WHEN 'ELITE' THEN 'Copa Elite CCFV'
    WHEN 'INTEGRACAO' THEN 'Copa Integração CCFV'
    ELSE name
END
WHERE competition_code IN ('LEAGUE_A','LEAGUE_B','LEAGUE_C','INTERDIVISIONAL','ELITE','INTEGRACAO');

-- 2) GERA UMA COPA COM PARTICIPANTES VALIDOS E SORTEIO NO BANCO ----------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_generate_cup_draw_v2(
    p_season_id uuid,
    p_cup_code text,
    p_selected_enrollment_ids jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_code text := upper(btrim(coalesce(p_cup_code,'')));
    v_name text;
    v_expected integer;
    v_competition_id uuid;
    v_count integer;
    v_distinct integer;
    v_league_a_id uuid;
    v_played integer;
    v_selected_ids uuid[];
    v_expected_ids uuid[];
    v_home uuid;
    v_away uuid;
    v_i integer;
    v_stage text;
    v_created integer := 0;
    v_draw jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF p_season_id IS NULL THEN
        RAISE EXCEPTION 'Informe a temporada.';
    END IF;
    IF jsonb_typeof(p_selected_enrollment_ids) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Informe a lista de inscrições selecionadas.';
    END IF;
    IF v_code NOT IN ('INTERDIVISIONAL','ELITE','INTEGRACAO') THEN
        RAISE EXCEPTION 'Copa inválida. Utilize INTERDIVISIONAL, ELITE ou INTEGRACAO.';
    END IF;

    PERFORM 1
      FROM public.ccfv_league_seasons s
     WHERE s.id = p_season_id AND s.status = 'ACTIVE'
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'A temporada precisa estar ACTIVE para gerar o sorteio das copas.';
    END IF;

    v_expected := CASE v_code
        WHEN 'INTERDIVISIONAL' THEN 36
        WHEN 'ELITE' THEN 8
        ELSE 24
    END;
    v_name := CASE v_code
        WHEN 'INTERDIVISIONAL' THEN 'Copa Interdivisional CCFV'
        WHEN 'ELITE' THEN 'Copa Elite CCFV'
        ELSE 'Copa Integração CCFV'
    END;

    SELECT count(*)::integer, count(DISTINCT value)::integer
      INTO v_count, v_distinct
      FROM jsonb_array_elements_text(p_selected_enrollment_ids) AS x(value);
    IF v_count <> v_expected OR v_distinct <> v_expected THEN
        RAISE EXCEPTION '% exige exatamente % inscrições diferentes. Recebidas: %, únicas: %.',
            v_code, v_expected, v_count, v_distinct;
    END IF;

    -- Todos os selecionados precisam pertencer à temporada, estar confirmados,
    -- ter clube ativo e ter a divisão compatível com a competição.
    IF EXISTS (
        SELECT 1
          FROM jsonb_array_elements_text(p_selected_enrollment_ids) AS x(value)
          LEFT JOIN public.ccfv_league_season_clubs sc ON sc.id = x.value::uuid
          LEFT JOIN public.ccfv_league_clubs c ON c.id = sc.club_id
         WHERE sc.id IS NULL
            OR sc.season_id <> p_season_id
            OR sc.status <> 'CONFIRMED'
            OR c.id IS NULL
            OR c.status <> 'ACTIVE'
            OR (v_code = 'ELITE' AND sc.division <> 'SERIE_A')
            OR (v_code = 'INTEGRACAO' AND sc.division NOT IN ('SERIE_B','SERIE_C'))
            OR (v_code = 'INTERDIVISIONAL' AND sc.division NOT IN ('SERIE_A','SERIE_B','SERIE_C'))
    ) THEN
        RAISE EXCEPTION 'A seleção contém clube não confirmado, inativo, de outra temporada ou de divisão incompatível.';
    END IF;

    -- Interdivisional precisa incluir os 36 clubes e as três divisões completas.
    IF v_code = 'INTERDIVISIONAL' THEN
        IF (SELECT count(*) FROM public.ccfv_league_season_clubs
             WHERE season_id = p_season_id AND status = 'CONFIRMED'
               AND division IN ('SERIE_A','SERIE_B','SERIE_C')) <> 36 THEN
            RAISE EXCEPTION 'A Copa Interdivisional exige as três divisões completas com 36 clubes confirmados.';
        END IF;
    END IF;

    -- Integração deve reunir exatamente os 24 clubes das duas divisões inferiores.
    IF v_code = 'INTEGRACAO' THEN
        IF (SELECT count(*) FROM public.ccfv_league_season_clubs
             WHERE season_id = p_season_id AND status = 'CONFIRMED'
               AND division IN ('SERIE_B','SERIE_C')) <> 24 THEN
            RAISE EXCEPTION 'A Copa Integração exige 12 clubes confirmados em Gladiadores e 12 em Legionários.';
        END IF;
    END IF;

    -- Copa Elite: os oito selecionados precisam ser exatamente os oito primeiros
    -- da Colosseum após as 22 rodadas (132 partidas concluídas).
    IF v_code = 'ELITE' THEN
        SELECT id INTO v_league_a_id
          FROM public.ccfv_league_competitions
         WHERE season_id = p_season_id
           AND competition_code = 'LEAGUE_A'
           AND competition_type = 'LEAGUE';
        IF v_league_a_id IS NULL THEN
            RAISE EXCEPTION 'Gere primeiro o calendário do Campeonato CCFV — Série Colosseum.';
        END IF;
        SELECT count(*)::integer INTO v_played
          FROM public.ccfv_league_matches
         WHERE competition_id = v_league_a_id
           AND round_number BETWEEN 1 AND 22
           AND status = 'PLAYED';
        IF v_played <> 132 THEN
            RAISE EXCEPTION 'A Copa Elite só pode ser sorteada depois das 132 partidas da Colosseum. Resultados registrados: %.', v_played;
        END IF;

        WITH match_rows AS (
            SELECT m.home_enrollment_id AS enrollment_id,
                   m.home_goals AS gf, m.away_goals AS ga
              FROM public.ccfv_league_matches m
             WHERE m.competition_id = v_league_a_id AND m.status = 'PLAYED'
            UNION ALL
            SELECT m.away_enrollment_id,
                   m.away_goals, m.home_goals
              FROM public.ccfv_league_matches m
             WHERE m.competition_id = v_league_a_id AND m.status = 'PLAYED'
        ), stats AS (
            SELECT enrollment_id,
                   count(*)::integer AS played,
                   count(*) FILTER (WHERE gf > ga)::integer AS wins,
                   count(*) FILTER (WHERE gf = ga)::integer AS draws,
                   count(*) FILTER (WHERE gf < ga)::integer AS losses,
                   coalesce(sum(gf),0)::integer AS gf,
                   coalesce(sum(ga),0)::integer AS ga,
                   coalesce(sum(CASE WHEN gf > ga THEN 3 WHEN gf = ga THEN 1 ELSE 0 END),0)::integer AS points
              FROM match_rows
             GROUP BY enrollment_id
        ), ranked AS (
            SELECT e.season_club_id AS enrollment_id,
                   row_number() OVER (
                       ORDER BY st.points DESC, st.wins DESC,
                                (st.gf - st.ga) DESC, st.gf DESC,
                                sc.snapshot_name ASC
                   )::integer AS position
              FROM public.ccfv_league_competition_entries e
              JOIN public.ccfv_league_season_clubs sc ON sc.id = e.season_club_id
              JOIN stats st ON st.enrollment_id = e.season_club_id
             WHERE e.competition_id = v_league_a_id
        )
        SELECT coalesce(array_agg(enrollment_id ORDER BY enrollment_id), ARRAY[]::uuid[])
          INTO v_expected_ids
          FROM ranked WHERE position <= 8;

        SELECT coalesce(array_agg(value::uuid ORDER BY value::uuid), ARRAY[]::uuid[])
          INTO v_selected_ids
          FROM jsonb_array_elements_text(p_selected_enrollment_ids) AS x(value);

        IF coalesce(array_length(v_expected_ids,1),0) <> 8
           OR v_selected_ids <> v_expected_ids THEN
            RAISE EXCEPTION 'A seleção da Copa Elite precisa corresponder exatamente aos oito primeiros da Colosseum após a 22ª rodada.';
        END IF;
    END IF;

    -- Reutiliza um registro de copa vazio, mas nunca substitui chave ou entradas.
    SELECT id INTO v_competition_id
      FROM public.ccfv_league_competitions
     WHERE season_id = p_season_id AND competition_code = v_code
     FOR UPDATE;

    IF v_competition_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.ccfv_league_competition_entries WHERE competition_id = v_competition_id)
           OR EXISTS (SELECT 1 FROM public.ccfv_league_matches WHERE competition_id = v_competition_id) THEN
            RAISE EXCEPTION 'Esta copa já possui participantes ou partidas. A chave existente não será sobrescrita.';
        END IF;
        UPDATE public.ccfv_league_competitions
           SET name = v_name,
               competition_type = 'CUP',
               division_code = NULL,
               status = 'DRAFT',
               settings = jsonb_build_object(
                   'format','SINGLE_MATCH_KNOCKOUT',
                   'draw','RANDOM_DATABASE',
                   'penalties_on_draw',true,
                   'participants',v_expected
               ),
               updated_at = now()
         WHERE id = v_competition_id;
    ELSE
        INSERT INTO public.ccfv_league_competitions (
            season_id, competition_code, name, competition_type,
            status, created_by_user_id, settings
        ) VALUES (
            p_season_id, v_code, v_name, 'CUP', 'DRAFT', auth.uid(),
            jsonb_build_object(
                'format','SINGLE_MATCH_KNOCKOUT',
                'draw','RANDOM_DATABASE',
                'penalties_on_draw',true,
                'participants',v_expected
            )
        ) RETURNING id INTO v_competition_id;
    END IF;

    -- Ordem aleatória executada no banco; seed_number preserva o resultado do sorteio.
    WITH chosen AS (
        SELECT value::uuid AS enrollment_id
          FROM jsonb_array_elements_text(p_selected_enrollment_ids) AS x(value)
    ), randomized AS (
        SELECT enrollment_id,
               row_number() OVER (ORDER BY random())::smallint AS seed_number
          FROM chosen
    )
    INSERT INTO public.ccfv_league_competition_entries (
        competition_id, season_club_id, seed_number, bracket_seed,
        source_label, metadata
    )
    SELECT v_competition_id, enrollment_id, seed_number, seed_number,
           CASE v_code
             WHEN 'ELITE' THEN 'COLOSSEUM_TOP_8_AFTER_ROUND_22'
             WHEN 'INTEGRACAO' THEN 'GLADIADORES_AND_LEGIONARIOS'
             ELSE 'ALL_THREE_DIVISIONS'
           END,
           jsonb_build_object('draw_method','RANDOM_DATABASE','draw_position',seed_number)
      FROM randomized;

    -- Formatos técnicos V1:
    -- Interdivisional: seeds 29–36 jogam preliminar; 1–28 avançam direto.
    -- Integração: seeds 9–24 jogam preliminar; 1–8 avançam direto.
    -- Elite: quartas de final entre os oito seeds sorteados.
    IF v_code = 'INTERDIVISIONAL' THEN
        FOR v_i IN 1..4 LOOP
            SELECT season_club_id INTO v_home
              FROM public.ccfv_league_competition_entries
             WHERE competition_id = v_competition_id AND seed_number = 28 + v_i;
            SELECT season_club_id INTO v_away
              FROM public.ccfv_league_competition_entries
             WHERE competition_id = v_competition_id AND seed_number = 37 - v_i;
            INSERT INTO public.ccfv_league_matches (
                competition_id, round_number, stage_code, match_number,
                home_enrollment_id, away_enrollment_id, status
            ) VALUES (v_competition_id, 1, 'PRELIM', v_i, v_home, v_away, 'SCHEDULED');
            v_created := v_created + 1;
        END LOOP;
    ELSIF v_code = 'INTEGRACAO' THEN
        FOR v_i IN 1..8 LOOP
            SELECT season_club_id INTO v_home
              FROM public.ccfv_league_competition_entries
             WHERE competition_id = v_competition_id AND seed_number = 8 + v_i;
            SELECT season_club_id INTO v_away
              FROM public.ccfv_league_competition_entries
             WHERE competition_id = v_competition_id AND seed_number = 25 - v_i;
            INSERT INTO public.ccfv_league_matches (
                competition_id, round_number, stage_code, match_number,
                home_enrollment_id, away_enrollment_id, status
            ) VALUES (v_competition_id, 1, 'PRELIM', v_i, v_home, v_away, 'SCHEDULED');
            v_created := v_created + 1;
        END LOOP;
    ELSE
        FOR v_i IN 1..4 LOOP
            SELECT season_club_id INTO v_home
              FROM public.ccfv_league_competition_entries
             WHERE competition_id = v_competition_id AND seed_number = v_i;
            SELECT season_club_id INTO v_away
              FROM public.ccfv_league_competition_entries
             WHERE competition_id = v_competition_id AND seed_number = 9 - v_i;
            INSERT INTO public.ccfv_league_matches (
                competition_id, round_number, stage_code, match_number,
                home_enrollment_id, away_enrollment_id, status
            ) VALUES (v_competition_id, 1, 'QF', v_i, v_home, v_away, 'SCHEDULED');
            v_created := v_created + 1;
        END LOOP;
    END IF;

    UPDATE public.ccfv_league_competitions
       SET status = 'IN_PROGRESS', updated_at = now()
     WHERE id = v_competition_id;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'seed', e.seed_number,
        'enrollment_id', e.season_club_id,
        'club_name', sc.snapshot_name,
        'division', sc.division
    ) ORDER BY e.seed_number), '[]'::jsonb)
      INTO v_draw
      FROM public.ccfv_league_competition_entries e
      JOIN public.ccfv_league_season_clubs sc ON sc.id = e.season_club_id
     WHERE e.competition_id = v_competition_id;

    INSERT INTO public.ccfv_league_audit_logs (
        actor_user_id, season_id, action, entity_type, entity_id,
        old_data, new_data, metadata
    ) VALUES (
        auth.uid(), p_season_id, 'CUP_RANDOM_DRAW_GENERATED', 'COMPETITION', v_competition_id,
        NULL,
        jsonb_build_object('competition_code',v_code,'participants',v_expected,'draw',v_draw),
        jsonb_build_object('source','competition_organization_v1','draw_method','RANDOM_DATABASE','note','Primeira fase gerada pelo módulo de Organização Esportiva.')
    );

    RETURN jsonb_build_object(
        'success',true,
        'competition_id',v_competition_id,
        'competition_code',v_code,
        'participants',v_expected,
        'first_round_matches',v_created,
        'draw',v_draw
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.ccfv_league_admin_generate_cup_draw_v2(uuid,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ccfv_league_admin_generate_cup_draw_v2(uuid,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.ccfv_league_admin_generate_cup_draw_v2(uuid,text,jsonb) TO authenticated;

COMMIT;

-- VERIFICAÇÃO SOMENTE LEITURA -------------------------------------------------
SELECT p.proname AS funcao,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'ccfv_league_admin_generate_cup_draw_v2',
      'ccfv_league_set_official_competition_name'
  )
ORDER BY p.proname;

SELECT competition_code, name, status
FROM public.ccfv_league_competitions
ORDER BY created_at DESC;
