(() => {
    "use strict";

    const DONE = new Set([
        "VALIDATED",
        "WO",
        "ADMIN_DECISION"
    ]);

    const PHASE_LABEL = {
        REGISTRATIONS: "INSCRIÇÕES",
        DRAW: "SORTEIO",
        GROUP_STAGE: "FASE DE GRUPOS",
        ROUND_OF_16: "OITAVAS",
        QUARTERFINALS: "QUARTAS",
        SEMIFINALS: "SEMIFINAIS",
        FINAL: "FINAL",
        FINISHED: "ENCERRADA"
    };

    const GROUPS = [
        "A", "B", "C", "D",
        "E", "F", "G", "H"
    ];

    const state = {
        client: null,
        season: null,
        teams: [],
        matches: [],
        standings: [],
        players: [],
        selectedMatch: null,
        stage: "GROUP_STAGE",
        autoAdvancing: false
    };

    const $ = selector =>
        document.querySelector(selector);

    const esc = value =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    function message(text, error = false) {
        const element = $("#message");

        if (!element) {
            return;
        }

        element.hidden = false;
        element.textContent = text;
        element.classList.toggle("error", error);

        window.clearTimeout(message.timer);
        message.timer = window.setTimeout(() => {
            element.hidden = true;
        }, 4500);
    }

    async function client() {
        if (state.client) {
            return state.client;
        }

        state.client =
            await window.CCFVAuth.getClient();

        return state.client;
    }

    async function rpc(name, args = {}) {
        const supabase = await client();
        const result = await supabase.rpc(name, args);

        if (result.error) {
            throw result.error;
        }

        return result.data;
    }

    function currentPhase() {
        return String(
            state.season?.phase ||
            "REGISTRATIONS"
        ).toUpperCase();
    }

    function currentMatches() {
        if (!state.season) {
            return [];
        }

        return state.matches.filter(match =>
            String(match.season_id) ===
            String(state.season.id)
        );
    }

    function currentTeams() {
        if (!state.season) {
            return [];
        }

        return state.teams.filter(team =>
            String(team.season_id) ===
            String(state.season.id)
        );
    }

    function logoMarkup(team) {
        if (team?.logo_path) {
            return `
                <img
                    class="ccfv-wc-admin-logo"
                    src="${esc(team.logo_path)}"
                    alt="${esc(team.name)}"
                    loading="lazy"
                >
            `;
        }

        const initials =
            String(team?.name || "CC")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(word => word[0])
                .join("")
                .toUpperCase();

        return `
            <span class="ccfv-wc-admin-logo ccfv-wc-admin-logo--initials">
                ${esc(initials || "CC")}
            </span>
        `;
    }

    async function load() {
        const supabase = await client();

        const seasonResult =
            await supabase
                .from("ccfv_world_cup_public_seasons")
                .select("*")
                .order("season_number", { ascending: false })
                .limit(1)
                .maybeSingle();

        if (seasonResult.error) {
            throw seasonResult.error;
        }

        state.season = seasonResult.data || null;

        if (!state.season) {
            state.teams = [];
            state.matches = [];
            state.players = [];
            state.standings = [];
            render();
            return;
        }

        const [teamsResult, matchesResult, playersResult] =
            await Promise.all([
                supabase
                    .from("ccfv_world_cup_public_teams")
                    .select("*")
                    .eq("season_id", state.season.id)
                    .order("slot"),

                supabase
                    .from("ccfv_world_cup_public_matches")
                    .select("*")
                    .eq("season_id", state.season.id)
                    .order("match_order"),

                supabase
                    .from("players")
                    .select("id,name,platform,photo_url")
                    .eq("status", "ACTIVE")
                    .order("name")
            ]);

        const firstError = [
            teamsResult,
            matchesResult,
            playersResult
        ].find(result => result.error);

        if (firstError) {
            throw firstError.error;
        }

        state.teams = teamsResult.data || [];
        state.matches = matchesResult.data || [];
        state.players = playersResult.data || [];

        const standingsResult =
            await supabase
                .from("ccfv_world_cup_public_standings")
                .select("*")
                .eq("season_id", state.season.id)
                .order("group_code")
                .order("position");

        state.standings = standingsResult.error
            ? []
            : standingsResult.data || [];

        state.stage =
            currentPhase() === "GROUP_STAGE"
                ? "GROUP_STAGE"
                : currentPhase();

        render();
        await autoAdvance();
    }

    function render() {
        renderStats();
        renderTeams();
        renderGroups();
        renderMatches();
        renderChampion();
        updateStageFilter();
    }

    function renderStats() {
        const teams = currentTeams();
        const matches = currentMatches();
        const registered = teams.filter(team =>
            team.participant_id
        ).length;

        $("#stat-season").textContent =
            String(state.season?.season_number || 1)
                .padStart(2, "0");

        $("#stat-registered").textContent =
            `${registered}/32`;

        $("#stat-phase").textContent =
            PHASE_LABEL[currentPhase()] || currentPhase();

        $("#stat-matches").textContent =
            String(matches.length).padStart(3, "0");
    }

    function renderTeams() {
        const list = $("#team-list");

        if (!list) {
            return;
        }

        const teams = currentTeams();
        const occupiedPlayers = new Set(
            teams
                .filter(team => team.participant_id)
                .map(team => String(team.participant_id))
        );

        list.innerHTML = teams.map(team => {
            const currentPlayer =
                String(team.participant_id || "");

            const options = [
                `<option value="">A DEFINIR</option>`
            ];

            state.players.forEach(player => {
                const playerId = String(player.id);
                const usedElsewhere =
                    occupiedPlayers.has(playerId) &&
                    playerId !== currentPlayer;

                options.push(`
                    <option
                        value="${esc(player.id)}"
                        ${playerId === currentPlayer ? "selected" : ""}
                        ${usedElsewhere ? "disabled" : ""}
                    >
                        ${esc(player.name)}${usedElsewhere ? " — JÁ INSCRITO" : ""}
                    </option>
                `);
            });

            const action = team.participant_id
                ? `<button class="ccfv-btn danger" type="button" data-unlink="${esc(team.id)}">DESVINCULAR</button>`
                : `<button class="ccfv-btn" type="button" data-save="${esc(team.id)}">VINCULAR</button>`;

            return `
                <div class="ccfv-wc-admin-team-row">
                    <div class="ccfv-wc-admin-team-main">
                        <span class="ccfv-wc-admin-slot">
                            ${String(team.slot).padStart(2, "0")}
                        </span>
                        ${logoMarkup(team)}
                        <div>
                            <strong>${esc(team.name)}</strong>
                            <small>
                                ${esc(team.confederation || "CONFEDERAÇÃO")} · POTE ${esc(team.pot || "—")}
                            </small>
                            <em>
                                ${team.participant_name ? esc(team.participant_name) : "AGUARDANDO PARTICIPANTE"}
                            </em>
                        </div>
                    </div>
                    <div class="ccfv-wc-admin-team-action">
                        <select data-team-select="${esc(team.id)}">
                            ${options.join("")}
                        </select>
                        ${action}
                    </div>
                </div>
            `;
        }).join("");
    }

    function groupRows(groupCode) {
        const standings = state.standings
            .filter(row =>
                String(row.season_id) === String(state.season?.id) &&
                row.group_code === groupCode
            )
            .sort((a, b) =>
                Number(a.position || 99) -
                Number(b.position || 99)
            );

        if (standings.length) {
            return standings;
        }

        return currentTeams()
            .filter(team => team.group_code === groupCode)
            .sort((a, b) =>
                Number(a.group_position || 99) -
                Number(b.group_position || 99)
            )
            .map((team, index) => ({
                position: team.group_position || index + 1,
                name: team.name,
                slug: team.slug,
                logo_path: team.logo_path,
                participant_name: team.participant_name,
                participant_photo_url: team.participant_photo_url,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goals_for: 0,
                goals_against: 0,
                goal_difference: 0,
                points: 0,
                qualified: false
            }));
    }

    function groupClubMarkup(row) {
        const photo = row.participant_photo_url
            ? `
                <img
                    class="ccfv-wc-group-player-photo"
                    src="${esc(row.participant_photo_url)}"
                    alt="${esc(row.participant_name || "Jogador")}"\n                    loading="lazy"
                >
            `
            : "";

        const initials =
            String(row.name || "CC")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .slice(0, 2)
                .toUpperCase();

        const logo = row.logo_path
            ? `<img class="ccfv-champions-group__logo" src="${esc(row.logo_path)}" alt="${esc(row.name)}" loading="lazy">`
            : `<span class="ccfv-champions-group__placeholder-logo">${esc(initials)}</span>`;

        return `
            <div class="ccfv-champions-group__club">
                ${logo}
                <div>
                    <strong>${esc(row.name || "A DEFINIR")}</strong>
                    <small>${photo}${esc(row.participant_name || "Treinador a definir")}</small>
                </div>
            </div>
        `;
    }

    function renderGroups() {
        const element = $("#groups");

        if (!element) {
            return;
        }

        element.classList.add("ccfv-wc-detailed-groups");

        element.innerHTML = GROUPS.map(group => {
            const rows = groupRows(group);
            const slots = Array.from(
                { length: 4 },
                (_, index) => rows[index] || null
            );

            return `
                <article class="ccfv-champions-group ccfv-wc-admin-group">
                    <header class="ccfv-champions-group__header">
                        <div class="ccfv-champions-group__title">
                            <span>GRUPO</span>
                            <strong>${group}</strong>
                        </div>
                        <div class="ccfv-champions-group__advance">
                            <span>CLASSIFICAÇÃO</span>
                            <strong>TOP 2</strong>
                        </div>
                    </header>

                    <div class="ccfv-champions-group__table-wrap">
                        <div class="ccfv-champions-group__thead">
                            <span>#</span>
                            <span>SELEÇÃO</span>
                            <span>J</span>
                            <span>V</span>
                            <span>E</span>
                            <span>D</span>
                            <span>GP</span>
                            <span>GC</span>
                            <span>SG</span>
                            <span>PTS</span>
                        </div>

                        ${slots.map((row, index) => {
                            if (!row) {
                                return `
                                    <div class="ccfv-champions-group__row">
                                        <span class="group-position">${index + 1}</span>
                                        <div class="ccfv-champions-group__club">
                                            <span class="ccfv-champions-group__placeholder-logo"></span>
                                            <div>
                                                <strong>A DEFINIR</strong>
                                                <small>Aguardando sorteio</small>
                                            </div>
                                        </div>
                                        <span>—</span><span>—</span><span>—</span><span>—</span>
                                        <span>—</span><span>—</span><span>—</span>
                                        <strong class="points">—</strong>
                                    </div>
                                `;
                            }

                            const gd = Number(
                                row.goal_difference ??
                                ((row.goals_for || 0) - (row.goals_against || 0))
                            );

                            return `
                                <div class="ccfv-champions-group__row ${row.qualified ? "is-qualified" : ""}">
                                    <span class="group-position">${esc(row.position ?? index + 1)}</span>
                                    ${groupClubMarkup(row)}
                                    <span>${esc(row.played ?? 0)}</span>
                                    <span>${esc(row.wins ?? 0)}</span>
                                    <span>${esc(row.draws ?? 0)}</span>
                                    <span>${esc(row.losses ?? 0)}</span>
                                    <span>${esc(row.goals_for ?? 0)}</span>
                                    <span>${esc(row.goals_against ?? 0)}</span>
                                    <span class="goal-difference ${gd > 0 ? "positive" : gd < 0 ? "negative" : ""}">${gd > 0 ? "+" : ""}${esc(gd)}</span>
                                    <strong class="points">${esc(row.points ?? 0)}</strong>
                                </div>
                            `;
                        }).join("")}
                    </div>

                    <footer class="ccfv-champions-group__legend">
                        <span><b>J</b> Jogos</span>
                        <span><b>V</b> Vitórias</span>
                        <span><b>E</b> Empates</span>
                        <span><b>D</b> Derrotas</span>
                        <span><b>GP</b> Gols pró</span>
                        <span><b>GC</b> Gols contra</span>
                        <span><b>SG</b> Saldo</span>
                        <span><b>PTS</b> Pontos</span>
                    </footer>
                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        const element = $("#matches");

        if (!element) {
            return;
        }

        const current =
            state.matches.filter(match =>
                String(match.season_id) === String(state.season?.id) &&
                match.stage === state.stage
            );

        element.innerHTML =
            current.length
                ? current.map(match => {
                    const finished =
                        DONE.has(String(match.status || ""));

                    return `
                        <article class="ccfv-wc-admin-match">
                            <div class="ccfv-wc-admin-match__meta">
                                <small>
                                    ${esc(PHASE_LABEL[match.stage] || match.stage)}
                                    ${match.group_code ? ` · GRUPO ${esc(match.group_code)}` : ""}
                                </small>
                                <span class="${finished ? "is-finished" : ""}">
                                    ${finished ? "ENCERRADA" : "PENDENTE"}
                                </span>
                            </div>

                            <div class="ccfv-wc-admin-match__teams">
                                <div>
                                    <strong>${esc(match.home_name)}</strong>
                                    <small>${esc(match.home_player_name || "Treinador a definir")}</small>
                                </div>
                                <b>${finished ? `${esc(match.home_score ?? 0)} × ${esc(match.away_score ?? 0)}` : "— × —"}</b>
                                <div>
                                    <strong>${esc(match.away_name)}</strong>
                                    <small>${esc(match.away_player_name || "Treinador a definir")}</small>
                                </div>
                            </div>

                            <button
                                type="button"
                                class="ccfv-btn"
                                data-result="${esc(match.id)}"
                            >
                                ${finished ? "EDITAR RESULTADO" : "LANÇAR RESULTADO"}
                            </button>
                        </article>
                    `;
                }).join("")
                : `<div class="ccfv-empty">Nenhuma partida nesta fase.</div>`;
    }

    function renderChampion() {
        const element = $("#champion");

        if (!element) {
            return;
        }

        const champion = currentTeams().find(
            team => team.status === "CHAMPION"
        );

        if (!champion) {
            element.className = "ccfv-empty";
            element.textContent = "A DEFINIR";
            return;
        }

        element.className = "ccfv-wc-admin-champion";
        element.innerHTML = `
            ${champion.participant_photo_url ? `<img src="${esc(champion.participant_photo_url)}" alt="${esc(champion.participant_name || champion.name)}">` : ""}
            <div>
                <span class="ccfv-chip">CAMPEÃO DO MUNDO CCFV</span>
                <h3>${esc(champion.participant_name || champion.name)}</h3>
                <p>${esc(champion.name)} · ${esc(state.season?.season_label || "SEASON")}</p>
            </div>
        `;
    }

    function updateStageFilter() {
        const filter = $("#stage-filter");

        if (!filter) {
            return;
        }

        const allowed = new Set([
            "GROUP_STAGE",
            "ROUND_OF_16",
            "QUARTERFINALS",
            "SEMIFINALS",
            "FINAL"
        ]);

        filter.value =
            allowed.has(state.stage)
                ? state.stage
                : "GROUP_STAGE";
    }

    async function saveParticipant(teamId) {
        const select =
            document.querySelector(
                `select[data-team-select="${CSS.escape(teamId)}"]`
            );

        const playerId =
            select?.value || "";

        if (!playerId) {
            message("SELECIONE UM JOGADOR.", true);
            return;
        }

        try {
            await rpc(
                "ccfv_world_cup_register_participant",
                {
                    p_season_id: state.season.id,
                    p_team_id: teamId,
                    p_player_id: playerId
                }
            );

            message("PARTICIPANTE VINCULADO À SELEÇÃO.");
            await load();
        } catch (error) {
            console.error(
                "CCFV // WORLD CUP REGISTER:",
                error
            );
            message(
                error?.message ||
                "NÃO FOI POSSÍVEL VINCULAR O PARTICIPANTE.",
                true
            );
        }
    }

    async function unlinkParticipant(teamId) {
        if (!window.confirm("Desvincular este participante da seleção?")) {
            return;
        }

        try {
            await rpc(
                "ccfv_world_cup_unregister_participant",
                {
                    p_season_id: state.season.id,
                    p_team_id: teamId
                }
            );

            message("PARTICIPANTE DESVINCULADO.");
            await load();
        } catch (error) {
            console.error(
                "CCFV // WORLD CUP UNREGISTER:",
                error
            );
            message(
                error?.message ||
                "NÃO FOI POSSÍVEL DESVINCULAR.",
                true
            );
        }
    }

    async function drawGroups() {
        try {
            await rpc(
                "ccfv_world_cup_draw_groups",
                {
                    p_season_id: state.season.id
                }
            );

            await rpc(
                "ccfv_world_cup_generate_group_matches",
                {
                    p_season_id: state.season.id
                }
            );

            state.stage = "GROUP_STAGE";
            message("SORTEIO CONCLUÍDO E 48 PARTIDAS GERADAS.");
            await load();
        } catch (error) {
            console.error("CCFV // WORLD CUP DRAW:", error);
            message(
                error?.message || "NÃO FOI POSSÍVEL GERAR A FASE DE GRUPOS.",
                true
            );
        }
    }

    async function generateGroupMatches() {
        try {
            const total = await rpc(
                "ccfv_world_cup_generate_group_matches",
                {
                    p_season_id: state.season.id
                }
            );

            message(`${total || 48} PARTIDAS DE GRUPOS GERADAS.`);
            await load();
        } catch (error) {
            message(error?.message || "NÃO FOI POSSÍVEL GERAR AS PARTIDAS.", true);
        }
    }

    async function generateRoundOf16() {
        try {
            const total = await rpc(
                "ccfv_world_cup_generate_round_of_16",
                {
                    p_season_id: state.season.id
                }
            );

            state.stage = "ROUND_OF_16";
            message(`${total || 8} OITAVAS GERADAS.`);
            await load();
        } catch (error) {
            message(error?.message || "OITAVAS AINDA NÃO ESTÃO DISPONÍVEIS.", true);
        }
    }

    async function generateNextPhase() {
        const phase = currentPhase();

        if (![
            "ROUND_OF_16",
            "QUARTERFINALS",
            "SEMIFINALS"
        ].includes(phase)) {
            message("A PRÓXIMA FASE AINDA NÃO ESTÁ DISPONÍVEL.", true);
            return;
        }

        try {
            const total = await rpc(
                "ccfv_world_cup_generate_next_phase",
                {
                    p_season_id: state.season.id,
                    p_stage: phase
                }
            );

            message(`${total || 1} CONFRONTO(S) DA PRÓXIMA FASE GERADO(S).`);
            await load();
        } catch (error) {
            message(error?.message || "NÃO FOI POSSÍVEL AVANÇAR DE FASE.", true);
        }
    }

    async function openResult(matchId) {
        const match = state.matches.find(item =>
            String(item.id) === String(matchId)
        );

        if (!match) {
            return;
        }

        state.selectedMatch = match;

        $("#home").value = match.home_name || "";
        $("#away").value = match.away_name || "";
        $("#home-score").value = match.home_score ?? 0;
        $("#away-score").value = match.away_score ?? 0;
        $("#home-pen").value = match.home_penalties ?? "";
        $("#away-pen").value = match.away_penalties ?? "";
        $("#notes").value = match.notes || "";
        $("#result-modal").hidden = false;
    }

    function closeResult() {
        const modal = $("#result-modal");
        if (modal) {
            modal.hidden = true;
        }
        state.selectedMatch = null;
    }

    async function submitResult(event) {
        event.preventDefault();

        const match = state.selectedMatch;

        if (!match) {
            return;
        }

        const homeScore =
            Number($("#home-score").value || 0);

        const awayScore =
            Number($("#away-score").value || 0);

        const homePenalties =
            $("#home-pen").value === ""
                ? null
                : Number($("#home-pen").value);

        const awayPenalties =
            $("#away-pen").value === ""
                ? null
                : Number($("#away-pen").value);

        try {
            await rpc(
                "ccfv_world_cup_set_result",
                {
                    p_match_id: match.id,
                    p_home_score: homeScore,
                    p_away_score: awayScore,
                    p_home_penalties: homePenalties,
                    p_away_penalties: awayPenalties,
                    p_notes: $("#notes").value.trim() || null
                }
            );

            closeResult();
            message("RESULTADO VALIDADO. O SISTEMA VERIFICARÁ A PRÓXIMA FASE AUTOMATICAMENTE.");
            await load();
        } catch (error) {
            console.error(
                "CCFV // WORLD CUP RESULT:",
                error
            );
            message(
                error?.message ||
                "NÃO FOI POSSÍVEL VALIDAR O RESULTADO.",
                true
            );
        }
    }

    async function finishSeason(manual = true) {
        if (
            manual &&
            !window.confirm(
                "Finalizar a Copa do Mundo e registrar o campeão?"
            )
        ) {
            return;
        }

        try {
            await rpc(
                "ccfv_world_cup_finish_season",
                {
                    p_season_id: state.season.id
                }
            );

            message(
                "TEMPORADA FINALIZADA. CAMPEÃO REGISTRADO E PRÓXIMA TEMPORADA CRIADA."
            );

            await load();
        } catch (error) {
            console.error(
                "CCFV // WORLD CUP FINISH:",
                error
            );
            message(
                error?.message ||
                "NÃO FOI POSSÍVEL FINALIZAR A TEMPORADA.",
                true
            );
        }
    }

    async function autoAdvance() {
        if (
            state.autoAdvancing ||
            !state.season
        ) {
            return;
        }

        const phase = currentPhase();

        if (phase === "FINISHED") {
            return;
        }

        const matches = currentMatches()
            .filter(match => match.stage === phase);

        if (!matches.length) {
            return;
        }

        const complete = matches.every(match =>
            DONE.has(String(match.status || ""))
        );

        if (!complete) {
            return;
        }

        state.autoAdvancing = true;

        try {
            if (phase === "GROUP_STAGE") {
                await rpc(
                    "ccfv_world_cup_generate_round_of_16",
                    {
                        p_season_id: state.season.id
                    }
                );
            } else if (
                [
                    "ROUND_OF_16",
                    "QUARTERFINALS",
                    "SEMIFINALS"
                ].includes(phase)
            ) {
                await rpc(
                    "ccfv_world_cup_generate_next_phase",
                    {
                        p_season_id: state.season.id,
                        p_stage: phase
                    }
                );
            } else if (phase === "FINAL") {
                await rpc(
                    "ccfv_world_cup_finish_season",
                    {
                        p_season_id: state.season.id
                    }
                );
            }
        } catch (error) {
            console.warn(
                "CCFV // WORLD CUP AUTO ADVANCE:",
                error
            );
        } finally {
            state.autoAdvancing = false;
        }

        if (phase !== currentPhase()) {
            state.stage = currentPhase();
        }

        // Atualiza a tela sem entrar em loop.
        const phaseNow = currentPhase();
        if (phaseNow !== phase) {
            await loadWithoutAutoAdvance();
        }
    }

    async function loadWithoutAutoAdvance() {
        const supabase = await client();

        const seasonResult = await supabase
            .from("ccfv_world_cup_public_seasons")
            .select("*")
            .order("season_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (seasonResult.error) {
            return;
        }

        state.season = seasonResult.data || null;

        if (!state.season) {
            state.teams = [];
            state.matches = [];
            state.standings = [];
            render();
            return;
        }

        const [teamsResult, matchesResult, standingsResult] =
            await Promise.all([
                supabase
                    .from("ccfv_world_cup_public_teams")
                    .select("*")
                    .eq("season_id", state.season.id)
                    .order("slot"),
                supabase
                    .from("ccfv_world_cup_public_matches")
                    .select("*")
                    .eq("season_id", state.season.id)
                    .order("match_order"),
                supabase
                    .from("ccfv_world_cup_public_standings")
                    .select("*")
                    .eq("season_id", state.season.id)
                    .order("group_code")
                    .order("position")
            ]);

        if (teamsResult.error || matchesResult.error) {
            return;
        }

        state.teams = teamsResult.data || [];
        state.matches = matchesResult.data || [];
        state.standings = standingsResult.error ? [] : (standingsResult.data || []);
        render();
    }

    function bindEvents() {
        $("#team-list")?.addEventListener("click", event => {
            const saveButton = event.target.closest("[data-save]");
            if (saveButton) {
                saveParticipant(saveButton.dataset.save);
                return;
            }

            const unlinkButton = event.target.closest("[data-unlink]");
            if (unlinkButton) {
                unlinkParticipant(unlinkButton.dataset.unlink);
            }
        });

        $("#draw")?.addEventListener(
            "click",
            drawGroups
        );

        $("#generate")?.addEventListener(
            "click",
            generateGroupMatches
        );

        $("#generate-r16")?.addEventListener(
            "click",
            generateRoundOf16
        );

        $("#next-phase")?.addEventListener(
            "click",
            generateNextPhase
        );

        $("#finish")?.addEventListener(
            "click",
            () => finishSeason(true)
        );

        $("#stage-filter")?.addEventListener(
            "change",
            event => {
                state.stage = event.target.value;
                renderMatches();
            }
        );

        $("#load-matches")?.addEventListener(
            "click",
            renderMatches
        );

        $("#matches")?.addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest("[data-result]");

                if (button) {
                    openResult(button.dataset.result);
                }
            }
        );

        $("#close-result")?.addEventListener(
            "click",
            closeResult
        );

        $("#result-form")?.addEventListener(
            "submit",
            submitResult
        );

        $("#refresh")?.addEventListener(
            "click",
            load
        );
    }

    async function init() {
        bindEvents();

        try {
            await load();
        } catch (error) {
            console.error(
                "CCFV // WORLD CUP INIT:",
                error
            );
            message(
                error?.message ||
                "NÃO FOI POSSÍVEL INICIAR A COPA DO MUNDO.",
                true
            );
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }
})();
