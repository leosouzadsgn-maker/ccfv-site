# CCFV LIGA — CHECKPOINT DE CONTINUIDADE
**Data:** 02/11/2026  
**Repositório:** `leosouzadsgn-maker/ccfv-site` · branch `main`  
**Deploy:** Vercel em `https://ccfv-site.vercel.app`  
**Stack:** site estático HTML/CSS/JS + Supabase JS v2 via CDN.

## 1. Objetivo
Construir a Liga CCFV como módulo independente do site e do Admin principal, sem alterar as competições antigas. A Liga organiza 36 clubes (12 por Série A/B/C), temporadas mensais, campeonato de 22 rodadas em ida e volta, três copas, resultados lançados e conferidos pelo administrador, premiações e histórico.

## 2. Decisões que não podem ser perdidas
- eFootball é individual: clube é identidade esportiva do participante, não elenco tradicional. **Não implementar transferências de atletas entre jogadores.**
- Um único cadastro de jogador em `public.players`; não duplicar identidades.
- O participante só cria/assume clube depois de vínculo confirmado (`link_status='ACTIVE'`).
- Um jogador representa no máximo um clube por temporada.
- Temporada comporta 36 clubes: 12 por divisão. Campeonato de divisão: 22 rodadas por clube; 3 pontos por vitória, 1 por empate, 0 por derrota.
- Promoção/rebaixamento: três por divisão adjacente, conforme regra final da temporada.
- Copas: Interdivisional (36 clubes), Elite (8 primeiros da A após 11ª rodada), Integração (24 clubes de B+C).
- Resultados: participantes enviam imagem no grupo oficial de WhatsApp; admin confere e registra o placar no site. Não haverá upload de comprovante no site. Edições precisam ser auditadas. Pênaltis separados do placar normal no mata-mata.
- Identidade: preto/verde/dourado, Inter + Playfair Display. Clube individual tem banner panorâmico, escudo e cores próprias isoladas na sua página.
- Preservar `/admin/`, tabelas antigas e campeonatos antigos. Não reaproveitar `championship_*` sem auditoria explícita.
- Fazer etapas incrementais, conferir arquivos/contratos antes de alterar, não afirmar deploy/teste que não aconteceu.

## 3. Arquitetura e caminhos confirmados
- `liga/index.html`: portal institucional da Liga.
- `liga/login.html`: autenticação, cadastro e recuperação.
- `liga/js/login.js`: fluxo de Auth e vínculo.
- `liga/admin/index.html`: painel administrativo geral.
- `liga/admin/vinculos.html`: pedidos de vínculo.
- `liga/admin/clubes.html`: listagem real (somente leitura) pela RPC de clubes.
- `liga/admin/temporadas.html`, `inscricoes.html`, `divisoes.html`, `campeonato.html`, `copas.html`, `resultados.html`, `premiacoes.html`, `historico.html`, `configuracoes.html`: estrutura criada; alguns módulos receberam integração de leitura nesta atualização.
- `liga/admin/css/modulos.css`: CSS compartilhado.
- `liga/admin/js/modulos.js`: autenticação comum, consulta clubes e módulos de leitura adicionais.
- `admin/index.html`: submenu Liga CCFV adicionado. Preservar o resto do painel.
- Git workflow local do usuário: `git status`, `git add liga/admin/`, `git commit`, `git push origin main`; Vercel deploy automático pela branch `main`.

## 4. Estado comprovado pelo usuário em 02/11/2026
- Admin principal abre; submenu Liga foi adicionado. O usuário decidiu manter a navegação das páginas da Liga separada e não precisa alterar a sidebar antiga.
- Tela `/liga/admin/vinculos.html` foi publicada e a listagem real carregou três registros pendentes: Weuler Neri (`CCFV-022`), Agner (`CCFV-040`) e Léo Souza (`CCFV-001`). **Nenhum vínculo foi aprovado**; o usuário decidiu aguardar que os outros painéis fiquem prontos.
- A RPC `ccfv_league_admin_list_player_links(p_status text default 'PENDING', p_limit integer default 100)` existe e foi testada.
- `ccfv_league_get_my_player_link()` existe e foi criada para evitar leitura direta negada em `ccfv_league_player_accounts`.
- A lista de clubes via `ccfv_league_admin_list_clubs(...)` foi preparada na página `clubes.html`, com pesquisa, filtros e modal de detalhes. Isso é consulta, não prova de ação de escrita.
- O usuário instalou os dez HTML administrativos na árvore `liga/admin/`, além de `css/modulos.css` e `js/modulos.js`.
- Foi criado pacote de atualização para Clubes; usuário fez upload dos arquivos na pasta local. A publicação mais recente ainda depende de confirmar `git push` do conjunto de arquivos.

## 5. Inventário atual de RPCs informado pelo usuário
Todas aparecem no schema `public`, retorno `jsonb`, `SECURITY DEFINER=true`:

| Função | Parâmetros |
|---|---|
| `ccfv_league_admin_assign_divisions` | `p_season_id uuid, p_ranked_enrollment_ids jsonb, p_note text default null` |
| `ccfv_league_admin_change_club_status` | `p_club_id uuid, p_action text, p_note text default null` |
| `ccfv_league_admin_change_season_status` | `p_season_id uuid, p_new_status text, p_note text default null` |
| `ccfv_league_admin_confirm_season_club` | `p_enrollment_id uuid, p_note text default null` |
| `ccfv_league_admin_create_season` | `p_season_code text, p_name text, p_starts_on date, p_ends_on date, p_is_test boolean default false` |
| `ccfv_league_admin_dashboard` | `p_season_id uuid default null` |
| `ccfv_league_admin_decide_season_club` | `p_enrollment_id uuid, p_action text, p_note text default null` |
| `ccfv_league_admin_link_player` | `p_auth_user_id uuid, p_player_id uuid` |
| `ccfv_league_admin_list_clubs` | `p_status text default null, p_search text default null, p_limit int default 50, p_offset int default 0` |
| `ccfv_league_admin_list_player_links` | `p_status text default 'PENDING', p_limit int default 100` |
| `ccfv_league_admin_list_season_clubs` | `p_season_id uuid, p_status text default null, p_search text default null, p_limit int default 50, p_offset int default 0` |
| `ccfv_league_admin_list_seasons` | `p_status text default null, p_search text default null, p_limit int default 50, p_offset int default 0` |
| `ccfv_league_admin_review_club` | `p_club_id uuid, p_decision text, p_note text default null` |
| `ccfv_league_admin_review_player_link` | `p_auth_user_id uuid, p_decision text, p_note text default null` |
| `ccfv_league_create_club` | `p_name text, p_slug text, p_short_name text default null, p_crest_url text default null, p_banner_url text default null, p_primary_color text default '#1F8F5F', p_secondary_color text default '#0B1210', p_accent_color text default '#D6B45A', p_motto text default null, p_description text default null, p_city text default null, p_founded_year smallint default null` |
| `ccfv_league_get_my_player_link` | sem parâmetros |
| `ccfv_league_register_my_club` | `p_season_id uuid` |
| `ccfv_league_request_player_link` | `p_player_code text` |
| `ccfv_league_update_my_club` | `p_name text, p_slug text, p_short_name text, p_crest_url text, p_banner_url text, p_primary_color text, p_secondary_color text, p_accent_color text, p_motto text, p_description text, p_city text, p_founded_year smallint` |

**Não confundir existência com funcionamento validado:** as assinaturas estão identificadas, mas o corpo SQL das funções, seus `p_action`/`p_decision`, os formatos de JSON e os resultados precisam ser consultados antes de ativar ações de escrita.

## 6. Estruturas atuais do banco confirmadas por introspecção
### `ccfv_league_clubs` (resultado atual do usuário)
`id uuid`, `owner_player_id uuid`, `name text`, `short_name text`, `slug text`, `crest_url text`, `banner_url text`, `primary_color text`, `secondary_color text`, `accent_color text`, `motto text`, `description text`, `city text`, `founded_year smallint`, `status text`, `created_by_user_id uuid`, `created_at timestamptz`, `updated_at timestamptz`.

**Divergência importante:** uma migration antiga da Liga contém `owner_auth_user_id`, `region` e `is_public`, mas a consulta atual da tabela não listou essas colunas. O schema vivo é a fonte de verdade; não gravar nem selecionar colunas ausentes. Conferir `pg_get_functiondef` da RPC antes de alterar o cliente.

### `ccfv_league_player_accounts`
`auth_user_id uuid`, `player_id uuid`, `link_status text`, `requested_at timestamptz`, `verified_at timestamptz`, `verified_by uuid`, `created_at timestamptz`, `updated_at timestamptz`.

### `ccfv_league_audit_logs` (resultado atual do usuário)
`id uuid`, `actor_user_id uuid`, `season_id uuid`, `action text`, `entity_type text`, `entity_id uuid`, `old_data jsonb`, `new_data jsonb`, `metadata jsonb`, `created_at timestamptz`.
- `season_id` aceita `NULL` (`is_nullable=YES`, sem default).
- Isso confirma a estrutura real usada pelas funções da versão atual; prevalece sobre migration antiga que mencionava `before_data`, `after_data`, `reason` e não tinha `season_id`.
- A migration de policies encontrada no projeto define SELECT de auditoria apenas com `ccfv_is_admin()` e grants de SELECT/INSERT a authenticated, sem UPDATE/DELETE. A página de histórico usa leitura somente.

### Estados conhecidos pela estrutura de `ccfv_league_season_clubs`
`registration_status`: `PENDING`, `ACTIVE`, `WITHDRAWN`, `REPLACED`, `PROMOTED`, `RELEGATED`.
`division`: `SERIE_A`, `SERIE_B`, `SERIE_C`.
`division_position`: nulo ou 1–12.
A estrutura possui snapshots do clube por temporada e unicidades por `season_id+club_id`, `season_id+player_id` e posição por divisão.

### Estados da temporada encontrados em migrations
`DRAFT`, `REGISTRATION`, `QUALIFIER`, `TEST`, `ACTIVE`, `CLOSED`, `ARCHIVED`, `CANCELLED`. Verificar se a constraint atual continua igual.

## 7. Segurança e operação
- Frontend usa apenas Supabase publishable/anon key. Nunca inserir `service_role` no navegador.
- Cada página administrativa verifica a sessão e chama `ccfv_is_admin()` antes de exibir o painel.
- SECURITY DEFINER não significa que a chamada esteja automaticamente correta: as funções precisam validar `auth.uid()`, `ccfv_is_admin()` e entradas no servidor.
- Não confiar em `owner_player_id` fornecido pelo browser para criar clube; a RPC deve resolver vínculo e dono pela conta autenticada.
- Não aprovar vínculos até auditar as definições e testar em conta/jogador de teste. Não apagar nem modificar a solicitação real do Léo.
- Não executar `ccfv_league_admin_confirm_season_club` até revisar se é legado/retirado; migration 021 revogou execute dessa função e `ccfv_league_admin_decide_season_club` existe como caminho atualizado. Confirmar permissões reais antes de chamar.
- `ccfv_league_admin_assign_divisions` recebe `p_ranked_enrollment_ids` como JSONB, mas o formato esperado e o critério de ordenação não foram confirmados. Não habilitar botão ainda.
- `ccfv_league_admin_create_season` não recebe mensalidade como argumento; a tabela tem `monthly_fee` default de R$15,00 numa migration anterior. Confirmar como a função trata `p_is_test=true`, porque temporada de teste Dezembro/2026 foi planejada como gratuita.
- Não ativar ações administrativas por adivinhação de `p_action`, `p_decision` ou status.

## 8. Estado da atualização de frontend preparada nesta conversa
Foi preparado um ZIP de adiantamento que:
- preserva a listagem de clubes existente;
- conecta consultas somente leitura de temporadas (`ccfv_league_admin_list_seasons`);
- conecta consulta somente leitura das inscrições de temporada (`ccfv_league_admin_list_season_clubs`);
- mostra clubes por divisão, com 12 posições por série, sem atribuir/mover;
- conecta histórico somente leitura à tabela `ccfv_league_audit_logs`;
- mantém criação de temporada, decisão de inscrição e distribuição de divisões bloqueadas, aguardando revisão do corpo SQL das RPCs;
- inclui um SQL de diagnóstico que consulta definições, constraints, RLS e policies.

Instalação: extrair na raiz do projeto permitindo substituir `liga/admin/temporadas.html`, `inscricoes.html`, `divisoes.html`, `historico.html`, `css/modulos.css` e `js/modulos.js`. Não substituir `index.html`, `vinculos.html`, `login.html` ou o Admin principal.

## 9. Próximo passo exato
1. Instalar o pacote de adiantamento (se ainda não instalado) e testar as quatro páginas de leitura após publicar.
2. No Supabase executar `supabase/CCFV_LIGA_DIAGNOSTICO_RPC_E_SCHEMA.sql` e copiar especialmente os corpos das funções listadas. Não expor tokens/credenciais.
3. Com os corpos em mãos, habilitar as operações seguras nesta ordem: (a) create season com regra da temporada teste; (b) review/change club status; (c) decide enrollment; (d) assignment divisions, apenas com formato de ranking e validações confirmados.
4. Próximo bloco de modelagem: inspecionar todas as tabelas e funções de partidas/competições próprias da Liga. Ainda não há RPC inventariada para geração de 22 rodadas, cálculo da classificação, copas, resultados auditados ou premiações. Não reutilizar tabelas/funções legadas sem auditoria e idempotência.
5. Desenvolver portal do participante e página pública individual do clube após estabilizar a fundação operacional.

## 10. Prompt de retomada para uma nova conversa
> Vamos continuar a Liga CCFV a partir do arquivo `CCFV_LIGA_CONTINUIDADE_2026-11-02.md`. Leia tudo antes de propor mudanças. Estamos no repositório `leosouzadsgn-maker/ccfv-site`, branch `main`, site estático HTML/CSS/JS com Supabase JS v2. Preserve o Admin principal e competições existentes. O inventário atual de RPCs, schemas reais, decisões, riscos e estado do frontend está no checkpoint. Não repetir perguntas respondidas. Primeiro confirmar se o pacote de adiantamento foi instalado/publicado, executar o SQL de diagnóstico para obter os corpos das RPCs e depois continuar, em etapas, ativando ações de escrita somente após validar contratos e segurança. O usuário quer acelerar bastante sem perder continuidade.
