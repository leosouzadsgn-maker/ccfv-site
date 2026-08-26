/* =========================================================
   CCFV // NIGHT CUP PUBLIC LIVE
   ADMIN -> matches -> CCFVLive -> NIGHT CUP PUBLIC
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const SELECTORS = {

        bracketMatches:
            ".ccfv-night-bracket-match",

        finalMatch:
            ".ccfv-night-final-match",

        finalTeam:
            ".ccfv-night-final-match__team",

        finalChampion:
            ".ccfv-night-final-match__champion",

        headingStatus:
            ".ccfv-night-heading-status"

    };


    /* =====================================================
       HELPERS
       ===================================================== */

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


    function number(
        value
    ) {

        const result =
            Number(
                value
            );


        return Number.isFinite(
            result
        )
            ? result
            : 0;

    }


    /* =====================================================
       LOCALIZAR JOGADOR
       ===================================================== */

    function getPlayerName(
        playerId,
        fallback
    ) {

        const players =
            window.CCFVLive &&
            Array.isArray(
                window.CCFVLive.players
            )
                ? window.CCFVLive.players
                : [];


        if (
            playerId
        ) {

            const player =
                players.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            playerId
                        )
                );


            if (
                player &&
                player.name
            ) {

                return player.name;

            }

        }


        return (
            fallback ||
            "A DEFINIR"
        );

    }


    /* =====================================================
       EXTRAIR JOGADOR CASA
       ===================================================== */

    function getHomeName(
        match
    ) {

        return getPlayerName(

            match.home_player_id,

            match.home_player_name ||
            match.home_name ||
            match.home_player ||
            match.home_team ||

            "A DEFINIR"

        );

    }


    /* =====================================================
       EXTRAIR JOGADOR FORA
       ===================================================== */

    function getAwayName(
        match
    ) {

        return getPlayerName(

            match.away_player_id,

            match.away_player_name ||
            match.away_name ||
            match.away_player ||
            match.away_team ||

            "A DEFINIR"

        );

    }


    /* =====================================================
       STATUS
       ===================================================== */

    function isFinished(
        match
    ) {

        const status =
            normalize(
                match.status
            );


        return (

            status ===
                "FINAL"

            ||

            status ===
                "FINISHED"

            ||

            status ===
                "COMPLETED"

            ||

            status ===
                "CONCLUIDA"

            ||

            status ===
                "CONCLUIDA"

            ||

            status ===
                "ENCERRADA"

        );

    }


    /* =====================================================
       VENCEDOR
       ===================================================== */

    function getWinner(
        match
    ) {

        if (
            !match ||
            !isFinished(
                match
            )
        ) {

            return null;

        }


        const homeScore =
            number(
                match.home_score
            );


        const awayScore =
            number(
                match.away_score
            );


        if (
            homeScore ===
            awayScore
        ) {

            return null;

        }


        return (

            homeScore >
            awayScore

                ? getHomeName(
                    match
                )

                : getAwayName(
                    match
                )

        );

    }


    /* =====================================================
       FASE
       ===================================================== */

    function getStage(
        match
    ) {

        const stage =
            normalize(
                match.stage
            );


        if (
            stage.includes(
                "FINAL"
            ) &&
            !stage.includes(
                "SEMI"
            ) &&
            !stage.includes(
                "QUART"
            ) &&
            !stage.includes(
                "QF"
            )
        ) {

            return "FINAL";

        }


        if (
            stage.includes(
                "SEMI"
            )
        ) {

            return "SEMIFINAL";

        }


        if (
            stage.includes(
                "QUART"
            ) ||
            stage.includes(
                "QF"
            )
        ) {

            return "QUARTAS";

        }


        const matchNumber =
            number(
                match.match_number
            );


        if (
            matchNumber ===
            7
        ) {

            return "FINAL";

        }


        if (
            matchNumber ===
            5 ||
            matchNumber ===
            6
        ) {

            return "SEMIFINAL";

        }


        if (
            matchNumber >= 1 &&
            matchNumber <= 4
        ) {

            return "QUARTAS";

        }


        return "";

    }


    /* =====================================================
       NÚMERO DO JOGO
       ===================================================== */

    function getMatchNumber(
        match
    ) {

        return number(
            match.match_number
        );

    }


    /* =====================================================
       PEGAR NIGHT CUP
       ===================================================== */

    function getNightMatches() {

        const state =
            window.CCFVLive;


        if (
            !state
        ) {

            return [];

        }


        if (
            !Array.isArray(
                state.matches
            )
        ) {

            return [];

        }


        return state.matches

            .filter(
                match =>
                    normalize(
                        match.competition
                    ) ===
                    "NIGHT_CUP"
            )

            .filter(
                match =>
                    getStage(
                        match
                    ) !==
                    ""
            )

            .sort(
                (
                    a,
                    b
                ) => {

                    const aNumber =
                        getMatchNumber(
                            a
                        );


                    const bNumber =
                        getMatchNumber(
                            b
                        );


                    return (
                        aNumber -
                        bNumber
                    );

                }
            );

    }


    /* =====================================================
       LOCALIZAR PARTIDA
       ===================================================== */

    function findMatch(
        matches,
        matchNumber
    ) {

        return (

            matches.find(
                match =>
                    getMatchNumber(
                        match
                    ) ===
                    matchNumber
            )

            ||

            null

        );

    }


    /* =====================================================
       CRIAR HTML DA EQUIPE/JOGADOR
       ===================================================== */

    function renderBracketTeam(
        element,
        name,
        label,
        score
    ) {

        if (
            !element
        ) {

            return;

        }


        const strong =
            element.querySelector(
                "strong"
            );


        const span =
            element.querySelector(
                "span"
            );


        if (
            strong
        ) {

            strong.textContent =
                name ||
                "A DEFINIR";

        }


        if (
            span
        ) {

            span.textContent =
                label || "";

        }


        /*
         * Se houver placar, coloca
         * discretamente ao lado do nome.
         */

        let scoreElement =
            element.querySelector(
                ".ccfv-night-live-score"
            );


        if (
            score !==
            null &&
            score !==
            undefined
        ) {

            if (
                !scoreElement
            ) {

                scoreElement =
                    document.createElement(
                        "span"
                    );


                scoreElement.className =
                    "ccfv-night-live-score";


                element.appendChild(
                    scoreElement
                );

            }


            scoreElement.textContent =
                String(
                    score
                );

        }

        else if (
            scoreElement
        ) {

            scoreElement.remove();

        }

    }


    /* =====================================================
       ATUALIZAR QUARTAS
       ===================================================== */

    function renderQuarterfinals(
        matches
    ) {

        const games =
            document.querySelectorAll(
                SELECTORS.bracketMatches
            );


        if (
            games.length <
            6
        ) {

            return;

        }


        const qfGames = [

            {
                element:
                    games[0],

                match:
                    findMatch(
                        matches,
                        1
                    ),

                label1:
                    "01",

                label2:
                    "02"

            },

            {
                element:
                    games[1],

                match:
                    findMatch(
                        matches,
                        2
                    ),

                label1:
                    "03",

                label2:
                    "04"

            },

            {
                element:
                    games[2],

                match:
                    findMatch(
                        matches,
                        3
                    ),

                label1:
                    "05",

                label2:
                    "06"

            },

            {
                element:
                    games[3],

                match:
                    findMatch(
                        matches,
                        4
                    ),

                label1:
                    "07",

                label2:
                    "08"

            }

        ];


        qfGames.forEach(
            item => {

                if (
                    !item.element
                ) {

                    return;

                }


                const teams =
                    item.element.querySelectorAll(
                        ".ccfv-night-bracket-team"
                    );


                if (
                    teams.length <
                    2
                ) {

                    return;

                }


                if (
                    !item.match
                ) {

                    renderBracketTeam(
                        teams[0],
                        "A DEFINIR",
                        item.label1,
                        null
                    );


                    renderBracketTeam(
                        teams[1],
                        "A DEFINIR",
                        item.label2,
                        null
                    );


                    return;

                }


                renderBracketTeam(

                    teams[0],

                    getHomeName(
                        item.match
                    ),

                    item.label1,

                    isFinished(
                        item.match
                    )
                        ? number(
                            item.match.home_score
                        )
                        : null

                );


                renderBracketTeam(

                    teams[1],

                    getAwayName(
                        item.match
                    ),

                    item.label2,

                    isFinished(
                        item.match
                    )
                        ? number(
                            item.match.away_score
                        )
                        : null

                );

            }
        );

    }


    /* =====================================================
       SEMIFINAIS
       ===================================================== */

    function renderSemifinals(
        matches
    ) {

        const games =
            document.querySelectorAll(
                SELECTORS.bracketMatches
            );


        if (
            games.length <
            6
        ) {

            return;

        }


        const semifinal1 =
            findMatch(
                matches,
                5
            );


        const semifinal2 =
            findMatch(
                matches,
                6
            );


        const firstSemifinal =
            games[4];


        const secondSemifinal =
            games[5];


        const qf1 =
            findMatch(
                matches,
                1
            );


        const qf2 =
            findMatch(
                matches,
                2
            );


        const qf3 =
            findMatch(
                matches,
                3
            );


        const qf4 =
            findMatch(
                matches,
                4
            );


        /*
         * SF01
         */

        renderSemifinalSource(
            firstSemifinal,
            semifinal1,

            qf1,
            qf2,

            "QF 01",
            "QF 02"

        );


        /*
         * SF02
         */

        renderSemifinalSource(
            secondSemifinal,
            semifinal2,

            qf3,
            qf4,

            "QF 03",
            "QF 04"

        );

    }


    function renderSemifinalSource(
        element,
        semifinal,
        qfA,
        qfB,
        labelA,
        labelB
    ) {

        if (
            !element
        ) {

            return;

        }


        const teams =
            element.querySelectorAll(
                ".ccfv-night-bracket-team"
            );


        if (
            teams.length <
            2
        ) {

            return;

        }


        /*
         * Se a semifinal já foi registrada,
         * usamos diretamente os jogadores que
         * estavam na partida.
         */

        if (
            semifinal
        ) {

            renderBracketTeam(
                teams[0],
                getHomeName(
                    semifinal
                ),
                labelA,
                isFinished(
                    semifinal
                )
                    ? number(
                        semifinal.home_score
                    )
                    : null
            );


            renderBracketTeam(
                teams[1],
                getAwayName(
                    semifinal
                ),
                labelB,
                isFinished(
                    semifinal
                )
                    ? number(
                        semifinal.away_score
                    )
                    : null
            );


            return;

        }


        /*
         * Se ainda não foi registrada,
         * mostramos o vencedor da QF.
         */

        const winnerA =
            getWinner(
                qfA
            );


        const winnerB =
            getWinner(
                qfB
            );


        renderBracketTeam(
            teams[0],
            winnerA ||
                "A DEFINIR",
            labelA,
            null
        );


        renderBracketTeam(
            teams[1],
            winnerB ||
                "A DEFINIR",
            labelB,
            null
        );

    }


    /* =====================================================
       FINAL
       ===================================================== */

    function renderFinal(
        matches
    ) {

        const finalElement =
            document.querySelector(
                SELECTORS.finalMatch
            );


        if (
            !finalElement
        ) {

            return;

        }


        const teams =
            finalElement.querySelectorAll(
                ".ccfv-night-final-match__team"
            );


        if (
            teams.length <
            2
        ) {

            return;

        }


        const finalMatch =
            findMatch(
                matches,
                7
            );


        const semifinal1 =
            findMatch(
                matches,
                5
            );


        const semifinal2 =
            findMatch(
                matches,
                6
            );


        /*
         * FINAL já registrada
         */

        if (
            finalMatch
        ) {

            renderFinalTeam(
                teams[0],
                getHomeName(
                    finalMatch
                ),
                isFinished(
                    finalMatch
                )
                    ? number(
                        finalMatch.home_score
                    )
                    : null,
                "FINALISTA 01"
            );


            renderFinalTeam(
                teams[1],
                getAwayName(
                    finalMatch
                ),
                isFinished(
                    finalMatch
                )
                    ? number(
                        finalMatch.away_score
                    )
                    : null,
                "FINALISTA 02"
            );


            updateChampion(
                finalMatch
            );


            return;

        }


        /*
         * FINAL ainda não registrada:
         * mostramos os vencedores das semis.
         */

        const finalist1 =
            getWinner(
                semifinal1
            );


        const finalist2 =
            getWinner(
                semifinal2
            );


        renderFinalTeam(
            teams[0],
            finalist1 ||
                "A DEFINIR",
            null,
            "FINALISTA 01"
        );


        renderFinalTeam(
            teams[1],
            finalist2 ||
                "A DEFINIR",
            null,
            "FINALISTA 02"
        );


        const champion =
            document.querySelector(
                SELECTORS.finalChampion
            );


        if (
            champion
        ) {

            champion.innerHTML = `

                <span>
                    🏆
                </span>

                CAMPEÃO

            `;

        }

    }


    function renderFinalTeam(
        element,
        name,
        score,
        label
    ) {

        if (
            !element
        ) {

            return;

        }


        const strong =
            element.querySelector(
                "strong"
            );


        const span =
            element.querySelector(
                "span"
            );


        if (
            strong
        ) {

            strong.textContent =
                name;

        }


        if (
            span
        ) {

            span.textContent =
                label;

        }


        let scoreElement =
            element.querySelector(
                ".ccfv-night-final-score"
            );


        if (
            score !==
            null &&
            score !==
            undefined
        ) {

            if (
                !scoreElement
            ) {

                scoreElement =
                    document.createElement(
                        "small"
                    );


                scoreElement.className =
                    "ccfv-night-final-score";


                element.appendChild(
                    scoreElement
                );

            }


            scoreElement.textContent =
                String(
                    score
                );

        }

        else if (
            scoreElement
        ) {

            scoreElement.remove();

        }

    }


    /* =====================================================
       CAMPEÃO
       ===================================================== */

    function updateChampion(
        finalMatch
    ) {

        const champion =
            document.querySelector(
                SELECTORS.finalChampion
            );


        if (
            !champion
        ) {

            return;

        }


        const winner =
            getWinner(
                finalMatch
            );


        champion.innerHTML = winner

            ? `

                <span>
                    🏆
                </span>

                CAMPEÃO:
                <strong>
                    ${escapeHTML(
                        winner
                    )}
                </strong>

            `

            : `

                <span>
                    🏆
                </span>

                CAMPEÃO

            `;

    }


    /* =====================================================
       STATUS DO CABEÇALHO
       ===================================================== */

    function updateHeadingStatus(
        matches
    ) {

        const element =
            document.querySelector(
                SELECTORS.headingStatus
            );


        if (
            !element
        ) {

            return;

        }


        const final =
            findMatch(
                matches,
                7
            );


        const completed =
            matches.filter(
                isFinished
            ).length;


        if (
            final &&
            isFinished(
                final
            )
        ) {

            element.textContent =
                "NIGHT CUP #01 • FINALIZADA";

            return;

        }


        if (
            completed >
            0
        ) {

            element.textContent =
                `NIGHT CUP #01 • ${completed}/7`;

            return;

        }


        element.textContent =
            "NIGHT CUP #01";

    }


    /* =====================================================
       RENDER PRINCIPAL
       ===================================================== */

    function render() {

        const matches =
            getNightMatches();


        renderQuarterfinals(
            matches
        );


        renderSemifinals(
            matches
        );


        renderFinal(
            matches
        );


        updateHeadingStatus(
            matches
        );


        console.log(
            "%cCCFV // NIGHT LIVE",
            "color:#43df91;font-weight:900;",
            {
                partidas:
                    matches.length,

                finalizada:
                    matches.filter(
                        isFinished
                    ).length
            }
        );

    }


    /* =====================================================
       ESPERAR CCFV LIVE
       ===================================================== */

    function start() {

        render();


        window.addEventListener(
            "ccfv:live-update",
            () => {

                render();

            }
        );


        /*
         * O ccfv-live.js é carregado depois
         * deste arquivo. Este intervalo cobre
         * o primeiro carregamento.
         */

        let attempts =
            0;


        const timer =
            window.setInterval(
                () => {

                    attempts++;


                    if (
                        window.CCFVLive
                    ) {

                        render();

                    }


                    if (
                        attempts >=
                        20
                    ) {

                        window.clearInterval(
                            timer
                        );

                    }

                },
                500
            );

    }


    /* =====================================================
       INIT
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once:
                    true
            }
        );

    }

    else {

        start();

    }

})();