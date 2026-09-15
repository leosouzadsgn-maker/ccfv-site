(() => {
    "use strict";

    const state = {
        client: null,
        championship: null,
        clubs: [],
        standings: [],
        matches: []
    };

    const esc = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const phaseLabel = {
        DRAFT: "DRAFT",
        REGISTRATIONS: "INSCRIÇÕES",
        CLUB_SELECTION: "ESCOLHA DE CLUBE",
        DRAW: "SORTEIO",
        GROUP_STAGE: "FASE DE GRUPOS",
        ROUND_OF_16: "OITAVAS",
        QUARTERFINALS: "QUARTAS",
        SEMIFINALS: "SEMIFINAIS",
        FINAL: "FINAL",
        CLOSED: "ENCERRADA",
        ARCHIVED: "ARQUIVADA"
    };

    async function getClient() {
        if (window.CCFVAuth?.getClient) {
            return window.CCFVAuth.getClient();
        }

        const started = Date.now();
        while (!window.CCFVAuth?.getClient) {
            if (Date.now() - started > 10000) {
                throw new Error("Supabase não está disponível.");
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return window.CCFVAuth.getClient();
    }

    async function load() {
        state.client = await getClient();

        const { data: championships, error: cError } = await state.client
            .from("championships")
            .select("*")
            .eq("code", "CCFV-CL-S01")
            .maybeSingle();
        if (cError) throw cError;
        state.championship = championships;

        if (!state.championship) {
            renderEmpty("Temporada da Champions ainda não cadastrada.");
            return;
        }

        const id = state.championship.id;

        const [clubs, standings, matches] = await Promise.all([
            state.client.from("championship_public_clubs").select("*").eq("championship_id", id).order("slug"),
            state.client.from("championship_public_standings").select("*").eq("championship_id", id).order("group_code").order("position"),
            state.client.from("championship_public_matches").select("*").eq("championship_id", id).order("phase").order("match_number")
        ]);

        if (clubs.error) throw clubs.error;
        if (standings.error) throw standings.error;
        if (matches.error) throw matches.error;

        state.clubs = clubs.data || [];
        state.standings = standings.data || [];
        state.matches = matches.data || [];

        render();
    }

    function render() {
        const c = state.championship;

        document.querySelector("#champions-season-label").textContent = c.season_label || "SEASON 01";
        document.querySelector("#champions-season-status").textContent = phaseLabel[c.status] || c.status || "DRAFT";
        document.querySelector("#hero-phase").textContent = phaseLabel[c.status] || c.status || "DRAFT";

        const participants = new Set(
            state.clubs.map(item => item.participant_id).filter(Boolean)
        ).size;

        const occupied = state.clubs.filter(item =>
            ["RESERVED", "CONFIRMED", "ELIMINATED"].includes(String(item.status || "").toUpperCase())
        ).length;

        document.querySelector("#hero-participants").textContent = `${participants} / ${c.max_participants || 32}`;
        document.querySelector("#hero-clubs").textContent = `${occupied} / ${c.total_clubs || 32}`;

        renderClubs();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderChampion();
    }

    function renderClubs() {
        const el = document.querySelector("#champions-clubs-grid");

        if (!state.clubs.length) {
            el.innerHTML = `<div class="ccfv-champions-empty">Nenhum clube disponível.</div>`;
            return;
        }

        el.innerHTML = state.clubs.map(club => `
            <article class="ccfv-champions-club">
                <img src="${esc(club.logo_path || "")}" alt="${esc(club.name)}" loading="lazy"
                     onerror="this.style.opacity=.2">
                <div class="ccfv-champions-club__name">
                    <strong>${esc(club.name)}</strong>
                    <span>${esc(club.country || "EUROPA")}</span>
                </div>
                <span class="ccfv-champions-club__status">${esc(club.status || "AVAILABLE")}</span>
            </article>
        `).join("");
    }

    function renderGroups() {
        const el = document.querySelector("#champions-groups-grid");
        const groups = [...new Set(state.standings.map(item => item.group_code))].sort();

        if (!groups.length) {
            el.innerHTML = `<div class="ccfv-champions-empty">Os grupos ainda não foram sorteados.</div>`;
            return;
        }

        el.innerHTML = groups.map(code => {
            const rows = state.standings.filter(item => item.group_code === code)
                .sort((a, b) => Number(a.position || 99) - Number(b.position || 99));

            return `
                <article class="ccfv-champions-group">
                    <div class="ccfv-champions-group__head">
                        <strong>GRUPO ${esc(code)}</strong>
                        <span>TOP 2 AVANÇA</span>
                    </div>
                    <div class="ccfv-champions-group__table">
                        ${rows.map(row => `
                            <div class="ccfv-champions-group__row ${row.qualified ? "is-qualified" : ""}">
                                <span>${esc(row.position)}</span>
                                <img src="${esc(row.logo_path || "")}" alt="" loading="lazy">
                                <span>${esc(row.club_name)}</span>
                                <small>${esc(row.points)} PTS</small>
                                <small>${esc(row.goal_difference >= 0 ? "+" : "")}${esc(row.goal_difference)}</small>
                            </div>
                        `).join("")}
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        const el = document.querySelector("#champions-matches");

        if (!state.matches.length) {
            el.innerHTML = `<div class="ccfv-champions-empty">Nenhuma partida cadastrada ainda.</div>`;
            return;
        }

        const ordered = [...state.matches]
            .filter(m => ["GROUP_STAGE", "ROUND_OF_16", "QUARTERFINALS", "SEMIFINALS", "FINAL"].includes(m.phase));

        el.innerHTML = ordered.slice(0, 48).map(match => {
            const finished = ["VALIDATED", "WO", "ADMIN_DECISION"].includes(String(match.status || ""));
            return `
                <article class="ccfv-champions-match">
                    <div class="ccfv-champions-match__side">
                        <img src="${esc(match.home_logo_path || "")}" alt="" loading="lazy">
                        <strong>${esc(match.home_club_name || match.home_player_name || "A DEFINIR")}</strong>
                    </div>
                    <div class="ccfv-champions-match__score">
                        <strong>${finished ? `${esc(match.home_score)} × ${esc(match.away_score)}` : "VS"}</strong>
                        <span>${esc(phaseLabel[match.phase] || match.phase)}</span>
                    </div>
                    <div class="ccfv-champions-match__side ccfv-champions-match__side--away">
                        <strong>${esc(match.away_club_name || match.away_player_name || "A DEFINIR")}</strong>
                        <img src="${esc(match.away_logo_path || "")}" alt="" loading="lazy">
                    </div>
                </article>
            `;
        }).join("");
    }

    function bracketCard(match) {
        if (!match) return "";
        const finished = ["VALIDATED", "WO", "ADMIN_DECISION"].includes(String(match.status || ""));
        return `
            <div class="ccfv-bracket-match">
                <div class="ccfv-bracket-line">
                    <img src="${esc(match.home_logo_path || "")}" alt="">
                    <span>${esc(match.home_club_name || "A DEFINIR")}</span>
                    <strong>${finished ? esc(match.home_score) : "—"}</strong>
                </div>
                <div class="ccfv-bracket-line">
                    <img src="${esc(match.away_logo_path || "")}" alt="">
                    <span>${esc(match.away_club_name || "A DEFINIR")}</span>
                    <strong>${finished ? esc(match.away_score) : "—"}</strong>
                </div>
            </div>
        `;
    }

    function renderKnockout() {
        const phases = {
            ROUND_OF_16: "#knockout-r16",
            QUARTERFINALS: "#knockout-qf",
            SEMIFINALS: "#knockout-sf",
            FINAL: "#knockout-final"
        };

        Object.entries(phases).forEach(([phase, selector]) => {
            const matches = state.matches.filter(m => m.phase === phase);
            const target = document.querySelector(selector);
            target.innerHTML = matches.length
                ? matches.map(bracketCard).join("")
                : `<div class="ccfv-champions-empty">Aguardando</div>`;
        });
    }

    function renderChampion() {
        let final = state.matches.find(m => m.phase === "FINAL" && ["VALIDATED", "WO", "ADMIN_DECISION"].includes(m.status));
        const champion = final?.winner_club_id
            ? state.clubs.find(club => club.championship_club_id === final.winner_club_id)
            : null;

        if (final?.winner_club_name) {
            document.querySelector("#season-champion").textContent = final.winner_club_name;
        }

        if (champion) {
            document.querySelector("#champion-name").textContent = champion.name;
        } else {
            document.querySelector("#champion-name").textContent = "A DEFINIR";
        }

        document.querySelector("#champion-club").textContent =
            champion ? `Representado por ${champion.participant_name || "participante oficial"} — ${state.championship.season_label}` :
            "A grande taça ainda está em disputa.";
    }

    function renderEmpty(message) {
        document.querySelectorAll(".ccfv-champions-empty").forEach(el => {
            el.textContent = message;
        });
    }

    window.addEventListener("DOMContentLoaded", () => {
        load().catch(error => {
            console.error("CCFV Champions:", error);
            renderEmpty("Não foi possível carregar a Champions agora.");
        });
    });
})();
