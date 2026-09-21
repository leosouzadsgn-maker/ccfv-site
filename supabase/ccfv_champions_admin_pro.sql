-- ============================================================
-- CCFV CHAMPIONS LEAGUE — ADMIN OPERACIONAL PRO
-- Complemento do schema + engine existentes.
--
-- Objetivo:
-- 1. Admin agenda partidas.
-- 2. Admin lança/valida resultados pela RPC existente.
-- 3. Admin recalcula classificação.
-- 4. Admin pode avançar manualmente uma fase quando necessário.
-- 5. Views públicas entregam slug/pote para renderização de escudos.
-- 6. Auditoria operacional de partidas/resultados/agendamento.
-- 7. Página pública pode consultar a mesma fonte oficial do Admin.
-- ============================================================

create or replace view public.championship_public_info
as
select
  ch.id,
  ch.code,
  ch.name,
  ch.season_number,
  ch.season_label,
  ch.status,
  ch.platform_scope,
  ch.max_participants,
  ch.total_clubs,
  ch.total_groups,
  ch.clubs_per_group,
  ch.participants_per_group,
  ch.qualifiers_per_group,
  ch.single_leg,
  ch.start_date,
  ch.end_date,
  ch.registration_open_at,
  ch.registration_close_at,
  ch.draw_at,
  ch.observations
from public.championships ch
where ch.code = 'CCFV-CL-S01';

grant select on public.championship_public_info to anon, authenticated;

create or replace view public.championship_public_clubs
as
select
  cc.id as championship_club_id,
  cc.championship_id,
  c.id as club_id,
  c.slug,
  c.name,
  c.short_name,
  c.country,
  c.logo_path,
  c.sort_order,
  cc.status,
  cc.pot_number,
  p.id as participant_id,
  p.name as participant_name,
  p.platform as participant_platform
from public.championship_clubs cc
join public.champions_clubs c
  on c.id = cc.club_id
left join public.players p
  on p.id = cc.participant_id;

create or replace view public.championship_public_standings
as
select
  s.id,
  s.championship_id,
  s.group_id,
  g.group_code,
  g.group_name,
  s.registration_id,
  s.club_id,
  c.slug as club_slug,
  c.name as club_name,
  c.short_name,
  c.country,
  c.logo_path,
  cc.pot_number,
  p.id as participant_id,
  p.name as participant_name,
  p.platform,
  s.position,
  s.played,
  s.wins,
  s.draws,
  s.losses,
  s.goals_for,
  s.goals_against,
  s.goal_difference,
  s.points,
  s.qualified
from public.championship_group_standings s
join public.championship_groups g
  on g.id = s.group_id
join public.championship_clubs cc
  on cc.id = s.club_id
join public.champions_clubs c
  on c.id = cc.club_id
join public.championship_registrations r
  on r.id = s.registration_id
join public.players p
  on p.id = r.participant_id;

create or replace view public.championship_public_matches
as
select
  m.id,
  m.championship_id,
  m.phase,
  m.round_number,
  m.match_number,
  m.group_id,
  m.bracket_slot,

  hr.participant_id as home_participant_id,
  ar.participant_id as away_participant_id,

  hp.name as home_player_name,
  ap.name as away_player_name,

  hc.id as home_club_catalog_id,
  ac.id as away_club_catalog_id,
  hc.slug as home_club_slug,
  ac.slug as away_club_slug,
  hc.name as home_club_name,
  ac.name as away_club_name,
  hc.short_name as home_club_short_name,
  ac.short_name as away_club_short_name,
  hc.country as home_country,
  ac.country as away_country,
  hc.logo_path as home_logo_path,
  ac.logo_path as away_logo_path,

  m.home_score,
  m.away_score,
  m.extra_time_played,
  m.home_score_extra_time,
  m.away_score_extra_time,
  m.penalties_played,
  m.home_penalties,
  m.away_penalties,
  m.winner_registration_id,
  m.winner_club_id,
  m.status,
  m.scheduled_at,
  m.played_at,

  r.validated as result_validated,
  r.validated_at,
  r.evidence_url,
  r.evidence_note,
  r.result_type,
  r.notes as result_notes

from public.championship_matches m

left join public.championship_registrations hr
  on hr.id = m.home_registration_id

left join public.championship_registrations ar
  on ar.id = m.away_registration_id

left join public.players hp
  on hp.id = hr.participant_id

left join public.players ap
  on ap.id = ar.participant_id

left join public.championship_clubs hca
  on hca.id = m.home_club_id

left join public.championship_clubs aca
  on aca.id = m.away_club_id

left join public.champions_clubs hc
  on hc.id = hca.club_id

left join public.champions_clubs ac
  on ac.id = aca.club_id

left join public.championship_results r
  on r.match_id = m.id;

grant select on public.championship_public_clubs to anon, authenticated;
grant select on public.championship_public_standings to anon, authenticated;
grant select on public.championship_public_matches to anon, authenticated;

-- ------------------------------------------------------------
-- Agenda de partida
-- ------------------------------------------------------------
create or replace function public.champions_schedule_match(
  p_match_id uuid,
  p_scheduled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.championship_matches%rowtype;
begin
  perform public.champions_require_authenticated();

  select *
    into v_match
  from public.championship_matches
  where id = p_match_id
  for update;

  if v_match.id is null then
    raise exception 'Partida não encontrada.';
  end if;

  if v_match.status in ('VALIDATED','WO','ADMIN_DECISION') then
    raise exception 'Não é possível reagendar uma partida já encerrada.';
  end if;

  if p_scheduled_at is null then
    raise exception 'Informe data e horário da partida.';
  end if;

  update public.championship_matches
  set
    scheduled_at = p_scheduled_at,
    updated_at = now()
  where id = p_match_id;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    entity_type,
    entity_id,
    payload,
    created_by
  )
  values(
    v_match.championship_id,
    'MATCH_SCHEDULED',
    v_match.phase,
    'MATCH',
    v_match.id,
    jsonb_build_object(
      'scheduled_at', p_scheduled_at
    ),
    auth.uid()
  );

  insert into public.audit_logs(
    admin_id,
    action,
    entity,
    entity_id,
    before_data,
    after_data
  )
  values(
    auth.uid(),
    'SCHEDULE_MATCH',
    'championship_matches',
    v_match.id,
    jsonb_build_object(
      'scheduled_at', v_match.scheduled_at
    ),
    jsonb_build_object(
      'scheduled_at', p_scheduled_at
    )
  );

  return jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'scheduled_at', p_scheduled_at
  );
end;
$$;

-- ------------------------------------------------------------
-- Recalcular todos os grupos de uma vez
-- ------------------------------------------------------------
create or replace function public.champions_recalculate_all_groups(
  p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group record;
  v_count integer := 0;
begin
  perform public.champions_require_authenticated();

  for v_group in
    select id
    from public.championship_groups
    where championship_id = p_championship_id
    order by display_order
  loop
    perform public.champions_recalculate_group_standings(
      p_championship_id,
      v_group.id
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'groups', v_count
  );
end;
$$;

-- ------------------------------------------------------------
-- Auditoria automática de alterações em partidas
-- ------------------------------------------------------------
create or replace function public.champions_audit_match_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(
      admin_id,
      action,
      entity,
      entity_id,
      before_data,
      after_data
    )
    values(
      auth.uid(),
      'CREATE_MATCH',
      'championship_matches',
      new.id,
      null,
      to_jsonb(new)
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.audit_logs(
      admin_id,
      action,
      entity,
      entity_id,
      before_data,
      after_data
    )
    values(
      auth.uid(),
      'UPDATE_MATCH',
      'championship_matches',
      new.id,
      to_jsonb(old),
      to_jsonb(new)
    );

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_champions_audit_match_change
on public.championship_matches;

create trigger trg_champions_audit_match_change
after insert or update
on public.championship_matches
for each row
execute function public.champions_audit_match_change();

notify pgrst, 'reload schema';
