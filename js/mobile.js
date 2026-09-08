/* =========================================================
   BRASILEIRÃO MOBILE
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
                    rotating.length - 1 - i
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
                rotating.length - 1
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


function resultForFixture(
    fixture
) {

    return matches.find(
        match => {

            return (

                normalizeCompetition(
                    match.competition
                ) ===
                "BRASILEIRAO_MOBILE"

                &&

                num(
                    match.round_number
                ) ===
                fixture.round

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


function normalizeCompetition(
    value
) {

    return norm(value)
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


function fixturesForRound(
    round
) {

    return SCHEDULE

        .filter(
            fixture =>
                fixture.round ===
                Number(round)
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

                ) || (

                    sgB -
                    sgA

                ) || (

                    b.gp -
                    a.gp

                ) || (

                    b.v -
                    a.v

                ) || (

                    a.team.localeCompare(
                        b.team,
                        "pt-BR"
                    )

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

                                RODADA
                                ${
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
            class="ccfv-mobile-standing ccfv-mobile-standing--head"
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
                        class="ccfv-mobile-standing__club"
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
                ${String(
                    round
                ).padStart(
                    2,
                    "0"
                )}.
            </strong>

        `;

    }

}


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
                class="ccfv-mobile-fixture-card__top"
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
                class="ccfv-mobile-fixture-card__teams"
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
                    class="ccfv-mobile-fixture-card__score"
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
                class="ccfv-mobile-fixture-card__bottom"
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


    element.innerHTML = `

        <div
            class="ccfv-mobile-fixtures-grid"
        >

            ${games.map(
                renderFixtureRow
            ).join("")}

        </div>

    `;


    updateMobileSeasonPanel(
        round,
        games
    );

}


function updateMobileSeasonPanel(
    round,
    games
) {

    const completed =
        matches.filter(
            isMobileBrazilMatch
        ).filter(
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
        Math.round(
            (
                played /
                total
            ) * 100
        );


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

}


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