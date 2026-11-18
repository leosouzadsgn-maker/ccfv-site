/* =========================================================
   CCFV // BRASILEIRÃO — PÁGINA PÚBLICA + JOGADORES + RESULTADOS
   Substitui a versão anterior deste arquivo.
   Carregar DEPOIS de /js/brasileirao-live.js.
   ========================================================= */
(() => {
  "use strict";

  // Estes são os únicos estados que o admin considera homologados.
  // PLAYED foi removido propositalmente: partidas pendentes não contam como 0x0.
  const COMPLETED_STATUSES = new Set(["VALIDATED", "WO", "ADMIN_DECISION"]);
  const ADMIN_TEAM_ORDER = [
    "ATHLETICO-PR", "ATLÉTICO-MG", "BAHIA", "BOTAFOGO", "BRAGANTINO",
    "CHAPECOENSE", "CORINTHIANS", "CORITIBA", "CRUZEIRO", "FLAMENGO",
    "FLUMINENSE", "GRÊMIO", "INTERNACIONAL", "MIRASSOL", "PALMEIRAS",
    "REMO", "SANTOS", "SÃO PAULO", "VASCO", "VITÓRIA"
  ];

  let refreshTimer = null;
  let lastRenderSignature = "";
  let scheduleAligned = false;

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectStyles() {
    if (document.getElementById("ccfv-brazil-player-label-styles")) return;
    const style = document.createElement("style");
    style.id = "ccfv-brazil-player-label-styles";
    style.textContent = `
      .ccfv-club-copy{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}
      .ccfv-club-player-name,.ccfv-match-player-name,.ccfv-feature-player-name,.ccfv-next-player-name{
        display:block;color:#43df91;font-size:10px;font-weight:700;line-height:1.25;letter-spacing:.015em
      }
      .ccfv-club-player-name{font-size:10px}
      .ccfv-match-player-name{font-size:9px;margin-top:3px}
      .ccfv-feature-player-name{font-size:10px;margin:5px 0 2px}
      .ccfv-next-player-name{font-size:9px;margin-top:3px}
      @media(max-width:700px){.ccfv-club-player-name{font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function buildAdminCompatibleFixtures(api) {
    const teams = api.config.teams || [];
    const byName = new Map(teams.map(team => [normalize(team.name), team]));
    const ordered = ADMIN_TEAM_ORDER.map(name => byName.get(normalize(name)));
    if (ordered.length !== 20 || ordered.some(team => !team)) {
      console.error("CCFV // BRASILEIRÃO: não foi possível alinhar os 20 clubes ao calendário do admin.");
      return null;
    }

    const ids = ordered.map(team => Number(team.id));
    const fixed = ids[0];
    let rotating = ids.slice(1);
    const firstHalf = [];

    for (let roundIndex = 0; roundIndex < 19; roundIndex += 1) {
      const line = [fixed, ...rotating];
      const games = [];
      for (let i = 0; i < 10; i += 1) {
        const a = line[i];
        const b = line[line.length - 1 - i];
        const home = roundIndex % 2 === 0 ? a : b;
        const away = roundIndex % 2 === 0 ? b : a;
        games.push({ round: roundIndex + 1, match: i + 1, home, away });
      }
      firstHalf.push(games);
      rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
    }

    const firstLeg = firstHalf.flat();
    const secondLeg = firstLeg.map(game => ({
      round: game.round + 19,
      match: game.match,
      home: game.away,
      away: game.home
    }));
    return [...firstLeg, ...secondLeg];
  }

  function alignCalendar(api) {
    if (scheduleAligned) return true;
    const existing = api.getFixtures();
    const correct = buildAdminCompatibleFixtures(api);
    if (!Array.isArray(existing) || !correct || correct.length !== 380) return false;

    // getFixtures() devolve a própria matriz usada pelo motor público.
    // Alteramos a matriz in-place para alinhar o site à ordem do gerador admin.
    existing.splice(0, existing.length, ...correct);
    scheduleAligned = true;
    return true;
  }

  function resolvePlayersByTeam(api, live) {
    const registrations = (live.playerCompetitions || []).filter(reg =>
      normalize(reg.competition) === "BRASILEIRAO"
    );
    const playersById = new Map((live.players || []).map(player => [String(player.id), player]));

    (api.config.teams || []).forEach(team => {
      const registration = registrations.find(reg =>
        normalize(reg.team_name) === normalize(team.name)
      );
      const player = registration ? playersById.get(String(registration.player_id)) : null;
      team.playerId = player?.id || registration?.player_id || null;
      team.playerName = player?.name || "A DEFINIR";
      team.playerPlatform = player?.platform || "";
    });
  }

  function resolveTeam(value, teams) {
    const normalized = normalize(value);
    const byName = teams.find(team => normalize(team.name) === normalized);
    if (byName) return byName;
    const byShortName = teams.find(team => normalize(team.shortName) === normalized);
    if (byShortName) return byShortName;
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) return teams.find(team => Number(team.id) === id) || null;
    return null;
  }

  function buildOfficialResults(api, live) {
    const teams = api.config.teams || [];
    const fixtures = api.getFixtures() || [];
    const results = [];
    const unmatched = [];

    (live.matches || []).forEach(match => {
      if (normalize(match.competition) !== "BRASILEIRAO") return;
      if (!COMPLETED_STATUSES.has(normalize(match.status))) return;

      const dbHome = resolveTeam(match.home_team, teams);
      const dbAway = resolveTeam(match.away_team, teams);
      const round = number(match.round_number ?? match.round);
      if (!dbHome || !dbAway || round < 1) {
        unmatched.push(match);
        return;
      }

      let fixture = fixtures.find(item =>
        number(item.round) === round &&
        number(item.home) === Number(dbHome.id) &&
        number(item.away) === Number(dbAway.id)
      );
      let reversed = false;
      if (!fixture) {
        fixture = fixtures.find(item =>
          number(item.round) === round &&
          number(item.home) === Number(dbAway.id) &&
          number(item.away) === Number(dbHome.id)
        );
        reversed = Boolean(fixture);
      }

      if (!fixture) {
        unmatched.push(match);
        return;
      }

      results.push({
        round,
        match: number(fixture.match),
        home: resolveTeam(fixture.home, teams)?.name || dbHome.name,
        away: resolveTeam(fixture.away, teams)?.name || dbAway.name,
        homeTeam: number(fixture.home),
        awayTeam: number(fixture.away),
        homeGoals: number(reversed ? match.away_score : match.home_score),
        awayGoals: number(reversed ? match.home_score : match.away_score),
        date: match.played_at || match.created_at || "",
        matchId: match.id
      });
    });

    results.sort((a, b) => a.round - b.round || a.match - b.match);
    if (unmatched.length) {
      console.warn("CCFV // BRASILEIRÃO: jogos homologados sem correspondência no calendário:", unmatched.map(match => ({
        round: match.round_number,
        home: match.home_team,
        away: match.away_team,
        status: match.status
      })));
    }
    return results;
  }

  function appendPlayerLabel(container, className, playerName) {
    if (!container) return;
    let label = container.querySelector(`.${className}`);
    if (!label) {
      label = document.createElement("small");
      label.className = className;
      container.appendChild(label);
    }
    label.textContent = `JOGADOR: ${playerName || "A DEFINIR"}`;
  }

  function renderPlayerNames(api) {
    const teams = api.config.teams || [];
    const teamById = new Map(teams.map(team => [Number(team.id), team]));
    const standings = typeof api.getStandings === "function" ? api.getStandings() : [];

    // Classificação: escudo + clube + nome do jogador inscrito.
    const rows = document.querySelectorAll(".ccfv-brasileirao-table tbody tr");
    rows.forEach((row, index) => {
      const standing = standings[index];
      const team = standing ? teamById.get(Number(standing.id)) : null;
      const cell = row.querySelector(".ccfv-club-cell");
      if (!cell || !team) return;

      let copy = cell.querySelector(".ccfv-club-copy");
      if (!copy) {
        copy = document.createElement("div");
        copy.className = "ccfv-club-copy";
        const clubName = cell.querySelector("strong");
        if (clubName) {
          cell.insertBefore(copy, clubName);
          copy.appendChild(clubName);
        } else {
          cell.appendChild(copy);
        }
      }
      appendPlayerLabel(copy, "ccfv-club-player-name", team.playerName);
    });

    // Jogos da rodada: nome do jogador abaixo de cada clube.
    document.querySelectorAll(".ccfv-match-row").forEach(row => {
      const round = number(row.dataset.round);
      const matchNo = number(row.dataset.match);
      const fixture = (api.getFixtures() || []).find(item =>
        number(item.round) === round && number(item.match) === matchNo
      );
      if (!fixture) return;
      const home = teamById.get(number(fixture.home));
      const away = teamById.get(number(fixture.away));
      const blocks = row.querySelectorAll(".ccfv-match-row__team");
      [home, away].forEach((team, index) => {
        const block = blocks[index];
        const nameNode = block && Array.from(block.children).find(child => child.tagName === "SPAN");
        if (nameNode && team) appendPlayerLabel(nameNode, "ccfv-match-player-name", team.playerName);
      });
    });

    // Destaque do jogo da rodada.
    const feature = document.querySelector(".ccfv-round-feature");
    if (feature) {
      const button = feature.querySelector("[data-round][data-match]");
      if (button) {
        const fixture = (api.getFixtures() || []).find(item =>
          number(item.round) === number(button.dataset.round) &&
          number(item.match) === number(button.dataset.match)
        );
        if (fixture) {
          const blocks = feature.querySelectorAll(".ccfv-round-feature__team");
          [fixture.home, fixture.away].forEach((id, index) => {
            const team = teamById.get(number(id));
            const block = blocks[index];
            const title = block && block.querySelector("strong");
            if (title && team) appendPlayerLabel(block, "ccfv-feature-player-name", team.playerName);
          });
        }
      }
    }

    // Próximo jogo: mostra também quem representa cada escudo.
    const nextMatch = document.querySelector(".ccfv-brasileirao-season__next-match");
    if (nextMatch) {
      const roundNode = document.querySelector(".ccfv-brasileirao-season__next-round");
      const round = Number((roundNode?.textContent || "").match(/\d+/)?.[0] || 1);
      const fixture = (api.getFixtures() || []).find(item => number(item.round) === round && number(item.match) === 1);
      if (fixture) {
        const blocks = nextMatch.querySelectorAll(":scope > div");
        [fixture.home, fixture.away].forEach((id, index) => {
          const team = teamById.get(number(id));
          if (blocks[index] && team) appendPlayerLabel(blocks[index], "ccfv-next-player-name", team.playerName);
        });
      }
    }
  }

  function apply() {
    const api = window.CCFVBrasileirao;
    const live = window.CCFVLive;
    if (!api?.config || !Array.isArray(api.config.teams) ||
        typeof api.getFixtures !== "function" || typeof api.refresh !== "function" ||
        !live || !Array.isArray(live.matches)) return false;

    injectStyles();
    if (!alignCalendar(api)) return false;
    resolvePlayersByTeam(api, live);
    const results = buildOfficialResults(api, live);

    const signature = JSON.stringify({
      players: api.config.teams.map(team => [team.id, team.playerId, team.playerName]),
      results: results.map(result => [result.matchId, result.round, result.match, result.homeGoals, result.awayGoals])
    });

    if (signature !== lastRenderSignature) {
      api.config.results.splice(0, api.config.results.length, ...results);
      api.config.currentRound = results.length
        ? Math.min(38, Math.max(...results.map(result => result.round)) + 1)
        : 1;
      if (api.config.currentRound > 38) api.config.currentRound = 38;
      api.config.status = results.length >= 380
        ? "FINALIZADO"
        : results.length > 0 ? "EM ANDAMENTO" : "PREPARANDO";
      api.refresh();
      lastRenderSignature = signature;
    }

    renderPlayerNames(api);
    return true;
  }

  function scheduleSync() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(apply, 260);
  }

  window.addEventListener("ccfv:live-update", scheduleSync);

  function init() {
    setTimeout(apply, 450);
    // O CCFV Live renova os dados periodicamente; o fallback atualiza nomes/resultados.
    window.setInterval(apply, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
