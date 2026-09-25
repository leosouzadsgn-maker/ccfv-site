# CCFV — Patch cirúrgico

Base: versão estável enviada antes da última alteração que quebrou o menu.

Alterações neste pacote, e somente estas:
- padroniza o menu público com Início, Brasileirão, Champions League, Night Cup, Mobile, Ranking e História;
- remove Partidas da navegação, sem apagar os arquivos de partidas;
- adiciona os escudos oficiais pequenos na tabela do Brasileirão;
- adiciona os escudos pequenos na área de Próxima Rodada do hero do Brasileirão.

Não altera:
- admin;
- Supabase;
- motor de partidas;
- ranking;
- página/arte da História;
- troféus;
- dados das competições.

Arquivos alterados:
- index.html
- pages/*.html (somente navegação)
- js/brasileirao.js
- css/brasileirao.css
