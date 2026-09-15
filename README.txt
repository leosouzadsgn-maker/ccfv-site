CCFV CHAMPIONS — FRONTEND

Arquivos:
pages/champions.html
css/champions.css
js/champions.js
admin/champions.html
admin/css/champions.css
admin/js/champions.js
NAV_CHAMPIONS_PATCH.txt

Copiar para o projeto:
- pages/champions.html -> SITE/pages/champions.html
- css/champions.css -> SITE/css/champions.css
- js/champions.js -> SITE/js/champions.js
- admin/champions.html -> SITE/admin/champions.html
- admin/css/champions.css -> SITE/admin/css/champions.css
- admin/js/champions.js -> SITE/admin/js/champions.js

O frontend utiliza:
- public.championships
- public.championship_clubs / public.champions_clubs
- public.championship_registrations
- public.championship_public_standings
- public.championship_public_matches
- RPCs da engine da Champions

A página pública segue o padrão visual/estrutural CCFV do Brasileirão, sem reutilizar a lógica de outra competição.

O Admin já possui:
- dashboard
- edição de Season 01
- lista de 32 clubes
- inclusão de participante + clube
- preparação dos potes
- sorteio
- geração de 48 jogos
- grupos
- lançamento de placares
- mata-mata
- histórico/Hall

Observação:
O vínculo "Competição Champions" dentro do cadastro geral de Jogadores ainda é uma integração separada. O painel Champions já consegue registrar um jogador existente em players diretamente.
