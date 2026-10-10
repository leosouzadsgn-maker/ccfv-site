-- ============================================================
-- CCFV ELO — COPA DO MUNDO + LIBERTADORES
-- Migração aditiva: preserva os RPCs existentes de resultado.
-- Pontuação da competição segue separada do ELO individual.
-- ============================================================

BEGIN;

-- 1. Ledger idempotente: o mesmo evento não pode contar duas vezes.
CREATE TABLE IF NOT EXISTS public.ccfv_competition_elo_awards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_code text NOT NULL
        CHECK (competition_code IN ('COPA_DO_MUNDO','LIBERTADORES')),
    season_id uuid NOT NULL,
    event_key text NOT NULL,
    source_match_id uuid,
    player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    result_code text NOT NULL
        CHECK (result_code IN ('WIN','DRAW','LOSS','CHAMPION','RUNNER_UP')),
    elo_delta integer NOT NULL,
    elo_before integer,
    elo_after integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ccfv_competition_elo_awards_once
        UNIQUE (competition_code,event_key,player_id)
);

CREATE INDEX IF NOT EXISTS idx_ccfv_competition_elo_awards_player
    ON public.ccfv_competition_elo_awards(player_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ccfv_competition_elo_awards_season
    ON public.ccfv_competition_elo_awards(competition_code,season_id,created_at DESC);

ALTER TABLE public.ccfv_competition_elo_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ccfv_competition_elo_awards FROM anon, authenticated;

-- 2. Aplica o ELO e as estatísticas ao jogador uma única vez por evento.
-- O trigger já existente em players sincroniza o ranking global.
CREATE OR REPLACE FUNCTION public.ccfv_apply_competition_elo_awards(
    p_competition_code text,
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
    IF p_competition_code NOT IN ('COPA_DO_MUNDO','LIBERTADORES') THEN
        RAISE EXCEPTION 'CÓDIGO DE COMPETIÇÃO INVÁLIDO.';
    END IF;

    IF p_season_id IS NULL OR NULLIF(p_event_key,'') IS NULL THEN
        RAISE EXCEPTION 'TEMPORADA E EVENTO SÃO OBRIGATÓRIOS.';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_competition_code||':'||p_event_key,0)
    );

    FOR v_item IN
        SELECT
            NULLIF(item->>'player_id','')::uuid AS player_id,
            COALESCE(NULLIF(item->>'delta','')::integer,0) AS elo_delta,
            COALESCE(NULLIF(item->>'result',''),'WIN') AS result_code
        FROM jsonb_array_elements(COALESCE(p_awards,'[]'::jsonb)) AS awards(item)
        WHERE NULLIF(item->>'player_id','') IS NOT NULL
    LOOP
        v_award_id := NULL;

        SELECT COALESCE(elo,0)
          INTO v_before
        FROM public.players
        WHERE id=v_item.player_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'JOGADOR % NÃO ENCONTRADO.',v_item.player_id;
        END IF;

        INSERT INTO public.ccfv_competition_elo_awards(
            competition_code,season_id,event_key,source_match_id,
            player_id,result_code,elo_delta,elo_before,elo_after
        )
        VALUES(
            p_competition_code,p_season_id,p_event_key,p_source_match_id,
            v_item.player_id,v_item.result_code,v_item.elo_delta,v_before,NULL
        )
        ON CONFLICT (competition_code,event_key,player_id) DO NOTHING
        RETURNING id INTO v_award_id;

        -- Resultado reenviado ou fechamento repetido: não soma novamente.
        IF v_award_id IS NULL THEN
            CONTINUE;
        END IF;

        UPDATE public.players
        SET
            elo=GREATEST(0,COALESCE(elo,0)+v_item.elo_delta),
            wins=COALESCE(wins,0)+CASE WHEN v_item.result_code='WIN' THEN 1 ELSE 0 END,
            draws=COALESCE(draws,0)+CASE WHEN v_item.result_code='DRAW' THEN 1 ELSE 0 END,
            losses=COALESCE(losses,0)+CASE WHEN v_item.result_code='LOSS' THEN 1 ELSE 0 END
        WHERE id=v_item.player_id
        RETURNING COALESCE(elo,0) INTO v_after;

        UPDATE public.ccfv_competition_elo_awards
        SET elo_after=v_after
        WHERE id=v_award_id;

        v_applied := v_applied+1;
    END LOOP;

    RETURN v_applied;
END;
$$;

REVOKE ALL ON FUNCTION public.ccfv_apply_competition_elo_awards(text,uuid,text,uuid,jsonb)
    FROM PUBLIC, anon, authenticated;

-- 3. Bloqueia edição de placar depois de o resultado já ter entrado no Elo.
-- Para corrigir um placar contabilizado, faça uma correção administrativa controlada.
CREATE OR REPLACE FUNCTION public.ccfv_wc_guard_elo_result_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status IN ('VALIDATED','WO','ADMIN_DECISION')
       AND EXISTS (
           SELECT 1 FROM public.ccfv_competition_elo_awards
           WHERE competition_code='COPA_DO_MUNDO'
             AND event_key='MATCH:'||OLD.id::text
       )
       AND (
           NEW.home_score IS DISTINCT FROM OLD.home_score
           OR NEW.away_score IS DISTINCT FROM OLD.away_score
           OR NEW.home_penalties IS DISTINCT FROM OLD.home_penalties
           OR NEW.away_penalties IS DISTINCT FROM OLD.away_penalties
           OR NEW.status IS DISTINCT FROM OLD.status
       ) THEN
        RAISE EXCEPTION 'RESULTADO JÁ CONTABILIZADO NO ELO. SOLICITE UMA CORREÇÃO ADMINISTRATIVA PARA PRESERVAR O RANKING.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ccfv_wc_guard_elo_result_change
    ON public.ccfv_world_cup_matches;
CREATE TRIGGER trg_ccfv_wc_guard_elo_result_change
BEFORE UPDATE ON public.ccfv_world_cup_matches
FOR EACH ROW EXECUTE FUNCTION public.ccfv_wc_guard_elo_result_change();

-- 4. Copa do Mundo: grupos +24/+8/-12; mata-mata +28/-14.
CREATE OR REPLACE FUNCTION public.ccfv_wc_award_elo_after_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_home_player uuid;
    v_away_player uuid;
    v_home_delta integer;
    v_away_delta integer;
    v_home_result text;
    v_away_result text;
    v_awards jsonb;
BEGIN
    IF NEW.status NOT IN ('VALIDATED','WO','ADMIN_DECISION')
       OR NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.ccfv_competition_elo_awards
        WHERE competition_code='COPA_DO_MUNDO'
          AND event_key='MATCH:'||NEW.id::text
    ) THEN
        RETURN NEW;
    END IF;

    SELECT home_team.participant_id, away_team.participant_id
      INTO v_home_player, v_away_player
    FROM public.ccfv_world_cup_teams home_team
    JOIN public.ccfv_world_cup_teams away_team
      ON away_team.id=NEW.away_team_id
    WHERE home_team.id=NEW.home_team_id;

    IF NEW.stage='GROUP_STAGE' THEN
        IF NEW.home_score > NEW.away_score THEN
            v_home_delta:=24; v_away_delta:=-12;
            v_home_result:='WIN'; v_away_result:='LOSS';
        ELSIF NEW.home_score < NEW.away_score THEN
            v_home_delta:=-12; v_away_delta:=24;
            v_home_result:='LOSS'; v_away_result:='WIN';
        ELSE
            v_home_delta:=8; v_away_delta:=8;
            v_home_result:='DRAW'; v_away_result:='DRAW';
        END IF;
    ELSE
        IF NEW.winner_team_id IS NULL THEN
            RETURN NEW;
        END IF;
        IF NEW.winner_team_id=NEW.home_team_id THEN
            v_home_delta:=28; v_away_delta:=-14;
            v_home_result:='WIN'; v_away_result:='LOSS';
        ELSE
            v_home_delta:=-14; v_away_delta:=28;
            v_home_result:='LOSS'; v_away_result:='WIN';
        END IF;
    END IF;

    v_awards:=jsonb_build_array(
        jsonb_build_object('player_id',v_home_player,'delta',v_home_delta,'result',v_home_result),
        jsonb_build_object('player_id',v_away_player,'delta',v_away_delta,'result',v_away_result)
    );

    PERFORM public.ccfv_apply_competition_elo_awards(
        'COPA_DO_MUNDO',NEW.season_id,'MATCH:'||NEW.id::text,NEW.id,v_awards
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ccfv_wc_award_elo_after_result
    ON public.ccfv_world_cup_matches;
CREATE TRIGGER trg_ccfv_wc_award_elo_after_result
AFTER INSERT OR UPDATE ON public.ccfv_world_cup_matches
FOR EACH ROW EXECUTE FUNCTION public.ccfv_wc_award_elo_after_result();

-- 5. Libertadores: grupos +24/+8/-12; mata-mata +28/-14 uma vez
-- quando a chave de ida e volta for decidida (na volta).
CREATE OR REPLACE FUNCTION public.ccfv_lib_guard_elo_result_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_key text;
BEGIN
    IF OLD.stage IN ('GROUP_STAGE','FINAL') THEN
        v_event_key:='MATCH:'||OLD.id::text;
    ELSE
        v_event_key:='TIE:'||OLD.stage||':'||COALESCE(OLD.tie_code,OLD.id::text);
    END IF;

    IF OLD.status IN ('VALIDATED','WO','ADMIN_DECISION')
       AND EXISTS (
           SELECT 1 FROM public.ccfv_competition_elo_awards
           WHERE competition_code='LIBERTADORES' AND event_key=v_event_key
       )
       AND (
           NEW.home_score IS DISTINCT FROM OLD.home_score
           OR NEW.away_score IS DISTINCT FROM OLD.away_score
           OR NEW.home_extra_score IS DISTINCT FROM OLD.home_extra_score
           OR NEW.away_extra_score IS DISTINCT FROM OLD.away_extra_score
           OR NEW.home_penalties IS DISTINCT FROM OLD.home_penalties
           OR NEW.away_penalties IS DISTINCT FROM OLD.away_penalties
           OR NEW.status IS DISTINCT FROM OLD.status
       ) THEN
        RAISE EXCEPTION 'RESULTADO JÁ CONTABILIZADO NO ELO. SOLICITE UMA CORREÇÃO ADMINISTRATIVA PARA PRESERVAR O RANKING.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ccfv_lib_guard_elo_result_change
    ON public.ccfv_libertadores_matches;
CREATE TRIGGER trg_ccfv_lib_guard_elo_result_change
BEFORE UPDATE ON public.ccfv_libertadores_matches
FOR EACH ROW EXECUTE FUNCTION public.ccfv_lib_guard_elo_result_change();

CREATE OR REPLACE FUNCTION public.ccfv_lib_award_elo_after_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_home_player uuid;
    v_away_player uuid;
    v_home integer;
    v_away integer;
    v_home_delta integer;
    v_away_delta integer;
    v_home_result text;
    v_away_result text;
    v_event_key text;
    v_awards jsonb;
BEGIN
    IF NEW.status NOT IN ('VALIDATED','WO','ADMIN_DECISION')
       OR NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT home_club.participant_id, away_club.participant_id
      INTO v_home_player, v_away_player
    FROM public.ccfv_libertadores_clubs home_club
    JOIN public.ccfv_libertadores_clubs away_club
      ON away_club.id=NEW.away_club_id
    WHERE home_club.id=NEW.home_club_id;

    IF NEW.stage='GROUP_STAGE' THEN
        v_event_key:='MATCH:'||NEW.id::text;
        v_home:=COALESCE(NEW.home_score,0)+COALESCE(NEW.home_extra_score,0);
        v_away:=COALESCE(NEW.away_score,0)+COALESCE(NEW.away_extra_score,0);

        IF v_home>v_away THEN
            v_home_delta:=24; v_away_delta:=-12;
            v_home_result:='WIN'; v_away_result:='LOSS';
        ELSIF v_home<v_away THEN
            v_home_delta:=-12; v_away_delta:=24;
            v_home_result:='LOSS'; v_away_result:='WIN';
        ELSE
            v_home_delta:=8; v_away_delta:=8;
            v_home_result:='DRAW'; v_away_result:='DRAW';
        END IF;

    ELSIF NEW.stage='FINAL' AND NEW.winner_club_id IS NOT NULL THEN
        v_event_key:='MATCH:'||NEW.id::text;
        IF NEW.winner_club_id=NEW.home_club_id THEN
            v_home_delta:=28; v_away_delta:=-14;
            v_home_result:='WIN'; v_away_result:='LOSS';
        ELSE
            v_home_delta:=-14; v_away_delta:=28;
            v_home_result:='LOSS'; v_away_result:='WIN';
        END IF;

    ELSIF NEW.stage IN ('ROUND_OF_16','QUARTERFINALS','SEMIFINALS')
       AND NEW.leg=2 AND NEW.winner_club_id IS NOT NULL THEN
        v_event_key:='TIE:'||NEW.stage||':'||COALESCE(NEW.tie_code,NEW.id::text);
        IF NEW.winner_club_id=NEW.home_club_id THEN
            v_home_delta:=28; v_away_delta:=-14;
            v_home_result:='WIN'; v_away_result:='LOSS';
        ELSE
            v_home_delta:=-14; v_away_delta:=28;
            v_home_result:='LOSS'; v_away_result:='WIN';
        END IF;
    ELSE
        -- O primeiro jogo da chave não dá bônus; aguarda a decisão do agregado.
        RETURN NEW;
    END IF;

    v_awards:=jsonb_build_array(
        jsonb_build_object('player_id',v_home_player,'delta',v_home_delta,'result',v_home_result),
        jsonb_build_object('player_id',v_away_player,'delta',v_away_delta,'result',v_away_result)
    );

    PERFORM public.ccfv_apply_competition_elo_awards(
        'LIBERTADORES',NEW.season_id,v_event_key,NEW.id,v_awards
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ccfv_lib_award_elo_after_result
    ON public.ccfv_libertadores_matches;
CREATE TRIGGER trg_ccfv_lib_award_elo_after_result
AFTER INSERT OR UPDATE ON public.ccfv_libertadores_matches
FOR EACH ROW EXECUTE FUNCTION public.ccfv_lib_award_elo_after_result();

-- 6. Copa do Mundo: fechamento oficial, bônus uma vez, título e próxima temporada.
CREATE OR REPLACE FUNCTION public.ccfv_world_cup_finish_season(p_season_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_season public.ccfv_world_cup_seasons%ROWTYPE;
  v_final public.ccfv_world_cup_matches%ROWTYPE;
  v_winner public.ccfv_world_cup_teams%ROWTYPE;
  v_runner public.ccfv_world_cup_teams%ROWTYPE;
  v_next uuid;
  v_awards jsonb;
  v_title_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  SELECT * INTO v_season
  FROM public.ccfv_world_cup_seasons
  WHERE id=p_season_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.'; END IF;

  SELECT * INTO v_final
  FROM public.ccfv_world_cup_matches
  WHERE season_id=p_season_id AND stage='FINAL'
  ORDER BY match_order DESC LIMIT 1;
  IF NOT FOUND OR v_final.status NOT IN ('VALIDATED','WO','ADMIN_DECISION') THEN
    RAISE EXCEPTION 'A FINAL DA COPA AINDA NÃO FOI VALIDADA.';
  END IF;

  IF v_season.phase='FINISHED' OR v_season.status='FINISHED' THEN
    RETURN jsonb_build_object(
      'ok',true,'already_finished',true,'champion_team_id',v_final.winner_team_id,
      'next_season_id',(SELECT id FROM public.ccfv_world_cup_seasons WHERE season_number=v_season.season_number+1)
    );
  END IF;

  IF v_season.phase<>'FINAL' THEN
    RAISE EXCEPTION 'A TEMPORADA PRECISA ESTAR NA FINAL PARA SER ENCERRADA.';
  END IF;
  IF v_final.winner_team_id IS NULL THEN RAISE EXCEPTION 'A FINAL PRECISA TER UM CAMPEÃO.'; END IF;

  SELECT * INTO v_winner FROM public.ccfv_world_cup_teams WHERE id=v_final.winner_team_id;
  SELECT * INTO v_runner
  FROM public.ccfv_world_cup_teams
  WHERE id=CASE WHEN v_final.home_team_id=v_winner.id THEN v_final.away_team_id ELSE v_final.home_team_id END;

  UPDATE public.ccfv_world_cup_teams
  SET status=CASE WHEN id=v_winner.id THEN 'CHAMPION' WHEN id=v_runner.id THEN 'ELIMINATED' ELSE status END,
      updated_at=now()
  WHERE season_id=p_season_id;

  UPDATE public.ccfv_world_cup_seasons
  SET status='FINISHED',phase='FINISHED',updated_at=now()
  WHERE id=p_season_id;

  v_awards:=jsonb_build_array(
    jsonb_build_object('player_id',v_winner.participant_id,'delta',150,'result','CHAMPION'),
    jsonb_build_object('player_id',v_runner.participant_id,'delta',75,'result','RUNNER_UP')
  );
  PERFORM public.ccfv_apply_competition_elo_awards(
    'COPA_DO_MUNDO',p_season_id,'TITLE:'||p_season_id::text,v_final.id,v_awards
  );

  IF v_winner.participant_id IS NOT NULL THEN
    INSERT INTO public.ccfv_titles(
      player_id,competition_code,competition_name,season,platform,team_name,club_name,club_logo,title,source_id
    )
    SELECT v_winner.participant_id,'COPA_DO_MUNDO','COPA DO MUNDO',v_season.season_label,p.platform,
           v_winner.name,v_winner.name,NULL,'CAMPEÃO',v_final.id
    FROM public.players p WHERE p.id=v_winner.participant_id
    ON CONFLICT (player_id,competition_code,season) DO NOTHING
    RETURNING id INTO v_title_id;

    IF v_title_id IS NOT NULL THEN
      UPDATE public.players SET titles=COALESCE(titles,0)+1 WHERE id=v_winner.participant_id;
    END IF;
  END IF;

  INSERT INTO public.ccfv_world_cup_audit(season_id,action,payload,actor_id)
  VALUES(p_season_id,'FINISH_SEASON',jsonb_build_object('champion_team_id',v_winner.id,'runner_up_team_id',v_runner.id),auth.uid());

  SELECT public.ccfv_world_cup_create_next_season(
    v_season.season_number+1,
    'SEASON '||lpad((v_season.season_number+1)::text,2,'0')
  ) INTO v_next;

  RETURN jsonb_build_object('ok',true,'champion_team_id',v_winner.id,'next_season_id',v_next);
END;
$$;

-- 7. Libertadores: o botão do Admin é o único caminho de fechamento;
-- concede +90 campeão / +45 vice ao encerrar oficialmente.
CREATE OR REPLACE FUNCTION public.ccfv_libertadores_finish_season(p_season_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_phase text;
  v_match public.ccfv_libertadores_matches%ROWTYPE;
  v_club public.ccfv_libertadores_clubs%ROWTYPE;
  v_runner public.ccfv_libertadores_clubs%ROWTYPE;
  v_player public.players%ROWTYPE;
  v_title_id uuid;
  v_awards jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  SELECT phase INTO v_phase FROM public.ccfv_libertadores_seasons
  WHERE id=p_season_id FOR UPDATE;
  IF v_phase IS NULL THEN RAISE EXCEPTION 'TEMPORADA NÃO ENCONTRADA.'; END IF;

  SELECT * INTO v_match FROM public.ccfv_libertadores_matches
  WHERE season_id=p_season_id AND stage='FINAL'
  ORDER BY match_order DESC LIMIT 1;
  IF NOT FOUND OR v_match.status NOT IN ('VALIDATED','WO','ADMIN_DECISION') THEN
    RAISE EXCEPTION 'A FINAL AINDA NÃO FOI VALIDADA.';
  END IF;

  IF v_phase='FINISHED' THEN
    SELECT * INTO v_club FROM public.ccfv_libertadores_clubs WHERE id=v_match.winner_club_id;
    RETURN jsonb_build_object('ok',true,'already_finished',true,'champion_club_id',v_club.id,'champion_player_id',v_club.participant_id);
  END IF;
  IF v_phase<>'FINAL' THEN RAISE EXCEPTION 'A TEMPORADA AINDA NÃO ESTÁ NA FINAL.'; END IF;
  IF v_match.winner_club_id IS NULL THEN RAISE EXCEPTION 'A FINAL PRECISA TER UM CAMPEÃO DEFINIDO.'; END IF;

  SELECT * INTO v_club FROM public.ccfv_libertadores_clubs WHERE id=v_match.winner_club_id;
  SELECT * INTO v_runner FROM public.ccfv_libertadores_clubs
  WHERE id=CASE WHEN v_match.home_club_id=v_club.id THEN v_match.away_club_id ELSE v_match.home_club_id END;
  IF v_club.participant_id IS NULL THEN RAISE EXCEPTION 'O CAMPEÃO NÃO POSSUI JOGADOR VINCULADO.'; END IF;
  SELECT * INTO v_player FROM public.players WHERE id=v_club.participant_id;

  v_awards:=jsonb_build_array(
    jsonb_build_object('player_id',v_club.participant_id,'delta',90,'result','CHAMPION'),
    jsonb_build_object('player_id',v_runner.participant_id,'delta',45,'result','RUNNER_UP')
  );
  PERFORM public.ccfv_apply_competition_elo_awards(
    'LIBERTADORES',p_season_id,'TITLE:'||p_season_id::text,v_match.id,v_awards
  );

  UPDATE public.ccfv_libertadores_clubs SET status='CHAMPION',updated_at=now() WHERE id=v_club.id;
  UPDATE public.ccfv_libertadores_seasons
  SET phase='FINISHED',status='FINISHED',end_at=now(),updated_at=now()
  WHERE id=p_season_id;

  INSERT INTO public.ccfv_titles(
    player_id,competition_code,competition_name,season,platform,team_name,club_name,club_logo,title,source_id
  ) VALUES (
    v_club.participant_id,'LIBERTADORES','LIBERTADORES CCFV',
    (SELECT season_label FROM public.ccfv_libertadores_seasons WHERE id=p_season_id),
    v_player.platform,v_club.name,v_club.name,v_club.logo_path,'CAMPEÃO',v_match.id
  )
  ON CONFLICT (player_id,competition_code,season) DO NOTHING
  RETURNING id INTO v_title_id;

  IF v_title_id IS NOT NULL THEN
    UPDATE public.players SET titles=COALESCE(titles,0)+1 WHERE id=v_club.participant_id;
  END IF;

  INSERT INTO public.ccfv_libertadores_audit(season_id,action,payload,actor_id)
  VALUES(
    p_season_id,'FINISH_SEASON',
    jsonb_build_object('champion_club_id',v_club.id,'champion_player_id',v_club.participant_id,
                       'champion_player_name',v_player.name,'runner_up_club_id',v_runner.id,
                       'runner_up_player_id',v_runner.participant_id),
    auth.uid()
  );

  RETURN jsonb_build_object('ok',true,'champion_club_id',v_club.id,
                            'champion_player_id',v_club.participant_id,'runner_up_club_id',v_runner.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ccfv_world_cup_finish_season(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ccfv_libertadores_finish_season(uuid) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
