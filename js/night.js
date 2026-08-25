/* =========================================================
   CCFV // NIGHT CUP PUBLIC
   Página pública da Night Cup
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function number(
        value
    ) {

        const n =
            Number(
                value
            );

        return Number.isFinite(
            n
        )
            ? n
            : 0;

    }


    function normalize(
        value
    ) {

        return String(
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

    }


    function escapeHTML(
        value
    ) {

        return String(
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

    }


    /* =====================================================
       ESTADO
       ===================================================== */

    let observerStarted =
        false;


    /* =====================================================
       PLAYERS
       ===================================================== */

    function getPlayers() {

        if (
            window.CCFVLive &&
            Array.isArray(
                window.CCFVLive.players
            )
        ) {

            return window.CCFVLive.players;

        }

        return [];

    }


    function findPlayer(
        match,
        side
    ) {

        const players =
            getPlayers();


        const isHome =
            side ===
            "home";


        const possibleIds =
            isHome

                ? [
                    "home_player_id",
                    "player1_id",
                    "player_a_id",
                    "home_id"
                ]

                : [
                    "away_player_id",
                    "player2_id",
                    "player_b_id",
                    "away_id"
                ];


        for (
            const key
            of possibleIds
        ) {

            const id =
                match?.[
                    key
                ];


            if (
                !id
            ) {

                continue;

            }


            const player =
                players.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            id
                        )
                );


            if (
                player
            ) {

                return player;

            }

        }


        return null;

    }


    function getPlayerName(
        match,
        side
    ) {

        const isHome =
            side ===
            "home";


        const directKeys =
            isHome

                ? [
                    "home_player_name",
                    "home_name",
                    "player1_name",
                    "player_a_name",
                    "home_player"
                ]

                : [
                    "away_player_name",
                    "away_name",
                    "player2_name",
                    "player_b_name",
                    "away_player"
                ];


        for (
            const key
            of directKeys
        ) {

            const value =
                match?.[
                    key
                ];


            if (
                value !==
                undefined &&
                value !==
                null &&
                String(
                    value
                ).trim() !== ""
            ) {

                if (
                    typeof value ===
                    "string"
                ) {

                    return value;

                }


                if (
                    typeof value ===
                    "object"
                ) {

                    return (
                        value.name ||
                        "A DEFINIR"
                    );

                }

            }

        }


        const player =
            findPlayer(
                match,
                side
            );


        if (
            player?.name
        ) {

            return player.name;

        }


        return "A DEFINIR";

    }


    /* =====================================================
       SCORE
       ===================================================== */

    function getScore(
        match,
        side
    ) {

        const isHome =
            side ===
            "home";


        const keys =
            isHome

                ? [
                    "home_score",
                    "player1_score",
                    "player_a_score",
                    "home_goals",
                    "score1",
                    "score_a"
                ]

                : [
                    "away_score",
                    "player2_score",
                    "player_b_score",
                    "away_goals",
                    "score2",
                    "score_b"
                ];


        for (
            const key
            of keys
        ) {

            if (
                match?.[
                    key
                ] !==
                undefined
            ) {

                return number(
                    match[
                        key
                    ]
                );

            }

        }


        return 0;

    }


    /* =====================================================
       STATUS
       ===================================================== */

    function getStatus(
        match
    ) {

        return normalize(
            match?.status ||
            match?.state ||
            match?.match_status ||
            ""
        );

    }


    function isFinished(
        match
    ) {

        return [

            "FINAL",

            "FINISHED",

            "COMPLETED",

            "DONE",

            "FINALIZADA",

            "CONCLUIDA",

            "ENCERRADA"

        ].includes(
            getStatus(
                match
            )
        );

    }


    /* =====================================================
       NÚMERO DA PARTIDA
       ===================================================== */

    function getMatchNumber(
        match,
        fallback
    ) {

        const keys = [

            "match_number",

            "match",

            "game_number",

            "fixture_number",

            "position",

            "number"

        ];


        for (
            const key
            of keys
        ) {

            const value =
                number(
                    match?.[
                        key
                    ]
                );


            if (
                value >
                0
            ) {

                return value;

            }

        }


        return fallback;

    }


    /* =====================================================
       FASE
       ===================================================== */

    function getPhase(
        match,
        index
    ) {

        const raw =
            normalize(
                match?.round ||
                match?.round_name ||
                match?.phase ||
                match?.stage ||
                match?.round_type ||
                ""
            );


        if (
            raw.includes(
                "FINAL"
            ) &&
            !raw.includes(
                "SEMI"
            )
        ) {

            return "final";

        }


        if (
            raw.includes(
                "SEMI"
            )
        ) {

            return "semi";

        }


        if (
            raw.includes(
                "QUART"
            ) ||
            raw.includes(
                "QF"
            )
        ) {

            return "quarterfinal";

        }


        const round =
            number(
                match?.round_number ||
                match?.stage_number
            );


        if (
            round ===
            3
        ) {

            return "final";

        }


        if (
            round ===
            2
        ) {

            return "semi";

        }


        /*
         * Fallback pelo número do jogo:
         *
         * 1–4  = quartas
         * 5–6  = semi
         * 7    = final
         */

        const matchNumber =
            getMatchNumber(
                match,
                index + 1
            );


        if (
            matchNumber >=
            7
        ) {

            return "final";

        }


        if (
            matchNumber >=
            5
        ) {

            return "semi";

        }


        return "quarterfinal";

    }


    /* =====================================================
       DADOS
       ===================================================== */

    function getNightMatches() {

        if (
            !window.CCFVLive
        ) {

            return [];

        }


        if (
            !Array.isArray(
                window.CCFVLive.nightMatches
            )
        ) {

            return [];

        }


        return window.CCFVLive
            .nightMatches
            .slice();

    }


    function splitMatches() {

        const groups = {

            quarterfinal: [],

            semi: [],

            final: []

        };


        getNightMatches()
            .forEach(
                (
                    match,
                    index
                ) => {

                    const phase =
                        getPhase(
                            match,
                            index
                        );


                    if (
                        groups[
                            phase
                        ]
                    ) {

                        groups[
                            phase
                        ].push(
                            match
                        );

                    }

                }
            );


        Object.keys(
            groups
        )
            .forEach(
                key => {

                    groups[
                        key
                    ].sort(
                        (
                            a,
                            b
                        ) =>
                            getMatchNumber(
                                a,
                                0
                            ) -
                            getMatchNumber(
                                b,
                                0
                            )
                    );

                }
            );


        return groups;

    }


    /* =====================================================
       CSS
       ===================================================== */

    function injectStyles() {

        if (
            document.getElementById(
                "ccfv-public-night-live"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "ccfv-public-night-live";


        style.textContent = `

            .ccfv-night-live-match {

                padding:
                    12px;

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .07
                    );

                border-radius:
                    10px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .012
                    );

                box-sizing:
                    border-box;

            }


            .ccfv-night-live-match
            + .ccfv-night-live-match {

                margin-top:
                    9px;

            }


            .ccfv-night-live-match.is-finished {

                border-color:
                    rgba(
                        67,
                        223,
                        145,
                        .25
                    );

                background:
                    rgba(
                        67,
                        223,
                        145,
                        .025
                    );

            }


            .ccfv-night-live-match__number {

                color:
                    #43df91;

                font-size:
                    10px;

                font-weight:
                    900;

                letter-spacing:
                    .08em;

                margin-bottom:
                    9px;

            }


            .ccfv-night-live-match__teams {

                display:
                    grid;

                grid-template-columns:
                    minmax(
                        0,
                        1fr
                    )
                    auto
                    minmax(
                        0,
                        1fr
                    );

                gap:
                    10px;

                align-items:
                    center;

            }


            .ccfv-night-live-match__team {

                min-width:
                    0;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .85
                    );

                font-size:
                    13px;

                font-weight:
                    900;

                white-space:
                    nowrap;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

            }


            .ccfv-night-live-match__team:last-child {

                text-align:
                    right;

            }


            .ccfv-night-live-match__score {

                min-width:
                    60px;

                padding:
                    7px 10px;

                border:
                    1px solid
                    rgba(
                        67,
                        223,
                        145,
                        .2
                    );

                border-radius:
                    999px;

                color:
                    #43df91;

                text-align:
                    center;

                font-size:
                    12px;

                font-weight:
                    950;

            }


            .ccfv-night-live-match__status {

                margin-top:
                    9px;

                padding-top:
                    8px;

                border-top:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .04
                    );

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .18
                    );

                font-size:
                    8px;

                font-weight:
                    800;

                text-transform:
                    uppercase;

            }


            .ccfv-night-live-match__winner {

                margin-top:
                    7px;

                color:
                    #43df91;

                font-size:
                    9px;

                font-weight:
                    900;

            }


        `;


        document.head.appendChild(
            style
        );

    }


    /* =====================================================
       RENDER DE PARTIDAS
       ===================================================== */

    function renderGames(
        container,
        matches,
        label
    ) {

        if (
            !container
        ) {

            return;

        }


        if (
            !matches.length
        ) {

            container.innerHTML =
                "";

            return;

        }


        container.innerHTML =
            matches
                .map(
                    (
                        match,
                        index
                    ) => {

                        const home =
                            getPlayerName(
                                match,
                                "home"
                            );

                        const away =
                            getPlayerName(
                                match,
                                "away"
                            );


                        const finished =
                            isFinished(
                                match
                            );


                        const homeScore =
                            getScore(
                                match,
                                "home"
                            );


                        const awayScore =
                            getScore(
                                match,
                                "away"
                            );


                        let winner =
                            "";


                        if (
                            finished &&
                            homeScore !==
                            awayScore
                        ) {

                            winner =
                                homeScore >
                                awayScore
                                    ? home
                                    : away;

                        }


                        const gameNumber =
                            String(
                                getMatchNumber(
                                    match,
                                    index + 1
                                )
                            ).padStart(
                                2,
                                "0"
                            );


                        return `

                            <article
                                class="
                                    ccfv-night-live-match
                                    ${
                                        finished
                                            ? "is-finished"
                                            : ""
                                    }
                                "
                            >

                                <div
                                    class="
                                        ccfv-night-live-match__number
                                    "
                                >
                                    ${escapeHTML(
                                        label
                                    )}
                                    ${gameNumber}
                                </div>


                                <div
                                    class="
                                        ccfv-night-live-match__teams
                                    "
                                >

                                    <strong
                                        class="
                                            ccfv-night-live-match__team
                                        "
                                    >
                                        ${escapeHTML(
                                            home
                                        )}
                                    </strong>


                                    <span
                                        class="
                                            ccfv-night-live-match__score
                                        "
                                    >
                                        ${
                                            finished

                                                ? `${homeScore} × ${awayScore}`

                                                : "VS"
                                        }
                                    </span>


                                    <strong
                                        class="
                                            ccfv-night-live-match__team
                                        "
                                    >
                                        ${escapeHTML(
                                            away
                                        )}
                                    </strong>

                                </div>


                                <div
                                    class="
                                        ccfv-night-live-match__status
                                    "
                                >
                                    ${
                                        finished

                                            ? "RESULTADO REGISTRADO"

                                            : "A DEFINIR"
                                    }
                                </div>


                                ${
                                    winner

                                        ? `
                                            <div
                                                class="
                                                    ccfv-night-live-match__winner
                                                "
                                            >
                                                VENCEDOR:
                                                ${escapeHTML(
                                                    winner
                                                )}
                                            </div>
                                        `

                                        : ""
                                }

                            </article>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       DESCOBRIR CAMPEÃO
       ===================================================== */

    function getChampion(
        finalMatches
    ) {

        const finalMatch =
            finalMatches.find(
                isFinished
            );


        if (
            !finalMatch
        ) {

            return "A DEFINIR";

        }


        const winnerId =
            finalMatch.winner_id ||
            finalMatch.winner_player_id;


        if (
            winnerId
        ) {

            const player =
                getPlayers().find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            winnerId
                        )
                );


            if (
                player?.name
            ) {

                return player.name;

            }

        }


        const explicitWinner =
            finalMatch.winner_name ||
            finalMatch.winner ||
            finalMatch.winner_player_name;


        if (
            explicitWinner
        ) {

            if (
                typeof explicitWinner ===
                "string"
            ) {

                return explicitWinner;

            }


            if (
                typeof explicitWinner ===
                "object"
            ) {

                return (
                    explicitWinner.name ||
                    "A DEFINIR"
                );

            }

        }


        const homeScore =
            getScore(
                finalMatch,
                "home"
            );


        const awayScore =
            getScore(
                finalMatch,
                "away"
            );


        if (
            homeScore ===
            awayScore
        ) {

            return "A DEFINIR";

        }


        return homeScore >
            awayScore

            ? getPlayerName(
                finalMatch,
                "home"
            )

            : getPlayerName(
                finalMatch,
                "away"
            );

    }


    /* =====================================================
       CHAVEAMENTO ESTÁTICO
       ===================================================== */

    function renderStaticBracket(
        groups
    ) {

        const articles =
            document.querySelectorAll(
                ".ccfv-night-bracket-match"
            );


        if (
            !articles.length
        ) {

            return;

        }


        const qf =
            groups.quarterfinal;


        const sf =
            groups.semi;


        const finalMatches =
            groups.final;


        /*
         * QUARTAS
         */

        articles
            .forEach(
                (
                    article,
                    index
                ) => {

                    if (
                        index >=
                        4
                    ) {

                        return;

                    }


                    const match =
                        qf[
                            index
                        ];


                    if (
                        !match
                    ) {

                        return;

                    }


                    const teams =
                        article.querySelectorAll(
                            ".ccfv-night-bracket-team strong"
                        );


                    if (
                        teams[0]
                    ) {

                        teams[0].textContent =
                            getPlayerName(
                                match,
                                "home"
                            );

                    }


                    if (
                        teams[1]
                    ) {

                        teams[1].textContent =
                            getPlayerName(
                                match,
                                "away"
                            );

                    }

                }
            );


        /*
         * SEMIS
         */

        const semiArticles =
            document.querySelectorAll(
                ".ccfv-night-bracket-column--middle .ccfv-night-bracket-match"
            );


        semiArticles
            .forEach(
                (
                    article,
                    index
                ) => {

                    const match =
                        sf[
                            index
                        ];


                    if (
                        !match
                    ) {

                        return;

                    }


                    const teams =
                        article.querySelectorAll(
                            ".ccfv-night-bracket-team strong"
                        );


                    if (
                        teams[0]
                    ) {

                        teams[0].textContent =
                            getPlayerName(
                                match,
                                "home"
                            );

                    }


                    if (
                        teams[1]
                    ) {

                        teams[1].textContent =
                            getPlayerName(
                                match,
                                "away"
                            );

                    }

                }
            );


        /*
         * FINAL
         */

        const finalArticle =
            document.querySelector(
                ".ccfv-night-final-match"
            );


        const finalMatch =
            finalMatches[0];


        if (
            finalArticle &&
            finalMatch
        ) {

            const teams =
                finalArticle.querySelectorAll(
                    ".ccfv-night-final-match__team strong"
                );


            if (
                teams[0]
            ) {

                teams[0].textContent =
                    getPlayerName(
                        finalMatch,
                        "home"
                    );

            }


            if (
                teams[1]
            ) {

                teams[1].textContent =
                    getPlayerName(
                        finalMatch,
                        "away"
                    );

            }


            const champion =
                getChampion(
                    finalMatches
                );


            const championElement =
                document.querySelector(
                    "#night-champion-name"
                );


            if (
                championElement
            ) {

                championElement.textContent =
                    champion;

            }

        }

        else {

            const championElement =
                document.querySelector(
                    "#night-champion-name"
                );


            if (
                championElement
            ) {

                championElement.textContent =
                    "A DEFINIR";

            }

        }

    }


    /* =====================================================
       ATUALIZAR
       ===================================================== */

    function update() {

        const quarterfinals =
            document.querySelector(
                "#night-quarterfinals"
            );


        const semifinals =
            document.querySelector(
                "#night-semifinals"
            );


        const final =
            document.querySelector(
                "#night-final"
            );


        if (
            !quarterfinals &&
            !semifinals &&
            !final
        ) {

            return;

        }


        injectStyles();


        const groups =
            splitMatches();


        renderGames(
            quarterfinals,
            groups.quarterfinal,
            "QF"
        );


        renderGames(
            semifinals,
            groups.semi,
            "SF"
        );


        renderGames(
            final,
            groups.final,
            "FINAL"
        );


        renderStaticBracket(
            groups
        );

    }


    /* =====================================================
       EVENTO LIVE
       ===================================================== */

    function startLiveListener() {

        if (
            observerStarted
        ) {

            return;

        }


        observerStarted =
            true;


        window.addEventListener(
            "ccfv:live-update",
            () => {

                update();

            }
        );


        /*
         * O ccfv-live.js pode carregar depois
         * deste arquivo. Por isso tentamos
         * novamente algumas vezes no início.
         */

        let attempts =
            0;


        const timer =
            window.setInterval(
                () => {

                    attempts++;


                    update();


                    if (
                        (
                            window.CCFVLive &&
                            Array.isArray(
                                window.CCFVLive.nightMatches
                            )
                        )
                        ||
                        attempts >=
                        40
                    ) {

                        window.clearInterval(
                            timer
                        );

                    }

                },
                250
            );

    }


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        update();

        startLiveListener();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once:
                    true
            }
        );

    }

    else {

        init();

    }

})();