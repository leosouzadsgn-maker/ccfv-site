-- CCFV CHAMPIONS — TESTE OPERACIONAL
-- Execute depois da instalação.

select
  'CHAMPIONS_CLUBS' as item,
  count(*)::integer as total
from public.champions_clubs
where active = true

union all

select
  'CHAMPIONS_SEASON_01',
  count(*)::integer
from public.championships
where code = 'CCFV-CL-S01'

union all

select
  'CHAMPIONS_CLUBS_SEASON_01',
  count(*)::integer
from public.championship_clubs cc
join public.championships ch
  on ch.id = cc.championship_id
where ch.code = 'CCFV-CL-S01'

union all

select
  'CHAMPIONS_REGISTRATIONS_SEASON_01',
  count(*)::integer
from public.championship_registrations r
join public.championships ch
  on ch.id = r.championship_id
where ch.code = 'CCFV-CL-S01';

select
  status,
  count(*)::integer as total
from public.championship_matches m
join public.championships ch
  on ch.id = m.championship_id
where ch.code = 'CCFV-CL-S01'
group by status
order by status;

select
  phase,
  count(*)::integer as total
from public.championship_matches m
join public.championships ch
  on ch.id = m.championship_id
where ch.code = 'CCFV-CL-S01'
group by phase
order by phase;

select
  'RPC_SCHEDULE' as check_name,
  count(*)::integer as total
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'champions_schedule_match'

union all

select
  'RPC_RECALCULATE_ALL',
  count(*)::integer
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'champions_recalculate_all_groups'

union all

select
  'RPC_SUBMIT_RESULT',
  count(*)::integer
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'champions_submit_result';

select
  'PUBLIC_VIEWS' as check_name,
  count(*)::integer as total
from pg_views
where schemaname = 'public'
  and viewname in (
    'championship_public_info',
    'championship_public_clubs',
    'championship_public_standings',
    'championship_public_matches'
  );
