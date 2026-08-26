/* =========================================================
   CCFV — RANKING OFICIAL
   MOTOR DE ELO + INSÍGNIAS + PLAYER CARDS

   ELO:
   0–999       INICIANTE
   1000–1999   AMADOR
   2000–2999   PROFISSIONAL
   3000+       LENDA

   JOGADORES REAIS:
   cadastrados futuramente pelo ADMIN.

   PLAYER CARDS:
   totalmente gerados por HTML + CSS + JS.
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO DOS NÍVEIS
       ===================================================== */

    const RANK_CONFIG = {

        beginner: {

            key: "beginner",

            name: "INICIANTE",

            min: 0,

            max: 999,

            next: 1000,

            color: "#8d9a95",

            description:
                "O início da caminhada competitiva."

        },


        amateur: {

            key: "amateur",

            name: "AMADOR",

            min: 1000,

            max: 1999,

            next: 2000,

            color: "#69a8ff",

            description:
                "Primeira grande conquista da CCFV."

        },


        professional: {

            key: "professional",

            name: "PROFISSIONAL",

            min: 2000,

            max: 2999,

            next: 3000,

            color: "#43df91",

            description:
                "O nível competitivo de alto rendimento."

        },


        legend: {

            key: "legend",

            name: "LENDA",

            min: 3000,

            max: Infinity,

            next: null,

            color: "#ffc252",

            description:
                "A elite absoluta da CCFV."

        }

    };


    /* =====================================================
       ELO
       ===================================================== */

    const ELO_CONFIG = {

        baseK: 60,

        competitionMultiplier: {

            brasileirao: 1.00,

            night_quarter: 1.10,

            night_semi: 1.20,

            night_final: 1.35

        }

    };


    /* =====================================================
       JOGADORES
       ===================================================== */

    const players = [];


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const elements = {

        levelGrid:
            document.querySelector(
                "#ranking-level-grid"
            ),

        feature:
            document.querySelector(
                "#ranking-feature-player"
            ),

        ranking:
            document.querySelector(
                "#ranking-list"
            ),

        cards:
            document.querySelector(
                "#player-card-grid"
            ),

        playerCount:
            document.querySelector(
                "#ranking-player-count"
            ),

        heroLeader:
            document.querySelector(
                "#ranking-hero-leader"
            ),

        filters:
            document.querySelectorAll(
                "[data-platform]"
            )

    };


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function getInitials(name) {

        const words =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (!words.length) {

            return "--";

        }


        if (words.length === 1) {

            return words[0]
                .slice(0, 2)
                .toUpperCase();

        }


        return (
            words[0][0] +
            words[1][0]
        ).toUpperCase();

    }


    /* =====================================================
       ELO → RANK
       ===================================================== */

    function getRankByPoints(elo) {

        const value =
            Math.max(
                0,
                Number(elo) || 0
            );


        if (
            value >=
            RANK_CONFIG.legend.min
        ) {

            return RANK_CONFIG.legend;

        }


        if (
            value >=
            RANK_CONFIG.professional.min
        ) {

            return RANK_CONFIG.professional;

        }


        if (
            value >=
            RANK_CONFIG.amateur.min
        ) {

            return RANK_CONFIG.amateur;

        }


        return RANK_CONFIG.beginner;

    }


    /* =====================================================
       PROGRESSO
       ===================================================== */

    function getProgress(elo) {

        const rank =
            getRankByPoints(elo);


        if (
            rank.key === "legend"
        ) {

            return 100;

        }


        const current =
            Number(elo) || 0;


        const range =
            rank.next -
            rank.min;


        return Math.min(
            100,
            Math.max(
                0,
                (
                    (
                        current -
                        rank.min
                    ) /
                    range
                ) * 100
            )
        );

    }


    /* =====================================================
       ELO EXPECTED SCORE
       ===================================================== */

    function getExpectedScore(
        playerElo,
        opponentElo
    ) {

        return (
            1 /
            (
                1 +
                Math.pow(
                    10,
                    (
                        opponentElo -
                        playerElo
                    ) / 400
                )
            )
        );

    }


    /* =====================================================
       PESO DA COMPETIÇÃO
       ===================================================== */

    function getCompetitionMultiplier(
        competition,
        stage
    ) {

        if (
            competition ===
            "brasileirao"
        ) {

            return 1.00;

        }


        if (
            competition ===
            "night"
        ) {

            if (
                stage ===
                "final"
            ) {

                return 1.35;

            }


            if (
                stage ===
                "semi"
            ) {

                return 1.20;

            }


            return 1.10;

        }


        return 1;

    }


    /* =====================================================
       CÁLCULO DE ELO
       ===================================================== */

    function calculateEloChange({

        playerElo,

        opponentElo,

        score,

        competition =
            "brasileirao",

        stage = null

    }) {

        const expected =
            getExpectedScore(
                playerElo,
                opponentElo
            );


        const multiplier =
            getCompetitionMultiplier(
                competition,
                stage
            );


        const K =
            ELO_CONFIG.baseK *
            multiplier;


        return Math.round(
            K *
            (
                score -
                expected
            )
        );

    }


    /* =====================================================
       RESULTADO DE PARTIDA
       ===================================================== */

    function applyMatchResult({

        playerId,

        opponentId,

        result,

        competition =
            "brasileirao",

        stage = null

    }) {

        const player =
            players.find(
                item =>
                    Number(item.id) ===
                    Number(playerId)
            );


        const opponent =
            players.find(
                item =>
                    Number(item.id) ===
                    Number(opponentId)
            );


        if (
            !player ||
            !opponent
        ) {

            throw new Error(
                "Jogador não encontrado."
            );

        }


        let playerScore;


        if (
            result ===
            "win"
        ) {

            playerScore = 1;

        }

        else if (
            result ===
            "draw"
        ) {

            playerScore = 0.5;

        }

        else if (
            result ===
            "loss"
        ) {

            playerScore = 0;

        }

        else {

            throw new Error(
                "Resultado inválido."
            );

        }


        const opponentScore =
            1 -
            playerScore;


        const playerChange =
            calculateEloChange({

                playerElo:
                    player.elo || 0,

                opponentElo:
                    opponent.elo || 0,

                score:
                    playerScore,

                competition,

                stage

            });


        const opponentChange =
            calculateEloChange({

                playerElo:
                    opponent.elo || 0,

                opponentElo:
                    player.elo || 0,

                score:
                    opponentScore,

                competition,

                stage

            });


        player.elo =
            Math.max(
                0,
                (player.elo || 0) +
                playerChange
            );


        opponent.elo =
            Math.max(
                0,
                (opponent.elo || 0) +
                opponentChange
            );


        player.wins =
            Number(
                player.wins || 0
            );


        player.draws =
            Number(
                player.draws || 0
            );


        player.losses =
            Number(
                player.losses || 0
            );


        opponent.wins =
            Number(
                opponent.wins || 0
            );


        opponent.draws =
            Number(
                opponent.draws || 0
            );


        opponent.losses =
            Number(
                opponent.losses || 0
            );


        if (
            result === "win"
        ) {

            player.wins++;

            opponent.losses++;

        }

        else if (
            result === "draw"
        ) {

            player.draws++;

            opponent.draws++;

        }

        else {

            player.losses++;

            opponent.wins++;

        }


        refreshAll();


        return {

            player,

            opponent,

            playerChange,

            opponentChange

        };

    }


    /* =====================================================
       SVG INSÍGNIAS
       ===================================================== */

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


    /* =====================================================
       ELOS
       ===================================================== */

    function getTopPlayerForRank(rank) {

        return players
            .filter(
                player => {

                    const elo =
                        Number(
                            player?.elo ||
                            0
                        );

                    return (
                        elo >= rank.min &&
                        elo <= rank.max
                    );

                }
            )
            .sort(
                (
                    first,
                    second
                ) =>
                    Number(
                        second?.elo ||
                        0
                    ) -
                    Number(
                        first?.elo ||
                        0
                    )
            )[0] || null;

    }


    function bindLevelCardMotion() {

        if (!elements.levelGrid) return;

        elements.levelGrid
            .querySelectorAll('.ccfv-ranking-level')
            .forEach(card => {

                card.addEventListener('pointermove', event => {
                    const rect = card.getBoundingClientRect();
                    const px = (event.clientX - rect.left) / rect.width;
                    const py = (event.clientY - rect.top) / rect.height;
                    const rx = (0.5 - py) * 6;
                    const ry = (px - 0.5) * 8;
                    card.style.setProperty('--level-rx', `${rx}deg`);
                    card.style.setProperty('--level-ry', `${ry}deg`);
                    card.style.setProperty('--level-mx', `${px * 100}%`);
                    card.style.setProperty('--level-my', `${py * 100}%`);
                    card.classList.add('is-hovering');
                });

                card.addEventListener('pointerleave', () => {
                    card.style.setProperty('--level-rx', '0deg');
                    card.style.setProperty('--level-ry', '0deg');
                    card.style.setProperty('--level-mx', '50%');
                    card.style.setProperty('--level-my', '50%');
                    card.classList.remove('is-hovering');
                });
            });
    }


    function renderLevels() {

        if (
            !elements.levelGrid
        ) {

            return;

        }

        const levels = [

            RANK_CONFIG.beginner,
            RANK_CONFIG.amateur,
            RANK_CONFIG.professional,
            RANK_CONFIG.legend

        ];

        elements.levelGrid.innerHTML =
            levels
                .map(
                    (
                        rank,
                        index
                    ) => {

                        const range =
                            rank.key === "legend"
                                ? "3000+ ELO"
                                : `${rank.min} → ${rank.max} ELO`;

                        const topPlayer =
                            getTopPlayerForRank(
                                rank
                            );

                        const photo =
                            topPlayer?.photo ||
                            topPlayer?.photo_url ||
                            "";

                        const initials =
                            topPlayer?.name
                                ? String(
                                    topPlayer.name
                                )
                                    .trim()
                                    .slice(
                                        0,
                                        2
                                    )
                                    .toUpperCase()
                                : "--";

                        const topPhoto =
                            photo
                                ? `
                                    <img
                                        src="${escapeHTML(
                                            photo
                                        )}"
                                        alt="${escapeHTML(
                                            topPlayer.name
                                        )}"
                                        loading="lazy"
                                    >
                                `
                                : `
                                    <span>
                                        ${escapeHTML(
                                            initials
                                        )}
                                    </span>
                                `;

                        return `

                            <article
                                class="
                                    ccfv-ranking-level
                                    ccfv-ranking-level--${rank.key}
                                    ${topPlayer ? "has-leader" : "is-empty"}
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
                                    ${topPhoto}
                                </div>

                                <div
                                    class="
                                        ccfv-ranking-level__name
                                    "
                                >
                                    ${escapeHTML(
                                        rank.name
                                    )}
                                </div>

                                <div
                                    class="
                                        ccfv-ranking-level__range
                                    "
                                >
                                    ${range}
                                </div>

                                <div
                                    class="
                                        ccfv-ranking-level__leader
                                    "
                                >

                                    ${
                                        topPlayer
                                            ? `
                                                <strong>
                                                    ${escapeHTML(
                                                        topPlayer.name
                                                    )}
                                                </strong>
                                                <span>
                                                    ${Number(
                                                        topPlayer.elo || 0
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

        bindLevelCardMotion();

    }


    /* =====================================================
       TOPO DO RANKING
       ===================================================== */

   function renderFeature() {

    if (
        !elements.feature
    ) {

        return;

    }


    const leader =
        players
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        b.elo || 0
                    ) -
                    Number(
                        a.elo || 0
                    )
            )[0];


    /*
     * SEM JOGADOR
     */

    if (
        !leader
    ) {

        elements.feature.innerHTML = `

            <div
                class="
                    ccfv-ranking-empty-feature
                "
            >

                <div
                    class="
                        ccfv-ranking-empty-feature__art
                    "
                >

                    <div
                        class="
                            ccfv-ranking-empty-feature__orb
                        "
                    ></div>


                    <div
                        class="
                            ccfv-ranking-empty-feature__ring
                            ccfv-ranking-empty-feature__ring--one
                        "
                    ></div>


                    <div
                        class="
                            ccfv-ranking-empty-feature__ring
                            ccfv-ranking-empty-feature__ring--two
                        "
                    ></div>


                    <div
                        class="
                            ccfv-ranking-empty-feature__ring
                            ccfv-ranking-empty-feature__ring--three
                        "
                    ></div>


                    <div
                        class="
                            ccfv-ranking-empty-feature__badge
                        "
                    >

                        ${renderBadge(
                            RANK_CONFIG.legend,
                            "large"
                        )}

                    </div>


                    <span
                        class="
                            ccfv-ranking-empty-feature__number
                        "
                    >
                        #01
                    </span>

                </div>


                <div
                    class="
                        ccfv-ranking-empty-feature__content
                    "
                >

                    <span>
                        CCFV // THE THRONE
                    </span>


                    <strong>
                        O TRONO
                        <br>
                        ESTÁ
                        <br>
                        VAZIO.
                    </strong>


                    <p>
                        O primeiro jogador a conquistar
                        seu espaço na elite da CCFV ocupará
                        automaticamente esta posição.
                    </p>


                    <div
                        class="
                            ccfv-ranking-empty-feature__stats
                        "
                    >

                        <div>

                            <span>
                                STATUS
                            </span>

                            <strong>
                                OPEN
                            </strong>

                        </div>


                        <div>

                            <span>
                                PLAYERS
                            </span>

                            <strong>
                                ${String(
                                    players.length
                                ).padStart(
                                    2,
                                    "0"
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                SEASON
                            </span>

                            <strong>
                                01
                            </strong>

                        </div>

                    </div>

                </div>

            </div>

        `;

        return;

    }


    /*
     * LÍDER REAL
     */

    const rank =
        getRankByPoints(
            leader.elo
        );


    const photo =
        leader.photo ||
        leader.photo_url ||
        "";


    const initials =
        leader.name
            ? String(
                leader.name
            )
                .trim()
                .slice(
                    0,
                    2
                )
                .toUpperCase()
            : "??";


    const photoHTML =
        photo
            ? `
                <img
                    src="${escapeHTML(
                        photo
                    )}"
                    alt="${escapeHTML(
                        leader.name
                    )}"
                    loading="eager"
                >
            `
            : `
                <span>
                    ${escapeHTML(
                        initials
                    )}
                </span>
            `;


    const elo =
        Number(
            leader.elo || 0
        );


    const games =
        Number(
            leader.matches ??
            (
                Number(
                    leader.wins || 0
                ) +
                Number(
                    leader.draws || 0
                ) +
                Number(
                    leader.losses || 0
                )
            )
        );


    const wins =
        Number(
            leader.wins || 0
        );


    const draws =
        Number(
            leader.draws || 0
        );


    const losses =
        Number(
            leader.losses || 0
        );


    const titles =
        Number(
            leader.titles || 0
        );


    elements.feature.innerHTML = `

        <div
            class="
                ccfv-ranking-feature
            "
        >

            <div
                class="
                    ccfv-ranking-feature__visual
                "
            >

                <div
                    class="
                        ccfv-ranking-feature__photo
                    "
                >

                    ${photoHTML}

                </div>


                <div
                    class="
                        ccfv-ranking-feature__badge
                    "
                >

                    ${renderBadge(
                        rank,
                        "large"
                    )}

                </div>


                <span
                    class="
                        ccfv-ranking-feature__position
                    "
                >
                    #01
                </span>

            </div>


            <div
                class="
                    ccfv-ranking-feature__content
            "
            >

                <span>
                    CCFV // OFFICIAL LEADER
                </span>


                <h2>
                    ${escapeHTML(
                        leader.name
                    )}
                </h2>


                <small>
                    ${
                        leader.instagram
                            ? `@${escapeHTML(
                                String(
                                    leader.instagram
                                )
                                    .replace(
                                        /^@/,
                                        ""
                                    )
                            )}`
                            : "SEM INSTAGRAM"
                    }
                </small>


                <div
                    class="
                        ccfv-ranking-feature__rank
                    "
                >
                    ${escapeHTML(
                        rank.name
                    )}
                </div>


                <div
                    class="
                        ccfv-ranking-feature__stats
                    "
                >

                    <div>

                        <span>
                            ELO
                        </span>

                        <strong>
                            ${elo}
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
                            V
                        </span>

                        <strong>
                            ${wins}
                        </strong>

                    </div>


                    <div>

                        <span>
                            E
                        </span>

                        <strong>
                            ${draws}
                        </strong>

                    </div>


                    <div>

                        <span>
                            D
                        </span>

                        <strong>
                            ${losses}
                        </strong>

                    </div>


                    <div>

                        <span>
                            TÍTULOS
                        </span>

                        <strong>
                            ${titles}
                        </strong>

                    </div>

                </div>

            </div>

        </div>

    `;

}


    /* =====================================================
       HEADER DA TABELA
       ===================================================== */

    function renderRankingHeader() {

        return `

            <div
                class="
                    ccfv-ranking-table-head
                "
            >

                <span>
                    POS
                </span>

                <span>
                    JOGADOR
                </span>

                <span>
                    PLATAFORMA
                </span>

                <span>
                    ELO
                </span>

                <span>
                    STATUS
                </span>

            </div>

        `;

    }


    /* =====================================================
       RANKING
       ===================================================== */

   function renderRanking(
    platform = "all"
) {

    if (
        !elements.ranking
    ) {

        return;

    }


    const normalizedPlatform =
        String(
            platform || "all"
        )
            .trim()
            .toLowerCase();


    const filtered =
        players
            .filter(
                player => {

                    if (
                        normalizedPlatform ===
                        "all"
                    ) {

                        return true;

                    }


                    return (
                        String(
                            player.platform ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        normalizedPlatform
                    );

                }
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        b.elo || 0
                    ) -
                    Number(
                        a.elo || 0
                    )
            )
            .slice(0, 10);


    if (
        !filtered.length
    ) {

        const slots =
            Array.from(
                {
                    length: 10
                },
                (
                    _,
                    index
                ) => {

                    return `

                        <div
                            class="
                                ccfv-ranking-empty-slot
                            "
                        >

                            <span>
                                ${String(
                                    index + 1
                                ).padStart(
                                    2,
                                    "0"
                                )}
                            </span>


                            <div
                                class="
                                    ccfv-ranking-empty-slot__player
                                "
                            >

                                <div
                                    class="
                                        ccfv-ranking-empty-slot__photo
                                    "
                                >
                                    ?
                                </div>


                                <div>

                                    <strong>
                                        AGUARDANDO COMPETIDOR
                                    </strong>

                                    <small>
                                        POSIÇÃO #${String(
                                            index + 1
                                        ).padStart(
                                            2,
                                            "0"
                                        )}
                                    </small>

                                </div>

                            </div>


                            <span>
                                —
                            </span>


                            <span>
                                0000
                            </span>


                            <span
                                class="
                                    ccfv-ranking-empty-slot__status
                                "
                            >
                                DISPONÍVEL
                            </span>

                        </div>

                    `;

                }
            )
            .join("");


        elements.ranking.innerHTML =
            renderRankingHeader() +
            slots;

        return;

    }


    elements.ranking.innerHTML =
        renderRankingHeader() +
        filtered
            .map(
                (
                    player,
                    index
                ) => {

                    const rank =
                        getRankByPoints(
                            player.elo
                        );


                    const photo =
                        player.photo ||
                        player.photo_url ||
                        "";


                    const initials =
                        player.name
                            ? String(
                                player.name
                            )
                                .trim()
                                .slice(
                                    0,
                                    2
                                )
                                .toUpperCase()
                            : "??";


                    const photoHTML =
                        photo
                            ? `
                                <img
                                    src="${escapeHTML(
                                        photo
                                    )}"
                                    alt="${escapeHTML(
                                        player.name
                                    )}"
                                    loading="lazy"
                                >
                            `
                            : `
                                <span>
                                    ${escapeHTML(
                                        initials
                                    )}
                                </span>
                            `;


                    const position =
                        index + 1;


                    return `

                        <article
                            class="
                                ccfv-ranking-row
                                ccfv-ranking-row--${rank.key}
                                ${
                                    position ===
                                    1
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
                                    position
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

                                    ${photoHTML}

                                </div>


                                <div
                                    class="
                                        ccfv-ranking-row__player-info
                                    "
                                >

                                    <strong>
                                        ${escapeHTML(
                                            player.name
                                        )}
                                    </strong>


                                    <span>
                                        ${
                                            player.instagram
                                                ? `@${escapeHTML(
                                                    String(
                                                        player.instagram
                                                    )
                                                        .replace(
                                                            /^@/,
                                                            ""
                                                        )
                                                )}`
                                                : escapeHTML(
                                                    rank.name
                                                )
                                        }
                                    </span>

                                </div>

                            </div>


                            <span
                                class="
                                    ccfv-ranking-row__platform
                                "
                            >
                                ${escapeHTML(
                                    player.platform ||
                                    "—"
                                )}
                            </span>


                            <span
                                class="
                                    ccfv-ranking-row__points
                                "
                            >
                                ${Number(
                                    player.elo || 0
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
                                ${escapeHTML(
                                    rank.name
                                )}
                            </span>

                        </article>

                    `;

                }
            )
            .join("");

}

    /* =====================================================
       PLAYER CARDS — DADOS REAIS
       ===================================================== */

    function getPlayerPhoto(player) {

        return String(
            player?.photo ||
            player?.photo_url ||
            player?.avatar_url ||
            player?.image_url ||
            ""
        ).trim();

    }


    function getPlayerGames(player) {

        const direct = Number(
            player?.matches_played ??
            player?.matches ??
            NaN
        );

        if (Number.isFinite(direct)) {
            return direct;
        }

        return Number(player?.wins || 0) +
            Number(player?.draws || 0) +
            Number(player?.losses || 0);

    }


    function getWinRate(player) {

        const games = getPlayerGames(player);
        const wins = Number(player?.wins || 0);

        if (!games) {
            return 0;
        }

        return Math.round((wins / games) * 100);

    }


    function createPlayerCard(player, position) {

        const rank = getRankByPoints(player?.elo || 0);
        const photo = getPlayerPhoto(player);
        const initials = getInitials(player?.name || "CC");
        const elo = Number(player?.elo || 0);
        const games = getPlayerGames(player);
        const wins = Number(player?.wins || 0);
        const titles = Number(player?.titles || 0);
        const winRate = getWinRate(player);
        const instagram = player?.instagram
            ? `@${String(player.instagram).replace(/^@/, "")}`
            : "CCFV OFFICIAL";

        const photoHTML = photo
            ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(player?.name || "Jogador")}" loading="lazy" crossorigin="anonymous">`
            : `<span class="ccfv-player-card-real__initials">${escapeHTML(initials)}</span>`;

        return `
            <div class="ccfv-player-card-item" data-player-name="${escapeHTML(player?.name || "")}" data-player-id="${escapeHTML(player?.id ?? position)}">
                <article
                    class="ccfv-player-card-preview ccfv-player-card-preview--${rank.key} ccfv-player-card-preview--animated ccfv-player-card-real"
                    data-card-player-id="${escapeHTML(player?.id ?? position)}"
                >

                    <div class="ccfv-player-card-preview__holo"></div>
                    <div class="ccfv-player-card-preview__noise"></div>
                    <div class="ccfv-player-card-preview__energy"></div>
                    <div class="ccfv-player-card-preview__grid"></div>

                    <div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--tl"></div>
                    <div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--tr"></div>
                    <div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--bl"></div>
                    <div class="ccfv-player-card-preview__corner ccfv-player-card-preview__corner--br"></div>

                    <div class="ccfv-player-card-preview__top">
                        <div>
                            <span>CCFV PLAYER</span>
                            <strong>#${String(position).padStart(3, "0")}</strong>
                        </div>
                        <div class="ccfv-player-card-preview__mini-badge">
                            ${renderBadge(rank, "small")}
                        </div>
                    </div>

                    <div class="ccfv-player-card-preview__scanline"></div>

                    <div class="ccfv-player-card-preview__photo">
                        <div class="ccfv-player-card-preview__photo-frame ccfv-player-card-real__photo-frame">
                            ${photoHTML}
                        </div>
                    </div>

                    <div class="ccfv-player-card-preview__badge-floating">
                        ${renderBadge(rank, "medium")}
                    </div>

                    <div class="ccfv-player-card-preview__identity">
                        <span>${escapeHTML(rank.name)}</span>
                        <strong>${escapeHTML(player?.name || "JOGADOR")}</strong>
                        <small>${escapeHTML(instagram)}</small>
                    </div>

                    <div class="ccfv-player-card-preview__metrics">
                        <div><span>ELO</span><strong>${elo}</strong></div>
                        <div><span>POS</span><strong>#${String(position).padStart(2, "0")}</strong></div>
                        <div><span>WIN</span><strong>${String(winRate).padStart(2, "0")}%</strong></div>
                    </div>

                    <div class="ccfv-player-card-preview__footer">
                        <span>CCFV OFFICIAL</span>
                        <strong>${escapeHTML(rank.name)}</strong>
                    </div>

                    <div class="ccfv-player-card-preview__particles">
                        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                    </div>
                </article>

                <button
                    type="button"
                    class="ccfv-player-card-download"
                    data-download-card="${escapeHTML(player?.id ?? position)}"
                >
                    <span>BAIXAR CARD</span>
                    <span>↓</span>
                </button>
            </div>
        `;

    }


    async function downloadPlayerCard(button) {

        const playerId = button?.dataset?.downloadCard;
        const card = document.querySelector(
            `[data-card-player-id="${CSS.escape(String(playerId))}"]`
        );

        if (!card) {
            return;
        }

        if (typeof window.html2canvas !== "function") {
            alert("O gerador do card ainda está carregando. Tente novamente em alguns segundos.");
            return;
        }

        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = "<span>GERANDO...</span><span>…</span>";

        try {
            const canvas = await window.html2canvas(card, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                allowTaint: false,
                imageTimeout: 15000,
                logging: false
            });

            const anchor = document.createElement("a");
            const player = players.find(item => String(item?.id) === String(playerId));
            const safeName = String(player?.name || "jogador")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .toLowerCase();

            anchor.download = `ccfv-card-${safeName || "jogador"}.png`;
            anchor.href = canvas.toDataURL("image/png");
            anchor.click();
        } catch (error) {
            console.error("CCFV // ERRO AO GERAR CARD:", error);
            alert("Não foi possível gerar o card agora. Se o jogador tiver foto externa, confira se a imagem está pública.");
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }

    }


    function bindPlayerCardDownloads() {

        document.querySelectorAll("[data-download-card]").forEach(button => {
            button.addEventListener("click", () => downloadPlayerCard(button));
        });

    }


    /* =====================================================
       CARD PRÉVIA
       ===================================================== */

    function createPreviewCard(
        rank,
        number
    ) {

        return `

            <article
                class="
                    ccfv-player-card-preview
                    ccfv-player-card-preview--${rank.key}
                    ccfv-player-card-preview--animated
                "
                data-card-rank="${rank.key}"
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
                            CCFV PLAYER
                        </span>

                        <strong>
                            #${number}
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
                        "
                    >

                        <div
                            class="
                                ccfv-player-card-preview__photo-mark
                            "
                        >
                            A SUA FOTO
                        </div>


                        <div
                            class="
                                ccfv-player-card-preview__silhouette
                            "
                        >

                            <span></span>

                            <i></i>

                        </div>


                        <div
                            class="
                                ccfv-player-card-preview__target
                            "
                        ></div>

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
                        ${escapeHTML(
                            rank.name
                        )}
                    </span>


                    <strong>
                        PLAYER
                    </strong>


                    <small>
                        NOME DO COMPETIDOR
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
                            0000
                        </strong>

                    </div>


                    <div>

                        <span>
                            POS
                        </span>

                        <strong>
                            #${number}
                        </strong>

                    </div>


                    <div>

                        <span>
                            WIN
                        </span>

                        <strong>
                            00%
                        </strong>

                    </div>

                </div>


                <div
                    class="
                        ccfv-player-card-preview__footer
                    "
                >

                    <span>
                        CCFV OFFICIAL
                    </span>

                    <strong>
                        ${escapeHTML(
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

        `;

    }


    function renderCards() {

        if (!elements.cards) {
            return;
        }

        const search = document
            .querySelector("#player-card-search")?.value
            ?.trim()
            ?.toLowerCase() || "";

        const sortedPlayers = players
            .slice()
            .sort((a, b) => {
                const eloDiff = Number(b?.elo || 0) - Number(a?.elo || 0);
                if (eloDiff !== 0) return eloDiff;
                return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR");
            })
            .filter(player =>
                !search ||
                String(player?.name || "").toLowerCase().includes(search) ||
                String(player?.instagram || "").toLowerCase().includes(search)
            );

        elements.cards.innerHTML = sortedPlayers.length
            ? sortedPlayers
                .map((player, index) => createPlayerCard(player, index + 1))
                .join("")
            : `
                <div class="ccfv-player-cards-empty">
                    <strong>NENHUM COMPETIDOR ENCONTRADO.</strong>
                    <span>Ajuste a busca ou cadastre jogadores pelo Admin.</span>
                </div>
            `;

        const count = document.querySelector("#player-card-count");
        if (count) {
            count.textContent = `${sortedPlayers.length} JOGADOR${sortedPlayers.length === 1 ? "" : "ES"}`;
        }

        bindCardMotion();
        bindPlayerCardDownloads();

    }


    /* =====================================================
       MOVIMENTO 3D
       ===================================================== */

    function bindCardMotion() {

        const cards =
            document.querySelectorAll(
                ".ccfv-player-card-preview--animated"
            );


        cards.forEach(
            card => {

                card.addEventListener(
                    "pointermove",
                    event => {

                        const rect =
                            card.getBoundingClientRect();


                        const x =
                            event.clientX -
                            rect.left;


                        const y =
                            event.clientY -
                            rect.top;


                        const percentX =
                            x /
                            rect.width;


                        const percentY =
                            y /
                            rect.height;


                        const rotateY =
                            (
                                percentX -
                                0.5
                            ) * 14;


                        const rotateX =
                            (
                                0.5 -
                                percentY
                            ) * 14;


                        card.style.setProperty(
                            "--mouse-x",
                            `${percentX * 100}%`
                        );


                        card.style.setProperty(
                            "--mouse-y",
                            `${percentY * 100}%`
                        );


                        card.style.setProperty(
                            "--rotate-x",
                            `${rotateX}deg`
                        );


                        card.style.setProperty(
                            "--rotate-y",
                            `${rotateY}deg`
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


    /* =====================================================
       FILTROS
       ===================================================== */

    function bindFilters() {

        elements.filters.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        elements.filters.forEach(
                            item =>
                                item.classList.remove(
                                    "is-active"
                                )
                        );


                        button.classList.add(
                            "is-active"
                        );


                        renderRanking(
                            button.dataset.platform
                        );

                    }
                );

            }
        );

    }


    function bindPlayerCardSearch() {

        const input = document.querySelector("#player-card-search");

        if (!input || input.dataset.bound === "true") {
            return;
        }

        input.dataset.bound = "true";
        input.addEventListener("input", () => renderCards());

    }


    /* =====================================================
       CONTADOR
       ===================================================== */

    function updateCount() {

        if (
            elements.playerCount
        ) {

            elements.playerCount.textContent =
                String(
                    players.length
                ).padStart(
                    2,
                    "0"
                );

        }

    }


    /* =====================================================
       HERO DO RANKING
       ===================================================== */

    function renderHero() {

        if (!elements.heroLeader) {
            return;
        }

        const leader = players
            .slice()
            .sort((a, b) => Number(b?.elo || 0) - Number(a?.elo || 0))[0] || null;

        if (!leader) {
            elements.heroLeader.innerHTML = `
                <div class="ccfv-ranking-hero__leader-card ccfv-ranking-hero__leader-card--empty">
                    <div class="ccfv-ranking-hero__leader-copy">
                        <span>CCFV // OFFICIAL RANKING</span>
                        <strong>O TOPO ESTÁ ESPERANDO.</strong>
                        <small>Cadastre os competidores no Admin para o líder aparecer automaticamente aqui.</small>
                    </div>
                </div>
            `;
            return;
        }

        const elo = Number(leader.elo || 0);
        const rank = getRankByPoints(elo);
        const photo = leader.photo || leader.photo_url || "";
        const initials = String(leader.name || "CC").trim().slice(0, 2).toUpperCase();
        const games = Number(leader.matches ?? (Number(leader.wins || 0) + Number(leader.draws || 0) + Number(leader.losses || 0)));
        const wins = Number(leader.wins || 0);
        const titles = Number(leader.titles || 0);
        const photoHTML = photo
            ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(leader.name || "Jogador")}" loading="eager">`
            : `<span>${escapeHTML(initials)}</span>`;

        elements.heroLeader.innerHTML = `
            <article class="ccfv-ranking-hero__leader-card ccfv-ranking-hero__leader-card--${rank.key}">
                <div class="ccfv-ranking-hero__leader-photo">
                    ${photoHTML}
                </div>

                <div class="ccfv-ranking-hero__leader-badge">
                    ${renderBadge(rank, "small")}
                </div>

                <div class="ccfv-ranking-hero__leader-content">
                    <span>CCFV // OFFICIAL LEADER</span>
                    <div class="ccfv-ranking-hero__leader-position">#01 ABSOLUTO</div>
                    <h2>${escapeHTML(leader.name || "Jogador")}</h2>
                    <small>${leader.instagram ? `@${escapeHTML(String(leader.instagram).replace(/^@/, ""))}` : rank.name}</small>

                    <div class="ccfv-ranking-hero__leader-meta">
                        <div><span>ELO</span><strong>${elo}</strong></div>
                        <div><span>JOGOS</span><strong>${games}</strong></div>
                        <div><span>VITÓRIAS</span><strong>${wins}</strong></div>
                        <div><span>TÍTULOS</span><strong>${titles}</strong></div>
                    </div>
                </div>
            </article>
        `;
    }


    /* =====================================================
       REFRESH
       ===================================================== */

    function refreshAll() {

        updateCount();

        renderLevels();

        renderHero();

        renderFeature();

        renderRanking();

        renderCards();

    }


    /* =====================================================
       API
       ===================================================== */

    window.CCFVRanking = {

        players,

        rankConfig:
            RANK_CONFIG,

        eloConfig:
            ELO_CONFIG,

        getRankByPoints,

        getProgress,

        calculateEloChange,

        applyMatchResult,

        refresh:
            refreshAll

    };


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        refreshAll();

        bindFilters();
        bindPlayerCardSearch();


        console.log(
            "%cCCFV // RANKING",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        console.log(
            "Ranking iniciado sem jogadores fictícios."
        );


        console.log(
            "Player Cards 3D + holografia ativos."
        );

    }


    if (
        document.readyState ===
        "loading"
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