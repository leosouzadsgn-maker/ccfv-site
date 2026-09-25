-- CCFV // HISTÓRIA — fonte única de títulos
-- Fase 1: estrutura isolada. Não altera os motores existentes.
create table if not exists public.ccfv_titles (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.players(id) on delete restrict,
 competition_code text not null,
 competition_name text not null,
 season text not null,
 platform text,
 team_name text,
 club_name text,
 club_logo text,
 title text not null default 'CAMPEÃO',
 source_id uuid,
 awarded_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(player_id,competition_code,season)
);
create index if not exists ccfv_titles_player_idx on public.ccfv_titles(player_id);
create index if not exists ccfv_titles_competition_idx on public.ccfv_titles(competition_code,awarded_at desc);
alter table public.ccfv_titles enable row level security;
drop policy if exists "CCFV titles public read" on public.ccfv_titles;
create policy "CCFV titles public read" on public.ccfv_titles for select to anon,authenticated using(true);
grant select on public.ccfv_titles to anon,authenticated;
-- Nesta fase não há trigger automático nem alteração em players.titles.
-- Isso será ligado ao fechamento de cada competição na próxima etapa.
