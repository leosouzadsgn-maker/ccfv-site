/* =========================================================
   CCFV // BRASILEIRÃO — SINCRONIZAÇÃO PÚBLICA
   Complementa o bridge atual para os status homologados
   pelo admin e usa os confrontos oficiais do calendário.
   Carregar DEPOIS de /js/brasileirao-live.js.
   ========================================================= */
(() => {
  "use strict";

  const COMPLETED_STATUSES = new Set([
    "FINAL",
    "FINALIZADO",
    "FINALIZADA",
    "FINISHED",
    "COMPLETED",
    "CONCLUIDA",
    "CONCLUÍDA",
    "ENCERRADA",
    "ENCERRADO",
    "VALIDATED",
    "WO",
    "ADMIN_DECISION",
    "PLAYED"
  ]);

  let refreshTimer = null;

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function resolveTeam(value, teams) {
    const normalized = normalize(value);
    const byName = teams.find((team) => normalize(team.name) === normalized);
    if (byName) return byName;

    const byShortName = teams.find((team) => normalize(team.shortName) === normalized);
    if (byShortName) return byShortName;

    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return teams.find((team) => Number(team.id) === numeric) || null;
    }
    return null;
  }

  function applyOfficialBrazilResults() {
    const api = window.CCFVBrasileirao;
    const live = window.CCFVLive;
    if (!api?.config || !Array.isArray(api.config.teams) ||
        typeof api.getFixtures !== "function" ||
        !live || !Array.isArray(live.matches)) {
      return false;
    }

    const teams = api.config.teams;
    const fixtures = api.getFixtures();
    if (!Array.isArray(fixtures)) return false;

    const results = [];
    const unmatched = [];

    live.matches.forEach((match) => {
      if (normalize(match.competition) !== "BRASILEIRAO") return;
      if (!COMPLETED_STATUSES.has(normalize(match.status))) return;

      const home = resolveTeam(match.home_team, teams);
      const away = resolveTeam(match.away_team, teams);
      const round = toNumber(match.round_number ?? match.round);
      if (!home || !away || round < 1) {
        unmatched.push(match);
        return;
      }

      // O calendário do admin agora segue o mesmo rodízio de /js/brasileirao.js.
      // Procuramos o confronto exato para preservar mandante, visitante e jogo.
      const fixture = fixtures.find((item) =>
        toNumber(item.round) === round &&
        toNumber(item.home) === toNumber(home.id) &&
        toNumber(item.away) === toNumber(away.id)
      );

      const matchNumber = fixture
        ? toNumber(fixture.match)
        : toNumber(match.match_number);

      if (matchNumber < 1) {
        unmatched.push(match);
        return;
      }

      results.push({
        round,
        match: matchNumber,
        home: home.name,
        away: away.name,
        homeTeam: Number(home.id),
        awayTeam: Number(away.id),
        homeGoals: toNumber(match.home_score),
        awayGoals: toNumber(match.away_score),
        date: match.played_at || match.created_at || "",
        matchId: match.id
      });
    });

    results.sort((a, b) => a.round - b.round || a.match - b.match);

    if (!Array.isArray(api.config.results)) api.config.results = [];
    api.config.results.splice(0, api.config.results.length, ...results);

    api.config.status = results.length ? "EM ANDAMENTO" : "PREPARANDO";
    if (typeof api.refresh === "function") api.refresh();

    if (unmatched.length) {
      console.warn(
        "CCFV // BRASILEIRÃO: resultados não associados ao calendário público:",
        unmatched.map((match) => ({
          round: match.round_number,
          home: match.home_team,
          away: match.away_team,
          status: match.status
        }))
      );
    }

    console.info(`CCFV // BRASILEIRÃO: ${results.length} resultado(s) oficiais sincronizados.`);
    return true;
  }

  function scheduleSync() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(applyOfficialBrazilResults, 220);
  }

  window.addEventListener("ccfv:live-update", scheduleSync);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(applyOfficialBrazilResults, 350);
    }, { once: true });
  } else {
    setTimeout(applyOfficialBrazilResults, 350);
  }

  // Fallback: acompanha o mesmo ciclo de atualização pública do CCFV Live.
  window.setInterval(applyOfficialBrazilResults, 5000);
})();
