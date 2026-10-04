CCFV — NOVA INSCRIÇÃO PÚBLICA

ARQUIVOS
pages/inscricao.html
css/inscricao.css
js/inscricao.js
supabase/CCFV_INSCRICAO_PUBLICA.sql

INSTALAÇÃO
1. No projeto CCFV, copie inscricao.html para /pages/inscricao.html.
2. Copie inscricao.css para /css/inscricao.css.
3. Copie inscricao.js para /js/inscricao.js.
4. Execute o SQL CCFV_INSCRICAO_PUBLICA.sql no Supabase.
5. A página fica em /pages/inscricao.html.

IMPORTANTE
- A página não cria conta de autenticação.
- O visitante não escolhe competição.
- O cadastro cria o player com ELO/estatísticas/títulos em zero.
- O Player Card reaproveita o motor visual do ranking existente carregando ranking.html em um iframe oculto e clonando o card oficial gerado pelo próprio ranking.
- O cadastro não grava em player_competitions.
- A competição será vinculada pelo Admin depois.
- O SQL usa bucket exclusivo para as fotos de inscrição e uma RPC SECURITY DEFINER.
