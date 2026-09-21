CCFV CHAMPIONS — ÚLTIMA CORREÇÃO ANTES DO GIT

WEB:
- pages/champions.html
- js/champions.js
- css/champions.css

BANCO:
- supabase/CCFV_CHAMPIONS_RANKING_FINAL.sql
- supabase/TESTE_CHAMPIONS_RANKING_FINAL.sql

CORREÇÕES:
1. ccfv_ranking.matches_played passa a refletir V+E+D.
2. Sync do ranking sem usar alias no lado esquerdo do SET.
3. ranking_points, Elo, vitórias, empates, derrotas e títulos sincronizados.
4. rank_name recalculado pelo Elo.
5. ranking_position recalculado.
6. Campeão público em view V3.
7. Campeão público mostra FOTO + ESCUDO + CAMPEÃO.
8. Fallback público usa histórico e resultado da final.
9. Season 01 fechada é reparada automaticamente.
10. Layout existente da Champions é preservado.

EXECUÇÃO:
1. Rode CCFV_CHAMPIONS_RANKING_FINAL.sql no Supabase.
2. Rode TESTE_CHAMPIONS_RANKING_FINAL.sql.
3. Confirme campeão + histórico + ranking.
4. Substitua os 3 arquivos web.
5. Só então faça o Git.

11. O SQL também corrige a função V2 usada internamente pelo rebuild da Champions, evitando o erro anterior do alias no SET.
