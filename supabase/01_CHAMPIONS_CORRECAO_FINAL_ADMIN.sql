-- ============================================================
-- CCFV CHAMPIONS — CORREÇÃO FINAL DE INTEGRAÇÃO
--
-- Execute uma única vez no Supabase SQL Editor.
-- Não recria os 32 clubes. Usa os clubes existentes da Season 01.
-- ============================================================

-- ------------------------------------------------------------
-- 1. VIEWS PÚBLICAS USADAS PELO SITE E PELO CADASTRO
-- ------------------------------------------------------------

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
    cc.club_id,
    c.name,
    c.short_name,
    c.slug,
    c.country,
    c.logo_path,
    c.sort_order,
    cc.status,
    cc.pot_number,
    cc.participant_id,
    p.name as participant_name,
    p.platform as participant_platform
from public.championship_clubs cc
join public.champions_clubs c
    on c.id = cc.club_id
left join public.players p
    on p.id = cc.participant_id;

grant select on public.championship_public_clubs to anon, authenticated;

-- ------------------------------------------------------------
-- 2. RPC ATÔMICA DO CADASTRO DO TREINADOR
--    Resolve RLS: o browser não grava diretamente nessas tabelas.
-- ------------------------------------------------------------

create or replace function public.champions_admin_assign_club(
    p_championship_id uuid,
    p_participant_id uuid,
    p_championship_club_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_champ public.championships%rowtype;
    v_player public.players%rowtype;
    v_club public.championship_clubs%rowtype;
    v_existing public.championship_registrations%rowtype;
    v_other public.championship_registrations%rowtype;
    v_uid uuid;
begin
    v_uid := auth.uid();

    if v_uid is null then
        raise exception 'Ação permitida somente para usuário autenticado.';
    end if;

    select * into v_champ
    from public.championships
    where id = p_championship_id
    for update;

    if v_champ.id is null then
        raise exception 'Temporada da Champions não encontrada.';
    end if;

    if v_champ.code <> 'CCFV-CL-S01' then
        raise exception 'Temporada inválida para este cadastro.';
    end if;

    if v_champ.status not in ('DRAFT','REGISTRATIONS','CLUB_SELECTION','DRAW') then
        raise exception 'A Champions já avançou para a fase % e não aceita novas inscrições.', v_champ.status;
    end if;

    select * into v_player
    from public.players
    where id = p_participant_id;

    if v_player.id is null then
        raise exception 'Jogador não encontrado.';
    end if;

    if upper(coalesce(v_player.platform,'')) = 'MOBILE' then
        raise exception 'A Champions League é exclusiva para PC e CONSOLE.';
    end if;

    select * into v_club
    from public.championship_clubs
    where id = p_championship_club_id
      and championship_id = p_championship_id
    for update;

    if v_club.id is null then
        raise exception 'Clube da Champions não encontrado nesta temporada.';
    end if;

    if v_club.status = 'BLOCKED' then
        raise exception 'Este clube está bloqueado.';
    end if;

    select * into v_existing
    from public.championship_registrations
    where championship_id = p_championship_id
      and participant_id = p_participant_id
    for update;

    select * into v_other
    from public.championship_registrations
    where championship_id = p_championship_id
      and selected_club_id = p_championship_club_id
      and participant_id <> p_participant_id
      and status not in ('WITHDRAWN','REJECTED')
    limit 1
    for update;

    if v_other.id is not null then
        raise exception 'Este clube já está vinculado a outro treinador.';
    end if;

    if v_existing.id is not null
       and v_existing.selected_club_id is not null
       and v_existing.selected_club_id <> p_championship_club_id then

        update public.championship_clubs
        set
            participant_id = null,
            status = 'AVAILABLE',
            pot_number = null,
            updated_at = now()
        where id = v_existing.selected_club_id
          and championship_id = p_championship_id;
    end if;

    insert into public.championship_registrations(
        championship_id,
        participant_id,
        priorities,
        selected_club_id,
        status,
        accepted_at,
        confirmed_by,
        confirmation_notes,
        updated_at
    )
    values(
        p_championship_id,
        p_participant_id,
        '[]'::jsonb,
        p_championship_club_id,
        'CONFIRMED',
        now(),
        v_uid,
        'Cadastro realizado pelo painel administrativo da CCFV.',
        now()
    )
    on conflict(championship_id, participant_id)
    do update set
        selected_club_id = excluded.selected_club_id,
        status = 'CONFIRMED',
        accepted_at = coalesce(public.championship_registrations.accepted_at, excluded.accepted_at),
        confirmed_by = excluded.confirmed_by,
        confirmation_notes = excluded.confirmation_notes,
        updated_at = now();

    update public.championship_clubs
    set
        participant_id = p_participant_id,
        status = 'CONFIRMED',
        updated_at = now()
    where id = p_championship_club_id
      and championship_id = p_championship_id;

    -- Mantém a lista geral de competições do jogador sincronizada.
    delete from public.player_competitions
    where player_id = p_participant_id
      and upper(coalesce(competition,'')) = 'CHAMPIONS_LEAGUE';

    insert into public.player_competitions(
        player_id,
        competition,
        team_name
    )
    values(
        p_participant_id,
        'CHAMPIONS_LEAGUE',
        (select c.name
         from public.championship_clubs cc
         join public.champions_clubs c on c.id = cc.club_id
         where cc.id = p_championship_club_id)
    );

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
        p_championship_id,
        'REGISTRATION_CONFIRMED',
        v_champ.status,
        'PLAYER',
        p_participant_id,
        jsonb_build_object(
            'championship_club_id', p_championship_club_id,
            'participant_name', v_player.name
        ),
        v_uid
    );

    return jsonb_build_object(
        'success', true,
        'championship_id', p_championship_id,
        'participant_id', p_participant_id,
        'championship_club_id', p_championship_club_id,
        'club_name', (
            select c.name
            from public.championship_clubs cc
            join public.champions_clubs c on c.id = cc.club_id
            where cc.id = p_championship_club_id
        )
    );
end;
$$;

create or replace function public.champions_admin_remove_registration(
    p_championship_id uuid,
    p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_registration public.championship_registrations%rowtype;
    v_uid uuid;
begin
    v_uid := auth.uid();

    if v_uid is null then
        raise exception 'Ação permitida somente para usuário autenticado.';
    end if;

    select * into v_registration
    from public.championship_registrations
    where championship_id = p_championship_id
      and participant_id = p_participant_id
    for update;

    if v_registration.id is null then
        return jsonb_build_object(
            'success', true,
            'message', 'Participante não estava inscrito.'
        );
    end if;

    update public.championship_clubs
    set
        participant_id = null,
        status = 'AVAILABLE',
        pot_number = null,
        updated_at = now()
    where id = v_registration.selected_club_id
      and championship_id = p_championship_id;

    delete from public.championship_registrations
    where id = v_registration.id;

    delete from public.player_competitions
    where player_id = p_participant_id
      and upper(coalesce(competition,'')) = 'CHAMPIONS_LEAGUE';

    return jsonb_build_object(
        'success', true,
        'participant_id', p_participant_id
    );
end;
$$;

revoke all on function public.champions_admin_assign_club(uuid,uuid,uuid) from public;
revoke all on function public.champions_admin_remove_registration(uuid,uuid) from public;
grant execute on function public.champions_admin_assign_club(uuid,uuid,uuid) to authenticated;
grant execute on function public.champions_admin_remove_registration(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
