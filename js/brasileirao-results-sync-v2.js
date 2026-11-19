/* =========================================================
   CCFV // BRASILEIRAO - SINCRONIZACAO PUBLICA V2
   Fonte: CCFVLive.matches + player_competitions + players
   Carregar depois de brasileirao.js e ccfv-live.js.
   Usa IDs canonicos dos 20 clubes; nao depende de nomes acentuados.
   ========================================================= */
(() => {
  "use strict";

  const CLOSED = new Set([
    "FINALIZADA", "FINALIZADO", "FINAL", "VALIDATED", "WO",
    "ADMIN_DECISION", "FINISHED", "COMPLETED", "CONCLUIDA",
    "CONCLUIDO", "ENCERRADA", "ENCERRADO"
  ]);

  // Ordem FIXTURE_ORDER usada pelo gerador do admin:
  // 1 Palmeiras, 2 Flamengo, 3 Athletico-PR ... 20 Chapecoense.
  const TEAM_IDS = Array.from({ length: 20 }, (_, i) => i + 1);
  let lastSignature = "";
  let running = false;

  const normalize = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  function buildAdminCalendar(api) {
    const teams = api.config.teams || [];
    const byId = new Map(teams.map(team => [num(team.id), team]));
    const ordered = TEAM_IDS.map(id => byId.get(id));
    if (ordered.length !== 20 || ordered.some(team => !team)) {
      console.error("CCFV // BRASILEIRAO V2: IDs 1 a 20 nao encontrados na configuracao publica.", teams);
      return null;
    }

    let rotation = [...ordered];
    const first = [];
    for (let round = 1; round <= 19; round++) {
      const games = [];
      for (let i = 0; i < 10; i++) {
        games.push({
          round,
          match: i + 1,
          home: rotation[i].id,
          away: rotation[rotation.length - 1 - i].id
        });
      }
      first.push(...games);
      const fixed = rotation[0];
      const moving = rotation.slice(1);
      moving.unshift(moving.pop());
      rotation = [fixed, ...moving];
    }
    const second = first.map(game => ({
      round: game.round + 19,
      match: game.match,
      home: game.away,
      away: game.home
    }));
    return [...first, ...second];
  }

  function resolveTeam(value, teams) {
    const wanted = normalize(value);
    const byName = teams.find(team => normalize(team.name) === wanted);
    if (byName) return byName;
    const byShort = teams.find(team => normalize(team.shortName) === wanted);
    if (byShort) return byShort;
    const id = num(value);
    return id > 0 ? teams.find(team => num(team.id) === id) || null : null;
  }

  function syncPlayers(api, live) {
    const teams = api.config.teams || [];
    const regs = (live.playerCompetitions || []).filter(reg =>
      normalize(reg.competition) === "BRASILEIRAO"
    );
    const players = new Map((live.players || []).map(player => [String(player.id), player]));
    teams.forEach(team => {
      const reg = regs.find(item => normalize(item.team_name) === normalize(team.name));
      const player = reg ? players.get(String(reg.player_id)) : null;
      team.playerId = player?.id || reg?.player_id || null;
      team.playerName = player?.name || "A DEFINIR";
      team.playerPlatform = player?.platform || "";
    });
  }

  function buildResults(api, live, fixtures) {
    const teams = api.config.teams || [];
    const latestByFixture = new Map();
    const unmatched = [];
    (live.matches || []).forEach(match => {
      if (normalize(match.competition) !== "BRASILEIRAO") return;
      if (!CLOSED.has(normalize(match.status))) return;

      const homeTeam = resolveTeam(match.home_team, teams);
      const awayTeam = resolveTeam(match.away_team, teams);
      const round = num(match.round_number ?? match.round);
      if (!homeTeam || !awayTeam || round < 1) {
        unmatched.push({ id: match.id, round, home: match.home_team, away: match.away_team, status: match.status });
        return;
      }

      let fixture = fixtures.find(item =>
        num(item.round) === round && num(item.home) === num(homeTeam.id) && num(item.away) === num(awayTeam.id)
      );
      let reversed = false;
      if (!fixture) {
        fixture = fixtures.find(item =>
          num(item.round) === round && num(item.home) === num(awayTeam.id) && num(item.away) === num(homeTeam.id)
        );
        reversed = Boolean(fixture);
      }
      if (!fixture) {
        unmatched.push({ id: match.id, round, home: match.home_team, away: match.away_team, status: match.status });
        return;
      }

      const result = {
        round,
        match: num(fixture.match),
        home: teams.find(team => num(team.id) === num(fixture.home))?.name || homeTeam.name,
        away: teams.find(team => num(team.id) === num(fixture.away))?.name || awayTeam.name,
        homeTeam: num(fixture.home),
        awayTeam: num(fixture.away),
        homeGoals: num(reversed ? match.away_score : match.home_score),
        awayGoals: num(reversed ? match.home_score : match.away_score),
        date: match.played_at || match.created_at || "",
        matchId: match.id
      };
      const key = `${result.round}|${result.match}`;
      const old = latestByFixture.get(key);
      const newDate = Date.parse(result.date) || 0;
      const oldDate = Date.parse(old?.date || "") || 0;
      if (!old || newDate >= oldDate) latestByFixture.set(key, result);
    });

    if (unmatched.length) {
      console.warn("CCFV // BRASILEIRAO V2: resultados sem confronto correspondente:", unmatched);
    }
    return [...latestByFixture.values()].sort((a, b) => a.round - b.round || a.match - b.match);
  }

  function appendLabel(container, className, playerName) {
    if (!container) return;
    let label = container.querySelector(`.${className}`);
    if (!label) {
      label = document.createElement("small");
      label.className = className;
      container.appendChild(label);
    }
    label.textContent = `JOGADOR: ${playerName || "A DEFINIR"}`;
  }

  function renderPlayerLabels(api) {
    const teams = api.config.teams || [];
    const byId = new Map(teams.map(team => [num(team.id), team]));
    const standings = api.getStandings?.() || [];
    document.querySelectorAll(".ccfv-brasileirao-table tbody tr").forEach((row, index) => {
      const team = standings[index] ? byId.get(num(standings[index].id)) : null;
      const cell = row.querySelector(".ccfv-club-cell");
      if (!team || !cell) return;
      let copy = cell.querySelector(".ccfv-club-copy");
      if (!copy) {
        copy = document.createElement("div");
        copy.className = "ccfv-club-copy";
        const name = cell.querySelector("strong");
        if (name) { cell.insertBefore(copy, name); copy.appendChild(name); }
        else cell.appendChild(copy);
      }
      appendLabel(copy, "ccfv-club-player-name", team.playerName);
    });
  }

  function run() {
    if (running) return;
    const api = window.CCFVBrasileirao;
    const live = window.CCFVLive;
    if (!api?.config || !Array.isArray(api.config.teams) || typeof api.getFixtures !== "function" ||
        typeof api.refresh !== "function" || !live || !Array.isArray(live.matches)) return;

    running = true;
    try {
      const calendar = buildAdminCalendar(api);
      if (!calendar || calendar.length !== 380) return;
      const target = api.getFixtures();
      if (!Array.isArray(target)) return;
      target.splice(0, target.length, ...calendar);

      syncPlayers(api, live);
      const results = buildResults(api, live, target);
      const signature = JSON.stringify({
        players: api.config.teams.map(team => [team.id, team.playerId, team.playerName]),
        results: results.map(item => [item.matchId, item.round, item.match, item.homeGoals, item.awayGoals])
      });

      if (signature !== lastSignature) {
        api.config.results.splice(0, api.config.results.length, ...results);
        api.config.currentRound = results.length ? Math.min(38, Math.max(...results.map(item => item.round)) + 1) : 1;
        api.config.status = results.length >= 380 ? "FINALIZADO" : results.length ? "EM ANDAMENTO" : "PREPARANDO";
        api.refresh();
        lastSignature = signature;
        console.info("CCFV // BRASILEIRAO V2 sincronizado", {
          partidasLidas: (live.matches || []).filter(item => normalize(item.competition) === "BRASILEIRAO").length,
          resultadosHomologados: results.length,
          partidasBrazilNoBanco: (live.matches || []).filter(item => normalize(item.competition) === "BRASILEIRAO").length
        });
      }
      renderPlayerLabels(api);
    } catch (error) {
      console.error("CCFV // BRASILEIRAO V2:", error);
    } finally {
      running = false;
    }
  }

  window.addEventListener("ccfv:live-update", () => window.setTimeout(run, 300));
  function init() {
    window.setTimeout(run, 700);
    window.setInterval(run, 5000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
