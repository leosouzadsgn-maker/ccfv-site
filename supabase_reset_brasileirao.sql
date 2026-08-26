-- CCFV // RESET SEGURO DO BRASILEIRÃO
create or replace function public.reset_ccfv_brasileirao()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  delete from public.matches
  where translate(upper(coalesce(competition, '')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOUC') like 'BRASILEIRAO%';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.reset_ccfv_brasileirao() from public;
grant execute on function public.reset_ccfv_brasileirao() to authenticated;

-- CCFV // EXCLUSÃO SEGURA DE JOGADOR
-- Remove partidas que referenciam o jogador e depois o jogador.
create or replace function public.delete_ccfv_player_cascade(p_player_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_matches integer := 0;
begin
  delete from public.matches
  where home_player_id = p_player_id
     or away_player_id = p_player_id;

  get diagnostics deleted_matches = row_count;

  delete from public.players
  where id = p_player_id;

  if not found then
    raise exception 'Jogador não encontrado.';
  end if;

  return deleted_matches;
end;
$$;

revoke all on function public.delete_ccfv_player_cascade(uuid) from public;
grant execute on function public.delete_ccfv_player_cascade(uuid) to authenticated;
