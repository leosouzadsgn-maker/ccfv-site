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
        standings: []
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

    async function getClient() {
        if (state.client) {
            return state.client;
        }

        state.client =
            await window.CCFVAuth.getClient();

        return state.client;
    }

    function teamLogo(team) {
        if (team?.logo_path) {
            return `
                <img
                    class="ccfv-wc-team-logo"
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
            <span class="ccfv-wc-team-logo ccfv-wc-team-logo--initials">
                ${esc(initials || "CC")}
            </span>
        `;
    }

    function playerMarkup(row) {
        if (!row?.participant_name) {
            return "Treinador a definir";
        }

        return `
            ${row.participant_photo_url ? `
                <img
                    class="ccfv-wc-group-player-photo"
                    src="${esc(row.participant_photo_url)}"
                    alt="${esc(row.participant_name)}"
                    loading="lazy"
                >
            ` : ""}
            ${esc(row.participant_name)}
        `;
    }

    function groupRows(groupCode) {
        const rows = state.standings
            .filter(row =>
                String(row.season_id) === String(state.season?.id) &&
                row.group_code === groupCode
            )
            .sort((a, b) =>
                Number(a.position || 99) -
                Number(b.position || 99)
            );

        if (rows.length) {
            return rows;
        }

        return state.teams
            .filter(team =>
                String(team.season_id) === String(state.season?.id) &&
                team.group_code === groupCode
            )
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
                qualified: false,
                season_id: team.season_id,
                group_code: team.group_code
            }));
    }

    function renderStats() {
        const registered = state.teams.filter(
            team => team.participant_id
        ).length;

        const matches = state.matches.filter(match =>
            DONE.has(String(match.status || ""))
        ).length;

        $("#wc-stats").innerHTML = [
            ["SEASON", state.season?.season_label || "SEASON 01"],
            ["SELEÇÕES", "32"],
            ["GRUPOS", "8"],
            ["PARTIDAS", matches],
        ].map(([label, value]) => `
            <div class="ccfv-wc-stat">
                <strong>${esc(value)}</strong>
                <span>${esc(label)}</span>
            </div>
        `).join("");
    }

    function renderTeams() {
        const element = $("#wc-teams");
        if (!element) return;

        element.innerHTML = state.teams.map(team => `
            <article class="ccfv-wc-team-card">
                <div class="ccfv-wc-team-card__top">
                    ${teamLogo(team)}
                    <div>
                        <strong>${esc(team.name)}</strong>
                        <span>${esc(team.confederation || "CONFEDERAÇÃO")} · POTE ${esc(team.pot || "—")}</span>
                    </div>
                </div>
                <div class="ccfv-wc-team-card__player">
                    ${team.participant_photo_url ? `<img src="${esc(team.participant_photo_url)}" alt="${esc(team.participant_name || "Jogador")}" loading="lazy">` : ""}
                    <span>${esc(team.participant_name || "DISPONÍVEL PARA INSCRIÇÃO")}</span>
                </div>
            </article>
        `).join("") || `
            <div class="ccfv-wc-empty">As seleções serão disponibilizadas pelo painel administrativo.</div>
        `;
    }

    function renderGroups() {
        const element = $("#wc-groups");
        if (!element) return;

        element.classList.add(
            "ccfv-champions-groups-grid",
            "ccfv-wc-detailed-groups"
        );

        element.innerHTML = GROUPS.map(group => {
            const rows = groupRows(group);
            const slots = Array.from(
                { length: 4 },
                (_, index) => rows[index] || null
            );

            return `
                <article class="ccfv-champions-group ccfv-wc-public-group">
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
                                    <div class="ccfv-champions-group__club">
                                        ${row.logo_path ? `<img class="ccfv-champions-group__logo" src="${esc(row.logo_path)}" alt="${esc(row.name)}" loading="lazy">` : `<span class="ccfv-champions-group__placeholder-logo">${esc(String(row.name || "CC").slice(0,2).toUpperCase())}</span>`}
                                        <div>
                                            <strong>${esc(row.name || "A DEFINIR")}</strong>
                                            <small>${playerMarkup(row)}</small>
                                        </div>
                                    </div>
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
        const element = $("#wc-matches");
        if (!element) return;

        const matches = state.matches
            .slice()
            .sort((a, b) =>
                Number(a.match_order || 0) -
                Number(b.match_order || 0)
            );

        element.innerHTML = matches.length
            ? matches.map(match => {
                const finished =
                    DONE.has(String(match.status || ""));

                return `
                    <article class="ccfv-wc-match">
                        <div class="ccfv-wc-match__meta">
                            <span>
                                ${esc(PHASE_LABEL[match.stage] || match.stage)}
                                ${match.group_code ? ` · GRUPO ${esc(match.group_code)}` : ""}
                            </span>
                            <strong class="${finished ? "is-finished" : ""}">
                                ${finished ? "ENCERRADA" : "A DEFINIR"}
                            </strong>
                        </div>

                        <div class="ccfv-wc-match__teams">
                            <div>
                                ${teamLogo({
                                    name: match.home_name,
                                    logo_path: match.home_logo_path
                                })}
                                <span>
                                    <strong>${esc(match.home_name)}</strong>
                                    <small>${esc(match.home_player_name || "Treinador a definir")}</small>
                                </span>
                            </div>

                            <b>
                                ${finished
                                    ? `${esc(match.home_score ?? 0)} × ${esc(match.away_score ?? 0)}`
                                    : "— × —"}
                            </b>

                            <div>
                                <span>
                                    <strong>${esc(match.away_name)}</strong>
                                    <small>${esc(match.away_player_name || "Treinador a definir")}</small>
                                </span>
                                ${teamLogo({
                                    name: match.away_name,
                                    logo_path: match.away_logo_path
                                })}
                            </div>
                        </div>

                        ${finished && match.home_penalties != null ? `
                            <footer>
                                PÊNALTIS ${esc(match.home_penalties)} × ${esc(match.away_penalties)}
                            </footer>
                        ` : ""}
                    </article>
                `;
            }).join("")
            : `<div class="ccfv-wc-empty">Nenhuma partida registrada ainda.</div>`;
    }

    function renderKnockout() {
        const element = $("#wc-knockout");
        if (!element) return;

        const stages = [
            "ROUND_OF_16",
            "QUARTERFINALS",
            "SEMIFINALS",
            "FINAL"
        ];

        const matches = state.matches
            .filter(match => stages.includes(match.stage));

        if (!matches.length) {
            element.innerHTML = `<div class="ccfv-wc-empty">O mata-mata aparecerá depois da classificação da fase de grupos.</div>`;
            return;
        }

        const order = {
            ROUND_OF_16: 1,
            QUARTERFINALS: 2,
            SEMIFINALS: 3,
            FINAL: 4
        };

        element.innerHTML = stages.map(stage => {
            const phaseMatches = matches
                .filter(match => match.stage === stage)
                .sort((a, b) =>
                    Number(a.match_order || 0) -
                    Number(b.match_order || 0)
                );

            if (!phaseMatches.length) {
                return `
                    <section class="ccfv-wc-knockout-phase">
                        <header>
                            <span>CCFV // ${order[stage]}</span>
                            <strong>${PHASE_LABEL[stage]}</strong>
                        </header>
                        <div class="ccfv-wc-empty">Aguardando definição.</div>
                    </section>
                `;
            }

            return `
                <section class="ccfv-wc-knockout-phase">
                    <header>
                        <span>CCFV // ${esc(stage)}</span>
                        <strong>${esc(PHASE_LABEL[stage])}</strong>
                    </header>
                    <div class="ccfv-wc-knockout-grid">
                        ${phaseMatches.map(match => {
                            const finished = DONE.has(String(match.status || ""));
                            return `
                                <article class="ccfv-wc-knockout-match">
                                    <small>${esc(match.tie_code || "CONFRONTO")}</small>
                                    <div>
                                        <span>${esc(match.home_name)}</span>
                                        <b>${finished ? esc(match.home_score ?? 0) : "—"}</b>
                                    </div>
                                    <div>
                                        <span>${esc(match.away_name)}</span>
                                        <b>${finished ? esc(match.away_score ?? 0) : "—"}</b>
                                    </div>
                                    ${finished && match.home_penalties != null ? `<footer>PÊNALTIS ${esc(match.home_penalties)} × ${esc(match.away_penalties)}</footer>` : ""}
                                </article>
                            `;
                        }).join("")}
                    </div>
                </section>
            `;
        }).join("");
    }

    function renderChampion() {
        const element = $("#wc-champion");
        if (!element) return;

        const champion = state.teams.find(
            team => team.status === "CHAMPION"
        );

        if (!champion) {
            element.innerHTML = `
                <div class="ccfv-wc-champion-card">
                    <span>CCFV // HALL DA FAMA</span>
                    <h2>A DEFINIR.</h2>
                    <p>A grande taça ainda está em disputa.</p>
                </div>
            `;
            return;
        }

        element.innerHTML = `
            <div class="ccfv-wc-champion-card is-confirmed">
                <span>🏆 CAMPEÃO DO MUNDO CCFV</span>
                ${champion.participant_photo_url ? `<img src="${esc(champion.participant_photo_url)}" alt="${esc(champion.participant_name || champion.name)}" loading="lazy">` : teamLogo(champion)}
                <h2>${esc(champion.participant_name || champion.name)}</h2>
                <p>${esc(champion.name)} · ${esc(state.season?.season_label || "SEASON")}</p>
            </div>
        `;
    }

    function render() {
        renderStats();
        renderTeams();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderChampion();
    }

    async function load() {
        const supabase = await getClient();

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

        state.season =
            seasonResult.data || null;

        if (!state.season) {
            state.teams = [];
            state.matches = [];
            state.standings = [];
            render();
            return;
        }

        const [teamResult, matchResult, standingsResult] =
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

        if (teamResult.error) {
            console.warn("CCFV // WORLD CUP TEAMS:", teamResult.error);
        }

        if (matchResult.error) {
            console.warn("CCFV // WORLD CUP MATCHES:", matchResult.error);
        }

        state.teams =
            teamResult.error
                ? []
                : teamResult.data || [];

        state.matches =
            matchResult.error
                ? []
                : matchResult.data || [];

        state.standings =
            standingsResult.error
                ? []
                : standingsResult.data || [];

        render();
    }

    function boot() {
        load().catch(error => {
            console.error(
                "CCFV // WORLD CUP PUBLIC:",
                error
            );

            $("#wc-groups").innerHTML = `
                <div class="ccfv-wc-empty">
                    Não foi possível carregar os dados da Copa do Mundo.
                </div>
            `;
        });

        window.setInterval(() => {
            if (document.visibilityState === "visible") {
                load().catch(error =>
                    console.warn(
                        "CCFV // WORLD CUP LIVE:",
                        error
                    )
                );
            }
        }, 15000);
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            boot,
            { once: true }
        );
    } else {
        boot();
    }
})();
