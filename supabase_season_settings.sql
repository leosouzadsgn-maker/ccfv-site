-- CCFV // CONFIGURAÇÃO GLOBAL DE TEMPORADA
-- Executar uma vez no Supabase SQL Editor.

create table if not exists public.ccfv_settings (
  id integer primary key default 1 check (id = 1),
  season_number integer not null default 1,
  season_name text not null default 'SEASON 01',
  season_status text not null default 'PREPARANDO',
  current_round integer not null default 1,
  total_rounds integer not null default 38,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.ccfv_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.ccfv_settings enable row level security;

-- Leitura pública para o site.
drop policy if exists "ccfv_settings_public_read" on public.ccfv_settings;
create policy "ccfv_settings_public_read"
on public.ccfv_settings
for select
to anon, authenticated
using (true);

-- Escrita autenticada para o painel administrativo.
drop policy if exists "ccfv_settings_authenticated_write" on public.ccfv_settings;
create policy "ccfv_settings_authenticated_write"
on public.ccfv_settings
for all
to authenticated
using (true)
with check (true);

create or replace function public.get_ccfv_settings()
returns public.ccfv_settings
language sql
security definer
set search_path = public
as $$
  select * from public.ccfv_settings where id = 1 limit 1;
$$;

create or replace function public.save_ccfv_settings(
  p_season_number integer,
  p_season_name text,
  p_season_status text,
  p_current_round integer,
  p_total_rounds integer,
  p_start_date date default null,
  p_end_date date default null,
  p_is_active boolean default true
)
returns public.ccfv_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ccfv_settings;
begin
  if p_season_number < 1 then raise exception 'season_number inválido'; end if;
  if p_current_round < 1 then raise exception 'current_round inválida'; end if;
  if p_total_rounds < 1 then raise exception 'total_rounds inválido'; end if;
  if p_current_round > p_total_rounds then raise exception 'current_round maior que total_rounds'; end if;

  insert into public.ccfv_settings (
    id, season_number, season_name, season_status, current_round,
    total_rounds, start_date, end_date, is_active, updated_at
  ) values (
    1, p_season_number, coalesce(nullif(trim(p_season_name), ''), 'SEASON ' || lpad(p_season_number::text, 2, '0')),
    upper(coalesce(nullif(trim(p_season_status), ''), 'PREPARANDO')),
    p_current_round, p_total_rounds, p_start_date, p_end_date, p_is_active, now()
  )
  on conflict (id) do update set
    season_number = excluded.season_number,
    season_name = excluded.season_name,
    season_status = excluded.season_status,
    current_round = excluded.current_round,
    total_rounds = excluded.total_rounds,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.get_ccfv_settings() from public;
grant execute on function public.get_ccfv_settings() to anon, authenticated;

revoke all on function public.save_ccfv_settings(integer, text, text, integer, integer, date, date, boolean) from public;
grant execute on function public.save_ccfv_settings(integer, text, text, integer, integer, date, date, boolean) to authenticated;

notify pgrst, 'reload schema';
