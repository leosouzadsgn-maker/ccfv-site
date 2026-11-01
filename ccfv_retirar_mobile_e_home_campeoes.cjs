#!/usr/bin/env node
/**
 * CCFV — retirada do módulo competitivo Mobile + Home com Hall dos Campeões.
 * Execute na raiz do repositório: node ccfv_retirar_mobile_e_home_campeoes.cjs
 *
 * Segurança:
 * - Não executa SQL e não apaga dados/tabelas do Supabase.
 * - Mantém CSS responsivo, menu hambúrguer e navegação para telas menores.
 * - Cria backup dos arquivos antes de gravar.
 * - Faz validações de marcadores antes de modificar os arquivos.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_DIR = path.join(ROOT, `_backup_ccfv_sem_mobile_${new Date().toISOString().replace(/[:.]/g, '-')}`);
const changes = new Map();
const summary = [];

function read(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório não encontrado: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}
function put(rel, content, note) {
  changes.set(rel, content);
  summary.push(`${rel}: ${note}`);
}
function replaceOnce(source, oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: esperado 1 ocorrência, encontrado ${count}. Nenhum arquivo foi gravado.`);
  return source.replace(oldText, newText);
}
function replaceRegex(source, regex, replacement, label, min = 1) {
  const matches = source.match(regex) || [];
  if (matches.length < min) throw new Error(`${label}: esperado pelo menos ${min} ocorrência(s), encontrado ${matches.length}. Nenhum arquivo foi gravado.`);
  return source.replace(regex, replacement);
}
function removeMobileAnchors(source) {
  // Remove somente links para o módulo Mobile; os botões de menu responsivo ficam intactos.
  return source.replace(/<a\b(?=[^>]*href=["'][^"']*(?:mobile\.html|brasileirao-mobile\.html|ranking-mobile\.html|partidas-mobile\.html|arena-cup\.html|jogadores-mobile\.html)[^"']*["'])[^>]*>[\s\S]*?<\/a>\s*/gi, '');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

// ------------------------------------------------------------
// 1) HOME — remove Mobile, completa navegação e inclui o Hall.
// ------------------------------------------------------------
{
  let s = read('index.html');
  s = replaceOnce(s,
    '            <a href="pages/night.html" class="ccfv-header__link">Night Cup</a>\n',
    '            <a href="pages/night.html" class="ccfv-header__link">Night Cup</a>\n            <a href="pages/libertadores.html" class="ccfv-header__link">Libertadores</a>\n            <a href="pages/copa-do-mundo.html" class="ccfv-header__link">Copa do Mundo</a>\n',
    'Adicionar Libertadores e Copa do Mundo à navegação da Home'
  );
  s = removeMobileAnchors(s);
  s = replaceRegex(s, /<article class="ccfv-home-competition" data-reveal data-reveal-delay="270">[\s\S]*?<\/article>\s*/g, '', 'Remover card Mobile da Home');
  s = replaceOnce(s, 'SEIS CAMINHOS.<br><span>UMA HISTÓRIA.</span>', 'CINCO COMPETIÇÕES.<br><span>UM LEGADO.</span>', 'Atualizar chamada de competições');
  s = replaceOnce(s,
    'A Home passa a ser o centro do universo CCFV: cada competição tem identidade própria, regras próprias e um caminho separado até o troféu.',
    'Cinco competições oficiais. Cinco caminhos para a glória. Cada resultado constrói a história da Confederação Coliseu de Futebol Virtual.',
    'Atualizar texto de apresentação das competições'
  );
  s = replaceOnce(s, 'SEASON 01 • PC + CONSOLE • MOBILE • HISTÓRIA OFICIAL', 'SEASON 01 • PC + CONSOLE • HISTÓRIA OFICIAL', 'Remover referência Mobile do Hero');
  s = s.replace('data-reveal-delay="360"', 'data-reveal-delay="270"').replace('data-reveal-delay="450"', 'data-reveal-delay="360"');
  s = replaceOnce(s,
    '    <link rel="stylesheet" href="css/home.css">',
    '    <link rel="stylesheet" href="css/home.css">\n    <link rel="stylesheet" href="css/home-champions.css">',
    'Adicionar CSS do Hall dos Campeões'
  );
  s = replaceOnce(s,
    '<script src="js/ccfv-live.js" defer></script>',
    '<script src="js/ccfv-live.js" defer></script>\n<script src="js/home-champions.js" defer></script>',
    'Adicionar carregamento automático dos campeões'
  );
  const hall = `
    <section class="ccfv-home-section ccfv-home-champions" id="hall-dos-campeoes" aria-labelledby="home-champions-title">
        <div class="ccfv-home-section__inner">
            <div class="ccfv-home-section__heading" data-reveal>
                <div>
                    <span class="ccfv-home-section-kicker">CCFV // HALL DA FAMA</span>
                    <h2 id="home-champions-title">QUEM VENCEU.<br><span>ENTROU PARA A HISTÓRIA.</span></h2>
                </div>
                <p>Os campeões oficiais de cada competição, registrados no arquivo histórico da CCFV. Cada conquista tem nome, temporada e lugar no legado.</p>
            </div>
            <div class="ccfv-home-champions__grid" id="home-champions-grid" aria-live="polite">
                <div class="ccfv-home-champions__loading">CARREGANDO OS CAMPEÕES OFICIAIS...</div>
            </div>
            <div class="ccfv-home-champions__footer">
                <span>REGISTRO OFICIAL • CCFV</span>
                <a href="pages/historia.html">ABRIR HISTÓRIA COMPLETA →</a>
            </div>
        </div>
    </section>

`;
  s = replaceOnce(s,
    '    <section class="ccfv-home-section ccfv-home-live"',
    hall + '    <section class="ccfv-home-section ccfv-home-live"',
    'Inserir Hall dos Campeões antes do painel Live'
  );
  put('index.html', s, 'Home sem Mobile; links para as cinco competições e Hall dos Campeões dinâmico.');
}

// ------------------------------------------------------------
// 2) MENU DO SITE — remove Mobile da navegação global.
// ------------------------------------------------------------
{
  let s = read('js/main.js');
  s = replaceOnce(s, '    ["MOBILE","/pages/mobile.html","mobile"],\n', '', 'Remover Mobile do menu lateral público');
  s = replaceOnce(s, 'SEASON 01 • PC + CONSOLE • MOBILE', 'SEASON 01 • PC + CONSOLE', 'Remover Mobile do rodapé do menu');
  s = s.replace(/    if\(\s*p\.includes\("brasileirao-mobile"\)[\s\S]*?\) return "mobile";\s*/m, '');
  s = s.replace(/    if\(p\.includes\("mobile"\)\) return "mobile";\s*/m, '');
  put('js/main.js', s, 'Navegação pública focada em PC + Console. Menu hambúrguer responsivo preservado.');
}

// ------------------------------------------------------------
// 3) LIVE — não mistura jogadores/ranking Mobile no portal.
// ------------------------------------------------------------
{
  let s = read('js/ccfv-live.js');
  s = replaceOnce(s, '        return data || [];\n    }\n\n    async function loadPlayerCompetitions(client) {',
    '        return (data || []).filter(player => String(player?.platform || "").trim().toUpperCase() !== "MOBILE");\n    }\n\n    async function loadPlayerCompetitions(client) {',
    'Filtrar registros legados Mobile da lista pública de jogadores'
  );
  s = replaceOnce(s, '        return data || [];\n    }\n\n    async function loadMatches(client) {',
    '        return (data || []).filter(item => !["BRASILEIRAO_MOBILE", "ARENA_CUP"].includes(String(item.competition || "").toUpperCase()));\n    }\n\n    async function loadMatches(client) {',
    'Filtrar vínculos legados das competições Mobile na Home e páginas públicas'
  );
  s = replaceOnce(s, '        return (players || [])\n            .map(player => ({',
    '        return (players || [])\n            .filter(player => String(player?.platform || "").trim().toUpperCase() !== "MOBILE")\n            .map(player => ({',
    'Excluir plataforma Mobile do ranking global público'
  );
  const oldRefresh = `            const results =
                await Promise.allSettled([
                    loadPlayers(client),
                    loadPlayerCompetitions(client),
                    loadMatches(client),
                    loadNightMatches(client),
                    loadRanking(client),
                    loadMobileRanking(client)
                ]);

            const [
                playersResult,
                playerCompetitionsResult,
                matchesResult,
                nightMatchesResult,
                rankingResult,
                mobileRankingResult
            ] = results;`;
  const newRefresh = `            const results =
                await Promise.allSettled([
                    loadPlayers(client),
                    loadPlayerCompetitions(client),
                    loadMatches(client),
                    loadNightMatches(client),
                    loadRanking(client)
                ]);

            const [
                playersResult,
                playerCompetitionsResult,
                matchesResult,
                nightMatchesResult,
                rankingResult
            ] = results;`;
  s = replaceOnce(s, oldRefresh, newRefresh, 'Remover chamada de ranking Mobile do Live');
  const oldAppend = `            const mobileRanking =
                readResult(mobileRankingResult, "MOBILE RANKING");

           const mobilePlayers =
    mobileRanking.map(
        player => ({
            ...player,
            id:
                player?.id ||
                player?.player_id ||
                null,
            platform: "MOBILE"
        })
    );

            state.players =
                [
                    ...state.players,
                    ...mobilePlayers
                ];

            state.ranking =
                buildLiveRanking(
                    [
                        ...officialRanking,
                        ...mobilePlayers
                    ]
                );`;
  const newAppend = `            state.ranking =
                buildLiveRanking(officialRanking);`;
  s = replaceOnce(s, oldAppend, newAppend, 'Remover agregação de jogadores Mobile do Live');
  put('js/ccfv-live.js', s, 'Live e ranking público deixam de buscar/agregar plataforma Mobile.');
}

// ------------------------------------------------------------
// 4) ADMIN PRINCIPAL — remove a modalidade, preserva menu mobile responsivo.
// ------------------------------------------------------------
{
  let s = read('admin/index.html');
  s = s.replace(/\s*<link\s+rel="stylesheet"\s+href="\/css\/mobile\.css"\s*>\s*/i, '\n');
  s = replaceRegex(s, /\s*<button\b(?=[^>]*data-section="mobile")[\s\S]*?<\/button>\s*/g, '\n', 'Remover aba Mobile da navegação do Admin');

  const sectionStart = '<section class="ccfv-admin-section" id="section-mobile">';
  const sectionEnd = '<section\n            class="ccfv-admin-section"\n            id="section-ranking"';
  const a = s.indexOf(sectionStart);
  const b = s.indexOf(sectionEnd, a);
  if (a < 0 || b < 0 || s.indexOf(sectionStart, a + 1) >= 0) throw new Error('Não foi possível isolar com segurança a seção Mobile do Admin. Nenhum arquivo foi gravado.');
  s = s.slice(0, a) + s.slice(b);

  s = s.replace(/\s*<option\s+value="MOBILE"\s*>\s*MOBILE\s*<\/option>\s*/gi, '\n');
  s = s.replace(/\s*<label\b(?=[^>]*class="ccfv-competition-check ccfv-platform-mobile-only")[\s\S]*?<\/label>\s*/gi, '\n');
  s = s.replace(/\s*<div\b(?=[^>]*id="brasileirao-mobile-config")[\s\S]*?<\/div>\s*/gi, '\n');
  s = s.replace(/\s*<div\b(?=[^>]*id="arena-mobile-config")[\s\S]*?<\/div>\s*/gi, '\n');
  s = s.replace(/\s*<script\s+src="\/admin\/js\/mobile\.js"\s+defer\s*>\s*<\/script>\s*/gi, '\n');
  put('admin/index.html', s, 'Seção, menu, opção de plataforma e script Mobile removidos; navegação responsiva mantida.');
}

// ------------------------------------------------------------
// 5) ADMIN JS REAL — remove fluxo Mobile sem tocar no menu responsivo.
//    O Admin principal carrega /admin/js/admin.js.
// ------------------------------------------------------------
{
  let s = read('admin/js/admin.js');

  s = replaceOnce(s,
    `            const competitions =
                competitionsResult.data ||
                [];`,
    `            const competitions =
                (competitionsResult.data || []).filter(item =>
                    !["BRASILEIRAO_MOBILE", "ARENA_CUP"].includes(
                        String(item.competition || "").toUpperCase()
                    )
                );`,
    'Ignorar inscrições das competições Mobile no Admin'
  );

  s = replaceOnce(s,
    `            players =
                (
                    playersResult.data ||
                    []
                )
                .map(`,
    `            players =
                (
                    playersResult.data ||
                    []
                )
                .filter(player => String(player?.platform || "").trim().toUpperCase() !== "MOBILE")
                .map(`,
    'Não listar jogadores Mobile antigos no Admin principal'
  );

  // Interface de competição apenas para PC e Console.
  const uiStart = s.indexOf('    function updateCompetitionUI() {');
  const summaryStart = s.indexOf('    function updateCompetitionSummary() {', uiStart);
  if (uiStart < 0 || summaryStart < 0) throw new Error('Não foi possível localizar updateCompetitionUI() no Admin JS.');
  const updateUI = `    function updateCompetitionUI() {
        const selected = [
            [dom.competitionBrasileiraoLabel, Boolean(dom.competitionBrasileirao?.checked)],
            [dom.championsLabel, Boolean(dom.champions?.checked)],
            [dom.competitionLibertadoresLabel, Boolean(dom.competitionLibertadores?.checked)],
            [dom.competitionWorldCupLabel, Boolean(dom.competitionWorldCup?.checked)],
            [dom.competitionNightLabel, Boolean(dom.competitionNight?.checked)]
        ];

        selected.forEach(([label, active]) => {
            if (!label) return;
            label.style.display = "";
            label.classList.toggle("is-selected", active);
            label.setAttribute("aria-checked", String(active));
        });

        const configs = [
            [dom.brasileiraoConfig, Boolean(dom.competitionBrasileirao?.checked)],
            [dom.championsConfig, Boolean(dom.champions?.checked)],
            [dom.libertadoresConfig, Boolean(dom.competitionLibertadores?.checked)],
            [dom.worldCupConfig, Boolean(dom.competitionWorldCup?.checked)],
            [dom.nightConfig, Boolean(dom.competitionNight?.checked)]
        ];

        configs.forEach(([element, show]) => {
            if (!element) return;
            element.classList.toggle("is-visible", show);
            element.style.display = show ? "block" : "none";
        });

        if (dom.brasileiraoTeam) dom.brasileiraoTeam.disabled = !Boolean(dom.competitionBrasileirao?.checked);
        if (dom.championsTeam) dom.championsTeam.disabled = !Boolean(dom.champions?.checked);
        if (dom.libertadoresTeam) dom.libertadoresTeam.disabled = !Boolean(dom.competitionLibertadores?.checked) || !libertadoresClubs.length;
        if (dom.worldCupTeam) dom.worldCupTeam.disabled = !Boolean(dom.competitionWorldCup?.checked) || !worldCupTeams.length;

        refreshBrasileiraoTeamOptions();
        refreshChampionsTeamOptions();
        refreshLibertadoresTeamOptions();
        refreshWorldCupTeamOptions();
        updateCompetitionSummary();
    }


`;
  s = s.slice(0, uiStart) + updateUI + s.slice(summaryStart);

  const summaryBegin = s.indexOf('    function updateCompetitionSummary() {');
  const mobileHelperStart = s.indexOf('    function rebuildOccupiedBrasileiraoMobileTeams(', summaryBegin);
  if (summaryBegin < 0 || mobileHelperStart < 0) throw new Error('Não foi possível localizar os auxiliares de resumo Mobile no Admin JS.');
  const summaryFn = `    function updateCompetitionSummary() {
        const summary = document.querySelector("#player-competition-summary");
        if (!summary) return;

        const selected = [];

        if (dom.competitionBrasileirao?.checked) {
            selected.push("BRASILEIRÃO — " + (dom.brasileiraoTeam?.value || "A DEFINIR"));
        }

        if (dom.champions?.checked) {
            const club = championsClubs.find(item =>
                String(item.id) === String(dom.championsTeam?.value || "")
            );
            selected.push("CHAMPIONS LEAGUE — " + (club?.name || club?.champions_clubs?.name || "A DEFINIR"));
        }

        if (dom.competitionLibertadores?.checked) {
            const club = libertadoresClubs.find(item =>
                String(item.id) === String(dom.libertadoresTeam?.value || "")
            );
            selected.push("LIBERTADORES — " + (club?.name || "A DEFINIR"));
        }

        if (dom.competitionWorldCup?.checked) {
            const team = worldCupTeams.find(item =>
                String(item.id) === String(dom.worldCupTeam?.value || "")
            );
            selected.push("COPA DO MUNDO — " + (team?.name || "A DEFINIR"));
        }

        if (dom.competitionNight?.checked) {
            selected.push("NIGHT CUP — " + (dom.nightTeam?.value?.trim() || "A DEFINIR"));
        }

        summary.innerHTML = selected.length
            ? selected.map(item => '<span class="ccfv-admin-competition-pill">' + escapeHTML(item) + '</span>').join("")
            : '<span class="ccfv-admin-competition-summary__empty">NENHUMA COMPETIÇÃO SELECIONADA.</span>';
    }


`;
  const summaryRemainder = s.slice(mobileHelperStart);
  s = s.slice(0, summaryBegin) + summaryFn + summaryRemainder;
  const mobileHelperStartAfter = s.indexOf('    function rebuildOccupiedBrasileiraoMobileTeams(', summaryBegin + summaryFn.length);
  const mobileHelperEnd = s.indexOf('    /* =====================================================\n       ABRIR NOVO', mobileHelperStartAfter);
  if (mobileHelperStartAfter < 0 || mobileHelperEnd < 0) throw new Error('Não foi possível localizar o fim dos auxiliares Mobile no Admin JS.');
  s = s.slice(0, mobileHelperStartAfter) + s.slice(mobileHelperEnd);

  // Retira chamadas a elementos removidos do formulário Novo/Editar.
  const mobileReset = `        dom.competitionBrasileiraoMobile.checked =
            false;


        dom.competitionArenaMobile.checked =
            false;


`;
  s = s.replaceAll(mobileReset, '');
  const mobileTeamReset = `        dom.brasileiraoMobileTeam.value =
            "";


        dom.arenaMobileTeam.value =
            "";


`;
  s = s.replaceAll(mobileTeamReset, '');

  // Remove do objeto DOM os seletores exclusivos da antiga modalidade.
  const mobileDomIds = [
    "#mobile-new-player",
    "#competition-brasileirao-mobile",
    "#competition-brasileirao-mobile-label",
    "#competition-arena-mobile",
    "#competition-arena-mobile-label",
    "#brasileirao-mobile-config",
    "#brasileirao-mobile-team",
    "#arena-mobile-config",
    "#arena-mobile-team"
  ];
  for (const id of mobileDomIds) {
    const pattern = new RegExp('\\n\\s*[A-Za-z0-9_]+:\\s*document\\.querySelector\\(\\s*"' + id + '"\\s*\\),', 'g');
    s = s.replace(pattern, "\n");
  }

  // Função exclusiva do botão Novo Jogador Mobile (o botão/section já saiu do HTML).
  const openMobileStart = s.indexOf('    function openNewMobilePlayer() {');
  if (openMobileStart >= 0) {
    const openEditStart = s.indexOf('    function openEditPlayer(', openMobileStart);
    if (openEditStart < 0) throw new Error('Não foi possível localizar openEditPlayer() após openNewMobilePlayer().');
    s = s.slice(0, openMobileStart) + s.slice(openEditStart);
  }

  // Remove somente as associações Mobile do carregamento do formulário de edição.
  s = s.replace(/\n\s*if \(\s*item\.competition ===\s*"BRASILEIRAO_MOBILE"\s*\) \{[\s\S]*?\n\s*\}\n/,
                '\n');
  s = s.replace(/\n\s*if \(\s*item\.competition ===\s*"ARENA_CUP"[\s\S]*?\n\s*\}\n/,
                '\n');

  // A criação de jogadores passa a aceitar exclusivamente PC + Console.
  s = s.replace(/dom\.playerPlatform\?\.value !== "MOBILE" &&\s*/g, '');
  s = s.replace(/\n\s*if \(dom\.playerPlatform\?\.value === "MOBILE"\) \{[\s\S]*?\n\s*\}\n\n(?=\s*const specialCompetitionSelected)/,
                '\n\n        ');
  s = s.replace(/const specialCompetitionSelected =\s*dom\.playerPlatform\?\.value !== "MOBILE" &&\s*/,
                'const specialCompetitionSelected = ');
  const oldNoCompetition = `        if (
            selected.length === 0 &&
            !specialCompetitionSelected
        ) {

            const platform =
                dom.playerPlatform?.value ||
                "PC";

            if (
                platform !== "MOBILE"
            ) {

                throw new Error(
                    "SELECIONE PELO MENOS UMA COMPETIÇÃO."
                );

            }

        }`;
  const newNoCompetition = `        if (selected.length === 0 && !specialCompetitionSelected) {
            throw new Error("SELECIONE PELO MENOS UMA COMPETIÇÃO.");
        }`;
  s = replaceOnce(s, oldNoCompetition, newNoCompetition, 'Tornar obrigatória ao menos uma competição PC/Console');

  // O seletor de plataforma não possui mais MOBILE.
  const mobileNewButton = `        dom.mobileNewPlayerButton?.addEventListener(
            "click",
            openNewMobilePlayer
        );

`;
  s = s.replace(mobileNewButton, '');

  const oldPlatformHandler = `        dom.playerPlatform
            ?.addEventListener(
                "change",
                () => {
                    // Ao trocar de plataforma, remove seleções incompatíveis.
                    if (dom.playerPlatform.value === "MOBILE") {
                        dom.competitionBrasileirao.checked = false;
                        dom.competitionNight.checked = false;
                        if (dom.champions) dom.champions.checked = false;
                        if (dom.competitionLibertadores) dom.competitionLibertadores.checked = false;
                        if (dom.competitionWorldCup) dom.competitionWorldCup.checked = false;
                    } else {
                        dom.competitionBrasileiraoMobile.checked = false;
                        dom.competitionArenaMobile.checked = false;
                    }
                    updateCompetitionUI();
                    refreshChampionsTeamOptions();
                    refreshBrasileiraoMobileTeamOptions();
                }
            );

        dom.competitionBrasileiraoMobile
            ?.addEventListener("change", updateCompetitionUI);

        dom.competitionArenaMobile
            ?.addEventListener("change", updateCompetitionUI);

        dom.brasileiraoMobileTeam
            ?.addEventListener("change", () => {
                refreshBrasileiraoMobileTeamOptions();
                updateCompetitionSummary();
            });

        dom.arenaMobileTeam
            ?.addEventListener("input", updateCompetitionSummary);

`;
  const newPlatformHandler = `        dom.playerPlatform?.addEventListener("change", () => {
            updateCompetitionUI();
            refreshChampionsTeamOptions();
        });

`;
  s = replaceOnce(s, oldPlatformHandler, newPlatformHandler, 'Remover listeners de formulários Mobile e manter seletor PC/Console');

  put('admin/js/admin.js', s, 'Admin principal atualizado: cadastro PC/Console, filtros sem Mobile e sem referências DOM obrigatórias ao módulo removido.');
}

// ------------------------------------------------------------
// 6) PÁGINAS — remove links Mobile e filtro Mobile do ranking.
//    As URLs antigas passam a redirecionar para evitar páginas órfãs.
// ------------------------------------------------------------
{
  const pagesDir = path.join(ROOT, 'pages');
  if (fs.existsSync(pagesDir)) {
    for (const name of fs.readdirSync(pagesDir)) {
      if (!name.endsWith('.html')) continue;
      const rel = `pages/${name}`;
      let s = read(rel);
      const before = s;
      s = removeMobileAnchors(s);
      if (rel === 'pages/ranking.html') {
        s = s.replace(/\s*<button\b(?=[^>]*data-platform="mobile")[\s\S]*?<\/button>\s*/gi, '\n');
      }
      if (s !== before) put(rel, s, 'Links/controles do módulo Mobile removidos.');
    }
  }

  const oldMobilePages = [
    'pages/mobile.html',
    'pages/brasileirao-mobile.html',
    'pages/ranking-mobile.html',
    'pages/partidas-mobile.html',
    'pages/arena-cup.html',
    'pages/jogadores-mobile.html'
  ];
  for (const rel of oldMobilePages) {
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    const title = path.basename(rel, '.html').replace(/-/g, ' ');
    const redirect = `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex,follow">\n<meta http-equiv="refresh" content="0;url=/index.html">\n<title>CCFV — Portal Oficial</title>\n<script>window.location.replace("/index.html");</script>\n</head>\n<body><p>O módulo Mobile foi descontinuado. Acesse o <a href="/index.html">portal oficial da CCFV</a>.</p></body>\n</html>\n`;
    put(rel, redirect, `Redirecionar rota antiga (${title}) para o portal oficial.`);
  }
}

// ------------------------------------------------------------
// 7) CENTRAL ADMIN — remove link e card Mobile.
// ------------------------------------------------------------
{
  let s = read('admin/competicoes.html');
  s = removeMobileAnchors(s);
  const cards = s.match(/<article class="ccfv-card">[\s\S]*?<\/article>/g) || [];
  const mobileCard = cards.find(card => /05 \/\/ MOBILE[\s\S]*?<h3>MOBILE<\/h3>/i.test(card));
  if (!mobileCard) throw new Error('Card Mobile não encontrado em admin/competicoes.html. Nenhum arquivo foi gravado.');
  s = s.replace(mobileCard, '');
  s = s.replace('06 // GLOBAL', '05 // GLOBAL');
  put('admin/competicoes.html', s, 'Central de competições passa a exibir cinco torneios, sem Mobile.');

  const adminDir = path.join(ROOT, 'admin');
  for (const name of fs.readdirSync(adminDir)) {
    if (!name.endsWith('.html') || name === 'competicoes.html' || name === 'index.html' || name === 'mobile.html') continue;
    const rel = `admin/${name}`;
    let page = read(rel);
    const updated = removeMobileAnchors(page);
    if (updated !== page) put(rel, updated, 'Link para painel Mobile removido da navegação administrativa.');
  }

  if (fs.existsSync(path.join(ROOT, 'admin/mobile.html'))) {
    put('admin/mobile.html', `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=/admin/index.html"><title>CCFV Admin</title><script>window.location.replace("/admin/index.html");</script></head><body><p>O módulo Mobile foi descontinuado. <a href="/admin/index.html">Voltar ao Admin CCFV</a>.</p></body></html>\n`, 'Redirecionar painel Mobile antigo para o Admin principal.');
  }
}

// ------------------------------------------------------------
// 8) HALL DOS CAMPEÕES — novo JS e CSS da Home.
// ------------------------------------------------------------
{
  const championsJs = `(() => {
    "use strict";

    const root = document.querySelector("#home-champions-grid");
    if (!root) return;

    const competitions = [
      { key: "BRASILEIRAO", name: "BRASILEIRÃO", trophy: "assets/images/historia/trofeus/brasileirao.png" },
      { key: "CHAMPIONS", name: "CHAMPIONS LEAGUE", trophy: "assets/images/historia/trofeus/champions-league.png" },
      { key: "NIGHT_CUP", name: "NIGHT CUP", trophy: "assets/images/historia/trofeus/night-cup.png" },
      { key: "LIBERTADORES", name: "LIBERTADORES", trophy: "assets/images/historia/trofeus/libertadores.png" },
      { key: "COPA_DO_MUNDO", name: "COPA DO MUNDO", trophy: "assets/images/historia/trofeus/copa-do-mundo.png" }
    ];

    const escape = function(value) {
      return String(value == null ? "" : value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };

    const normalize = function(value) {
      return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    };

    function competitionKey(row) {
      const value = normalize(row.competition_code || row.competition_name || "");
      if (value.includes("CHAMPIONS")) return "CHAMPIONS";
      if (value.includes("NIGHT")) return "NIGHT_CUP";
      if (value.includes("BRASILEIR")) return "BRASILEIRAO";
      if (value.includes("LIBERTADOR")) return "LIBERTADORES";
      if (value.includes("MUNDO") || value.includes("WORLD")) return "COPA_DO_MUNDO";
      return value;
    }

    async function getClient() {
      if (window.CCFVAuth && typeof window.CCFVAuth.getClient === "function") {
        return await window.CCFVAuth.getClient();
      }
      if (!document.querySelector('script[src="/admin/js/auth.js"]')) {
        const script = document.createElement("script");
        script.src = "/admin/js/auth.js";
        script.dataset.homeAuth = "true";
        document.head.appendChild(script);
      }
      const started = Date.now();
      while (!window.CCFVAuth || typeof window.CCFVAuth.getClient !== "function") {
        if (Date.now() - started > 12000) throw new Error("Não foi possível iniciar a conexão pública.");
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return await window.CCFVAuth.getClient();
    }

    function emptyCard(item) {
      return '<article class="ccfv-home-champion-card is-empty">' +
        '<div class="ccfv-home-champion-card__trophy"><img src="/' + escape(item.trophy) + '" alt="Troféu ' + escape(item.name) + '" loading="lazy"></div>' +
        '<div class="ccfv-home-champion-card__copy">' +
          '<span class="ccfv-home-champion-card__eyebrow">' + escape(item.name) + ' · ARQUIVO OFICIAL</span>' +
          '<strong>CAMPEÃO A DEFINIR</strong>' +
          '<small>A próxima conquista será registrada aqui.</small>' +
        '</div></article>';
    }

    function renderCard(config, title, players) {
      if (!title) return emptyCard(config);
      const player = players.get(String(title.player_id || title.participant_id || ""));
      const champion = player && player.name || title.player_name || title.participant_name || title.name || "CAMPEÃO REGISTRADO";
      const club = title.club_name || title.team_name || player && player.team_name || "CCFV";
      const season = title.season_label || title.season || title.season_name || "Temporada oficial";
      const photo = player && player.photo_url || title.photo_url || title.player_photo_url || "";
      const initials = champion.split(/\\s+/).slice(0, 2).map(function(part) { return part[0] || ""; }).join("").toUpperCase();
      const photoMarkup = photo
        ? '<img class="ccfv-home-champion-card__photo" src="' + escape(photo) + '" alt="' + escape(champion) + '" loading="lazy">'
        : '<span class="ccfv-home-champion-card__initials">' + escape(initials) + '</span>';

      return '<article class="ccfv-home-champion-card">' +
        '<div class="ccfv-home-champion-card__top"><span>ÚLTIMO CAMPEÃO</span><span class="ccfv-home-champion-card__mark">CCFV</span></div>' +
        '<div class="ccfv-home-champion-card__main">' +
          '<div class="ccfv-home-champion-card__trophy"><img src="/' + escape(config.trophy) + '" alt="Troféu ' + escape(config.name) + '" loading="lazy"></div>' +
          '<div class="ccfv-home-champion-card__identity">' + photoMarkup + '<div><strong>' + escape(champion) + '</strong><small>' + escape(club) + '</small></div></div>' +
        '</div>' +
        '<div class="ccfv-home-champion-card__bottom"><span>' + escape(config.name) + '</span><strong>' + escape(season) + '</strong></div>' +
      '</article>';
    }

    async function load() {
      try {
        const client = await getClient();
        const results = await Promise.all([
          client.from("ccfv_titles").select("*").order("awarded_at", { ascending: false }),
          client.from("players").select("id,name,photo_url,team_name")
        ]);
        const titlesResult = results[0];
        const playersResult = results[1];
        if (titlesResult.error) throw titlesResult.error;
        const titles = Array.isArray(titlesResult.data) ? titlesResult.data : [];
        const playerRows = Array.isArray(playersResult.data) ? playersResult.data : [];
        const players = new Map(playerRows.map(player => [String(player.id), player]));
        titles.sort((a, b) => {
          const dateA = Date.parse(a.awarded_at || a.created_at || "") || 0;
          const dateB = Date.parse(b.awarded_at || b.created_at || "") || 0;
          return dateB - dateA;
        });
        const latest = new Map();
        titles.forEach(title => {
          const key = competitionKey(title);
          if (competitions.some(item => item.key === key) && !latest.has(key)) latest.set(key, title);
        });
        root.innerHTML = competitions.map(item => renderCard(item, latest.get(item.key), players)).join("");
      } catch (error) {
        console.error("CCFV // HOME HALL:", error);
        root.innerHTML = '<div class="ccfv-home-champions__loading is-error">NÃO FOI POSSÍVEL CARREGAR O HALL AGORA. CONSULTE A HISTÓRIA OFICIAL.</div>';
      }
    }

    load();
  })();
`;


  const championsCss = `/* CCFV // HOME — HALL DOS CAMPEÕES */
.ccfv-home-champions {
    position: relative;
    overflow: hidden;
    background: radial-gradient(circle at 82% 22%, rgba(67,223,145,.09), transparent 32%), linear-gradient(180deg,#050b07 0%,#020403 100%);
}
.ccfv-home-champions::before {
    content:""; position:absolute; inset:0; pointer-events:none; opacity:.18;
    background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
    background-size:56px 56px; mask-image:linear-gradient(180deg,black,transparent 90%);
}
.ccfv-home-champions__grid {
    position:relative; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px;
}
.ccfv-home-champion-card {
    position:relative; min-width:0; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;
    min-height:245px; padding:19px; border:1px solid rgba(255,255,255,.09); border-radius:18px;
    background:linear-gradient(145deg,rgba(12,27,18,.94),rgba(4,9,6,.98));
    box-shadow:0 18px 50px rgba(0,0,0,.16); transition:transform .25s ease,border-color .25s ease,background .25s ease;
}
.ccfv-home-champion-card:hover { transform:translateY(-4px); border-color:rgba(67,223,145,.34); background:linear-gradient(145deg,rgba(14,34,22,.98),rgba(4,9,6,.99)); }
.ccfv-home-champion-card::after { content:""; position:absolute; width:170px; height:170px; right:-75px; bottom:-90px; border-radius:50%; background:rgba(67,223,145,.07); filter:blur(28px); pointer-events:none; }
.ccfv-home-champion-card__top,.ccfv-home-champion-card__bottom { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ccfv-home-champion-card__top span:first-child { color:#43df91; font-size:8px; font-weight:900; letter-spacing:.15em; }
.ccfv-home-champion-card__mark { color:rgba(255,255,255,.28); font-size:9px; font-weight:950; letter-spacing:.14em; }
.ccfv-home-champion-card__main { position:relative; z-index:1; display:flex; align-items:center; gap:15px; min-width:0; padding:16px 0; }
.ccfv-home-champion-card__trophy { flex:0 0 86px; width:86px; height:108px; display:grid; place-items:center; }
.ccfv-home-champion-card__trophy img { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 8px 18px rgba(0,0,0,.55)); }
.ccfv-home-champion-card__identity { min-width:0; display:flex; align-items:center; gap:10px; }
.ccfv-home-champion-card__photo,.ccfv-home-champion-card__initials { flex:0 0 44px; width:44px; height:44px; border-radius:50%; object-fit:cover; border:1px solid rgba(67,223,145,.38); background:#0b1b11; }
.ccfv-home-champion-card__initials { display:grid; place-items:center; color:#43df91; font-size:12px; font-weight:900; }
.ccfv-home-champion-card__identity div { min-width:0; display:grid; gap:5px; }
.ccfv-home-champion-card__identity strong { color:#fff; font-size:14px; line-height:1.15; overflow-wrap:anywhere; }
.ccfv-home-champion-card__identity small { color:rgba(255,255,255,.46); font-size:9px; line-height:1.35; }
.ccfv-home-champion-card__bottom { padding-top:12px; border-top:1px solid rgba(255,255,255,.08); }
.ccfv-home-champion-card__bottom span { color:rgba(255,255,255,.46); font-size:8px; font-weight:900; letter-spacing:.1em; }
.ccfv-home-champion-card__bottom strong { color:#d9b96b; font-size:9px; }
.ccfv-home-champion-card.is-empty { opacity:.76; }
.ccfv-home-champion-card.is-empty .ccfv-home-champion-card__copy { position:relative; z-index:1; display:grid; gap:8px; }
.ccfv-home-champion-card.is-empty .ccfv-home-champion-card__copy strong { color:#fff; font-size:13px; }
.ccfv-home-champion-card.is-empty .ccfv-home-champion-card__copy small { color:rgba(255,255,255,.42); font-size:10px; }
.ccfv-home-champion-card__eyebrow { color:#43df91; font-size:8px; font-weight:900; letter-spacing:.12em; }
.ccfv-home-champions__loading { grid-column:1/-1; padding:34px 20px; border:1px dashed rgba(67,223,145,.22); border-radius:14px; color:rgba(255,255,255,.48); text-align:center; font-size:10px; font-weight:900; letter-spacing:.12em; }
.ccfv-home-champions__loading.is-error { color:#d9b96b; }
.ccfv-home-champions__footer { position:relative; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; margin-top:22px; padding-top:16px; border-top:1px solid rgba(255,255,255,.08); }
.ccfv-home-champions__footer span { color:rgba(255,255,255,.34); font-size:8px; font-weight:900; letter-spacing:.14em; }
.ccfv-home-champions__footer a { color:#43df91; font-size:9px; font-weight:900; letter-spacing:.1em; }
@media(max-width:1050px) { .ccfv-home-champions__grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:650px) { .ccfv-home-champions__grid { grid-template-columns:1fr; } .ccfv-home-champion-card { min-height:220px; } .ccfv-home-champions__footer { align-items:flex-start; flex-direction:column; } }
@media(prefers-reduced-motion:reduce) { .ccfv-home-champion-card { transition:none!important; } }
`;
  put('js/home-champions.js', championsJs, 'Novo carregamento dos últimos campeões via ccfv_titles.');
  put('css/home-champions.css', championsCss, 'Novo visual do Hall dos Campeões com troféus, fotos e temporadas.');
}

// ------------------------------------------------------------
// 9) Commit local dos arquivos com backup e sumário.
// ------------------------------------------------------------
for (const rel of changes.keys()) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file) && !['js/home-champions.js','css/home-champions.css'].includes(rel)) {
    throw new Error(`Arquivo desapareceu antes da gravação: ${rel}`);
  }
}
fs.mkdirSync(BACKUP_DIR, { recursive: true });
for (const [rel, content] of changes.entries()) {
  const target = path.join(ROOT, rel);
  if (fs.existsSync(target)) {
    const backup = path.join(BACKUP_DIR, rel);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target, backup);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

console.log('\nCCFV // AJUSTES APLICADOS COM SUCESSO\n');
console.log(`Backup: ${path.basename(BACKUP_DIR)}\n`);
for (const item of summary) console.log(`✓ ${item}`);
console.log('\nNada foi apagado do Supabase. Registros antigos de Mobile foram preservados no banco, mas não aparecem no portal/Admin principal.');
console.log('Menu responsivo e CSS para telas menores foram preservados.');
console.log('\nPróximo passo: revisar git diff e testar a Home/Admin antes de publicar.');
