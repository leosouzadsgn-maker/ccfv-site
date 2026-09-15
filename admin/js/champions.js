(() => {
    "use strict";

    const state = {
        client: null,
        championshipId: null,
        clubs: [],
        standings: [],
        matches: [],
        history: [],
        pots: []
    };

    const esc = value => String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

    const phaseLabel = {
        DRAFT:"DRAFT",
        REGISTRATIONS:"INSCRIÇÕES",
        CLUB_SELECTION:"ESCOLHA DE CLUBE",
        DRAW:"SORTEIO",
        GROUP_STAGE:"GRUPOS",
        ROUND_OF_16:"OITAVAS",
        QUARTERFINALS:"QUARTAS",
        SEMIFINALS:"SEMIFINAIS",
        FINAL:"FINAL",
        CLOSED:"ENCERRADA",
        ARCHIVED:"ARQUIVADA"
    };

    async function client() {
        if (state.client) return state.client;
        if (!window.CCFVAuth?.getClient) throw new Error("Autenticação CCFV indisponível.");
        state.client = await window.CCFVAuth.getClient();
        return state.client;
    }

    function message(text, error = false) {
        const el = document.querySelector("#admin-message");
        el.hidden = false;
        el.textContent = text;
        el.classList.toggle("error", error);
    }

    async function load() {
        const db = await client();

        /*
         * A view pública é a fonte de leitura principal.
         */
        const clubs = await db
            .from("championship_public_clubs")
            .select("*")
            .order("club_name");

        if (clubs.error) throw clubs.error;

        state.clubs = clubs.data || [];

        if (state.clubs.length) {
            state.championshipId = state.clubs[0].championship_id;
        }

        if (!state.championshipId) {
            renderAll();
            return;
        }

        const [standings,matches,history] = await Promise.all([
            db.from("championship_public_standings")
                .select("*")
                .eq("championship_id",state.championshipId)
                .order("group_code")
                .order("position"),

            db.from("championship_public_matches")
                .select("*")
                .eq("championship_id",state.championshipId)
                .order("match_number"),

            db.from("championship_history")
                .select("*")
                .eq("championship_id",state.championshipId)
        ]);

        /*
         * Algumas instalações podem bloquear tabelas de histórico.
         * O restante da tela não pode quebrar por isso.
         */
        state.standings = standings.error ? [] : (standings.data || []);
        state.matches = matches.error ? [] : (matches.data || []);
        state.history = history.error ? [] : (history.data || []);

        renderAll();
    }

    function renderAll() {
        const participants = new Set(
            state.clubs.map(c => c.participant_id).filter(Boolean)
        ).size;

        const occupied = state.clubs.filter(
            c => c.participant_id
        ).length;

        document.querySelector("#kpi-participants").textContent =
            `${participants} / 32`;

        document.querySelector("#kpi-clubs").textContent =
            `${occupied} / 32`;

        document.querySelector("#kpi-matches").textContent =
            `${state.matches.length} / 96`;

        document.querySelector("#kpi-phase").textContent =
            state.matches.length ? "EM ANDAMENTO" : "INSCRIÇÕES";

        renderClubs();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderHistory();
    }

    function renderClubs() {
        const body = document.querySelector("#clubs-body");

        body.innerHTML = state.clubs.map(club => `
            <tr>
                <td><img src="${esc(club.logo_path || "")}" alt=""></td>
                <td><strong>${esc(club.club_name || club.name || "CLUBE")}</strong></td>
                <td>${esc(club.country || "—")}</td>
                <td>${esc(club.participant_name || "A DEFINIR")}</td>
                <td><span class="club-status">${esc(club.status || "AVAILABLE")}</span></td>
                <td>${esc(club.pot_number ?? "—")}</td>
            </tr>
        `).join("");

        const pots = [1,2,3,4];
        document.querySelector("#pots-body").innerHTML = pots.map(n => `
            <div class="pot"><strong>8</strong><span>POTE ${n}</span></div>
        `).join("");
    }

    function renderGroups() {
        const target = document.querySelector("#groups-body");
        const letters = ["A","B","C","D","E","F","G","H"];

        target.innerHTML = letters.map(letter => {
            const rows = state.standings
                .filter(row => row.group_code === letter)
                .sort((a,b) => Number(a.position||99)-Number(b.position||99));

            const fallback = [1,2,3,4].map(pos => ({
                position:pos,
                club_name:"A DEFINIR",
                points:0,
                goal_difference:0,
                logo_path:""
            }));

            const data = rows.length ? rows : fallback;

            return `
                <article class="group-admin-card">
                    <h3>GRUPO ${letter}</h3>
                    ${data.map(row => `
                        <div class="group-row">
                            <span>${esc(row.position)}</span>
                            <img src="${esc(row.logo_path || "")}" alt="">
                            <strong>${esc(row.club_name || "A DEFINIR")}</strong>
                            <small>${esc(row.points ?? 0)} pts</small>
                            <small>${esc(row.goal_difference ?? 0)}</small>
                        </div>
                    `).join("")}
                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        const phase = document.querySelector("#phase-filter").value;
        const target = document.querySelector("#matches-body");

        const matches = state.matches.filter(m => m.phase === phase);

        if (!matches.length) {
            target.innerHTML = `
                <div class="champions-admin-card">
                    <p>Nenhuma partida gerada nesta fase ainda.</p>
                </div>
            `;
            return;
        }

        target.innerHTML = matches.map(match => `
            <article class="match-card">
                <div class="team">
                    <img src="${esc(match.home_logo_path || "")}" alt="">
                    <span>${esc(match.home_club_name || "A DEFINIR")}</span>
                </div>

                <div class="score">
                    <strong>${
                        ["VALIDATED","WO","ADMIN_DECISION"].includes(match.status)
                            ? `${esc(match.home_score)} × ${esc(match.away_score)}`
                            : "VS"
                    }</strong>
                    <small>${esc(phaseLabel[match.phase] || match.phase)}</small>
                </div>

                <div class="team right">
                    <span>${esc(match.away_club_name || "A DEFINIR")}</span>
                    <img src="${esc(match.away_logo_path || "")}" alt="">
                </div>

                <div class="result-controls">
                    ${
                        ["VALIDATED","WO","ADMIN_DECISION"].includes(match.status)
                        ? `<span class="club-status">${esc(match.status)}</span>`
                        : `
                            <input type="number" min="0" id="home-${esc(match.id)}" placeholder="0">
                            <input type="number" min="0" id="away-${esc(match.id)}" placeholder="0">
                            <button data-result="${esc(match.id)}">SALVAR</button>
                        `
                    }
                </div>
            </article>
        `).join("");
    }

    function renderKnockout() {
        const phases = [
            ["ROUND_OF_16","OITAVAS"],
            ["QUARTERFINALS","QUARTAS"],
            ["SEMIFINALS","SEMIFINAIS"],
            ["FINAL","FINAL"]
        ];

        document.querySelector("#knockout-body").innerHTML =
            phases.map(([phase,label]) => {
                const matches = state.matches.filter(m => m.phase === phase);

                return `
                    <article class="ko-col">
                        <h3>${label}</h3>
                        ${
                            matches.length
                            ? matches.map(match => `
                                <div class="ko-match">
                                    <div class="ko-team">
                                        <img src="${esc(match.home_logo_path || "")}" alt="">
                                        <span>${esc(match.home_club_name || "A DEFINIR")}</span>
                                        <strong>${
                                            ["VALIDATED","WO","ADMIN_DECISION"].includes(match.status)
                                                ? esc(match.home_score)
                                                : "—"
                                        }</strong>
                                    </div>
                                    <div class="ko-team">
                                        <img src="${esc(match.away_logo_path || "")}" alt="">
                                        <span>${esc(match.away_club_name || "A DEFINIR")}</span>
                                        <strong>${
                                            ["VALIDATED","WO","ADMIN_DECISION"].includes(match.status)
                                                ? esc(match.away_score)
                                                : "—"
                                        }</strong>
                                    </div>
                                </div>
                              `).join("")
                            : `<p>Aguardando classificados.</p>`
                        }
                    </article>
                `;
            }).join("");
    }

    function renderHistory() {
        const body = document.querySelector("#history-body");

        if (!state.history.length) {
            body.innerHTML = `<tr><td colspan="6">Histórico ainda vazio.</td></tr>`;
            return;
        }

        body.innerHTML = state.history.map(item => `
            <tr>
                <td>${esc(item.participant_name || item.participant_id)}</td>
                <td>${esc(item.club_name || item.club_id)}</td>
                <td>${esc(item.phase_reached || "—")}</td>
                <td>${esc(item.matches_played ?? 0)}</td>
                <td>${esc(item.wins ?? 0)}</td>
                <td>${esc(item.final_position ?? "—")}</td>
            </tr>
        `).join("");
    }

    async function rpc(name,args) {
        const db = await client();
        message(`Executando ${name}...`);

        const {data,error} = await db.rpc(name,args);
        if (error) throw error;

        message(`${name}: ${JSON.stringify(data)}`);
        await load();
    }

    function bindTabs() {
        document.querySelectorAll("[data-tab]").forEach(link => {
            link.addEventListener("click", event => {
                event.preventDefault();

                document.querySelectorAll("[data-tab]")
                    .forEach(item => item.classList.toggle("is-active",item === link));

                document.querySelectorAll(".champions-admin-tab")
                    .forEach(panel => panel.classList.toggle("is-active",panel.dataset.panel === link.dataset.tab));

                history.replaceState(null,"",`#${link.dataset.tab}`);
            });
        });

        const hash = location.hash.slice(1);
        const link = document.querySelector(`[data-tab="${CSS.escape(hash)}"]`);
        if (link) link.click();
    }

    function bindActions() {
        document.querySelector("#refresh-admin")
            .addEventListener("click",() => load().catch(e => message(e.message || e,true)));

        document.querySelector("#phase-filter")
            .addEventListener("change",renderMatches);

        document.body.addEventListener("click",async event => {
            const action = event.target.closest("[data-action]");
            const result = event.target.closest("[data-result]");

            try {
                if (result) {
                    const id = result.dataset.result;
                    const home = Number(document.querySelector(`#home-${CSS.escape(id)}`).value);
                    const away = Number(document.querySelector(`#away-${CSS.escape(id)}`).value);

                    await rpc("champions_submit_result",{
                        p_match_id:id,
                        p_home_score:home,
                        p_away_score:away,
                        p_result_type:"NORMAL"
                    });
                    return;
                }

                if (!action) return;

                switch(action.dataset.action) {
                    case "prepare":
                        await rpc("champions_prepare_pots",{
                            p_championship_id:state.championshipId,
                            p_force:false
                        });
                        break;

                    case "draw":
                        await rpc("champions_draw_groups",{
                            p_championship_id:state.championshipId,
                            p_force:false
                        });
                        break;

                    case "matches":
                        await rpc("champions_generate_group_matches",{
                            p_championship_id:state.championshipId,
                            p_force:false
                        });
                        break;

                    case "refresh":
                        await load();
                        break;
                }
            } catch(error) {
                console.error(error);
                message(error.message || String(error),true);
            }
        });
    }

    window.addEventListener("DOMContentLoaded",() => {
        bindTabs();
        bindActions();
        load().catch(error => {
            console.error(error);
            message(error.message || "Falha ao carregar Champions.",true);
        });
    });
})();
