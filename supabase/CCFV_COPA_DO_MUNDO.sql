-- ============================================================
-- CCFV COPA DO MUNDO — MOTOR ISOLADO
-- Não altera Champions, Libertadores, Brasileirão, Night ou Mobile.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ccfv_world_cup_seasons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    season_number integer NOT NULL UNIQUE,
    season_label text NOT NULL,
    status text NOT NULL DEFAULT 'REGISTRATIONS'
        CHECK (status IN ('DRAFT','REGISTRATIONS','DRAW','GROUP_STAGE','KNOCKOUT','FINAL','FINISHED')),
    phase text NOT NULL DEFAULT 'REGISTRATIONS'
        CHECK (phase IN ('REGISTRATIONS','DRAW','GROUP_STAGE','ROUND_OF_16','QUARTERFINALS','SEMIFINALS','FINAL','FINISHED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ccfv_world_cup_teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL REFERENCES public.ccfv_world_cup_seasons(id) ON DELETE CASCADE,
    slot integer NOT NULL CHECK (slot BETWEEN 1 AND 32),
    name text NOT NULL,
    slug text NOT NULL,
    confederation text NOT NULL,
    logo_path text,
    pot integer NOT NULL CHECK (pot BETWEEN 1 AND 4),
    group_code text CHECK (group_code IN ('A','B','C','D','E','F','G','H')),
    group_position integer CHECK (group_position BETWEEN 1 AND 4),
    participant_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE','RESERVED','CONFIRMED','ELIMINATED','CHAMPION')),
    draw_seed double precision NOT NULL DEFAULT random(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (season_id, slot),
    UNIQUE (season_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ccfv_world_cup_player
    ON public.ccfv_world_cup_teams(season_id, participant_id)
    WHERE participant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ccfv_world_cup_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL REFERENCES public.ccfv_world_cup_seasons(id) ON DELETE CASCADE,
    stage text NOT NULL CHECK (stage IN ('GROUP_STAGE','ROUND_OF_16','QUARTERFINALS','SEMIFINALS','FINAL')),
    group_code text,
    tie_code text,
    match_order integer NOT NULL,
    home_team_id uuid NOT NULL REFERENCES public.ccfv_world_cup_teams(id) ON DELETE RESTRICT,
    away_team_id uuid NOT NULL REFERENCES public.ccfv_world_cup_teams(id) ON DELETE RESTRICT,
    scheduled_at timestamptz,
    status text NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED','VALIDATED','WO','ADMIN_DECISION','CANCELLED')),
    home_score integer CHECK (home_score >= 0),
    away_score integer CHECK (away_score >= 0),
    home_penalties integer CHECK (home_penalties IS NULL OR home_penalties >= 0),
    away_penalties integer CHECK (away_penalties IS NULL OR away_penalties >= 0),
    winner_team_id uuid REFERENCES public.ccfv_world_cup_teams(id) ON DELETE RESTRICT,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (season_id, stage, match_order)
);

CREATE TABLE IF NOT EXISTS public.ccfv_world_cup_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id uuid REFERENCES public.ccfv_world_cup_seasons(id) ON DELETE CASCADE,
    action text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    actor_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.ccfv_world_cup_public_seasons AS
SELECT id,code,season_number,season_label,status,phase
FROM public.ccfv_world_cup_seasons;

CREATE OR REPLACE VIEW public.ccfv_world_cup_public_teams AS
SELECT t.id,t.season_id,t.slot,t.name,t.slug,t.confederation,t.pot,t.group_code,t.group_position,t.status,
       t.participant_id,p.name AS participant_name,p.platform AS participant_platform,p.photo_url AS participant_photo_url
FROM public.ccfv_world_cup_teams t
LEFT JOIN public.players p ON p.id=t.participant_id;

CREATE OR REPLACE VIEW public.ccfv_world_cup_public_matches AS
SELECT m.id,m.season_id,m.stage,m.group_code,m.tie_code,m.match_order,m.scheduled_at,m.status,m.home_score,m.away_score,
       m.home_penalties,m.away_penalties,m.winner_team_id,
       h.name AS home_name,h.slug AS home_slug,h.participant_id AS home_participant_id,
       a.name AS away_name,a.slug AS away_slug,a.participant_id AS away_participant_id
FROM public.ccfv_world_cup_matches m
JOIN public.ccfv_world_cup_teams h ON h.id=m.home_team_id
JOIN public.ccfv_world_cup_teams a ON a.id=m.away_team_id;

CREATE OR REPLACE VIEW public.ccfv_world_cup_public_standings AS
WITH base AS (
    SELECT t.id AS team_id,t.season_id,t.group_code,t.group_position,t.name,t.slug,t.participant_id,
           COALESCE(SUM(CASE WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN 1 ELSE 0 END),0)::int played,
           COALESCE(SUM(CASE WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
              CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END ELSE 0 END),0)::int gf,
           COALESCE(SUM(CASE WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
              CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END ELSE 0 END),0)::int ga,
           COALESCE(SUM(CASE WHEN m.status IN ('VALIDATED','WO','ADMIN_DECISION') THEN
              CASE
               WHEN (CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END) >
                    (CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END) THEN 3
               WHEN (CASE WHEN m.home_team_id=t.id THEN m.home_score ELSE m.away_score END) =
                    (CASE WHEN m.home_team_id=t.id THEN m.away_score ELSE m.home_score END) THEN 1
               ELSE 0 END
            ELSE 0 END),0)::int points
    FROM public.ccfv_world_cup_teams t
    LEFT JOIN public.ccfv_world_cup_matches m ON m.season_id=t.season_id
      AND m.stage='GROUP_STAGE'
      AND m.group_code=t.group_code
      AND (m.home_team_id=t.id OR m.away_team_id=t.id)
    WHERE t.group_code IS NOT NULL
    GROUP BY t.id,t.season_id,t.group_code,t.group_position,t.name,t.slug,t.participant_id
)
SELECT *, (gf-ga)::int goal_difference,
       row_number() over(partition by season_id,group_code order by points desc,(gf-ga) desc,gf desc,name)::int position,
       (row_number() over(partition by season_id,group_code order by points desc,(gf-ga) desc,gf desc,name) <= 2) qualified
FROM base;

DO $$
DECLARE v_season uuid;
BEGIN
  SELECT id INTO v_season FROM public.ccfv_world_cup_seasons WHERE code='CCFV-WC-S01';
  IF v_season IS NULL THEN
    INSERT INTO public.ccfv_world_cup_seasons(code,season_number,season_label,status,phase)
    VALUES('CCFV-WC-S01',1,'SEASON 01','REGISTRATIONS','REGISTRATIONS') RETURNING id INTO v_season;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.ccfv_world_cup_teams WHERE season_id=v_season) THEN
    INSERT INTO public.ccfv_world_cup_teams(season_id,slot,name,slug,confederation,pot) VALUES
      (v_season,1,'Argentina','argentina','CONMEBOL',1),
      (v_season,2,'Brasil','brasil','CONMEBOL',1),
      (v_season,3,'França','franca','UEFA',1),
      (v_season,4,'Espanha','espanha','UEFA',1),
      (v_season,5,'Inglaterra','inglaterra','UEFA',2),
      (v_season,6,'Portugal','portugal','UEFA',2),
      (v_season,7,'Alemanha','alemanha','UEFA',2),
      (v_season,8,'Itália','italia','UEFA',2),
      (v_season,9,'Holanda','holanda','UEFA',3),
      (v_season,10,'Croácia','croacia','UEFA',3),
      (v_season,11,'Bélgica','belgica','UEFA',3),
      (v_season,12,'Uruguai','uruguai','CONMEBOL',3),
      (v_season,13,'Colômbia','colombia','CONMEBOL',4),
      (v_season,14,'México','mexico','CONCACAF',4),
      (v_season,15,'Estados Unidos','estados-unidos','CONCACAF',4),
      (v_season,16,'Japão','japao','AFC',4),
      (v_season,17,'Marrocos','marrocos','CAF',4),
      (v_season,18,'Senegal','senegal','CAF',4),
      (v_season,19,'Coreia do Sul','coreia-do-sul','AFC',4),
      (v_season,20,'Austrália','australia','AFC',4),
      (v_season,21,'Dinamarca','dinamarca','UEFA',3),
      (v_season,22,'Suíça','suica','UEFA',3),
      (v_season,23,'Estados Unidos B','estados-unidos-b','CONCACAF',4),
      (v_season,24,'Canadá','canada','CONCACAF',4),
      (v_season,25,'Equador','equador','CONMEBOL',4),
      (v_season,26,'Chile','chile','CONMEBOL',4),
      (v_season,27,'Paraguai','paraguai','CONMEBOL',4),
      (v_season,28,'Peru','peru','CONMEBOL',4),
      (v_season,29,'Nigéria','nigeria','CAF',4),
      (v_season,30,'Camarões','camaroes','CAF',4),
      (v_season,31,'Irã','ira','AFC',4),
      (v_season,32,'Arábia Saudita','arabia-saudita','AFC',4);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ccfv_world_cup_register_participant(p_season_id uuid,p_team_id uuid,p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_phase text; v_team public.ccfv_world_cup_teams%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT phase INTO v_phase FROM public.ccfv_world_cup_seasons WHERE id=p_season_id FOR UPDATE;
  IF v_phase IS NULL THEN RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.'; END IF;
  IF v_phase NOT IN ('REGISTRATIONS','DRAW') THEN RAISE EXCEPTION 'INSCRIÇÕES BLOQUEADAS NESTA FASE.'; END IF;
  SELECT * INTO v_team FROM public.ccfv_world_cup_teams WHERE id=p_team_id AND season_id=p_season_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SELEÇÃO NÃO ENCONTRADA.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.players WHERE id=p_player_id AND status='ACTIVE') THEN RAISE EXCEPTION 'JOGADOR NÃO ENCONTRADO.'; END IF;
  IF EXISTS(SELECT 1 FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND participant_id=p_player_id AND id<>p_team_id) THEN
    RAISE EXCEPTION 'ESTE JOGADOR JÁ ESTÁ VINCULADO A OUTRA SELEÇÃO.';
  END IF;
  UPDATE public.ccfv_world_cup_teams
  SET participant_id=p_player_id,status='CONFIRMED',updated_at=now()
  WHERE id=p_team_id;
  INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
  VALUES(p_season_id,'REGISTER_PARTICIPANT',jsonb_build_object('team_id',p_team_id,'player_id',p_player_id),auth.uid());
  RETURN jsonb_build_object('ok',true);
END; $$;

CREATE OR REPLACE FUNCTION public.ccfv_world_cup_draw_groups(p_season_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_phase text; v_group char; v_slot int; v_team record; v_idx int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT phase INTO v_phase FROM public.ccfv_world_cup_seasons WHERE id=p_season_id FOR UPDATE;
  IF v_phase NOT IN ('REGISTRATIONS','DRAW') THEN RAISE EXCEPTION 'SORTEIO BLOQUEADO NESTA FASE.'; END IF;
  IF (SELECT count(*) FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND participant_id IS NOT NULL) <> 32 THEN
    RAISE EXCEPTION 'A COPA PRECISA DE 32 SELEÇÕES INSCRITAS.';
  END IF;

  UPDATE public.ccfv_world_cup_teams SET group_code=NULL,group_position=NULL,status='CONFIRMED'
  WHERE season_id=p_season_id;

  FOR v_slot IN 1..4 LOOP
    v_idx:=0;
    FOR v_team IN SELECT id FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND pot=v_slot ORDER BY random(),slot LOOP
      v_idx:=v_idx+1;
      v_group:=chr(64+v_idx);
      UPDATE public.ccfv_world_cup_teams SET group_code=v_group,group_position=v_slot WHERE id=v_team.id;
    END LOOP;
  END LOOP;

  UPDATE public.ccfv_world_cup_seasons SET status='GROUP_STAGE',phase='GROUP_STAGE',updated_at=now() WHERE id=p_season_id;
  INSERT INTO public.ccfv_world_cup_audit(season_id,action,actor_id) VALUES(p_season_id,'DRAW_GROUPS',auth.uid());
  RETURN jsonb_build_object('ok',true);
END; $$;

CREATE OR REPLACE FUNCTION public.ccfv_world_cup_generate_group_matches(p_season_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g char; t1 uuid;t2 uuid;t3 uuid;t4 uuid; n int:=0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND group_code='A') THEN RAISE EXCEPTION 'GERE O SORTEIO ANTES.';
  END IF;
  DELETE FROM public.ccfv_world_cup_matches WHERE season_id=p_season_id AND stage='GROUP_STAGE';
  FOR g IN SELECT chr(x) FROM generate_series(65,72) x LOOP
    SELECT id INTO t1 FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND group_code=g AND group_position=1;
    SELECT id INTO t2 FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND group_code=g AND group_position=2;
    SELECT id INTO t3 FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND group_code=g AND group_position=3;
    SELECT id INTO t4 FROM public.ccfv_world_cup_teams WHERE season_id=p_season_id AND group_code=g AND group_position=4;
    INSERT INTO public.ccfv_world_cup_matches(season_id,stage,group_code,match_order,home_team_id,away_team_id)
    VALUES
      (p_season_id,'GROUP_STAGE',g,n+1,t1,t2),
      (p_season_id,'GROUP_STAGE',g,n+2,t3,t4),
      (p_season_id,'GROUP_STAGE',g,n+3,t1,t3),
      (p_season_id,'GROUP_STAGE',g,n+4,t2,t4),
      (p_season_id,'GROUP_STAGE',g,n+5,t1,t4),
      (p_season_id,'GROUP_STAGE',g,n+6,t2,t3);
    n:=n+6;
  END LOOP;
  INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id) VALUES(p_season_id,'GENERATE_GROUP_MATCHES',jsonb_build_object('matches',n),auth.uid());
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.ccfv_world_cup_set_result(p_match_id uuid,p_home_score int,p_away_score int,p_home_penalties int DEFAULT NULL,p_away_penalties int DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE m public.ccfv_world_cup_matches%ROWTYPE; w uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO m FROM public.ccfv_world_cup_matches WHERE id=p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTIDA NÃO ENCONTRADA.'; END IF;
  IF p_home_score IS NULL OR p_away_score IS NULL OR p_home_score<0 OR p_away_score<0 THEN RAISE EXCEPTION 'PLACAR INVÁLIDO.'; END IF;

  IF p_home_score > p_away_score THEN w:=m.home_team_id;
  ELSIF p_away_score > p_home_score THEN w:=m.away_team_id;
  ELSE
    IF p_home_penalties IS NULL OR p_away_penalties IS NULL OR p_home_penalties=p_away_penalties THEN
      IF m.stage='GROUP_STAGE' THEN w:=NULL; ELSE RAISE EXCEPTION 'EMPATE NO MATA-MATA EXIGE PÊNALTIS.'; END IF;
    ELSIF p_home_penalties > p_away_penalties THEN w:=m.home_team_id;
    ELSE w:=m.away_team_id;
    END IF;
  END IF;

  UPDATE public.ccfv_world_cup_matches
  SET home_score=p_home_score,away_score=p_away_score,home_penalties=p_home_penalties,away_penalties=p_away_penalties,
      winner_team_id=w,status='VALIDATED',notes=p_notes,updated_at=now()
  WHERE id=p_match_id;

  INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
  VALUES(m.season_id,'SET_RESULT',jsonb_build_object('match_id',p_match_id,'winner_team_id',w),auth.uid());

  RETURN jsonb_build_object('ok',true,'winner_team_id',w);
END; $$;

CREATE OR REPLACE FUNCTION public.ccfv_world_cup_create_next_season(p_season_number int,p_season_label text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid; v_source uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT id INTO v_source FROM public.ccfv_world_cup_seasons WHERE season_number=p_season_number-1;
  SELECT id INTO v_id FROM public.ccfv_world_cup_seasons WHERE season_number=p_season_number;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.ccfv_world_cup_seasons(code,season_number,season_label,status,phase)
  VALUES('CCFV-WC-S'||lpad(p_season_number::text,2,'0'),p_season_number,coalesce(nullif(trim(p_season_label),''),'SEASON '||lpad(p_season_number::text,2,'0')),'REGISTRATIONS','REGISTRATIONS')
  RETURNING id INTO v_id;
  INSERT INTO public.ccfv_world_cup_teams(season_id,slot,name,slug,confederation,pot,logo_path)
  SELECT v_id,slot,name,slug,confederation,pot,NULL FROM public.ccfv_world_cup_teams WHERE season_id=v_source ORDER BY slot;
  RETURN v_id;
END; $$;

GRANT SELECT ON public.ccfv_world_cup_public_seasons TO anon,authenticated;
GRANT SELECT ON public.ccfv_world_cup_public_teams TO anon,authenticated;
GRANT SELECT ON public.ccfv_world_cup_public_matches TO anon,authenticated;
GRANT SELECT ON public.ccfv_world_cup_public_standings TO anon,authenticated;

COMMIT;


CREATE OR REPLACE FUNCTION public.ccfv_world_cup_finish_season(p_season_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_final public.ccfv_world_cup_matches%ROWTYPE;
  v_winner public.ccfv_world_cup_teams%ROWTYPE;
  v_runner public.ccfv_world_cup_teams%ROWTYPE;
  v_next uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO v_final
  FROM public.ccfv_world_cup_matches
  WHERE season_id=p_season_id AND stage='FINAL'
  ORDER BY match_order DESC LIMIT 1;
  IF NOT FOUND OR v_final.status NOT IN ('VALIDATED','WO','ADMIN_DECISION') THEN
    RAISE EXCEPTION 'A FINAL DA COPA AINDA NÃO FOI VALIDADA.';
  END IF;
  IF v_final.winner_team_id IS NULL THEN
    RAISE EXCEPTION 'A FINAL PRECISA TER UM CAMPEÃO.';
  END IF;

  SELECT * INTO v_winner FROM public.ccfv_world_cup_teams WHERE id=v_final.winner_team_id;
  SELECT * INTO v_runner
  FROM public.ccfv_world_cup_teams
  WHERE id = CASE
    WHEN v_final.home_team_id = v_winner.id THEN v_final.away_team_id
    ELSE v_final.home_team_id
  END;

  UPDATE public.ccfv_world_cup_teams
  SET status=CASE
      WHEN id=v_winner.id THEN 'CHAMPION'
      WHEN id=v_runner.id THEN 'ELIMINATED'
      ELSE status
    END,
    updated_at=now()
  WHERE season_id=p_season_id;

  UPDATE public.ccfv_world_cup_seasons SET status='FINISHED',phase='FINISHED',updated_at=now()
  WHERE id=p_season_id;

  IF v_winner.participant_id IS NOT NULL THEN
    UPDATE public.players SET
      elo=GREATEST(0,COALESCE(elo,0)+150),
      wins=COALESCE(wins,0)+1,
      titles=COALESCE(titles,0)+1
    WHERE id=v_winner.participant_id;

    INSERT INTO public.ccfv_titles(
      player_id,competition_code,competition_name,season,platform,team_name,club_name,club_logo,title,source_id
    )
    SELECT
      v_winner.participant_id,'COPA_DO_MUNDO','COPA DO MUNDO',s.season_label,p.platform,
      v_winner.name,v_winner.name,NULL,'CAMPEÃO',v_final.id
    FROM public.ccfv_world_cup_seasons s
    JOIN public.players p ON p.id=v_winner.participant_id
    WHERE s.id=p_season_id
    ON CONFLICT (player_id,competition_code,season) DO NOTHING;
  END IF;

  IF v_runner.participant_id IS NOT NULL THEN
    UPDATE public.players SET
      elo=GREATEST(0,COALESCE(elo,0)+75)
    WHERE id=v_runner.participant_id;
  END IF;

  INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
  VALUES(p_season_id,'FINISH_SEASON',jsonb_build_object('champion_team_id',v_winner.id,'runner_up_team_id',v_runner.id),auth.uid());

  SELECT public.ccfv_world_cup_create_next_season(
    (SELECT season_number+1 FROM public.ccfv_world_cup_seasons WHERE id=p_season_id),
    'SEASON '||lpad(((SELECT season_number+1 FROM public.ccfv_world_cup_seasons WHERE id=p_season_id))::text,2,'0')
  ) INTO v_next;

  RETURN jsonb_build_object('ok',true,'champion_team_id',v_winner.id,'next_season_id',v_next);
END; $$;

GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_register_participant(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_draw_groups(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_generate_group_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_set_result(uuid,int,int,int,int,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_finish_season(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_create_next_season(int,text) TO authenticated;


CREATE OR REPLACE FUNCTION public.ccfv_world_cup_generate_round_of_16(p_season_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_pairs uuid[] := ARRAY[]::uuid[];
  v_home uuid; v_away uuid; v_order int:=49; i int; g char;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF EXISTS(SELECT 1 FROM public.ccfv_world_cup_matches WHERE season_id=p_season_id AND stage='ROUND_OF_16') THEN
    RETURN 8;
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.ccfv_world_cup_matches
    WHERE season_id=p_season_id AND stage='GROUP_STAGE'
      AND status NOT IN ('VALIDATED','WO','ADMIN_DECISION')
  ) THEN
    RAISE EXCEPTION 'TODOS OS JOGOS DA FASE DE GRUPOS PRECISAM ESTAR ENCERRADOS.';
  END IF;
  FOR g IN SELECT chr(x) FROM generate_series(65,72) x LOOP
    -- A1 x B2, B1 x A2, C1 x D2...
    NULL;
  END LOOP;
  DECLARE
    v_map text[] := ARRAY['A1','B2','B1','A2','C1','D2','D1','C2','E1','F2','F1','E2','G1','H2','H1','G2'];
    code text;
  BEGIN
    FOR i IN 1..16 LOOP
      code:=v_map[i];
      v_pairs:=array_append(v_pairs,(
        SELECT id FROM public.ccfv_world_cup_teams
        WHERE season_id=p_season_id
          AND group_code=substr(code,1,1)
          AND group_position=substring(code from 2)::int
        LIMIT 1
      ));
    END LOOP;
  END;
  FOR i IN 1..8 LOOP
    v_home:=v_pairs[(i*2)-1]; v_away:=v_pairs[i*2];
    IF v_home IS NULL OR v_away IS NULL THEN RAISE EXCEPTION 'CLASSIFICAÇÃO DOS GRUPOS INCOMPLETA.'; END IF;
    INSERT INTO public.ccfv_world_cup_matches(
      season_id,stage,tie_code,match_order,home_team_id,away_team_id
    ) VALUES (
      p_season_id,'ROUND_OF_16','R16-'||lpad(i::text,2,'0'),v_order,v_home,v_away
    );
    v_order:=v_order+1;
  END LOOP;
  UPDATE public.ccfv_world_cup_seasons SET phase='ROUND_OF_16',status='KNOCKOUT',updated_at=now()
  WHERE id=p_season_id;
  INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
  VALUES(p_season_id,'GENERATE_ROUND_OF_16',jsonb_build_object('matches',8),auth.uid());
  RETURN 8;
END; $$;

CREATE OR REPLACE FUNCTION public.ccfv_world_cup_generate_next_phase(p_season_id uuid,p_stage text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  ids uuid[];
  new_stage text;
  base_order int;
  i int;
  n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_stage='ROUND_OF_16' THEN new_stage:='QUARTERFINALS'; base_order:=57;
  ELSIF p_stage='QUARTERFINALS' THEN new_stage:='SEMIFINALS'; base_order:=61;
  ELSIF p_stage='SEMIFINALS' THEN new_stage:='FINAL'; base_order:=63;
  ELSE RAISE EXCEPTION 'FASE INVÁLIDA.';
  END IF;

  IF EXISTS(SELECT 1 FROM public.ccfv_world_cup_matches WHERE season_id=p_season_id AND stage=new_stage) THEN RETURN
    CASE new_stage WHEN 'QUARTERFINALS' THEN 4 WHEN 'SEMIFINALS' THEN 2 ELSE 1 END;
  END IF;

  SELECT array_agg(winner_team_id ORDER BY match_order)
    INTO ids
  FROM public.ccfv_world_cup_matches
  WHERE season_id=p_season_id AND stage=p_stage AND status IN ('VALIDATED','WO','ADMIN_DECISION')
    AND winner_team_id IS NOT NULL;

  n:=CASE p_stage WHEN 'ROUND_OF_16' THEN 8 WHEN 'QUARTERFINALS' THEN 4 WHEN 'SEMIFINALS' THEN 2 ELSE 0 END;
  IF coalesce(array_length(ids,1),0)<>n THEN RAISE EXCEPTION 'A FASE % AINDA NÃO ESTÁ COMPLETA.',p_stage; END IF;

  FOR i IN 1..n/2 LOOP
    INSERT INTO public.ccfv_world_cup_matches(
      season_id,stage,tie_code,match_order,home_team_id,away_team_id
    ) VALUES (
      p_season_id,new_stage,
      CASE new_stage WHEN 'QUARTERFINALS' THEN 'QF-'||lpad(i::text,2,'0')
                     WHEN 'SEMIFINALS' THEN 'SF-'||lpad(i::text,2,'0')
                     ELSE 'FINAL' END,
      base_order+(i-1),ids[(i*2)-1],ids[i*2]
    );
  END LOOP;

  UPDATE public.ccfv_world_cup_seasons SET
    phase=CASE new_stage WHEN 'FINAL' THEN 'FINAL' ELSE new_stage END,
    status=CASE new_stage WHEN 'FINAL' THEN 'FINAL' ELSE 'KNOCKOUT' END,
    updated_at=now()
  WHERE id=p_season_id;
  INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
  VALUES(p_season_id,'GENERATE_'||new_stage,jsonb_build_object('matches',n/2),auth.uid());
  RETURN n/2;
END; $$;

GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_generate_round_of_16(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_generate_next_phase(uuid,text) TO authenticated;
