/* ============================================================
   CCFV // BRASILEIRAO - CENTRAL DE RESULTADOS
   Interface complementar para admin/js/brasileirao-panel.js
   Mantem o RPC oficial register_ccfv_match como unico caminho
   de homologacao, Elo e sincronizacao dos resultados.
   ============================================================ */
(() => {
  "use strict";

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

 const CLOSED = new Set([
  "VALIDATED",
  "WO",
  "ADMIN_DECISION"
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
  const closed = (status) => CLOSED.has(norm(status));

  let db = null;
  let cache = { matches: [], players: [], regs: [], loadedAt: 0 };
  let refreshing = false;
  let scheduled = false;
  let lastRound = -1;

  function crest(team) {
    const file = CLUBS[norm(team)] || CLUBS[String(team || "").toUpperCase()];
    return file ? `/assets/images/clubs/${file}` : "";
  }

  function playerFor(match, side) {
    const id = match[side === "home" ? "home_player_id" : "away_player_id"];
    let player = cache.players.find((item) => String(item.id) === String(id));
    if (player) return player;

    const team = match[side === "home" ? "home_team" : "away_team"];
    const registration = cache.regs.find((item) => norm(item.team_name) === norm(team));
    return cache.players.find((item) => String(item.id) === String(registration?.player_id)) || null;
  }

  function playerLabel(match, side) {
    const player = playerFor(match, side);
    return player?.name || "JOGADOR NÃO VINCULADO";
  }

  function teamBlock(match, side) {
    const isHome = side === "home";
    const team = match[isHome ? "home_team" : "away_team"] || "CLUBE";
    const image = crest(team);
    const player = playerLabel(match, side);
    return `
      <div class="ccfv-tv-team ${isHome ? "is-home" : "is-away"}">
        <div class="ccfv-tv-crest">${image ? `<img src="${image}" alt="Escudo ${esc(team)}" loading="lazy">` : "<span>CCFV</span>"}</div>
        <div class="ccfv-tv-team-copy">
          <strong>${esc(team)}</strong>
          <small><span>JOGADOR</span>${esc(player)}</small>
        </div>
      </div>`;
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
    if (!force && Date.now() - cache.loadedAt < 1800) return cache;
    const client = await getClient();
    const [matches, players, regs] = await Promise.all([
      client.from("matches")
        .select("id,competition,stage,round_number,home_player_id,away_player_id,home_team,away_team,home_score,away_score,status,played_at,created_at")
        .eq("competition", "BRASILEIRAO")
        .order("round_number")
        .order("created_at"),
      client.from("players")
        .select("id,name,platform,photo_url,status")
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

  function renderCards() {
    const list = $("#round-list");
    if (!list) return;
    const round = Math.max(1, Math.min(38, Number($("#round")?.value) || 1));
    const matches = cache.matches
      .filter((match) => Number(match.round_number) === round)
      .sort((a, b) => Number(a.match_number || 0) - Number(b.match_number || 0));

    if (!matches.length) {
      list.innerHTML = '<div class="ccfv-tv-empty">Nenhuma partida cadastrada para esta rodada.</div>';
      return;
    }

    list.innerHTML = matches.map((match, index) => {
      const finished = closed(match.status);
      const score = finished
        ? `${Number(match.home_score ?? 0)} <i>×</i> ${Number(match.away_score ?? 0)}`
        : `<span class="ccfv-tv-vs">VS</span>`;
      const stateLabel = finished ? "HOMOLOGADA" : "AGUARDANDO RESULTADO";
      const buttonLabel = finished ? "EDITAR PLACAR" : "LANÇAR RESULTADO";
      return `
        <article class="ccfv-tv-match">
          <div class="ccfv-tv-match-top">
            <span>RODADA ${String(round).padStart(2, "0")} <b>·</b> CONFRONTO ${String(index + 1).padStart(2, "0")}</span>
            <span class="ccfv-tv-status ${finished ? "is-done" : "is-pending"}"><i></i>${stateLabel}</span>
          </div>
          <div class="ccfv-tv-match-body">
            ${teamBlock(match, "home")}
            <div class="ccfv-tv-score">${score}</div>
            ${teamBlock(match, "away")}
          </div>
          <div class="ccfv-tv-match-bottom">
            <span>${finished ? "RESULTADO REGISTRADO NO SISTEMA OFICIAL" : "AGUARDANDO CONFERÊNCIA DA ADMINISTRAÇÃO"}</span>
            <button type="button" class="ccfv-btn ccfv-tv-result-btn" data-result="${esc(match.id)}">${buttonLabel}</button>
          </div>
        </article>`;
    }).join("");

    // Mantem os contadores oficiais do painel em sincronia.
    const total = cache.matches.length;
    const finished = cache.matches.filter((match) => closed(match.status)).length;
    if ($("#stat-matches")) $("#stat-matches").textContent = String(total).padStart(3, "0");
    if ($("#stat-finished")) $("#stat-finished").textContent = String(finished).padStart(3, "0");
    if ($("#stat-round")) $("#stat-round").textContent = String(round).padStart(2, "0");
  }

  function setTeamPresentation(side, team, player) {
    const image = $(`#ccfv-result-${side}-crest`);
    const teamName = $(`#ccfv-result-${side}-name`);
    const playerName = $(`#ccfv-result-${side}-player`);
    if (image) {
      image.src = crest(team);
      image.alt = `Escudo ${team}`;
      image.hidden = !crest(team);
    }
    if (teamName) teamName.textContent = team || "CLUBE";
    if (playerName) playerName.textContent = player || "JOGADOR NÃO VINCULADO";
  }

  function installModalLayout() {
    const modal = $("#result-modal");
    const form = $("#result-form");
    const grid = $(".ccfv-form-grid", form || document);
    if (!modal || !form || !grid || $(".ccfv-result-showdown", form)) return;
    modal.querySelector(".ccfv-modal-card")?.classList.add("ccfv-result-dialog");

    const homeTeamLabel = $("#home-team")?.closest("label");
    const awayTeamLabel = $("#away-team")?.closest("label");
    const homeScoreLabel = $("#home-score")?.closest("label");
    const awayScoreLabel = $("#away-score")?.closest("label");
    const dateLabel = $("#played-at")?.closest("label");
    const homeScoreInput = $("#home-score");
    const awayScoreInput = $("#away-score");
    const dateInput = $("#played-at");

    if (homeTeamLabel) homeTeamLabel.hidden = true;
    if (awayTeamLabel) awayTeamLabel.hidden = true;

    const showdown = document.createElement("section");
    showdown.className = "ccfv-result-showdown";
    showdown.innerHTML = `
      <div class="ccfv-result-team is-home">
        <div class="ccfv-result-crest"><img id="ccfv-result-home-crest" alt="Escudo do mandante"></div>
        <span>MANDANTE</span>
        <strong id="ccfv-result-home-name">CLUBE DA CASA</strong>
        <small id="ccfv-result-home-player">JOGADOR</small>
      </div>
      <div class="ccfv-result-center">
        <span>PLACAR OFICIAL</span>
        <div class="ccfv-result-score-fields" id="ccfv-result-score-fields"></div>
      </div>
      <div class="ccfv-result-team is-away">
        <div class="ccfv-result-crest"><img id="ccfv-result-away-crest" alt="Escudo do visitante"></div>
        <span>VISITANTE</span>
        <strong id="ccfv-result-away-name">CLUBE VISITANTE</strong>
        <small id="ccfv-result-away-player">JOGADOR</small>
      </div>`;
    grid.parentNode.insertBefore(showdown, grid);

    const scoreFields = $("#ccfv-result-score-fields", showdown);
    if (homeScoreLabel && homeScoreInput) {
      homeScoreLabel.remove();
      const label = document.createElement("label");
      label.className = "ccfv-result-score-input";
      label.innerHTML = "<span>CASA</span>";
      label.appendChild(homeScoreInput);
      scoreFields.appendChild(label);
    }
    const divider = document.createElement("b");
    divider.className = "ccfv-result-score-x";
    divider.textContent = "×";
    scoreFields.appendChild(divider);
    if (awayScoreLabel && awayScoreInput) {
      awayScoreLabel.remove();
      const label = document.createElement("label");
      label.className = "ccfv-result-score-input";
      label.innerHTML = "<span>FORA</span>";
      label.appendChild(awayScoreInput);
      scoreFields.appendChild(label);
    }

    if (dateLabel && dateInput) {
      dateLabel.className = "ccfv-result-date";
      dateLabel.innerHTML = "<span>DATA E HORÁRIO DA PARTIDA</span>";
      dateLabel.appendChild(dateInput);
      dateLabel.hidden = false;
      grid.appendChild(dateLabel);
    }
    grid.classList.add("ccfv-result-hidden-grid");

    const title = $("#result-title");
    if (title) title.textContent = "HOMOLOGAR PLACAR";
    const submit = $("#result-form button[type='submit']");
    if (submit) submit.textContent = "CONFIRMAR RESULTADO E ATUALIZAR TABELA";
  }

  function updateModalPresentation() {
    const modal = $("#result-modal");
    if (!modal || modal.hidden) return;
    installModalLayout();
    const home = $("#home-team")?.value || "";
    const away = $("#away-team")?.value || "";
    const match = cache.matches.find((item) =>
      norm(item.home_team) === norm(home) && norm(item.away_team) === norm(away) &&
      Number(item.round_number) === Math.max(1, Number($("#round")?.value) || 1)
    ) || cache.matches.find((item) => norm(item.home_team) === norm(home) && norm(item.away_team) === norm(away));
    setTeamPresentation("home", home, match ? playerLabel(match, "home") : "JOGADOR");
    setTeamPresentation("away", away, match ? playerLabel(match, "away") : "JOGADOR");
  }

  async function refreshAndRender(force = false) {
    if (refreshing) return;
    refreshing = true;
    try {
      await loadData(force);
      renderCards();
      updateModalPresentation();
    } catch (error) {
      console.error("CCFV // RESULTADOS UI:", error);
    } finally {
      refreshing = false;
    }
  }

  function scheduleRefresh(force = false) {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(async () => {
      scheduled = false;
      await refreshAndRender(force);
    }, 280);
  }

  function bind() {
    const list = $("#round-list");
    if (list) {
      const observer = new MutationObserver(() => {
        // O renderizador original redesenha .ccfv-match; nossa versão usa
        // .ccfv-tv-match, evitando ciclos do MutationObserver.
        if (list.querySelector(".ccfv-match, .ccfv-empty")) scheduleRefresh(true);
      });
      observer.observe(list, { childList: true, subtree: true });
    }

    const round = $("#round");
    round?.addEventListener("change", () => scheduleRefresh(true));
    $("#show-round")?.addEventListener("click", () => scheduleRefresh(true));
    $("#load-round")?.addEventListener("click", () => scheduleRefresh(true));
    $("#refresh")?.addEventListener("click", () => scheduleRefresh(true));

    const modal = $("#result-modal");
    if (modal) {
      const observer = new MutationObserver(() => updateModalPresentation());
      observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
      $("#result-form")?.addEventListener("submit", () => {
        // O RPC oficial é executado pelo painel original. Depois da resposta,
        // recarregamos a lista para refletir placar e status homologados.
        window.setTimeout(() => scheduleRefresh(true), 900);
      });
    }
  }

  function addStyles() {
    if ($("#ccfv-brasileirao-results-ui-style")) return;
    const style = document.createElement("style");
    style.id = "ccfv-brasileirao-results-ui-style";
    style.textContent = `
      .ccfv-tv-match{margin:0 0 10px;padding:14px 15px;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:linear-gradient(145deg,#0b110e,#070b09);box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
      .ccfv-tv-match-top,.ccfv-tv-match-bottom{display:flex;justify-content:space-between;align-items:center;gap:10px}
      .ccfv-tv-match-top{margin-bottom:13px;color:rgba(255,255,255,.38);font-size:9px;font-weight:900;letter-spacing:.1em}
      .ccfv-tv-match-top b{color:#38d995;margin:0 4px}
      .ccfv-tv-status{display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid rgba(255,255,255,.08);border-radius:99px;font-size:8px;letter-spacing:.07em;white-space:nowrap}
      .ccfv-tv-status i{width:6px;height:6px;border-radius:50%;background:#e4ae4d;display:inline-block}
      .ccfv-tv-status.is-done{color:#43df91;border-color:rgba(67,223,145,.22);background:rgba(67,223,145,.06)}
      .ccfv-tv-status.is-done i{background:#43df91}
      .ccfv-tv-match-body{display:grid;grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr);align-items:center;gap:8px}
      .ccfv-tv-team{display:flex;align-items:center;gap:11px;min-width:0}
      .ccfv-tv-team.is-away{flex-direction:row-reverse;text-align:right}
      .ccfv-tv-crest{width:46px;height:46px;flex:0 0 46px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#030705;padding:6px}
      .ccfv-tv-crest img{width:100%;height:100%;object-fit:contain}
      .ccfv-tv-crest span{font-size:9px;font-weight:900;color:#43df91}
      .ccfv-tv-team-copy{display:grid;gap:5px;min-width:0}
      .ccfv-tv-team-copy strong{font-size:11px;line-height:1.25;color:#fff;overflow-wrap:anywhere}
      .ccfv-tv-team-copy small{display:grid;gap:2px;color:rgba(255,255,255,.48);font-size:9px;line-height:1.3;overflow-wrap:anywhere}
      .ccfv-tv-team-copy small span{color:#43df91;font-size:7px;font-weight:900;letter-spacing:.1em}
      .ccfv-tv-score{display:flex;justify-content:center;align-items:center;min-height:48px;color:#fff;font-size:22px;font-weight:900;letter-spacing:.02em;white-space:nowrap}
      .ccfv-tv-score i{font-style:normal;color:#43df91;padding:0 5px;font-size:18px}
      .ccfv-tv-vs{font-size:12px;letter-spacing:.18em;color:rgba(255,255,255,.24)}
      .ccfv-tv-match-bottom{margin-top:13px;padding-top:11px;border-top:1px solid rgba(255,255,255,.06)}
      .ccfv-tv-match-bottom>span{color:rgba(255,255,255,.29);font-size:7px;font-weight:800;letter-spacing:.08em}
      .ccfv-tv-result-btn{font-size:9px!important;padding:9px 12px!important;white-space:nowrap}
      .ccfv-tv-empty{padding:24px;text-align:center;border:1px dashed rgba(255,255,255,.1);border-radius:12px;color:rgba(255,255,255,.4);font-size:11px}
      .ccfv-result-dialog{width:min(760px,calc(100vw - 28px));padding:24px!important;border:1px solid rgba(67,223,145,.18)!important;background:linear-gradient(155deg,#0c1510,#050806)!important}
      .ccfv-result-showdown{display:grid;grid-template-columns:minmax(0,1fr) 190px minmax(0,1fr);align-items:center;gap:12px;margin:18px 0 14px;padding:20px 16px;border:1px solid rgba(67,223,145,.16);border-radius:16px;background:radial-gradient(ellipse at center,rgba(67,223,145,.1),transparent 62%),#070c09}
      .ccfv-result-team{display:grid;justify-items:center;gap:7px;text-align:center;min-width:0}
      .ccfv-result-crest{width:68px;height:68px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:#020604;padding:10px}
      .ccfv-result-crest img{max-width:100%;max-height:100%;object-fit:contain}
      .ccfv-result-team>span{font-size:8px;font-weight:900;letter-spacing:.14em;color:#43df91}
      .ccfv-result-team>strong{font-size:13px;line-height:1.25;color:#fff;overflow-wrap:anywhere}
      .ccfv-result-team>small{font-size:10px;color:rgba(255,255,255,.48);overflow-wrap:anywhere}
      .ccfv-result-center{text-align:center;min-width:0}
      .ccfv-result-center>span{font-size:8px;font-weight:900;letter-spacing:.14em;color:rgba(255,255,255,.42)}
      .ccfv-result-score-fields{display:flex;align-items:end;justify-content:center;gap:8px;margin-top:8px}
      .ccfv-result-score-input{display:grid;gap:5px;width:62px!important;color:rgba(255,255,255,.4)!important;font-size:8px!important;font-weight:900!important;text-align:center}
      .ccfv-result-score-input input{width:62px!important;height:60px!important;padding:0!important;text-align:center!important;font-size:28px!important;font-weight:900!important;color:#fff!important;border:1px solid rgba(67,223,145,.35)!important;border-radius:12px!important;background:#020705!important;appearance:textfield}
      .ccfv-result-score-input input::-webkit-inner-spin-button,.ccfv-result-score-input input::-webkit-outer-spin-button{appearance:none;margin:0}
      .ccfv-result-score-x{padding-bottom:14px;color:#43df91;font-size:22px}
      .ccfv-result-hidden-grid label:has(#home-team),.ccfv-result-hidden-grid label:has(#away-team){display:none!important}
      .ccfv-result-hidden-grid{display:block!important}
      .ccfv-result-date{display:grid!important;gap:7px!important;margin-top:10px!important;color:rgba(255,255,255,.42)!important;font-size:8px!important;font-weight:900!important;letter-spacing:.1em}
      .ccfv-result-date input{width:100%;min-height:42px;padding:0 12px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:#030806;color:#fff}
      .ccfv-result-dialog #result-form button[type=submit]{width:100%;min-height:46px;font-size:10px;letter-spacing:.04em}
      @media(max-width:640px){.ccfv-tv-match{padding:11px}.ccfv-tv-match-body{grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);gap:4px}.ccfv-tv-crest{width:35px;height:35px;flex-basis:35px;padding:4px}.ccfv-tv-team{gap:6px}.ccfv-tv-team-copy strong{font-size:9px}.ccfv-tv-team-copy small{font-size:8px}.ccfv-tv-score{font-size:18px}.ccfv-tv-match-bottom{align-items:flex-start}.ccfv-tv-match-bottom>span{max-width:45%;line-height:1.4}.ccfv-tv-result-btn{padding:8px!important;font-size:8px!important}.ccfv-tv-match-top{align-items:flex-start}.ccfv-tv-status{font-size:7px}.ccfv-result-dialog{padding:14px!important}.ccfv-result-showdown{grid-template-columns:1fr 128px 1fr;gap:5px;padding:13px 7px}.ccfv-result-crest{width:48px;height:48px;padding:7px}.ccfv-result-team>strong{font-size:10px}.ccfv-result-team>small{font-size:8px}.ccfv-result-score-input,.ccfv-result-score-input input{width:48px!important}.ccfv-result-score-input input{height:50px!important;font-size:23px!important}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    addStyles();
    installModalLayout();
    bind();
    refreshAndRender(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
