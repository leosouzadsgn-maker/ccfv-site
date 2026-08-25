/* =========================================================
   CCFV // RANKING UI LIVE
   Alimenta visualmente os cards e o ranking completo
   usando os dados já recebidos pelo CCFV Live.
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       ESTADO
       ===================================================== */

    let currentPlatform =
        "all";


    let observer =
        null;


    let updateTimer =
        null;


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


    function normalizePlatform(
        value
    ) {

        return String(
            value || ""
        )
            .trim()
            .toLowerCase();

    }


    function getPlayers() {

        if (
            window.CCFVLive &&
            Array.isArray(
                window.CCFVLive.ranking
            ) &&
            window.CCFVLive.ranking.length
        ) {

            return window.CCFVLive.ranking;

        }


        if (
            window.CCFVRanking &&
            Array.isArray(
                window.CCFVRanking.players
            )
        ) {

            return window.CCFVRanking.players;

        }


        return [];

    }


    function getRankByPoints(
        elo
    ) {

        if (
            window.CCFVRanking &&
            typeof
                window.CCFVRanking.getRankByPoints ===
                "function"
        ) {

            return window.CCFVRanking.getRankByPoints(
                elo
            );

        }


        const value =
            Number(
                elo || 0
            );


        if (
            value >=
            3000
        ) {

            return {
                key:
                    "legend",

                name:
                    "LENDA"
            };

        }


        if (
            value >=
            2000
        ) {

            return {
                key:
                    "professional",

                name:
                    "PROFISSIONAL"
            };

        }


        if (
            value >=
            1000
        ) {

            return {
                key:
                    "amateur",

                name:
                    "AMADOR"
            };

        }


        return {
            key:
                "beginner",

            name:
                "INICIANTE"
        };

    }


    function getStats(
        player
    ) {

        const wins =
            Number(
                player?.wins ||
                0
            );


        const draws =
            Number(
                player?.draws ||
                0
            );


        const losses =
            Number(
                player?.losses ||
                0
            );


        const games =
            Number(
                player?.matches ??
                (
                    wins +
                    draws +
                    losses
                )
            );


        const winRate =
            games >
            0
                ? Math.round(
                    (
                        wins /
                        games
                    ) *
                    100
                )
                : 0;


        return {

            wins,

            draws,

            losses,

            games,

            winRate

        };

    }


    /* =====================================================
       CSS
       ===================================================== */

    function injectStyles() {

        if (
            document.querySelector(
                "#ccfv-ranking-ui-live-style"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "ccfv-ranking-ui-live-style";


        style.textContent = `

            /* =============================================
               PLAYER CARD — FOTO REAL
               ============================================= */

            .ccfv-player-card-preview__photo-frame {

                position:
                    relative;

                overflow:
                    hidden;

            }


            .ccfv-player-card-preview__player-photo {

                position:
                    absolute;

                inset:
                    0;

                width:
                    100% !important;

                height:
                    100% !important;

                max-width:
                    100% !important;

                max-height:
                    100% !important;

                object-fit:
                    cover;

                object-position:
                    center;

                display:
                    block;

                z-index:
                    2;

            }


            .ccfv-player-card-preview--occupied
            .ccfv-player-card-preview__photo-mark,

            .ccfv-player-card-preview--occupied
            .ccfv-player-card-preview__silhouette,

            .ccfv-player-card-preview--occupied
            .ccfv-player-card-preview__target {

                display:
                    none !important;

            }


            /* =============================================
               RANKING COMPLETO
               ============================================= */

            [data-ranking-list] {

                width:
                    100%;

            }


            .ccfv-ranking-live-full-row {

                width:
                    100%;

                min-height:
                    74px;

                display:
                    grid;

                grid-template-columns:
                    70px
                    minmax(220px, 1fr)
                    90px
                    90px
                    70px
                    70px
                    70px
                    80px
                    140px;

                align-items:
                    center;

                gap:
                    12px;

                padding:
                    0 18px;

                border-bottom:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .06
                    );

                box-sizing:
                    border-box;

            }


            .ccfv-ranking-live-full-row:hover {

                background:
                    rgba(
                        67,
                        223,
                        145,
                        .035
                    );

            }


            .ccfv-ranking-live-full-row__player {

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


            .ccfv-ranking-live-full-row__photo {

                width:
                    44px;

                min-width:
                    44px;

                height:
                    44px;

                min-height:
                    44px;

                overflow:
                    hidden;

                border-radius:
                    10px;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .04
                    );

                border:
                    1px solid
                    rgba(
                        67,
                        223,
                        145,
                        .18
                    );

                flex-shrink:
                    0;

            }


            .ccfv-ranking-live-full-row__photo img {

                width:
                    100%;

                height:
                    100%;

                max-width:
                    100%;

                max-height:
                    100%;

                object-fit:
                    cover;

                display:
                    block;

            }


            .ccfv-ranking-live-full-row__info {

                min-width:
                    0;

            }


            .ccfv-ranking-live-full-row__info strong {

                display:
                    block;

                white-space:
                    nowrap;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

            }


            .ccfv-ranking-live-full-row__info small {

                display:
                    block;

                margin-top:
                    2px;

                opacity:
                    .5;

                white-space:
                    nowrap;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

            }


            .ccfv-ranking-live-full-row__position {

                font-weight:
                    900;

            }


            .ccfv-ranking-live-full-row__elo {

                font-weight:
                    900;

            }


            .ccfv-ranking-live-full-row__win {

                color:
                    #43df91;

            }


            .ccfv-ranking-live-full-row__loss {

                color:
                    #e15d5d;

            }


            .ccfv-ranking-live-full-row__level {

                font-weight:
                    800;

            }


            .ccfv-ranking-live-empty {

                padding:
                    50px 20px;

                text-align:
                    center;

                opacity:
                    .6;

            }


            @media (
                max-width: 1000px
            ) {

                .ccfv-ranking-live-full-row {

                    grid-template-columns:
                        50px
                        minmax(
                            180px,
                            1fr
                        )
                        80px
                        80px
                        70px;

                }


                .ccfv-ranking-live-full-row__draws,

                .ccfv-ranking-live-full-row__losses,

                .ccfv-ranking-live-full-row__titles,

                .ccfv-ranking-live-full-row__level {

                    display:
                        none;

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =====================================================
       CARD — ATUALIZAR
       ===================================================== */

    function updateCard(
        card,
        player,
        rank
    ) {

        if (
            !card
        ) {

            return;

        }


        const occupied =
            Boolean(
                player
            );


        card.classList.toggle(
            "ccfv-player-card-preview--occupied",
            occupied
        );


        card.classList.toggle(
            "ccfv-player-card-preview--empty",
            !occupied
        );


        const photoFrame =
            card.querySelector(
                ".ccfv-player-card-preview__photo-frame"
            );


        const identity =
            card.querySelector(
                ".ccfv-player-card-preview__identity"
            );


        const metrics =
            card.querySelectorAll(
                ".ccfv-player-card-preview__metrics > div"
            );


        const topStrong =
            card.querySelector(
                ".ccfv-player-card-preview__top strong"
            );


        if (
            !photoFrame ||
            !identity
        ) {

            return;

        }


        /*
         * FOTO
         */

        const oldPhoto =
            photoFrame.querySelector(
                ".ccfv-player-card-preview__player-photo"
            );


        if (
            oldPhoto
        ) {

            oldPhoto.remove();

        }


        if (
            player
        ) {

            const photo =
                player.photo ||
                player.photo_url ||
                "";


            if (
                photo
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


                image.className =
                    "ccfv-player-card-preview__player-photo";


                image.src =
                    photo;


                image.alt =
                    player.name ||
                    "Jogador CCFV";


                image.loading =
                    "lazy";


                image.onerror =
                    () => {

                        image.remove();

                    };


                photoFrame.appendChild(
                    image
                );

            }

        }


        /*
         * ID
         */

        const identitySpans =
            identity.querySelectorAll(
                ":scope > span, :scope > strong, :scope > small"
            );


        const rankElement =
            identity.querySelector(
                ":scope > span"
            );


        const nameElement =
            identity.querySelector(
                ":scope > strong"
            );


        const subElement =
            identity.querySelector(
                ":scope > small"
            );


        if (
            rankElement
        ) {

            rankElement.textContent =
                rank.name;

        }


        if (
            nameElement
        ) {

            nameElement.textContent =
                player
                    ? player.name
                    : "PLAYER";

        }


        if (
            subElement
        ) {

            subElement.textContent =
                player
                    ? (
                        player.instagram
                            ? `@${String(
                                player.instagram
                            ).replace(
                                /^@/,
                                ""
                            )}`
                            : "COMPETIDOR CCFV"
                    )
                    : "NOME DO COMPETIDOR";

        }


        /*
         * POSIÇÃO NO TOPO
         */

        if (
            topStrong
        ) {

            const position =
                player
                    ? Number(
                        player.ranking_position ||
                        0
                    )
                    : 0;


            if (
                position
            ) {

                topStrong.textContent =
                    `#${String(
                        position
                    ).padStart(
                        3,
                        "0"
                    )}`;

            }

        }


        /*
         * MÉTRICAS
         */

        const stats =
            getStats(
                player
            );


        if (
            metrics.length >=
            3
        ) {

            const eloStrong =
                metrics[0]
                    .querySelector(
                        "strong"
                    );


            const posStrong =
                metrics[1]
                    .querySelector(
                        "strong"
                    );


            const winStrong =
                metrics[2]
                    .querySelector(
                        "strong"
                    );


            if (
                eloStrong
            ) {

                eloStrong.textContent =
                    player
                        ? String(
                            Number(
                                player.elo ||
                                0
                            )
                        ).padStart(
                            4,
                            "0"
                        )
                        : "0000";

            }


            if (
                posStrong
            ) {

                posStrong.textContent =
                    player
                        ? `#${String(
                            Number(
                                player.ranking_position ||
                                0
                            )
                        ).padStart(
                            3,
                            "0"
                        )}`
                        : "#000";

            }


            if (
                winStrong
            ) {

                winStrong.textContent =
                    player
                        ? `${String(
                            stats.winRate
                        ).padStart(
                            2,
                            "0"
                        )}%`
                        : "00%";

            }

        }


        /*
         * Ocultar placeholder somente
         * quando existe foto.
         */

        const mark =
            photoFrame.querySelector(
                ".ccfv-player-card-preview__photo-mark"
            );


        const silhouette =
            photoFrame.querySelector(
                ".ccfv-player-card-preview__silhouette"
            );


        const target =
            photoFrame.querySelector(
                ".ccfv-player-card-preview__target"
            );


        const hasPhoto =
            Boolean(
                player &&
                (
                    player.photo ||
                    player.photo_url
                )
            );


        [
            mark,
            silhouette,
            target
        ]
            .forEach(
                element => {

                    if (
                        element
                    ) {

                        element.style.display =
                            hasPhoto
                                ? "none"
                                : "";

                    }

                }
            );

    }


    /* =====================================================
       CARDS — SINCRONIZAR
       ===================================================== */

    function syncPlayerCards() {

        const grid =
            document.querySelector(
                "#player-card-grid"
            );


        if (
            !grid
        ) {

            return;

        }


        const cards =
            Array.from(
                grid.querySelectorAll(
                    ".ccfv-player-card-preview"
                )
            );


        if (
            cards.length <
            4
        ) {

            return;

        }


        const players =
            getPlayers()
                .slice()
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            b.elo ||
                            0
                        ) -
                        Number(
                            a.elo ||
                            0
                        )
                );


        const ranks = [

            "beginner",

            "amateur",

            "professional",

            "legend"

        ];


        ranks.forEach(
            (
                rankKey,
                index
            ) => {

                const card =
                    cards[index];


                if (
                    !card
                ) {

                    return;

                }


                const player =
                    players.find(
                        item =>
                            getRankByPoints(
                                item.elo
                            ).key ===
                            rankKey
                    );


                const rank =
                    getRankByPoints(
                        player?.elo ||
                        (
                            rankKey ===
                            "beginner"
                                ? 0
                                : rankKey ===
                                    "amateur"
                                    ? 1000
                                    : rankKey ===
                                        "professional"
                                        ? 2000
                                        : 3000
                        )
                    );


                updateCard(
                    card,
                    player ||
                        null,
                    rank
                );

            }
        );

    }


    /* =====================================================
       RANKING COMPLETO
       ===================================================== */

    function renderCompleteRanking() {

        const list =
            document.querySelector(
                "[data-ranking-list]"
            );


        if (
            !list
        ) {

            return;

        }


        const players =
            getPlayers()
                .filter(
                    player => {

                        if (
                            currentPlatform ===
                            "all"
                        ) {

                            return true;

                        }


                        return (
                            normalizePlatform(
                                player.platform
                            ) ===
                            normalizePlatform(
                                currentPlatform
                            )
                        );

                    }
                )
                .slice()
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            b.elo ||
                            0
                        ) -
                        Number(
                            a.elo ||
                            0
                        )
                );


        const empty =
            document.querySelector(
                "[data-ranking-empty]"
            );


        if (
            !players.length
        ) {

            list.innerHTML = `

                <div
                    class="
                        ccfv-ranking-live-empty
                    "
                >
                    NENHUM JOGADOR ENCONTRADO.
                </div>

            `;


            if (
                empty
            ) {

                empty.hidden =
                    false;

            }


            return;

        }


        if (
            empty
        ) {

            empty.hidden =
                true;

        }


        list.innerHTML =
            players
                .map(
                    (
                        player,
                        index
                    ) => {

                        const rank =
                            getRankByPoints(
                                player.elo
                            );


                        const stats =
                            getStats(
                                player
                            );


                        const photo =
                            player.photo ||
                            player.photo_url ||
                            "";


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
                                : "?";


                        return `

                            <div
                                class="
                                    ccfv-ranking-live-full-row
                                "
                            >

                                <span
                                    class="
                                        ccfv-ranking-live-full-row__position
                                    "
                                >
                                    ${String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        "0"
                                    )}
                                </span>


                                <div
                                    class="
                                        ccfv-ranking-live-full-row__player
                                    "
                                >

                                    <div
                                        class="
                                            ccfv-ranking-live-full-row__photo
                                        "
                                    >
                                        ${photoHTML}
                                    </div>


                                    <div
                                        class="
                                            ccfv-ranking-live-full-row__info
                                        "
                                    >

                                        <strong>
                                            ${escapeHTML(
                                                player.name ||
                                                "COMPETIDOR"
                                            )}
                                        </strong>


                                        <small>
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
                                                    : "SEM INSTAGRAM"
                                            }
                                        </small>

                                    </div>

                                </div>


                                <span
                                    class="
                                        ccfv-ranking-live-full-row__elo
                                    "
                                >
                                    ${Number(
                                        player.elo ||
                                        0
                                    )}
                                </span>


                                <span>
                                    ${stats.games}
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-live-full-row__win
                                    "
                                >
                                    ${stats.wins}
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-live-full-row__draws
                                    "
                                >
                                    ${stats.draws}
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-live-full-row__losses
                                    "
                                >
                                    ${stats.losses}
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-live-full-row__titles
                                    "
                                >
                                    ${Number(
                                        player.titles ||
                                        0
                                    )}
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-live-full-row__level
                                    "
                                >
                                    ${escapeHTML(
                                        rank.name
                                    )}
                                </span>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       FILTROS DO RANKING COMPLETO
       ===================================================== */

    function bindCompleteFilters() {

        const buttons =
            document.querySelectorAll(
                "[data-ranking-list] ~ * [data-platform], [data-ranking-list] + * [data-platform]"
            );


        buttons.forEach(
            button => {

                if (
                    button.dataset.ccfvRankingBound ===
                    "true"
                ) {

                    return;

                }


                button.dataset.ccfvRankingBound =
                    "true";


                button.addEventListener(
                    "click",
                    () => {

                        currentPlatform =
                            button.dataset.platform ||
                            "all";


                        document
                            .querySelectorAll(
                                "[data-platform]"
                            )
                            .forEach(
                                item => {

                                    if (
                                        item.dataset.platform ===
                                        currentPlatform
                                    ) {

                                        item.classList.add(
                                            "is-active"
                                        );

                                    }
                                    else {

                                        item.classList.remove(
                                            "is-active"
                                        );

                                    }

                                }
                            );


                        renderCompleteRanking();

                    }
                );

            }
        );

    }


    /* =====================================================
       TENTAR FILTROS GERAIS
       ===================================================== */

    function bindGlobalPlatformFilters() {

        document
            .querySelectorAll(
                "[data-platform]"
            )
            .forEach(
                button => {

                    if (
                        button.dataset.ccfvUiBound ===
                        "true"
                    ) {

                        return;

                    }


                    button.dataset.ccfvUiBound =
                        "true";


                    button.addEventListener(
                        "click",
                        () => {

                            currentPlatform =
                                button.dataset.platform ||
                                "all";


                            window.setTimeout(
                                () => {

                                    syncPlayerCards();

                                    renderCompleteRanking();

                                },
                                20
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       UPDATE
       ===================================================== */

    function updateAll() {

        injectStyles();

        syncPlayerCards();

        renderCompleteRanking();

        bindGlobalPlatformFilters();

        bindCompleteFilters();

    }


    /* =====================================================
       OBSERVER
       ===================================================== */

    function watchCards() {

        const grid =
            document.querySelector(
                "#player-card-grid"
            );


        if (
            !grid ||
            observer
        ) {

            return;

        }


        observer =
            new MutationObserver(
                () => {

                    clearTimeout(
                        updateTimer
                    );


                    updateTimer =
                        setTimeout(
                            updateAll,
                            80
                        );

                }
            );


        observer.observe(
            grid,
            {
                childList:
                    true,

                subtree:
                    true

            }
        );

    }


    /* =====================================================
       LIVE EVENT
       ===================================================== */

    function bindLiveEvent() {

        window.addEventListener(
            "ccfv:live-update",
            () => {

                updateAll();

            }
        );

    }


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        injectStyles();

        updateAll();

        watchCards();

        bindLiveEvent();


        /*
         * O ranking.js pode renderizar
         * os cards depois do nosso init.
         * Fazemos algumas tentativas curtas.
         */

        let attempts =
            0;


        const retry =
            setInterval(
                () => {

                    updateAll();

                    attempts++;


                    if (
                        attempts >=
                        20
                    ) {

                        clearInterval(
                            retry
                        );

                    }

                },
                250
            );

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