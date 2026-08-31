# CCFV Mobile

Modulo separado para Brasileirão Mobile, Arena Cup e Ranking Mobile.

## Banco
Execute `supabase_mobile.sql` no Supabase uma única vez.

## Isolamento
O Mobile usa `ccfv_mobile_matches` e `ccfv_mobile_ranking`, portanto não altera `matches`/`ccfv_ranking` do PC/Console.

## Jogadores
No Admin, jogadores com plataforma MOBILE podem ser usados pelo módulo.
