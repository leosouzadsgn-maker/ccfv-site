CCFV CHAMPIONS PRO

ALTERAÇÕES:
1. Tabela de grupos profissional: J V E D GP GC SG PTS.
2. 1º e 2º colocados ficam destacados.
3. Matchday com cartões profissionais, escudo, treinador, data, placar e status.
4. Pontos de partida:
   - Vitória: +15
   - Empate: +5
   - Derrota: +0
5. Mata-mata:
   - Vitória: +20
   - Derrota: +0
6. Elo CCFV:
   - Grupo: V +24 / E +8 / D -12
   - Mata-mata: V +28 / D -14
7. Elo nunca fica abaixo de 0.
8. Bônus de fase no fechamento:
   Grupo 20
   Oitavas 35
   Quartas 50
   Semifinal 65
   Vice 80
   Campeão 100
9. Resultado validado no Admin atualiza player e ranking automaticamente.
10. A página pública continua alimentada pelo Supabase.

ARQUIVOS WEB:
pages/champions.html
js/champions.js
css/champions.css

SQL:
supabase/CCFV_CHAMPIONS_PONTUACAO_E_ELO.sql
supabase/TESTE_CHAMPIONS_PONTOS_ELO.sql

ORDEM:
1. Execute CCFV_CHAMPIONS_PONTUACAO_E_ELO.sql.
2. Publique os 3 arquivos web.
3. Lance um resultado real no Admin.
4. Execute TESTE_CHAMPIONS_PONTOS_ELO.sql para conferir.
5. O ranking oficial CCFV usa os dados do sistema existente; a função tenta sincronizar ccfv_ranking quando ele for uma tabela. Se for view, ela permanece sendo calculada pela fonte existente.

PONTUAÇÃO:
A ideia é progressão lenta. Uma partida não muda a faixa de insignia sozinha.
