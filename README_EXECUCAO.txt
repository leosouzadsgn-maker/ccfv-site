CCFV CHAMPIONS — FECHAMENTO FINAL

O pacote resolve os pontos restantes vistos nas telas:
- campeão da Season aparece na página pública com treinador, escudo e foto;
- resultado da Season 01 é reconstruído no ranking/Elo sem duplicar em novas execuções;
- histórico + Hall da Fama são reconstruídos ao finalizar;
- o Admin passa a manter o histórico em view pública isolada;
- a tela Temporada volta a permitir criar Season 02, com 32 clubes, 4 potes e 8 grupos;
- a nova Season vira automaticamente a temporada atual depois de criada;
- a tela pública deixa de ficar presa ao código CCFV-CL-S01.

1) Supabase
Execute:
supabase/CCFV_CHAMPIONS_FECHAMENTO_FINAL.sql

O SQL faz sozinho a recuperação da Season 01 caso ela esteja CLOSED/ARCHIVED.

2) Conferência
Execute:
supabase/TESTE_FECHAMENTO_FINAL.sql

Confirme principalmente:
- campeão = Barcelona / treinador do cadastro correspondente;
- histórico = 32 participantes;
- 1 campeão e 1 vice;
- pontos/Elo do jogador atualizados;
- 63 jogos na Season 01.

3) Arquivos do site
Substitua:
- pages/champions.html
- js/champions.js
- css/champions.css
- admin/champions.html
- admin/js/champions.js
- admin/css/champions.css

4) Git
 git add .
 git commit -m "fix: finaliza champions com ranking historico e novas temporadas"
 git push origin main

5) Navegador
Depois do deploy: Ctrl + Shift + R.
