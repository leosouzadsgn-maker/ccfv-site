(() => {
    "use strict";

    const state = {
        client: null,
        season: null,
        clubs: [],
        matches: [],
        standings: []
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

    async function getClient() {
        if (state.client) return state.client;
        if (!window.CCFVAuth?.getClient) {
            throw new Error("Cliente CCFV indisponível.");
        }
        state.client = await window.CCFVAuth.getClient();
        return state.client;
    }

    function logo(path, name) {
        if (path) {
            return `<img src="${esc(path)}" alt="${esc(name)}" loading="lazy">`;
        }
        return `<span>${esc(String(name || "CC").slice(0, 3).toUpperCase())}</span>`;
    }

    function clubForName(name) {
        return state.clubs.find(club =>
            String(club.name || "").trim() === String(name || "").trim()
        );
    }

    async function load() {
        const client = await getClient();

        const seasons = await client
            .from("ccfv_libertadores_public_seasons")
            .select("*")
            .order("season_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (seasons.error) throw seasons.error;
        if (!seasons.data) return;

        state.season = seasons.data;

        const [clubs, matches, standings] = await Promise.all([
            client
                .from("ccfv_libertadores_public_clubs")
                .select("*")
                .eq("season_id", state.season.id)
                .order("slot"),
            client
                .from("ccfv_libertadores_public_matches")
                .select("*")
                .eq("season_id", state.season.id)
                .order("match_order"),
            client
                .from("ccfv_libertadores_public_standings")
                .select("*")
                .eq("season_id", state.season.id)
                .order("group_code")
                .order("position")
        ]);

        const error = [clubs, matches, standings].find(result => result.error);
        if (error) throw error.error;

        state.clubs = clubs.data || [];
        state.matches = matches.data || [];
        state.standings = standings.data || [];

        render();
    }

    function render() {
        const registered = state.clubs.filter(club => club.participant_id).length;
        const finished = state.matches.filter(match => done.includes(String(match.status || ""))).length;

        $("#lib-season-label").textContent = state.season?.season_label || "SEASON 01";
        $("#lib-season-status").textContent = phaseLabels[state.season?.phase] || state.season?.phase || "—";
        $("#lib-participants").textContent = `${registered} / 32`;
        $("#lib-clubs-count").textContent = `${registered} / 32`;
        $("#lib-phase").textContent = phaseLabels[state.season?.phase] || state.season?.phase || "—";

        $("#lib-hero-data").innerHTML = [
            ["32", "CLUBES"],
            ["8", "GRUPOS"],
            ["96", "JOGOS DE GRUPOS"],
            [String(finished), "JOGOS ENCERRADOS"]
        ].map(([value, label]) => `
            <article><strong>${esc(value)}</strong><span>${esc(label)}</span></article>
        `).join("");

        renderClubs();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderChampion();
    }

    function renderClubs() {
        const container = $("#lib-clubs");
        if (!container) return;

        if (!state.clubs.length) {
            container.innerHTML = '<div class="ccfv-lib-empty">Nenhum clube cadastrado.</div>';
            return;
        }

        container.innerHTML = state.clubs.map(club => `
            <article class="ccfv-lib-club ${club.participant_id ? "is-open" : ""}">
                <div class="ccfv-lib-club__crest">${logo(club.logo_path, club.name)}</div>
                <div class="ccfv-lib-club__name">
                    <strong>${esc(club.name)}</strong>
                    <small>${esc(club.country || "América do Sul")} · POTE ${esc(club.pot)}</small>
                </div>
                <div class="ccfv-lib-club__player">
                    ${club.participant_name ? `JOGADOR: ${esc(club.participant_name)}` : "DISPONÍVEL PARA INSCRIÇÃO"}
                </div>
            </article>
        `).join("");
    }

    function renderGroups() {
        const container = $("#public-groups");
        const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];

        container.innerHTML = groups.map(group => {
            const rows = state.standings.filter(item => item.group_code === group);

            return `
                <article class="ccfv-lib-group">
                    <div class="ccfv-lib-group__head">
                        <strong>GRUPO ${group}</strong>
                        <span>02 CLASSIFICAM</span>
                    </div>
                    ${rows.map(row => `
                        <div class="ccfv-lib-group__row">
                            <span class="ccfv-lib-group__pos">${String(row.position).padStart(2, "0")}</span>
                            <div>${logo(row.logo_path, row.name)}</div>
                            <div class="ccfv-lib-group__club">
                                <strong>${esc(row.name)}</strong>
                                <small>${row.participant_name ? `JOGADOR: ${esc(row.participant_name)}` : "A DEFINIR"}</small>
                            </div>
                            <span class="ccfv-lib-group__points">${Number(row.points || 0)} PTS</span>
                        </div>
                    `).join("") || '<div class="ccfv-lib-empty">Aguardando sorteio.</div>'}
                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        const container = $("#public-matches");

        if (!state.matches.length) {
            container.innerHTML = '<div class="ccfv-lib-empty">Nenhuma partida gerada ainda.</div>';
            return;
        }

        container.innerHTML = state.matches.map(match => {
            const home = clubForName(match.home_name);
            const away = clubForName(match.away_name);
            const finished = done.includes(String(match.status || ""));

            return `
                <article class="ccfv-lib-match">
                    <span>${esc(phaseLabels[match.stage] || match.stage)}${match.group_code ? ` · GRUPO ${esc(match.group_code)}` : ""}${match.tie_code ? ` · ${esc(match.tie_code)}` : ""}</span>
                    <div class="ccfv-lib-teams">
                        <div class="ccfv-lib-team">
                            ${logo(match.home_logo_path, match.home_name)}
                            ${esc(match.home_name)}
                            <small>${home?.participant_name ? esc(home.participant_name) : "A DEFINIR"}</small>
                        </div>
                        <div>VS</div>
                        <div class="ccfv-lib-team">
                            ${logo(match.away_logo_path, match.away_name)}
                            ${esc(match.away_name)}
                            <small>${away?.participant_name ? esc(away.participant_name) : "A DEFINIR"}</small>
                        </div>
                    </div>
                    <div class="ccfv-lib-match-score">${finished ? `${Number(match.home_score ?? 0)} × ${Number(match.away_score ?? 0)}` : "—"}</div>
                    <div class="ccfv-lib-status">${finished ? "ENCERRADO" : "A DEFINIR"}</div>
                </article>
            `;
        }).join("");
    }

    function renderKnockout() {
        const container = $("#public-knockout");
        const stages = ["ROUND_OF_16", "QUARTERFINALS", "SEMIFINALS", "FINAL"];
        const matches = state.matches.filter(match => stages.includes(match.stage));

        if (!matches.length) {
            container.innerHTML = '<div class="ccfv-lib-empty">O mata-mata aparecerá após a classificação.</div>';
            return;
        }

        const groups = new Map();
        matches.forEach(match => {
            const key = match.tie_code || `${match.stage}-${match.match_order}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(match);
        });

        container.innerHTML = Array.from(groups.entries()).map(([tie, games]) => `
            <article class="ccfv-lib-tie">
                <div class="ccfv-lib-tie__head">
                    <span>${esc(tie)}</span>
                    <span>${esc(phaseLabels[games[0]?.stage] || games[0]?.stage || "")}</span>
                </div>
                <div class="ccfv-lib-tie__games">
                    ${games.sort((a,b) => Number(a.leg || 1) - Number(b.leg || 1)).map(game => `
                        <div class="ccfv-lib-tie__game">
                            <span>${game.leg === 2 ? "VOLTA" : "IDA"}</span>
                            <div><span>${esc(game.home_name)}</span><strong>${game.home_score ?? "—"}</strong></div>
                            <div><span>${esc(game.away_name)}</span><strong>${game.away_score ?? "—"}</strong></div>
                        </div>
                    `).join("")}
                </div>
            </article>
        `).join("");
    }

    function renderChampion() {
        const container = $("#public-champion");
        const champion = state.clubs.find(club => club.status === "CHAMPION");

        if (!champion) {
            container.innerHTML = '<div class="ccfv-lib-empty">A grande taça ainda está em disputa.</div>';
            return;
        }

        container.innerHTML = `
            <article class="ccfv-lib-champion-card">
                <span>CCFV // HALL DA FAMA</span>
                ${logo(champion.logo_path, champion.name)}
                <h3>${esc(champion.name)}</h3>
                <p>${champion.participant_name ? `CAMPEÃO: ${esc(champion.participant_name)}` : "CAMPEÃO A DEFINIR"}</p>
            </article>
        `;
    }

    function boot() {
        load().catch(error => {
            console.error("CCFV // LIBERTADORES PUBLIC:", error);
            $("#lib-season-status")?.replaceChildren(document.createTextNode("OFFLINE"));
        });

        window.setInterval(() => {
            load().catch(error => console.warn("CCFV // Libertadores live:", error));
        }, 15000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
