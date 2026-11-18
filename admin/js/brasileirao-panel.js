(() => {
  "use strict";

  const TEAMS = [
    "ATHLETICO-PR", "ATLÉTICO-MG", "BAHIA", "BOTAFOGO", "BRAGANTINO",
    "CHAPECOENSE", "CORINTHIANS", "CORITIBA", "CRUZEIRO", "FLAMENGO",
    "FLUMINENSE", "GRÊMIO", "INTERNACIONAL", "MIRASSOL", "PALMEIRAS",
    "REMO", "SANTOS", "SÃO PAULO", "VASCO", "VITÓRIA"
  ];

  // A lista administrativa continua em ordem alfabética, mas o calendário
  // precisa seguir exatamente a ordem/rodízio da página pública.
  const FIXTURE_ORDER = [
    "PALMEIRAS", "FLAMENGO", "ATHLETICO-PR", "FLUMINENSE", "CRUZEIRO",
    "BAHIA", "CORINTHIANS", "BRAGANTINO", "BOTAFOGO", "CORITIBA",
    "ATLÉTICO-MG", "SÃO PAULO", "VITÓRIA", "GRÊMIO", "MIRASSOL",
    "INTERNACIONAL", "SANTOS", "VASCO", "REMO", "CHAPECOENSE"
  ];
  const BATCH_SIZE = 10;
  const state = {
    client: null,
    players: [],
    regs: [],
    matches: [],
    standings: [],
    round: 1,
    selectedMatch: null,
    generating: false
  };

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const done = ["VALIDATED", "WO", "ADMIN_DECISION"];

  function msg(text, error = false) {
    const element = $("#message");
    if (!element) return;
    element.hidden = false;
    element.textContent = text;
    element.classList.toggle("error", error);
    clearTimeout(msg.timer);
    msg.timer = setTimeout(() => { element.hidden = true; }, 6500);
  }

  async function client() {
    if (state.client) return state.client;
    if (!window.CCFVAuth || typeof window.CCFVAuth.getClient !== "function") {
      throw new Error("Sistema de autenticação não disponível.");
    }
    state.client = await window.CCFVAuth.getClient();
    return state.client;
  }

  function norm(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function regForTeam(team) {
    return state.regs.find((registration) => norm(registration.team_name) === norm(team));
  }

  async function load() {
    const db = await client();
    const [playersResult, registrationsResult, matchesResult] = await Promise.all([
      db.from("players")
        .select("id,name,platform,elo,status,team_name,photo_url")
        .eq("status", "ACTIVE")
        .order("name"),
      db.from("player_competitions")
        .select("*")
        .eq("competition", "BRASILEIRAO"),
      db.from("matches")
        .select("id,competition,stage,round_number,home_player_id,away_player_id,home_team,away_team,home_score,away_score,status,played_at,created_at")
        .eq("competition", "BRASILEIRAO")
        .order("round_number")
        .order("created_at")
    ]);

    const firstError = [playersResult, registrationsResult, matchesResult].find((result) => result.error);
    if (firstError) throw firstError.error;

    state.players = playersResult.data || [];
    state.regs = registrationsResult.data || [];
    state.matches = matchesResult.data || [];
    await loadStandings();
    renderAll();
  }

  async function loadStandings() {
    const db = await client();
    const result = await db.rpc("get_brasileirao_standings", { p_round_number: state.round });
    if (result.error) {
      state.standings = [];
      console.warn("CCFV // BRASILEIRÃO: não foi possível atualizar a classificação:", result.error);
      return;
    }
    state.standings = Array.isArray(result.data) ? result.data : [];
  }

  function renderRegistrations() {
    const list = $("#registration-list");
    const usedPlayers = new Set(state.regs.map((registration) => String(registration.player_id)));
    list.innerHTML = TEAMS.map((team, index) => {
      const registration = regForTeam(team);
      const options = ['<option value="">A DEFINIR</option>'].concat(
        state.players.map((player) => {
          const usedElsewhere = usedPlayers.has(String(player.id)) &&
            String(player.id) !== String(registration?.player_id || "");
          const selected = String(player.id) === String(registration?.player_id || "") ? "selected" : "";
          const disabled = usedElsewhere ? "disabled" : "";
          return `<option value="${esc(player.id)}" ${selected} ${disabled}>${esc(player.name)}${usedElsewhere ? " — JÁ INSCRITO" : ""}</option>`;
        })
      ).join("");

      return `<div class="ccfv-row">
        <span class="slot">${String(index + 1).padStart(2, "0")}</span>
        <div><strong>${esc(team)}</strong><small>${registration?.player_id ? "INSCRITO" : "AGUARDANDO"}</small></div>
        <select data-team="${esc(team)}">${options}</select>
        <div class="actions">
          <button class="ccfv-btn" data-save="${esc(team)}">${registration?.player_id ? "ATUALIZAR" : "INSCREVER"}</button>
          ${registration?.player_id ? `<button class="ccfv-btn danger" data-remove="${esc(registration.id)}">REMOVER</button>` : ""}
        </div>
      </div>`;
    }).join("");

    $("#stat-registered").textContent = `${state.regs.length}/20`;
    $("#registration-status").textContent = state.regs.length === 20 ? "PRONTA" : "CONFIGURANDO";
  }

  async function saveRegistration(team) {
    const select = document.querySelector(`select[data-team="${CSS.escape(team)}"]`);
    const playerId = select?.value || "";
    if (!playerId) {
      msg("Selecione um jogador para este clube.", true);
      return;
    }

    try {
      const db = await client();
      const existingPlayerRegistration = state.regs.find((registration) =>
        String(registration.player_id) === String(playerId)
      );
      if (existingPlayerRegistration && norm(existingPlayerRegistration.team_name) !== norm(team)) {
        msg("Este jogador já está inscrito em outro clube.", true);
        return;
      }

      const sameTeam = regForTeam(team);
      if (sameTeam) {
        const { error } = await db.from("player_competitions")
          .update({ player_id: playerId, team_name: team })
          .eq("id", sameTeam.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("player_competitions").insert({
          player_id: playerId,
          competition: "BRASILEIRAO",
          team_name: team
        });
        if (error) throw error;
      }
      msg("Clube inscrito com sucesso.");
      await load();
    } catch (error) {
      msg(error.message || "Não foi possível salvar a inscrição.", true);
    }
  }

  async function removeRegistration(id) {
    if (!id || !window.confirm("Remover esta inscrição do Brasileirão?")) return;
    try {
      const db = await client();
      const { error } = await db.from("player_competitions")
        .delete()
        .eq("id", id)
        .eq("competition", "BRASILEIRAO");
      if (error) throw error;
      msg("Inscrição removida.");
      await load();
    } catch (error) {
      msg(error.message || "Não foi possível remover a inscrição.", true);
    }
  }

  // Reproduz exatamente o algoritmo de generateFixtures() em
  // /js/brasileirao.js para que a página pública reconheça cada jogo.
  function buildSchedule(teams) {
    let rotation = [...teams];
    const firstHalf = [];

    for (let round = 1; round <= 19; round += 1) {
      const games = [];
      for (let index = 0; index < rotation.length / 2; index += 1) {
        games.push({
          round,
          match: index + 1,
          home: rotation[index],
          away: rotation[rotation.length - 1 - index]
        });
      }
      firstHalf.push(games);

      const fixed = rotation[0];
      const moving = rotation.slice(1);
      moving.unshift(moving.pop());
      rotation = [fixed, ...moving];
    }

    const secondHalf = firstHalf.map((games) => games.map((game) => ({
      round: game.round + 19,
      match: game.match,
      home: game.away,
      away: game.home
    })));

    return [...firstHalf, ...secondHalf];
  }

  function matchKey(match) {
    return [
      Number(match.round_number),
      String(match.home_player_id),
      String(match.away_player_id)
    ].join("|");
  }

  function makeExpectedMatches(teams) {
    const schedule = buildSchedule(teams);
    return schedule.flatMap((games) => games.map((game) => ({
      competition: "BRASILEIRAO",
      stage: `RODADA_${String(game.round).padStart(2, "0")}`,
      round_number: game.round,
      home_player_id: game.home.playerId,
      away_player_id: game.away.playerId,
      home_team: game.home.name,
      away_team: game.away.name
    })));
  }

  function resolveRegisteredTeams() {
    if (state.regs.length !== 20) {
      throw new Error(`Existem ${state.regs.length}/20 inscrições. Complete os 20 clubes antes de gerar a tabela.`);
    }

    const registeredByTeam = new Map();
    for (const name of FIXTURE_ORDER) {
      const registrations = state.regs.filter((registration) => norm(registration.team_name) === norm(name));
      if (registrations.length !== 1) {
        throw new Error(`${name}: esperado 1 jogador inscrito, encontrado(s) ${registrations.length}. Confira as inscrições.`);
      }

      const registration = registrations[0];
      const player = state.players.find((item) => String(item.id) === String(registration.player_id));
      if (!player) {
        throw new Error(`${name}: o jogador vinculado não foi encontrado como ATIVO na tabela de jogadores. Atualize o cadastro antes de gerar.`);
      }
      registeredByTeam.set(norm(name), { name, playerId: player.id });
    }

    // A ordem é idêntica à página pública, não à ordem visual do formulário.
    const teams = FIXTURE_ORDER.map((name) => registeredByTeam.get(norm(name)));

    const playerIds = teams.map((team) => String(team.playerId));
    if (new Set(playerIds).size !== 20) {
      throw new Error("Há jogador repetido em mais de um clube. Cada treinador precisa ocupar apenas um clube.");
    }
    return teams;
  }

  async function refreshMatchesAfterGeneration() {
    try {
      await load();
    } catch (error) {
      console.warn("CCFV // BRASILEIRÃO: partidas foram enviadas, mas a atualização da tela falhou:", error);
      msg("Partidas enviadas ao banco. A atualização da tela falhou; clique em ATUALIZAR PARTIDAS para recarregar.", true);
    }
  }

  async function generate() {
    if (state.generating) return;

    let insertedThisRun = 0;
    let totalToInsert = 0;
    const button = $("#generate");

    try {
      const teams = resolveRegisteredTeams();

      if (state.matches.some((match) => done.includes(String(match.status || "")))) {
        throw new Error("Já existem resultados oficiais. A tabela não será regenerada para proteger o campeonato.");
      }

      const expected = makeExpectedMatches(teams);
      if (expected.length !== 380) {
        throw new Error(`Falha na conferência do calendário: foram montadas ${expected.length} partidas, mas o esperado é 380.`);
      }

      const expectedKeys = new Set(expected.map(matchKey));
      const existingKeys = new Set();
      const unexpected = [];
      for (const match of state.matches) {
        const key = matchKey(match);
        if (!expectedKeys.has(key)) unexpected.push(match);
        existingKeys.add(key);
      }

      if (unexpected.length) {
        throw new Error(`Já existem ${unexpected.length} partida(s) com clubes/participantes diferentes do cadastro atual. Não vou duplicar nem sobrescrever esses jogos. Envie este aviso para conferirmos o banco.`);
      }

      const missing = expected.filter((match) => !existingKeys.has(matchKey(match)));
      totalToInsert = missing.length;

      if (totalToInsert === 0) {
        msg("Calendário já está completo: 380/380 partidas cadastradas.");
        await refreshMatchesAfterGeneration();
        return;
      }

      state.generating = true;
      button.disabled = true;
      button.textContent = "PREPARANDO LOTES...";
      $("#stat-matches").textContent = String(state.matches.length).padStart(3, "0");
      msg(`Conferência concluída: 20 clubes válidos. Serão enviados ${totalToInsert} jogos em lotes de até ${BATCH_SIZE}.`);

      const db = await client();
      for (let offset = 0; offset < missing.length; offset += BATCH_SIZE) {
        const batch = missing.slice(offset, offset + BATCH_SIZE);
        const batchNumber = Math.floor(offset / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(missing.length / BATCH_SIZE);
        button.textContent = `GERANDO ${Math.min(offset + batch.length, missing.length)}/${missing.length}`;
        msg(`Gerando partidas: lote ${batchNumber}/${totalBatches} — ${insertedThisRun + batch.length} de ${totalToInsert} nesta tentativa.`);

        const { error } = await db.from("matches").insert(batch);
        if (error) {
          const detail = error.message || "Erro desconhecido do Supabase.";
          throw new Error(`O lote ${batchNumber}/${totalBatches} falhou: ${detail}`);
        }

        insertedThisRun += batch.length;
        const totalKnown = state.matches.length + insertedThisRun;
        $("#stat-matches").textContent = String(totalKnown).padStart(3, "0");
      }

      msg("380 partidas enviadas com sucesso. Atualizando painel e classificação...");
      await refreshMatchesAfterGeneration();
      if (state.matches.length >= 380) {
        msg("BRASILEIRÃO GERADO! 20 clubes, 38 rodadas e 380 partidas cadastradas.");
      }
    } catch (error) {
      console.error("CCFV // BRASILEIRÃO GENERATE ERROR:", error);
      if (insertedThisRun > 0) {
        msg(`Geração parcial: ${insertedThisRun} jogo(s) foram salvos nesta tentativa. Nenhum resultado foi apagado. Clique novamente em GERAR 38 RODADAS para continuar de onde parou. Detalhe: ${error.message}`, true);
        await refreshMatchesAfterGeneration();
      } else {
        msg(error.message || "Não foi possível gerar a tabela. Nenhum jogo foi apagado.", true);
      }
    } finally {
      state.generating = false;
      if (button) {
        button.disabled = false;
        button.textContent = "GERAR 38 RODADAS";
      }
    }
  }

  async function openResult(id) {
    const match = state.matches.find((item) => String(item.id) === String(id));
    if (!match) return;
    state.selectedMatch = match;
    $("#home-team").value = match.home_team || "";
    $("#away-team").value = match.away_team || "";
    $("#home-score").value = match.home_score ?? 0;
    $("#away-score").value = match.away_score ?? 0;
    if (match.played_at) {
      const date = new Date(match.played_at);
      const pad = (value) => String(value).padStart(2, "0");
      $("#played-at").value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } else {
      $("#played-at").value = "";
    }
    $("#result-modal").hidden = false;
  }

  async function submitResult(event) {
    event.preventDefault();
    const match = state.selectedMatch;
    if (!match) return;

    try {
      const db = await client();
      const result = await db.rpc("register_ccfv_match", {
        p_competition: "BRASILEIRAO",
        p_stage: match.stage,
        p_round_number: Number(match.round_number) || 1,
        p_home_player_id: match.home_player_id,
        p_away_player_id: match.away_player_id,
        p_home_team: match.home_team,
        p_away_team: match.away_team,
        p_home_score: Math.max(0, Number($("#home-score").value || 0)),
        p_away_score: Math.max(0, Number($("#away-score").value || 0)),
        p_played_at: $("#played-at").value
          ? new Date($("#played-at").value).toISOString()
          : new Date().toISOString()
      });

      if (result.error) throw result.error;
      $("#result-modal").hidden = true;
      const homeChange = Number(result.data?.home_elo_change || 0);
      const awayChange = Number(result.data?.away_elo_change || 0);
      msg(`Resultado registrado. Elo: ${homeChange >= 0 ? "+" : ""}${homeChange} / ${awayChange >= 0 ? "+" : ""}${awayChange}`);
      await load();
    } catch (error) {
      msg(error.message || "Não foi possível registrar o resultado.", true);
    }
  }

  function renderRound() {
    const list = $("#round-list");
    const matches = state.matches.filter((match) => Number(match.round_number) === state.round);
    list.innerHTML = matches.map((match) => `
      <article class="ccfv-match">
        <div>
          <small>RODADA ${String(match.round_number).padStart(2, "0")}</small>
          <strong>${esc(match.home_team)}</strong>
          <small>vs</small>
          <strong>${esc(match.away_team)}</strong>
        </div>
        <div class="score">${done.includes(String(match.status || "")) ? `${match.home_score} × ${match.away_score}` : "—"}</div>
        <div><small>${done.includes(String(match.status || "")) ? "ENCERRADA" : "PENDENTE"}</small></div>
        <button class="ccfv-btn" data-result="${esc(match.id)}">${done.includes(String(match.status || "")) ? "EDITAR" : "RESULTADO"}</button>
      </article>
    `).join("") || '<div class="ccfv-empty">Nenhuma partida encontrada para esta rodada.</div>';

    $("#stat-matches").textContent = String(state.matches.length).padStart(3, "0");
    const finished = state.matches.filter((match) => done.includes(String(match.status || ""))).length;
    $("#stat-finished").textContent = String(finished).padStart(3, "0");
    $("#stat-round").textContent = String(state.round).padStart(2, "0");
  }

  function renderStandings() {
    const body = $("#standings");
    body.innerHTML = state.standings.map((team) => `
      <tr>
        <td>${String(team.position || 0).padStart(2, "0")}</td>
        <td><strong>${esc(team.team_name)}</strong></td>
        <td>${team.played || 0}</td>
        <td>${team.wins || 0}</td>
        <td>${team.draws || 0}</td>
        <td>${team.losses || 0}</td>
        <td>${team.goals_for || 0}</td>
        <td>${team.goals_against || 0}</td>
        <td>${team.goal_difference > 0 ? "+" : ""}${team.goal_difference || 0}</td>
        <td><strong>${team.points || 0}</strong></td>
      </tr>
    `).join("") || '<tr><td colspan="10">Classificação aguardando resultados.</td></tr>';
  }

  function renderAll() {
    renderRegistrations();
    renderRound();
    renderStandings();
    $("#admin-user").textContent = "Sessão autenticada";
  }

  function bind() {
    $("#registration-list").addEventListener("click", (event) => {
      const saveButton = event.target.closest("[data-save]");
      if (saveButton) {
        saveRegistration(saveButton.dataset.save);
        return;
      }
      const removeButton = event.target.closest("[data-remove]");
      if (removeButton) removeRegistration(removeButton.dataset.remove);
    });

    $("#generate").addEventListener("click", generate);
    $("#load-round").addEventListener("click", async () => {
      try {
        await load();
        msg("Partidas atualizadas.");
      } catch (error) {
        msg(error.message || "Não foi possível atualizar as partidas.", true);
      }
    });
    $("#show-round").addEventListener("click", async () => {
      state.round = Math.max(1, Math.min(38, Number($("#round").value) || 1));
      await loadStandings();
      renderRound();
      renderStandings();
    });
    $("#round").addEventListener("change", async () => {
      state.round = Math.max(1, Math.min(38, Number($("#round").value) || 1));
      await loadStandings();
      renderRound();
      renderStandings();
    });
    $("#round-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-result]");
      if (button) openResult(button.dataset.result);
    });
    $("#refresh").addEventListener("click", async () => {
      try {
        await load();
        msg("Painel atualizado.");
      } catch (error) {
        msg(error.message || "Não foi possível atualizar o painel.", true);
      }
    });
    $("#close-result").addEventListener("click", () => { $("#result-modal").hidden = true; });
    $("#result-form").addEventListener("submit", submitResult);
  }

  async function init() {
    try {
      await client();
      bind();
      await load();
    } catch (error) {
      console.error("CCFV // BRASILEIRÃO INIT ERROR:", error);
      msg(error.message || "Falha ao carregar painel do Brasileirão.", true);
    }
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
