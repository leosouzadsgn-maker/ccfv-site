CCFV CHAMPIONS — CORREÇÃO DEFINITIVA DO SELECTOR

O banco já foi validado: championship_public_clubs_options retorna 32 clubes.

O problema restante era exclusivamente no admin.js: o arquivo em uso não carregava os 32 IDs dos clubes e não preenchia o select.

Esta versão resolve sem novo SQL:

1. O select Champions é preenchido localmente com os 32 championship_club_id reais da Season 01.
2. Depois o sistema consulta a view pública apenas para marcar clubes já ocupados.
3. O salvamento usa a RPC champions_register_player existente.
4. Não consulta sort_order na view antiga.

ARQUIVOS:
admin/index.html
admin/admin.js

No seu projeto, substitua:
admin/index.html
admin/js/admin.js

IMPORTANTE:
- Não execute instaladores antigos.
- Não execute outro SQL agora.
- Não altere as tabelas da Champions.

TESTE:
Admin > Jogadores > + NOVO JOGADOR > Champions League
O select deve abrir já com os 32 clubes.
