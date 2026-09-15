-- CCFV CHAMPIONS — permissões do painel administrativo
-- Execute UMA vez no Supabase.

alter table public.championship_clubs enable row level security;
alter table public.championship_registrations enable row level security;

drop policy if exists ccfv_admin_championship_clubs_select
on public.championship_clubs;

create policy ccfv_admin_championship_clubs_select
on public.championship_clubs
for select
to authenticated
using (true);

drop policy if exists ccfv_admin_championship_clubs_write
on public.championship_clubs;

create policy ccfv_admin_championship_clubs_write
on public.championship_clubs
for all
to authenticated
using (true)
with check (true);

drop policy if exists ccfv_admin_championship_registrations_select
on public.championship_registrations;

create policy ccfv_admin_championship_registrations_select
on public.championship_registrations
for select
to authenticated
using (true);

drop policy if exists ccfv_admin_championship_registrations_write
on public.championship_registrations;

create policy ccfv_admin_championship_registrations_write
on public.championship_registrations
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete
on public.championship_clubs
to authenticated;

grant select, insert, update, delete
on public.championship_registrations
to authenticated;

notify pgrst, 'reload schema';

-- Conferência:
select
    count(*) as total_clubes,
    count(*) filter (where status = 'AVAILABLE') as disponiveis,
    count(*) filter (where participant_id is not null) as ocupados
from public.championship_clubs
where championship_id = '362284ef-e410-45b8-890b-630f1130f9d2';
