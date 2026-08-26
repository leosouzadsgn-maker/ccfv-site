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
