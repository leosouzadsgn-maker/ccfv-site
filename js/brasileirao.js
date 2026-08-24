/* =========================================================
   CCFV — BRASILEIRÃO
   SISTEMA OFICIAL DA COMPETIÇÃO

   SEASON 01
   20 CLUBES
   38 RODADAS
   IDA + VOLTA
   380 PARTIDAS
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const CCFV_BRASILEIRAO = {

        season: 1,

        status: "PREPARANDO",

        totalTeams: 20,

        totalRounds: 38,

        currentRound: 1,

        featuredMatch: 0,


        /* =================================================
           RESULTADOS OFICIAIS
           =================================================

           A Season 01 começa zerada.

           Os resultados serão adicionados futuramente
           pelo sistema de administração da CCFV.
           ================================================= */

        results: [],


        /* =================================================
           20 CLUBES
           ================================================= */

        teams: [

            {
                id: 1,
                name: "PALMEIRAS",
                shortName: "PAL",
                crest: "../assets/images/clubs/palmeiras.png"
            },

            {
                id: 2,
                name: "FLAMENGO",
                shortName: "FLA",
                crest: "../assets/images/clubs/flamengo.png"
            },

            {
                id: 3,
                name: "ATHLETICO-PR",
                shortName: "CAP",
                crest: "../assets/images/clubs/athletico-pr.png"
            },

            {
                id: 4,
                name: "FLUMINENSE",
                shortName: "FLU",
                crest: "../assets/images/clubs/fluminense.png"
            },

            {
                id: 5,
                name: "CRUZEIRO",
                shortName: "CRU",
                crest: "../assets/images/clubs/cruzeiro.png"
            },

            {
                id: 6,
                name: "BAHIA",
                shortName: "BAH",
                crest: "../assets/images/clubs/bahia.png"
            },

            {
                id: 7,
                name: "CORINTHIANS",
                shortName: "COR",
                crest: "../assets/images/clubs/corinthians.png"
            },

            {
                id: 8,
                name: "BRAGANTINO",
                shortName: "RBB",
                crest: "../assets/images/clubs/bragantino.png"
            },

            {
                id: 9,
                name: "BOTAFOGO",
                shortName: "BOT",
                crest: "../assets/images/clubs/botafogo.png"
            },

            {
                id: 10,
                name: "CORITIBA",
                shortName: "CFC",
                crest: "../assets/images/clubs/coritiba.png"
            },

            {
                id: 11,
                name: "ATLÉTICO-MG",
                shortName: "CAM",
                crest: "../assets/images/clubs/atletico-mg.png"
            },

            {
                id: 12,
                name: "SÃO PAULO",
                shortName: "SAO",
                crest: "../assets/images/clubs/sao-paulo.png"
            },

            {
                id: 13,
                name: "VITÓRIA",
                shortName: "VIT",
                crest: "../assets/images/clubs/vitoria.png"
            },

            {
                id: 14,
                name: "GRÊMIO",
                shortName: "GRE",
                crest: "../assets/images/clubs/gremio.png"
            },

            {
                id: 15,
                name: "MIRASSOL",
                shortName: "MIR",
                crest: "../assets/images/clubs/mirassol.png"
            },

            {
                id: 16,
                name: "INTERNACIONAL",
                shortName: "INT",
                crest: "../assets/images/clubs/internacional.png"
            },

            {
                id: 17,
                name: "SANTOS",
                shortName: "SAN",
                crest: "../assets/images/clubs/santos.png"
            },

            {
                id: 18,
                name: "VASCO",
                shortName: "VAS",
                crest: "../assets/images/clubs/vasco.png"
            },

            {
                id: 19,
                name: "REMO",
                shortName: "REM",
                crest: "../assets/images/clubs/remo.png"
            },

            {
                id: 20,
                name: "CHAPECOENSE",
                shortName: "CHA",
                crest: "../assets/images/clubs/chapecoense.png"
            }

        ]

    };


    /* =====================================================
       ESTADO
       ===================================================== */

    let fixtures = [];

    let standings = [];


    /* =====================================================
       ELEMENTOS DA PÁGINA
       ===================================================== */

    const elements = {

        matches:
            document.querySelector(
                ".ccfv-round-matches"
            ),

        feature:
            document.querySelector(
                ".ccfv-round-feature"
            ),

        roundStatus:
            document.querySelector(
                ".ccfv-brasileirao-rounds .ccfv-brasileirao-heading-status"
            ),

        results:
            document.querySelector(
                "#ccfv-results-list"
            ),

        resultsSeason:
            document.querySelector(
                "#ccfv-results-season"
            ),

        progressBar:
            document.querySelector(
                ".ccfv-brasileirao-season__progress-bar span"
            ),

        progressTop:
            document.querySelector(
                ".ccfv-brasileirao-season__progress-top"
            ),

        progressBottom:
            document.querySelector(
                ".ccfv-brasileirao-season__progress-bottom"
            ),

        seasonNumber:
            document.querySelector(
                ".ccfv-brasileirao-season__number strong"
            ),

        seasonStatus:
            document.querySelector(
                ".ccfv-brasileirao-season__status"
            ),

        champion:
            document.querySelector(
                ".ccfv-brasileirao-champion__content h2"
            ),

        championStatus:
            document.querySelector(
                ".ccfv-brasileirao-champion__status strong"
            )

    };


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function getTeam(id) {

        return CCFV_BRASILEIRAO.teams.find(
            team => team.id === Number(id)
        );

    }


    function escapeHTML(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function pad(value) {

        return String(value).padStart(2, "0");

    }


    /* =====================================================
       GERAÇÃO DOS 380 JOGOS
       ===================================================== */

    function generateFixtures() {

        const ids =
            CCFV_BRASILEIRAO.teams.map(
                team => team.id
            );


        let rotation = [...ids];

        const firstHalf = [];


        for (
            let round = 1;
            round <= 19;
            round++
        ) {

            const matches = [];


            for (
                let i = 0;
                i < rotation.length / 2;
                i++
            ) {

                matches.push({

                    round,

                    match:
                        i + 1,

                    home:
                        rotation[i],

                    away:
                        rotation[
                            rotation.length - 1 - i
                        ]

                });

            }


            firstHalf.push(matches);


            const fixed =
                rotation[0];

            const moving =
                rotation.slice(1);


            moving.unshift(
                moving.pop()
            );


            rotation = [
                fixed,
                ...moving
            ];

        }


        const secondHalf =
            firstHalf.map(
                matches =>
                    matches.map(
                        match => ({

                            round:
                                match.round + 19,

                            match:
                                match.match,

                            home:
                                match.away,

                            away:
                                match.home

                        })
                    )
            );


        return [
            ...firstHalf.flat(),
            ...secondHalf.flat()
        ];

    }


    /* =====================================================
       CLASSIFICAÇÃO INICIAL
       ===================================================== */

    function createStandings() {

        return CCFV_BRASILEIRAO.teams.map(
            team => ({

                id:
                    team.id,

                name:
                    team.name,

                shortName:
                    team.shortName,

                crest:
                    team.crest,

                games:
                    0,

                wins:
                    0,

                draws:
                    0,

                losses:
                    0,

                goalsFor:
                    0,

                goalsAgainst:
                    0,

                goalDifference:
                    0,

                points:
                    0

            })
        );

    }


    /* =====================================================
       CALCULA CLASSIFICAÇÃO
       ===================================================== */

    function calculateStandings() {

        standings =
            createStandings();


        const table =
            new Map(
                standings.map(
                    team => [
                        team.id,
                        team
                    ]
                )
            );


        CCFV_BRASILEIRAO.results.forEach(
            result => {

                const home =
                    table.get(
                        Number(result.homeTeam)
                    );

                const away =
                    table.get(
                        Number(result.awayTeam)
                    );


                if (!home || !away) {

                    return;

                }


                const homeGoals =
                    Number(result.homeGoals);

                const awayGoals =
                    Number(result.awayGoals);


                home.games++;

                away.games++;


                home.goalsFor +=
                    homeGoals;

                home.goalsAgainst +=
                    awayGoals;


                away.goalsFor +=
                    awayGoals;

                away.goalsAgainst +=
                    homeGoals;


                if (
                    homeGoals >
                    awayGoals
                ) {

                    home.wins++;

                    home.points += 3;

                    away.losses++;

                }

                else if (
                    homeGoals <
                    awayGoals
                ) {

                    away.wins++;

                    away.points += 3;

                    home.losses++;

                }

                else {

                    home.draws++;

                    away.draws++;

                    home.points++;

                    away.points++;

                }

            }
        );


        standings.forEach(
            team => {

                team.goalDifference =
                    team.goalsFor -
                    team.goalsAgainst;

            }
        );


        standings.sort(
            (a, b) => {

                if (
                    b.points !==
                    a.points
                ) {

                    return (
                        b.points -
                        a.points
                    );

                }


                if (
                    b.goalDifference !==
                    a.goalDifference
                ) {

                    return (
                        b.goalDifference -
                        a.goalDifference
                    );

                }


                if (
                    b.goalsFor !==
                    a.goalsFor
                ) {

                    return (
                        b.goalsFor -
                        a.goalsFor
                    );

                }


                if (
                    b.wins !==
                    a.wins
                ) {

                    return (
                        b.wins -
                        a.wins
                    );

                }


                return (
                    a.id -
                    b.id
                );

            }
        );

    }


    /* =====================================================
       BUSCA RESULTADO
       ===================================================== */

    function getResult(
        round,
        match
    ) {

        return CCFV_BRASILEIRAO.results.find(
            result =>

                Number(result.round) === Number(round) &&
                Number(result.match) === Number(match)

        );

    }


    /* =====================================================
       ESCUDO
       ===================================================== */

    function crestHTML(
        team,
        wrapperClass
    ) {

        if (!team) {

            return "?";

        }


        return `

            <span
                class="${wrapperClass || ""}"
            >

                <img
                    src="${escapeHTML(team.crest)}"
                    alt="${escapeHTML(team.name)}"
                >

            </span>

        `;

    }


    /* =====================================================
       RODADA
       ===================================================== */

    function renderRound(round) {

        if (!elements.matches) {

            return;

        }


        const matches =
            fixtures.filter(
                match =>
                    match.round === Number(round)
            );


        elements.matches.innerHTML =
            matches
                .map(
                    match =>
                        renderMatch(match)
                )
                .join("");


        renderFeatured(
            matches[
                CCFV_BRASILEIRAO.featuredMatch
            ]
        );


        if (elements.roundStatus) {

            elements.roundStatus.textContent =
                `RODADA ${pad(round)}`;

        }

    }


    /* =====================================================
       LINHA DE CONFRONTO
       ===================================================== */

    function renderMatch(match) {

        const home =
            getTeam(match.home);

        const away =
            getTeam(match.away);

        const result =
            getResult(
                match.round,
                match.match
            );


        const score =
            result
                ? `${result.homeGoals} — ${result.awayGoals}`
                : "A DEFINIR";


        const status =
            result
                ? "FINALIZADO"
                : "DATA A DEFINIR";


        return `

            <article
                class="ccfv-match-row"
                data-round="${match.round}"
                data-match="${match.match}"
            >

                <span
                    class="ccfv-match-row__number"
                >
                    ${pad(match.match)}
                </span>


                <div
                    class="ccfv-match-row__team"
                >

                    <strong>
                        ${crestHTML(
                            home,
                            ""
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            home.name
                        )}
                    </span>

                </div>


                <div
                    class="ccfv-match-row__time"
                >

                    <strong>
                        ${score}
                    </strong>

                    <span>
                        ${status}
                    </span>

                </div>


                <div
                    class="ccfv-match-row__team"
                >

                    <strong>
                        ${crestHTML(
                            away,
                            ""
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            away.name
                        )}
                    </span>

                </div>

            </article>

        `;

    }


    /* =====================================================
       DESTAQUE
       ===================================================== */

    function renderFeatured(match) {

        if (
            !elements.feature ||
            !match
        ) {

            return;

        }


        const home =
            getTeam(match.home);

        const away =
            getTeam(match.away);

        const result =
            getResult(
                match.round,
                match.match
            );


        const score =
            result
                ? `${result.homeGoals} — ${result.awayGoals}`
                : "VS";


        const dateText =
            result
                ? "PARTIDA ENCERRADA"
                : "DATA A DEFINIR";


        const timeText =
            result
                ? "FINALIZADO"
                : "21:00";


        elements.feature.innerHTML = `

            <div
                class="ccfv-round-feature__scan"
            ></div>


            <div
                class="ccfv-round-feature__top"
            >

                <span>
                    ⭐ DESTAQUE DA RODADA
                </span>

                <small>
                    RODADA ${pad(match.round)}
                </small>

            </div>


            <div
                class="ccfv-round-feature__label"
            >
                JOGO DA RODADA
            </div>


            <div
                class="ccfv-round-feature__teams"
            >

                <div
                    class="ccfv-round-feature__team"
                >

                    <div
                        class="ccfv-round-feature__crest"
                    >

                        <img
                            src="${escapeHTML(home.crest)}"
                            alt="${escapeHTML(home.name)}"
                        >

                    </div>

                    <strong>
                        ${escapeHTML(home.name)}
                    </strong>

                    <span>
                        CASA
                    </span>

                </div>


                <div
                    class="ccfv-round-feature__versus"
                >

                    <span>
                        ${score}
                    </span>

                </div>


                <div
                    class="ccfv-round-feature__team"
                >

                    <div
                        class="ccfv-round-feature__crest"
                    >

                        <img
                            src="${escapeHTML(away.crest)}"
                            alt="${escapeHTML(away.name)}"
                        >

                    </div>

                    <strong>
                        ${escapeHTML(away.name)}
                    </strong>

                    <span>
                        FORA
                    </span>

                </div>

            </div>


            <div
                class="ccfv-round-feature__info"
            >

                <span>
                    ${dateText}
                </span>

                <strong>
                    ${timeText}
                </strong>

            </div>


            <button
                type="button"
                class="ccfv-round-feature__button"
                data-round="${match.round}"
                data-match="${match.match}"
            >

                VER CONFRONTO

                <span>
                    →
                </span>

            </button>

        `;

    }


    /* =====================================================
       ÚLTIMOS RESULTADOS
       ===================================================== */

    function renderResults() {

        if (!elements.results) {

            return;

        }


        const latestResults =
            [...CCFV_BRASILEIRAO.results]
                .sort(
                    (a, b) => {

                        if (
                            Number(b.round) !==
                            Number(a.round)
                        ) {

                            return (
                                Number(b.round) -
                                Number(a.round)
                            );

                        }


                        return (
                            Number(b.match) -
                            Number(a.match)
                        );

                    }
                )
                .slice(0, 10);


        if (!latestResults.length) {

            elements.results.innerHTML = `

                <div
                    class="ccfv-result-empty"
                >

                    <span>
                        00
                    </span>

                    <div>

                        <strong>
                            Ainda não existem resultados.
                        </strong>

                        <small>
                            As partidas da Season 01 aparecerão
                            aqui após o início da competição.
                        </small>

                    </div>

                </div>

            `;

            return;

        }


        elements.results.innerHTML =
            latestResults
                .map(
                    result =>
                        renderResultCard(
                            result
                        )
                )
                .join("");

    }


    /* =====================================================
       CARD DE RESULTADO
       ===================================================== */

    function renderResultCard(result) {

        const home =
            getTeam(result.homeTeam);

        const away =
            getTeam(result.awayTeam);


        return `

            <article
                class="ccfv-result-card"
            >

                <div
                    class="ccfv-result-round"
                >

                    <span>
                        RODADA ${pad(result.round)}
                    </span>

                    <small>
                        JOGO ${pad(result.match)}
                    </small>

                </div>


                <div
                    class="ccfv-result-team"
                >

                    <span
                        class="ccfv-result-team__crest"
                    >

                        <img
                            src="${escapeHTML(home.crest)}"
                            alt="${escapeHTML(home.name)}"
                        >

                    </span>

                    <strong>
                        ${escapeHTML(home.name)}
                    </strong>

                </div>


                <div
                    class="ccfv-result-score"
                >

                    <strong>
                        ${result.homeGoals}
                        —
                        ${result.awayGoals}
                    </strong>

                    <span>
                        FINAL
                    </span>

                </div>


                <div
                    class="
                        ccfv-result-team
                        ccfv-result-team--away
                    "
                >

                    <strong>
                        ${escapeHTML(away.name)}
                    </strong>

                    <span
                        class="ccfv-result-team__crest"
                    >

                        <img
                            src="${escapeHTML(away.crest)}"
                            alt="${escapeHTML(away.name)}"
                        >

                    </span>

                </div>


                <div
                    class="ccfv-result-info"
                >

                    <strong>
                        ${escapeHTML(
                            result.date || "DATA"
                        )}
                    </strong>

                    <span>
                        FINALIZADO
                    </span>

                </div>

            </article>

        `;

    }


    /* =====================================================
       CLASSIFICAÇÃO
       ===================================================== */

    function renderTable() {

        const tbody =
            document.querySelector(
                ".ccfv-brasileirao-table tbody"
            );


        if (!tbody) {

            return;

        }


        tbody.innerHTML =
            standings
                .map(
                    (team, index) => `

                    <tr>

                        <td>
                            ${pad(index + 1)}
                        </td>


                        <td>

                            <div
                                class="ccfv-club-cell"
                            >

                                <span
                                    class="
                                        ccfv-club-position
                                        ${
                                            index === 0
                                                ? "ccfv-club-position--champion"
                                                : ""
                                        }
                                    "
                                >
                                    ${index + 1}
                                </span>


                                <strong>
                                    ${escapeHTML(
                                        team.name
                                    )}
                                </strong>

                            </div>

                        </td>


                        <td>
                            ${team.games}
                        </td>

                        <td>
                            ${team.wins}
                        </td>

                        <td>
                            ${team.draws}
                        </td>

                        <td>
                            ${team.losses}
                        </td>

                        <td>
                            ${team.goalsFor}
                        </td>

                        <td>
                            ${team.goalsAgainst}
                        </td>

                        <td>
                            ${
                                team.goalDifference > 0
                                    ? "+" + team.goalDifference
                                    : team.goalDifference
                            }
                        </td>

                        <td>

                            <strong>
                                ${team.points}
                            </strong>

                        </td>

                    </tr>

                `
                )
                .join("");

    }


    /* =====================================================
       PROGRESSO
       ===================================================== */

    function updateProgress() {

        const totalMatches =
            CCFV_BRASILEIRAO.totalRounds * 10;

        const completedMatches =
            CCFV_BRASILEIRAO.results.length;

        const percentage =
            totalMatches
                ? Math.round(
                    (
                        completedMatches /
                        totalMatches
                    ) * 100
                )
                : 0;


        if (elements.progressBar) {

            elements.progressBar.style.width =
                `${percentage}%`;

        }


        if (elements.progressTop) {

            elements.progressTop.innerHTML = `

                <span>
                    CAMPEONATO
                </span>

                <strong>
                    ${pad(percentage)}%
                </strong>

            `;

        }


        if (elements.progressBottom) {

            elements.progressBottom.innerHTML = `

                <span>
                    RODADA
                    ${
                        completedMatches
                            ? pad(
                                CCFV_BRASILEIRAO.currentRound
                            )
                            : "00"
                    }
                </span>

                <span>
                    38
                </span>

            `;

        }


        if (elements.seasonNumber) {

            elements.seasonNumber.textContent =
                pad(
                    CCFV_BRASILEIRAO.season
                );

        }

    }


    /* =====================================================
       STATUS
       ===================================================== */

    function updateSeasonStatus() {

        if (!elements.seasonStatus) {

            return;

        }


        elements.seasonStatus.innerHTML = `

            <span></span>

            ${escapeHTML(
                CCFV_BRASILEIRAO.status
            )}

        `;

    }


    /* =====================================================
       CAMPEÃO
       ===================================================== */

    function updateChampion() {

        if (!elements.champion) {

            return;

        }


        const totalMatches =
            CCFV_BRASILEIRAO.totalRounds * 10;


        const seasonFinished =
            CCFV_BRASILEIRAO.results.length >=
            totalMatches;


        if (
            seasonFinished &&
            standings.length
        ) {

            elements.champion.textContent =
                standings[0].name;


            if (elements.championStatus) {

                elements.championStatus.textContent =
                    "CAMPEÃO DEFINIDO";

            }

        }

        else {

            elements.champion.textContent =
                "A DEFINIR";


            if (elements.championStatus) {

                elements.championStatus.textContent =
                    "EM DISPUTA";

            }

        }

    }


    /* =====================================================
       EVENTO DO BOTÃO DO DESTAQUE
       ===================================================== */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".ccfv-round-feature__button"
                );


            if (!button) {

                return;

            }


            const round =
                Number(
                    button.dataset.round
                );

            const match =
                Number(
                    button.dataset.match
                );


            console.log(
                `CCFV // CONFRONTO ${round}-${match}`
            );

        }
    );


    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.CCFVBrasileirao = {

        config:
            CCFV_BRASILEIRAO,

        getFixtures:
            () => fixtures,

        getStandings:
            () => standings,

        getResults:
            () =>
                CCFV_BRASILEIRAO.results,

        refresh:
            () => {

                calculateStandings();

                renderRound(
                    CCFV_BRASILEIRAO.currentRound
                );

                renderTable();

                renderResults();

                updateProgress();

                updateSeasonStatus();

                updateChampion();

            }

    };


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    function init() {

        fixtures =
            generateFixtures();


        calculateStandings();


        renderRound(
            CCFV_BRASILEIRAO.currentRound
        );


        renderTable();


        renderResults();


        updateProgress();


        updateSeasonStatus();


        updateChampion();


        if (elements.resultsSeason) {

            elements.resultsSeason.textContent =
                `SEASON ${pad(
                    CCFV_BRASILEIRAO.season
                )}`;

        }


        console.log(
            "%cCCFV // BRASILEIRÃO",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        console.log(
            `${fixtures.length} partidas geradas.`
        );


        console.log(
            `${CCFV_BRASILEIRAO.results.length} resultado(s) carregado(s).`
        );

    }


    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    }

    else {

        init();

    }


})();