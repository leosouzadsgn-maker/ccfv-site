/* =========================================================
   CCFV // BRASILEIRÃO LIVE
   ADMIN -> SUPABASE -> BRASILEIRÃO PÚBLICO
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const LIVE_SCRIPT =
        "/js/ccfv-live.js";


    let initialized =
        false;


    let refreshTimer =
        null;


    let loading =
        false;


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function normalize(
        value
    ) {

        return String(
            value || ""
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


    function loadLiveEngine() {

        return new Promise(
            resolve => {

                if (
                    window.CCFVLiveAPI
                ) {

                    resolve();

                    return;

                }


                const existing =
                    document.querySelector(
                        `script[src="${LIVE_SCRIPT}"]`
                    );


                if (
                    existing
                ) {

                    existing.addEventListener(
                        "load",
                        () => resolve(),
                        {
                            once:
                                true
                        }
                    );


                    return;

                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    LIVE_SCRIPT;


                script.defer =
                    true;


                script.addEventListener(
                    "load",
                    () => resolve(),
                    {
                        once:
                            true
                    }
                );


                script.addEventListener(
                    "error",
                    error => {

                        console.error(
                            "CCFV // BRASILEIRÃO LIVE: erro ao carregar ccfv-live.js",
                            error
                        );


                        resolve();

                    },
                    {
                        once:
                            true
                    }
                );


                document.head.appendChild(
                    script
                );

            }
        );

    }


    /* =====================================================
       LOCALIZAR API DO BRASILEIRÃO
       ===================================================== */

    function getBrazilApi() {

        return (
            window.CCFVBrasileirao ||
            null
        );

    }


    /* =====================================================
       LOCALIZAR TIME
       ===================================================== */

    function resolveTeam(
        value,
        teams
    ) {

        const normalized =
            normalize(
                value
            );


        /*
         * ID direto
         */

        const numeric =
            Number(
                value
            );


        if (
            Number.isFinite(
                numeric
            ) &&
            numeric > 0
        ) {

            const byId =
                teams.find(
                    team =>
                        Number(
                            team.id
                        ) ===
                        numeric
                );


            if (
                byId
            ) {

                return byId;

            }

        }


        /*
         * Nome
         */

        const byName =
            teams.find(
                team =>
                    normalize(
                        team.name
                    ) ===
                    normalized
            );


        if (
            byName
        ) {

            return byName;

        }


        /*
         * Nome abreviado
         */

        const byShortName =
            teams.find(
                team =>
                    normalize(
                        team.shortName
                    ) ===
                    normalized
            );


        if (
            byShortName
        ) {

            return byShortName;

        }


        return null;

    }


    /* =====================================================
       ENCONTRAR NÚMERO DA PARTIDA
       ===================================================== */

    function resolveFixture(
        match,
        api
    ) {

        if (
            !api ||
            typeof
                api.getFixtures !==
                "function"
        ) {

            return null;

        }


        const fixtures =
            api.getFixtures();


        if (
            !Array.isArray(
                fixtures
            )
        ) {

            return null;

        }


        const teams =
            api.config?.teams ||
            [];


        const home =
            resolveTeam(
                match.home_team,
                teams
            );


        const away =
            resolveTeam(
                match.away_team,
                teams
            );


        if (
            !home ||
            !away
        ) {

            return null;

        }


        const round =
            number(
                match.round_number
            );


        /*
         * Primeiro tenta casa/fora exatos.
         */

        const exact =
            fixtures.find(
                fixture =>
                    number(
                        fixture.round
                    ) ===
                    round &&

                    number(
                        fixture.home
                    ) ===
                    number(
                        home.id
                    ) &&

                    number(
                        fixture.away
                    ) ===
                    number(
                        away.id
                    )
            );


        if (
            exact
        ) {

            return exact;

        }


        /*
         * Segunda tentativa:
         * confronto invertido.
         *
         * Não usamos essa correspondência
         * para trocar mandante/visitante;
         * apenas encontramos o jogo.
         */

        const reversed =
            fixtures.find(
                fixture =>
                    number(
                        fixture.round
                    ) ===
                    round &&

                    number(
                        fixture.home
                    ) ===
                    number(
                        away.id
                    ) &&

                    number(
                        fixture.away
                    ) ===
                    number(
                        home.id
                    )
            );


        return reversed ||
            null;

    }


    /* =====================================================
       EXTRAIR RODADA
       ===================================================== */

    function resolveRoundNumber(
        match
    ) {

        const direct =
            number(
                match.round_number ??
                match.round
            );


        if (
            direct > 0
        ) {

            return direct;

        }


        const text =
            String(
                match.stage ||
                match.phase ||
                match.round_name ||
                ""
            );


        const found =
            text.match(
                /(?:RODADA|ROUND)\s*[_-]?\s*(\d+)/i
            );


        return found
            ? number(
                found[1]
            )
            : 0;

    }


    /* =====================================================
       CONVERTER MATCH DO SUPABASE
       ===================================================== */

    function convertMatch(
        match,
        api
    ) {

        const teams =
            api.config?.teams ||
            [];


        const home =
            resolveTeam(
                match.home_team,
                teams
            );


        const away =
            resolveTeam(
                match.away_team,
                teams
            );


        if (
            !home ||
            !away
        ) {

            console.warn(
                "CCFV // BRASILEIRÃO: clubes não encontrados",
                {
                    home:
                        match.home_team,
                    away:
                        match.away_team
                }
            );

            return null;

        }


        const roundNumber =
            resolveRoundNumber(
                match
            );


        if (
            roundNumber <= 0
        ) {

            console.warn(
                "CCFV // BRASILEIRÃO: rodada não encontrada",
                match
            );

            return null;

        }


        const fixture =
            resolveFixture(
                {
                    ...match,
                    round_number:
                        roundNumber
                },
                api
            );


        /*
         * O banco não precisa possuir match_number.
         * O número oficial vem dos fixtures do próprio
         * Brasileirão.
         */

        let matchNumber =
            fixture
                ? number(
                    fixture.match
                )
                : number(
                    match.match_number
                );


        /*
         * Último fallback: localizar a partida pelo
         * confronto dentro da rodada. Isso evita que
         * um resultado válido seja descartado só porque
         * a linha do banco não possui o número do jogo.
         */

        if (
            matchNumber <= 0
        ) {

            const fixtures =
                typeof api.getFixtures ===
                    "function"
                    ? api.getFixtures()
                    : [];


            const fallbackFixture =
                Array.isArray(fixtures)
                    ? fixtures.find(
                        item => {

                            if (
                                number(item.round) !==
                                roundNumber
                            ) {

                                return false;

                            }

                            const normalHome =
                                number(item.home) ===
                                number(home.id);

                            const normalAway =
                                number(item.away) ===
                                number(away.id);

                            const inverseHome =
                                number(item.home) ===
                                number(away.id);

                            const inverseAway =
                                number(item.away) ===
                                number(home.id);

                            return (
                                (normalHome && normalAway) ||
                                (inverseHome && inverseAway)
                            );

                        }
                    )
                    : null;


            matchNumber =
                fallbackFixture
                    ? number(
                        fallbackFixture.match
                    )
                    : 0;

        }


        if (
            matchNumber <= 0
        ) {

            console.warn(
                "CCFV // BRASILEIRÃO: número do jogo não encontrado",
                {
                    round:
                        roundNumber,
                    home:
                        home.name,
                    away:
                        away.name
                }
            );

            return null;

        }


        return {

            round:
                roundNumber,

            match:
                matchNumber,

            home:
                home.name,

            away:
                away.name,

            homeTeam:
                Number(
                    home.id
                ),

            awayTeam:
                Number(
                    away.id
                ),

            homeGoals:
                number(
                    match.home_score
                ),

            awayGoals:
                number(
                    match.away_score
                ),

            date:
                match.played_at ||
                match.created_at ||
                "",

            matchId:
                match.id

        };

    }


    /* =====================================================
       CARREGAR RESULTADOS
       ===================================================== */

    function buildResults() {

        const api =
            getBrazilApi();


        if (
            !api
        ) {

            return [];

        }


        const state =
            window.CCFVLive;


        if (
            !state ||
            !Array.isArray(
                state.matches
            )
        ) {

            return [];

        }


        const results = [];


        state.matches
            .filter(
                match =>
                    normalize(
                        match.competition
                    ).startsWith(
                        "BRASILEIRAO"
                    )
            )
            .filter(
                match => {

                    const status =
                        normalize(
                            match.status
                        );

                    return (
                        status === "FINAL" ||
                        status === "FINISHED" ||
                        status === "COMPLETED" ||
                        status === "CONCLUIDA" ||
                        status === "CONCLUIDO" ||
                        status === "ENCERRADA" ||
                        status === "FINALIZADA" ||
                        status === "FINALIZADO"
                    );

                }
            )
            .forEach(
                match => {

                    const result =
                        convertMatch(
                            match,
                            api
                        );


                    if (
                        result
                    ) {

                        results.push(
                            result
                        );

                    }

                }
            );


        /*
         * Ordenação oficial:
         * rodada -> partida.
         */

        results.sort(
            (
                a,
                b
            ) => {

                if (
                    a.round !==
                    b.round
                ) {

                    return (
                        a.round -
                        b.round
                    );

                }


                return (
                    a.match -
                    b.match
                );

            }
        );


        return results;

    }


    /* =====================================================
       ATUALIZAR STATUS DA SEASON
       ===================================================== */

    function updateSeason(
        api,
        results
    ) {

        if (
            !api ||
            !api.config
        ) {

            return;

        }


        const totalMatches =
            number(
                api.config.totalRounds
            ) *
            10;


        const completed =
            results.length;


        if (
            completed >=
            totalMatches
        ) {

            api.config.status =
                "FINALIZADO";

            api.config.currentRound =
                number(
                    api.config.totalRounds
                );

            return;

        }


        if (
            completed >
            0
        ) {

            const maxRound =
                Math.max(
                    ...results.map(
                        result =>
                            number(
                                result.round
                            )
                    )
                );


            api.config.currentRound =
                Math.min(
                    number(
                        api.config.totalRounds
                    ),
                    maxRound + 1
                );


            api.config.status =
                "EM ANDAMENTO";


            return;

        }


        api.config.currentRound =
            1;


        api.config.status =
            "PREPARANDO";

    }


    /* =====================================================
       APLICAR RESULTADOS
       ===================================================== */

    function applyResults() {

        const api =
            getBrazilApi();


        if (
            !api
        ) {

            return;

        }


        const results =
            buildResults();


        if (
            !Array.isArray(
                api.config.results
            )
        ) {

            api.config.results =
                [];

        }


        /*
         * Remove resultados antigos
         * e coloca somente os oficiais
         * que vieram do Supabase.
         */

        api.config.results.splice(
            0,
            api.config.results.length,
            ...results
        );


        updateSeason(
            api,
            results
        );


        /*
         * Recalcula:
         *
         * tabela
         * rodada
         * resultados
         * progresso
         * campeão
         */

        if (
            typeof
                api.refresh ===
                "function"
        ) {

            api.refresh();

        }


        console.log(
            "%cCCFV // BRASILEIRÃO LIVE",
            "color:#43df91;font-weight:900;",
            `${results.length} resultado(s) sincronizado(s).`
        );

    }


    /* =====================================================
       EVENTO LIVE
       ===================================================== */

    function bindLiveEvent() {

        window.addEventListener(
            "ccfv:live-update",
            () => {

                clearTimeout(
                    refreshTimer
                );


                refreshTimer =
                    setTimeout(
                        applyResults,
                        100
                    );

            }
        );

    }


    /* =====================================================
       AGUARDAR SISTEMAS
       ===================================================== */

    function waitForSystems() {

        if (
            initialized
        ) {

            return;

        }


        const api =
            getBrazilApi();


        const state =
            window.CCFVLive;


        if (
            !api ||
            !state
        ) {

            setTimeout(
                waitForSystems,
                150
            );

            return;

        }


        initialized =
            true;


        bindLiveEvent();

        applyResults();


        /*
         * Fallback de segurança.
         * Mesmo que o Realtime falhe,
         * o Brasileirão confere novamente
         * a cada 30 segundos.
         */

        window.setInterval(
            () => {

                applyResults();

            },
            30000
        );

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        if (
            loading
        ) {

            return;

        }


        loading =
            true;


        await loadLiveEngine();


        waitForSystems();

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