-- =========================================================
-- CCFV CHAMPIONS — CORREÇÃO DEFINITIVA DE INTEGRAÇÃO
-- =========================================================
-- Problemas resolvidos:
-- 1) UI não consulta mais diretamente championships.
-- 2) UI não consulta mais diretamente championship_clubs.
-- 3) UI não consulta mais diretamente championship_registrations.
-- 4) O frontend recebe os 32 clubes pela view pública.
-- 5) Cadastro/alteração do clube usa RPC SECURITY DEFINER.
-- 6) O vínculo jogador <-> clube fica atômico no banco.
-- 7) Corrige a nomenclatura da view: o campo do clube é "name".
--
-- Executar UMA vez no Supabase SQL Editor.
-- =========================================================

create or replace view public.championship_public_info as
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

grant select on public.championship_public_info
to anon, authenticated;


create or replace view public.championship_public_clubs_options as
select
    cc.id as championship_club_id,
    cc.championship_id,
    cc.club_id,
    c.slug,
    c.name,
    c.short_name,
    c.country,
    c.logo_path,
    c.sort_order,
    cc.status,
    cc.participant_id,
    p.name as participant_name,
    p.platform as participant_platform
from public.championship_clubs cc
join public.champions_clubs c
    on c.id = cc.club_id
left join public.players p
    on p.id = cc.participant_id
where c.active = true;

grant select on public.championship_public_clubs_options
to anon, authenticated;


create or replace function public.champions_register_player(
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
    v_platform text;
    v_player_status text;
    v_season_status text;
    v_max integer;
    v_confirmed integer;
    v_registration_id uuid;
    v_old_club_id uuid;
    v_target_participant uuid;
    v_target_championship uuid;
    v_club_name text;
begin
    perform public.champions_require_authenticated();

    /*
     * Jogador
     */
    select
        upper(coalesce(platform,'')),
        upper(coalesce(status,''))
    into
        v_platform,
        v_player_status
    from public.players
    where id = p_participant_id;

    if not found then
        raise exception 'Jogador não encontrado.';
    end if;

    if v_platform not in ('PC','CONSOLE') then
        raise exception 'A Champions League aceita somente jogadores PC ou CONSOLE.';
    end if;

    if v_player_status <> 'ACTIVE' then
        raise exception 'O jogador precisa estar ACTIVE para participar da Champions.';
    end if;

    /*
     * Temporada
     */
    select
        status,
        max_participants
    into
        v_season_status,
        v_max
    from public.championships
    where id = p_championship_id
      and code = 'CCFV-CL-S01';

    if not found then
        raise exception 'Season 01 da Champions não encontrada.';
    end if;

    if v_season_status not in (
        'DRAFT',
        'REGISTRATIONS',
        'CLUB_SELECTION',
        'DRAW'
    ) then
        raise exception 'As inscrições estão encerradas na fase %.', v_season_status;
    end if;

    /*
     * Clubes-alvo.
     * FOR UPDATE evita duas inscrições simultâneas
     * no mesmo clube.
     */
    select
        championship_id,
        participant_id,
        c.name
    into
        v_target_championship,
        v_target_participant,
        v_club_name
    from public.championship_clubs cc
    join public.champions_clubs c
        on c.id = cc.club_id
    where cc.id = p_championship_club_id
    for update;

    if not found then
        raise exception 'Clube da Champions não encontrado.';
    end if;

    if v_target_championship <> p_championship_id then
        raise exception 'O clube selecionado não pertence à Season 01.';
    end if;

    if v_target_participant is not null
       and v_target_participant <> p_participant_id then
        raise exception 'Este clube já está vinculado a outro treinador.';
    end if;

    /*
     * Inscrição atual do jogador.
     */
    select
        id,
        selected_club_id
    into
        v_registration_id,
        v_old_club_id
    from public.championship_registrations
    where championship_id = p_championship_id
      and participant_id = p_participant_id
    for update;

    /*
     * Limite de 32 somente para jogador novo.
     */
    if v_registration_id is null then

        select count(*)
        into v_confirmed
        from public.championship_registrations
        where championship_id = p_championship_id
          and status = 'CONFIRMED';

        if v_confirmed >= v_max then
            raise exception 'A Champions League já está com as 32 vagas preenchidas.';
        end if;

    end if;

    /*
     * Libera o clube anterior, se houver troca.
     */
    if v_old_club_id is not null
       and v_old_club_id <> p_championship_club_id then

        update public.championship_clubs
        set
            participant_id = null,
            status = 'AVAILABLE',
            pot_number = null,
            updated_at = now()
        where id = v_old_club_id
          and championship_id = p_championship_id
          and participant_id = p_participant_id;

    end if;

    /*
     * Reserva/confirma o clube novo.
     */
    update public.championship_clubs
    set
        participant_id = p_participant_id,
        status = 'CONFIRMED',
        updated_at = now()
    where id = p_championship_club_id
      and championship_id = p_championship_id;

    /*
     * Upsert da inscrição.
     */
    insert into public.championship_registrations(
        championship_id,
        participant_id,
        selected_club_id,
        status,
        accepted_at
    )
    values(
        p_championship_id,
        p_participant_id,
        p_championship_club_id,
        'CONFIRMED',
        now()
    )
    on conflict(championship_id, participant_id)
    do update set
        selected_club_id = excluded.selected_club_id,
        status = 'CONFIRMED',
        accepted_at = coalesce(
            public.championship_registrations.accepted_at,
            now()
        ),
        updated_at = now()
    returning id into v_registration_id;

    /*
     * Evento de auditoria da Champions.
     * Falhas de auditoria não podem impedir o cadastro.
     */
    begin
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
            'PLAYER_CLUB_ASSIGNED',
            'REGISTRATIONS',
            'CHAMPIONSHIP_REGISTRATION',
            v_registration_id,
            jsonb_build_object(
                'participant_id', p_participant_id,
                'championship_club_id', p_championship_club_id,
                'club_name', v_club_name
            ),
            auth.uid()
        );
    exception
        when others then
            null;
    end;

    return jsonb_build_object(
        'success', true,
        'championship_id', p_championship_id,
        'registration_id', v_registration_id,
        'participant_id', p_participant_id,
        'championship_club_id', p_championship_club_id,
        'club_name', v_club_name
    );
end;
$$;


create or replace function public.champions_unregister_player(
    p_championship_id uuid,
    p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status text;
    v_registration_id uuid;
    v_club_id uuid;
begin
    perform public.champions_require_authenticated();

    select status
    into v_status
    from public.championships
    where id = p_championship_id
      and code = 'CCFV-CL-S01';

    if v_status is null then
        raise exception 'Season 01 da Champions não encontrada.';
    end if;

    if v_status not in (
        'DRAFT',
        'REGISTRATIONS',
        'CLUB_SELECTION',
        'DRAW'
    ) then
        raise exception 'Não é possível cancelar inscrição após o início da competição.';
    end if;

    select
        id,
        selected_club_id
    into
        v_registration_id,
        v_club_id
    from public.championship_registrations
    where championship_id = p_championship_id
      and participant_id = p_participant_id
    for update;

    if v_registration_id is null then
        return jsonb_build_object(
            'success', true,
            'removed', false
        );
    end if;

    delete from public.championship_registrations
    where id = v_registration_id;

    if v_club_id is not null then
        update public.championship_clubs
        set
            participant_id = null,
            status = 'AVAILABLE',
            pot_number = null,
            updated_at = now()
        where id = v_club_id
          and championship_id = p_championship_id
          and participant_id = p_participant_id;
    end if;

    return jsonb_build_object(
        'success', true,
        'removed', true
    );
end;
$$;


revoke all on function public.champions_register_player(uuid,uuid,uuid)
from public;

grant execute on function public.champions_register_player(uuid,uuid,uuid)
to authenticated;

revoke all on function public.champions_unregister_player(uuid,uuid)
from public;

grant execute on function public.champions_unregister_player(uuid,uuid)
to authenticated;


-- Garante que as views públicas atuais também exponham
-- leitura para o navegador.
grant select on public.championship_public_clubs
to anon, authenticated;

grant select on public.championship_public_standings
to anon, authenticated;

grant select on public.championship_public_matches
to anon, authenticated;


notify pgrst, 'reload schema';
