/* ============================================================
   CCFV // BRASILEIRAO - PUBLIC LIVE SYNC FIX
   Results homologated by register_ccfv_match are read from
   public.matches and reflected in fixtures, standings and table.
   ============================================================ */
(() => {
  "use strict";

  const FINAL_STATUS = new Set([
    "VALIDATED", "WO", "ADMIN_DECISION", "FINAL", "FINALIZADO",
    "FINALIZADA", "FINISHED", "COMPLETED", "CONCLUIDA", "CONCLUÍDA",
    "ENCERRADA", "ENCERRADO", "PLAYED"
  ]);
  const normalize = (value) => String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toUpperCase();
  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  let lastSignature = "";
  let timer = null;

  function findTeam(value, teams) {
    const key = normalize(value);
    const direct = teams.find((team) => normalize(team.name) === key || normalize(team.shortName) === key);
    if (direct) return direct;
    const id = Number(value);
    return Number.isFinite(id) ? teams.find((team) => Number(team.id) === id) || null : null;
  }

  function buildOfficialResults(api, live) {
    const fixtures = api.getFixtures();
    const teams = api.config.teams || [];
    return (live.matches || [])
      .filter((match) => normalize(match.competition) === "BRASILEIRAO")
      .filter((match) => FINAL_STATUS.has(normalize(match.status)))
      .map((match) => {
        const round = num(match.round_number) || (() => {
          const found = String(match.stage || "").match(/(?:RODADA|ROUND)[_-]?(\d+)/i);
          return found ? num(found[1]) : 0;
        })();
        if (!round) return null;
        const home = findTeam(match.home_team, teams);
        const away = findTeam(match.away_team, teams);
        if (!home || !away) return null;

        let fixture = fixtures.find((item) =>
          num(item.round) === round && num(item.home) === num(home.id) && num(item.away) === num(away.id)
        );
        let homeGoals = num(match.home_score);
        let awayGoals = num(match.away_score);
        if (!fixture) {
          const reversed = fixtures.find((item) =>
            num(item.round) === round && num(item.home) === num(away.id) && num(item.away) === num(home.id)
          );
          if (reversed) {
            fixture = reversed;
            [homeGoals, awayGoals] = [awayGoals, homeGoals];
          }
        }
        if (!fixture) return null;
        return {
          round,
          match: num(fixture.match),
          home: teams.find((team) => Number(team.id) === Number(fixture.home))?.name || home.name,
          away: teams.find((team) => Number(team.id) === Number(fixture.away))?.name || away.name,
          homeTeam: num(fixture.home),
          awayTeam: num(fixture.away),
          homeGoals,
          awayGoals,
          date: match.played_at || match.created_at || "",
          matchId: match.id
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.round - b.round || a.match - b.match);
  }

  function participantName(teamName, live) {
    const registration = (live.playerCompetitions || []).find((item) =>
      normalize(item.competition) === "BRASILEIRAO" && normalize(item.team_name) === normalize(teamName)
    );
    if (!registration) return "JOGADOR A DEFINIR";
    const player = (live.players || []).find((item) => String(item.id) === String(registration.player_id));
    return player?.name || "JOGADOR A DEFINIR";
  }

  function decorateParticipantNames(live) {
    const tbody = document.querySelector(".ccfv-brasileirao-table tbody");
    if (tbody) {
      tbody.querySelectorAll("tr").forEach((row) => {
        const clubCell = row.querySelector("td:nth-child(2) .ccfv-club-cell");
        const clubName = clubCell?.querySelector("strong")?.textContent?.trim();
        if (!clubCell || !clubName) return;
        let label = clubCell.querySelector(".ccfv-club-player-name");
        if (!label) {
          label = document.createElement("small");
          label.className = "ccfv-club-player-name";
          clubCell.appendChild(label);
        }
        label.textContent = participantName(clubName, live);
      });
    }

    document.querySelectorAll(".ccfv-match-row").forEach((row) => {
      const sides = row.querySelectorAll(".ccfv-match-row__team");
      sides.forEach((side) => {
        const teamName = side.querySelector(":scope > span:last-child")?.textContent?.trim();
        if (!teamName) return;
        let label = side.querySelector(".ccfv-match-row__player");
        if (!label) {
          label = document.createElement("small");
          label.className = "ccfv-match-row__player";
          side.appendChild(label);
        }
        label.textContent = participantName(teamName, live);
      });
    });

    document.querySelectorAll(".ccfv-round-feature__team").forEach((side) => {
      const teamName = side.querySelector("strong")?.textContent?.trim();
      if (!teamName) return;
      let label = side.querySelector(".ccfv-round-feature__player");
      if (!label) {
        label = document.createElement("small");
        label.className = "ccfv-round-feature__player";
        side.appendChild(label);
      }
      label.textContent = participantName(teamName, live);
    });

    if (!document.querySelector("#ccfv-brasileirao-player-style")) {
      const style = document.createElement("style");
      style.id = "ccfv-brasileirao-player-style";
      style.textContent = `
        .ccfv-club-cell{align-items:center}
        .ccfv-club-player-name{display:block;margin-top:3px;color:rgba(255,255,255,.46);font-size:9px;font-weight:600;letter-spacing:0;text-transform:none}
        .ccfv-match-row__team{display:flex;flex-direction:column;align-items:center;gap:4px}
        .ccfv-match-row__player,.ccfv-round-feature__player{display:block;color:rgba(255,255,255,.48);font-size:9px;font-weight:600;letter-spacing:0;text-align:center;text-transform:none}
      `;
      document.head.appendChild(style);
    }
  }

  function sync() {
    const api = window.CCFVBrasileirao;
    const live = window.CCFVLive;
    if (!api?.config || typeof api.getFixtures !== "function" || !live) return;

    const results = buildOfficialResults(api, live);
    const signature = results.map((item) => `${item.round}.${item.match}:${item.homeGoals}-${item.awayGoals}:${item.matchId}`).join("|");
    if (signature !== lastSignature) {
      lastSignature = signature;
      api.config.results.splice(0, api.config.results.length, ...results);
      api.config.currentRound = results.length
        ? Math.min(38, Math.max(1, ...results.map((item) => item.round)) + 1)
        : 1;
      api.config.status = results.length ? "EM ANDAMENTO" : "PREPARANDO";
      api.refresh();
    }
    window.setTimeout(() => decorateParticipantNames(live), 80);
  }

  function scheduleSync() {
    window.clearTimeout(timer);
    // O sincronizador legado executa em ~100 ms; este ajuste roda depois
    // e garante que VALIDATED/WO/ADMIN_DECISION também apareçam no site.
    timer = window.setTimeout(sync, 260);
  }

  window.addEventListener("ccfv:live-update", scheduleSync);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSync, { once: true });
  } else {
    scheduleSync();
  }
  window.setInterval(() => {
    if (document.visibilityState === "visible") scheduleSync();
  }, 30000);
})();
