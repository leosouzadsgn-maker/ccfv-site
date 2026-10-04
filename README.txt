CCFV — INSCRIÇÃO PÚBLICA — CORREÇÃO DO SELETOR DE FOTO

Fluxo: cadastro -> jogador criado com ELO 0 -> aparece no Ranking -> Player Card continua no Ranking.

Correção incluída: o seletor de foto agora é um button type=button que abre o input de arquivo via JavaScript, evitando qualquer submit/navegação acidental ao escolher a foto. A validação também aceita arquivos JPG/PNG/WEBP quando o navegador não informa o MIME type.

Arquivos:
pages/inscricao.html
css/inscricao.css
js/inscricao.js

Não altera ranking.js, ranking.css, Admin, motores das competições ou SQL.
