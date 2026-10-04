(() => {
    "use strict";

    const state = {
        client: null,
        season: null,
        teams: [],
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

    const flags = {
        argentina: "🇦🇷", brasil: "🇧🇷", franca: "🇫🇷", espanha: "🇪🇸",
        inglaterra: "🏴", portugal: "🇵🇹", alemanha: "🇩🇪", italia: "🇮🇹",
        holanda: "🇳🇱", croacia: "🇭🇷", belgica: "🇧🇪", uruguai: "🇺🇾",
        colombia: "🇨🇴", mexico: "🇲🇽", "estados-unidos": "🇺🇸", japao: "🇯🇵",
        marrocos: "🇲🇦", senegal: "🇸🇳", "coreia-do-sul": "🇰🇷", australia: "🇦🇺",
        dinamarca: "🇩🇰", suica: "🇨🇭", "estados-unidos-b": "🇺🇸", canada: "🇨🇦",
        equador: "🇪🇨", chile: "🇨🇱", paraguai: "🇵🇾", peru: "🇵🇪",
        nigeria: "🇳🇬", camaroes: "🇨🇲", ira: "🇮🇷", "arabia-saudita": "🇸🇦"
    };

    function flag(team) {
        return flags[String(team?.slug || "").toLowerCase()] || "🌐";
    }

    function teamByName(name) {
        return state.teams.find(team =>
            String(team.name || "").trim() === String(name || "").trim()
        );
    }

    async function client() {
        if (state.client) return state.client;
        if (!window.CCFVAuth?.getClient) {
            throw new Error("Cliente CCFV indisponível.");
        }
        state.client = await window.CCFVAuth.getClient();
        return state.client;
    }

    async function load() {
        const c = await client();

        const seasons = await c
            .from("ccfv_world_cup_public_seasons")
            .select("*")
            .order("season_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (seasons.error) throw seasons.error;
        if (!seasons.data) return;

        state.season = seasons.data;

        const [teams, matches, standings] = await Promise.all([
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
                .order("position")
        ]);

        const error = [teams, matches, standings].find(item => item.error);
        if (error) throw error.error;

        state.teams = teams.data || [];
        state.matches = matches.data || [];
        state.standings = standings.data || [];

        render();
    }

    function render() {
        const registered = state.teams.filter(team => team.participant_id).length;
        const finished = state.matches.filter(match => done.includes(String(match.status || ""))).length;

        $("#wc-season-label").textContent = state.season?.season_label || "SEASON 01";
        $("#wc-season-status").textContent = phaseLabels[state.season?.phase] || state.season?.phase || "—";
        $("#wc-participants").textContent = `${registered} / 32`;
        $("#wc-teams-count").textContent = `${registered} / 32`;
        $("#wc-phase").textContent = phaseLabels[state.season?.phase] || state.season?.phase || "—";

        $("#wc-hero-data").innerHTML = [
            ["32", "SELEÇÕES"],
            ["8", "GRUPOS"],
            ["48", "JOGOS DE GRUPOS"],
            [String(finished), "JOGOS ENCERRADOS"]
        ].map(([value, label]) => `
            <article><strong>${esc(value)}</strong><span>${esc(label)}</span></article>
        `).join("");

        renderTeams();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderChampion();
    }

    function renderTeams() {
        const container = $("#wc-teams");
        if (!state.teams.length) {
            container.innerHTML = '<div class="ccfv-wc-empty">Nenhuma seleção cadastrada.</div>';
            return;
        }

        container.innerHTML = state.teams.map(team => `
            <article class="ccfv-wc-team ${team.participant_id ? "is-open" : ""}">
                <div class="ccfv-wc-team__flag">${flag(team)}</div>
                <div class="ccfv-wc-team__name">
                    <strong>${esc(team.name)}</strong>
                    <small>${esc(team.confederation || "CONFEDERAÇÃO")} · POTE ${esc(team.pot)}</small>
                </div>
                <div class="ccfv-wc-team__player">
                    ${team.participant_name ? `JOGADOR: ${esc(team.participant_name)}` : "DISPONÍVEL PARA INSCRIÇÃO"}
                </div>
            </article>
        `).join("");
    }

    function renderGroups() {
        const container = $("#wc-groups");
        const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];

        container.innerHTML = groups.map(group => {
            const rows = state.standings.filter(item => item.group_code === group);
            return `
                <article class="ccfv-wc-group">
                    <div class="ccfv-wc-group__head"><strong>GRUPO ${group}</strong><span>02 CLASSIFICAM</span></div>
                    ${rows.map(row => `
                        <div class="ccfv-wc-group__row">
                            <span class="ccfv-wc-group__pos">${String(row.position).padStart(2, "0")}</span>
                            <div>${flag({slug: row.slug})}</div>
                            <div class="ccfv-wc-group__team">
                                <strong>${esc(row.name)}</strong>
                                <small>${row.participant_name ? `JOGADOR: ${esc(row.participant_name)}` : "A DEFINIR"}</small>
                            </div>
                            <span class="ccfv-wc-group__points">${Number(row.points || 0)} PTS</span>
                        </div>
                    `).join("") || '<div class="ccfv-wc-empty">Aguardando sorteio.</div>'}
                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        const container = $("#wc-matches");

        if (!state.matches.length) {
            container.innerHTML = '<div class="ccfv-wc-empty">Nenhuma partida gerada ainda.</div>';
            return;
        }

        container.innerHTML = state.matches.map(match => {
            const home = teamByName(match.home_name);
            const away = teamByName(match.away_name);
            const finished = done.includes(String(match.status || ""));

            return `
                <article class="ccfv-wc-match">
                    <span>${esc(phaseLabels[match.stage] || match.stage)}${match.group_code ? ` · GRUPO ${esc(match.group_code)}` : ""}${match.tie_code ? ` · ${esc(match.tie_code)}` : ""}</span>
                    <div class="ccfv-wc-match__teams">
                        <div class="ccfv-wc-match__team">${flag(home)}<strong>${esc(match.home_name)}</strong><small>${home?.participant_name ? esc(home.participant_name) : "A DEFINIR"}</small></div>
                        <div>VS</div>
                        <div class="ccfv-wc-match__team">${flag(away)}<strong>${esc(match.away_name)}</strong><small>${away?.participant_name ? esc(away.participant_name) : "A DEFINIR"}</small></div>
                    </div>
                    <div class="ccfv-wc-match__score">${finished ? `${Number(match.home_score ?? 0)} × ${Number(match.away_score ?? 0)}` : "—"}</div>
                    <div class="ccfv-wc-match__status">${finished ? "ENCERRADO" : "A DEFINIR"}</div>
                </article>
            `;
        }).join("");
    }

    function renderKnockout() {
        const container = $("#wc-knockout");
        const stages = ["ROUND_OF_16", "QUARTERFINALS", "SEMIFINALS", "FINAL"];
        const matches = state.matches.filter(match => stages.includes(match.stage));

        if (!matches.length) {
            container.innerHTML = '<div class="ccfv-wc-empty">O mata-mata aparecerá após a classificação.</div>';
            return;
        }

        const byTie = new Map();
        matches.forEach(match => {
            const key = match.tie_code || `${match.stage}-${match.match_order}`;
            if (!byTie.has(key)) byTie.set(key, []);
            byTie.get(key).push(match);
        });

        container.innerHTML = Array.from(byTie.entries()).map(([tie, games]) => `
            <article class="ccfv-wc-tie">
                <div class="ccfv-wc-tie__head"><span>${esc(tie)}</span><span>${esc(phaseLabels[games[0]?.stage] || games[0]?.stage || "")}</span></div>
                <div class="ccfv-wc-tie__games">
                    ${games.map(game => `
                        <div class="ccfv-wc-tie__game">
                            <span>CONFRONTO</span>
                            <div><span>${esc(game.home_name)}</span><strong>${game.home_score ?? "—"}</strong></div>
                            <div><span>${esc(game.away_name)}</span><strong>${game.away_score ?? "—"}</strong></div>
                        </div>
                    `).join("")}
                </div>
            </article>
        `).join("");
    }

    function renderChampion() {
        const container = $("#wc-champion");
        const champion = state.teams.find(team => team.status === "CHAMPION");

        if (!champion) {
            container.innerHTML = '<div class="ccfv-wc-empty">A taça ainda está em disputa.</div>';
            return;
        }

        container.innerHTML = `
            <article class="ccfv-wc-champion-card">
                <span>CCFV // HALL DA FAMA</span>
                <div class="ccfv-wc-champion-card__flag">${flag(champion)}</div>
                <h3>${esc(champion.name)}</h3>
                <p>${champion.participant_name ? `CAMPEÃO: ${esc(champion.participant_name)}` : "CAMPEÃO"}</p>
            </article>
        `;
    }

    function boot() {
        load().catch(error => console.error("CCFV // WORLD CUP PUBLIC:", error));
        window.setInterval(() => load().catch(error => console.warn("CCFV // World Cup live:", error)), 15000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
