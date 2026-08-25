/* =========================================================
   CCFV // RANKING PÚBLICO OFICIAL
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
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
       ESTADO
       ===================================================== */

    let players = [];

    let supabaseClient = null;


    /* =====================================================
       DOM
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

        filters:
            document.querySelectorAll(
                "[data-platform]"
            )

    };


    /* =====================================================
       HELPERS
       ===================================================== */

    function escapeHTML(value) {

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


    function getInitials(name) {

        const words =
            String(
                name || ""
            )
                .trim()
                .split(
                    /\s+/
                )
                .filter(
                    Boolean
                );

        if (!words.length) {
            return "--";
        }

        if (words.length === 1) {

            return words[0]
                .slice(
                    0,
                    2
                )
                .toUpperCase();

        }

        return (
            words[0][0] +
            words[1][0]
        ).toUpperCase();

    }


    function getRankByPoints(elo) {

        const value =
            Math.max(
                0,
                Number(
                    elo || 0
                )
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


    function formatNumber(value) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR"
        );

    }


    function getGames(player) {

        return Number(
            player.matches ??
            (
                Number(
                    player.wins || 0
                ) +
                Number(
                    player.draws || 0
                ) +
                Number(
                    player.losses || 0
                )
            )
        );

    }


    function getWinRate(player) {

        const games =
            getGames(
                player
            );

        if (!games) {
            return 0;
        }

        return Math.round(
            (
                Number(
                    player.wins || 0
                ) /
                games
            ) *
            100
        );

    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    async function loadSupabase() {

        if (
            supabaseClient
        ) {
            return supabaseClient;
        }


        if (
            window.CCFVAuth &&
            typeof
                window.CCFVAuth
                    .getClient ===
                "function"
        ) {

            supabaseClient =
                await
                window.CCFVAuth
                    .getClient();

            return supabaseClient;

        }


        throw new Error(
            "CCFVAuth não disponível."
        );

    }


    async function loadOfficialRanking() {

        const client =
            await loadSupabase();


        const result =
            await client
                .from(
                    "ccfv_ranking"
                )
                .select(
                    "*"
                )
                .order(
                    "ranking_position",
                    {
                        ascending: true
                    }
                );


        if (
            result.error
        ) {

            throw result.error;

        }


        players =
            (
                result.data ||
                []
            )
                .map(
                    player => ({

                        ...player,

                        ranking_position:
                            Number(
                                player.ranking_position ||
                                0
                            ),

                        elo:
                            Number(
                                player.elo ||
                                0
                            ),

                        wins:
                            Number(
                                player.wins ||
                                0
                            ),

                        draws:
                            Number(
                                player.draws ||
                                0
                            ),

                        losses:
                            Number(
                                player.losses ||
                                0
                            ),

                        titles:
                            Number(
                                player.titles ||
                                0
                            ),

                        photo:
                            player.photo ||
                            player.photo_url ||
                            "",

                        platform:
                            player.platform ||
                            "PC"

                    })
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            a.ranking_position ||
                            999999
                        ) -
                        Number(
                            b.ranking_position ||
                            999999
                        )
                );

    }


    /* =====================================================
       INSÍGNIA
       ===================================================== */

    function renderBadge(
        rank,
        size = "medium"
    ) {

        const sizeClass =
            `ccfv-badge--${size}`;

        return `

            <div
                class="
                    ccfv-badge
                    ${sizeClass}
                    ccfv-badge--${rank.key}
                "
                style="
                    --badge-color:${rank.color};
                "
            >

                <div
                    class="ccfv-badge__shape"
                >

                    <span>
                        ${escapeHTML(
                            rank.name
                        )}
                    </span>

                </div>

            </div>

        `;

    }


    /* =====================================================
       NÍVEIS
       ===================================================== */

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
                            rank.key ===
                            "legend"

                                ? "3000+ ELO"

                                : `${rank.min} — ${rank.max} ELO`;


                        return `

                            <article
                                class="
                                    ccfv-ranking-level
                                    ccfv-ranking-level--${rank.key}
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
                                        ccfv-ranking-level__description
                                    "
                                >
                                    ${escapeHTML(
                                        rank.description
                                    )}
                                </div>

                            </article>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       HEADER DO RANKING
       ===================================================== */

    function renderRankingHeader() {

        return `

            <div
                class="
                    ccfv-ranking-header
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
                    NÍVEL
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


        const filtered =
            players
                .filter(
                    player => {

                        if (
                            platform ===
                            "all"
                        ) {
                            return true;
                        }

                        return String(
                            player.platform ||
                            ""
                        )
                            .toLowerCase() ===
                            String(
                                platform
                            )
                                .toLowerCase();

                    }
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            a.ranking_position ||
                            999999
                        ) -
                        Number(
                            b.ranking_position ||
                            999999
                        )
                );


        if (
            !filtered.length
        ) {

            elements.ranking.innerHTML =

                renderRankingHeader() +

                `

                    <div
                        class="
                            ccfv-ranking-empty
                        "
                    >

                        <strong>
                            NENHUM COMPETIDOR
                        </strong>

                        <span>
                            O Ranking será alimentado
                            automaticamente conforme os
                            jogadores entrarem na CCFV.
                        </span>

                    </div>

                `;

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


                        const position =
                            Number(
                                player.ranking_position ||
                                (
                                    index +
                                    1
                                )
                            );


                        const photo =
                            player.photo
                                ? `

                                    <img
                                        src="${escapeHTML(
                                            player.photo
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
                                            getInitials(
                                                player.name
                                            )
                                        )}
                                    </span>

                                `;


                        return `

                            <article
                                class="
                                    ccfv-ranking-row
                                    ccfv-ranking-row--${rank.key}
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
                                        ${photo}
                                    </div>


                                    <div
                                        class="
                                            ccfv-ranking-row__player-info
                                        "
                                    >

                                        <strong>
                                            ${escapeHTML(
                                                player.name ||
                                                "COMPETIDOR"
                                            )}
                                        </strong>

                                        <span>
                                            ${
                                                player.instagram
                                                    ? `@${escapeHTML(
                                                        String(
                                                            player.instagram
                                                        ).replace(
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
                                        player.platform
                                    )}
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-row__points
                                    "
                                >
                                    ${formatNumber(
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
       LÍDER
       ===================================================== */

    function renderFeature() {

        if (
            !elements.feature
        ) {
            return;
        }


        const leader =
            players[0];


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

                        ${renderBadge(
                            RANK_CONFIG.legend,
                            "large"
                        )}

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
                            a liderança ocupará automaticamente
                            esta posição.
                        </p>

                    </div>

                </div>

            `;

            return;

        }


        const rank =
            getRankByPoints(
                leader.elo
            );


        const photo =
            leader.photo
                ? `

                    <img
                        src="${escapeHTML(
                            leader.photo
                        )}"
                        alt="${escapeHTML(
                            leader.name
                        )}"
                    >

                `
                : `

                    <span>
                        ${escapeHTML(
                            getInitials(
                                leader.name
                            )
                        )}
                    </span>

                `;


        elements.feature.innerHTML = `

            <div
                class="
                    ccfv-ranking-leader
                    ccfv-ranking-leader--${rank.key}
                "
            >

                <div
                    class="
                        ccfv-ranking-leader__visual
                    "
                >

                    <div
                        class="
                            ccfv-ranking-leader__photo
                        "
                    >
                        ${photo}
                    </div>


                    <div
                        class="
                            ccfv-ranking-leader__badge
                        "
                    >
                        ${renderBadge(
                            rank,
                            "large"
                        )}
                    </div>


                    <span
                        class="
                            ccfv-ranking-leader__position
                        "
                    >
                        #01
                    </span>

                </div>


                <div
                    class="
                        ccfv-ranking-leader__content
                    "
                >

                    <span>
                        CCFV // CURRENT LEADER
                    </span>


                    <strong>
                        ${escapeHTML(
                            leader.name
                        )}
                    </strong>


                    <small>
                        ${
                            leader.instagram
                                ? `@${escapeHTML(
                                    String(
                                        leader.instagram
                                    ).replace(
                                        /^@/,
                                        ""
                                    )
                                )}`
                                : "SEM INSTAGRAM"
                        }
                    </small>


                    <div
                        class="
                            ccfv-ranking-leader__rank
                        "
                    >
                        ${escapeHTML(
                            rank.name
                        )}
                    </div>


                    <div
                        class="
                            ccfv-ranking-leader__stats
                        "
                    >

                        <div>

                            <span>
                                ELO
                            </span>

                            <strong>
                                ${formatNumber(
                                    leader.elo
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                JOGOS
                            </span>

                            <strong>
                                ${getGames(
                                    leader
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                WIN RATE
                            </span>

                            <strong>
                                ${getWinRate(
                                    leader
                                )}%
                            </strong>

                        </div>

                    </div>

                </div>

            </div>

        `;

    }


    /* =====================================================
       CARDS DE NÍVEL
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
                        ccfv-player-card-preview__header
                    "
                >

                    <span>
                        CCFV
                    </span>

                    <strong>
                        OFFICIAL
                    </strong>

                </div>


                <div
                    class="
                        ccfv-player-card-preview__badge
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
                            ${formatNumber(
                                rank.min
                            )}
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

            </article>

        `;

    }


    function renderCards() {

        if (
            !elements.cards
        ) {
            return;
        }


        const cards = [

            {
                rank:
                    RANK_CONFIG.beginner,
                number:
                    "001"
            },

            {
                rank:
                    RANK_CONFIG.amateur,
                number:
                    "002"
            },

            {
                rank:
                    RANK_CONFIG.professional,
                number:
                    "003"
            },

            {
                rank:
                    RANK_CONFIG.legend,
                number:
                    "004"
            }

        ];


        elements.cards.innerHTML =
            cards
                .map(
                    card =>
                        createPreviewCard(
                            card.rank,
                            card.number
                        )
                )
                .join("");

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
                            button.dataset.platform ||
                            "all"
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       CONTADORES
       ===================================================== */

    function updateCount() {

        const count =
            players.length;


        if (
            elements.playerCount
        ) {

            elements.playerCount.textContent =
                String(
                    count
                ).padStart(
                    2,
                    "0"
                );

        }


        const leader =
            players[0];


        const eloElement =
            document.querySelector(
                "[data-ranking-top-elo]"
            );


        const leaderElement =
            document.querySelector(
                "[data-ranking-leader]"
            );


        const titlesElement =
            document.querySelector(
                "[data-ranking-titles]"
            );


        if (
            eloElement
        ) {

            eloElement.textContent =
                leader
                    ? formatNumber(
                        leader.elo
                    )
                    : "0";

        }


        if (
            leaderElement
        ) {

            leaderElement.textContent =
                leader
                    ? (
                        leader.name ||
                        "—"
                    )
                    : "—";

        }


        if (
            titlesElement
        ) {

            titlesElement.textContent =
                formatNumber(
                    players.reduce(
                        (
                            total,
                            player
                        ) =>
                            total +
                            Number(
                                player.titles ||
                                0
                            ),
                        0
                    )
                );

        }

    }


    /* =====================================================
       REFRESH
       ===================================================== */

    function refreshAll(
        platform = "all"
    ) {

        updateCount();

        renderLevels();

        renderFeature();

        renderRanking(
            platform
        );

        renderCards();

    }


    /* =====================================================
       API PÚBLICA
       ===================================================== */

    window.CCFVRanking = {

        players,

        rankConfig:
            RANK_CONFIG,

        refresh:
            refreshAll,

        getRankByPoints

    };


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        refreshAll();


        bindFilters();


        try {

            await loadOfficialRanking();

            refreshAll();

            console.log(
                "CCFV // Ranking oficial carregado."
            );

        } catch (
            error
        ) {

            console.error(
                "CCFV // Erro no Ranking:",
                error
            );

            players = [];

            refreshAll();

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }


})();