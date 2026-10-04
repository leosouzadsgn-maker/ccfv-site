/* =========================================================
   CCFV // LIBERTADORES — PÁGINA PÚBLICA
   ========================================================= */
(() => {
    "use strict";

    const DONE = new Set([
        "VALIDATED",
        "WO",
        "ADMIN_DECISION"
    ]);

    const GROUPS = [
        "A", "B", "C", "D",
        "E", "F", "G", "H"
    ];

    const state = {
        client: null,
        season: null,
        clubs: [],
        matches: [],
        standings: []
    };

    const FALLBACK_CLUBS = [
        ["Flamengo", "flamengo", "Brasil", 1],
        ["Palmeiras", "palmeiras", "Brasil", 1],
        ["Boca Juniors", "boca-juniors", "Argentina", 1],
        ["Peñarol", "penarol", "Uruguai", 1],
        ["Nacional", "nacional", "Uruguai", 1],
        ["LDU Quito", "ldu-quito", "Equador", 1],
        ["Fluminense", "fluminense", "Brasil", 1],
        ["Independiente del Valle", "independiente-del-valle", "Equador", 1],
        ["Lanús", "lanus", "Argentina", 2],
        ["Libertad", "libertad", "Paraguai", 2],
        ["Estudiantes de La Plata", "estudiantes", "Argentina", 2],
        ["Cerro Porteño", "cerro-porteno", "Paraguai", 2],
        ["Corinthians", "corinthians", "Brasil", 2],
        ["Bolívar", "bolivar", "Bolívia", 2],
        ["Cruzeiro", "cruzeiro", "Brasil", 2],
        ["Universitario", "universitario", "Peru", 2],
        ["Junior", "junior", "Colômbia", 3],
        ["Universidad Católica", "universidad-catolica", "Chile", 3],
        ["Rosario Central", "rosario-central", "Argentina", 3],
        ["Santa Fe", "santa-fe", "Colômbia", 3],
        ["Always Ready", "always-ready", "Bolívia", 3],
        ["Coquimbo Unido", "coquimbo-unido", "Chile", 3],
        ["Deportivo La Guaira", "deportivo-la-guaira", "Venezuela", 3],
        ["Cusco", "cusco", "Peru", 3],
        ["Universidad Central", "universidad-central", "Venezuela", 4],
        ["Platense", "platense", "Argentina", 4],
        ["Independiente Rivadavia", "independiente-rivadavia", "Argentina", 4],
        ["Mirassol", "mirassol", "Brasil", 4],
        ["Independiente Medellín", "independiente-medellin", "Colômbia", 4],
        ["Deportes Tolima", "deportes-tolima", "Colômbia", 4],
        ["Sporting Cristal", "sporting-cristal", "Peru", 4],
        ["Barcelona", "barcelona", "Equador", 4]
    ];

    const $ = selector =>
        document.querySelector(selector);

    const esc = value =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    function logoPath(club) {
        return club?.logo_path ||
            `../assets/images/clubs/${club?.slug || ""}.png`;
    }

    function initials(name) {
        return String(name || "CC")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0])
            .join("")
            .toUpperCase() || "CC";
    }

    function logoMarkup(club, className = "ccfv-lib-public-logo") {
        const path = logoPath(club);

        return `
            <img
                class="${esc(className)}"
                src="${esc(path)}"
                alt="${esc(club?.name || "Clube")}"
                loading="lazy"
                onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ccfv-lib-public-logo ccfv-lib-public-logo--initials',textContent:'${esc(initials(club?.name))}'}))"
            >
        `;
    }

    async function client() {
        if (state.client) {
            return state.client;
        }

        state.client =
            await window.CCFVAuth.getClient();

        return state.client;
    }

    function fallbackRows() {
        return FALLBACK_CLUBS.map((club, index) => ({
            slot: index + 1,
            name: club[0],
            slug: club[1],
            country: club[2],
            pot: club[3],
            logo_path: null,
            participant_id: null,
            participant_name: null,
            participant_photo_url: null,
            group_code: null,
            group_position: null,
            status: "AVAILABLE"
        }));
    }

    function visibleClubs() {
        return state.clubs.length
            ? state.clubs
            : fallbackRows();
    }

    async function load() {
        const supabase = await client();

        const seasonResult =
            await supabase
                .from("ccfv_libertadores_public_seasons")
                .select("*")
                .order("season_number", { ascending: false })
                .limit(1)
                .maybeSingle();

        if (seasonResult.error) {
            console.warn(
                "CCFV // LIBERTADORES SEASON:",
                seasonResult.error
            );
            state.season = null;
        } else {
            state.season = seasonResult.data || null;
        }

        if (state.season) {
            const [clubsResult, matchesResult, standingsResult] =
                await Promise.all([
                    supabase
                        .from("ccfv_libertadores_public_clubs")
                        .select("*")
                        .eq("season_id", state.season.id)
                        .order("slot"),
                    supabase
                        .from("ccfv_libertadores_public_matches")
                        .select("*")
                        .eq("season_id", state.season.id)
                        .order("match_order"),
                    supabase
                        .from("ccfv_libertadores_public_standings")
                        .select("*")
                        .eq("season_id", state.season.id)
                        .order("group_code")
                        .order("position")
                ]);

            state.clubs = clubsResult.error
                ? []
                : clubsResult.data || [];

            state.matches = matchesResult.error
                ? []
                : matchesResult.data || [];

            state.standings = standingsResult.error
                ? []
                : standingsResult.data || [];
        } else {
            state.clubs = [];
            state.matches = [];
            state.standings = [];
        }

        render();
    }

    function render() {
        const clubs = visibleClubs();
        const finishedMatches =
            state.matches.filter(match =>
                DONE.has(String(match.status || ""))
            ).length;

        $("#lib-stats").innerHTML = [
            ["SEASON", state.season?.season_label || "SEASON 01"],
            ["CLUBES", "32"],
            ["GRUPOS", "8"],
            ["PARTIDAS", `${finishedMatches}/125`]
        ].map(([label, value]) => `
            <div class="ccfv-lib-stat">
                <strong>${esc(value)}</strong>
                <span>${esc(label)}</span>
            </div>
        `).join("");

        renderClubs(clubs);
        renderGroups(clubs);
        renderMatches();
        renderKnockout();
        renderChampion(clubs);
    }

    function renderClubs(clubs) {
        const element = $("#public-clubs");
        if (!element) return;

        element.innerHTML = clubs.map(club => `
            <article class="ccfv-lib-club">
                ${logoMarkup(club, "ccfv-lib-club__logo")}
                <div class="ccfv-lib-club__copy">
                    <strong>${esc(club.name)}</strong>
                    <small>
                        ${esc(club.country || "AMÉRICA DO SUL")} · POTE ${esc(club.pot || "—")}
                    </small>
                </div>
                <div class="ccfv-lib-club__player">
                    ${club.participant_photo_url ? `
                        <img
                            src="${esc(club.participant_photo_url)}"
                            alt="${esc(club.participant_name || "Jogador")}"
                            loading="lazy"
                        >
                    ` : ""}
                    <span>
                        ${esc(club.participant_name || "DISPONÍVEL PARA INSCRIÇÃO")}
                    </span>
                </div>
            </article>
        `).join("");
    }

    function groupRows(group) {
        const rows = state.standings
            .filter(row =>
                String(row.season_id) === String(state.season?.id) &&
                row.group_code === group
            )
            .sort((a, b) =>
                Number(a.position || 99) - Number(b.position || 99)
            );

        if (rows.length) {
            return rows;
        }

        return visibleClubs()
            .filter(club => club.group_code === group)
            .sort((a, b) =>
                Number(a.group_position || 99) - Number(b.group_position || 99)
            )
            .map((club, index) => ({
                position: club.group_position || index + 1,
                name: club.name,
                slug: club.slug,
                logo_path: club.logo_path,
                participant_name: club.participant_name,
                participant_photo_url: club.participant_photo_url,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goals_for: 0,
                goals_against: 0,
                goal_difference: 0,
                points: 0,
                qualified: false,
                season_id: club.season_id
            }));
    }

    function renderGroups() {
        const element = $("#public-groups");
        if (!element) return;

        element.innerHTML = GROUPS.map(group => {
            const rows = groupRows(group);
            const slots = Array.from(
                { length: 4 },
                (_, index) => rows[index] || null
            );

            return `
                <article class="ccfv-champions-group">
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
                            <span>CLUBE</span>
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
                                        ${logoMarkup(row, "ccfv-champions-group__logo")}
                                        <div>
                                            <strong>${esc(row.name || "A DEFINIR")}</strong>
                                            <small>
                                                ${row.participant_photo_url ? `<img class="ccfv-lib-group-player-photo" src="${esc(row.participant_photo_url)}" alt="${esc(row.participant_name || "Jogador")}" loading="lazy">` : ""}
                                                ${esc(row.participant_name || "Treinador a definir")}
                                            </small>
                                        </div>
                                    </div>
                                    <span>${esc(row.played ?? 0)}</span>
                                    <span>${esc(row.wins ?? 0)}</span>
                                    <span>${esc(row.draws ?? 0)}</span>
                                    <span>${esc(row.losses ?? 0)}</span>
                                    <span>${esc(row.goals_for ?? 0)}</span>
                                    <span>${esc(row.goals_against ?? 0)}</span>
                                    <span class="goal-difference ${gd > 0 ? "positive" : gd < 0 ? "negative" : ""}">
                                        ${gd > 0 ? "+" : ""}${esc(gd)}
                                    </span>
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

    function matchCard(match) {
        const finished = DONE.has(
            String(match.status || "")
        );

        return `
            <article class="ccfv-champions-match">
                <header class="ccfv-champions-match__header">
                    <div>
                        <span>${esc(match.stage || "FASE")}</span>
                        <strong>
                            ${match.group_code ? `GRUPO ${esc(match.group_code)} · ` : ""}
                            ${match.leg === 2 ? "VOLTA" : "IDA"}
                        </strong>
                    </div>
                    <div class="ccfv-champions-match__status ${finished ? "is-finished" : ""}">
                        ${finished ? "ENCERRADA" : "PENDENTE"}
                    </div>
                </header>

                <div class="ccfv-champions-match__body">
                    <div class="ccfv-champions-match__team ccfv-champions-match__team--home">
                        <div class="match-team-copy">
                            <strong>${esc(match.home_name || "A DEFINIR")}</strong>
                            <small>${esc(match.home_player_name || "Treinador a definir")}</small>
                        </div>
                        ${logoMarkup({
                            name: match.home_name,
                            slug: match.home_slug,
                            logo_path: match.home_logo_path
                        }, "champions-match-logo")}
                    </div>

                    <div class="ccfv-champions-match__center">
                        <strong class="ccfv-match-score">
                            ${finished
                                ? `${esc(match.home_score ?? 0)} × ${esc(match.away_score ?? 0)}`
                                : "—"}
                        </strong>
                        <span class="ccfv-match-date">
                            ${match.scheduled_at
                                ? new Date(match.scheduled_at).toLocaleString("pt-BR")
                                : "HORÁRIO A DEFINIR"}
                        </span>
                    </div>

                    <div class="ccfv-champions-match__team">
                        ${logoMarkup({
                            name: match.away_name,
                            slug: match.away_slug,
                            logo_path: match.away_logo_path
                        }, "champions-match-logo")}
                        <div class="match-team-copy">
                            <strong>${esc(match.away_name || "A DEFINIR")}</strong>
                            <small>${esc(match.away_player_name || "Treinador a definir")}</small>
                        </div>
                    </div>
                </div>

                <footer class="ccfv-champions-match__footer">
                    <span>
                        ${match.stage === "GROUP_STAGE" ? "FASE DE GRUPOS · IDA + VOLTA" : "MATA-MATA"}
                    </span>
                    ${finished && match.home_penalties != null
                        ? `<strong>PÊNALTIS ${esc(match.home_penalties)} × ${esc(match.away_penalties)}</strong>`
                        : ""}
                </footer>
            </article>
        `;
    }

    function renderMatches() {
        $("#public-matches").innerHTML =
            state.matches.length
                ? state.matches.map(matchCard).join("")
                : `<div class="ccfv-lib-empty">Nenhuma partida gerada ainda.</div>`;
    }

    function renderKnockout() {
        const stages = [
            "ROUND_OF_16",
            "QUARTERFINALS",
            "SEMIFINALS",
            "FINAL"
        ];

        const matches = state.matches.filter(match =>
            stages.includes(match.stage)
        );

        const grouped = new Map();

        matches.forEach(match => {
            const key = match.tie_code || match.id;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(match);
        });

        $("#public-knockout").innerHTML = grouped.size
            ? Array.from(grouped.entries()).map(([tie, games]) => `
                <div class="ccfv-lib-tie-wrap">
                    <div class="ccfv-lib-tie-head">
                        <span>${esc(tie)}</span>
                        <span>${esc(games[0]?.stage || "")}</span>
                    </div>
                    ${games.sort((a, b) => Number(a.leg || 1) - Number(b.leg || 1)).map(matchCard).join("")}
                </div>
            `).join("")
            : `<div class="ccfv-lib-empty">O mata-mata aparecerá após a fase de grupos.</div>`;
    }

    function renderChampion(clubs) {
        const champion = clubs.find(
            club => club.status === "CHAMPION"
        );

        $("#public-champion").innerHTML = champion
            ? `
                <div class="ccfv-lib-champion-copy">
                    <span>🏆 CAMPEÃO DA LIBERTADORES CCFV</span>
                    ${champion.participant_photo_url ? `
                        <img
                            src="${esc(champion.participant_photo_url)}"
                            alt="${esc(champion.participant_name || "Campeão")}"
                            loading="lazy"
                        >
                    ` : logoMarkup(champion, "ccfv-lib-public-logo ccfv-lib-champion-logo")}
                    <h2>${esc(champion.participant_name || champion.name)}</h2>
                    <p>${esc(champion.name)} · ${esc(state.season?.season_label || "SEASON")}</p>
                </div>
            `
            : `
                <div class="ccfv-lib-champion-copy">
                    <span>CCFV // HALL DA FAMA</span>
                    <h2>A DEFINIR.</h2>
                    <p>A grande taça ainda está em disputa.</p>
                </div>
            `;
    }

    function boot() {
        load().catch(error => {
            console.error(
                "CCFV // LIBERTADORES PUBLIC:",
                error
            );
            // Mesmo com falha de leitura do banco, os 32 clubes ficam visíveis.
            state.season = null;
            state.clubs = [];
            state.matches = [];
            state.standings = [];
            render();
        });

        window.setInterval(() => {
            if (document.visibilityState === "visible") {
                load().catch(error =>
                    console.warn(
                        "CCFV // LIBERTADORES LIVE:",
                        error
                    )
                );
            }
        }, 15000);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            boot,
            { once: true }
        );
    } else {
        boot();
    }
})();
