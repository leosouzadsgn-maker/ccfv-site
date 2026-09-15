(() => {
    "use strict";

    const CLUBS = [
        ["AJAX","HOLANDA","ajax"],
        ["ANDERLECHT","BÉLGICA","anderlecht"],
        ["ARSENAL","INGLATERRA","arsenal"],
        ["ATLÉTICO DE MADRID","ESPANHA","atletico_madrid"],
        ["BARCELONA","ESPANHA","barcelona"],
        ["BENFICA","PORTUGAL","benfica"],
        ["BEŞİKTAŞ","TURQUIA","besiktas"],
        ["BRAGA","PORTUGAL","braga"],
        ["CELTIC","ESCÓCIA","celtic"],
        ["CHELSEA","INGLATERRA","chelsea"],
        ["CLUB BRUGGE","BÉLGICA","club_brugge"],
        ["FENERBAHÇE","TURQUIA","fenerbahce"],
        ["FEYENOORD","HOLANDA","feyenoord"],
        ["GALATASARAY","TURQUIA","galatasaray"],
        ["INTER DE MILÃO","ITÁLIA","inter_milao"],
        ["JUVENTUS","ITÁLIA","juventus"],
        ["LAZIO","ITÁLIA","lazio"],
        ["LIVERPOOL","INGLATERRA","liverpool"],
        ["LYON","FRANÇA","lyon"],
        ["MANCHESTER CITY","INGLATERRA","manchester_city"],
        ["MANCHESTER UNITED","INGLATERRA","manchester_united"],
        ["MARSEILLE","FRANÇA","marseille"],
        ["MILAN","ITÁLIA","milan"],
        ["MONACO","FRANÇA","monaco"],
        ["NAPOLI","ITÁLIA","napoli"],
        ["PORTO","PORTUGAL","porto"],
        ["PSG","FRANÇA","psg"],
        ["PSV","HOLANDA","psv"],
        ["RANGERS","ESCÓCIA","rangers"],
        ["REAL MADRID","ESPANHA","real_madrid"],
        ["ROMA","ITÁLIA","roma"],
        ["SPORTING CP","PORTUGAL","sporting"]
    ];

    const esc = value => String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

    function renderClubCatalog(serverClubs = []) {
        const lookup = new Map(
            serverClubs.map(c => [
                String(c.slug || c.club_slug || c.club_name || c.name || "").toLowerCase(),
                c
            ])
        );

        const container = document.querySelector("#champions-clubs-grid");

        container.innerHTML = CLUBS.map(([name,country,slug],index) => {
            const server = lookup.get(slug) || {};
            const coach = server.participant_name || "A DEFINIR";

            return `
                <article class="ccfv-champions-club">
                    <div>${String(index+1).padStart(2,"0")}</div>
                    <img src="../assets/images/champions/clubs/${slug}.png" alt="${esc(name)}" loading="lazy">
                    <div>
                        <h4>${esc(name)}</h4>
                        <p>${esc(country)}</p>
                    </div>
                    <small>${esc(coach)}</small>
                </article>
            `;
        }).join("");
    }

    function renderGroups(rows = []) {
        const letters = ["A","B","C","D","E","F","G","H"];
        const container = document.querySelector("#champions-groups");

        container.innerHTML = letters.map(letter => {
            const serverRows = rows
                .filter(row => row.group_code === letter)
                .sort((a,b) => Number(a.position||99)-Number(b.position||99));

            const data = serverRows.length
                ? serverRows
                : [1,2,3,4].map(position => ({
                    position,
                    club_name:"A DEFINIR",
                    points:0,
                    goal_difference:0,
                    logo_path:""
                }));

            return `
                <article class="ccfv-champions-group">
                    <div class="ccfv-champions-group-head">
                        <h3>GRUPO ${letter}</h3>
                        <span>TOP 2 AVANÇA</span>
                    </div>
                    <div class="ccfv-group-table">
                        <div class="ccfv-group-head">
                            <span>#</span><span></span><span>CLUBE</span><span>PTS</span><span>SG</span>
                        </div>
                        ${data.map(row => `
                            <div class="ccfv-group-row ${row.club_name && row.club_name !== "A DEFINIR" ? "is-filled" : ""}">
                                <span>${esc(row.position)}</span>
                                ${
                                    row.logo_path
                                    ? `<img src="${esc(row.logo_path)}" alt="">`
                                    : `<span class="slot-logo">—</span>`
                                }
                                <span>${esc(row.club_name || "A DEFINIR")}</span>
                                <strong>${esc(row.points ?? 0)}</strong>
                                <strong>${esc(row.goal_difference ?? 0)}</strong>
                            </div>
                        `).join("")}
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderKnockout(matches = []) {
        const phases = [
            ["ROUND_OF_16","OITAVAS",8],
            ["QUARTERFINALS","QUARTAS",4],
            ["SEMIFINALS","SEMIFINAIS",2],
            ["FINAL","FINAL",1]
        ];

        const container = document.querySelector("#knockout");

        container.innerHTML = phases.map(([phase,label,count]) => {
            const rows = matches.filter(m => m.phase === phase);

            const data = rows.length
                ? rows
                : Array.from({length:count},(_,i) => ({
                    home_club_name:"A DEFINIR",
                    away_club_name:"A DEFINIR",
                    home_score:null,
                    away_score:null,
                    status:"SCHEDULED",
                    home_logo_path:"",
                    away_logo_path:""
                }));

            return `
                <article class="ccfv-ko-col">
                    <div class="ccfv-ko-title">
                        <span>CCFV // ${label}</span>
                        <strong>${label}</strong>
                    </div>
                    <div class="ccfv-ko-body">
                        ${data.map(match => {
                            const finished = ["VALIDATED","WO","ADMIN_DECISION"].includes(match.status);
                            return `
                                <div class="ccfv-ko-match">
                                    <div class="ccfv-ko-team">
                                        ${
                                            match.home_logo_path
                                            ? `<img src="${esc(match.home_logo_path)}" alt="">`
                                            : `<span class="ccfv-ko-slot-logo">—</span>`
                                        }
                                        <span>${esc(match.home_club_name || "A DEFINIR")}</span>
                                        <strong>${finished ? esc(match.home_score) : "—"}</strong>
                                    </div>
                                    <div class="ccfv-ko-team">
                                        ${
                                            match.away_logo_path
                                            ? `<img src="${esc(match.away_logo_path)}" alt="">`
                                            : `<span class="ccfv-ko-slot-logo">—</span>`
                                        }
                                        <span>${esc(match.away_club_name || "A DEFINIR")}</span>
                                        <strong>${finished ? esc(match.away_score) : "—"}</strong>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </article>
            `;
        }).join("");
    }

    async function load() {
        renderClubCatalog();
        renderGroups();
        renderKnockout();

        if (!window.CCFVAuth?.getClient) return;

        let db;

        try {
            db = await window.CCFVAuth.getClient();
        } catch {
            return;
        }

        try {
            const clubs = await db
                .from("championship_public_clubs")
                .select("*")
                .order("club_name");

            const rows = clubs.data || [];

            renderClubCatalog(rows);

            if (!rows.length) return;

            const championshipId = rows[0].championship_id;

            const [standings,matches] = await Promise.all([
                db.from("championship_public_standings")
                    .select("*")
                    .eq("championship_id",championshipId)
                    .order("group_code")
                    .order("position"),

                db.from("championship_public_matches")
                    .select("*")
                    .eq("championship_id",championshipId)
                    .order("match_number")
            ]);

            const standingsRows = standings.error ? [] : (standings.data || []);
            const matchRows = matches.error ? [] : (matches.data || []);

            const participants = new Set(
                rows.map(row => row.participant_id).filter(Boolean)
            ).size;

            const occupied = rows.filter(
                row => row.participant_id
            ).length;

            document.querySelector("#live-participants").textContent =
                `${participants} / 32`;

            document.querySelector("#live-occupied").textContent =
                `${occupied} / 32`;

            document.querySelector("#live-phase").textContent =
                matchRows.length ? "EM ANDAMENTO" : "INSCRIÇÕES";

            document.querySelector("#champions-live-status").textContent =
                matchRows.length ? "EM ANDAMENTO" : "AGUARDANDO INSCRIÇÕES";

            renderGroups(standingsRows);
            renderKnockout(matchRows);

            const groupMatches = matchRows.filter(
                m => m.phase === "GROUP_STAGE"
            );

            document.querySelector("#matches-placeholder").innerHTML = `
                <strong>${groupMatches.length || 48} JOGOS</strong>
                <span>${
                    groupMatches.length
                    ? "CALENDÁRIO DA FASE DE GRUPOS GERADO"
                    : "AGUARDANDO SORTEIO DOS GRUPOS"
                }</span>
            `;

            const final = matchRows.find(
                m =>
                    m.phase === "FINAL"
                    &&
                    ["VALIDATED","WO","ADMIN_DECISION"].includes(m.status)
            );

            if (final?.winner_club_name) {
                document.querySelector("#champion-name").textContent =
                    final.winner_club_name;
                document.querySelector("#champion-club").textContent =
                    "CAMPEÃO OFICIAL DA CHAMPIONS LEAGUE.";
            }

        } catch(error) {
            console.warn("CCFV Champions public:",error);
            // Estrutura fixa continua visível.
        }
    }

    window.addEventListener("DOMContentLoaded",load);
})();
