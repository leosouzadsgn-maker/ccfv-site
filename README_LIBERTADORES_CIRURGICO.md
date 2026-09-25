# CCFV — Libertadores — Patch Cirúrgico

## Objetivo
Adicionar a Libertadores CCFV sem alterar o motor das competições já em andamento.

## O que este patch adiciona
- `/pages/libertadores.html` — página pública isolada.
- `/js/libertadores.js` — leitura pública ligada ao Supabase.
- `/css/libertadores.css` — visual isolado.
- `/admin/libertadores.html` — operação da Libertadores no Admin.
- `/admin/js/libertadores.js` — operação + resultados + inscrições.
- `/admin/css/libertadores.css` — visual do Admin da Libertadores.
- `/supabase/CCFV_LIBERTADORES_CIRURGICO.sql` — tabelas, views, RLS e RPCs.

## Arquivos existentes que NÃO fazem parte deste patch
Não substitua `index.html`, `admin/index.html`, `admin/js/admin.js`, `admin/js/auth.js`, `pages/brasileirao.html`, `js/brasileirao.js`, `css/brasileirao.css`, `pages/champions.html`, `pages/night.html`, `pages/mobile.html`, `pages/ranking.html`, `pages/historia.html` ou qualquer motor existente.

O link `Libertadores` do painel Admin já existe no `admin/index.html` atual do repositório e passa a apontar para a nova página adicionada por este patch.

## Formato da Libertadores CCFV
- 32 clubes.
- 8 grupos de 4.
- 6 rodadas na fase de grupos.
- Cada clube faz 6 jogos na fase de grupos: 3 em casa e 3 fora.
- 12 jogos por grupo / 96 jogos na fase de grupos.
- Dois primeiros de cada grupo avançam.
- Oitavas, quartas e semifinais: ida e volta.
- Final: jogo único.
- Oitavas/quartas/semifinais: empate no agregado após 90 minutos => pênaltis.
- Final: empate após 90 => prorrogação de 30 minutos => pênaltis.
- Sem regra de gol fora.
- Total teórico da competição: 125 partidas (96 + 16 + 8 + 4 + 1).

## Inscrição de jogadores
O Admin da Libertadores trava a relação jogador ↔ clube no banco:
- um clube não pode ser vinculado a outro jogador depois de confirmado;
- um jogador não pode ocupar dois clubes na mesma Libertadores;
- a linha do clube fica protegida depois do vínculo;
- a operação passa por RPC com `FOR UPDATE` e índice único por temporada/jogador.

No cadastro geral já existente, o Brasileirão e o Brasileirão Mobile já possuem a trava de clube ocupado no `admin/js/admin.js`; este patch não reescreve esse código para evitar impacto na competição atual.

## Fases do Admin
1. Temporada
2. Inscrições
3. Sorteio
4. Grupos
5. Partidas
6. Oitavas
7. Quartas
8. Semifinais
9. Final
10. História/Auditoria

O campeão é gravado em `ccfv_titles` com `competition_code = 'LIBERTADORES'`.

## Ordem segura de aplicação
1. Mantenha a versão atual do site intacta.
2. Copie somente os arquivos novos deste patch para as mesmas pastas do projeto.
3. No Supabase SQL Editor, execute `supabase/CCFV_LIBERTADORES_CIRURGICO.sql` uma vez.
4. Abra `/admin/libertadores.html` autenticado.
5. Faça o fluxo de teste antes de publicar: temporada → vínculos → sorteio → geração de 96 jogos.
6. Só depois faça o commit/push.

## Importante
O patch foi mantido isolado de propósito. A mudança da Home e o novo menu `COMPETIÇÕES` devem ser um segundo patch, depois que a Libertadores for validada, para não misturar uma mudança estrutural com uma competição em andamento.
