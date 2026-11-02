-- ============================================================================
-- CCFV LIGA — MOTOR COMPETITIVO V1
-- Independente das tabelas e competições antigas da CCFV.
-- Cria temporadas administrativas V2, aprovações, distribuição de divisões,
-- calendário de 22 rodadas, três copas, resultados, pênaltis e classificação.
-- Execute uma vez no Supabase SQL Editor. O script é idempotente.
-- ============================================================================

BEGIN;

-- 1) ESTRUTURAS NOVAS E ISOLADAS ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.ccfv_league_competitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL REFERENCES public.ccfv_league_seasons(id) ON DELETE RESTRICT,
    competition_code text NOT NULL,
    name text NOT NULL,
    competition_type text NOT NULL CHECK (competition_type IN ('LEAGUE','CUP')),
    division_code text,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','READY','IN_PROGRESS','COMPLETED','CANCELLED')),
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ccv_league_competition_code_unique UNIQUE (season_id, competition_code)
);

CREATE TABLE IF NOT EXISTS public.ccfv_league_competition_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid NOT NULL REFERENCES public.ccfv_league_competitions(id) ON DELETE CASCADE,
    season_club_id uuid NOT NULL REFERENCES public.ccfv_league_season_clubs(id) ON DELETE RESTRICT,
    seed_number smallint NOT NULL,
    bracket_seed smallint,
    final_position smallint,
    movement text CHECK (movement IS NULL OR movement IN ('PROMOTED','RELEGATED','STAYED')),
    source_label text NOT NULL DEFAULT 'SEASON_REGISTRATION',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ccv_league_entries_club_unique UNIQUE (competition_id, season_club_id),
    CONSTRAINT ccv_league_entries_seed_unique UNIQUE (competition_id, seed_number)
);

CREATE TABLE IF NOT EXISTS public.ccfv_league_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid NOT NULL REFERENCES public.ccfv_league_competitions(id) ON DELETE CASCADE,
    round_number smallint NOT NULL,
    stage_code text NOT NULL,
    match_number smallint NOT NULL,
    home_enrollment_id uuid NOT NULL REFERENCES public.ccfv_league_season_clubs(id) ON DELETE RESTRICT,
    away_enrollment_id uuid NOT NULL REFERENCES public.ccfv_league_season_clubs(id) ON DELETE RESTRICT,
    home_goals smallint,
    away_goals smallint,
    home_penalties smallint,
    away_penalties smallint,
    winner_enrollment_id uuid REFERENCES public.ccfv_league_season_clubs(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED','PLAYED','CANCELLED')),
    scheduled_at timestamptz,
    result_note text,
    result_recorded_by uuid,
    result_recorded_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ccv_league_match_number_unique UNIQUE (competition_id, round_number, match_number),
    CONSTRAINT ccv_league_match_teams_differ CHECK (home_enrollment_id <> away_enrollment_id),
    CONSTRAINT ccv_league_match_scores_nonnegative CHECK (
        (home_goals IS NULL OR home_goals >= 0) AND
        (away_goals IS NULL OR away_goals >= 0) AND
        (home_penalties IS NULL OR home_penalties >= 0) AND
        (away_penalties IS NULL OR away_penalties >= 0)
    )
);

ALTER TABLE public.ccfv_league_competition_entries ADD COLUMN IF NOT EXISTS final_position smallint;
ALTER TABLE public.ccfv_league_competition_entries ADD COLUMN IF NOT EXISTS movement text;

CREATE INDEX IF NOT EXISTS ccv_league_competitions_season_idx
    ON public.ccfv_league_competitions(season_id, competition_type, competition_code);
CREATE INDEX IF NOT EXISTS ccv_league_entries_competition_idx
    ON public.ccfv_league_competition_entries(competition_id, seed_number);
CREATE INDEX IF NOT EXISTS ccv_league_matches_competition_round_idx
    ON public.ccfv_league_matches(competition_id, round_number, match_number);
CREATE INDEX IF NOT EXISTS ccv_league_matches_home_idx
    ON public.ccfv_league_matches(home_enrollment_id);
CREATE INDEX IF NOT EXISTS ccv_league_matches_away_idx
    ON public.ccfv_league_matches(away_enrollment_id);

ALTER TABLE public.ccfv_league_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccfv_league_competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ccfv_league_matches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ccfv_league_competitions FROM anon, authenticated;
REVOKE ALL ON public.ccfv_league_competition_entries FROM anon, authenticated;
REVOKE ALL ON public.ccfv_league_matches FROM anon, authenticated;

-- 2) CRIAÇÃO E CICLO DE VIDA DA TEMPORADA ------------------------------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_create_season_v2(
    p_season_code text,
    p_name text,
    p_starts_on date,
    p_ends_on date,
    p_is_test boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_season public.ccfv_league_seasons%ROWTYPE;
    v_code text := upper(btrim(coalesce(p_season_code,'')));
    v_name text := btrim(coalesce(p_name,''));
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,39}$' THEN
        RAISE EXCEPTION 'Código inválido. Use de 3 a 40 caracteres: letras, números, hífen ou sublinhado.';
    END IF;
    IF length(v_name) NOT BETWEEN 3 AND 100 THEN
        RAISE EXCEPTION 'O nome da temporada deve ter entre 3 e 100 caracteres.';
    END IF;
    IF p_starts_on IS NULL OR p_ends_on IS NULL OR p_ends_on < p_starts_on THEN
        RAISE EXCEPTION 'Informe um período válido para a temporada.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.ccfv_league_seasons s WHERE upper(s.season_code) = v_code) THEN
        RAISE EXCEPTION 'Já existe uma temporada com esse código.';
    END IF;

    INSERT INTO public.ccfv_league_seasons (
        season_code, name, starts_on, ends_on, status, is_test,
        is_public, monthly_fee, max_clubs, created_by_user_id
    ) VALUES (
        v_code, v_name, p_starts_on, p_ends_on, 'DRAFT', coalesce(p_is_test,false),
        false, CASE WHEN coalesce(p_is_test,false) THEN 0 ELSE 15 END,
        36, auth.uid()
    ) RETURNING * INTO v_season;

    INSERT INTO public.ccfv_league_audit_logs (
        actor_user_id, season_id, action, entity_type, entity_id,
        old_data, new_data, metadata
    ) VALUES (
        auth.uid(), v_season.id, 'SEASON_CREATED', 'SEASON', v_season.id,
        NULL, to_jsonb(v_season),
        jsonb_build_object('source','competition_engine_v2','test_season',v_season.is_test)
    );

    RETURN jsonb_build_object('success',true,'season_id',v_season.id,
        'season_code',v_season.season_code,'status',v_season.status,
        'monthly_fee',v_season.monthly_fee,'max_clubs',v_season.max_clubs);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ccfv_league_admin_change_season_status_v2(
    p_season_id uuid, p_new_status text, p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_season public.ccfv_league_seasons%ROWTYPE;
    v_old jsonb;
    v_new text := upper(btrim(coalesce(p_new_status,'')));
    v_total integer;
    v_a integer; v_b integer; v_c integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF p_season_id IS NULL THEN RAISE EXCEPTION 'Informe a temporada.'; END IF;
    IF p_note IS NOT NULL AND length(p_note) > 500 THEN RAISE EXCEPTION 'A observação deve ter até 500 caracteres.'; END IF;
    SELECT * INTO v_season FROM public.ccfv_league_seasons WHERE id=p_season_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Temporada não encontrada.'; END IF;
    v_old := to_jsonb(v_season);

    IF v_season.status='DRAFT' AND v_new='REGISTRATION' THEN
        NULL;
    ELSIF v_season.status='REGISTRATION' AND v_new='ACTIVE' THEN
        SELECT count(*)::integer,
               count(*) FILTER (WHERE division='SERIE_A')::integer,
               count(*) FILTER (WHERE division='SERIE_B')::integer,
               count(*) FILTER (WHERE division='SERIE_C')::integer
          INTO v_total,v_a,v_b,v_c
          FROM public.ccfv_league_season_clubs
         WHERE season_id=p_season_id AND status='CONFIRMED';
        IF v_total <> 36 OR v_a <> 12 OR v_b <> 12 OR v_c <> 12 THEN
            RAISE EXCEPTION 'Para iniciar a temporada são necessários 36 clubes confirmados e distribuídos: 12 em cada série. Atual: total %, A %, B %, C %.', v_total,v_a,v_b,v_c;
        END IF;
    ELSIF v_season.status='ACTIVE' AND v_new='CLOSED' THEN
        RAISE EXCEPTION 'Use a finalização oficial da temporada para calcular posições, acessos e rebaixamentos.';
    ELSIF v_season.status='CLOSED' AND v_new='ARCHIVED' THEN
        NULL;
    ELSIF v_season.status='REGISTRATION' AND v_new='CANCELLED' THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Transição não permitida: % → %.',v_season.status,v_new;
    END IF;

    UPDATE public.ccfv_league_seasons SET status=v_new, updated_at=now()
     WHERE id=p_season_id RETURNING * INTO v_season;
    INSERT INTO public.ccfv_league_audit_logs (
        actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata
    ) VALUES (
        auth.uid(),p_season_id,'SEASON_STATUS_CHANGED','SEASON',p_season_id,
        v_old,to_jsonb(v_season),jsonb_build_object('source','competition_engine_v2','note',nullif(btrim(p_note),''))
    );
    RETURN jsonb_build_object('success',true,'season_id',p_season_id,'status',v_season.status);
END;
$function$;

-- 3) APROVAÇÃO DE INSCRIÇÕES E DISTRIBUIÇÃO DAS TRÊS SÉRIES -------------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_list_season_clubs_v2(
    p_season_id uuid, p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_items jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF p_season_id IS NULL THEN RAISE EXCEPTION 'Informe a temporada.'; END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',sc.id,'enrollment_id',sc.id,'season_id',sc.season_id,'club_id',sc.club_id,
        'club_name',sc.snapshot_name,'short_name',sc.snapshot_short_name,'slug',sc.snapshot_slug,
        'crest_url',sc.snapshot_crest_url,'banner_url',sc.snapshot_banner_url,
        'primary_color',sc.snapshot_primary_color,'secondary_color',sc.snapshot_secondary_color,
        'accent_color',sc.snapshot_accent_color,'status',sc.status,'division',sc.division,
        'qualifier_position',sc.qualifier_position,'final_position',sc.final_position,
        'created_at',sc.created_at,'owner_player_id',c.owner_player_id,
        'club_status',c.status,'city',sc.snapshot_city
    ) ORDER BY sc.qualifier_position NULLS LAST, sc.created_at, sc.id),'[]'::jsonb)
      INTO v_items
      FROM public.ccfv_league_season_clubs sc
      JOIN public.ccfv_league_clubs c ON c.id=sc.club_id
     WHERE sc.season_id=p_season_id
       AND (p_status IS NULL OR sc.status=upper(btrim(p_status)));
    RETURN jsonb_build_object('success',true,'items',v_items,'total',jsonb_array_length(v_items));
END;
$function$;

CREATE OR REPLACE FUNCTION public.ccfv_league_admin_decide_season_club_v2(
    p_enrollment_id uuid, p_decision text, p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_row public.ccfv_league_season_clubs%ROWTYPE;
    v_club public.ccfv_league_clubs%ROWTYPE;
    v_player_status text;
    v_old jsonb;
    v_decision text := upper(btrim(coalesce(p_decision,'')));
    v_new_status text;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF p_enrollment_id IS NULL THEN RAISE EXCEPTION 'Informe a inscrição.'; END IF;
    IF v_decision NOT IN ('APPROVE','REJECT') THEN RAISE EXCEPTION 'Decisão inválida. Utilize APPROVE ou REJECT.'; END IF;
    IF p_note IS NOT NULL AND length(p_note)>500 THEN RAISE EXCEPTION 'A justificativa deve ter até 500 caracteres.'; END IF;

    SELECT * INTO v_row FROM public.ccfv_league_season_clubs WHERE id=p_enrollment_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inscrição não encontrada.'; END IF;
    IF v_row.status <> 'PENDING' THEN RAISE EXCEPTION 'Somente inscrições pendentes podem ser avaliadas.'; END IF;
    SELECT * INTO v_club FROM public.ccfv_league_clubs WHERE id=v_row.club_id FOR UPDATE;
    IF NOT FOUND OR v_club.status <> 'ACTIVE' THEN RAISE EXCEPTION 'O clube precisa estar aprovado e ativo.'; END IF;

    IF v_decision='APPROVE' THEN
        SELECT p.status INTO v_player_status
          FROM public.players p WHERE p.id=v_club.owner_player_id;
        IF NOT FOUND OR upper(btrim(coalesce(v_player_status,''))) <> 'ACTIVE' THEN
            RAISE EXCEPTION 'O responsável precisa possuir cadastro CCFV ativo.';
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.ccfv_league_season_clubs other
             JOIN public.ccfv_league_clubs oc ON oc.id=other.club_id
            WHERE other.season_id=v_row.season_id
              AND oc.owner_player_id=v_club.owner_player_id
              AND other.id<>v_row.id
              AND other.status IN ('CONFIRMED','COMPLETED')
        ) THEN RAISE EXCEPTION 'Este jogador já possui outro clube confirmado nesta temporada.'; END IF;
        v_new_status := 'CONFIRMED';
    ELSE
        v_new_status := 'WITHDRAWN';
    END IF;
    v_old := to_jsonb(v_row);
    UPDATE public.ccfv_league_season_clubs
       SET status=v_new_status,
           snapshot_name=v_club.name,
           snapshot_short_name=v_club.short_name,
           snapshot_slug=v_club.slug,
           snapshot_crest_url=v_club.crest_url,
           snapshot_banner_url=v_club.banner_url,
           snapshot_primary_color=v_club.primary_color,
           snapshot_secondary_color=v_club.secondary_color,
           snapshot_accent_color=v_club.accent_color,
           snapshot_motto=v_club.motto,
           snapshot_description=v_club.description,
           snapshot_city=v_club.city,
           updated_at=now()
     WHERE id=v_row.id RETURNING * INTO v_row;
    INSERT INTO public.ccfv_league_audit_logs (
        actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata
    ) VALUES (
        auth.uid(),v_row.season_id,
        CASE WHEN v_decision='APPROVE' THEN 'SEASON_CLUB_APPROVED' ELSE 'SEASON_CLUB_REJECTED' END,
        'SEASON_CLUB',v_row.id,v_old,to_jsonb(v_row),
        jsonb_build_object('source','competition_engine_v2','note',nullif(btrim(p_note),''))
    );
    RETURN jsonb_build_object('success',true,'enrollment_id',v_row.id,'status',v_row.status,'decision',v_decision);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ccfv_league_admin_assign_divisions_v2(
    p_season_id uuid, p_ranked_enrollment_ids jsonb, p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_count integer;
    v_distinct integer;
    v_a integer; v_b integer; v_c integer;
    v_old jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF p_season_id IS NULL OR jsonb_typeof(p_ranked_enrollment_ids) <> 'array' THEN
        RAISE EXCEPTION 'Informe a temporada e uma lista JSON de inscrições ordenadas.';
    END IF;
    IF jsonb_array_length(p_ranked_enrollment_ids) <> 36 THEN
        RAISE EXCEPTION 'A distribuição exige exatamente 36 inscrições ordenadas.';
    END IF;
    IF p_note IS NOT NULL AND length(p_note)>500 THEN RAISE EXCEPTION 'A observação deve ter até 500 caracteres.'; END IF;
    PERFORM 1 FROM public.ccfv_league_seasons WHERE id=p_season_id AND status='REGISTRATION' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A temporada precisa estar com inscrições abertas para distribuir as divisões.'; END IF;

    SELECT count(*),count(DISTINCT value)
      INTO v_count,v_distinct
      FROM jsonb_array_elements_text(p_ranked_enrollment_ids) AS x(value);
    IF v_count<>36 OR v_distinct<>36 THEN RAISE EXCEPTION 'A lista precisa conter 36 IDs diferentes.'; END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(p_ranked_enrollment_ids) x(value)
        LEFT JOIN public.ccfv_league_season_clubs sc ON sc.id=x.value::uuid
        WHERE sc.id IS NULL OR sc.season_id<>p_season_id OR sc.status<>'CONFIRMED'
    ) THEN RAISE EXCEPTION 'A lista contém inscrição inexistente, de outra temporada ou não confirmada.'; END IF;

    SELECT coalesce(jsonb_agg(to_jsonb(sc) ORDER BY sc.qualifier_position NULLS LAST,sc.created_at),'[]'::jsonb)
      INTO v_old FROM public.ccfv_league_season_clubs sc
     WHERE sc.season_id=p_season_id AND sc.status='CONFIRMED';

    -- Limpa posições antes de reordenar para não colidir com índices UNIQUE existentes.
    UPDATE public.ccfv_league_season_clubs sc
       SET qualifier_position=NULL, updated_at=now()
     WHERE sc.season_id=p_season_id AND sc.status='CONFIRMED';

    WITH ranked AS (
        SELECT value::uuid AS enrollment_id, ordinality::integer AS pos
          FROM jsonb_array_elements_text(p_ranked_enrollment_ids) WITH ORDINALITY AS x(value,ordinality)
    )
    UPDATE public.ccfv_league_season_clubs sc
       SET qualifier_position=r.pos,
           division=CASE
               WHEN r.pos<=12 THEN 'SERIE_A'
               WHEN r.pos<=24 THEN 'SERIE_B'
               ELSE 'SERIE_C'
           END,
           updated_at=now()
      FROM ranked r WHERE sc.id=r.enrollment_id;

    SELECT count(*) FILTER (WHERE division='SERIE_A')::integer,
           count(*) FILTER (WHERE division='SERIE_B')::integer,
           count(*) FILTER (WHERE division='SERIE_C')::integer
      INTO v_a,v_b,v_c
      FROM public.ccfv_league_season_clubs
     WHERE season_id=p_season_id AND status='CONFIRMED';
    IF v_a<>12 OR v_b<>12 OR v_c<>12 THEN RAISE EXCEPTION 'A validação final da distribuição falhou.'; END IF;

    INSERT INTO public.ccfv_league_audit_logs (
        actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata
    ) VALUES (
        auth.uid(),p_season_id,'SEASON_DIVISIONS_ASSIGNED','SEASON',p_season_id,
        v_old,
        (SELECT jsonb_agg(jsonb_build_object('id',id,'division',division,'qualifier_position',qualifier_position)
            ORDER BY qualifier_position) FROM public.ccfv_league_season_clubs WHERE season_id=p_season_id AND status='CONFIRMED'),
        jsonb_build_object('source','competition_engine_v2','note',nullif(btrim(p_note),''))
    );
    RETURN jsonb_build_object('success',true,'season_id',p_season_id,'serie_a',v_a,'serie_b',v_b,'serie_c',v_c);
END;
$function$;



-- 3B) FINALIZAÇÃO, POSIÇÕES FINAIS E ACESSO / REBAIXAMENTO --------------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_finalize_season_v2(
    p_season_id uuid, p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_season public.ccfv_league_seasons%ROWTYPE;
    v_comp_count integer;
    v_match_count integer;
    v_played_count integer;
    v_open_cups integer;
    v_cup_count integer;
    v_old jsonb;
    v_movements jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF p_note IS NOT NULL AND length(p_note)>500 THEN RAISE EXCEPTION 'A observação deve ter até 500 caracteres.'; END IF;
    SELECT * INTO v_season FROM public.ccfv_league_seasons WHERE id=p_season_id FOR UPDATE;
    IF NOT FOUND OR v_season.status<>'ACTIVE' THEN
        RAISE EXCEPTION 'Somente uma temporada ACTIVE pode ser finalizada.';
    END IF;
    SELECT count(*)::integer INTO v_comp_count
      FROM public.ccfv_league_competitions
     WHERE season_id=p_season_id AND competition_type='LEAGUE';
    SELECT count(*)::integer,count(*) FILTER (WHERE m.status='PLAYED')::integer
      INTO v_match_count,v_played_count
      FROM public.ccfv_league_matches m
      JOIN public.ccfv_league_competitions c ON c.id=m.competition_id
     WHERE c.season_id=p_season_id AND c.competition_type='LEAGUE';
    IF v_comp_count<>3 OR v_match_count<>396 OR v_played_count<>396 THEN
        RAISE EXCEPTION 'A temporada exige as três séries e os 396 resultados registrados. Competições: %, partidas: %, resultados: %.',v_comp_count,v_match_count,v_played_count;
    END IF;
    SELECT count(*)::integer,count(*) FILTER (WHERE status<>'COMPLETED')::integer
      INTO v_cup_count,v_open_cups
      FROM public.ccfv_league_competitions
     WHERE season_id=p_season_id AND competition_type='CUP';
    IF v_cup_count<>3 OR v_open_cups>0 THEN
        RAISE EXCEPTION 'Para finalizar, gere e conclua as três copas. Copas geradas: %, ainda abertas: %.',v_cup_count,v_open_cups;
    END IF;

    v_old:=to_jsonb(v_season);
    WITH match_rows AS (
        SELECT m.competition_id,m.home_enrollment_id AS enrollment_id,m.home_goals AS gf,m.away_goals AS ga
          FROM public.ccfv_league_matches m
          JOIN public.ccfv_league_competitions c ON c.id=m.competition_id
         WHERE c.season_id=p_season_id AND c.competition_type='LEAGUE' AND m.status='PLAYED'
        UNION ALL
        SELECT m.competition_id,m.away_enrollment_id,m.away_goals,m.home_goals
          FROM public.ccfv_league_matches m
          JOIN public.ccfv_league_competitions c ON c.id=m.competition_id
         WHERE c.season_id=p_season_id AND c.competition_type='LEAGUE' AND m.status='PLAYED'
    ), stats AS (
        SELECT competition_id,enrollment_id,
               count(*)::integer AS played,
               count(*) FILTER (WHERE gf>ga)::integer AS wins,
               coalesce(sum(gf),0)::integer AS gf,
               coalesce(sum(ga),0)::integer AS ga,
               coalesce(sum(CASE WHEN gf>ga THEN 3 WHEN gf=ga THEN 1 ELSE 0 END),0)::integer AS points
          FROM match_rows GROUP BY competition_id,enrollment_id
    ), ranked AS (
        SELECT e.id AS entry_id,e.season_club_id,c.division_code,
               row_number() OVER (PARTITION BY c.id ORDER BY s.points DESC,s.wins DESC,(s.gf-s.ga) DESC,s.gf DESC,sc.snapshot_name ASC)::smallint AS final_pos
          FROM public.ccfv_league_competition_entries e
          JOIN public.ccfv_league_competitions c ON c.id=e.competition_id
          JOIN public.ccfv_league_season_clubs sc ON sc.id=e.season_club_id
          JOIN stats s ON s.competition_id=e.competition_id AND s.enrollment_id=e.season_club_id
         WHERE c.season_id=p_season_id AND c.competition_type='LEAGUE'
    )
    UPDATE public.ccfv_league_competition_entries e
       SET final_position=r.final_pos,
           movement=CASE
             WHEN r.division_code IN ('SERIE_B','SERIE_C') AND r.final_pos<=3 THEN 'PROMOTED'
             WHEN r.division_code IN ('SERIE_A','SERIE_B') AND r.final_pos>=10 THEN 'RELEGATED'
             ELSE 'STAYED'
           END
      FROM ranked r WHERE e.id=r.entry_id;

    UPDATE public.ccfv_league_season_clubs sc
       SET final_position=e.final_position,updated_at=now()
      FROM public.ccfv_league_competition_entries e
      JOIN public.ccfv_league_competitions c ON c.id=e.competition_id
     WHERE e.season_club_id=sc.id AND c.season_id=p_season_id AND c.competition_type='LEAGUE';

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'division',c.division_code,'club',sc.snapshot_name,
        'final_position',e.final_position,'movement',e.movement
    ) ORDER BY c.division_code,e.final_position),'[]'::jsonb)
      INTO v_movements
      FROM public.ccfv_league_competition_entries e
      JOIN public.ccfv_league_competitions c ON c.id=e.competition_id
      JOIN public.ccfv_league_season_clubs sc ON sc.id=e.season_club_id
     WHERE c.season_id=p_season_id AND c.competition_type='LEAGUE';

    UPDATE public.ccfv_league_seasons SET status='CLOSED',updated_at=now()
     WHERE id=p_season_id RETURNING * INTO v_season;
    INSERT INTO public.ccfv_league_audit_logs (
        actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata
    ) VALUES (
        auth.uid(),p_season_id,'SEASON_FINALIZED','SEASON',p_season_id,
        v_old,to_jsonb(v_season),
        jsonb_build_object('source','competition_engine_v2','note',nullif(btrim(p_note),''),'movements',v_movements)
    );
    RETURN jsonb_build_object('success',true,'season_id',p_season_id,'status','CLOSED','movements',v_movements);
END;
$function$;

-- 4) GERAÇÃO DO CAMPEONATO — 3 DIVISÕES, 22 RODADAS, 396 JOGOS ---------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_generate_league_schedule_v2(
    p_season_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_season public.ccfv_league_seasons%ROWTYPE;
    v_division text;
    v_code text;
    v_name text;
    v_ids uuid[];
    v_rotation uuid[];
    v_competition_id uuid;
    v_round integer;
    v_match integer;
    v_home uuid;
    v_away uuid;
    v_created integer:=0;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    SELECT * INTO v_season FROM public.ccfv_league_seasons WHERE id=p_season_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Temporada não encontrada.'; END IF;
    IF v_season.status <> 'ACTIVE' THEN RAISE EXCEPTION 'A temporada precisa estar ACTIVE para gerar o calendário.'; END IF;

    FOREACH v_division IN ARRAY ARRAY['SERIE_A','SERIE_B','SERIE_C'] LOOP
        SELECT array_agg(sc.id ORDER BY sc.qualifier_position NULLS LAST,sc.created_at,sc.id)
          INTO v_ids
          FROM public.ccfv_league_season_clubs sc
          JOIN public.ccfv_league_clubs c ON c.id=sc.club_id
         WHERE sc.season_id=p_season_id AND sc.status='CONFIRMED'
           AND sc.division=v_division AND c.status='ACTIVE';
        IF coalesce(array_length(v_ids,1),0)<>12 THEN
            RAISE EXCEPTION '% precisa ter exatamente 12 clubes confirmados e ativos. Encontrados: %.',v_division,coalesce(array_length(v_ids,1),0);
        END IF;
        v_code := CASE v_division WHEN 'SERIE_A' THEN 'LEAGUE_A' WHEN 'SERIE_B' THEN 'LEAGUE_B' ELSE 'LEAGUE_C' END;
        v_name := CASE v_division WHEN 'SERIE_A' THEN 'Brasileirão CCFV — Série A' WHEN 'SERIE_B' THEN 'Brasileirão CCFV — Série B' ELSE 'Brasileirão CCFV — Série C' END;
        INSERT INTO public.ccfv_league_competitions (
            season_id,competition_code,name,competition_type,division_code,status,created_by_user_id,
            settings
        ) VALUES (
            p_season_id,v_code,v_name,'LEAGUE',v_division,'DRAFT',auth.uid(),
            jsonb_build_object('rounds',22,'clubs',12,'points_win',3,'points_draw',1,'points_loss',0,'home_away',true)
        ) ON CONFLICT (season_id,competition_code) DO UPDATE SET updated_at=now()
        RETURNING id INTO v_competition_id;

        IF EXISTS (SELECT 1 FROM public.ccfv_league_matches WHERE competition_id=v_competition_id) THEN
            RAISE EXCEPTION 'O calendário de % já foi gerado. Nenhum jogo foi duplicado.',v_division;
        END IF;
        INSERT INTO public.ccfv_league_competition_entries (competition_id,season_club_id,seed_number,bracket_seed)
        SELECT v_competition_id,sc.id,
               array_position(v_ids,sc.id)::smallint,
               array_position(v_ids,sc.id)::smallint
          FROM public.ccfv_league_season_clubs sc
         WHERE sc.id=ANY(v_ids)
        ON CONFLICT (competition_id,season_club_id) DO NOTHING;

        v_rotation := v_ids;
        FOR v_round IN 1..11 LOOP
            FOR v_match IN 1..6 LOOP
                v_home := v_rotation[v_match];
                v_away := v_rotation[13-v_match];
                IF mod(v_round+v_match,2)=1 THEN
                    v_home := v_rotation[13-v_match];
                    v_away := v_rotation[v_match];
                END IF;
                INSERT INTO public.ccfv_league_matches (
                    competition_id,round_number,stage_code,match_number,
                    home_enrollment_id,away_enrollment_id,status
                ) VALUES (
                    v_competition_id,v_round,'LEAGUE',v_match,v_home,v_away,'SCHEDULED'
                );
            END LOOP;
            v_rotation := ARRAY[v_rotation[1],v_rotation[12]] || v_rotation[2:11];
        END LOOP;
        INSERT INTO public.ccfv_league_matches (
            competition_id,round_number,stage_code,match_number,
            home_enrollment_id,away_enrollment_id,status
        )
        SELECT competition_id,(round_number+11)::smallint,'LEAGUE',match_number,
               away_enrollment_id,home_enrollment_id,'SCHEDULED'
          FROM public.ccfv_league_matches
         WHERE competition_id=v_competition_id AND round_number BETWEEN 1 AND 11;

        UPDATE public.ccfv_league_competitions SET status='READY',updated_at=now()
         WHERE id=v_competition_id;
        v_created := v_created + 132;
    END LOOP;

    INSERT INTO public.ccfv_league_audit_logs (
        actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata
    ) VALUES (
        auth.uid(),p_season_id,'LEAGUE_SCHEDULE_GENERATED','SEASON',p_season_id,
        NULL,jsonb_build_object('matches',v_created,'rounds_per_division',22,'divisions',3),
        jsonb_build_object('source','competition_engine_v2')
    );
    RETURN jsonb_build_object('success',true,'season_id',p_season_id,'matches_created',v_created,
        'competitions',jsonb_build_array('LEAGUE_A','LEAGUE_B','LEAGUE_C'));
END;
$function$;

-- 5) GERAÇÃO DAS COPAS --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_generate_cup_v2(
    p_season_id uuid, p_cup_code text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_code text := upper(btrim(coalesce(p_cup_code,'')));
    v_name text;
    v_competition_id uuid;
    v_count integer;
    v_i integer;
    v_home uuid;
    v_away uuid;
    v_a_comp uuid;
    v_round11_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN
        RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.ccfv_league_seasons WHERE id=p_season_id AND status='ACTIVE') THEN
        RAISE EXCEPTION 'A temporada precisa estar ACTIVE para gerar copas.';
    END IF;
    IF v_code NOT IN ('INTERDIVISIONAL','ELITE','INTEGRACAO') THEN
        RAISE EXCEPTION 'Copa inválida. Utilize INTERDIVISIONAL, ELITE ou INTEGRACAO.';
    END IF;
    v_name := CASE v_code WHEN 'INTERDIVISIONAL' THEN 'Copa Interdivisional CCFV' WHEN 'ELITE' THEN 'Copa Elite CCFV' ELSE 'Copa Integração CCFV' END;

    INSERT INTO public.ccfv_league_competitions (
        season_id,competition_code,name,competition_type,status,created_by_user_id,settings
    ) VALUES (
        p_season_id,v_code,v_name,'CUP','DRAFT',auth.uid(),
        jsonb_build_object('format','SINGLE_MATCH_KNOCKOUT','penalties_on_draw',true)
    ) ON CONFLICT (season_id,competition_code) DO UPDATE SET updated_at=now()
    RETURNING id INTO v_competition_id;
    IF EXISTS (SELECT 1 FROM public.ccfv_league_matches WHERE competition_id=v_competition_id)
       OR EXISTS (SELECT 1 FROM public.ccfv_league_competition_entries WHERE competition_id=v_competition_id) THEN
        RAISE EXCEPTION 'Esta copa já possui participantes ou partidas. A geração duplicada foi bloqueada.';
    END IF;

    IF v_code='INTERDIVISIONAL' THEN
        SELECT count(*)::integer INTO v_count
          FROM public.ccfv_league_season_clubs sc JOIN public.ccfv_league_clubs c ON c.id=sc.club_id
         WHERE sc.season_id=p_season_id AND sc.status='CONFIRMED' AND c.status='ACTIVE'
           AND sc.division IN ('SERIE_A','SERIE_B','SERIE_C');
        IF v_count<>36 THEN RAISE EXCEPTION 'A Copa Interdivisional exige 36 clubes confirmados e ativos; encontrados %.',v_count; END IF;
        INSERT INTO public.ccfv_league_competition_entries (competition_id,season_club_id,seed_number,source_label)
        SELECT v_competition_id,sc.id,
               row_number() OVER (ORDER BY CASE sc.division WHEN 'SERIE_A' THEN 1 WHEN 'SERIE_B' THEN 2 ELSE 3 END,
                                          sc.qualifier_position NULLS LAST,sc.created_at,sc.id)::smallint,
               'ALL_DIVISIONS'
          FROM public.ccfv_league_season_clubs sc JOIN public.ccfv_league_clubs c ON c.id=sc.club_id
         WHERE sc.season_id=p_season_id AND sc.status='CONFIRMED' AND c.status='ACTIVE'
           AND sc.division IN ('SERIE_A','SERIE_B','SERIE_C');
        FOR v_i IN 1..4 LOOP
            SELECT season_club_id INTO v_home FROM public.ccfv_league_competition_entries WHERE competition_id=v_competition_id AND seed_number=28+v_i;
            SELECT season_club_id INTO v_away FROM public.ccfv_league_competition_entries WHERE competition_id=v_competition_id AND seed_number=37-v_i;
            INSERT INTO public.ccfv_league_matches (competition_id,round_number,stage_code,match_number,home_enrollment_id,away_enrollment_id)
            VALUES (v_competition_id,1,'PRELIM',v_i,v_home,v_away);
        END LOOP;

    ELSIF v_code='INTEGRACAO' THEN
        SELECT count(*)::integer INTO v_count
          FROM public.ccfv_league_season_clubs sc JOIN public.ccfv_league_clubs c ON c.id=sc.club_id
         WHERE sc.season_id=p_season_id AND sc.status='CONFIRMED' AND c.status='ACTIVE'
           AND sc.division IN ('SERIE_B','SERIE_C');
        IF v_count<>24 THEN RAISE EXCEPTION 'A Copa Integração exige 24 clubes confirmados das Séries B e C; encontrados %.',v_count; END IF;
        INSERT INTO public.ccfv_league_competition_entries (competition_id,season_club_id,seed_number,source_label)
        SELECT v_competition_id,sc.id,
               row_number() OVER (ORDER BY CASE sc.division WHEN 'SERIE_B' THEN 1 ELSE 2 END,
                                          sc.qualifier_position NULLS LAST,sc.created_at,sc.id)::smallint,
               'SERIES_B_AND_C'
          FROM public.ccfv_league_season_clubs sc JOIN public.ccfv_league_clubs c ON c.id=sc.club_id
         WHERE sc.season_id=p_season_id AND sc.status='CONFIRMED' AND c.status='ACTIVE'
           AND sc.division IN ('SERIE_B','SERIE_C');
        FOR v_i IN 1..8 LOOP
            SELECT season_club_id INTO v_home FROM public.ccfv_league_competition_entries WHERE competition_id=v_competition_id AND seed_number=8+v_i;
            SELECT season_club_id INTO v_away FROM public.ccfv_league_competition_entries WHERE competition_id=v_competition_id AND seed_number=25-v_i;
            INSERT INTO public.ccfv_league_matches (competition_id,round_number,stage_code,match_number,home_enrollment_id,away_enrollment_id)
            VALUES (v_competition_id,1,'PRELIM',v_i,v_home,v_away);
        END LOOP;

    ELSE
        SELECT id INTO v_a_comp FROM public.ccfv_league_competitions
         WHERE season_id=p_season_id AND competition_code='LEAGUE_A' AND competition_type='LEAGUE';
        IF v_a_comp IS NULL THEN RAISE EXCEPTION 'Gere primeiro o calendário da Série A.'; END IF;
        SELECT count(*)::integer INTO v_round11_count FROM public.ccfv_league_matches
         WHERE competition_id=v_a_comp AND round_number<=11 AND status='PLAYED';
        IF v_round11_count<>66 THEN RAISE EXCEPTION 'A Copa Elite só pode ser gerada depois de todas as 66 partidas das 11 primeiras rodadas da Série A. Registradas: %.',v_round11_count; END IF;
        WITH match_rows AS (
            SELECT m.home_enrollment_id AS enrollment_id,m.home_goals AS gf,m.away_goals AS ga
              FROM public.ccfv_league_matches m WHERE m.competition_id=v_a_comp AND m.round_number<=11 AND m.status='PLAYED'
            UNION ALL
            SELECT m.away_enrollment_id,m.away_goals,m.home_goals
              FROM public.ccfv_league_matches m WHERE m.competition_id=v_a_comp AND m.round_number<=11 AND m.status='PLAYED'
        ), stats AS (
            SELECT enrollment_id,count(*)::integer AS played,
                   count(*) FILTER (WHERE gf>ga)::integer AS wins,
                   count(*) FILTER (WHERE gf=ga)::integer AS draws,
                   count(*) FILTER (WHERE gf<ga)::integer AS losses,
                   sum(gf)::integer AS gf,sum(ga)::integer AS ga,
                   sum(CASE WHEN gf>ga THEN 3 WHEN gf=ga THEN 1 ELSE 0 END)::integer AS points
              FROM match_rows GROUP BY enrollment_id
        ), ranked AS (
            SELECT e.season_club_id,s.points,s.wins,s.gf,s.ga,
                   row_number() OVER (ORDER BY s.points DESC,s.wins DESC,(s.gf-s.ga) DESC,s.gf DESC,sc.snapshot_name ASC)::smallint AS seed
              FROM public.ccfv_league_competition_entries e
              JOIN public.ccfv_league_season_clubs sc ON sc.id=e.season_club_id
              JOIN stats s ON s.enrollment_id=e.season_club_id
             WHERE e.competition_id=v_a_comp
        )
        INSERT INTO public.ccfv_league_competition_entries (competition_id,season_club_id,seed_number,source_label,metadata)
        SELECT v_competition_id,season_club_id,seed,'SERIE_A_TOP_8_AFTER_ROUND_11',
               jsonb_build_object('points',points,'wins',wins,'goals_for',gf,'goals_against',ga)
          FROM ranked WHERE seed<=8;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count<>8 THEN RAISE EXCEPTION 'Não foi possível identificar os oito primeiros da Série A.'; END IF;
        FOR v_i IN 1..4 LOOP
            SELECT season_club_id INTO v_home FROM public.ccfv_league_competition_entries WHERE competition_id=v_competition_id AND seed_number=v_i;
            SELECT season_club_id INTO v_away FROM public.ccfv_league_competition_entries WHERE competition_id=v_competition_id AND seed_number=9-v_i;
            INSERT INTO public.ccfv_league_matches (competition_id,round_number,stage_code,match_number,home_enrollment_id,away_enrollment_id)
            VALUES (v_competition_id,1,'QF',v_i,v_home,v_away);
        END LOOP;
    END IF;

    UPDATE public.ccfv_league_competitions SET status='IN_PROGRESS',updated_at=now() WHERE id=v_competition_id;
    INSERT INTO public.ccfv_league_audit_logs (actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata)
    VALUES (auth.uid(),p_season_id,'CUP_GENERATED','COMPETITION',v_competition_id,NULL,
        jsonb_build_object('competition_code',v_code,'participants',CASE v_code WHEN 'INTERDIVISIONAL' THEN 36 WHEN 'INTEGRACAO' THEN 24 ELSE 8 END),
        jsonb_build_object('source','competition_engine_v2'));
    RETURN jsonb_build_object('success',true,'competition_id',v_competition_id,'competition_code',v_code,'first_round_matches',
        (SELECT count(*) FROM public.ccfv_league_matches WHERE competition_id=v_competition_id));
END;
$function$;

CREATE OR REPLACE FUNCTION public.ccfv_league_admin_advance_cup_v2(
    p_competition_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_comp public.ccfv_league_competitions%ROWTYPE;
    v_last_round integer;
    v_stage text;
    v_code text;
    v_pending integer;
    v_winners uuid[];
    v_bracket_count integer;
    v_next_stage text;
    v_next_round integer;
    v_i integer;
    v_home uuid;
    v_away uuid;
    v_base integer;
    v_total integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.'; END IF;
    SELECT * INTO v_comp FROM public.ccfv_league_competitions WHERE id=p_competition_id AND competition_type='CUP' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Copa não encontrada.'; END IF;
    SELECT max(round_number) INTO v_last_round FROM public.ccfv_league_matches WHERE competition_id=p_competition_id;
    IF v_last_round IS NULL THEN RAISE EXCEPTION 'A copa ainda não possui partidas.'; END IF;
    SELECT stage_code,count(*) FILTER (WHERE status<>'PLAYED')::integer
      INTO v_stage,v_pending FROM public.ccfv_league_matches
     WHERE competition_id=p_competition_id AND round_number=v_last_round GROUP BY stage_code;
    IF coalesce(v_pending,0)>0 THEN RAISE EXCEPTION 'Ainda existem % partidas pendentes nesta fase.',v_pending; END IF;

    IF v_stage='FINAL' THEN
        SELECT winner_enrollment_id INTO v_home FROM public.ccfv_league_matches
         WHERE competition_id=p_competition_id AND round_number=v_last_round ORDER BY match_number LIMIT 1;
        UPDATE public.ccfv_league_competitions SET status='COMPLETED',updated_at=now() WHERE id=p_competition_id;
        INSERT INTO public.ccfv_league_audit_logs (actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata)
        VALUES (auth.uid(),v_comp.season_id,'CUP_COMPLETED','COMPETITION',p_competition_id,NULL,
            jsonb_build_object('champion_enrollment_id',v_home),jsonb_build_object('source','competition_engine_v2'));
        RETURN jsonb_build_object('success',true,'completed',true,'champion_enrollment_id',v_home);
    END IF;

    v_next_round := v_last_round+1;
    IF v_stage='PRELIM' THEN
        IF v_comp.competition_code='INTERDIVISIONAL' THEN
            v_next_stage:='R32'; v_base:=28; v_bracket_count:=32;
        ELSIF v_comp.competition_code='INTEGRACAO' THEN
            v_next_stage:='R16'; v_base:=8; v_bracket_count:=16;
        ELSE
            RAISE EXCEPTION 'Fase preliminar não reconhecida para esta copa.';
        END IF;
        UPDATE public.ccfv_league_competition_entries SET bracket_seed=seed_number
         WHERE competition_id=p_competition_id AND seed_number<=v_base;
        WITH winners AS (
            SELECT winner_enrollment_id,
                   (v_base + row_number() OVER (ORDER BY match_number))::smallint AS new_seed
              FROM public.ccfv_league_matches
             WHERE competition_id=p_competition_id AND round_number=v_last_round
        )
        UPDATE public.ccfv_league_competition_entries e
           SET bracket_seed=w.new_seed
          FROM winners w
         WHERE e.competition_id=p_competition_id AND e.season_club_id=w.winner_enrollment_id;
        FOR v_i IN 1..(v_bracket_count/2) LOOP
            SELECT season_club_id INTO v_home FROM public.ccfv_league_competition_entries WHERE competition_id=p_competition_id AND bracket_seed=v_i;
            SELECT season_club_id INTO v_away FROM public.ccfv_league_competition_entries WHERE competition_id=p_competition_id AND bracket_seed=v_bracket_count+1-v_i;
            IF v_home IS NULL OR v_away IS NULL THEN RAISE EXCEPTION 'Não foi possível montar todos os confrontos da próxima fase.'; END IF;
            INSERT INTO public.ccfv_league_matches (competition_id,round_number,stage_code,match_number,home_enrollment_id,away_enrollment_id)
            VALUES (p_competition_id,v_next_round,v_next_stage,v_i,v_home,v_away);
        END LOOP;
    ELSE
        SELECT array_agg(winner_enrollment_id ORDER BY match_number)
          INTO v_winners FROM public.ccfv_league_matches
         WHERE competition_id=p_competition_id AND round_number=v_last_round;
        IF coalesce(array_length(v_winners,1),0)<2 OR mod(array_length(v_winners,1),2)<>0 THEN
            RAISE EXCEPTION 'A chave não possui um número par de vencedores para avançar.';
        END IF;
        v_next_stage := CASE v_stage WHEN 'R32' THEN 'R16' WHEN 'R16' THEN 'QF' WHEN 'QF' THEN 'SF' WHEN 'SF' THEN 'FINAL' ELSE NULL END;
        IF v_next_stage IS NULL THEN RAISE EXCEPTION 'Fase % não reconhecida.',v_stage; END IF;
        FOR v_i IN 1..(array_length(v_winners,1)/2) LOOP
            v_home:=v_winners[(v_i*2)-1]; v_away:=v_winners[v_i*2];
            INSERT INTO public.ccfv_league_matches (competition_id,round_number,stage_code,match_number,home_enrollment_id,away_enrollment_id)
            VALUES (p_competition_id,v_next_round,v_next_stage,v_i,v_home,v_away);
        END LOOP;
    END IF;
    INSERT INTO public.ccfv_league_audit_logs (actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata)
    VALUES (auth.uid(),v_comp.season_id,'CUP_PHASE_GENERATED','COMPETITION',p_competition_id,NULL,
        jsonb_build_object('round',v_next_round,'stage',v_next_stage),jsonb_build_object('source','competition_engine_v2'));
    RETURN jsonb_build_object('success',true,'completed',false,'round_number',v_next_round,'stage_code',v_next_stage);
END;
$function$;

-- 6) RESULTADOS, PÊNALTIS E AGENDAMENTO --------------------------------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_record_match_result_v2(
    p_match_id uuid,
    p_home_goals integer,
    p_away_goals integer,
    p_home_penalties integer DEFAULT NULL,
    p_away_penalties integer DEFAULT NULL,
    p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
    v_match public.ccfv_league_matches%ROWTYPE;
    v_comp public.ccfv_league_competitions%ROWTYPE;
    v_winner uuid;
    v_old jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.'; END IF;
    IF p_match_id IS NULL OR p_home_goals IS NULL OR p_away_goals IS NULL OR p_home_goals<0 OR p_away_goals<0 THEN
        RAISE EXCEPTION 'Informe um placar válido.';
    END IF;
    IF p_note IS NOT NULL AND length(p_note)>500 THEN RAISE EXCEPTION 'A observação deve ter até 500 caracteres.'; END IF;
    SELECT * INTO v_match FROM public.ccfv_league_matches WHERE id=p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Partida não encontrada.'; END IF;
    SELECT * INTO v_comp FROM public.ccfv_league_competitions WHERE id=v_match.competition_id;
    IF v_match.status='CANCELLED' THEN RAISE EXCEPTION 'Partidas canceladas não recebem resultado.'; END IF;
    IF v_comp.competition_type='CUP' AND v_match.status='PLAYED' AND EXISTS (
        SELECT 1 FROM public.ccfv_league_matches later
         WHERE later.competition_id=v_match.competition_id
           AND later.round_number>v_match.round_number
    ) THEN
        RAISE EXCEPTION 'Não é possível corrigir esta partida porque a fase seguinte já foi gerada. Revise a chave e solicite intervenção administrativa.';
    END IF;
    IF v_match.status='PLAYED' AND nullif(btrim(coalesce(p_note,'')),'') IS NULL THEN
        RAISE EXCEPTION 'Para corrigir um resultado já lançado, informe uma justificativa.';
    END IF;
    v_old := to_jsonb(v_match);
    IF v_comp.competition_type='CUP' THEN
        IF p_home_goals=p_away_goals THEN
            IF p_home_penalties IS NULL OR p_away_penalties IS NULL OR p_home_penalties<0 OR p_away_penalties<0 OR p_home_penalties=p_away_penalties THEN
                RAISE EXCEPTION 'No mata-mata empatado, informe a disputa de pênaltis com vencedor.';
            END IF;
            v_winner := CASE WHEN p_home_penalties>p_away_penalties THEN v_match.home_enrollment_id ELSE v_match.away_enrollment_id END;
        ELSE
            IF p_home_penalties IS NOT NULL OR p_away_penalties IS NOT NULL THEN
                RAISE EXCEPTION 'Pênaltis só devem ser informados quando o placar normal terminar empatado.';
            END IF;
            v_winner := CASE WHEN p_home_goals>p_away_goals THEN v_match.home_enrollment_id ELSE v_match.away_enrollment_id END;
        END IF;
    ELSE
        IF p_home_penalties IS NOT NULL OR p_away_penalties IS NOT NULL THEN
            RAISE EXCEPTION 'Partidas do campeonato regular não possuem disputa de pênaltis.';
        END IF;
        v_winner := NULL;
    END IF;
    UPDATE public.ccfv_league_matches SET
        home_goals=p_home_goals,away_goals=p_away_goals,
        home_penalties=p_home_penalties,away_penalties=p_away_penalties,
        winner_enrollment_id=v_winner,status='PLAYED',result_note=nullif(btrim(p_note),''),
        result_recorded_by=auth.uid(),result_recorded_at=now(),updated_at=now()
     WHERE id=p_match_id RETURNING * INTO v_match;
    IF v_comp.competition_type='CUP' AND v_match.stage_code='FINAL' THEN
        UPDATE public.ccfv_league_competitions SET status='COMPLETED',updated_at=now() WHERE id=v_comp.id;
    ELSE
        UPDATE public.ccfv_league_competitions SET status='IN_PROGRESS',updated_at=now() WHERE id=v_comp.id AND status<>'COMPLETED';
    END IF;
    INSERT INTO public.ccfv_league_audit_logs (actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata)
    VALUES (auth.uid(),v_comp.season_id,
        CASE WHEN v_old->>'status'='PLAYED' THEN 'MATCH_RESULT_CORRECTED' ELSE 'MATCH_RESULT_RECORDED' END,
        'MATCH',v_match.id,v_old,to_jsonb(v_match),
        jsonb_build_object('source','competition_engine_v2','note',nullif(btrim(p_note),'')));
    RETURN jsonb_build_object('success',true,'match_id',v_match.id,'status',v_match.status,'winner_enrollment_id',v_winner);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ccfv_league_admin_schedule_match_v2(
    p_match_id uuid, p_scheduled_at timestamptz, p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_match public.ccfv_league_matches%ROWTYPE; v_old jsonb; v_season_id uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.'; END IF;
    IF p_match_id IS NULL OR p_scheduled_at IS NULL THEN RAISE EXCEPTION 'Informe a partida e a data/hora.'; END IF;
    IF p_note IS NOT NULL AND length(p_note)>500 THEN RAISE EXCEPTION 'A observação deve ter até 500 caracteres.'; END IF;
    SELECT m.* INTO v_match FROM public.ccfv_league_matches m WHERE m.id=p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Partida não encontrada.'; END IF;
    IF v_match.status<>'SCHEDULED' THEN RAISE EXCEPTION 'Somente partidas ainda não realizadas podem ser agendadas.'; END IF;
    v_old:=to_jsonb(v_match);
    UPDATE public.ccfv_league_matches SET scheduled_at=p_scheduled_at,updated_at=now() WHERE id=p_match_id RETURNING * INTO v_match;
    SELECT season_id INTO v_season_id FROM public.ccfv_league_competitions WHERE id=v_match.competition_id;
    INSERT INTO public.ccfv_league_audit_logs (actor_user_id,season_id,action,entity_type,entity_id,old_data,new_data,metadata)
    VALUES (auth.uid(),v_season_id,'MATCH_SCHEDULED','MATCH',p_match_id,v_old,to_jsonb(v_match),
        jsonb_build_object('source','competition_engine_v2','note',nullif(btrim(p_note),'')));
    RETURN jsonb_build_object('success',true,'match_id',p_match_id,'scheduled_at',v_match.scheduled_at);
END;
$function$;

-- 7) LEITURA ADMINISTRATIVA PARA O NOVO PAINEL --------------------------------
CREATE OR REPLACE FUNCTION public.ccfv_league_admin_list_competitions_v2(p_season_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_items jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.'; END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',c.id,'season_id',c.season_id,'competition_code',c.competition_code,'name',c.name,
        'competition_type',c.competition_type,'division_code',c.division_code,'status',c.status,
        'settings',c.settings,'matches_count',(SELECT count(*) FROM public.ccfv_league_matches m WHERE m.competition_id=c.id),
        'played_count',(SELECT count(*) FROM public.ccfv_league_matches m WHERE m.competition_id=c.id AND m.status='PLAYED')
    ) ORDER BY c.competition_type,c.competition_code),'[]'::jsonb)
      INTO v_items FROM public.ccfv_league_competitions c WHERE c.season_id=p_season_id;
    RETURN jsonb_build_object('success',true,'items',v_items);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ccfv_league_admin_list_matches_v2(
    p_competition_id uuid, p_round_number integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_items jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.'; END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id',m.id,'competition_id',m.competition_id,'round_number',m.round_number,'stage_code',m.stage_code,
        'match_number',m.match_number,'status',m.status,'scheduled_at',m.scheduled_at,
        'home_enrollment_id',m.home_enrollment_id,'away_enrollment_id',m.away_enrollment_id,
        'home_name',h.snapshot_name,'away_name',a.snapshot_name,
        'home_crest_url',h.snapshot_crest_url,'away_crest_url',a.snapshot_crest_url,
        'home_goals',m.home_goals,'away_goals',m.away_goals,
        'home_penalties',m.home_penalties,'away_penalties',m.away_penalties,
        'winner_enrollment_id',m.winner_enrollment_id,'result_note',m.result_note
    ) ORDER BY m.round_number,m.match_number),'[]'::jsonb)
      INTO v_items
      FROM public.ccfv_league_matches m
      JOIN public.ccfv_league_season_clubs h ON h.id=m.home_enrollment_id
      JOIN public.ccfv_league_season_clubs a ON a.id=m.away_enrollment_id
     WHERE m.competition_id=p_competition_id
       AND (p_round_number IS NULL OR m.round_number=p_round_number);
    RETURN jsonb_build_object('success',true,'items',v_items);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ccfv_league_admin_get_standings_v2(p_competition_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_comp public.ccfv_league_competitions%ROWTYPE; v_items jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT public.ccfv_is_admin() THEN RAISE EXCEPTION 'Acesso restrito aos administradores da CCFV.'; END IF;
    SELECT * INTO v_comp FROM public.ccfv_league_competitions WHERE id=p_competition_id AND competition_type='LEAGUE';
    IF NOT FOUND THEN RAISE EXCEPTION 'Competição de liga não encontrada.'; END IF;
    WITH match_rows AS (
        SELECT m.home_enrollment_id AS enrollment_id,m.home_goals AS gf,m.away_goals AS ga
          FROM public.ccfv_league_matches m WHERE m.competition_id=p_competition_id AND m.status='PLAYED'
        UNION ALL
        SELECT m.away_enrollment_id,m.away_goals,m.home_goals
          FROM public.ccfv_league_matches m WHERE m.competition_id=p_competition_id AND m.status='PLAYED'
    ), stats AS (
        SELECT enrollment_id,count(*)::integer AS played,
               count(*) FILTER (WHERE gf>ga)::integer AS wins,
               count(*) FILTER (WHERE gf=ga)::integer AS draws,
               count(*) FILTER (WHERE gf<ga)::integer AS losses,
               coalesce(sum(gf),0)::integer AS gf,coalesce(sum(ga),0)::integer AS ga,
               coalesce(sum(CASE WHEN gf>ga THEN 3 WHEN gf=ga THEN 1 ELSE 0 END),0)::integer AS points
          FROM match_rows GROUP BY enrollment_id
    ), table_rows AS (
        SELECT e.season_club_id,sc.snapshot_name,sc.snapshot_crest_url,sc.division,
               coalesce(st.played,0) AS played,coalesce(st.wins,0) AS wins,
               coalesce(st.draws,0) AS draws,coalesce(st.losses,0) AS losses,
               coalesce(st.gf,0) AS goals_for,coalesce(st.ga,0) AS goals_against,
               coalesce(st.gf,0)-coalesce(st.ga,0) AS goal_difference,
               coalesce(st.points,0) AS points
          FROM public.ccfv_league_competition_entries e
          JOIN public.ccfv_league_season_clubs sc ON sc.id=e.season_club_id
          LEFT JOIN stats st ON st.enrollment_id=e.season_club_id
         WHERE e.competition_id=p_competition_id
    ), ranked AS (
        SELECT *,row_number() OVER (ORDER BY points DESC,wins DESC,goal_difference DESC,goals_for DESC,snapshot_name ASC)::integer AS position
          FROM table_rows
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'position',position,'enrollment_id',season_club_id,'club_name',snapshot_name,'crest_url',snapshot_crest_url,
        'division',division,'played',played,'wins',wins,'draws',draws,'losses',losses,
        'goals_for',goals_for,'goals_against',goals_against,'goal_difference',goal_difference,'points',points
    ) ORDER BY position),'[]'::jsonb) INTO v_items FROM ranked;
    RETURN jsonb_build_object('success',true,'competition_id',p_competition_id,'items',v_items,
        'tiebreakers',jsonb_build_array('points','wins','goal_difference','goals_for','club_name'));
END;
$function$;

-- 8) PERMISSÕES: EXECUÇÃO APENAS PARA CONTAS AUTHENTICATED --------------------
DO $permissions$
DECLARE v_signature text;
BEGIN
    FOREACH v_signature IN ARRAY ARRAY[
        'public.ccfv_league_admin_create_season_v2(text,text,date,date,boolean)',
        'public.ccfv_league_admin_change_season_status_v2(uuid,text,text)',
        'public.ccfv_league_admin_list_season_clubs_v2(uuid,text)',
        'public.ccfv_league_admin_decide_season_club_v2(uuid,text,text)',
        'public.ccfv_league_admin_assign_divisions_v2(uuid,jsonb,text)',
        'public.ccfv_league_admin_finalize_season_v2(uuid,text)',
        'public.ccfv_league_admin_generate_league_schedule_v2(uuid)',
        'public.ccfv_league_admin_generate_cup_v2(uuid,text)',
        'public.ccfv_league_admin_advance_cup_v2(uuid)',
        'public.ccfv_league_admin_record_match_result_v2(uuid,integer,integer,integer,integer,text)',
        'public.ccfv_league_admin_schedule_match_v2(uuid,timestamptz,text)',
        'public.ccfv_league_admin_list_competitions_v2(uuid)',
        'public.ccfv_league_admin_list_matches_v2(uuid,integer)',
        'public.ccfv_league_admin_get_standings_v2(uuid)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',v_signature);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon',v_signature);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',v_signature);
    END LOOP;
END;
$permissions$;

COMMIT;

-- VERIFICAÇÃO FINAL: todas as RPCs V2 devem aparecer com SECURITY DEFINER=true
-- e authenticated_can_execute=true.
SELECT p.proname AS funcao,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'ccfv_league_admin_%_v2'
ORDER BY p.proname;
