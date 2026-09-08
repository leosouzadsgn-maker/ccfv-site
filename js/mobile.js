(() => {

    "use strict";


    /* =========================================================
       CCFV // MOBILE
       SISTEMA MOBILE OFICIAL
       ========================================================= */


    /* =========================================================
       CONFIGURAÇÃO SUPABASE
       ========================================================= */

    const SUPABASE_URL =
        "https://hfiwndvshzorikfzkiiw.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_VykAaaP_0PfIW_n4HYHbTA_VlvrkjMu";


    /* =========================================================
       20 CLUBES
       ========================================================= */

    const TEAMS = [

        "ATHLETICO-PR",
        "ATLÉTICO-MG",
        "BAHIA",
        "BOTAFOGO",
        "BRAGANTINO",
        "CHAPECOENSE",
        "CORINTHIANS",
        "CORITIBA",
        "CRUZEIRO",
        "FLAMENGO",
        "FLUMINENSE",
        "GRÊMIO",
        "INTERNACIONAL",
        "MIRASSOL",
        "PALMEIRAS",
        "REMO",
        "SANTOS",
        "SÃO PAULO",
        "VASCO",
        "VITÓRIA"

    ];


    /* =========================================================
       ESCUDOS
       ========================================================= */

    const CLUB_SLUG = {

        "ATHLETICO-PR": "athletico-pr",
        "ATLÉTICO-MG": "atletico-mg",
        "BAHIA": "bahia",
        "BOTAFOGO": "botafogo",
        "BRAGANTINO": "bragantino",
        "CHAPECOENSE": "chapecoense",
        "CORINTHIANS": "corinthians",
        "CORITIBA": "coritiba",
        "CRUZEIRO": "cruzeiro",
        "FLAMENGO": "flamengo",
        "FLUMINENSE": "fluminense",
        "GRÊMIO": "gremio",
        "INTERNACIONAL": "internacional",
        "MIRASSOL": "mirassol",
        "PALMEIRAS": "palmeiras",
        "REMO": "remo",
        "SANTOS": "santos",
        "SÃO PAULO": "sao-paulo",
        "VASCO": "vasco",
        "VITÓRIA": "vitoria"

    };


    /* =========================================================
       ELOS
       ========================================================= */

    const ELOS = [

        {
            key: "beginner",
            name: "INICIANTE",
            min: 0,
            max: 999
        },

        {
            key: "amateur",
            name: "AMADOR",
            min: 1000,
            max: 1999
        },

        {
            key: "professional",
            name: "PROFISSIONAL",
            min: 2000,
            max: 2999
        },

        {
            key: "legend",
            name: "LENDA",
            min: 3000,
            max: Infinity
        }

    ];


    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

    const esc = value =>

        String(
            value ?? ""
        )

            .replaceAll(
                "&",
                "&amp;"
            )

            .replaceAll(
                "<",
                "&lt;"
            )

            .replaceAll(
                ">",
                "&gt;"
            )

            .replaceAll(
                '"',
                "&quot;"
            )

            .replaceAll(
                "'",
                "&#039;"
            );


    const norm = value =>

        String(
            value ?? ""
        )

            .normalize(
                "NFD"
            )

            .replace(
                /[\u0300-\u036f]/g,
                ""
            )

            .trim()

            .toUpperCase();


    const num = value =>

        Number.isFinite(
            Number(value)
        )
            ? Number(value)
            : 0;


    const isFinal = status =>

        /FINAL|FINISHED|COMPLETED|CONCL|ENCERR|FINALIZ/i.test(
            String(
                status || ""
            )
        );


    const teamLogo = team =>

        `../assets/images/clubs/${
            CLUB_SLUG[team] || ""
        }.png`;


    /* =========================================================
       ESTADO
       ========================================================= */

    let client = null;

    let matches = [];

    let ranking = [];


    /* =========================================================
       SUPABASE
       ========================================================= */

    async function getClient() {

        if (
            client
        ) {

            return client;

        }


        if (
            !window.supabase?.createClient
        ) {

            throw new Error(
                "Supabase indisponível."
            );

        }


        client =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_KEY
            );


        return client;

    }


    async function rpc(
        name,
        args = {}
    ) {

        const c =
            await getClient();


        const {
            data,
            error
        } =
            await c.rpc(
                name,
                args
            );


        if (
            error
        ) {

            throw error;

        }


        return data || [];

    }


    async function loadMatches() {

        matches =
            await rpc(
                "get_ccfv_mobile_matches"
            );


        return matches;

    }


    async function loadRanking() {

        ranking =
            await rpc(
                "get_ccfv_mobile_ranking"
            );


        return ranking;

    }


    /* =========================================================
       BRASILEIRÃO MOBILE
       38 RODADAS / 380 JOGOS
       ========================================================= */


    function generateSchedule() {

        const rounds = [];


        let rotating = [

            ...TEAMS

        ];


        for (
            let r = 0;
            r < 19;
            r++
        ) {

            const round = [];


            for (
                let i = 0;
                i < 10;
                i++
            ) {

                const a =
                    rotating[i];


                const b =
                    rotating[
                        rotating.length -
                        1 -
                        i
                    ];


                round.push({

                    home:
                        r % 2 === 0
                            ? a
                            : b,

                    away:
                        r % 2 === 0
                            ? b
                            : a,

                    round:
                        r + 1,

                    index:
                        i + 1

                });

            }


            rounds.push(
                round
            );


            rotating = [

                rotating[0],

                rotating[
                    rotating.length -
                    1
                ],

                ...rotating.slice(
                    1,
                    -1
                )

            ];

        }


        const secondHalf =
            rounds.map(

                (
                    round,
                    index
                ) => {

                    return round.map(

                        game => ({

                            ...game,

                            home:
                                game.away,

                            away:
                                game.home,

                            round:
                                index + 20

                        })

                    );

                }

            );


        return [

            ...rounds,

            ...secondHalf

        ].flat();

    }


    const SCHEDULE =
        generateSchedule();


    function normalizeCompetition(
        value
    ) {

        return norm(
            value
        )

            .replaceAll(
                " ",
                "_"
            )

            .replaceAll(
                "-",
                "_"
            );

    }


    function isMobileBrazilMatch(
        match
    ) {

        return (

            normalizeCompetition(
                match?.competition
            ) ===
            "BRASILEIRAO_MOBILE"

        );

    }


    function resultForFixture(
        fixture
    ) {

        return matches.find(
            match => {

                return (

                    isMobileBrazilMatch(
                        match
                    )

                    &&

                    num(
                        match.round_number
                    ) ===
                    Number(
                        fixture.round
                    )

                    &&

                    norm(
                        match.home_team
                    ) ===
                    norm(
                        fixture.home
                    )

                    &&

                    norm(
                        match.away_team
                    ) ===
                    norm(
                        fixture.away
                    )

                );

            }
        ) || null;

    }


    function fixturesForRound(
        round
    ) {

        return SCHEDULE

            .filter(

                fixture =>

                    Number(
                        fixture.round
                    ) ===
                    Number(
                        round
                    )

            )

            .map(

                (
                    fixture,
                    index
                ) => ({

                    ...fixture,

                    number:
                        index + 1,

                    result:
                        resultForFixture(
                            fixture
                        )

                })

            );

    }


    /* =========================================================
       CLASSIFICAÇÃO MOBILE
       IMPORTANTE:
       QUALQUER PARTIDA MOBILE FINALIZADA
       JÁ CONTA, MESMO SE FOR DE OUTRA RODADA.
       ========================================================= */

    function standingsForRound() {

        const rows =

            TEAMS.map(

                team => ({

                    team,

                    j: 0,

                    v: 0,

                    e: 0,

                    d: 0,

                    gp: 0,

                    gc: 0,

                    pts: 0

                })

            );


        const by =

            new Map(

                rows.map(

                    row => [

                        norm(
                            row.team
                        ),

                        row

                    ]

                )

            );


        for (
            const match
            of matches
        ) {

            if (
                !isMobileBrazilMatch(
                    match
                )
            ) {

                continue;

            }


            if (
                !isFinal(
                    match.status
                )
            ) {

                continue;

            }


            const home =
                by.get(
                    norm(
                        match.home_team
                    )
                );


            const away =
                by.get(
                    norm(
                        match.away_team
                    )
                );


            if (
                !home ||
                !away
            ) {

                continue;

            }


            const homeScore =
                num(
                    match.home_score
                );


            const awayScore =
                num(
                    match.away_score
                );


            home.j += 1;

            away.j += 1;


            home.gp +=
                homeScore;

            home.gc +=
                awayScore;


            away.gp +=
                awayScore;

            away.gc +=
                homeScore;


            if (
                homeScore >
                awayScore
            ) {

                home.v += 1;

                away.d += 1;

                home.pts += 3;

            }

            else if (
                homeScore <
                awayScore
            ) {

                away.v += 1;

                home.d += 1;

                away.pts += 3;

            }

            else {

                home.e += 1;

                away.e += 1;

                home.pts += 1;

                away.pts += 1;

            }

        }


        return rows

            .sort(

                (
                    a,
                    b
                ) => {

                    const sgA =
                        a.gp -
                        a.gc;


                    const sgB =
                        b.gp -
                        b.gc;


                    return (

                        b.pts -
                        a.pts

                    )

                    ||

                    (

                        sgB -
                        sgA

                    )

                    ||

                    (

                        b.gp -
                        a.gp

                    )

                    ||

                    (

                        b.v -
                        a.v

                    )

                    ||

                    a.team.localeCompare(
                        b.team,
                        "pt-BR"
                    );

                }

            )

            .map(

                (
                    row,
                    index
                ) => ({

                    ...row,

                    sg:
                        row.gp -
                        row.gc,

                    position:
                        index + 1

                })

            );

    }


    /* =========================================================
       SELETOR DE RODADA
       ========================================================= */

    function renderRoundPicker(
        round = 1
    ) {

        const holder =
            document.querySelector(
                "#mobile-round-picker"
            );


        if (
            !holder
        ) {

            return;

        }


        holder.innerHTML = `

            <label
                class="ccfv-mobile-round-select"
            >

                <span>
                    VISUALIZAR ATÉ
                </span>

                <select
                    id="mobile-round-select"
                    aria-label="Selecionar rodada"
                >

                    ${Array.from(

                        {
                            length: 38
                        },

                        (
                            _,
                            index
                        ) => {

                            const value =
                                index + 1;


                            return `

                                <option
                                    value="${value}"
                                    ${
                                        value ===
                                        Number(
                                            round
                                        )
                                            ? "selected"
                                            : ""
                                    }
                                >

                                    RODADA ${
                                        String(
                                            value
                                        ).padStart(
                                            2,
                                            "0"
                                        )
                                    }

                                </option>

                            `;

                        }

                    ).join("")}

                </select>

            </label>

        `;


        const select =
            holder.querySelector(
                "#mobile-round-select"
            );


        if (
            select
        ) {

            select.addEventListener(
                "change",
                event => {

                    renderMobileBrasileirao(
                        Number(
                            event.target.value
                        )
                    );

                }
            );

        }

    }


    /* =========================================================
       TABELA MOBILE
       ========================================================= */

    function renderMobileBrasileiraoTable(
        table,
        round
    ) {

        const element =
            document.querySelector(
                "#mobile-standings"
            );


        if (
            !element
        ) {

            return;

        }


        element.innerHTML = `

            <div
                class="
                    ccfv-mobile-standing
                    ccfv-mobile-standing--head
                "
            >

                <span>
                    POS
                </span>

                <span>
                    CLUBE
                </span>

                <span>
                    J
                </span>

                <span>
                    V
                </span>

                <span>
                    E
                </span>

                <span>
                    D
                </span>

                <span>
                    GP
                </span>

                <span>
                    GC
                </span>

                <span>
                    SG
                </span>

                <strong>
                    PTS
                </strong>

            </div>


            ${table.map(

                row => `

                    <div
                        class="
                            ccfv-mobile-standing
                            ${
                                row.position === 1
                                    ? "is-first"
                                    : ""
                            }
                        "
                    >

                        <span>

                            ${String(
                                row.position
                            ).padStart(
                                2,
                                "0"
                            )}

                        </span>


                        <strong
                            class="
                                ccfv-mobile-standing__club
                            "
                        >

                            <img
                                src="${teamLogo(
                                    row.team
                                )}"
                                alt=""
                            >

                            ${esc(
                                row.team
                            )}

                        </strong>


                        <span>
                            ${row.j}
                        </span>

                        <span>
                            ${row.v}
                        </span>

                        <span>
                            ${row.e}
                        </span>

                        <span>
                            ${row.d}
                        </span>

                        <span>
                            ${row.gp}
                        </span>

                        <span>
                            ${row.gc}
                        </span>

                        <span>

                            ${
                                row.sg > 0
                                    ? `+${row.sg}`
                                    : row.sg
                            }

                        </span>


                        <strong>
                            ${row.pts}
                        </strong>

                    </div>

                `

            ).join("")}

        `;


        const title =
            document.querySelector(
                "#mobile-round-title"
            );


        if (
            title
        ) {

            title.innerHTML = `

                CLASSIFICAÇÃO

                <strong>

                    APÓS A RODADA
                    ${
                        String(
                            round
                        ).padStart(
                            2,
                            "0"
                        )
                    }.

                </strong>

            `;

        }

    }


    /* =========================================================
       JOGO MOBILE
       ========================================================= */

    function renderFixtureRow(
        game
    ) {

        const match =
            game.result;


        const finished =

            Boolean(

                match &&

                isFinal(
                    match.status
                )

            );


        return `

            <article
                class="
                    ccfv-mobile-fixture-card
                    ${
                        finished
                            ? "is-finished"
                            : ""
                    }
                "
            >

                <div
                    class="
                        ccfv-mobile-fixture-card__top
                    "
                >

                    <span>

                        JOGO
                        ${
                            String(
                                game.number
                            ).padStart(
                                2,
                                "0"
                            )
                        }

                    </span>


                    <span>

                        ${
                            finished
                                ? "FINALIZADA"
                                : "A DEFINIR"
                        }

                    </span>

                </div>


                <div
                    class="
                        ccfv-mobile-fixture-card__teams
                    "
                >

                    <div>

                        <img
                            src="${teamLogo(
                                game.home
                            )}"
                            alt=""
                        >

                        <strong>

                            ${esc(
                                game.home
                            )}

                        </strong>

                        <small>

                            ${
                                esc(
                                    match?.home_player_name ||
                                    "JOGADOR MOBILE"
                                )
                            }

                        </small>

                    </div>


                    <div
                        class="
                            ccfv-mobile-fixture-card__score
                        "
                    >

                        ${
                            finished

                                ? `

                                    ${num(
                                        match.home_score
                                    )}

                                    <span>
                                        ×
                                    </span>

                                    ${num(
                                        match.away_score
                                    )}

                                `

                                : `

                                    <span>
                                        VS
                                    </span>

                                `
                        }

                    </div>


                    <div>

                        <img
                            src="${teamLogo(
                                game.away
                            )}"
                            alt=""
                        >

                        <strong>

                            ${esc(
                                game.away
                            )}

                        </strong>

                        <small>

                            ${
                                esc(
                                    match?.away_player_name ||
                                    "JOGADOR MOBILE"
                                )
                            }

                        </small>

                    </div>

                </div>


                <div
                    class="
                        ccfv-mobile-fixture-card__bottom
                    "
                >

                    <span>

                        RODADA
                        ${
                            String(
                                game.round
                            ).padStart(
                                2,
                                "0"
                            )
                        }

                    </span>


                    <span>

                        ${
                            finished

                                ? new Date(
                                    match.played_at ||
                                    match.created_at ||
                                    Date.now()
                                ).toLocaleDateString(
                                    "pt-BR"
                                )

                                : "DATA A DEFINIR"
                        }

                    </span>

                </div>

            </article>

        `;

    }


    /* =========================================================
       DESTAQUE DA RODADA
       ========================================================= */

    function getFeaturedMobileMatch(
        games
    ) {

        const finished =
            games.filter(
                game =>
                    game.result &&
                    isFinal(
                        game.result.status
                    )
            );


        if (
            finished.length
        ) {

            return (
                [...finished].sort(

                    (
                        a,
                        b
                    ) => {

                        const ga =
                            num(
                                a.result.home_score
                            ) +
                            num(
                                a.result.away_score
                            );


                        const gb =
                            num(
                                b.result.home_score
                            ) +
                            num(
                                b.result.away_score
                            );


                        return gb - ga;

                    }

                )[0]

            );

        }


        return games[0] || null;

    }


    function renderRoundFixtures(
        round
    ) {

        const element =
            document.querySelector(
                "#mobile-round-matches"
            );


        if (
            !element
        ) {

            return;

        }


        const games =
            fixturesForRound(
                round
            );


        const featured =
            getFeaturedMobileMatch(
                games
            );


        element.innerHTML = `

            <div
                class="
                    ccfv-mobile-round-layout
                "
            >

                <div
                    class="
                        ccfv-mobile-round-games
                    "
                >

                    <div
                        class="
                            ccfv-mobile-fixtures-grid
                        "
                    >

                        ${games.map(
                            renderFixtureRow
                        ).join("")}

                    </div>

                </div>


                <aside
                    class="
                        ccfv-mobile-round-feature
                    "
                >

                    <div
                        class="
                            ccfv-mobile-round-feature__top
                        "
                    >

                        <span>
                            ★ DESTAQUE DA RODADA
                        </span>

                        <strong>
                            RODADA ${
                                String(
                                    round
                                ).padStart(
                                    2,
                                    "0"
                                )
                            }
                        </strong>

                    </div>


                    <div
                        class="
                            ccfv-mobile-round-feature__body
                        "
                    >

                        <span>
                            JOGO DA RODADA
                        </span>


                        ${
                            featured

                                ? `

                                    <div
                                        class="
                                            ccfv-mobile-round-feature__match
                                        "
                                    >

                                        <div>

                                            <img
                                                src="${teamLogo(
                                                    featured.home
                                                )}"
                                                alt=""
                                            >

                                            <strong>
                                                ${esc(
                                                    featured.home
                                                )}
                                            </strong>

                                            <small>
                                                CASA
                                            </small>

                                        </div>


                                        <div
                                            class="
                                                ccfv-mobile-round-feature__score
                                            "
                                        >

                                            ${
                                                featured.result &&
                                                isFinal(
                                                    featured.result.status
                                                )

                                                    ? `

                                                        ${num(
                                                            featured.result.home_score
                                                        )}

                                                        <span>
                                                            ×
                                                        </span>

                                                        ${num(
                                                            featured.result.away_score
                                                        )}

                                                    `

                                                    : `

                                                        <span>
                                                            VS
                                                        </span>

                                                    `
                                            }

                                        </div>


                                        <div>

                                            <img
                                                src="${teamLogo(
                                                    featured.away
                                                )}"
                                                alt=""
                                            >

                                            <strong>
                                                ${esc(
                                                    featured.away
                                                )}
                                            </strong>

                                            <small>
                                                FORA
                                            </small>

                                        </div>

                                    </div>

                                `

                                : `

                                    <div
                                        class="
                                            ccfv-mobile-round-feature__empty
                                        "
                                    >

                                        JOGO DA RODADA
                                        <br>
                                        A DEFINIR

                                    </div>

                                `

                        }

                    </div>


                    <div
                        class="
                            ccfv-mobile-round-feature__bottom
                        "
                    >

                        <span>
                            ${
                                featured?.result
                                    ?.played_at
                                    ? new Date(
                                        featured.result.played_at
                                    ).toLocaleDateString(
                                        "pt-BR"
                                    )
                                    : "DATA A DEFINIR"
                            }
                        </span>


                        <span>
                            21:00
                        </span>

                    </div>


                    <div
                        class="
                            ccfv-mobile-round-feature__button
                        "
                    >

                        VER CONFRONTO
                        <span>
                            →
                        </span>

                    </div>

                </aside>

            </div>

        `;


        updateMobileSeasonPanel(
            round,
            games
        );

    }


    /* =========================================================
       PAINEL DA TEMPORADA
       ========================================================= */

    function updateMobileSeasonPanel(
        round,
        games
    ) {

        const completed =

            matches

                .filter(
                    isMobileBrazilMatch
                )

                .filter(
                    match =>
                        isFinal(
                            match.status
                        )
                );


        const total =
            380;


        const played =
            Math.min(
                completed.length,
                total
            );


        const progress =
            total > 0

                ? Math.round(
                    (
                        played /
                        total
                    ) * 100
                )

                : 0;


        const progressText =
            document.querySelector(
                "#mobile-season-progress"
            );


        const progressBar =
            document.querySelector(
                "#mobile-season-progress-bar"
            );


        const roundText =
            document.querySelector(
                "#mobile-season-round"
            );


        const currentRound =
            document.querySelector(
                "#mobile-season-current-round"
            );


        const matchesPlayed =
            document.querySelector(
                "#mobile-season-matches-played"
            );


        const nextRound =
            document.querySelector(
                "#mobile-season-next-round"
            );


        const nextDate =
            document.querySelector(
                "#mobile-season-next-date"
            );


        if (
            progressText
        ) {

            progressText.textContent =
                `${progress}%`;

        }


        if (
            progressBar
        ) {

            progressBar.style.width =
                `${progress}%`;

        }


        if (
            roundText
        ) {

            roundText.textContent =
                String(
                    round
                ).padStart(
                    2,
                    "0"
                );

        }


        if (
            currentRound
        ) {

            currentRound.textContent =
                String(
                    round
                ).padStart(
                    2,
                    "0"
                );

        }


        if (
            matchesPlayed
        ) {

            matchesPlayed.textContent =
                `${played}/${total}`;

        }


        if (
            nextRound
        ) {

            nextRound.textContent =
                `RODADA ${
                    String(
                        round
                    ).padStart(
                        2,
                        "0"
                    )
                }`;

        }


        const nextGame =
            games.find(
                game =>
                    !game.result ||
                    !isFinal(
                        game.result.status
                    )
            );


        if (
            nextDate
        ) {

            nextDate.textContent =
                nextGame?.result

                    ? "RESULTADO REGISTRADO"

                    : "DATA A DEFINIR · 21:00";

        }

    }


    /* =========================================================
       BRASILEIRÃO MOBILE
       ========================================================= */

    async function renderMobileBrasileirao(
        round = 1
    ) {

        const standings =
            document.querySelector(
                "#mobile-standings"
            );


        if (
            !standings
        ) {

            return;

        }


        try {

            await loadMatches();


            renderRoundPicker(
                round
            );


            const table =
                standingsForRound();


            renderMobileBrasileiraoTable(
                table,
                round
            );


            renderRoundFixtures(
                round
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // MOBILE // BRASILEIRÃO",
                error
            );


            standings.innerHTML = `

                <div
                    class="ccfv-mobile-empty"
                >

                    NÃO FOI POSSÍVEL CARREGAR
                    O BRASILEIRÃO MOBILE.

                </div>

            `;


            const games =
                document.querySelector(
                    "#mobile-round-matches"
                );


            if (
                games
            ) {

                games.innerHTML =
                    "";

            }

        }

    }


    /* =========================================================
       RANKING
       ========================================================= */

    function rankName(
        elo
    ) {

        const e =
            num(
                elo
            );


        return (

            ELOS.find(
                item =>
                    e >= item.min &&
                    e <= item.max
            )?.name

            ||

            "INICIANTE"

        );

    }


    function rankKey(
        elo
    ) {

        const e =
            num(
                elo
            );


        return (

            ELOS.find(
                item =>
                    e >= item.min &&
                    e <= item.max
            )?.key

            ||

            "beginner"

        );

    }


    function initials(
        name
    ) {

        return String(
            name || "CC"
        )

            .trim()

            .split(
                /\s+/
            )

            .slice(
                0,
                2
            )

            .map(
                part =>
                    part[0]
            )

            .join("")

            .toUpperCase()

            .slice(
                0,
                2
            );

    }


    function playerPhoto(
        player
    ) {

        return (

            player?.photo_url
            ||

            player?.photo
            ||

            player?.avatar_url
            ||

            player?.image_url
            ||

            ""

        );

    }


    /* =========================================================
       BADGES
       ========================================================= */

    function renderBadge(
        rank,
        size = "medium"
    ) {

        if (
            rank.key ===
            "legend"
        ) {

            return `

                <svg
                    class="
                        ccfv-badge
                        ccfv-badge--legend
                        ccfv-badge--${size}
                    "
                    viewBox="0 0 220 260"
                    aria-label="LENDA"
                    role="img"
                >

                    <defs>

                        <linearGradient
                            id="legend-metal"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                        >

                            <stop
                                offset="0%"
                                stop-color="#fff7c5"
                            />

                            <stop
                                offset="24%"
                                stop-color="#ffd86b"
                            />

                            <stop
                                offset="50%"
                                stop-color="#ffc252"
                            />

                            <stop
                                offset="76%"
                                stop-color="#9d6710"
                            />

                            <stop
                                offset="100%"
                                stop-color="#fff1a0"
                            />

                        </linearGradient>


                        <radialGradient
                            id="legend-core"
                        >

                            <stop
                                offset="0%"
                                stop-color="#fff4b4"
                            />

                            <stop
                                offset="35%"
                                stop-color="#ffc252"
                            />

                            <stop
                                offset="100%"
                                stop-color="#7e5108"
                            />

                        </radialGradient>


                        <filter
                            id="legend-glow"
                        >

                            <feGaussianBlur
                                stdDeviation="7"
                                result="blur"
                            />

                            <feMerge>

                                <feMergeNode
                                    in="blur"
                                />

                                <feMergeNode
                                    in="SourceGraphic"
                                />

                            </feMerge>

                        </filter>

                    </defs>


                    <polygon
                        points="
                            110,4
                            144,24
                            190,26
                            216,68
                            195,182
                            110,254
                            25,182
                            4,68
                            30,26
                            76,24
                        "
                        fill="#070807"
                        stroke="#ffc252"
                        stroke-width="5"
                        filter="url(#legend-glow)"
                    />


                    <polygon
                        points="
                            110,18
                            141,37
                            179,39
                            200,70
                            179,173
                            110,238
                            41,173
                            20,70
                            41,39
                            79,37
                        "
                        fill="#12110c"
                        stroke="url(#legend-metal)"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="104"
                        r="56"
                        fill="rgba(255,194,82,.035)"
                        stroke="#ffc252"
                        stroke-width="2"
                    />


                    <circle
                        cx="110"
                        cy="104"
                        r="45"
                        fill="none"
                        stroke="rgba(255,240,160,.30)"
                        stroke-width="1"
                    />


                    <path
                        d="
                            M72 76
                            L89 89
                            L110 58
                            L131 89
                            L148 76
                            L145 108
                            L110 132
                            L75 108
                            Z
                        "
                        fill="url(#legend-core)"
                    />


                    <path
                        d="
                            M60 134
                            Q110 174
                            160 134
                            L150 169
                            Q110 197
                            70 169
                            Z
                        "
                        fill="none"
                        stroke="#ffc252"
                        stroke-width="5"
                    />


                    <circle
                        cx="52"
                        cy="89"
                        r="4"
                        fill="#ffe99a"
                    />


                    <circle
                        cx="168"
                        cy="89"
                        r="4"
                        fill="#ffe99a"
                    />


                    <text
                        x="110"
                        y="216"
                        text-anchor="middle"
                        fill="#fff8d1"
                        stroke="#7c4f08"
                        stroke-width="2"
                        paint-order="stroke"
                        font-size="17"
                        font-weight="900"
                        letter-spacing="2.8"
                    >
                        LENDA
                    </text>

                </svg>

            `;

        }


        if (
            rank.key ===
            "professional"
        ) {

            return `

                <svg
                    class="
                        ccfv-badge
                        ccfv-badge--professional
                        ccfv-badge--${size}
                    "
                    viewBox="0 0 220 260"
                    aria-label="PROFISSIONAL"
                    role="img"
                >

                    <polygon
                        points="
                            110,7
                            157,31
                            200,72
                            188,178
                            110,250
                            32,178
                            20,72
                            63,31
                        "
                        fill="#05120b"
                        stroke="#43df91"
                        stroke-width="5"
                    />


                    <polygon
                        points="
                            110,26
                            147,47
                            181,78
                            170,168
                            110,225
                            50,168
                            39,78
                            73,47
                        "
                        fill="none"
                        stroke="#9dffd2"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="105"
                        r="49"
                        fill="rgba(67,223,145,.045)"
                        stroke="#43df91"
                        stroke-width="2"
                    />


                    <path
                        d="
                            M110 61
                            L124 89
                            L154 94
                            L132 113
                            L138 145
                            L110 129
                            L82 145
                            L88 113
                            L66 94
                            L96 89
                            Z
                        "
                        fill="#43df91"
                    />


                    <circle
                        cx="57"
                        cy="91"
                        r="5"
                        fill="#43df91"
                    />


                    <circle
                        cx="163"
                        cy="91"
                        r="5"
                        fill="#43df91"
                    />


                    <text
                        x="110"
                        y="212"
                        text-anchor="middle"
                        fill="#c9ffe3"
                        stroke="#086b43"
                        stroke-width="1.4"
                        paint-order="stroke"
                        font-size="14"
                        font-weight="900"
                        letter-spacing="1.5"
                    >
                        PROFISSIONAL
                    </text>

                </svg>

            `;

        }


        if (
            rank.key ===
            "amateur"
        ) {

            return `

                <svg
                    class="
                        ccfv-badge
                        ccfv-badge--amateur
                        ccfv-badge--${size}
                    "
                    viewBox="0 0 220 260"
                    aria-label="AMADOR"
                    role="img"
                >

                    <polygon
                        points="
                            110,9
                            159,38
                            194,82
                            182,175
                            110,246
                            38,175
                            26,82
                            61,38
                        "
                        fill="#06101d"
                        stroke="#69a8ff"
                        stroke-width="5"
                    />


                    <polygon
                        points="
                            110,27
                            148,50
                            178,84
                            167,164
                            110,221
                            53,164
                            42,84
                            72,50
                        "
                        fill="none"
                        stroke="#b9d9ff"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="105"
                        r="46"
                        fill="rgba(105,168,255,.045)"
                        stroke="#69a8ff"
                        stroke-width="2"
                    />


                    <path
                        d="
                            M110 64
                            L124 91
                            L152 96
                            L131 115
                            L138 143
                            L110 128
                            L82 143
                            L89 115
                            L68 96
                            L96 91
                            Z
                        "
                        fill="#69a8ff"
                    />


                    <circle
                        cx="63"
                        cy="94"
                        r="4"
                        fill="#69a8ff"
                    />


                    <circle
                        cx="157"
                        cy="94"
                        r="4"
                        fill="#69a8ff"
                    />


                    <text
                        x="110"
                        y="211"
                        text-anchor="middle"
                        fill="#e3efff"
                        stroke="#24558e"
                        stroke-width="1.3"
                        paint-order="stroke"
                        font-size="16"
                        font-weight="900"
                        letter-spacing="2.4"
                    >
                        AMADOR
                    </text>

                </svg>

            `;

        }


        return `

            <svg
                class="
                    ccfv-badge
                    ccfv-badge--beginner
                    ccfv-badge--${size}
                "
                viewBox="0 0 220 260"
                aria-label="INICIANTE"
                role="img"
            >

                <polygon
                    points="
                        110,11
                        158,41
                        191,82
                        179,169
                        110,246
                        41,169
                        29,82
                        62,41
                    "
                    fill="#080b0a"
                    stroke="#8d9a95"
                    stroke-width="5"
                />


                <polygon
                    points="
                        110,29
                        148,51
                        175,84
                        164,161
                        110,220
                        56,161
                        45,84
                        72,51
                    "
                    fill="none"
                    stroke="#bbc6c2"
                    stroke-width="2"
                />


                <circle
                    cx="110"
                    cy="105"
                    r="42"
                    fill="rgba(255,255,255,.025)"
                    stroke="#8d9a95"
                    stroke-width="2"
                />


                <circle
                    cx="110"
                    cy="105"
                    r="13"
                    fill="none"
                    stroke="#8d9a95"
                    stroke-width="4"
                />


                <text
                    x="110"
                    y="212"
                    text-anchor="middle"
                    fill="#e5ece9"
                    stroke="#4c5752"
                    stroke-width="1.3"
                    paint-order="stroke"
                    font-size="15"
                    font-weight="900"
                    letter-spacing="2.2"
                >
                    INICIANTE
                </text>

            </svg>

        `;

    }


    /* =========================================================
       PLAYER CARD
       ========================================================= */

    function cardHTML(
        player,
        pos
    ) {

        const key =
            rankKey(
                player.elo
            );


        const rank =
            ELOS.find(
                item =>
                    item.key === key
            );


        const photo =
            playerPhoto(
                player
            );


        const games =

            num(
                player.matches_played ??
                (
                    num(
                        player.wins
                    ) +

                    num(
                        player.draws
                    ) +

                    num(
                        player.losses
                    )
                )
            );


        const win =

            games

                ? Math.round(
                    (
                        num(
                            player.wins
                        ) /
                        games
                    ) * 100
                )

                : 0;


        const photoHTML =

            photo

                ? `

                    <img
                        src="${esc(
                            photo
                        )}"
                        alt="${esc(
                            player.name
                        )}"
                        loading="lazy"
                        crossorigin="anonymous"
                    >

                `

                : `

                    <span
                        class="
                            ccfv-player-card-real__initials
                        "
                    >

                        ${esc(
                            initials(
                                player.name
                            )
                        )}

                    </span>

                `;


        const playerId =
            player.player_id ||
            player.id ||
            pos;


        return `

            <div
                class="
                    ccfv-player-card-item
                "
                data-player-id="${esc(
                    playerId
                )}"
            >

                <article

                    class="
                        ccfv-player-card-preview
                        ccfv-player-card-preview--${key}
                        ccfv-player-card-preview--animated
                        ccfv-player-card-real
                    "

                    data-mobile-card-id="${esc(
                        playerId
                    )}"

                >

                    <div
                        class="
                            ccfv-player-card-preview__holo
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__noise
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__energy
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__grid
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__corner
                            ccfv-player-card-preview__corner--tl
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__corner
                            ccfv-player-card-preview__corner--tr
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__corner
                            ccfv-player-card-preview__corner--bl
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__corner
                            ccfv-player-card-preview__corner--br
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__top
                        "
                    >

                        <div>

                            <span>
                                CCFV MOBILE
                            </span>

                            <strong>
                                #${String(
                                    pos
                                ).padStart(
                                    3,
                                    "0"
                                )}
                            </strong>

                        </div>


                        <div
                            class="
                                ccfv-player-card-preview__mini-badge
                            "
                        >

                            ${renderBadge(
                                rank,
                                "small"
                            )}

                        </div>

                    </div>


                    <div
                        class="
                            ccfv-player-card-preview__scanline
                        "
                    ></div>


                    <div
                        class="
                            ccfv-player-card-preview__photo
                        "
                    >

                        <div
                            class="
                                ccfv-player-card-preview__photo-frame
                                ccfv-player-card-real__photo-frame
                            "
                        >

                            ${photoHTML}

                        </div>

                    </div>


                    <div
                        class="
                            ccfv-player-card-preview__badge-floating
                        "
                    >

                        ${renderBadge(
                            rank,
                            "medium"
                        )}

                    </div>


                    <div
                        class="
                            ccfv-player-card-preview__identity
                        "
                    >

                        <span>
                            ${esc(
                                rank.name
                            )}
                        </span>

                        <strong>
                            ${esc(
                                player.name ||
                                "JOGADOR"
                            )}
                        </strong>

                        <small>

                            ${
                                player.instagram

                                    ? `@${String(
                                        player.instagram
                                    ).replace(
                                        /^@/,
                                        ""
                                    )}`

                                    : "@ccfv.oficial"
                            }

                        </small>

                    </div>


                    <div
                        class="
                            ccfv-player-card-preview__metrics
                        "
                    >

                        <div>

                            <span>
                                ELO
                            </span>

                            <strong>
                                ${num(
                                    player.elo
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                POS
                            </span>

                            <strong>
                                #${String(
                                    pos
                                ).padStart(
                                    2,
                                    "0"
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                WIN
                            </span>

                            <strong>
                                ${String(
                                    win
                                ).padStart(
                                    2,
                                    "0"
                                )} %
                            </strong>

                        </div>

                    </div>


                    <div
                        class="
                            ccfv-player-card-preview__footer
                        "
                    >

                        <span>
                            @ccfv.oficial
                        </span>

                        <strong>
                            ${esc(
                                rank.name
                            )}
                        </strong>

                    </div>


                    <div
                        class="
                            ccfv-player-card-preview__particles
                        "
                    >

                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>

                    </div>

                </article>


                <button
                    type="button"
                    class="ccfv-player-card-download"
                    data-mobile-download-card="${esc(
                        playerId
                    )}"
                >

                    <span>
                        BAIXAR CARD
                    </span>

                    <span>
                        ↓
                    </span>

                </button>

            </div>

        `;

    }


    /* =========================================================
       MOVIMENTO DOS CARDS
       ========================================================= */

    function bindCardMotion(
        root = document
    ) {

        root
            .querySelectorAll(
                ".ccfv-player-card-preview--animated"
            )

            .forEach(
                card => {

                    if (
                        card.dataset.motionBound ===
                        "true"
                    ) {

                        return;

                    }


                    card.dataset.motionBound =
                        "true";


                    card.addEventListener(
                        "pointermove",
                        event => {

                            const rect =
                                card.getBoundingClientRect();


                            const x =
                                (
                                    event.clientX -
                                    rect.left
                                ) /
                                rect.width;


                            const y =
                                (
                                    event.clientY -
                                    rect.top
                                ) /
                                rect.height;


                            card.style.setProperty(
                                "--mouse-x",
                                `${x * 100}%`
                            );


                            card.style.setProperty(
                                "--mouse-y",
                                `${y * 100}%`
                            );


                            card.style.setProperty(
                                "--rotate-x",
                                `${(0.5 - y) * 12}deg`
                            );


                            card.style.setProperty(
                                "--rotate-y",
                                `${(x - 0.5) * 14}deg`
                            );

                        }
                    );


                    card.addEventListener(
                        "pointerleave",
                        () => {

                            card.style.setProperty(
                                "--rotate-x",
                                "0deg"
                            );


                            card.style.setProperty(
                                "--rotate-y",
                                "0deg"
                            );


                            card.style.setProperty(
                                "--mouse-x",
                                "50%"
                            );


                            card.style.setProperty(
                                "--mouse-y",
                                "50%"
                            );

                        }
                    );

                }
            );

    }


    /* =========================================================
       DOWNLOAD CARD
       ========================================================= */

    async function downloadMobileCard(
        button
    ) {

        const id =
            button?.dataset?.mobileDownloadCard;


        const card =
            document.querySelector(

                `[data-mobile-card-id="${CSS.escape(
                    String(
                        id
                    )
                )}"]`

            );


        if (
            !card
        ) {

            return;

        }


        const original =
            button.innerHTML;


        button.disabled =
            true;


        button.innerHTML =
            "GERANDO...";


        try {

            const options = {

                pixelRatio:
                    2,

                cacheBust:
                    true,

                backgroundColor:
                    "#020403"

            };


            let dataUrl =
                "";


            if (
                window.htmlToImage?.toPng
            ) {

                dataUrl =
                    await window.htmlToImage.toPng(
                        card,
                        options
                    );

            }

            else if (
                window.html2canvas
            ) {

                dataUrl =

                    (

                        await window.html2canvas(

                            card,

                            {

                                scale:
                                    2,

                                useCORS:
                                    true,

                                allowTaint:
                                    false,

                                backgroundColor:
                                    "#020403"

                            }

                        )

                    ).toDataURL(
                        "image/png"
                    );

            }


            if (
                !dataUrl ||
                !dataUrl.startsWith(
                    "data:image/png"
                )
            ) {

                throw new Error(
                    "PNG inválido"
                );

            }


            const player =
                ranking.find(

                    item =>

                        String(
                            item.player_id ||
                            item.id
                        ) ===
                        String(
                            id
                        )

                );


            const safe =

                String(
                    player?.name ||
                    "jogador"
                )

                    .normalize(
                        "NFD"
                    )

                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )

                    .replace(
                        /[^a-zA-Z0-9]+/g,
                        "-"
                    )

                    .toLowerCase();


            const anchor =
                document.createElement(
                    "a"
                );


            anchor.download =
                `ccfv-mobile-card-${
                    safe ||
                    "jogador"
                }.png`;


            anchor.href =
                dataUrl;


            document.body.appendChild(
                anchor
            );


            anchor.click();


            anchor.remove();

        }

        catch (
            error
        ) {

            console.error(
                error
            );


            alert(
                "Não foi possível gerar o card. Verifique se a foto do jogador possui uma URL pública com CORS."
            );

        }

        finally {

            button.disabled =
                false;


            button.innerHTML =
                original;

        }

    }


    function bindDownloads(
        root = document
    ) {

        root
            .querySelectorAll(
                "[data-mobile-download-card]"
            )

            .forEach(
                button => {

                    if (
                        button.dataset.bound ===
                        "true"
                    ) {

                        return;

                    }


                    button.dataset.bound =
                        "true";


                    button.addEventListener(
                        "click",
                        () =>
                            downloadMobileCard(
                                button
                            )
                    );

                }
            );

    }


    /* =========================================================
       TOP POR ELO
       ========================================================= */

    function topByElo(
        key,
        list
    ) {

        return (

            list

                .filter(
                    player =>
                        rankKey(
                            player.elo
                        ) ===
                        key
                )

                .sort(

                    (
                        a,
                        b
                    ) =>
                        num(
                            b.elo
                        ) -
                        num(
                            a.elo
                        )

                )[0]

            ||

            null

        );

    }


    /* =========================================================
       RANKING MOBILE
       ========================================================= */

    function renderMobileRankingPage() {

        const heroEl =
            document.querySelector(
                "#mobile-ranking-hero-leader"
            );


        const contentEl =
            document.querySelector(
                "#mobile-ranking-content"
            );


        if (
            !heroEl ||
            !contentEl
        ) {

            return;

        }


        const list =

            [...ranking].sort(

                (
                    a,
                    b
                ) =>
                    num(
                        b.elo
                    ) -
                    num(
                        a.elo
                    )

            );


        const top =
            list[0];


        const count =
            document.querySelector(
                "#mobile-ranking-count"
            );


        if (
            count
        ) {

            count.textContent =
                String(
                    list.length
                ).padStart(
                    2,
                    "0"
                );

        }


        if (
            top
        ) {

            const rank =
                ELOS.find(
                    item =>
                        item.key ===
                        rankKey(
                            top.elo
                        )
                );


            const photo =
                playerPhoto(
                    top
                );


            const games =
                num(
                    top.matches_played
                );


            heroEl.innerHTML = `

                <article
                    class="
                        ccfv-ranking-hero__leader-card
                        ccfv-ranking-hero__leader-card--${rank.key}
                    "
                >

                    <div
                        class="
                            ccfv-ranking-hero__leader-photo
                        "
                    >

                        ${
                            photo

                                ? `

                                    <img
                                        src="${esc(
                                            photo
                                        )}"
                                        alt="${esc(
                                            top.name
                                        )}"
                                        crossorigin="anonymous"
                                    >

                                `

                                : `

                                    <span>
                                        ${esc(
                                            initials(
                                                top.name
                                            )
                                        )}
                                    </span>

                                `
                        }

                    </div>


                    <div
                        class="
                            ccfv-ranking-hero__leader-badge
                        "
                    >

                        ${renderBadge(
                            rank,
                            "small"
                        )}

                    </div>


                    <div
                        class="
                            ccfv-ranking-hero__leader-content
                        "
                    >

                        <span>
                            CCFV // MOBILE // OFFICIAL LEADER
                        </span>


                        <div
                            class="
                                ccfv-ranking-hero__leader-position
                            "
                        >

                            #01 ABSOLUTO

                        </div>


                        <h2>
                            ${esc(
                                top.name
                            )}
                        </h2>


                        <small>

                            ${
                                top.instagram

                                    ? `@${String(
                                        top.instagram
                                    ).replace(
                                        /^@/,
                                        ""
                                    )}`

                                    : "@ccfv.oficial"
                            }

                            ·

                            ${esc(
                                rank.name
                            )}

                        </small>


                        <div
                            class="
                                ccfv-ranking-hero__leader-meta
                            "
                        >

                            <div>

                                <span>
                                    ELO
                                </span>

                                <strong>
                                    ${num(
                                        top.elo
                                    )}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    JOGOS
                                </span>

                                <strong>
                                    ${games}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    VITÓRIAS
                                </span>

                                <strong>
                                    ${num(
                                        top.wins
                                    )}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    TÍTULOS
                                </span>

                                <strong>
                                    ${num(
                                        top.titles
                                    )}
                                </strong>

                            </div>

                        </div>

                    </div>

                </article>

            `;

        }

        else {

            heroEl.innerHTML = `

                <div
                    class="
                        ccfv-ranking-hero__leader-card
                        ccfv-ranking-hero__leader-card--empty
                    "
                >

                    <div
                        class="
                            ccfv-ranking-hero__leader-copy
                        "
                    >

                        <span>
                            CCFV // MOBILE // OFFICIAL RANKING
                        </span>

                        <strong>
                            O TOPO ESTÁ ESPERANDO.
                        </strong>

                        <small>
                            Cadastre os competidores Mobile no Admin.
                        </small>

                    </div>

                </div>

            `;

        }


        /* =====================================================
           TOP 10
           ===================================================== */

        const top10 =
            list.slice(
                0,
                10
            );


        const rows =

            top10

                .map(

                    (
                        player,
                        index
                    ) => {

                        const rank =
                            ELOS.find(
                                item =>
                                    item.key ===
                                    rankKey(
                                        player.elo
                                    )
                            );


                        const photo =
                            playerPhoto(
                                player
                            );


                        const pos =
                            index + 1;


                        return `

                            <article
                                class="
                                    ccfv-ranking-row
                                    ccfv-ranking-row--${rank.key}
                                    ${
                                        pos === 1
                                            ? "is-first"
                                            : ""
                                    }
                                "
                            >

                                <span
                                    class="
                                        ccfv-ranking-row__position
                                    "
                                >

                                    ${String(
                                        pos
                                    ).padStart(
                                        2,
                                        "0"
                                    )}

                                </span>


                                <div
                                    class="
                                        ccfv-ranking-row__player
                                    "
                                >

                                    <div
                                        class="
                                            ccfv-ranking-row__photo
                                        "
                                    >

                                        ${
                                            photo

                                                ? `

                                                    <img
                                                        src="${esc(
                                                            photo
                                                        )}"
                                                        alt=""
                                                        loading="lazy"
                                                    >

                                                `

                                                : esc(
                                                    initials(
                                                        player.name
                                                    )
                                                )
                                        }

                                    </div>


                                    <div
                                        class="
                                            ccfv-ranking-row__player-info
                                        "
                                    >

                                        <strong>
                                            ${esc(
                                                player.name
                                            )}
                                        </strong>

                                        <span>

                                            ${
                                                player.instagram

                                                    ? `@${String(
                                                        player.instagram
                                                    ).replace(
                                                        /^@/,
                                                        ""
                                                    )}`

                                                    : "@ccfv.oficial"
                                            }

                                        </span>

                                    </div>

                                </div>


                                <span
                                    class="
                                        ccfv-ranking-row__platform
                                    "
                                >
                                    MOBILE
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-row__points
                                    "
                                >

                                    ${num(
                                        player.elo
                                    )}

                                </span>


                                <span
                                    class="
                                        ccfv-ranking-row__elo
                                    "
                                >
                                    ELO
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-row__rank
                                    "
                                >

                                    ${esc(
                                        rank.name
                                    )}

                                </span>

                            </article>

                        `;

                    }

                )

                .join("");


        /* =====================================================
           NÍVEIS
           ===================================================== */

        const levels =

            ELOS.map(

                (
                    rank,
                    index
                ) => {

                    const player =
                        topByElo(
                            rank.key,
                            list
                        );


                    const photo =
                        playerPhoto(
                            player
                        );


                    return `

                        <article
                            class="
                                ccfv-ranking-level
                                ccfv-ranking-level--${rank.key}
                                ${
                                    player
                                        ? "has-leader"
                                        : "is-empty"
                                }
                            "
                        >

                            <div
                                class="
                                    ccfv-ranking-level__top
                                "
                            >

                                <span
                                    class="
                                        ccfv-ranking-level__number
                                    "
                                >

                                    ${String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        "0"
                                    )}

                                </span>


                                <span
                                    class="
                                        ccfv-ranking-level__leader-label
                                    "
                                >

                                    TOP 1 DO ELO

                                </span>

                            </div>


                            <div
                                class="
                                    ccfv-ranking-level__badge-art
                                "
                            >

                                ${renderBadge(
                                    rank,
                                    "medium"
                                )}

                            </div>


                            <div
                                class="
                                    ccfv-ranking-level__leader-photo
                                "
                            >

                                ${
                                    photo

                                        ? `

                                            <img
                                                src="${esc(
                                                    photo
                                                )}"
                                                alt="${esc(
                                                    player.name
                                                )}"
                                                loading="lazy"
                                            >

                                        `

                                        : `

                                            <span>

                                                ${
                                                    player
                                                        ? esc(
                                                            initials(
                                                                player.name
                                                            )
                                                        )
                                                        : "—"
                                                }

                                            </span>

                                        `
                                }

                            </div>


                            <div
                                class="
                                    ccfv-ranking-level__name
                                "
                            >

                                ${esc(
                                    rank.name
                                )}

                            </div>


                            <div
                                class="
                                    ccfv-ranking-level__range
                                "
                            >

                                ${
                                    rank.key ===
                                    "legend"

                                        ? "3000+ ELO"

                                        : `${rank.min} → ${rank.max} ELO`
                                }

                            </div>


                            <div
                                class="
                                    ccfv-ranking-level__leader
                                "
                            >

                                ${
                                    player

                                        ? `

                                            <strong>
                                                ${esc(
                                                    player.name
                                                )}
                                            </strong>

                                            <span>
                                                ${num(
                                                    player.elo
                                                )} ELO
                                            </span>

                                        `

                                        : `

                                            <strong>
                                                A DEFINIR
                                            </strong>

                                            <span>
                                                NENHUM JOGADOR NESTA FAIXA
                                            </span>

                                        `
                                }

                            </div>

                        </article>

                    `;

                }

            )

            .join("");


        contentEl.innerHTML = `

            <section
                class="
                    ccfv-ranking-table-section
                "
            >

                <div
                    class="
                        ccfv-ranking-container
                    "
                >

                    <div
                        class="
                            ccfv-ranking-section-heading
                        "
                    >

                        <div>

                            <span>
                                CCFV // MOBILE // LEADERBOARD
                            </span>

                            <h2>

                                TOP 10

                                <strong>
                                    MOBILE.
                                </strong>

                            </h2>

                        </div>

                    </div>


                    <div
                        class="
                            ccfv-ranking-list
                        "
                        id="mobile-top10-list"
                    >

                        ${
                            rows

                                ||

                                `

                                    <div
                                        class="
                                            ccfv-ranking-empty-feature
                                        "
                                    >

                                        <strong>
                                            NENHUM COMPETIDOR MOBILE.
                                        </strong>

                                        <span>
                                            Os jogadores aparecerão aqui assim que forem cadastrados.
                                        </span>

                                    </div>

                                `
                        }

                    </div>

                </div>

            </section>


            <section
                class="
                    ccfv-ranking-levels
                "
            >

                <div
                    class="
                        ccfv-ranking-container
                    "
                >

                    <div
                        class="
                            ccfv-ranking-section-heading
                        "
                    >

                        <div>

                            <span>
                                CCFV // MOBILE // ELO SYSTEM
                            </span>

                            <h2>

                                CONQUISTE SUA

                                <strong>
                                    INSÍGNIA.
                                </strong>

                            </h2>

                        </div>


                        <p>
                            ELO e evolução competitiva independentes do PC e Console.
                        </p>

                    </div>


                    <div
                        class="
                            ccfv-ranking-level-grid
                        "
                    >

                        ${levels}

                    </div>

                </div>

            </section>

        `;


        bindLevelMotion(
            contentEl
        );

    }


    /* =========================================================
       MOVIMENTO DOS NÍVEIS
       ========================================================= */

    function bindLevelMotion(
        root = document
    ) {

        root
            .querySelectorAll(
                ".ccfv-ranking-level"
            )

            .forEach(
                card => {

                    if (
                        card.dataset.bound ===
                        "true"
                    ) {

                        return;

                    }


                    card.dataset.bound =
                        "true";


                    card.addEventListener(
                        "pointermove",
                        event => {

                            const rect =
                                card.getBoundingClientRect();


                            const x =
                                (
                                    event.clientX -
                                    rect.left
                                ) /
                                rect.width;


                            const y =
                                (
                                    event.clientY -
                                    rect.top
                                ) /
                                rect.height;


                            card.style.setProperty(
                                "--level-rx",
                                `${(0.5 - y) * 9}deg`
                            );


                            card.style.setProperty(
                                "--level-ry",
                                `${(x - 0.5) * 12}deg`
                            );


                            card.style.setProperty(
                                "--level-mx",
                                `${x * 100}%`
                            );


                            card.style.setProperty(
                                "--level-my",
                                `${y * 100}%`
                            );


                            card.classList.add(
                                "is-hovering"
                            );

                        }
                    );


                    card.addEventListener(
                        "pointerleave",
                        () => {

                            card.classList.remove(
                                "is-hovering"
                            );


                            card.style.setProperty(
                                "--level-rx",
                                "0deg"
                            );


                            card.style.setProperty(
                                "--level-ry",
                                "0deg"
                            );


                            card.style.setProperty(
                                "--level-mx",
                                "50%"
                            );


                            card.style.setProperty(
                                "--level-my",
                                "50%"
                            );

                        }
                    );

                }
            );

    }


    /* =========================================================
       DIRETÓRIO DE JOGADORES
       ========================================================= */

    function renderPlayerDirectory() {

        const element =
            document.querySelector(
                "#mobile-player-directory"
            );


        if (
            !element
        ) {

            return;

        }


        const search =

            (
                document.querySelector(
                    "#mobile-player-search"
                )?.value ||

                ""
            )

                .trim()

                .toLowerCase();


        const list =

            ranking

                .filter(

                    player =>

                        !search

                        ||

                        String(
                            player.name ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                search
                            )

                        ||

                        String(
                            player.instagram ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                search
                            )

                )

                .sort(

                    (
                        a,
                        b
                    ) =>

                        num(
                            b.elo
                        ) -

                        num(
                            a.elo
                        )

                );


        element.innerHTML =

            list.length

                ? `

                    <div
                        class="
                            ccfv-player-cards-grid
                        "
                    >

                        ${list.map(

                            (
                                player,
                                index
                            ) =>

                                cardHTML(
                                    player,
                                    index + 1
                                )

                        ).join("")}

                    </div>

                `

                : `

                    <div
                        class="
                            ccfv-player-cards-empty
                        "
                    >

                        <strong>
                            NENHUM COMPETIDOR MOBILE ENCONTRADO.
                        </strong>

                        <span>
                            Ajuste a busca ou cadastre jogadores Mobile pelo Admin.
                        </span>

                    </div>

                `;


        bindCardMotion(
            element
        );


        bindDownloads(
            element
        );


        const count =
            document.querySelector(
                "#mobile-directory-count"
            );


        if (
            count
        ) {

            count.textContent =

                `${list.length} JOGADOR${
                    list.length === 1
                        ? ""
                        : "ES"
                }`;

        }

    }


    /* =========================================================
       ARENA CUP MOBILE
       MESMA ESTRUTURA DA NIGHT CUP
       ========================================================= */

    function bracketMatch(
        match,
        code
    ) {

        const final =
            match &&
            isFinal(
                match.status
            );


        return `

            <article
                class="
                    ccfv-night-bracket-match
                "
            >

                <span
                    class="
                        ccfv-night-bracket-match__number
                    "
                >

                    ${esc(
                        code
                    )}

                </span>


                <div
                    class="
                        ccfv-night-bracket-team
                    "
                >

                    <span>
                        ${esc(
                            match?.home_team ||
                            "A DEFINIR"
                        )}
                    </span>

                    <strong>

                        ${
                            final
                                ? num(
                                    match.home_score
                                )
                                : ""

                        }

                    </strong>

                </div>


                <div
                    class="
                        ccfv-night-bracket-team
                    "
                >

                    <span>
                        ${esc(
                            match?.away_team ||
                            "A DEFINIR"
                        )}
                    </span>

                    <strong>

                        ${
                            final
                                ? num(
                                    match.away_score
                                )
                                : ""

                        }

                    </strong>

                </div>

            </article>

        `;

    }


    function winner(
        match
    ) {

        if (
            !match ||
            !isFinal(
                match.status
            )
        ) {

            return null;

        }


        const homeScore =
            num(
                match.home_score
            );


        const awayScore =
            num(
                match.away_score
            );


        if (
            homeScore >
            awayScore
        ) {

            return match.home_team;

        }


        if (
            awayScore >
            homeScore
        ) {

            return match.away_team;

        }


        return null;

    }


    function isArenaMatch(
        match
    ) {

        const competition =
            normalizeCompetition(
                match?.competition
            );


        return (

            competition ===
            "ARENA_CUP"

            ||

            competition ===
            "ARENA_CUP_MOBILE"

        );

    }


    function renderArena() {

        const root =
            document.querySelector(
                "#mobile-arena-root"
            );


        if (
            !root
        ) {

            return;

        }


        const games =
            matches.filter(
                isArenaMatch
            );


        const q =

            Array.from(
                {
                    length: 4
                },
                (
                    _,
                    index
                ) =>

                    games.find(

                        match =>

                            normalizeCompetition(
                                match.stage
                            ).includes(
                                "QUART"
                            )

                            &&

                            num(
                                match.round_number
                            ) ===
                            index + 1

                    )

            );


        const s =

            Array.from(
                {
                    length: 2
                },
                (
                    _,
                    index
                ) =>

                    games.find(

                        match =>

                            normalizeCompetition(
                                match.stage
                            ).includes(
                                "SEMI"
                            )

                            &&

                            num(
                                match.round_number
                            ) ===
                            index + 1

                    )

            );


        const finalMatch =

            games.find(

                match => {

                    const stage =
                        normalizeCompetition(
                            match.stage
                        );


                    return (

                        stage ===
                        "FINAL"

                        ||

                        stage.startsWith(
                            "FINAL"
                        )

                    );

                }

            );


        root.innerHTML = `

            <div
                class="
                    ccfv-night-bracket
                    ccfv-mobile-arena-bracket
                "
            >

                <div
                    class="
                        ccfv-night-bracket-layout
                    "
                >


                    <!-- =============================
                         QUARTAS
                         ============================= -->

                    <div
                        class="
                            ccfv-night-bracket-column
                            ccfv-night-bracket-column--quarters
                        "
                    >

                        <div
                            class="
                                ccfv-night-bracket-column__title
                            "
                        >

                            <span>
                                01
                            </span>

                            <strong>
                                QUARTAS
                            </strong>

                        </div>


                        ${q.map(

                            (
                                match,
                                index
                            ) =>

                                bracketMatch(

                                    match || {},

                                    `QF ${
                                        String(
                                            index + 1
                                        ).padStart(
                                            2,
                                            "0"
                                        )
                                    }`

                                )

                        ).join("")}

                    </div>


                    <!-- =============================
                         SEMIFINAIS
                         ============================= -->

                    <div
                        class="
                            ccfv-night-bracket-column
                            ccfv-night-bracket-column--middle
                        "
                    >

                        <div
                            class="
                                ccfv-night-bracket-column__title
                            "
                        >

                            <span>
                                02
                            </span>

                            <strong>
                                SEMIFINAIS
                            </strong>

                        </div>


                        ${s.map(

                            (
                                match,
                                index
                            ) =>

                                bracketMatch(

                                    match || {},

                                    `SF ${
                                        String(
                                            index + 1
                                        ).padStart(
                                            2,
                                            "0"
                                        )
                                    }`

                                )

                        ).join("")}

                    </div>


                    <!-- =============================
                         FINAL
                         ============================= -->

                    <div
                        class="
                            ccfv-night-bracket-column
                            ccfv-night-bracket-column--final
                        "
                    >

                        <div
                            class="
                                ccfv-night-bracket-column__title
                            "
                        >

                            <span>
                                03
                            </span>

                            <strong>
                                FINAL
                            </strong>

                        </div>


                        ${
                            finalMatch

                                ? `

                                    <article
                                        class="
                                            ccfv-night-final-match
                                        "
                                    >

                                        <div
                                            class="
                                                ccfv-night-final-match__crown
                                            "
                                        >
                                            ✦
                                        </div>


                                        <span
                                            class="
                                                ccfv-night-final-match__label
                                            "
                                        >
                                            ARENA CUP FINAL
                                        </span>


                                        <div
                                            class="
                                                ccfv-night-final-match__team
                                            "
                                        >

                                            <strong>
                                                ${esc(
                                                    finalMatch.home_team
                                                )}
                                            </strong>

                                            <span>

                                                ${
                                                    isFinal(
                                                        finalMatch.status
                                                    )

                                                        ? num(
                                                            finalMatch.home_score
                                                        )

                                                        : "A DEFINIR"

                                                }

                                            </span>

                                        </div>


                                        <div
                                            class="
                                                ccfv-night-final-match__vs
                                            "
                                        >

                                            VS

                                        </div>


                                        <div
                                            class="
                                                ccfv-night-final-match__team
                                            "
                                        >

                                            <span>

                                                ${
                                                    isFinal(
                                                        finalMatch.status
                                                    )

                                                        ? num(
                                                            finalMatch.away_score
                                                        )

                                                        : "A DEFINIR"

                                                }

                                            </span>

                                            <strong>
                                                ${esc(
                                                    finalMatch.away_team
                                                )}
                                            </strong>

                                        </div>


                                        <div
                                            class="
                                                ccfv-night-final-match__champion
                                            "
                                        >

                                            🏆

                                            ${esc(
                                                winner(
                                                    finalMatch
                                                ) ||
                                                "CAMPEÃO A DEFINIR"
                                            )}

                                        </div>

                                    </article>

                                `

                                : `

                                    <div
                                        class="
                                            ccfv-night-final-match
                                        "
                                    >

                                        <div
                                            class="
                                                ccfv-night-final-match__crown
                                            "
                                        >
                                            ✦
                                        </div>


                                        <span
                                            class="
                                                ccfv-night-final-match__label
                                            "
                                        >
                                            ARENA CUP FINAL
                                        </span>


                                        <div
                                            class="
                                                ccfv-night-final-match__team
                                            "
                                        >

                                            <strong>
                                                A DEFINIR
                                            </strong>

                                        </div>


                                        <div
                                            class="
                                                ccfv-night-final-match__vs
                                            "
                                        >
                                            VS
                                        </div>


                                        <div
                                            class="
                                                ccfv-night-final-match__team
                                            "
                                        >

                                            <strong>
                                                A DEFINIR
                                            </strong>

                                        </div>


                                        <div
                                            class="
                                                ccfv-night-final-match__champion
                                            "
                                        >

                                            🏆
                                            CAMPEÃO A DEFINIR

                                        </div>

                                    </div>

                                `
                        }

                    </div>

                </div>

            </div>

        `;

    }


    /* =========================================================
       TODAS AS PARTIDAS MOBILE
       ========================================================= */

    async function renderAllMatches() {

        const element =
            document.querySelector(
                "#mobile-all-matches"
            );


        if (
            !element
        ) {

            return;

        }


        try {

            await loadMatches();


            const list =

                [...matches].sort(

                    (
                        a,
                        b
                    ) =>

                        new Date(
                            b.played_at ||
                            b.created_at ||
                            0
                        )

                        -

                        new Date(
                            a.played_at ||
                            a.created_at ||
                            0
                        )

                );


            element.innerHTML =

                list.length

                    ? list

                        .map(

                            match => `

                                <article
                                    class="
                                        ccfv-mobile-fixture-card
                                        is-finished
                                    "
                                >

                                    <div
                                        class="
                                            ccfv-mobile-fixture-card__top
                                        "
                                    >

                                        <span>

                                            ${esc(
                                                match.competition
                                            )}

                                        </span>


                                        <span>

                                            ${esc(
                                                match.status ||
                                                "FINALIZADA"
                                            )}

                                        </span>

                                    </div>


                                    <div
                                        class="
                                            ccfv-mobile-fixture-card__teams
                                        "
                                    >

                                        <div>

                                            <strong>
                                                ${esc(
                                                    match.home_team
                                                )}
                                            </strong>

                                            <small>
                                                ${esc(
                                                    match.home_player_name ||
                                                    ""
                                                )}
                                            </small>

                                        </div>


                                        <div
                                            class="
                                                ccfv-mobile-fixture-card__score
                                            "
                                        >

                                            ${num(
                                                match.home_score
                                            )}

                                            <span>
                                                ×
                                            </span>

                                            ${num(
                                                match.away_score
                                            )}

                                        </div>


                                        <div>

                                            <strong>
                                                ${esc(
                                                    match.away_team
                                                )}
                                            </strong>

                                            <small>
                                                ${esc(
                                                    match.away_player_name ||
                                                    ""
                                                )}
                                            </small>

                                        </div>

                                    </div>


                                    <div
                                        class="
                                            ccfv-mobile-fixture-card__bottom
                                        "
                                    >

                                        <span>
                                            ${esc(
                                                match.stage ||
                                                ""
                                            )}
                                        </span>


                                        <span>

                                            ${new Date(
                                                match.played_at ||
                                                match.created_at ||
                                                Date.now()
                                            ).toLocaleString(
                                                "pt-BR"
                                            )}

                                        </span>

                                    </div>

                                </article>

                            `

                        )

                        .join("")

                    : `

                        <div
                            class="
                                ccfv-mobile-empty
                            "
                        >

                            NENHUMA PARTIDA MOBILE.

                        </div>

                    `;

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // MOBILE // PARTIDAS",
                error
            );


            element.innerHTML = `

                <div
                    class="
                        ccfv-mobile-empty
                    "
                >

                    NÃO FOI POSSÍVEL CARREGAR
                    AS PARTIDAS MOBILE.

                </div>

            `;

        }

    }


    /* =========================================================
       BUSCA DE JOGADORES
       ========================================================= */

    function bindDirectorySearch() {

        const input =
            document.querySelector(
                "#mobile-player-search"
            );


        if (
            input &&
            input.dataset.bound !==
            "true"
        ) {

            input.dataset.bound =
                "true";


            input.addEventListener(
                "input",
                renderPlayerDirectory
            );

        }

    }


    /* =========================================================
       BOOT
       ========================================================= */

    async function boot() {

        const page =
            document.body.dataset.mobilePage;


        if (
            !page
        ) {

            return;

        }


        const script =
            document.createElement(
                "script"
            );


        script.src =
            "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


        script.onload =
            async () => {

                try {

                    await loadMatches();


                    if (
                        page ===
                        "brasileirao"
                    ) {

                        await renderMobileBrasileirao(
                            1
                        );

                    }


                    if (
                        page ===
                        "ranking"
                    ) {

                        await loadRanking();

                        renderMobileRankingPage();

                    }


                    if (
                        page ===
                        "jogadores"
                    ) {

                        await loadRanking();

                        renderPlayerDirectory();

                        bindDirectorySearch();

                    }


                    if (
                        page ===
                        "arena"
                    ) {

                        renderArena();

                    }


                    if (
                        page ===
                        "partidas"
                    ) {

                        renderAllMatches();

                    }

                }

                catch (
                    error
                ) {

                    console.error(
                        "CCFV // MOBILE",
                        error
                    );

                }

            };


        script.onerror =
            error => {

                console.error(
                    "CCFV // MOBILE: erro ao carregar Supabase",
                    error
                );

            };


        document.head.appendChild(
            script
        );

    }


    boot();

})();