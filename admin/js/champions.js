(() => {
    "use strict";

    const state = {
        db: null,
        championshipId: null,
        clubs: [],
        standings: [],
        matches: [],
        history: []
    };

    const esc = value => String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

    const phases = {
        GROUP_STAGE:"GRUPOS",
        ROUND_OF_16:"OITAVAS",
        QUARTERFINALS:"QUARTAS",
        SEMIFINALS:"SEMIFINAIS",
        FINAL:"FINAL"
    };

    async function db() {
        if (state.db) return state.db;
        if (!window.CCFVAuth?.getClient) {
            throw new Error("Autenticação CCFV indisponível.");
        }
        state.db = await window.CCFVAuth.getClient();
        return state.db;
    }

    function showMessage(text,error=false) {
        const el = document.querySelector("#message");
        el.hidden = false;
        el.classList.toggle("error",error);
        el.textContent = text;
    }

    async function load() {
        const client = await db();

        const clubsResult = await client
            .from("championship_public_clubs")
            .select("*")
            .eq("championship_id", state.championshipId || "00000000-0000-0000-0000-000000000000")
            .order("sort_order");

        /*
         * Na primeira carga ainda não sabemos o ID.
         * Por isso fazemos uma segunda query sem filtro apenas
         * na view pública.
         */
        let clubs = clubsResult.error ? null : clubsResult.data;

        if (!clubs?.length) {
            const fallback = await client
                .from("championship_public_clubs")
                .select("*")
                .order("sort_order");

            if (fallback.error) {
                throw fallback.error;
            }

            clubs = fallback.data || [];
        }

        state.clubs = clubs;
        state.championshipId = clubs[0]?.championship_id || null;

        if (!state.championshipId) {
            render();
            return;
        }

        const [standings,matches] = await Promise.all([
            client.from("championship_public_standings")
                .select("*")
                .eq("championship_id",state.championshipId)
                .order("group_code")
                .order("position"),

            client.from("championship_public_matches")
                .select("*")
                .eq("championship_id",state.championshipId)
                .order("phase")
                .order("match_number")
        ]);

        state.standings = standings.error ? [] : (standings.data || []);
        state.matches = matches.error ? [] : (matches.data || []);

        render();
    }

    function render() {
        const occupied = state.clubs.filter(c => c.participant_id).length;
        const participants = new Set(state.clubs.map(c => c.participant_id).filter(Boolean)).size;

        document.querySelector("#k-participants").textContent =
            `${participants} / 32`;

        document.querySelector("#k-occupied").textContent =
            `${occupied} / 32`;

        document.querySelector("#k-matches").textContent =
            String(state.matches.length);

        document.querySelector("#k-phase").textContent =
            state.matches.length ? "EM ANDAMENTO" : "INSCRIÇÕES";

        renderClubs();
        renderPots();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderHistory();
    }

    function renderClubs() {
        document.querySelector("#clubs-table").innerHTML =
            state.clubs.map((club,index) => `
                <tr>
                    <td>
                        <img src="${esc(club.logo_path || "")}" alt="" loading="lazy">
                    </td>
                    <td><strong>${esc(club.name || "A DEFINIR")}</strong></td>
                    <td>${esc(club.country || "—")}</td>
                    <td>${esc(club.participant_name || "A DEFINIR")}</td>
                    <td>${esc(club.status || "AVAILABLE")}</td>
                    <td>${esc(club.pot_number ?? "—")}</td>
                </tr>
            `).join("");
    }

    function renderPots() {
        document.querySelector("#pots").innerHTML =
            [1,2,3,4].map(n => {
                const total = state.clubs.filter(c => Number(c.pot_number) === n).length;
                return `
                    <div class="pot">
                        <strong>${total || 8}</strong>
                        <span>POTE ${n}</span>
                    </div>
                `;
            }).join("");
    }

    function renderGroups() {
        const letters = "ABCDEFGH".split("");
        document.querySelector("#groups").innerHTML = letters.map(letter => {
            const rows = state.standings.filter(s => s.group_code === letter);

            const data = rows.length
                ? rows
                : [1,2,3,4].map(pos => ({
                    position:pos,
                    club_name:"A DEFINIR",
                    logo_path:"",
                    points:0,
                    goal_difference:0
                }));

            return `
                <article class="group">
                    <header>
                        <strong>GRUPO ${letter}</strong>
                        <span>TOP 2 AVANÇA</span>
                    </header>

                    ${data.map(row => `
                        <div class="group-row">
                            <span>${esc(row.position)}</span>
                            ${
                                row.logo_path
                                    ? `<img src="${esc(row.logo_path)}" alt="">`
                                    : `<i>—</i>`
                            }
                            <strong>${esc(row.club_name || "A DEFINIR")}</strong>
                            <small>${esc(row.points ?? 0)} PTS</small>
                            <small>${esc(row.goal_difference ?? 0)} SG</small>
                        </div>
                    `).join("")}
                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        const phase = document.querySelector("#phase").value;
        const rows = state.matches.filter(m => m.phase === phase);
        const container = document.querySelector("#matches");

        if (!rows.length) {
            container.innerHTML = `
                <article class="card empty">
                    Nenhuma partida gerada para esta fase.
                </article>
            `;
            return;
        }

        container.innerHTML = rows.map(match => {
            const finished =
                ["VALIDATED","WO","ADMIN_DECISION"].includes(match.status);

            return `
                <article class="match">
                    <div class="team">
                        <img src="${esc(match.home_logo_path || "")}" alt="">
                        <span>${esc(match.home_club_name || "A DEFINIR")}</span>
                    </div>

                    <div class="match-score">
                        <strong>${
                            finished
                                ? `${esc(match.home_score)} × ${esc(match.away_score)}`
                                : "VS"
                        }</strong>
                        <small>${esc(phases[match.phase] || match.phase)}</small>
                    </div>

                    <div class="team right">
                        <span>${esc(match.away_club_name || "A DEFINIR")}</span>
                        <img src="${esc(match.away_logo_path || "")}" alt="">
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderKnockout() {
        document.querySelector("#knockout").innerHTML =
            [
                ["ROUND_OF_16","OITAVAS",8],
                ["QUARTERFINALS","QUARTAS",4],
                ["SEMIFINALS","SEMIFINAIS",2],
                ["FINAL","FINAL",1]
            ].map(([phase,label,count]) => {

                const rows = state.matches.filter(m => m.phase === phase);

                const data = rows.length
                    ? rows
                    : Array.from({length:count},() => ({
                        home_club_name:"A DEFINIR",
                        away_club_name:"A DEFINIR",
                        home_score:null,
                        away_score:null,
                        status:"SCHEDULED",
                        home_logo_path:"",
                        away_logo_path:""
                    }));

                return `
                    <article class="ko-col">
                        <header>
                            <span>CCFV // ${label}</span>
                            <strong>${label}</strong>
                        </header>

                        ${data.map(match => `
                            <div class="ko-match">
                                <div>
                                    <span>${esc(match.home_club_name)}</span>
                                    <strong>${match.status === "VALIDATED" ? esc(match.home_score) : "—"}</strong>
                                </div>
                                <div>
                                    <span>${esc(match.away_club_name)}</span>
                                    <strong>${match.status === "VALIDATED" ? esc(match.away_score) : "—"}</strong>
                                </div>
                            </div>
                        `).join("")}
                    </article>
                `;
            }).join("");
    }

    function renderHistory() {
        document.querySelector("#history").innerHTML =
            `<tr><td colspan="6">O histórico será preenchido ao encerrar a Season 01.</td></tr>`;
    }

    async function runRPC(name,args) {
        const client = await db();
        showMessage(`Executando ${name}...`);

        const {data,error} = await client.rpc(name,args);
        if (error) throw error;

        showMessage(`${name} concluída.`);
        await load();
        return data;
    }

    function bind() {
        document.querySelectorAll("[data-tab]").forEach(link => {
            link.addEventListener("click",e => {
                e.preventDefault();

                document.querySelectorAll("[data-tab]")
                    .forEach(x => x.classList.toggle("active",x === link));

                document.querySelectorAll(".cl-tab")
                    .forEach(panel => panel.classList.toggle("active",panel.dataset.panel === link.dataset.tab));

                history.replaceState(null,"",`#${link.dataset.tab}`);
            });
        });

        document.querySelector("#phase")
            .addEventListener("change",renderMatches);

        document.querySelector("#refresh")
            .addEventListener("click",() => load().catch(e => showMessage(e.message,true)));

        document.body.addEventListener("click",async e => {
            const action = e.target.closest("[data-action]");
            if (!action) return;

            try {
                if (!state.championshipId) {
                    throw new Error("Season 01 não encontrada.");
                }

                switch(action.dataset.action) {
                    case "prepare":
                        await runRPC("champions_prepare_pots",{
                            p_championship_id:state.championshipId,
                            p_force:false
                        });
                        break;
                    case "draw":
                        await runRPC("champions_draw_groups",{
                            p_championship_id:state.championshipId,
                            p_force:false
                        });
                        break;
                    case "group-matches":
                        await runRPC("champions_generate_group_matches",{
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
                showMessage(error.message || String(error),true);
            }
        });
    }

    window.addEventListener("DOMContentLoaded",() => {
        bind();
        load().catch(error => {
            console.error(error);
            showMessage(error.message || "Falha ao carregar Champions.",true);
        });
    });
})();
