CCFV Champions — Rodadas + ranking

WEB:
- pages/champions.html
- js/champions.js
- css/champions.css

SQL:
1) CCFV_CHAMPIONS_RODADAS_PONTOS_RANKING.sql
2) TESTE_CHAMPIONS_RODADAS_PONTOS.sql

O SQL:
- distribui os 6 jogos de cada grupo em 3 rodadas (2 jogos/rodada)
- corrige os jogos já gerados sem apagar resultados
- contabiliza 15/5/0 pontos na fase de grupos
- contabiliza 20 pontos por vitória no mata-mata
- atualiza Elo +24/+8/-12 no grupo
- atualiza Elo +28/-14 no mata-mata
- atualiza players.ranking_points e, quando existir a linha, ccfv_ranking
- faz backfill dos resultados já validados, para não perder o teste já lançado
