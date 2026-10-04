(() => {
    "use strict";

    const state = {
        client: null,
        season: null,
        teams: [],
        matches: [],
        standings: [],
        stage: "GROUP_STAGE",
        players: [],
        selectedMatch: null
    };

    const done = ["VALIDATED", "WO", "ADMIN_DECISION"];
    const $ = selector => document.querySelector(selector);
    const esc = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const phaseLabels = {
        REGISTRATIONS: "INSCRIÇÕES",
        DRAW: "SORTEIO",
        GROUP_STAGE: "FASE DE GRUPOS",
        ROUND_OF_16: "OITAVAS",
        QUARTERFINALS: "QUARTAS",
        SEMIFINALS: "SEMIFINAIS",
        FINAL: "FINAL",
        FINISHED: "ENCERRADA"
    };

    function message(text, error = false) {
        const element = $("#message");
        if (!element) return;

        element.hidden = false;
        element.textContent = text;
        element.classList.toggle("error", error);

        clearTimeout(message.timer);
        message.timer = setTimeout(() => {
            element.hidden = true;
        }, 4500);
    }

    async function client() {
        if (state.client) return state.client;
        if (!window.CCFVAuth?.getClient) {
            throw new Error("Autenticação CCFV indisponível.");
        }
        state.client = await window.CCFVAuth.getClient();
        return state.client;
    }

    async function rpc(name, args = {}) {
        const result = await (await client()).rpc(name, args);
        if (result.error) throw result.error;
        return result.data;
    }

    async function load() {
        const c = await client();

        // O Admin não consulta a tabela-base de temporadas.
        // A view pública tem SELECT liberado para authenticated e evita
        // o erro de permission denied que existia no painel.
        const seasonResult = await c
            .from("ccfv_world_cup_public_seasons")
            .select("*")
            .order("season_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (seasonResult.error) throw seasonResult.error;
        state.season = seasonResult.data || null;

        if (!state.season) {
            state.teams = [];
            state.matches = [];
            state.standings = [];
            state.players = [];
            render();
            return;
        }

        const [teams, matches, standings, players] = await Promise.all([
            c.from("ccfv_world_cup_public_teams")
                .select("*")
                .eq("season_id", state.season.id)
                .order("slot"),
            c.from("ccfv_world_cup_public_matches")
                .select("*")
                .eq("season_id", state.season.id)
                .order("match_order"),
            c.from("ccfv_world_cup_public_standings")
                .select("*")
                .eq("season_id", state.season.id)
                .order("group_code")
                .order("position"),
            c.from("players")
                .select("id,name,platform,elo,status,team_name,photo_url")
                .eq("status", "ACTIVE")
                .order("name")
        ]);

        const firstError = [teams, matches, standings, players].find(item => item.error);
        if (firstError) throw firstError.error;

        state.teams = teams.data || [];
        state.matches = matches.data || [];
        state.standings = standings.data || [];
        state.players = players.data || [];

        render();
    }

    function render() {
        const registered = state.teams.filter(team => team.participant_id).length;
        const finishedMatches = state.matches.filter(match => done.includes(String(match.status || ""))).length;

        $("#stat-season").textContent = String(state.season?.season_number || 1).padStart(2, "0");
        $("#stat-registered").textContent = `${registered}/32`;
        $("#stat-phase").textContent = phaseLabels[state.season?.phase] || state.season?.phase || "—";
        $("#stat-matches").textContent = String(state.matches.length).padStart(3, "0");

        renderTeams();
        renderGroups();
        renderMatches();
        renderChampion();
    }

    function renderTeams() {
        const list = $("#team-list");
        if (!list) return;

        const used = new Set(
            state.teams
                .filter(team => team.participant_id)
                .map(team => String(team.participant_id))
        );

        list.innerHTML = state.teams.map(team => {
            const options = [
                '<option value="">A DEFINIR</option>',
                ...state.players.map(player => {
                    const alreadyUsed =
                        used.has(String(player.id)) &&
                        String(player.id) !== String(team.participant_id || "");

                    const selected =
                        String(player.id) === String(team.participant_id || "");

                    return `<option value="${esc(player.id)}" ${selected ? "selected" : ""} ${alreadyUsed ? "disabled" : ""}>${esc(player.name)}${alreadyUsed ? " — JÁ INSCRITO" : ""}</option>`;
                })
            ].join("");

            return `
                <div class="ccfv-row">
                    <span class="slot">${String(team.slot).padStart(2, "0")}</span>
                    <div>
                        <strong>${esc(team.name)}</strong>
                        <small>${esc(team.confederation)} · POTE ${team.pot}${team.participant_name ? ` · ${esc(team.participant_name)}` : ""}</small>
                    </div>
                    <select data-team="${esc(team.id)}">${options}</select>
                    <div class="actions">
                        <button class="ccfv-btn" type="button" data-save="${esc(team.id)}">${team.participant_id ? "ATUALIZAR" : "INSCREVER"}</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    async function saveParticipant(teamId) {
        const select = document.querySelector(`select[data-team="${CSS.escape(teamId)}"]`);
        const playerId = select?.value || "";

        if (!playerId) {
            message("Selecione um jogador.", true);
            return;
        }

        try {
            await rpc("ccfv_world_cup_register_participant", {
                p_season_id: state.season.id,
                p_team_id: teamId,
                p_player_id: playerId
            });

            message("Participante vinculado à seleção.");
            await load();
        } catch (error) {
            console.error(error);
            message(error.message || "Não foi possível vincular o participante.", true);
        }
    }

    function renderGroups() {
        const container = $("#groups");
        if (!container) return;

        const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];

        container.innerHTML = groups.map(group => {
            const rows = state.standings.filter(row => row.group_code === group);

            return `
                <article class="ccfv-card" style="margin-bottom:10px;padding:14px">
                    <header>
                        <div><span>GRUPO ${group}</span><h3>${rows.length ? `${rows.length} SELEÇÕES` : "AGUARDANDO"}</h3></div>
                        <span class="ccfv-chip">2 AVANÇAM</span>
                    </header>
                    ${rows.map(row => `
                        <div class="ccfv-row" style="grid-template-columns:35px 1fr 80px">
                            <span class="slot">${String(row.position).padStart(2, "0")}</span>
                            <div>
                                <strong>${esc(row.name)}</strong>
                                <small>${row.participant_name ? `JOGADOR: ${esc(row.participant_name)}` : "A DEFINIR"}</small>
                            </div>
                            <strong>${Number(row.points || 0)} PTS</strong>
                        </div>
                    `).join("") || '<div class="ccfv-empty">Sorteio ainda não realizado.</div>'}
                </article>
            `;
        }).join("");
    }

    function currentMatches() {
        return state.matches.filter(match => match.stage === state.stage);
    }

    function renderMatches() {
        const container = $("#matches");
        if (!container) return;

        const matches = currentMatches();

        container.innerHTML = matches.map(match => {
            const finished = done.includes(String(match.status || ""));

            return `
                <article class="ccfv-match">
                    <div>
                        <small>${esc(phaseLabels[match.stage] || match.stage)}${match.group_code ? ` · GRUPO ${esc(match.group_code)}` : ""}</small>
                    </div>
                    <div>
                        <strong>${esc(match.home_name)}</strong>
                        ×
                        <strong>${esc(match.away_name)}</strong>
                    </div>
                    <div class="score">${finished ? `${Number(match.home_score ?? 0)} × ${Number(match.away_score ?? 0)}` : "—"}</div>
                    <div>
                        <button class="ccfv-btn" type="button" data-result="${esc(match.id)}">${finished ? "EDITAR" : "RESULTADO"}</button>
                    </div>
                </article>
            `;
        }).join("") || '<div class="ccfv-empty">Nenhuma partida nesta fase.</div>';
    }

    function renderChampion() {
        const container = $("#champion");
        if (!container) return;

        const champion = state.teams.find(team => team.status === "CHAMPION");

        if (!champion) {
            container.className = "ccfv-empty";
            container.textContent = "A DEFINIR";
            return;
        }

        container.className = "ccfv-chip";
        container.innerHTML = `
            <span>CAMPEÃO DO MUNDO</span>
            <strong style="margin-left:8px">${esc(champion.name)}</strong>
            <span style="margin-left:8px">${esc(champion.participant_name || "")}</span>
        `;
    }

    function openResult(matchId) {
        const match = state.matches.find(item => String(item.id) === String(matchId));
        if (!match) return;

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
        $("#result-modal").hidden = true;
        state.selectedMatch = null;
    }

    async function submitResult(event) {
        event.preventDefault();
        const match = state.selectedMatch;
        if (!match) return;

        try {
            await rpc("ccfv_world_cup_set_result", {
                p_match_id: match.id,
                p_home_score: Number($("#home-score").value || 0),
                p_away_score: Number($("#away-score").value || 0),
                p_home_penalties: $("#home-pen").value === "" ? null : Number($("#home-pen").value),
                p_away_penalties: $("#away-pen").value === "" ? null : Number($("#away-pen").value),
                p_notes: $("#notes").value.trim() || null
            });

            closeResult();
            message("RESULTADO VALIDADO.");

            await load();
            await autoAdvance();
        } catch (error) {
            console.error(error);
            message(error.message || "Não foi possível validar o resultado.", true);
        }
    }

    async function autoAdvance() {
        if (!state.season) return;

        const phase = state.season.phase;
        const matches = state.matches.filter(match => match.stage === phase);
        if (!matches.length || !matches.every(match => done.includes(String(match.status || "")))) {
            return;
        }

        try {
            if (phase === "GROUP_STAGE") {
                await rpc("ccfv_world_cup_generate_round_of_16", { p_season_id: state.season.id });
                state.stage = "ROUND_OF_16";
                message("FASE DE GRUPOS ENCERRADA — OITAVAS GERADAS.");
            } else if (["ROUND_OF_16", "QUARTERFINALS", "SEMIFINALS"].includes(phase)) {
                await rpc("ccfv_world_cup_generate_next_phase", {
                    p_season_id: state.season.id,
                    p_stage: phase
                });
                state.stage = phase === "ROUND_OF_16" ? "QUARTERFINALS" : phase === "QUARTERFINALS" ? "SEMIFINALS" : "FINAL";
                message("PRÓXIMA FASE GERADA AUTOMATICAMENTE.");
            } else if (phase === "FINAL") {
                await rpc("ccfv_world_cup_finish_season", { p_season_id: state.season.id });
                message("FINAL ENCERRADA — CAMPEÃO REGISTRADO E PRÓXIMA TEMPORADA CRIADA.");
            }

            await load();
        } catch (error) {
            // A auto-progressão é auxiliar. Se o Admin precisar resolver
            // algo manualmente, o botão correspondente continua disponível.
            console.warn("CCFV // WORLD CUP AUTO ADVANCE:", error);
        }
    }

    async function drawGroups() {
        try {
            await rpc("ccfv_world_cup_draw_groups", { p_season_id: state.season.id });
            message("SORTEIO CONCLUÍDO.");
            await load();
        } catch (error) {
            message(error.message || "Não foi possível realizar o sorteio.", true);
        }
    }

    async function generateGroupMatches() {
        try {
            const count = await rpc("ccfv_world_cup_generate_group_matches", { p_season_id: state.season.id });
            message(`${count || 48} PARTIDAS DE GRUPOS GERADAS.`);
            await load();
        } catch (error) {
            message(error.message || "Não foi possível gerar as partidas.", true);
        }
    }

    async function generateR16() {
        try {
            const count = await rpc("ccfv_world_cup_generate_round_of_16", { p_season_id: state.season.id });
            state.stage = "ROUND_OF_16";
            message(`${count || 8} OITAVAS GERADAS.`);
            await load();
        } catch (error) {
            message(error.message || "Não foi possível gerar as oitavas.", true);
        }
    }

    async function generateNextPhase() {
        const phase = state.season?.phase;
        if (!["ROUND_OF_16", "QUARTERFINALS", "SEMIFINALS"].includes(phase)) {
            message("A próxima fase ainda não está disponível.", true);
            return;
        }

        try {
            await rpc("ccfv_world_cup_generate_next_phase", {
                p_season_id: state.season.id,
                p_stage: phase
            });
            await load();
            message("PRÓXIMA FASE GERADA.");
        } catch (error) {
            message(error.message || "Não foi possível gerar a próxima fase.", true);
        }
    }

    async function finishSeason() {
        if (!window.confirm("Finalizar a Copa do Mundo e registrar o campeão?")) return;

        try {
            await rpc("ccfv_world_cup_finish_season", { p_season_id: state.season.id });
            await load();
            message("TEMPORADA FINALIZADA E PRÓXIMA TEMPORADA CRIADA.");
        } catch (error) {
            message(error.message || "Não foi possível finalizar a temporada.", true);
        }
    }

    function bind() {
        $("#team-list")?.addEventListener("click", event => {
            const button = event.target.closest("[data-save]");
            if (button) saveParticipant(button.dataset.save);
        });

        $("#draw")?.addEventListener("click", drawGroups);
        $("#generate")?.addEventListener("click", generateGroupMatches);
        $("#generate-r16")?.addEventListener("click", generateR16);
        $("#next-phase")?.addEventListener("click", generateNextPhase);
        $("#finish")?.addEventListener("click", finishSeason);
        $("#refresh")?.addEventListener("click", load);
        $("#load-matches")?.addEventListener("click", renderMatches);
        $("#close-result")?.addEventListener("click", closeResult);
        $("#result-form")?.addEventListener("submit", submitResult);

        $("#stage-filter")?.addEventListener("change", event => {
            state.stage = event.target.value;
            renderMatches();
        });

        $("#matches")?.addEventListener("click", event => {
            const button = event.target.closest("[data-result]");
            if (button) openResult(button.dataset.result);
        });
    }

    async function init() {
        bind();

        try {
            await load();
        } catch (error) {
            console.error("CCFV // WORLD CUP ADMIN:", error);
            message(error.message || "Falha ao iniciar a Copa do Mundo.", true);
        }

        // Mantém o painel sincronizado sem exigir reload manual.
        window.setInterval(() => {
            load().catch(error => console.warn("CCFV // World Cup refresh:", error));
        }, 10000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
