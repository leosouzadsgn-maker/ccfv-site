/* =========================================================
   CCFV // LIVE DATA ENGINE
   Supabase -> público em tempo real
   ========================================================= */

(() => {
    "use strict";

    const TABLES = {
        players: "players",
        playerCompetitions: "player_competitions",
        matches: "matches",
        night: "night_cup_matches",
        ranking: "ccfv_ranking"
    };

    const REALTIME_TABLES = [
        TABLES.players,
        TABLES.playerCompetitions,
        TABLES.matches,
        TABLES.night
    ];

    const state = {
        players: [],
        playerCompetitions: [],
        matches: [],
        nightMatches: [],
        ranking: [],
        updatedAt: null
    };

    let supabaseClient = null;
    let realtimeChannel = null;
    let refreshTimer = null;
    let refreshing = false;

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function getSupabase() {
        if (supabaseClient) {
            return supabaseClient;
        }

        if (
            window.CCFVAuth &&
            typeof window.CCFVAuth.getClient === "function"
        ) {
            supabaseClient = await window.CCFVAuth.getClient();
            return supabaseClient;
        }

        const authScript = document.querySelector(
            'script[src="/admin/js/auth.js"]'
        );

        if (!authScript) {
            const script = document.createElement("script");
            script.src = "/admin/js/auth.js";
            script.defer = true;
            document.head.appendChild(script);
        }

        const started = Date.now();

        while (
            !window.CCFVAuth ||
            typeof window.CCFVAuth.getClient !== "function"
        ) {
            if (Date.now() - started > 10000) {
                throw new Error("Supabase não está disponível.");
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        supabaseClient = await window.CCFVAuth.getClient();
        return supabaseClient;
    }

    async function loadPlayers(client) {
        const { data, error } = await client
            .from(TABLES.players)
            .select("*");

        if (error) {
            throw error;
        }

        return data || [];
    }

    async function loadPlayerCompetitions(client) {
        const { data, error } = await client
            .from(TABLES.playerCompetitions)
            .select("*");

        if (error) {
            throw error;
        }

        return data || [];
    }

    async function loadMatches(client) {
        const { data, error } = await client
            .from(TABLES.matches)
            .select("*")
            .order("played_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        return data || [];
    }



    async function loadRanking(client) {

        try {

            const { data, error } = await client
                .from(TABLES.ranking)
                .select("*")
                .order("ranking_position", { ascending: true });

            if (error) {
                throw error;
            }

            return Array.isArray(data) ? data : [];

        } catch (error) {

            console.warn(
                "CCFV // RANKING VIEW: usando fallback dos jogadores.",
                error
            );

            return [];

        }

    }

    async function loadNightMatches(client) {
        const { data, error } = await client
            .from(TABLES.night)
            .select("*")
            .order("match_number", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        return data || [];
    }

    /* =========================================================
       RANKING LIVE
       ========================================================= */

    function buildLiveRanking(players) {

        return (players || [])
            .map(player => ({

                ...player,

                matches:
                    number(
                        player.matches_played
                    ),

                goalsFor:
                    number(
                        player.goals_for
                    ),

                goalsAgainst:
                    number(
                        player.goals_against
                    )

            }))
            .sort(
                (a, b) => {

                    const elo =
                        number(b.elo) -
                        number(a.elo);

                    if (
                        elo !== 0
                    ) {

                        return elo;

                    }

                    const wins =
                        number(b.wins) -
                        number(a.wins);

                    if (
                        wins !== 0
                    ) {

                        return wins;

                    }

                    return String(
                        a.name || ""
                    ).localeCompare(
                        String(
                            b.name || ""
                        ),
                        "pt-BR"
                    );

                }
            )
            .map(
                (player, index) => ({

                    ...player,

                    ranking_position:
                        index + 1

                })
            );

    }


    /* =========================================================
       BRASILEIRÃO
       ========================================================= */

    function buildBrazilResults() {

        return state.matches

            .filter(
                match =>
                    normalize(
                        match.competition
                    ).startsWith(
                        "BRASILEIRAO"
                    )
            )

            .filter(
                match =>
                    [
                        "FINAL",
                        "FINISHED",
                        "COMPLETED",
                        "CONCLUIDA",
                        "CONCLUIDO",
                        "ENCERRADA",
                        "FINALIZADA",
                        "FINALIZADO"
                    ].includes(
                        normalize(match.status)
                    )
            )

            .map(
                match => ({

                    round:
                        number(
                            match.round_number
                        ),

                    match:
                        number(
                            match.match_number
                        ),

                    home:
                        match.home_team,

                    away:
                        match.away_team,

                    homeTeam:
                        match.home_team,

                    awayTeam:
                        match.away_team,

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

                })
            );

    }


    function syncBrasileirao() {

        const api =
            window.CCFVBrasileirao;

        if (
            !api?.config
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

        else {

            api.config.results =
                results;

        }

        const rounds =
            results
                .map(
                    item =>
                        number(
                            item.round
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
            typeof api.refresh ===
            "function"
        ) {

            api.refresh();

        }

    }


    /* =========================================================
       NIGHT CUP
       ========================================================= */

    function nightValue(
        match,
        keys,
        fallback = null
    ) {

        for (
            const key of keys
        ) {

            if (
                match &&
                match[key] !== undefined &&
                match[key] !== null &&
                String(
                    match[key]
                ).trim() !== ""
            ) {

                return match[key];

            }

        }

        return fallback;

    }


    function getNightPlayerName(
        match,
        side
    ) {

        const home =
            side === "home";

        const direct =
            nightValue(
                match,

                home
                    ? [
                        "home_player_name",
                        "home_name",
                        "player1_name",
                        "player_a_name",
                        "home_player",
                        "player1",
                        "player_a"
                    ]

                    : [
                        "away_player_name",
                        "away_name",
                        "player2_name",
                        "player_b_name",
                        "away_player",
                        "player2",
                        "player_b"
                    ],

                null
            );

        if (
            direct &&
            typeof direct !==
                "object"
        ) {

            return String(
                direct
            );

        }

        const playerId =
            nightValue(
                match,

                home
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
                    ],

                null
            );

        if (
            playerId
        ) {

            const player =
                state.players.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            playerId
                        )
                );

            if (
                player?.name
            ) {

                return player.name;

            }

        }

        if (
            direct &&
            typeof direct ===
                "object"
        ) {

            return (
                direct.name ||
                "A DEFINIR"
            );

        }

        return "A DEFINIR";

    }


    function getNightScore(
        match,
        side
    ) {

        const home =
            side === "home";

        return number(
            nightValue(

                match,

                home
                    ? [
                        "home_score",
                        "player1_score",
                        "player_a_score",
                        "score1",
                        "score_a",
                        "home_goals"
                    ]

                    : [
                        "away_score",
                        "player2_score",
                        "player_b_score",
                        "score2",
                        "score_b",
                        "away_goals"
                    ],

                0
            )
        );

    }


    function getNightStatus(
        match
    ) {

        return normalize(
            nightValue(
                match,
                [
                    "status",
                    "state",
                    "match_status"
                ],
                "PENDING"
            )
        );

    }


    function isNightFinished(
        match
    ) {

        return [
            "FINAL",
            "FINISHED",
            "COMPLETED",
            "DONE",
            "FINALIZADA"
        ].includes(
            getNightStatus(
                match
            )
        );

    }


    function getNightMatchNumber(
        match,
        index
    ) {

        return number(
            nightValue(
                match,
                [
                    "match_number",
                    "match",
                    "game_number",
                    "fixture_number",
                    "position"
                ],
                index + 1
            )
        );

    }


    function getNightRound(
        match
    ) {

        const raw =
            normalize(
                nightValue(
                    match,
                    [
                        "round",
                        "round_name",
                        "phase",
                        "stage",
                        "round_type"
                    ],
                    ""
                )
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

        const n =
            number(
                nightValue(
                    match,
                    [
                        "round_number",
                        "stage_number",
                        "round_index"
                    ],
                    0
                )
            );

        if (
            n >= 3
        ) {

            return "final";

        }

        if (
            n === 2
        ) {

            return "semi";

        }

        const matchNumber =
            number(
                nightValue(
                    match,
                    [
                        "match_number",
                        "match",
                        "game_number",
                        "fixture_number",
                        "position"
                    ],
                    0
                )
            );

        if (
            matchNumber >= 7
        ) {

            return "final";

        }

        if (
            matchNumber >= 5
        ) {

            return "semi";

        }

        return "quarterfinal";

    }


    /* =========================================================
       NIGHT CUP VISUAL
       ========================================================= */

    function injectNightStyles() {

        if (
            document.getElementById(
                "ccfv-night-live-styles"
            )
        ) {

            return;

        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "ccfv-night-live-styles";

        style.textContent = `

            .ccfv-night-live-game {

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .07
                    );

                border-radius:
                    12px;

                padding:
                    12px;

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


            .ccfv-night-live-game
            + .ccfv-night-live-game {

                margin-top:
                    9px;

            }


            .ccfv-night-live-game.is-final {

                border-color:
                    rgba(
                        67,
                        223,
                        145,
                        .24
                    );

                background:
                    rgba(
                        67,
                        223,
                        145,
                        .025
                    );

            }


            .ccfv-night-live-top {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    10px;

                margin-bottom:
                    9px;

                color:
                    #43df91;

                font-size:
                    10px;

                font-weight:
                    900;

                letter-spacing:
                    .08em;

                text-transform:
                    uppercase;

            }


            .ccfv-night-live-top small {

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .25
                    );

                font-size:
                    9px;

            }


            .ccfv-night-live-teams {

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
                    12px;

                align-items:
                    center;

            }


            .ccfv-night-live-team {

                min-width:
                    0;

                color:
                    #fff;

                font-size:
                    13px;

                font-weight:
                    900;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

                white-space:
                    nowrap;

            }


            .ccfv-night-live-team.is-away {

                text-align:
                    right;

            }


            .ccfv-night-live-score {

                min-width:
                    64px;

                padding:
                    7px 9px;

                border:
                    1px solid
                    rgba(
                        67,
                        223,
                        145,
                        .18
                    );

                border-radius:
                    999px;

                text-align:
                    center;

                color:
                    #43df91;

                font-size:
                    12px;

                font-weight:
                    950;

            }


            .ccfv-night-live-bottom {

                display:
                    flex;

                justify-content:
                    space-between;

                gap:
                    10px;

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


            .ccfv-night-live-bottom strong {

                color:
                    #43df91;

            }

        `;

        document.head.appendChild(
            style
        );

    }


    function renderNightGroup(
        container,
        matches,
        label
    ) {

        if (
            !container
        ) {

            return;

        }

        injectNightStyles();

        const ordered =
            matches
                .slice()
                .sort(
                    (
                        a,
                        b
                    ) =>
                        getNightMatchNumber(
                            a,
                            0
                        ) -
                        getNightMatchNumber(
                            b,
                            0
                        )
                );

        if (
            !ordered.length
        ) {

            container.innerHTML = `

                <div
                    class="ccfv-night-live-game"
                >

                    <div
                        class="ccfv-night-live-top"
                    >

                        <span>
                            ${escapeHTML(
                                label
                            )}
                        </span>

                        <small>
                            A DEFINIR
                        </small>

                    </div>


                    <div
                        class="ccfv-night-live-teams"
                    >

                        <strong
                            class="ccfv-night-live-team"
                        >
                            A DEFINIR
                        </strong>

                        <span
                            class="ccfv-night-live-score"
                        >
                            VS
                        </span>

                        <strong
                            class="
                                ccfv-night-live-team
                                is-away
                            "
                        >
                            A DEFINIR
                        </strong>

                    </div>


                    <div
                        class="ccfv-night-live-bottom"
                    >

                        <span>
                            AGUARDANDO
                        </span>

                        <strong>
                            CCFV
                        </strong>

                    </div>

                </div>

            `;

            return;

        }


        container.innerHTML =
            ordered
                .map(
                    (
                        match,
                        index
                    ) => {

                        const home =
                            getNightPlayerName(
                                match,
                                "home"
                            );

                        const away =
                            getNightPlayerName(
                                match,
                                "away"
                            );

                        const finished =
                            isNightFinished(
                                match
                            );

                        const numberLabel =
                            String(
                                getNightMatchNumber(
                                    match,
                                    index
                                )
                            ).padStart(
                                2,
                                "0"
                            );

                        const score =
                            finished
                                ? `${getNightScore(
                                    match,
                                    "home"
                                )} × ${getNightScore(
                                    match,
                                    "away"
                                )}`
                                : "VS";

                        return `

                            <div
                                class="
                                    ccfv-night-live-game
                                    ${finished
                                        ? "is-final"
                                        : ""}
                                "
                            >

                                <div
                                    class="
                                        ccfv-night-live-top
                                    "
                                >

                                    <span>
                                        ${escapeHTML(
                                            label
                                        )}
                                        ${numberLabel}
                                    </span>

                                    <small>
                                        ${finished
                                            ? "FINALIZADA"
                                            : "A DEFINIR"}
                                    </small>

                                </div>


                                <div
                                    class="
                                        ccfv-night-live-teams
                                    "
                                >

                                    <strong
                                        class="
                                            ccfv-night-live-team
                                        "
                                    >
                                        ${escapeHTML(
                                            home
                                        )}
                                    </strong>


                                    <span
                                        class="
                                            ccfv-night-live-score
                                        "
                                    >
                                        ${score}
                                    </span>


                                    <strong
                                        class="
                                            ccfv-night-live-team
                                            is-away
                                        "
                                    >
                                        ${escapeHTML(
                                            away
                                        )}
                                    </strong>

                                </div>


                                <div
                                    class="
                                        ccfv-night-live-bottom
                                    "
                                >

                                    <span>
                                        ${finished
                                            ? "RESULTADO REGISTRADO"
                                            : "AGUARDANDO RESULTADO"}
                                    </span>

                                    <strong>
                                        CCFV
                                    </strong>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    function syncNightCup() {

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

        const champion =
            document.querySelector(
                "#night-champion-name"
            );

        const statusElement =
            document.querySelector(
                "#night-cup-status"
            );


        if (
            !quarterfinals &&
            !semifinals &&
            !final &&
            !champion
        ) {

            return;

        }


        const groups = {

            quarterfinal: [],

            semi: [],

            final: []

        };


        (
            state.nightMatches ||
            []
        )
            .forEach(
                match => {

                    const round =
                        getNightRound(
                            match
                        );

                    groups[
                        round
                    ].push(
                        match
                    );

                }
            );


        renderNightGroup(
            quarterfinals,
            groups.quarterfinal,
            "QF"
        );


        renderNightGroup(
            semifinals,
            groups.semi,
            "SF"
        );


        renderNightGroup(
            final,
            groups.final,
            "FINAL"
        );


        if (
            champion
        ) {

            const finalMatch =
                groups.final.find(
                    isNightFinished
                );

            let winner =
                null;


            if (
                finalMatch
            ) {

                const explicitWinner =
                    nightValue(
                        finalMatch,
                        [
                            "winner_name",
                            "winner",
                            "winner_player_name"
                        ],
                        null
                    );


                if (
                    explicitWinner &&
                    typeof explicitWinner !==
                        "object"
                ) {

                    winner =
                        String(
                            explicitWinner
                        );

                }


                if (
                    !winner
                ) {

                    const winnerId =
                        nightValue(
                            finalMatch,
                            [
                                "winner_id",
                                "winner_player_id"
                            ],
                            null
                        );


                    if (
                        winnerId
                    ) {

                        winner =
                            state.players.find(
                                player =>
                                    String(
                                        player.id
                                    ) ===
                                    String(
                                        winnerId
                                    )
                            )?.name ||
                            null;

                    }

                }


                if (
                    !winner
                ) {

                    const homeScore =
                        getNightScore(
                            finalMatch,
                            "home"
                        );

                    const awayScore =
                        getNightScore(
                            finalMatch,
                            "away"
                        );


                    if (
                        homeScore !==
                        awayScore
                    ) {

                        winner =
                            homeScore >
                            awayScore

                                ? getNightPlayerName(
                                    finalMatch,
                                    "home"
                                )

                                : getNightPlayerName(
                                    finalMatch,
                                    "away"
                                );

                    }

                }

            }


            champion.textContent =
                winner ||
                "A DEFINIR";

        }


        if (
            statusElement
        ) {

            const total =
                state.nightMatches.length;

            const finished =
                state.nightMatches.filter(
                    isNightFinished
                ).length;


            statusElement.textContent =

                total === 0

                    ? "SETUP"

                    : finished >= total

                        ? "FINALIZADA"

                        : "EM ANDAMENTO";

        }

    }


    /* =========================================================
       HOME
       ========================================================= */

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
                    ).startsWith(
                        "BRASILEIRAO"
                    )
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


        const completedBrazil =
            brazilMatches.filter(match =>
                [
                    "FINAL",
                    "FINISHED",
                    "COMPLETED",
                    "CONCLUIDA",
                    "ENCERRADA"
                ].includes(normalize(match.status))
            ).length;

        const values = [
            "20",
            String(currentRound),
            String(completedBrazil),
            completedBrazil >= 380 ? "1" : "0"
        ];


        cards.forEach(
            (
                card,
                index
            ) => {

                const target =
                    card.querySelector(
                        ".ccfv-data-card__number"
                    );


                if (
                    target &&
                    values[
                        index
                    ] !==
                    undefined
                ) {

                    target.textContent =
                        values[
                            index
                        ];

                }

            }
        );

    }


    /* =========================================================
       CONTADORES
       ========================================================= */

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


    /* =========================================================
       ESTADO PÚBLICO
       ========================================================= */

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


    /* =========================================================
       REFRESH
       ========================================================= */

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


            const results =
                await Promise.allSettled([
                    loadPlayers(client),
                    loadPlayerCompetitions(client),
                    loadMatches(client),
                    loadNightMatches(client),
                    loadRanking(client)
                ]);

            const [
                playersResult,
                playerCompetitionsResult,
                matchesResult,
                nightMatchesResult,
                rankingResult
            ] = results;

            const readResult = (result, label) => {
                if (result.status === "fulfilled") {
                    return Array.isArray(result.value) ? result.value : [];
                }

                console.error(`CCFV // LIVE ${label}:`, result.reason);
                return [];
            };

            state.players =
                readResult(playersResult, "PLAYERS");

            state.playerCompetitions =
                readResult(playerCompetitionsResult, "PLAYER_COMPETITIONS");

            state.matches =
                readResult(matchesResult, "MATCHES");

            state.nightMatches =
                readResult(nightMatchesResult, "NIGHT CUP");

            const officialRanking =
                readResult(rankingResult, "RANKING");

            state.ranking =
                officialRanking.length
                    ? officialRanking
                    : buildLiveRanking(state.players);


            state.updatedAt =
                new Date();


            /*
             * O Brasileirão possui um sincronizador próprio
             * (brasileirao-live.js), que converte os clubes
             * para os IDs oficiais dos fixtures antes de
             * recalcular a tabela. Não sobrescreva aqui com
             * nomes crus do banco, pois isso faria a tabela
             * zerar.
             */

            syncNightCup();

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


    /* =========================================================
       REALTIME
       ========================================================= */

    function subscribeRealtime(
        client
    ) {

        if (
            realtimeChannel
        ) {

            try {

                client.removeChannel(
                    realtimeChannel
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


        realtimeChannel =
            client.channel(
                "ccfv-live-public"
            );


        REALTIME_TABLES.forEach(
            table => {

                realtimeChannel.on(
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


        realtimeChannel.subscribe(
            status => {

                console.log(
                    "%cCCFV // REALTIME",
                    "color:#43df91;font-weight:900;",
                    status
                );

            }
        );

    }


    /* =========================================================
       API
       ========================================================= */

    window.CCFVLiveAPI = {

        state,

        refresh,

        getState: () => state,

        isReady: () => Boolean(state.updatedAt)

    };


    /* =========================================================
       INIT
       ========================================================= */

    async function init() {

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