/* =========================================================
   CCFV // LIVE DATA ENGINE
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const TABLES = {

        players:
            "players",

        playerCompetitions:
            "player_competitions",

        matches:
            "matches",

        night:
            "night_cup_matches",

        ranking:
            "ccfv_ranking"

    };


    const REALTIME_TABLES = [

        "players",

        "player_competitions",

        "matches",

        "night_cup_matches"

    ];


    /* =====================================================
       ESTADO
       ===================================================== */

    const state = {

        players: [],

        playerCompetitions: [],

        matches: [],

        nightMatches: [],

        ranking: [],

        updatedAt: null

    };


    let supabaseClient =
        null;


    let channel =
        null;


    let refreshTimer =
        null;


    let refreshing =
        false;


    /* =====================================================
       UTILITÁRIOS
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


    function number(
        value
    ) {

        return Number(
            value || 0
        );

    }


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


    /* =====================================================
       CSS DO RANKING
       ===================================================== */

    function injectRankingStyles() {

        if (
            document.querySelector(
                "#ccfv-ranking-live-styles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "ccfv-ranking-live-styles";


        style.textContent = `

            /* =============================================
               TABELA PRINCIPAL DO RANKING
               ============================================= */

            #ranking-list {

                width:
                    100%;

                max-width:
                    100%;

                overflow:
                    hidden;

            }


            #ranking-list
            .ccfv-ranking-row {

                width:
                    100% !important;

                min-width:
                    0 !important;

                min-height:
                    78px;

                display:
                    grid !important;

                grid-template-columns:
                    70px
                    minmax(280px, 1fr)
                    110px
                    100px
                    80px
                    150px;

                align-items:
                    center;

                gap:
                    16px;

                overflow:
                    hidden;

                box-sizing:
                    border-box;

            }


            /* =============================================
               FOTO DA LINHA
               ============================================= */

            #ranking-list
            .ccfv-ranking-row__photo {

                width:
                    52px !important;

                min-width:
                    52px !important;

                max-width:
                    52px !important;

                height:
                    52px !important;

                min-height:
                    52px !important;

                max-height:
                    52px !important;

                overflow:
                    hidden !important;

                display:
                    flex !important;

                align-items:
                    center !important;

                justify-content:
                    center !important;

                flex-shrink:
                    0 !important;

                border-radius:
                    10px;

                position:
                    relative;

                box-sizing:
                    border-box;

            }


            #ranking-list
            .ccfv-ranking-row__photo img {

                width:
                    100% !important;

                height:
                    100% !important;

                min-width:
                    100% !important;

                min-height:
                    100% !important;

                max-width:
                    100% !important;

                max-height:
                    100% !important;

                display:
                    block !important;

                object-fit:
                    cover !important;

                object-position:
                    center !important;

            }


            /* =============================================
               IDENTIDADE DO JOGADOR
               ============================================= */

            #ranking-list
            .ccfv-ranking-row__player {

                min-width:
                    0;

                display:
                    flex;

                align-items:
                    center;

                gap:
                    12px;

                overflow:
                    hidden;

            }


            #ranking-list
            .ccfv-ranking-row__player-info {

                min-width:
                    0;

                overflow:
                    hidden;

            }


            #ranking-list
            .ccfv-ranking-row__player-info strong {

                display:
                    block;

                overflow:
                    hidden;

                white-space:
                    nowrap;

                text-overflow:
                    ellipsis;

            }


            #ranking-list
            .ccfv-ranking-row__player-info span {

                display:
                    block;

                overflow:
                    hidden;

                white-space:
                    nowrap;

                text-overflow:
                    ellipsis;

            }


            /* =============================================
               FEATURE / PRIMEIRO COLOCADO
               ============================================= */

            #ranking-feature-player
            .ccfv-ranking-leader__visual {

                max-width:
                    240px;

                overflow:
                    hidden;

            }


            #ranking-feature-player
            .ccfv-ranking-leader__photo {

                width:
                    220px !important;

                height:
                    260px !important;

                max-width:
                    220px !important;

                max-height:
                    260px !important;

                overflow:
                    hidden !important;

                border-radius:
                    16px;

                box-sizing:
                    border-box;

            }


            #ranking-feature-player
            .ccfv-ranking-leader__photo img {

                width:
                    100% !important;

                height:
                    100% !important;

                max-width:
                    100% !important;

                max-height:
                    100% !important;

                object-fit:
                    cover !important;

                object-position:
                    center !important;

                display:
                    block !important;

            }


            /* =============================================
               RESPONSIVO
               ============================================= */

            @media (
                max-width: 900px
            ) {

                #ranking-list
                .ccfv-ranking-row {

                    grid-template-columns:
                        55px
                        minmax(
                            180px,
                            1fr
                        )
                        80px
                        80px;

                }


                #ranking-list
                .ccfv-ranking-row__elo,
                #ranking-list
                .ccfv-ranking-row__rank {

                    display:
                        none !important;

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    async function getSupabase() {

        if (
            supabaseClient
        ) {

            return supabaseClient;

        }


        if (
            window.CCFVAuth &&
            typeof
                window.CCFVAuth.getClient ===
                "function"
        ) {

            supabaseClient =
                await
                    window.CCFVAuth
                        .getClient();

            return supabaseClient;

        }


        try {

            const authScript =
                document.querySelector(
                    'script[src="/admin/js/auth.js"]'
                );


            if (
                !authScript
            ) {

                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "/admin/js/auth.js";

                script.defer =
                    true;


                document.head.appendChild(
                    script
                );

            }

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // AUTH LOAD:",
                error
            );

        }


        const started =
            Date.now();


        while (
            !(
                window.CCFVAuth &&
                typeof
                    window.CCFVAuth.getClient ===
                    "function"
            )
        ) {

            if (
                Date.now() -
                started >
                10000
            ) {

                break;

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

        }


        if (
            window.CCFVAuth &&
            typeof
                window.CCFVAuth.getClient ===
                "function"
        ) {

            supabaseClient =
                await
                    window.CCFVAuth
                        .getClient();

            return supabaseClient;

        }


        throw new Error(
            "Supabase não está disponível."
        );

    }


    /* =====================================================
       LOADERS
       ===================================================== */

    async function loadPlayers(
        client
    ) {

        const {
            data,
            error
        } =
            await client
                .from(
                    TABLES.players
                )
                .select(
                    "*"
                );


        if (
            error
        ) {

            throw error;

        }


        return data || [];

    }


    async function loadPlayerCompetitions(
        client
    ) {

        const {
            data,
            error
        } =
            await client
                .from(
                    TABLES.playerCompetitions
                )
                .select(
                    "*"
                );


        if (
            error
        ) {

            throw error;

        }


        return data || [];

    }


    async function loadMatches(
        client
    ) {

        const {
            data,
            error
        } =
            await client
                .from(
                    TABLES.matches
                )
                .select(
                    "*"
                )
                .order(
                    "played_at",
                    {
                        ascending:
                            false
                    }
                );


        if (
            error
        ) {

            throw error;

        }


        return data || [];

    }


    async function loadNightMatches(
        client
    ) {

        const {
            data,
            error
        } =
            await client
                .from(
                    TABLES.night
                )
                .select(
                    "*"
                )
                .order(
                    "match_number",
                    {
                        ascending:
                            true
                    }
                );


        if (
            error
        ) {

            throw error;

        }


        return data || [];

    }


    async function loadRanking(
        client
    ) {

        const {
            data,
            error
        } =
            await client
                .from(
                    TABLES.ranking
                )
                .select(
                    "*"
                )
                .order(
                    "ranking_position",
                    {
                        ascending:
                            true
                    }
                );


        if (
            error
        ) {

            throw error;

        }


        return data || [];

    }


    /* =====================================================
       RANKING
       ===================================================== */

    function syncRanking() {

        injectRankingStyles();


        if (
            !window.CCFVRanking
        ) {

            return;

        }


        if (
            Array.isArray(
                window.CCFVRanking.players
            )
        ) {

            window.CCFVRanking.players.splice(
                0,
                window.CCFVRanking.players.length,
                ...state.ranking
            );

        }


        if (
            typeof
                window.CCFVRanking.refresh ===
                "function"
        ) {

            window.CCFVRanking.refresh();

        }

    }


    /* =====================================================
       BRASILEIRÃO
       ===================================================== */

    function buildBrazilResults() {

        const api =
            window.CCFVBrasileirao;


        const teams =
            api?.config?.teams ||
            [];


        const fixtures =
            typeof api?.getFixtures ===
                "function"
                ? api.getFixtures()
                : [];


        const usedMatchNumbers =
            new Map();


        function resolveTeamId(
            value
        ) {

            const normalized =
                normalize(
                    value
                );


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

                const direct =
                    teams.find(
                        team =>
                            Number(
                                team.id
                            ) ===
                            numeric
                    );


                if (
                    direct
                ) {

                    return Number(
                        direct.id
                    );

                }

            }


            const exact =
                teams.find(
                    team =>
                        normalize(
                            team.name
                        ) ===
                        normalized
                );


            if (
                exact
            ) {

                return Number(
                    exact.id
                );

            }


            const shortName =
                teams.find(
                    team =>
                        normalize(
                            team.shortName
                        ) ===
                        normalized
                );


            if (
                shortName
            ) {

                return Number(
                    shortName.id
                );

            }


            const contained =
                teams.find(
                    team => {

                        const name =
                            normalize(
                                team.name
                            );


                        const short =
                            normalize(
                                team.shortName
                            );


                        return (
                            (
                                name &&
                                (
                                    normalized.includes(
                                        name
                                    ) ||
                                    name.includes(
                                        normalized
                                    )
                                )
                            )
                            ||
                            (
                                short &&
                                (
                                    normalized.includes(
                                        short
                                    ) ||
                                    short.includes(
                                        normalized
                                    )
                                )
                            )
                        );

                    }
                );


            return contained
                ? Number(
                    contained.id
                )
                : null;

        }


        function getNextMatchNumber(
            round
        ) {

            const current =
                usedMatchNumbers.get(
                    round
                ) ||
                0;


            const next =
                current + 1;


            usedMatchNumbers.set(
                round,
                next
            );


            return next;

        }


        function resolveMatchNumber(
            round,
            homeId,
            awayId
        ) {

            const exact =
                fixtures.find(
                    fixture =>
                        Number(
                            fixture.round
                        ) ===
                        round &&

                        Number(
                            fixture.home
                        ) ===
                        homeId &&

                        Number(
                            fixture.away
                        ) ===
                        awayId
                );


            if (
                exact
            ) {

                return Number(
                    exact.match
                );

            }


            /*
             * Se o Admin registrar um confronto de teste
             * que não corresponde ao fixture oficial daquela
             * rodada, damos a ele um número sequencial dentro
             * da rodada. A classificação continua correta.
             */

            return getNextMatchNumber(
                round
            );

        }


        const results = [];


        state.matches

            .filter(
                match =>
                    normalize(
                        match.competition
                    ) ===
                    "BRASILEIRAO"
            )

            .filter(
                match =>
                    normalize(
                        match.status
                    ) ===
                    "FINAL"
            )

            .sort(
                (
                    a,
                    b
                ) => {

                    const roundA =
                        number(
                            a.round_number
                        );


                    const roundB =
                        number(
                            b.round_number
                        );


                    if (
                        roundA !==
                        roundB
                    ) {

                        return (
                            roundA -
                            roundB
                        );

                    }


                    return (
                        new Date(
                            a.played_at ||
                            a.created_at ||
                            0
                        ).getTime() -

                        new Date(
                            b.played_at ||
                            b.created_at ||
                            0
                        ).getTime()
                    );

                }
            )

            .forEach(
                match => {

                    const round =
                        number(
                            match.round_number
                        );


                    if (
                        round <= 0
                    ) {

                        return;

                    }


                    const homeTeamId =
                        resolveTeamId(
                            match.home_team
                        );


                    const awayTeamId =
                        resolveTeamId(
                            match.away_team
                        );


                    if (
                        !homeTeamId ||
                        !awayTeamId
                    ) {

                        console.warn(
                            "CCFV // BRASILEIRÃO: clube não encontrado",
                            {
                                home:
                                    match.home_team,

                                away:
                                    match.away_team
                            }
                        );


                        return;

                    }


                    const matchNumber =
                        resolveMatchNumber(
                            round,
                            homeTeamId,
                            awayTeamId
                        );


                    results.push({

                        round:
                            round,

                        match:
                            matchNumber,

                        home:
                            homeTeamId,

                        away:
                            awayTeamId,

                        homeTeam:
                            homeTeamId,

                        awayTeam:
                            awayTeamId,

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

                    });

                }
            );


        return results;

    }


    function syncBrasileirao() {

        const api =
            window.CCFVBrasileirao;


        if (
            !api ||
            !api.config
        ) {

            return;

        }


        const results =
            buildBrazilResults();


        if (
            Array.isArray(
                api.config.results
            )
        ) {

            api.config.results.splice(
                0,
                api.config.results.length,
                ...results
            );

        }


        const rounds =
            results
                .map(
                    result =>
                        number(
                            result.round
                        )
                )
                .filter(
                    round =>
                        round > 0
                );


        api.config.currentRound =
            rounds.length
                ? Math.min(
                    38,
                    Math.max(
                        ...rounds
                    ) + 1
                )
                : 1;


        if (
            typeof
                api.refresh ===
                "function"
        ) {

            api.refresh();

        }

    }


    /* =====================================================
       HOME
       ===================================================== */

    function syncHome() {

        const cards =
            document.querySelectorAll(
                ".ccfv-data-card"
            );


        if (
            cards.length <
            4
        ) {

            return;

        }


        const brazilMatches =
            state.matches.filter(
                match =>
                    normalize(
                        match.competition
                    ) ===
                    "BRASILEIRAO"
            );


        const rounds =
            brazilMatches
                .map(
                    match =>
                        number(
                            match.round_number
                        )
                )
                .filter(
                    round =>
                        round > 0
                );


        const currentRound =
            rounds.length
                ? Math.max(
                    ...rounds
                )
                : 0;


        const clubsElement =
            cards[0].querySelector(
                ".ccfv-data-card__number"
            );


        const roundsElement =
            cards[1].querySelector(
                ".ccfv-data-card__number"
            );


        const matchesElement =
            cards[2].querySelector(
                ".ccfv-data-card__number"
            );


        const championElement =
            cards[3].querySelector(
                ".ccfv-data-card__number"
            );


        if (
            clubsElement
        ) {

            clubsElement.textContent =
                "20";

        }


        if (
            roundsElement
        ) {

            roundsElement.textContent =
                String(
                    currentRound
                );

        }


        if (
            matchesElement
        ) {

            matchesElement.textContent =
                String(
                    state.matches.length
                );

        }


        const championshipFinished =
            brazilMatches.length >=
            380;


        if (
            championElement
        ) {

            championElement.textContent =
                championshipFinished
                    ? "1"
                    : "0";

        }

    }


    /* =====================================================
       CONTADORES
       ===================================================== */

    function syncCounters() {

        document
            .querySelectorAll(
                "[data-ccfv-player-count]"
            )
            .forEach(
                element => {

                    element.textContent =
                        String(
                            state.players.length
                        );

                }
            );


        document
            .querySelectorAll(
                "[data-ccfv-match-count]"
            )
            .forEach(
                element => {

                    element.textContent =
                        String(
                            state.matches.length
                        );

                }
            );


        const leader =
            state.ranking[0];


        document
            .querySelectorAll(
                "[data-ccfv-leader]"
            )
            .forEach(
                element => {

                    element.textContent =
                        leader?.name ||
                        "A DEFINIR";

                }
            );


        document
            .querySelectorAll(
                "[data-ccfv-top-elo]"
            )
            .forEach(
                element => {

                    element.textContent =
                        String(
                            leader?.elo ||
                            0
                        );

                }
            );

    }


    /* =====================================================
       ESTADO PÚBLICO
       ===================================================== */

    function exposeState() {

        window.CCFVLive =
            state;


        window.dispatchEvent(
            new CustomEvent(
                "ccfv:live-update",
                {
                    detail: {

                        state,

                        players:
                            state.players,

                        ranking:
                            state.ranking,

                        matches:
                            state.matches,

                        nightMatches:
                            state.nightMatches,

                        playerCompetitions:
                            state.playerCompetitions

                    }

                }
            )
        );

    }


    /* =====================================================
       REFRESH
       ===================================================== */

    async function refresh(
        reason =
            "manual"
    ) {

        if (
            refreshing
        ) {

            return;

        }


        refreshing =
            true;


        try {

            const client =
                await getSupabase();


            const [

                players,

                playerCompetitions,

                matches,

                nightMatches,

                ranking

            ] =
                await Promise.all([

                    loadPlayers(
                        client
                    ),

                    loadPlayerCompetitions(
                        client
                    ),

                    loadMatches(
                        client
                    ),

                    loadNightMatches(
                        client
                    ),

                    loadRanking(
                        client
                    )

                ]);


            state.players =
                players;


            state.playerCompetitions =
                playerCompetitions;


            state.matches =
                matches;


            state.nightMatches =
                nightMatches;


            state.ranking =
                ranking;


            state.updatedAt =
                new Date();


            syncRanking();

            syncBrasileirao();

            syncHome();

            syncCounters();

            exposeState();


            console.log(
                "%cCCFV // LIVE",
                "color:#43df91;font-weight:900;",
                reason,
                {
                    players:
                        state.players.length,

                    ranking:
                        state.ranking.length,

                    matches:
                        state.matches.length,

                    night:
                        state.nightMatches.length

                }
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // LIVE ERROR:",
                error
            );

        }

        finally {

            refreshing =
                false;

        }

    }


    /* =====================================================
       REALTIME
       ===================================================== */

    function subscribeRealtime(
        client
    ) {

        if (
            channel
        ) {

            try {

                client.removeChannel(
                    channel
                );

            }

            catch (
                error
            ) {

                console.warn(
                    "CCFV // CHANNEL:",
                    error
                );

            }

        }


        channel =
            client.channel(
                "ccfv-live-public"
            );


        REALTIME_TABLES.forEach(
            table => {

                channel.on(
                    "postgres_changes",
                    {

                        event:
                            "*",

                        schema:
                            "public",

                        table

                    },
                    () => {

                        clearTimeout(
                            refreshTimer
                        );


                        refreshTimer =
                            setTimeout(
                                () => {

                                    refresh(
                                        `realtime:${table}`
                                    );

                                },
                                200
                            );

                    }
                );

            }
        );


        channel.subscribe(
            status => {

                console.log(
                    "%cCCFV // REALTIME",
                    "color:#43df91;font-weight:900;",
                    status
                );

            }
        );

    }


    /* =====================================================
       API
       ===================================================== */

    window.CCFVLiveAPI = {

        state,

        refresh,

        getState:
            () =>
                state

    };


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        injectRankingStyles();


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    150
                )
        );


        try {

            const client =
                await getSupabase();


            await refresh(
                "initial"
            );


            subscribeRealtime(
                client
            );


            window.setInterval(
                () => {

                    if (
                        document.visibilityState ===
                        "visible"
                    ) {

                        refresh(
                            "fallback"
                        );

                    }

                },
                60000
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // LIVE INIT ERROR:",
                error
            );

        }

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