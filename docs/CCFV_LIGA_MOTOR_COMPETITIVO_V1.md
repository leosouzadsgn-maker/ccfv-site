# CCFV Liga — Motor Competitivo V1

Esta entrega adiciona uma central administrativa unificada e um motor próprio de competições para a Liga. A implementação é separada do Admin principal e das competições antigas da CCFV.

## Base respeitada

A implementação usa os campos reais compartilhados pelo usuário:

- `ccfv_league_season_clubs`: `id`, `season_id`, `club_id`, `division`, `status`, snapshots do clube, `final_position` e `qualifier_position`.
- `ccfv_league_seasons`: `season_code`, `name`, `starts_on`, `ends_on`, `status`, `is_test`, `is_public`, `monthly_fee`, `max_clubs` e timestamps.
- `ccfv_league_clubs`: usa `owner_player_id`, `status`, `crest_url`, `banner_url` e cores.
- `ccfv_league_audit_logs`: `actor_user_id`, `season_id`, `action`, `entity_type`, `entity_id`, `old_data`, `new_data`, `metadata`, `created_at`.

Não utiliza uma coluna `division_position` que não consta no schema atual. A ordem geral usa `qualifier_position` (1 a 36) e `division`.

## Novo modelo

- `ccfv_league_competitions`: campeonatos e copas de uma temporada.
- `ccfv_league_competition_entries`: participantes e sementes.
- `ccfv_league_matches`: partidas, datas, placares, pênaltis e vencedores.

Todas as tabelas são protegidas por RLS e sem grants diretos ao browser. A administração opera por RPCs `SECURITY DEFINER`, que verificam `auth.uid()` e `ccfv_is_admin()`.

## Regras implementadas

1. Temporada: RASCUNHO → INSCRIÇÕES → ATIVA → ENCERRADA → ARQUIVADA. Teste gratuito; oficial com mensalidade R$ 15,00; máximo de 36 clubes.
2. Inscrição: aprovar `PENDING` para `CONFIRMED` ou rejeitar usando `WITHDRAWN` (permite solicitar novamente pela RPC existente). Aprovação exige clube ACTIVE e jogador CCFV ACTIVE.
3. Divisões: lista ordenada com 36 inscrições confirmadas; posições 1–12 A, 13–24 B, 25–36 C.
4. Brasileirão: três competições de 12 clubes; 22 rodadas de ida e volta; 6 partidas por rodada; 132 jogos por série; 396 no total.
5. Pontuação: vitória 3, empate 1, derrota 0. Desempates: pontos, vitórias, saldo, gols pró e nome do clube.
6. Copas: Interdivisional 36; Elite top 8 da Série A após a rodada 11; Integração 24 de B+C.
7. Resultados: correções exigem justificativa e são auditadas. Pênaltis são separados do placar e apenas para mata-mata empatado.
8. Finalização: exige 396 resultados de liga e as três copas concluídas; grava posições finais e movimentos de acesso/rebaixamento em A/B/C.

## Formatos de mata-mata adotados nesta V1

Os materiais de continuidade disponíveis confirmavam quantidade de participantes e corte da Copa Elite, mas não o regulamento completo de mando e chaveamento das três copas. Para entregar um motor operável sem inventar silenciosamente regras, o V1 usa o seguinte padrão técnico explicitado no painel:

- Interdivisional: 28 primeiros recebem bye; sementes 29–36 fazem quatro preliminares; vencedores completam 32.
- Integração: oito primeiros recebem bye; sementes 9–24 fazem oito preliminares; vencedores completam 16.
- Elite: quartas 1×8, 2×7, 3×6, 4×5.
- Jogo único; em empate no placar normal, disputa de pênaltis separada.

**Antes de gerar as copas oficiais, confirme esse desenho com o regulamento final da Liga.** Ajuste de ida/volta, mando ou outra chave exige revisar o gerador antes da primeira geração; depois de geradas, as competições ficam congeladas contra duplicidade.

## Rotas e arquivos

- `/liga/admin/competicoes.html`: nova central unificada.
- `/liga/admin/campeonato.html`: redireciona para a aba Brasileirão.
- `/liga/admin/copas.html`: redireciona para a aba Copas.
- `/liga/admin/resultados.html`: redireciona para Partidas e Resultados.
- `liga/js/login-auto-redirect.js`: depois do vínculo ACTIVE leva ao painel do participante na aba Meu clube.
- `liga/js/painel-tab-redirect.js`: abre a aba indicada por `?tab=club`.
- `supabase/CCFV_LIGA_MOTOR_COMPETICO_V1.sql`: criação das tabelas, RPCs e permissões.
- `supabase/CCFV_LIGA_MOTOR_VERIFICAR.sql`: verificação somente leitura.

## Fora do escopo desta V1

O painel público do clube/jogador ainda não recebe automaticamente calendário, partidas e classificação. Esta entrega prepara e opera o motor administrativo; a integração visual dos dados nos painéis de participantes e nas páginas públicas é uma etapa posterior. Também não implementa transferências de jogadores.
