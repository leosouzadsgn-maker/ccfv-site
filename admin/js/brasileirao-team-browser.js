/* =========================================================
   CCFV // BRASILEIRÃO — BUSCA DE PARTIDAS POR CLUBE
   Adicionar depois de brasileirao-results-ui.js em admin/brasileirao.html.
   Não altera o motor de resultados: usa o modal e o evento data-result já existentes.
   ========================================================= */
(() => {
  "use strict";

  const TEAMS = [
    "ATHLETICO-PR", "ATLÉTICO-MG", "BAHIA", "BOTAFOGO", "BRAGANTINO",
    "CHAPECOENSE", "CORINTHIANS", "CORITIBA", "CRUZEIRO", "FLAMENGO",
    "FLUMINENSE", "GRÊMIO", "INTERNACIONAL", "MIRASSOL", "PALMEIRAS",
    "REMO", "SANTOS", "SÃO PAULO", "VASCO", "VITÓRIA"
  ];

  const CLUBS = {
    "ATHLETICO-PR": "athletico-pr.png",
    "ATLÉTICO-MG": "atletico-mg.png",
    "BAHIA": "bahia.png",
    "BOTAFOGO": "botafogo.png",
    "BRAGANTINO": "bragantino.png",
    "CHAPECOENSE": "chapecoense.png",
    "CORINTHIANS": "corinthians.png",
    "CORITIBA": "coritiba.png",
    "CRUZEIRO": "cruzeiro.png",
    "FLAMENGO": "flamengo.png",
    "FLUMINENSE": "fluminense.png",
    "GRÊMIO": "gremio.png",
    "INTERNACIONAL": "internacional.png",
    "MIRASSOL": "mirassol.png",
    "PALMEIRAS": "palmeiras.png",
    "REMO": "remo.png",
    "SANTOS": "santos.png",
    "SÃO PAULO": "sao-paulo.png",
    "VASCO": "vasco.png",
    "VITÓRIA": "vitoria.png"
  };

  // O status FINALIZADA é usado pelo RPC register_ccfv_match da CCFV.
  const CLOSED = new Set([
    "FINALIZADA", "FINALIZADO", "VALIDATED", "WO", "ADMIN_DECISION"
  ]);

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const norm = (value) => String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toUpperCase();
  const isClosed = (match) => CLOSED.has(norm(match?.status));

  let db = null;
  let cache = { matches: [], players: [], regs: [], loadedAt: 0 };
  let mode = "round";
  let loading = false;
  let refreshTimer = null;

  function crest(team) {
    const key = Object.keys(CLUBS).find((name) => norm(name) === norm(team));
    const file = key ? CLUBS[key] : "";
    return file ? "/assets/images/clubs/" + file : "";
  }

  async function getClient() {
    if (db) return db;
    if (!window.CCFVAuth || typeof window.CCFVAuth.getClient !== "function") {
      throw new Error("Autenticação CCFV ainda não está pronta.");
    }
    db = await window.CCFVAuth.getClient();
    return db;
  }

  async function loadData(force = false) {
    if (!force && Date.now() - cache.loadedAt < 1200) return cache;
    const client = await getClient();
    const [matches, players, regs] = await Promise.all([
      client.from("matches")
        .select("id,competition,stage,round_number,match_number,home_player_id,away_player_id,home_team,away_team,home_score,away_score,status,played_at,created_at")
        .eq("competition", "BRASILEIRAO")
        .order("round_number", { ascending: true })
        .order("created_at", { ascending: true }),
      client.from("players")
        .select("id,name,platform,status")
        .eq("status", "ACTIVE")
        .order("name"),
      client.from("player_competitions")
        .select("id,player_id,competition,team_name")
        .eq("competition", "BRASILEIRAO")
    ]);
    for (const result of [matches, players, regs]) {
      if (result.error) throw result.error;
    }
    cache = {
      matches: matches.data || [],
      players: players.data || [],
      regs: regs.data || [],
      loadedAt: Date.now()
    };
    return cache;
  }

  function playerFor(match, side) {
    const id = match[side === "home" ? "home_player_id" : "away_player_id"];
    let player = cache.players.find((item) => String(item.id) === String(id));
    if (player) return player;
    const team = match[side === "home" ? "home_team" : "away_team"];
    const registration = cache.regs.find((item) => norm(item.team_name) === norm(team));
    return cache.players.find((item) => String(item.id) === String(registration?.player_id)) || null;
  }

  function teamBlock(match, side) {
    const home = side === "home";
    const team = match[home ? "home_team" : "away_team"] || "CLUBE";
    const image = crest(team);
    const player = playerFor(match, side)?.name || "JOGADOR NÃO VINCULADO";
    return `
      <div class="ccfv-tv-team ${home ? "is-home" : "is-away"}">
        <div class="ccfv-tv-crest">${image ? `<img src="${image}" alt="Escudo ${esc(team)}" loading="lazy">` : "<span>CCFV</span>"}</div>
        <div class="ccfv-tv-team-copy">
          <strong>${esc(team)}</strong>
          <small><span>JOGADOR</span>${esc(player)}</small>
        </div>
      </div>`;
  }

  function scoreMarkup(match) {
    return isClosed(match)
      ? `${Number(match.home_score ?? 0)} <i>×</i> ${Number(match.away_score ?? 0)}`
      : '<span class="ccfv-tv-vs">VS</span>';
  }

  function matchCard(match, index, round) {
    const finished = isClosed(match);
    const buttonLabel = finished ? "EDITAR PLACAR" : "LANÇAR RESULTADO";
    return `
      <article class="ccfv-tv-match br-team-match">
        <div class="ccfv-tv-match-top">
          <span>RODADA ${String(round).padStart(2, "0")} <b>·</b> JOGO ${String(index + 1).padStart(2, "0")}</span>
          <span class="ccfv-tv-status ${finished ? "is-done" : "is-pending"}"><i></i>${finished ? "HOMOLOGADA" : "PENDENTE"}</span>
        </div>
        <div class="ccfv-tv-match-body">
          ${teamBlock(match, "home")}
          <div class="ccfv-tv-score">${scoreMarkup(match)}</div>
          ${teamBlock(match, "away")}
        </div>
        <div class="ccfv-tv-match-bottom">
          <span>${finished ? "RESULTADO REGISTRADO NO SISTEMA OFICIAL" : "AGUARDANDO RESULTADO"}</span>
          <button type="button" class="ccfv-btn ccfv-tv-result-btn" data-result="${esc(match.id)}">${buttonLabel}</button>
        </div>
      </article>`;
  }

  function ensureControls() {
    if ($("#br-team-browser")) return;
    const list = $("#round-list");
    const toolbar = $(".ccfv-toolbar");
    if (!list || !toolbar) return;

    const panel = document.createElement("section");
    panel.id = "br-team-browser";
    panel.className = "br-team-browser";
    panel.innerHTML = `
      <div class="br-team-browser__heading">
        <div><span>03 // LOCALIZADOR DE CONFRONTOS</span><strong>ENCONTRE OS JOGOS POR CLUBE</strong></div>
        <small>Selecione um time para consultar todos os seus 38 jogos, do primeiro ao segundo turno.</small>
      </div>
      <div class="br-team-browser__modes">
        <button type="button" class="is-active" data-br-mode="round">POR RODADA</button>
        <button type="button" data-br-mode="team">POR CLUBE</button>
      </div>
      <div class="br-team-browser__filters" hidden>
        <label>CLUBE
          <select id="br-team-select">
            <option value="">ESCOLHA UM CLUBE</option>
            ${TEAMS.map((team) => `<option value="${esc(team)}">${esc(team)}</option>`).join("")}
          </select>
        </label>
        <label>SITUAÇÃO DOS JOGOS
          <select id="br-team-status">
            <option value="ALL">TODOS OS JOGOS</option>
            <option value="PENDING">SOMENTE PENDENTES</option>
            <option value="DONE">SOMENTE HOMOLOGADOS</option>
          </select>
        </label>
        <button type="button" class="ccfv-btn" id="br-team-refresh">ATUALIZAR LISTA</button>
      </div>
      <div class="br-team-browser__summary" id="br-team-summary" hidden></div>
    `;
    toolbar.parentNode.insertBefore(panel, toolbar);

    addStyles();
    bindControls();
  }

  function setMode(nextMode) {
    mode = nextMode === "team" ? "team" : "round";
    const filters = $("#br-team-browser .br-team-browser__filters");
    const summary = $("#br-team-summary");
    const toolbar = $(".ccfv-toolbar");
    if (filters) filters.hidden = mode !== "team";
    if (summary) summary.hidden = mode !== "team";
    if (toolbar) toolbar.hidden = mode === "team";
    document.querySelectorAll("[data-br-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.brMode === mode);
    });

    if (mode === "team") {
      renderTeamView();
    } else {
      const showRound = $("#show-round");
      if (showRound) showRound.click();
    }
  }

  function uniqueClubFixtures(source) {
    const grouped = new Map();
    for (const match of source) {
      const key = [
        Number(match.round_number),
        norm(match.home_team),
        norm(match.away_team)
      ].join("|");
      const previous = grouped.get(key);
      if (!previous) {
        grouped.set(key, match);
        continue;
      }
      const currentClosed = isClosed(match);
      const previousClosed = isClosed(previous);
      const currentDate = Date.parse(match.played_at || match.created_at || "") || 0;
      const previousDate = Date.parse(previous.played_at || previous.created_at || "") || 0;
      if ((currentClosed && !previousClosed) ||
          (currentClosed === previousClosed && currentDate > previousDate)) {
        grouped.set(key, match);
      }
    }
    return [...grouped.values()].sort((a, b) =>
      Number(a.round_number) - Number(b.round_number) ||
      Number(a.match_number || 0) - Number(b.match_number || 0)
    );
  }

  function selectedTeamMatches() {
    const selected = $("#br-team-select")?.value || "";
    if (!selected) return [];
    let matches = uniqueClubFixtures(cache.matches.filter((match) =>
      norm(match.home_team) === norm(selected) || norm(match.away_team) === norm(selected)
    ));
    const statusFilter = $("#br-team-status")?.value || "ALL";
    if (statusFilter === "PENDING") matches = matches.filter((match) => !isClosed(match));
    if (statusFilter === "DONE") matches = matches.filter(isClosed);
    return matches;
  }

  function renderTeamView() {
    if (mode !== "team") return;
    const list = $("#round-list");
    const summary = $("#br-team-summary");
    const selected = $("#br-team-select")?.value || "";
    if (!list || !summary) return;

    if (!selected) {
      summary.innerHTML = "";
      list.innerHTML = '<div class="br-team-empty">Escolha um dos 20 clubes acima para visualizar os jogos dele, separados por rodada e turno.</div>';
      return;
    }

    const allTeamMatches = uniqueClubFixtures(cache.matches.filter((match) =>
      norm(match.home_team) === norm(selected) || norm(match.away_team) === norm(selected)
    ));
    const matches = selectedTeamMatches();
    const finished = allTeamMatches.filter(isClosed).length;
    const pending = allTeamMatches.length - finished;
    summary.innerHTML = `
      <div><strong>${allTeamMatches.length}</strong><span>JOGOS DO CLUBE</span></div>
      <div><strong>${finished}</strong><span>HOMOLOGADOS</span></div>
      <div><strong>${pending}</strong><span>PENDENTES</span></div>
    `;

    if (!allTeamMatches.length) {
      list.innerHTML = '<div class="br-team-empty">Nenhum jogo encontrado para este clube. Confira se o calendário foi gerado.</div>';
      return;
    }
    if (!matches.length) {
      list.innerHTML = '<div class="br-team-empty">Não há jogos nesta categoria de situação.</div>';
      return;
    }

    const firstLeg = matches.filter((match) => Number(match.round_number) >= 1 && Number(match.round_number) <= 19);
    const secondLeg = matches.filter((match) => Number(match.round_number) >= 20 && Number(match.round_number) <= 38);
    const groups = [
      { title: "PRIMEIRO TURNO", subtitle: "RODADAS 01 A 19", games: firstLeg },
      { title: "SEGUNDO TURNO", subtitle: "RODADAS 20 A 38", games: secondLeg }
    ].filter((group) => group.games.length);

    list.innerHTML = groups.map((group) => {
      const byRound = new Map();
      group.games.forEach((match) => {
        const round = Number(match.round_number);
        if (!byRound.has(round)) byRound.set(round, []);
        byRound.get(round).push(match);
      });
      const roundMarkup = [...byRound.entries()].sort((a, b) => a[0] - b[0]).map(([round, games]) => `
        <section class="br-team-round">
          <header><strong>RODADA ${String(round).padStart(2, "0")}</strong><span>${games.length} CONFRONTO${games.length === 1 ? "" : "S"}</span></header>
          ${games.map((match, index) => matchCard(match, index, round)).join("")}
        </section>
      `).join("");
      return `
        <section class="br-team-turn">
          <header><div><strong>${group.title}</strong><span>${group.subtitle}</span></div><b>${group.games.length} JOGOS</b></header>
          ${roundMarkup}
        </section>`;
    }).join("");
  }

  function bindControls() {
    document.querySelectorAll("[data-br-mode]").forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.brMode));
    });
    $("#br-team-select")?.addEventListener("change", renderTeamView);
    $("#br-team-status")?.addEventListener("change", renderTeamView);
    $("#br-team-refresh")?.addEventListener("click", async () => {
      await refreshData(true);
      renderTeamView();
    });
    $("#load-round")?.addEventListener("click", () => {
      window.setTimeout(async () => {
        await refreshData(true);
        if (mode === "team") renderTeamView();
      }, 450);
    });
    $("#refresh")?.addEventListener("click", () => {
      window.setTimeout(async () => {
        await refreshData(true);
        if (mode === "team") renderTeamView();
      }, 450);
    });
    $("#result-form")?.addEventListener("submit", () => {
      window.setTimeout(async () => {
        await refreshData(true);
        if (mode === "team") renderTeamView();
      }, 1200);
    });
    window.addEventListener("ccfv:live-update", () => {
      clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        await refreshData(true);
        if (mode === "team") renderTeamView();
      }, 350);
    });
  }

  async function refreshData(force = false) {
    if (loading) return;
    loading = true;
    try {
      await loadData(force);
    } catch (error) {
      console.error("CCFV // BRASILEIRÃO TEAM BROWSER:", error);
      const list = $("#round-list");
      if (mode === "team" && list) {
        list.innerHTML = '<div class="br-team-empty">Não foi possível atualizar os jogos. Confira sua sessão e tente novamente.</div>';
      }
    } finally {
      loading = false;
    }
  }

  function addStyles() {
    if ($("#br-team-browser-style")) return;
    const style = document.createElement("style");
    style.id = "br-team-browser-style";
    style.textContent = `
      .br-team-browser{margin:0 0 14px;padding:15px;border:1px solid rgba(67,223,145,.16);border-radius:13px;background:linear-gradient(140deg,rgba(67,223,145,.07),rgba(255,255,255,.012))}
      .br-team-browser__heading{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px}
      .br-team-browser__heading div{display:grid;gap:5px}
      .br-team-browser__heading div span{font-size:8px;font-weight:900;letter-spacing:.13em;color:#43df91}
      .br-team-browser__heading div strong{font-size:13px;color:#fff}
      .br-team-browser__heading small{max-width:290px;color:rgba(255,255,255,.38);font-size:9px;line-height:1.5;text-align:right}
      .br-team-browser__modes{display:flex;gap:7px;margin-bottom:11px}
      .br-team-browser__modes button{padding:9px 13px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#050a07;color:rgba(255,255,255,.6);font-size:9px;font-weight:900;cursor:pointer}
      .br-team-browser__modes button.is-active{border-color:rgba(67,223,145,.42);background:rgba(67,223,145,.12);color:#43df91}
      .br-team-browser__filters{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) auto;align-items:end;gap:9px}
      .br-team-browser__filters[hidden]{display:none!important}
      .br-team-browser__filters label{display:grid;gap:6px;color:rgba(255,255,255,.43);font-size:8px;font-weight:900;letter-spacing:.09em}
      .br-team-browser__filters select{width:100%;min-height:40px;padding:0 10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#030806;color:#fff;font-size:10px}
      .br-team-browser__filters select option{background:#07100b;color:#fff}
      .br-team-browser__summary{display:flex;gap:8px;margin-top:12px}
      .br-team-browser__summary[hidden]{display:none!important}
      .br-team-browser__summary div{display:grid;gap:3px;min-width:105px;padding:9px 12px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(0,0,0,.22)}
      .br-team-browser__summary strong{font-size:17px;color:#fff}
      .br-team-browser__summary span{font-size:7px;font-weight:900;letter-spacing:.09em;color:rgba(255,255,255,.38)}
      .br-team-empty{padding:23px 16px;border:1px dashed rgba(67,223,145,.18);border-radius:11px;color:rgba(255,255,255,.48);font-size:10px;line-height:1.6;text-align:center}
      .br-team-turn{margin:14px 0 18px;padding:13px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(0,0,0,.12)}
      .br-team-turn>header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:11px;border-bottom:1px solid rgba(255,255,255,.07)}
      .br-team-turn>header div{display:grid;gap:4px}
      .br-team-turn>header strong{font-size:12px;color:#43df91;letter-spacing:.08em}
      .br-team-turn>header span,.br-team-turn>header>b{font-size:8px;color:rgba(255,255,255,.38);font-weight:900;letter-spacing:.08em}
      .br-team-round{margin:0 0 13px}
      .br-team-round>header{display:flex;justify-content:space-between;align-items:center;margin:0 0 8px;padding:0 2px}
      .br-team-round>header strong{font-size:9px;color:#fff;letter-spacing:.1em}
      .br-team-round>header span{font-size:7px;color:rgba(255,255,255,.32);font-weight:800;letter-spacing:.08em}
      .br-team-match{margin-bottom:8px}
      @media(max-width:680px){.br-team-browser__heading{display:block}.br-team-browser__heading small{display:block;margin-top:7px;text-align:left}.br-team-browser__filters{grid-template-columns:1fr}.br-team-browser__summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.br-team-browser__summary div{min-width:0;padding:8px}.br-team-browser__summary strong{font-size:15px}.br-team-turn{padding:9px}}
    `;
    document.head.appendChild(style);
  }

  async function init() {
    ensureControls();
    await refreshData(true);
    setMode("team");
    renderTeamView();

    // Se o painel da rodada redesenhar a lista depois do carregamento,
    // volta a mostrar a visÃ£o por clube sem criar ciclos de atualizaÃ§Ã£o.
    const list = $("#round-list");
    if (list) {
      const observer = new MutationObserver(() => {
        if (mode === "team" && !list.querySelector(".br-team-turn, .br-team-empty")) {
          renderTeamView();
        }
      });
      observer.observe(list, { childList: true, subtree: true });
    }

    window.setInterval(async () => {
      if (mode === "team" && !document.hidden) {
        await refreshData(true);
        renderTeamView();
      }
    }, 20000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

