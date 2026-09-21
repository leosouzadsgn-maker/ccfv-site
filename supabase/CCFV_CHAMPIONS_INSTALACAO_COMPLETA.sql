-- ============================================================
-- CCFV CHAMPIONS LEAGUE — INSTALAÇÃO COMPLETA
-- 1) Schema
-- 2) Engine/RPCs
-- 3) Admin Pro / views / agenda / auditoria
-- ============================================================

-- CCFV CHAMPIONS LEAGUE — SUPABASE DATABASE
-- Season 01: 32 participantes | 32 clubes | 8 grupos de 4
-- PC + CONSOLE | jogo único em todas as fases
--
-- NÃO recria nem apaga as tabelas existentes do CCFV.
-- Integra diretamente com public.players.id.

create extension if not exists pgcrypto;

-- =========================================================
-- 01. CATÁLOGO MASTER DOS CLUBES
-- =========================================================
create table if not exists public.champions_clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  country text,
  logo_path text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists champions_clubs_active_idx
  on public.champions_clubs(active, sort_order);

-- =========================================================
-- 02. TEMPORADAS / EDIÇÕES
-- =========================================================
create table if not exists public.championships (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  season_number integer not null,
  season_label text not null,
  status text not null default 'DRAFT'
    check (status in (
      'DRAFT','REGISTRATIONS','CLUB_SELECTION','DRAW',
      'GROUP_STAGE','ROUND_OF_16','QUARTERFINALS','SEMIFINALS',
      'FINAL','CLOSED','ARCHIVED'
    )),
  platform_scope text not null default 'PC_CONSOLE'
    check (platform_scope = 'PC_CONSOLE'),
  max_participants integer not null default 32 check (max_participants > 0),
  total_clubs integer not null default 32 check (total_clubs > 0),
  total_groups integer not null default 8 check (total_groups > 0),
  clubs_per_group integer not null default 4 check (clubs_per_group > 0),
  participants_per_group integer not null default 4 check (participants_per_group > 0),
  qualifiers_per_group integer not null default 2 check (qualifiers_per_group > 0),
  single_leg boolean not null default true,
  start_date date,
  end_date date,
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  draw_at timestamptz,
  observations text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint championships_format_ck check (
    max_participants = total_clubs
    and total_groups * clubs_per_group = total_clubs
    and total_groups * participants_per_group = max_participants
    and qualifiers_per_group * total_groups = 16
    and single_leg = true
  )
);

create unique index if not exists championships_season_number_ux
  on public.championships(season_number);

create index if not exists championships_status_idx
  on public.championships(status);

-- =========================================================
-- 03. CONFIGURAÇÕES DA TEMPORADA
-- =========================================================
create table if not exists public.championship_settings (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null unique
    references public.championships(id) on delete cascade,
  match_team_mode text not null default 'AUTHENTIC'
    check (match_team_mode = 'AUTHENTIC'),
  match_minutes integer not null default 10
    check (match_minutes in (5,10,15,20)),
  condition_mode text not null default 'NORMAL'
    check (condition_mode in ('NORMAL','RANDOM','EXCELLENT','GOOD','NORMAL_FORM')),
  extra_time_group boolean not null default false,
  penalties_group boolean not null default false,
  extra_time_knockout boolean not null default true,
  penalties_knockout boolean not null default true,
  registered_club_required boolean not null default true,
  draw_pots integer not null default 4 check (draw_pots > 0),
  clubs_per_pot integer not null default 8 check (clubs_per_pot > 0),
  ranking_points jsonb not null default '{
    "GROUP_STAGE": 50,
    "ROUND_OF_16": 100,
    "QUARTERFINALS": 150,
    "SEMIFINALS": 250,
    "RUNNER_UP": 350,
    "CHAMPION": 500
  }'::jsonb,
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 04. CLUBES DA EDIÇÃO
-- =========================================================
create table if not exists public.championship_clubs (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  club_id uuid not null
    references public.champions_clubs(id) on delete restrict,
  status text not null default 'AVAILABLE'
    check (status in ('AVAILABLE','RESERVED','CONFIRMED','BLOCKED','ELIMINATED')),
  participant_id uuid
    references public.players(id) on delete set null,
  pot_number integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (championship_id, club_id),
  unique (championship_id, participant_id)
);

create index if not exists championship_clubs_championship_idx
  on public.championship_clubs(championship_id);

create index if not exists championship_clubs_status_idx
  on public.championship_clubs(championship_id, status);

-- =========================================================
-- 05. INSCRIÇÕES / PARTICIPANTES
--    participant_id = public.players.id
-- =========================================================
create table if not exists public.championship_registrations (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  participant_id uuid not null
    references public.players(id) on delete restrict,
  priorities jsonb not null default '[]'::jsonb,
  selected_club_id uuid
    references public.championship_clubs(id) on delete restrict,
  status text not null default 'PENDING'
    check (status in (
      'PENDING','PREFERENCES_SENT','CONFIRMED',
      'WAITLIST','REJECTED','WITHDRAWN'
    )),
  accepted_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (championship_id, participant_id),
  unique (id, championship_id, participant_id)
);

create index if not exists championship_registrations_championship_idx
  on public.championship_registrations(championship_id);

create index if not exists championship_registrations_status_idx
  on public.championship_registrations(championship_id, status);

-- =========================================================
-- 06. POTES
-- =========================================================
create table if not exists public.championship_pots (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  pot_number integer not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (championship_id, pot_number)
);

create table if not exists public.championship_pot_members (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null
    references public.championship_pots(id) on delete cascade,
  registration_id uuid not null
    references public.championship_registrations(id) on delete cascade,
  seed_number integer,
  created_at timestamptz not null default now(),
  unique (pot_id, registration_id),
  unique (pot_id, seed_number)
);

-- =========================================================
-- 07. GRUPOS
-- =========================================================
create table if not exists public.championship_groups (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  group_code text not null,
  group_name text not null,
  display_order integer not null,
  status text not null default 'READY'
    check (status in ('DRAFT','READY','IN_PROGRESS','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (championship_id, group_code),
  unique (championship_id, display_order)
);

create table if not exists public.championship_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null
    references public.championship_groups(id) on delete cascade,
  registration_id uuid not null
    references public.championship_registrations(id) on delete restrict,
  club_id uuid not null
    references public.championship_clubs(id) on delete restrict,
  draw_position integer not null,
  is_qualified boolean not null default false,
  final_position integer,
  created_at timestamptz not null default now(),
  unique (group_id, registration_id),
  unique (group_id, club_id),
  unique (group_id, draw_position)
);

-- =========================================================
-- 08. CLASSIFICAÇÃO
-- =========================================================
create table if not exists public.championship_group_standings (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  group_id uuid not null
    references public.championship_groups(id) on delete cascade,
  registration_id uuid not null
    references public.championship_registrations(id) on delete restrict,
  club_id uuid not null
    references public.championship_clubs(id) on delete restrict,
  position integer not null default 0,
  played integer not null default 0 check (played >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  goals_for integer not null default 0 check (goals_for >= 0),
  goals_against integer not null default 0 check (goals_against >= 0),
  goal_difference integer not null default 0,
  points integer not null default 0 check (points >= 0),
  qualified boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (group_id, registration_id),
  unique (group_id, position)
);

create index if not exists championship_group_standings_group_idx
  on public.championship_group_standings(group_id, position);

-- =========================================================
-- 09. PARTIDAS
-- =========================================================
create table if not exists public.championship_matches (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  phase text not null
    check (phase in (
      'GROUP_STAGE','ROUND_OF_16','QUARTERFINALS','SEMIFINALS','FINAL'
    )),
  round_number integer not null default 1,
  match_number integer not null,
  group_id uuid references public.championship_groups(id) on delete set null,
  bracket_slot text,
  home_registration_id uuid
    references public.championship_registrations(id) on delete set null,
  away_registration_id uuid
    references public.championship_registrations(id) on delete set null,
  home_club_id uuid
    references public.championship_clubs(id) on delete set null,
  away_club_id uuid
    references public.championship_clubs(id) on delete set null,
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  extra_time_played boolean not null default false,
  home_score_extra_time integer,
  away_score_extra_time integer,
  penalties_played boolean not null default false,
  home_penalties integer,
  away_penalties integer,
  winner_registration_id uuid
    references public.championship_registrations(id) on delete set null,
  winner_club_id uuid
    references public.championship_clubs(id) on delete set null,
  status text not null default 'SCHEDULED'
    check (status in (
      'SCHEDULED','IN_PROGRESS','PENDING_VALIDATION','VALIDATED',
      'WO','CANCELLED','ADMIN_DECISION'
    )),
  scheduled_at timestamptz,
  played_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    home_registration_id is null or away_registration_id is null
    or home_registration_id <> away_registration_id
  ),
  unique (championship_id, phase, match_number)
);

create index if not exists championship_matches_phase_idx
  on public.championship_matches(championship_id, phase, match_number);

create index if not exists championship_matches_group_idx
  on public.championship_matches(group_id, status);

-- =========================================================
-- 10. RESULTADOS / VALIDAÇÃO
-- =========================================================
create table if not exists public.championship_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique
    references public.championship_matches(id) on delete cascade,
  validated boolean not null default false,
  validated_by uuid references auth.users(id) on delete set null,
  validated_at timestamptz,
  evidence_url text,
  evidence_note text,
  result_type text not null default 'NORMAL'
    check (result_type in ('NORMAL','WO','ADMIN_DECISION')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 11. EVENTOS
-- =========================================================
create table if not exists public.championship_events (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  event_type text not null,
  phase text,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists championship_events_idx
  on public.championship_events(championship_id, created_at desc);

-- =========================================================
-- 12. HISTÓRICO
-- =========================================================
create table if not exists public.championship_history (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  participant_id uuid not null
    references public.players(id) on delete restrict,
  club_id uuid not null
    references public.champions_clubs(id) on delete restrict,
  final_position integer,
  phase_reached text,
  matches_played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  unique (championship_id, participant_id)
);

-- =========================================================
-- 13. PRÊMIOS / HALL DA FAMA
-- =========================================================
create table if not exists public.championship_awards (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  participant_id uuid references public.players(id) on delete set null,
  club_id uuid references public.champions_clubs(id) on delete set null,
  award_type text not null
    check (award_type in (
      'CHAMPION','RUNNER_UP','SEMIFINALIST',
      'QUARTERFINALIST','ROUND_OF_16'
    )),
  title text not null,
  award_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (championship_id, award_type, participant_id)
);

create table if not exists public.ccfv_hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  participant_id uuid not null
    references public.players(id) on delete restrict,
  club_id uuid not null
    references public.champions_clubs(id) on delete restrict,
  title text not null,
  season text not null,
  created_at timestamptz not null default now(),
  unique (championship_id, participant_id, title)
);

-- =========================================================
-- 14. PONTOS DA CHAMPIONS NO RANKING CCFV
-- =========================================================
create table if not exists public.championship_ranking_points (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null
    references public.championships(id) on delete cascade,
  participant_id uuid not null
    references public.players(id) on delete restrict,
  stage text not null
    check (stage in (
      'GROUP_STAGE','ROUND_OF_16','QUARTERFINALS',
      'SEMIFINALS','RUNNER_UP','CHAMPION'
    )),
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (championship_id, participant_id, stage)
);

-- =========================================================
-- 15. AUDITORIA
-- =========================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  justification text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx
  on public.audit_logs(entity, entity_id, created_at desc);

-- =========================================================
-- 16. REGRAS DE INTEGRIDADE
-- =========================================================

create or replace function public.champions_validate_registration()
returns trigger
language plpgsql
as $$
declare
  v_platform text;
  v_status text;
begin
  select upper(coalesce(platform, '')), upper(coalesce(status, 'ACTIVE'))
    into v_platform, v_status
  from public.players
  where id = new.participant_id;

  if v_platform not in ('PC','CONSOLE') then
    raise exception 'A Champions League aceita somente jogadores PC ou CONSOLE.';
  end if;

  if v_status <> 'ACTIVE' then
    raise exception 'O jogador precisa estar ACTIVE para participar da Champions.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_champions_validate_registration
  on public.championship_registrations;
create trigger trg_champions_validate_registration
before insert or update on public.championship_registrations
for each row execute function public.champions_validate_registration();

create or replace function public.champions_validate_selected_club()
returns trigger
language plpgsql
as $$
declare
  v_championship uuid;
  v_participant uuid;
begin
  if new.selected_club_id is null then
    return new;
  end if;

  select championship_id, participant_id
    into v_championship, v_participant
  from public.championship_clubs
  where id = new.selected_club_id;

  if v_championship is null then
    raise exception 'Clube da Champions não encontrado.';
  end if;

  if v_championship <> new.championship_id then
    raise exception 'O clube escolhido não pertence à mesma edição.';
  end if;

  if v_participant is not null and v_participant <> new.participant_id then
    raise exception 'Este clube já está vinculado a outro participante.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_champions_validate_selected_club
  on public.championship_registrations;
create trigger trg_champions_validate_selected_club
before insert or update on public.championship_registrations
for each row execute function public.champions_validate_selected_club();

create or replace function public.champions_validate_club_assignment()
returns trigger
language plpgsql
as $$
declare
  v_existing uuid;
begin
  if new.participant_id is null then
    return new;
  end if;

  select id into v_existing
  from public.championship_clubs
  where championship_id = new.championship_id
    and participant_id = new.participant_id
    and id <> new.id
  limit 1;

  if v_existing is not null then
    raise exception 'O participante já possui um clube nesta edição.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_champions_validate_club_assignment
  on public.championship_clubs;
create trigger trg_champions_validate_club_assignment
before insert or update on public.championship_clubs
for each row execute function public.champions_validate_club_assignment();

-- =========================================================
-- 17. VIEWS PÚBLICAS
-- =========================================================

create or replace view public.championship_public_clubs as
select
  cc.id as championship_club_id,
  cc.championship_id,
  c.id as club_id,
  c.slug,
  c.name,
  c.short_name,
  c.country,
  c.logo_path,
  cc.status,
  p.id as participant_id,
  p.name as participant_name,
  p.platform as participant_platform
from public.championship_clubs cc
join public.champions_clubs c on c.id = cc.club_id
left join public.players p on p.id = cc.participant_id;

create or replace view public.championship_public_standings as
select
  s.id,
  s.championship_id,
  s.group_id,
  g.group_code,
  g.group_name,
  s.registration_id,
  s.club_id,
  c.name as club_name,
  c.logo_path,
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
join public.championship_groups g on g.id = s.group_id
join public.championship_clubs cc on cc.id = s.club_id
join public.champions_clubs c on c.id = cc.club_id
join public.championship_registrations r on r.id = s.registration_id
join public.players p on p.id = r.participant_id;

create or replace view public.championship_public_matches as
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
  hc.name as home_club_name,
  ac.name as away_club_name,
  hc.logo_path as home_logo_path,
  ac.logo_path as away_logo_path,
  m.home_score,
  m.away_score,
  m.extra_time_played,
  m.penalties_played,
  m.home_penalties,
  m.away_penalties,
  m.winner_registration_id,
  m.winner_club_id,
  m.status,
  m.scheduled_at,
  m.played_at
from public.championship_matches m
left join public.championship_registrations hr on hr.id = m.home_registration_id
left join public.championship_registrations ar on ar.id = m.away_registration_id
left join public.players hp on hp.id = hr.participant_id
left join public.players ap on ap.id = ar.participant_id
left join public.championship_clubs hca on hca.id = m.home_club_id
left join public.championship_clubs aca on aca.id = m.away_club_id
left join public.champions_clubs hc on hc.id = hca.club_id
left join public.champions_clubs ac on ac.id = aca.club_id;

-- =========================================================
-- 18. RLS
-- =========================================================

alter table public.champions_clubs enable row level security;
alter table public.championships enable row level security;
alter table public.championship_settings enable row level security;
alter table public.championship_clubs enable row level security;
alter table public.championship_registrations enable row level security;
alter table public.championship_pots enable row level security;
alter table public.championship_pot_members enable row level security;
alter table public.championship_groups enable row level security;
alter table public.championship_group_members enable row level security;
alter table public.championship_group_standings enable row level security;
alter table public.championship_matches enable row level security;
alter table public.championship_results enable row level security;
alter table public.championship_events enable row level security;
alter table public.championship_history enable row level security;
alter table public.championship_awards enable row level security;
alter table public.ccfv_hall_of_fame enable row level security;
alter table public.championship_ranking_points enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'champions_clubs','championships','championship_settings',
    'championship_clubs','championship_registrations','championship_pots',
    'championship_pot_members','championship_groups',
    'championship_group_members','championship_group_standings',
    'championship_matches','championship_results','championship_events',
    'championship_history','championship_awards','ccfv_hall_of_fame',
    'championship_ranking_points'
  ]
  loop
    execute format(
      'do $policy$ begin
         if not exists (
           select 1 from pg_policies
           where schemaname = ''public''
             and tablename = %L
             and policyname = %L
         ) then
           execute %L;
         end if;
       end $policy$;',
      t,
      t || '_public_read',
      format(
        'create policy %I on public.%I for select using (true)',
        t || '_public_read', t
      )
    );
    execute format(
      'do $policy$ begin
         if not exists (
           select 1 from pg_policies
           where schemaname = ''public''
             and tablename = %L
             and policyname = %L
         ) then
           execute %L;
         end if;
       end $policy$;',
      t,
      t || '_auth_write',
      format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        t || '_auth_write', t
      )
    );
  end loop;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='audit_logs'
      and policyname='audit_logs_auth_read'
  ) then
    create policy audit_logs_auth_read
      on public.audit_logs for select to authenticated using (true);
  end if;
end $$;

grant select on public.championship_public_clubs to anon, authenticated;
grant select on public.championship_public_standings to anon, authenticated;
grant select on public.championship_public_matches to anon, authenticated;

-- =========================================================
-- 19. SEED — 32 CLUBES E SEASON 01
-- =========================================================

insert into public.champions_clubs
  (slug,name,short_name,country,logo_path,sort_order)
values
('real_madrid','Real Madrid','REAL MADRID','ESPANHA','/assets/images/champions/clubs/real_madrid.png',1),
('barcelona','Barcelona','BARCELONA','ESPANHA','/assets/images/champions/clubs/barcelona.png',2),
('atletico_madrid','Atlético de Madrid','ATLÉTICO','ESPANHA','/assets/images/champions/clubs/atletico_madrid.png',3),
('manchester_city','Manchester City','MAN CITY','INGLATERRA','/assets/images/champions/clubs/manchester_city.png',4),
('manchester_united','Manchester United','MAN UNITED','INGLATERRA','/assets/images/champions/clubs/manchester_united.png',5),
('liverpool','Liverpool','LIVERPOOL','INGLATERRA','/assets/images/champions/clubs/liverpool.png',6),
('arsenal','Arsenal','ARSENAL','INGLATERRA','/assets/images/champions/clubs/arsenal.png',7),
('chelsea','Chelsea','CHELSEA','INGLATERRA','/assets/images/champions/clubs/chelsea.png',8),
('inter_milao','Inter de Milão','INTER','ITÁLIA','/assets/images/champions/clubs/inter_milao.png',9),
('milan','Milan','MILAN','ITÁLIA','/assets/images/champions/clubs/milan.png',10),
('juventus','Juventus','JUVENTUS','ITÁLIA','/assets/images/champions/clubs/juventus.png',11),
('napoli','Napoli','NAPOLI','ITÁLIA','/assets/images/champions/clubs/napoli.png',12),
('roma','Roma','ROMA','ITÁLIA','/assets/images/champions/clubs/roma.png',13),
('lazio','Lazio','LAZIO','ITÁLIA','/assets/images/champions/clubs/lazio.png',14),
('psg','Paris Saint-Germain','PSG','FRANÇA','/assets/images/champions/clubs/psg.png',15),
('marseille','Olympique de Marseille','MARSEILLE','FRANÇA','/assets/images/champions/clubs/marseille.png',16),
('monaco','Monaco','MONACO','FRANÇA','/assets/images/champions/clubs/monaco.png',17),
('lyon','Lyon','LYON','FRANÇA','/assets/images/champions/clubs/lyon.png',18),
('benfica','Benfica','BENFICA','PORTUGAL','/assets/images/champions/clubs/benfica.png',19),
('porto','Porto','PORTO','PORTUGAL','/assets/images/champions/clubs/porto.png',20),
('sporting','Sporting','SPORTING','PORTUGAL','/assets/images/champions/clubs/sporting.png',21),
('braga','Braga','BRAGA','PORTUGAL','/assets/images/champions/clubs/braga.png',22),
('ajax','Ajax','AJAX','HOLANDA','/assets/images/champions/clubs/ajax.png',23),
('psv','PSV','PSV','HOLANDA','/assets/images/champions/clubs/psv.png',24),
('feyenoord','Feyenoord','FEYENOORD','HOLANDA','/assets/images/champions/clubs/feyenoord.png',25),
('galatasaray','Galatasaray','GALATASARAY','TURQUIA','/assets/images/champions/clubs/galatasaray.png',26),
('fenerbahce','Fenerbahçe','FENERBAHÇE','TURQUIA','/assets/images/champions/clubs/fenerbahce.png',27),
('besiktas','Beşiktaş','BEŞİKTAŞ','TURQUIA','/assets/images/champions/clubs/besiktas.png',28),
('celtic','Celtic','CELTIC','ESCÓCIA','/assets/images/champions/clubs/celtic.png',29),
('rangers','Rangers','RANGERS','ESCÓCIA','/assets/images/champions/clubs/rangers.png',30),
('club_brugge','Club Brugge','CLUB BRUGGE','BÉLGICA','/assets/images/champions/clubs/club_brugge.png',31),
('anderlecht','Anderlecht','ANDERLECHT','BÉLGICA','/assets/images/champions/clubs/anderlecht.png',32)
on conflict (slug) do update set
  name=excluded.name,
  short_name=excluded.short_name,
  country=excluded.country,
  logo_path=excluded.logo_path,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into public.championships
  (code,name,season_number,season_label,status,platform_scope,
   max_participants,total_clubs,total_groups,clubs_per_group,
   participants_per_group,qualifiers_per_group,single_leg,observations)
values (
  'CCFV-CL-S01',
  'CCFV Champions League',
  1,
  'SEASON 01',
  'DRAFT',
  'PC_CONSOLE',
  32,32,8,4,4,2,true,
  'Champions League CCFV PC + Console — 32 clubes, 8 grupos de 4, dois classificados por grupo e mata-mata em jogo único.'
)
on conflict (code) do nothing;

insert into public.championship_settings (championship_id)
select id from public.championships
where code='CCFV-CL-S01'
on conflict (championship_id) do nothing;

insert into public.championship_clubs (championship_id,club_id,status)
select ch.id,cc.id,'AVAILABLE'
from public.championships ch
cross join public.champions_clubs cc
where ch.code='CCFV-CL-S01' and cc.active=true
on conflict (championship_id,club_id) do nothing;

insert into public.championship_pots (championship_id,pot_number,name)
select ch.id,g.n,'POTE '||g.n
from public.championships ch
cross join generate_series(1,4) as g(n)
where ch.code='CCFV-CL-S01'
on conflict (championship_id,pot_number) do nothing;

insert into public.championship_groups
  (championship_id,group_code,group_name,display_order)
select ch.id,chr(64+g.n),'GRUPO '||chr(64+g.n),g.n
from public.championships ch
cross join generate_series(1,8) as g(n)
where ch.code='CCFV-CL-S01'
on conflict (championship_id,group_code) do nothing;

-- =========================================================
-- FIM
-- =========================================================
notify pgrst, 'reload schema';




-- ============================================================
-- ENGINE OFICIAL
-- ============================================================

-- =========================================================
-- CCFV CHAMPIONS LEAGUE — ENGINE DEFINITIVA
-- =========================================================
-- Este arquivo substitui as RPCs anteriores da Champions.
-- Pode ser executado por cima das funções existentes.
--
-- NÃO mexe no Brasileirão, Night Cup, Mobile, Ranking ou Cards.
-- Usa public.players.id como participante.
--
-- Season 01:
-- 32 participantes
-- 32 clubes
-- 4 potes de 8
-- 8 grupos de 4
-- 48 jogos de grupos
-- 16 classificados
-- 8 oitavas
-- 4 quartas
-- 2 semifinais
-- 1 final
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 01. CORREÇÃO DEFINITIVA DA UNIQUE DA CLASSIFICAÇÃO
-- =========================================================
-- Remove duplicidades antigas e deixa somente a versão DEFERRABLE.
do $$
declare
  v_constraint record;
begin
  if to_regclass('public.championship_group_standings') is null then
    raise exception 'A tabela championship_group_standings não existe. Execute primeiro o schema da Champions.';
  end if;

  -- Nomes conhecidos das versões anteriores.
  alter table public.championship_group_standings
    drop constraint if exists championship_group_standings_group_id_position_key;

  alter table public.championship_group_standings
    drop constraint if exists championship_group_standings_group_position_key;

  -- Remove qualquer outra UNIQUE equivalente encontrada.
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.championship_group_standings'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) in (
        'UNIQUE (group_id, "position")',
        'UNIQUE (group_id, position)'
      )
  loop
    execute format(
      'alter table public.championship_group_standings drop constraint if exists %I',
      v_constraint.conname
    );
  end loop;

  alter table public.championship_group_standings
    add constraint championship_group_standings_group_position_key
    unique (group_id, position)
    deferrable initially deferred;
end $$;

-- =========================================================
-- 02. AUTH
-- =========================================================
create or replace function public.champions_require_authenticated()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Ação permitida somente para usuário autenticado.';
  end if;
end;
$$;

-- =========================================================
-- 03. PREPARAR POTES
-- =========================================================
create or replace function public.champions_prepare_pots(
  p_championship_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_total integer;
  v_existing integer;
  v_index integer := 0;
  v_pot integer;
  v_seed integer;
  v_pot_id uuid;
  v_reg record;
  v_distinct_clubs integer;
begin
  perform public.champions_require_authenticated();

  select status
    into v_status
  from public.championships
  where id = p_championship_id;

  if v_status is null then
    raise exception 'Temporada Champions não encontrada.';
  end if;

  if v_status not in ('DRAFT','REGISTRATIONS','CLUB_SELECTION','DRAW') then
    raise exception 'Não é permitido preparar/recriar potes na fase %. ', v_status;
  end if;

  select count(*)
    into v_total
  from public.championship_registrations
  where championship_id = p_championship_id
    and status = 'CONFIRMED';

  if v_total <> 32 then
    raise exception 'A Champions precisa de exatamente 32 inscrições CONFIRMED. Atual: %.', v_total;
  end if;

  if exists (
    select 1
    from public.championship_registrations
    where championship_id = p_championship_id
      and status = 'CONFIRMED'
      and selected_club_id is null
  ) then
    raise exception 'Todos os 32 participantes CONFIRMED precisam ter clube selecionado.';
  end if;

  select count(distinct selected_club_id)
    into v_distinct_clubs
  from public.championship_registrations
  where championship_id = p_championship_id
    and status = 'CONFIRMED';

  if v_distinct_clubs <> 32 then
    raise exception 'Existem clubes repetidos entre os 32 participantes.';
  end if;

  select count(*)
    into v_existing
  from public.championship_pot_members pm
  join public.championship_pots p
    on p.id = pm.pot_id
  where p.championship_id = p_championship_id;

  if v_existing > 0 and not p_force then
    return jsonb_build_object(
      'success', true,
      'message', 'Potes já preparados.',
      'members', v_existing
    );
  end if;

  -- Ao recriar potes, remove apenas os potes/membros.
  delete from public.championship_pot_members
  where pot_id in (
    select id
    from public.championship_pots
    where championship_id = p_championship_id
  );

  delete from public.championship_pots
  where championship_id = p_championship_id;

  insert into public.championship_pots(
    championship_id,
    pot_number,
    name
  )
  select
    p_championship_id,
    n,
    'POTE ' || n
  from generate_series(1,4) as gs(n);

  for v_reg in
    select id, selected_club_id
    from public.championship_registrations
    where championship_id = p_championship_id
      and status = 'CONFIRMED'
    order by random()
  loop
    v_index := v_index + 1;
    v_pot := ((v_index - 1) / 8) + 1;
    v_seed := ((v_index - 1) % 8) + 1;

    select id
      into v_pot_id
    from public.championship_pots
    where championship_id = p_championship_id
      and pot_number = v_pot;

    insert into public.championship_pot_members(
      pot_id,
      registration_id,
      seed_number
    )
    values (
      v_pot_id,
      v_reg.id,
      v_seed
    );

    update public.championship_clubs
    set
      pot_number = v_pot,
      updated_at = now()
    where id = v_reg.selected_club_id
      and championship_id = p_championship_id;
  end loop;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values (
    p_championship_id,
    'POTS_GENERATED',
    'DRAW',
    jsonb_build_object(
      'pots', 4,
      'participants', 32
    ),
    auth.uid()
  );

  update public.championships
  set
    status = 'DRAW',
    updated_at = now()
  where id = p_championship_id;

  return jsonb_build_object(
    'success', true,
    'pots', 4,
    'participants', 32
  );
end;
$$;

-- =========================================================
-- 04. SORTEIO DOS GRUPOS
-- =========================================================
create or replace function public.champions_draw_groups(
  p_championship_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_members integer;
  v_existing integer;
  v_group_id uuid;
  v_position integer;
  v_count integer := 0;
  v_pot record;
  v_member record;
begin
  perform public.champions_require_authenticated();

  select status
    into v_status
  from public.championships
  where id = p_championship_id;

  if v_status is null then
    raise exception 'Temporada Champions não encontrada.';
  end if;

  if v_status not in ('DRAW') then
    raise exception 'O sorteio oficial deve ser executado na fase DRAW. Fase atual: %.', v_status;
  end if;

  select count(*)
    into v_members
  from public.championship_pot_members pm
  join public.championship_pots pot
    on pot.id = pm.pot_id
  where pot.championship_id = p_championship_id;

  if v_members <> 32 then
    raise exception 'Execute champions_prepare_pots antes do sorteio.';
  end if;

  select count(*)
    into v_existing
  from public.championship_group_members gm
  join public.championship_groups grp
    on grp.id = gm.group_id
  where grp.championship_id = p_championship_id;

  if v_existing > 0 and not p_force then
    return jsonb_build_object(
      'success', true,
      'message', 'Sorteio já realizado.',
      'members', v_existing
    );
  end if;

  delete from public.championship_group_standings
  where championship_id = p_championship_id;

  delete from public.championship_group_members
  where group_id in (
    select id
    from public.championship_groups
    where championship_id = p_championship_id
  );

  delete from public.championship_groups
  where championship_id = p_championship_id;

  insert into public.championship_groups(
    championship_id,
    group_code,
    group_name,
    display_order,
    status
  )
  select
    p_championship_id,
    chr(64 + n),
    'GRUPO ' || chr(64 + n),
    n,
    'READY'
  from generate_series(1,8) as gs(n);

  for v_pot in
    select id, pot_number
    from public.championship_pots
    where championship_id = p_championship_id
    order by pot_number
  loop
    v_position := 0;

    for v_member in
      select registration_id
      from public.championship_pot_members
      where pot_id = v_pot.id
      order by random()
    loop
      v_position := v_position + 1;

      select id
        into v_group_id
      from public.championship_groups
      where championship_id = p_championship_id
        and display_order = v_position;

      insert into public.championship_group_members(
        group_id,
        registration_id,
        club_id,
        draw_position
      )
      select
        v_group_id,
        reg.id,
        reg.selected_club_id,
        v_pot.pot_number
      from public.championship_registrations reg
      where reg.id = v_member.registration_id;

      v_count := v_count + 1;
    end loop;
  end loop;

  if v_count <> 32 then
    raise exception 'Sorteio inválido: foram distribuídos % participantes.', v_count;
  end if;

  insert into public.championship_group_standings(
    championship_id,
    group_id,
    registration_id,
    club_id,
    position
  )
  select
    p_championship_id,
    gm.group_id,
    gm.registration_id,
    gm.club_id,
    gm.draw_position
  from public.championship_group_members gm
  join public.championship_groups grp
    on grp.id = gm.group_id
  where grp.championship_id = p_championship_id;

  update public.championships
  set
    status = 'GROUP_STAGE',
    updated_at = now()
  where id = p_championship_id;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values (
    p_championship_id,
    'GROUPS_DRAWN',
    'GROUP_STAGE',
    jsonb_build_object(
      'groups', 8,
      'participants', 32
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'groups', 8,
    'participants', 32
  );
end;
$$;

-- =========================================================
-- 05. GERAR AS 48 PARTIDAS DOS GRUPOS
-- =========================================================
create or replace function public.champions_generate_group_matches(
  p_championship_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_match_count integer;
  v_existing integer;
  v_group record;
  v_home record;
  v_away record;
begin
  perform public.champions_require_authenticated();

  select status
    into v_status
  from public.championships
  where id = p_championship_id;

  if v_status not in ('DRAW','GROUP_STAGE') then
    raise exception 'Geração dos jogos de grupos não permitida na fase %. ', v_status;
  end if;

  if (
    select count(*)
    from public.championship_groups
    where championship_id = p_championship_id
  ) <> 8 then
    raise exception 'É necessário possuir exatamente 8 grupos.';
  end if;

  if (
    select count(*)
    from public.championship_group_members gm
    join public.championship_groups grp
      on grp.id = gm.group_id
    where grp.championship_id = p_championship_id
  ) <> 32 then
    raise exception 'É necessário possuir exatamente 32 participantes nos grupos.';
  end if;

  select count(*)
    into v_existing
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'GROUP_STAGE';

  if v_existing > 0 and not p_force then
    return jsonb_build_object(
      'success', true,
      'message', 'Jogos de grupos já existem.',
      'matches', v_existing
    );
  end if;

  if p_force then
    delete from public.championship_matches
    where championship_id = p_championship_id
      and phase = 'GROUP_STAGE';
  end if;

  for v_group in
    select id, display_order
    from public.championship_groups
    where championship_id = p_championship_id
    order by display_order
  loop
    for v_home in
      select registration_id, club_id, draw_position
      from public.championship_group_members
      where group_id = v_group.id
      order by draw_position
    loop
      for v_away in
        select registration_id, club_id, draw_position
        from public.championship_group_members
        where group_id = v_group.id
          and draw_position > v_home.draw_position
        order by draw_position
      loop
        v_match_count := coalesce(v_match_count, 0) + 1;

        if random() < 0.5 then
          insert into public.championship_matches(
            championship_id,
            phase,
            round_number,
            match_number,
            group_id,
            bracket_slot,
            home_registration_id,
            away_registration_id,
            home_club_id,
            away_club_id,
            status
          )
          values (
            p_championship_id,
            'GROUP_STAGE',
            1,
            v_match_count,
            v_group.id,
            'G' || chr(64 + v_group.display_order) || '-' || v_match_count,
            v_home.registration_id,
            v_away.registration_id,
            v_home.club_id,
            v_away.club_id,
            'SCHEDULED'
          );
        else
          insert into public.championship_matches(
            championship_id,
            phase,
            round_number,
            match_number,
            group_id,
            bracket_slot,
            home_registration_id,
            away_registration_id,
            home_club_id,
            away_club_id,
            status
          )
          values (
            p_championship_id,
            'GROUP_STAGE',
            1,
            v_match_count,
            v_group.id,
            'G' || chr(64 + v_group.display_order) || '-' || v_match_count,
            v_away.registration_id,
            v_home.registration_id,
            v_away.club_id,
            v_home.club_id,
            'SCHEDULED'
          );
        end if;
      end loop;
    end loop;
  end loop;

  if coalesce(v_match_count, 0) <> 48 then
    raise exception 'A fase de grupos deve gerar 48 partidas. Geradas: %.', coalesce(v_match_count, 0);
  end if;

  update public.championships
  set
    status = 'GROUP_STAGE',
    updated_at = now()
  where id = p_championship_id;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values (
    p_championship_id,
    'GROUP_MATCHES_GENERATED',
    'GROUP_STAGE',
    jsonb_build_object('matches', 48),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'matches', 48
  );
end;
$$;

-- =========================================================
-- 06. RECALCULAR CLASSIFICAÇÃO
-- =========================================================
create or replace function public.champions_recalculate_group_standings(
  p_championship_id uuid,
  p_group_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group record;
begin
  perform public.champions_require_authenticated();

  for v_group in
    select grp.id
    from public.championship_groups grp
    where grp.championship_id = p_championship_id
      and (p_group_id is null or grp.id = p_group_id)
    order by grp.display_order
  loop

    update public.championship_group_standings
    set
      played = 0,
      wins = 0,
      draws = 0,
      losses = 0,
      goals_for = 0,
      goals_against = 0,
      goal_difference = 0,
      points = 0,
      qualified = false,
      updated_at = now()
    where group_id = v_group.id;

    update public.championship_group_standings as standing
    set
      played = stats.played,
      wins = stats.wins,
      draws = stats.draws,
      losses = stats.losses,
      goals_for = stats.goals_for,
      goals_against = stats.goals_against,
      goal_difference = stats.goals_for - stats.goals_against,
      points = stats.points,
      updated_at = now()
    from (
      select
        result_rows.registration_id,
        count(*)::integer as played,
        count(*) filter (where result_rows.is_win)::integer as wins,
        count(*) filter (where result_rows.is_draw)::integer as draws,
        count(*) filter (where not result_rows.is_win and not result_rows.is_draw)::integer as losses,
        coalesce(sum(result_rows.gf),0)::integer as goals_for,
        coalesce(sum(result_rows.ga),0)::integer as goals_against,
        coalesce(sum(result_rows.points),0)::integer as points
      from (
        select
          match.home_registration_id as registration_id,
          match.home_score as gf,
          match.away_score as ga,
          (match.home_score > match.away_score) as is_win,
          (match.home_score = match.away_score) as is_draw,
          case
            when match.home_score > match.away_score then 3
            when match.home_score = match.away_score then 1
            else 0
          end as points
        from public.championship_matches match
        where match.championship_id = p_championship_id
          and match.group_id = v_group.id
          and match.phase = 'GROUP_STAGE'
          and match.status in ('VALIDATED','WO','ADMIN_DECISION')

        union all

        select
          match.away_registration_id as registration_id,
          match.away_score as gf,
          match.home_score as ga,
          (match.away_score > match.home_score) as is_win,
          (match.home_score = match.away_score) as is_draw,
          case
            when match.away_score > match.home_score then 3
            when match.home_score = match.away_score then 1
            else 0
          end as points
        from public.championship_matches match
        where match.championship_id = p_championship_id
          and match.group_id = v_group.id
          and match.phase = 'GROUP_STAGE'
          and match.status in ('VALIDATED','WO','ADMIN_DECISION')
      ) as result_rows
      group by result_rows.registration_id
    ) as stats
    where standing.group_id = v_group.id
      and standing.registration_id = stats.registration_id;

    with ranked as (
      select
        standing.id,
        row_number() over (
          order by
            standing.points desc,
            standing.goal_difference desc,
            standing.goals_for desc,
            member.draw_position asc
        )::integer as new_position
      from public.championship_group_standings standing
      join public.championship_group_members member
        on member.group_id = standing.group_id
       and member.registration_id = standing.registration_id
      where standing.group_id = v_group.id
    )
    update public.championship_group_standings as standing
    set
      position = ranked.new_position,
      qualified = (ranked.new_position <= 2),
      updated_at = now()
    from ranked
    where standing.id = ranked.id;

    update public.championship_group_members as member
    set
      final_position = standing.position,
      is_qualified = standing.qualified
    from public.championship_group_standings standing
    where standing.group_id = member.group_id
      and standing.registration_id = member.registration_id
      and member.group_id = v_group.id;

  end loop;

  return jsonb_build_object('success', true);
end;
$$;

-- =========================================================
-- 07. OITAVAS
-- =========================================================
create or replace function public.champions_generate_round_of_16(
  p_championship_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing integer;
  v_group_a uuid;
  v_group_b uuid;
  v_first_a record;
  v_second_a record;
  v_first_b record;
  v_second_b record;
  v_pair integer;
begin
  perform public.champions_require_authenticated();

  perform public.champions_recalculate_group_standings(
    p_championship_id,
    null
  );

  if (
    select count(*)
    from public.championship_groups
    where championship_id = p_championship_id
  ) <> 8 then
    raise exception 'A Champions precisa possuir 8 grupos.';
  end if;

  if (
    select count(*)
    from public.championship_group_standings
    where championship_id = p_championship_id
      and qualified = true
  ) <> 16 then
    raise exception 'É necessário possuir 16 classificados.';
  end if;

  if exists (
    select 1
    from public.championship_matches
    where championship_id = p_championship_id
      and phase = 'GROUP_STAGE'
      and status not in ('VALIDATED','WO','ADMIN_DECISION')
  ) then
    raise exception 'Ainda existem partidas de grupos pendentes.';
  end if;

  if (
    select count(*)
    from public.championship_matches
    where championship_id = p_championship_id
      and phase = 'GROUP_STAGE'
  ) <> 48 then
    raise exception 'A fase de grupos deve conter exatamente 48 partidas.';
  end if;

  select count(*)
    into v_existing
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'ROUND_OF_16';

  if v_existing > 0 and not p_force then
    return jsonb_build_object(
      'success', true,
      'message', 'Oitavas já geradas.',
      'matches', v_existing
    );
  end if;

  delete from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'ROUND_OF_16';

  for v_pair in 1..4 loop
    select id
      into v_group_a
    from public.championship_groups
    where championship_id = p_championship_id
      and display_order = ((v_pair - 1) * 2) + 1;

    select id
      into v_group_b
    from public.championship_groups
    where championship_id = p_championship_id
      and display_order = ((v_pair - 1) * 2) + 2;

    select *
      into v_first_a
    from public.championship_group_standings
    where group_id = v_group_a
      and position = 1;

    select *
      into v_second_a
    from public.championship_group_standings
    where group_id = v_group_a
      and position = 2;

    select *
      into v_first_b
    from public.championship_group_standings
    where group_id = v_group_b
      and position = 1;

    select *
      into v_second_b
    from public.championship_group_standings
    where group_id = v_group_b
      and position = 2;

    insert into public.championship_matches(
      championship_id,
      phase,
      round_number,
      match_number,
      bracket_slot,
      home_registration_id,
      away_registration_id,
      home_club_id,
      away_club_id,
      status
    )
    values
    (
      p_championship_id,
      'ROUND_OF_16',
      2,
      ((v_pair - 1) * 2) + 1,
      'R16-' || (((v_pair - 1) * 2) + 1),
      v_first_a.registration_id,
      v_second_b.registration_id,
      v_first_a.club_id,
      v_second_b.club_id,
      'SCHEDULED'
    ),
    (
      p_championship_id,
      'ROUND_OF_16',
      2,
      ((v_pair - 1) * 2) + 2,
      'R16-' || (((v_pair - 1) * 2) + 2),
      v_first_b.registration_id,
      v_second_a.registration_id,
      v_first_b.club_id,
      v_second_a.club_id,
      'SCHEDULED'
    );
  end loop;

  update public.championships
  set
    status = 'ROUND_OF_16',
    updated_at = now()
  where id = p_championship_id;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values(
    p_championship_id,
    'ROUND_OF_16_GENERATED',
    'ROUND_OF_16',
    jsonb_build_object('matches',8),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'matches', 8
  );
end;
$$;

-- =========================================================
-- 08. QUARTAS / SEMIS / FINAL
-- =========================================================
create or replace function public.champions_generate_next_knockout_phase(
  p_championship_id uuid,
  p_current_phase text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_phase text;
  v_pending integer;
  v_count integer;
  v_number integer := 0;
  v_match_1 record;
  v_match_2 record;
begin
  perform public.champions_require_authenticated();

  v_next_phase := case p_current_phase
    when 'ROUND_OF_16' then 'QUARTERFINALS'
    when 'QUARTERFINALS' then 'SEMIFINALS'
    when 'SEMIFINALS' then 'FINAL'
    else null
  end;

  if v_next_phase is null then
    raise exception 'Fase inválida: %.', p_current_phase;
  end if;

  select
    count(*),
    count(*) filter (
      where status not in ('VALIDATED','WO','ADMIN_DECISION')
    )
    into v_count, v_pending
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = p_current_phase;

  if v_count = 0 then
    raise exception 'Nenhuma partida encontrada em %.', p_current_phase;
  end if;

  if v_pending > 0 then
    raise exception
      'Ainda existem % partida(s) pendente(s) em %.',
      v_pending,
      p_current_phase;
  end if;

  if v_count % 2 <> 0 then
    raise exception 'A fase % possui quantidade ímpar de partidas.', p_current_phase;
  end if;

  delete from public.championship_matches
  where championship_id = p_championship_id
    and phase = v_next_phase;

  for v_match_1 in
    select *
    from public.championship_matches
    where championship_id = p_championship_id
      and phase = p_current_phase
      and mod(match_number,2) = 1
    order by match_number
  loop
    select *
      into v_match_2
    from public.championship_matches
    where championship_id = p_championship_id
      and phase = p_current_phase
      and match_number = v_match_1.match_number + 1;

    if v_match_2.id is null then
      raise exception 'Par de partida incompleto em %.', p_current_phase;
    end if;

    if v_match_1.winner_registration_id is null
       or v_match_2.winner_registration_id is null then
      raise exception 'Existe partida sem vencedor definido em %.', p_current_phase;
    end if;

    v_number := v_number + 1;

    insert into public.championship_matches(
      championship_id,
      phase,
      round_number,
      match_number,
      bracket_slot,
      home_registration_id,
      away_registration_id,
      home_club_id,
      away_club_id,
      status
    )
    values(
      p_championship_id,
      v_next_phase,
      case
        when v_next_phase = 'QUARTERFINALS' then 3
        when v_next_phase = 'SEMIFINALS' then 4
        else 5
      end,
      v_number,
      case
        when v_next_phase = 'QUARTERFINALS' then 'QF-' || v_number
        when v_next_phase = 'SEMIFINALS' then 'SF-' || v_number
        else 'FINAL-1'
      end,
      v_match_1.winner_registration_id,
      v_match_2.winner_registration_id,
      v_match_1.winner_club_id,
      v_match_2.winner_club_id,
      'SCHEDULED'
    );
  end loop;

  if v_next_phase = 'QUARTERFINALS' and v_number <> 4 then
    raise exception 'Quartas devem possuir 4 partidas. Geradas: %.', v_number;
  end if;

  if v_next_phase = 'SEMIFINALS' and v_number <> 2 then
    raise exception 'Semifinais devem possuir 2 partidas. Geradas: %.', v_number;
  end if;

  if v_next_phase = 'FINAL' and v_number <> 1 then
    raise exception 'Final deve possuir 1 partida. Geradas: %.', v_number;
  end if;

  update public.championships
  set
    status = v_next_phase,
    updated_at = now()
  where id = p_championship_id;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values(
    p_championship_id,
    v_next_phase || '_GENERATED',
    v_next_phase,
    jsonb_build_object(
      'from_phase', p_current_phase,
      'matches', v_number
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'phase', v_next_phase,
    'matches', v_number
  );
end;
$$;

-- =========================================================
-- 09. RESULTADO + AUTO-AVANÇO
-- =========================================================
create or replace function public.champions_submit_result(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_result_type text default 'NORMAL',
  p_winner_side text default null,
  p_home_penalties integer default null,
  p_away_penalties integer default null,
  p_evidence_url text default null,
  p_evidence_note text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.championship_matches%rowtype;
  v_winner_registration uuid;
  v_winner_club uuid;
  v_knockout boolean;
  v_result_type text := upper(coalesce(p_result_type,'NORMAL'));
  v_winner_side text := upper(coalesce(p_winner_side,''));
  v_auto jsonb := jsonb_build_object(
    'success', true,
    'advanced', false
  );
begin
  perform public.champions_require_authenticated();

  if p_home_score < 0 or p_away_score < 0 then
    raise exception 'Placar não pode ser negativo.';
  end if;

  if p_home_penalties is not null and p_home_penalties < 0 then
    raise exception 'Pênaltis do mandante inválidos.';
  end if;

  if p_away_penalties is not null and p_away_penalties < 0 then
    raise exception 'Pênaltis do visitante inválidos.';
  end if;

  if v_result_type not in ('NORMAL','WO','ADMIN_DECISION') then
    raise exception 'Tipo de resultado inválido: %.', v_result_type;
  end if;

  select *
    into v_match
  from public.championship_matches
  where id = p_match_id
  for update;

  if v_match.id is null then
    raise exception 'Partida não encontrada.';
  end if;

  if v_match.status in ('VALIDATED','WO','ADMIN_DECISION') then
    raise exception 'Esta partida já possui resultado validado.';
  end if;

  v_knockout := v_match.phase in (
    'ROUND_OF_16',
    'QUARTERFINALS',
    'SEMIFINALS',
    'FINAL'
  );

  if p_home_score > p_away_score then
    v_winner_registration := v_match.home_registration_id;
    v_winner_club := v_match.home_club_id;

  elsif p_away_score > p_home_score then
    v_winner_registration := v_match.away_registration_id;
    v_winner_club := v_match.away_club_id;

  elsif not v_knockout and v_result_type = 'NORMAL' then
    v_winner_registration := null;
    v_winner_club := null;

  else
    if v_winner_side not in ('HOME','AWAY') then
      raise exception 'Informe HOME ou AWAY como vencedor.';
    end if;

    if v_result_type = 'NORMAL' then
      if p_home_penalties is null or p_away_penalties is null then
        raise exception 'Empate no mata-mata exige disputa por pênaltis.';
      end if;

      if p_home_penalties = p_away_penalties then
        raise exception 'Os pênaltis precisam definir um vencedor.';
      end if;

      if v_winner_side = 'HOME'
         and p_home_penalties <= p_away_penalties then
        raise exception 'Vencedor HOME não corresponde aos pênaltis.';
      end if;

      if v_winner_side = 'AWAY'
         and p_away_penalties <= p_home_penalties then
        raise exception 'Vencedor AWAY não corresponde aos pênaltis.';
      end if;
    end if;

    if v_winner_side = 'HOME' then
      v_winner_registration := v_match.home_registration_id;
      v_winner_club := v_match.home_club_id;
    else
      v_winner_registration := v_match.away_registration_id;
      v_winner_club := v_match.away_club_id;
    end if;
  end if;

  update public.championship_matches
  set
    home_score = p_home_score,
    away_score = p_away_score,
    home_penalties = p_home_penalties,
    away_penalties = p_away_penalties,
    penalties_played = (
      p_home_penalties is not null
      and p_away_penalties is not null
    ),
    winner_registration_id = v_winner_registration,
    winner_club_id = v_winner_club,
    status = case
      when v_result_type = 'WO' then 'WO'
      when v_result_type = 'ADMIN_DECISION' then 'ADMIN_DECISION'
      else 'VALIDATED'
    end,
    played_at = now(),
    updated_at = now()
  where id = v_match.id;

  insert into public.championship_results(
    match_id,
    validated,
    validated_by,
    validated_at,
    evidence_url,
    evidence_note,
    result_type,
    notes
  )
  values(
    v_match.id,
    true,
    auth.uid(),
    now(),
    p_evidence_url,
    p_evidence_note,
    v_result_type,
    p_notes
  )
  on conflict (match_id)
  do update set
    validated = true,
    validated_by = auth.uid(),
    validated_at = now(),
    evidence_url = excluded.evidence_url,
    evidence_note = excluded.evidence_note,
    result_type = excluded.result_type,
    notes = excluded.notes,
    updated_at = now();

  if v_match.phase = 'GROUP_STAGE' then
    perform public.champions_recalculate_group_standings(
      v_match.championship_id,
      v_match.group_id
    );
  end if;

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
    'MATCH_RESULT_VALIDATED',
    v_match.phase,
    'MATCH',
    v_match.id,
    jsonb_build_object(
      'home_score', p_home_score,
      'away_score', p_away_score,
      'result_type', v_result_type,
      'winner_registration_id', v_winner_registration
    ),
    auth.uid()
  );

  -- AUTO-AVANÇO
  if not exists (
    select 1
    from public.championship_matches
    where championship_id = v_match.championship_id
      and phase = v_match.phase
      and status not in ('VALIDATED','WO','ADMIN_DECISION')
  ) then

    if v_match.phase = 'GROUP_STAGE' then
      v_auto := public.champions_generate_round_of_16(
        v_match.championship_id,
        false
      );

    elsif v_match.phase in (
      'ROUND_OF_16',
      'QUARTERFINALS',
      'SEMIFINALS'
    ) then
      v_auto := public.champions_generate_next_knockout_phase(
        v_match.championship_id,
        v_match.phase
      );

    elsif v_match.phase = 'FINAL' then
      v_auto := public.champions_finish_season(
        v_match.championship_id
      );
    end if;

  else
    v_auto := jsonb_build_object(
      'success', true,
      'phase', v_match.phase,
      'advanced', false
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'match_id', v_match.id,
    'phase', v_match.phase,
    'winner_registration_id', v_winner_registration,
    'auto', v_auto
  );
end;
$$;

-- =========================================================
-- 10. FECHAR FINAL
-- =========================================================
create or replace function public.champions_close_final(
  p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final public.championship_matches%rowtype;
  v_champion_club_catalog_id uuid;
  v_season_label text;
begin
  perform public.champions_require_authenticated();

  select *
    into v_final
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'FINAL'
  order by match_number
  limit 1;

  if v_final.id is null then
    raise exception 'Final não encontrada.';
  end if;

  if v_final.status not in ('VALIDATED','WO','ADMIN_DECISION') then
    raise exception 'A final ainda não está encerrada.';
  end if;

  if v_final.winner_registration_id is null
     or v_final.winner_club_id is null then
    raise exception 'Campeão não definido.';
  end if;

  select cc.club_id
    into v_champion_club_catalog_id
  from public.championship_clubs cc
  where cc.id = v_final.winner_club_id;

  select season_label
    into v_season_label
  from public.championships
  where id = p_championship_id;

  update public.championships
  set
    status = 'CLOSED',
    updated_at = now()
  where id = p_championship_id;

  insert into public.championship_awards(
    championship_id,
    participant_id,
    club_id,
    award_type,
    title,
    award_data
  )
  select
    p_championship_id,
    reg.participant_id,
    v_champion_club_catalog_id,
    'CHAMPION',
    'CAMPEÃO',
    jsonb_build_object('phase','FINAL')
  from public.championship_registrations reg
  where reg.id = v_final.winner_registration_id
  on conflict do nothing;

  insert into public.ccfv_hall_of_fame(
    championship_id,
    participant_id,
    club_id,
    title,
    season
  )
  select
    p_championship_id,
    reg.participant_id,
    v_champion_club_catalog_id,
    'CAMPEÃO',
    v_season_label
  from public.championship_registrations reg
  where reg.id = v_final.winner_registration_id
  on conflict do nothing;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values(
    p_championship_id,
    'CHAMPION_CROWNED',
    'FINAL',
    jsonb_build_object(
      'registration_id', v_final.winner_registration_id,
      'championship_club_id', v_final.winner_club_id,
      'club_id', v_champion_club_catalog_id
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'status', 'CLOSED',
    'champion_registration_id', v_final.winner_registration_id,
    'champion_club_id', v_champion_club_catalog_id
  );
end;
$$;

-- =========================================================
-- 11. RANKING + HISTÓRICO
-- =========================================================
create or replace function public.champions_finalize_ranking_and_history(
  p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champion uuid;
  v_runner uuid;
  v_season_label text;
begin
  perform public.champions_require_authenticated();

  if (
    select status
    from public.championships
    where id = p_championship_id
  ) <> 'CLOSED' then
    raise exception 'A temporada precisa estar CLOSED.';
  end if;

  select winner_registration_id
    into v_champion
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'FINAL'
  limit 1;

  if v_champion is null then
    raise exception 'Campeão não encontrado.';
  end if;

  select case
    when home_registration_id = v_champion
      then away_registration_id
    else home_registration_id
  end
  into v_runner
  from public.championship_matches
  where championship_id = p_championship_id
    and phase = 'FINAL'
  limit 1;

  select season_label
    into v_season_label
  from public.championships
  where id = p_championship_id;

  delete from public.championship_ranking_points
  where championship_id = p_championship_id;

  delete from public.championship_history
  where championship_id = p_championship_id;

  -- Eliminados nos grupos
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select distinct
    p_championship_id,
    reg.participant_id,
    'GROUP_STAGE',
    50
  from public.championship_registrations reg
  join public.championship_group_standings standing
    on standing.registration_id = reg.id
   and standing.championship_id = p_championship_id
  where reg.championship_id = p_championship_id
    and standing.qualified = false;

  -- Perdedor das oitavas
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'ROUND_OF_16',
    100
  from public.championship_matches match
  join public.championship_registrations reg
    on reg.id = case
      when match.winner_registration_id = match.home_registration_id
        then match.away_registration_id
      else match.home_registration_id
    end
  where match.championship_id = p_championship_id
    and match.phase = 'ROUND_OF_16';

  -- Perdedor das quartas
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'QUARTERFINALS',
    150
  from public.championship_matches match
  join public.championship_registrations reg
    on reg.id = case
      when match.winner_registration_id = match.home_registration_id
        then match.away_registration_id
      else match.home_registration_id
    end
  where match.championship_id = p_championship_id
    and match.phase = 'QUARTERFINALS';

  -- Perdedor da semifinal
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'SEMIFINALS',
    250
  from public.championship_matches match
  join public.championship_registrations reg
    on reg.id = case
      when match.winner_registration_id = match.home_registration_id
        then match.away_registration_id
      else match.home_registration_id
    end
  where match.championship_id = p_championship_id
    and match.phase = 'SEMIFINALS';

  -- Vice
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'RUNNER_UP',
    350
  from public.championship_registrations reg
  where reg.id = v_runner;

  -- Campeão
  insert into public.championship_ranking_points(
    championship_id,
    participant_id,
    stage,
    points
  )
  select
    p_championship_id,
    reg.participant_id,
    'CHAMPION',
    500
  from public.championship_registrations reg
  where reg.id = v_champion;

  -- Histórico
  insert into public.championship_history(
    championship_id,
    participant_id,
    club_id,
    final_position,
    phase_reached,
    matches_played,
    wins,
    draws,
    losses
  )
  select
    p_championship_id,
    reg.participant_id,
    catalog.id,
    case
      when reg.id = v_champion then 1
      when reg.id = v_runner then 2
      else null
    end,
    case
      when reg.id = v_champion then 'CHAMPION'
      when reg.id = v_runner then 'FINAL'
      when exists (
        select 1
        from public.championship_matches m
        where m.championship_id = p_championship_id
          and m.phase = 'SEMIFINALS'
          and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
      ) then 'SEMIFINALS'
      when exists (
        select 1
        from public.championship_matches m
        where m.championship_id = p_championship_id
          and m.phase = 'QUARTERFINALS'
          and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
      ) then 'QUARTERFINALS'
      when exists (
        select 1
        from public.championship_matches m
        where m.championship_id = p_championship_id
          and m.phase = 'ROUND_OF_16'
          and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
      ) then 'ROUND_OF_16'
      else 'GROUP_STAGE'
    end,
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
    ),
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and m.winner_registration_id = reg.id
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
    ),
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
        and m.winner_registration_id is null
        and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
    ),
    (
      select count(*)
      from public.championship_matches m
      where m.championship_id = p_championship_id
        and m.winner_registration_id is not null
        and m.winner_registration_id <> reg.id
        and (m.home_registration_id = reg.id or m.away_registration_id = reg.id)
        and m.status in ('VALIDATED','WO','ADMIN_DECISION')
    )
  from public.championship_registrations reg
  join public.championship_clubs assignment
    on assignment.id = reg.selected_club_id
  join public.champions_clubs catalog
    on catalog.id = assignment.club_id
  where reg.championship_id = p_championship_id
  on conflict(championship_id, participant_id)
  do update set
    club_id = excluded.club_id,
    final_position = excluded.final_position,
    phase_reached = excluded.phase_reached,
    matches_played = excluded.matches_played,
    wins = excluded.wins,
    draws = excluded.draws,
    losses = excluded.losses;

  insert into public.championship_awards(
    championship_id,
    participant_id,
    club_id,
    award_type,
    title,
    award_data
  )
  select
    p_championship_id,
    reg.participant_id,
    catalog.id,
    'RUNNER_UP',
    'VICE-CAMPEÃO',
    jsonb_build_object('phase','FINAL')
  from public.championship_registrations reg
  join public.championship_clubs assignment
    on assignment.id = reg.selected_club_id
  join public.champions_clubs catalog
    on catalog.id = assignment.club_id
  where reg.id = v_runner
  on conflict do nothing;

  insert into public.championship_events(
    championship_id,
    event_type,
    phase,
    payload,
    created_by
  )
  values(
    p_championship_id,
    'RANKING_HISTORY_FINALIZED',
    'CLOSED',
    jsonb_build_object(
      'champion', v_champion,
      'runner_up', v_runner,
      'season', v_season_label
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'champion', v_champion,
    'runner_up', v_runner
  );
end;
$$;

-- =========================================================
-- 12. FECHAMENTO COMPLETO
-- =========================================================
create or replace function public.champions_finish_season(
  p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_close jsonb;
  v_finalize jsonb;
begin
  perform public.champions_require_authenticated();

  v_close := public.champions_close_final(p_championship_id);
  v_finalize := public.champions_finalize_ranking_and_history(p_championship_id);

  return jsonb_build_object(
    'success', true,
    'close', v_close,
    'finalize', v_finalize
  );
end;
$$;

-- =========================================================
-- 13. RESET DE TESTE
-- =========================================================
create or replace function public.champions_reset_season(
  p_championship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.champions_require_authenticated();

  delete from public.championship_ranking_points
  where championship_id = p_championship_id;

  delete from public.championship_history
  where championship_id = p_championship_id;

  delete from public.championship_awards
  where championship_id = p_championship_id;

  delete from public.ccfv_hall_of_fame
  where championship_id = p_championship_id;

  delete from public.championship_results
  where match_id in (
    select id
    from public.championship_matches
    where championship_id = p_championship_id
  );

  delete from public.championship_matches
  where championship_id = p_championship_id;

  delete from public.championship_group_standings
  where championship_id = p_championship_id;

  delete from public.championship_group_members
  where group_id in (
    select id
    from public.championship_groups
    where championship_id = p_championship_id
  );

  delete from public.championship_groups
  where championship_id = p_championship_id;

  delete from public.championship_pot_members
  where pot_id in (
    select id
    from public.championship_pots
    where championship_id = p_championship_id
  );

  delete from public.championship_pots
  where championship_id = p_championship_id;

  update public.championship_clubs
  set
    participant_id = null,
    pot_number = null,
    status = 'AVAILABLE',
    updated_at = now()
  where championship_id = p_championship_id;

  update public.championship_registrations
  set
    selected_club_id = null,
    status = 'PENDING',
    accepted_at = null,
    updated_at = now()
  where championship_id = p_championship_id;

  update public.championships
  set
    status = 'DRAFT',
    updated_at = now()
  where id = p_championship_id;

  return jsonb_build_object(
    'success', true,
    'status', 'DRAFT'
  );
end;
$$;

-- =========================================================
-- 14. PERMISSÕES
-- =========================================================
revoke all on function public.champions_require_authenticated() from public;
grant execute on function public.champions_require_authenticated() to authenticated;

revoke all on function public.champions_prepare_pots(uuid,boolean) from public;
grant execute on function public.champions_prepare_pots(uuid,boolean) to authenticated;

revoke all on function public.champions_draw_groups(uuid,boolean) from public;
grant execute on function public.champions_draw_groups(uuid,boolean) to authenticated;

revoke all on function public.champions_generate_group_matches(uuid,boolean) from public;
grant execute on function public.champions_generate_group_matches(uuid,boolean) to authenticated;

revoke all on function public.champions_recalculate_group_standings(uuid,uuid) from public;
grant execute on function public.champions_recalculate_group_standings(uuid,uuid) to authenticated;

revoke all on function public.champions_generate_round_of_16(uuid,boolean) from public;
grant execute on function public.champions_generate_round_of_16(uuid,boolean) to authenticated;

revoke all on function public.champions_generate_next_knockout_phase(uuid,text) from public;
grant execute on function public.champions_generate_next_knockout_phase(uuid,text) to authenticated;

revoke all on function public.champions_submit_result(uuid,integer,integer,text,text,integer,integer,text,text,text) from public;
grant execute on function public.champions_submit_result(uuid,integer,integer,text,text,integer,integer,text,text,text) to authenticated;

revoke all on function public.champions_close_final(uuid) from public;
grant execute on function public.champions_close_final(uuid) to authenticated;

revoke all on function public.champions_finalize_ranking_and_history(uuid) from public;
grant execute on function public.champions_finalize_ranking_and_history(uuid) to authenticated;

revoke all on function public.champions_finish_season(uuid) from public;
grant execute on function public.champions_finish_season(uuid) to authenticated;

revoke all on function public.champions_reset_season(uuid) from public;
grant execute on function public.champions_reset_season(uuid) to authenticated;

notify pgrst, 'reload schema';




-- ============================================================
-- ADMIN PRO
-- ============================================================

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
