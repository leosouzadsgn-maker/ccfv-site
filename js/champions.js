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

    function renderClubs(serverRows = []) {
        const bySlug = new Map(
            serverRows.map(row => [
                String(
                    row.slug ||
                    ""
                ).toLowerCase(),
                row
            ])
        );

        document.querySelector("#clubs").innerHTML =
            CLUBS.map(([name,country,slug],index) => {
                const row =
                    bySlug.get(slug) ||
                    {};

                return `
                    <article class="club">
                        <span>${String(index + 1).padStart(2,"0")}</span>

                        <img
                            src="../assets/images/champions/clubs/${slug}.png"
                            alt="${esc(name)}"
                            loading="lazy"
                        >

                        <div>
                            <h4>${esc(name)}</h4>
                            <p>${esc(country)}</p>
                        </div>

                        <small>
                            ${esc(
                                row.participant_name ||
                                "A DEFINIR"
                            )}
                        </small>
                    </article>
                `;
            }).join("");
    }

    function renderGroups(rows = []) {
        const letters = "ABCDEFGH".split("");

        document.querySelector("#groups").innerHTML =
            letters.map(letter => {

                const serverRows =
                    rows
                        .filter(
                            row =>
                                row.group_code ===
                                letter
                        )
                        .sort(
                            (a,b) =>
                                Number(
                                    a.position ||
                                    99
                                ) -
                                Number(
                                    b.position ||
                                    99
                                )
                        );

                const data =
                    serverRows.length
                        ? serverRows
                        : [1,2,3,4].map(
                            position => ({
                                position,
                                club_name:
                                    "A DEFINIR",
                                logo_path:
                                    "",
                                points:
                                    0,
                                goal_difference:
                                    0,
                                qualified:
                                    false
                            })
                        );

                return `
                    <article class="group-public">
                        <header>
                            <strong>GRUPO ${letter}</strong>
                            <span>TOP 2 AVANÇA</span>
                        </header>

                        <div class="group-table">
                            <div class="group-head">
                                <span>#</span>
                                <span></span>
                                <span>CLUBE</span>
                                <span>PTS</span>
                                <span>SG</span>
                            </div>

                            ${
                                data.map(row => `
                                    <div class="
                                        group-row
                                        ${
                                            row.club_name &&
                                            row.club_name !==
                                            "A DEFINIR"
                                                ? "filled"
                                                : ""
                                        }
                                    ">
                                        <span>
                                            ${esc(
                                                row.position
                                            )}
                                        </span>

                                        ${
                                            row.logo_path
                                                ? `
                                                    <img
                                                        src="${esc(
                                                            row.logo_path
                                                        )}"
                                                        alt=""
                                                    >
                                                  `
                                                : `
                                                    <span class="slot">
                                                        —
                                                    </span>
                                                  `
                                        }

                                        <span>
                                            ${esc(
                                                row.club_name ||
                                                "A DEFINIR"
                                            )}
                                        </span>

                                        <strong>
                                            ${esc(
                                                row.points ??
                                                0
                                            )}
                                        </strong>

                                        <strong>
                                            ${esc(
                                                row.goal_difference ??
                                                0
                                            )}
                                        </strong>
                                    </div>
                                `).join("")
                            }
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

        document.querySelector("#knockout").innerHTML =
            phases.map(
                ([phase,label,count]) => {

                    const rows =
                        matches.filter(
                            match =>
                                match.phase ===
                                phase
                        );

                    const data =
                        rows.length
                            ? rows
                            : Array.from(
                                {
                                    length:
                                        count
                                },
                                () => ({
                                    home_club_name:
                                        "A DEFINIR",
                                    away_club_name:
                                        "A DEFINIR",
                                    home_logo_path:
                                        "",
                                    away_logo_path:
                                        "",
                                    home_score:
                                        null,
                                    away_score:
                                        null,
                                    status:
                                        "SCHEDULED"
                                })
                            );

                    return `
                        <article class="ko">

                            <header>
                                <span>
                                    CCFV // ${label}
                                </span>

                                <strong>
                                    ${label}
                                </strong>
                            </header>

                            <div class="ko-body">
                                ${
                                    data.map(
                                        match => {

                                            const finished =
                                                [
                                                    "VALIDATED",
                                                    "WO",
                                                    "ADMIN_DECISION"
                                                ].includes(
                                                    match.status
                                                );

                                            return `
                                                <div class="ko-match">

                                                    <div class="ko-team">

                                                        ${
                                                            match.home_logo_path
                                                                ? `
                                                                    <img
                                                                        src="${esc(
                                                                            match.home_logo_path
                                                                        )}"
                                                                        alt=""
                                                                    >
                                                                  `
                                                                : `
                                                                    <span class="ko-slot">
                                                                        —
                                                                    </span>
                                                                  `
                                                        }

                                                        <span>
                                                            ${esc(
                                                                match.home_club_name ||
                                                                "A DEFINIR"
                                                            )}
                                                        </span>

                                                        <strong>
                                                            ${
                                                                finished
                                                                    ? esc(
                                                                        match.home_score
                                                                      )
                                                                    : "—"
                                                            }
                                                        </strong>

                                                    </div>

                                                    <div class="ko-team">

                                                        ${
                                                            match.away_logo_path
                                                                ? `
                                                                    <img
                                                                        src="${esc(
                                                                            match.away_logo_path
                                                                        )}"
                                                                        alt=""
                                                                    >
                                                                  `
                                                                : `
                                                                    <span class="ko-slot">
                                                                        —
                                                                    </span>
                                                                  `
                                                        }

                                                        <span>
                                                            ${esc(
                                                                match.away_club_name ||
                                                                "A DEFINIR"
                                                            )}
                                                        </span>

                                                        <strong>
                                                            ${
                                                                finished
                                                                    ? esc(
                                                                        match.away_score
                                                                      )
                                                                    : "—"
                                                            }
                                                        </strong>

                                                    </div>

                                                </div>
                                            `;

                                        }
                                    ).join("")
                                }
                            </div>

                        </article>
                    `;

                }
            ).join("");
    }

    async function load() {
        /*
         * Estrutura fixa primeiro:
         * a página nunca fica vazia.
         */
        renderClubs();
        renderGroups();
        renderKnockout();

        if (
            !window.CCFVAuth?.getClient
        ) {
            return;
        }

        let client;

        try {
            client =
                await window.CCFVAuth.getClient();
        } catch {
            return;
        }

        try {

            const clubs =
                await client
                    .from(
                        "championship_public_clubs"
                    )
                    .select("*")
                    .eq(
                        "championship_id",
                        "00000000-0000-0000-0000-000000000000"
                    );

            /*
             * Descoberta do ID por leitura da view pública.
             */
            let rows =
                clubs.data || [];

            if (
                !rows.length
            ) {

                const fallback =
                    await client
                        .from(
                            "championship_public_clubs"
                        )
                        .select("*")
                        .order(
                            "sort_order"
                        );

                if (
                    fallback.error
                ) {
                    return;
                }

                rows =
                    fallback.data || [];

            }

            renderClubs(rows);

            if (
                !rows.length
            ) {
                return;
            }

            const championshipId =
                rows[0].championship_id;

            const [
                standings,
                matches
            ] =
                await Promise.all([

                    client
                        .from(
                            "championship_public_standings"
                        )
                        .select("*")
                        .eq(
                            "championship_id",
                            championshipId
                        )
                        .order(
                            "group_code"
                        )
                        .order(
                            "position"
                        ),

                    client
                        .from(
                            "championship_public_matches"
                        )
                        .select("*")
                        .eq(
                            "championship_id",
                            championshipId
                        )
                        .order(
                            "phase"
                        )
                        .order(
                            "match_number"
                        )

                ]);

            const standingRows =
                standings.error
                    ? []
                    : (
                        standings.data ||
                        []
                    );

            const matchRows =
                matches.error
                    ? []
                    : (
                        matches.data ||
                        []
                    );

            const participants =
                new Set(
                    rows
                        .map(
                            row =>
                                row.participant_id
                        )
                        .filter(
                            Boolean
                        )
                ).size;

            const occupied =
                rows.filter(
                    row =>
                        row.participant_id
                ).length;

            document.querySelector(
                "#participants"
            ).textContent =
                `${participants} / 32`;

            document.querySelector(
                "#occupied"
            ).textContent =
                `${occupied} / 32`;

            document.querySelector(
                "#phase"
            ).textContent =
                matchRows.length
                    ? "EM ANDAMENTO"
                    : "INSCRIÇÕES";

            document.querySelector(
                "#season-status"
            ).textContent =
                matchRows.length
                    ? "EM ANDAMENTO"
                    : "AGUARDANDO INSCRIÇÕES";

            renderGroups(
                standingRows
            );

            renderKnockout(
                matchRows
            );

            const groupMatches =
                matchRows.filter(
                    match =>
                        match.phase ===
                        "GROUP_STAGE"
                );

            document.querySelector(
                "#group-matches"
            ).innerHTML = `
                <strong>
                    ${
                        groupMatches.length ||
                        48
                    }
                    JOGOS
                </strong>
                <span>
                    ${
                        groupMatches.length
                            ? "CALENDÁRIO GERADO"
                            : "AGUARDANDO SORTEIO DOS GRUPOS"
                    }
                </span>
            `;

            const final =
                matchRows.find(
                    match =>
                        match.phase ===
                            "FINAL"
                        &&
                        [
                            "VALIDATED",
                            "WO",
                            "ADMIN_DECISION"
                        ].includes(
                            match.status
                        )
                );

            if (
                final?.winner_club_name
            ) {
                document.querySelector(
                    "#champion"
                ).textContent =
                    final.winner_club_name;
            }

        }
        catch (
            error
        ) {
            console.warn(
                "CCFV // Champions public load:",
                error
            );
        }
    }

    window.addEventListener(
        "DOMContentLoaded",
        load
    );

})();
