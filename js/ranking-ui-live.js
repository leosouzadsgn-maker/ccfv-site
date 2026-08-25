/* =========================================================
   CCFV // RANKING UI LIVE
   CAMADA VISUAL DO RANKING
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       ESTADO
       ===================================================== */

    let currentPlatform =
        "all";

    let currentSearch =
        "";

    let updateTimer =
        null;

    let observer =
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


    function normalize(
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


    function getRank(
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


        const titles =
            Number(
                player?.titles ||
                0
            );


        const winRate =
            games > 0
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

            titles,

            winRate

        };

    }


    /* =====================================================
       ESTILO VISUAL
       ===================================================== */

    function injectStyles() {

        if (
            document.querySelector(
                "#ccfv-ranking-ui-final-style"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "ccfv-ranking-ui-final-style";


        style.textContent = `

            /* =================================================
               TOPO DO RANKING
               ================================================= */

            #ranking-feature-player {

                width:
                    100% !important;

                min-height:
                    360px !important;

                display:
                    block !important;

                overflow:
                    hidden !important;

                box-sizing:
                    border-box !important;

            }


            .ccfv-live-feature {

                width:
                    100%;

                min-height:
                    360px;

                display:
                    grid;

                grid-template-columns:
                    320px
                    minmax(
                        0,
                        1fr
                    );

                gap:
                    36px;

                align-items:
                    center;

                padding:
                    28px;

                box-sizing:
                    border-box;

            }


            .ccfv-live-feature__photo-wrap {

                width:
                    280px;

                height:
                    300px;

                overflow:
                    hidden;

                border-radius:
                    18px;

                border:
                    1px solid
                    rgba(
                        67,
                        223,
                        145,
                        .22
                    );

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .025
                    );

                box-shadow:
                    0 30px 80px
                    rgba(
                        0,
                        0,
                        0,
                        .35
                    );

            }


            .ccfv-live-feature__photo {

                width:
                    100% !important;

                height:
                    100% !important;

                max-width:
                    100% !important;

                max-height:
                    100% !important;

                display:
                    block;

                object-fit:
                    cover;

                object-position:
                    center;

            }


            .ccfv-live-feature__photo-placeholder {

                width:
                    100%;

                height:
                    100%;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                font-size:
                    56px;

                font-weight:
                    950;

                color:
                    #43df91;

                background:
                    radial-gradient(
                        circle,
                        rgba(
                            67,
                            223,
                            145,
                            .12
                        ),
                        transparent
                    );

            }


            .ccfv-live-feature__content {

                min-width:
                    0;

            }


            .ccfv-live-feature__eyebrow {

                display:
                    block;

                margin-bottom:
                    10px;

                font-size:
                    11px;

                font-weight:
                    900;

                letter-spacing:
                    .14em;

                color:
                    #43df91;

            }


            .ccfv-live-feature__position {

                display:
                    inline-flex;

                align-items:
                    center;

                height:
                    28px;

                padding:
                    0 10px;

                border-radius:
                    999px;

                border:
                    1px solid
                    rgba(
                        67,
                        223,
                        145,
                        .25
                    );

                color:
                    #43df91;

                font-size:
                    11px;

                font-weight:
                    900;

                margin-bottom:
                    14px;

            }


            .ccfv-live-feature__name {

                margin:
                    0;

                font-size:
                    clamp(
                        34px,
                        4vw,
                        64px
                    );

                line-height:
                    .92;

                font-weight:
                    950;

                letter-spacing:
                    -.045em;

                color:
                    #fff;

            }


            .ccfv-live-feature__instagram {

                margin-top:
                    8px;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .45
                    );

                font-weight:
                    700;

            }


            .ccfv-live-feature__rank {

                margin-top:
                    18px;

                color:
                    #43df91;

                font-size:
                    14px;

                font-weight:
                    900;

                letter-spacing:
                    .08em;

            }


            .ccfv-live-feature__stats {

                margin-top:
                    24px;

                display:
                    grid;

                grid-template-columns:
                    repeat(
                        6,
                        minmax(
                            70px,
                            1fr
                        )
                    );

                gap:
                    8px;

            }


            .ccfv-live-feature__stat {

                min-width:
                    0;

                padding:
                    13px;

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
                        .025
                    );

            }


            .ccfv-live-feature__stat span {

                display:
                    block;

                font-size:
                    9px;

                font-weight:
                    900;

                letter-spacing:
                    .08em;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .32
                    );

            }


            .ccfv-live-feature__stat strong {

                display:
                    block;

                margin-top:
                    5px;

                font-size:
                    18px;

                font-weight:
                    950;

                color:
                    #fff;

            }


            /* =================================================
               PLAYER CARDS
               ================================================= */

            #player-card-grid
            .ccfv-player-card-preview__photo-frame {

                position:
                    relative !important;

                overflow:
                    hidden !important;

            }


            #player-card-grid
            .ccfv-player-card-preview__player-photo {

                position:
                    absolute !important;

                inset:
                    0 !important;

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

                z-index:
                    2 !important;

            }


            #player-card-grid
            .ccfv-player-card-preview--occupied
            .ccfv-player-card-preview__photo-mark,

            #player-card-grid
            .ccfv-player-card-preview--occupied
            .ccfv-player-card-preview__silhouette,

            #player-card-grid
            .ccfv-player-card-preview--occupied
            .ccfv-player-card-preview__target {

                display:
                    none !important;

            }


            /* =================================================
               RANKING COMPLETO
               ================================================= */

            .ccfv-live-complete-ranking {

                width:
                    100%;

                overflow:
                    hidden;

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .07
                    );

                border-radius:
                    16px;

                background:
                    rgba(
                        0,
                        0,
                        0,
                        .22
                    );

            }


            .ccfv-live-complete-head {

                display:
                    grid;

                grid-template-columns:
                    70px
                    minmax(
                        260px,
                        1fr
                    )
                    100px
                    90px
                    70px
                    70px
                    70px
                    80px
                    140px;

                gap:
                    12px;

                align-items:
                    center;

                padding:
                    15px 18px;

                border-bottom:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .08
                    );

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .35
                    );

                font-size:
                    10px;

                font-weight:
                    900;

                letter-spacing:
                    .08em;

            }


            .ccfv-live-complete-row {

                display:
                    grid;

                grid-template-columns:
                    70px
                    minmax(
                        260px,
                        1fr
                    )
                    100px
                    90px
                    70px
                    70px
                    70px
                    80px
                    140px;

                gap:
                    12px;

                align-items:
                    center;

                min-height:
                    76px;

                padding:
                    0 18px;

                border-bottom:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .055
                    );

                box-sizing:
                    border-box;

            }


            .ccfv-live-complete-row:last-child {

                border-bottom:
                    0;

            }


            .ccfv-live-complete-row:hover {

                background:
                    rgba(
                        67,
                        223,
                        145,
                        .035
                    );

            }


            .ccfv-live-complete-player {

                min-width:
                    0;

                display:
                    flex;

                align-items:
                    center;

                gap:
                    12px;

            }


            .ccfv-live-complete-photo {

                width:
                    48px;

                min-width:
                    48px;

                height:
                    48px;

                overflow:
                    hidden;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    10px;

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

            }


            .ccfv-live-complete-photo img {

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


            .ccfv-live-complete-info {

                min-width:
                    0;

                overflow:
                    hidden;

            }


            .ccfv-live-complete-info strong {

                display:
                    block;

                overflow:
                    hidden;

                white-space:
                    nowrap;

                text-overflow:
                    ellipsis;

                color:
                    #fff;

            }


            .ccfv-live-complete-info small {

                display:
                    block;

                margin-top:
                    3px;

                overflow:
                    hidden;

                white-space:
                    nowrap;

                text-overflow:
                    ellipsis;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .35
                    );

            }


            .ccfv-live-complete-elo {

                color:
                    #43df91;

                font-weight:
                    950;

            }


            .ccfv-live-complete-win {

                color:
                    #43df91;

                font-weight:
                    900;

            }


            .ccfv-live-complete-loss {

                color:
                    #e15d5d;

                font-weight:
                    900;

            }


            .ccfv-live-complete-rank {

                font-weight:
                    900;

            }


            .ccfv-live-complete-empty {

                padding:
                    60px 20px;

                text-align:
                    center;

                color:
                    rgba(
                        255,
                        255,
                        255,
                        .45
                    );

            }


            @media (
                max-width: 900px
            ) {

                .ccfv-live-feature {

                    grid-template-columns:
                        1fr;

                }


                .ccfv-live-feature__photo-wrap {

                    width:
                        min(
                            240px,
                            100%
                        );

                    height:
                        260px;

                    margin:
                        0 auto;

                }


                .ccfv-live-feature__stats {

                    grid-template-columns:
                        repeat(
                            3,
                            1fr
                        );

                }


                .ccfv-live-complete-head,
                .ccfv-live-complete-row {

                    grid-template-columns:
                        50px
                        minmax(
                            180px,
                            1fr
                        )
                        80px
                        70px
                        80px;

                }


                .ccfv-live-complete-head span:nth-child(5),
                .ccfv-live-complete-head span:nth-child(6),
                .ccfv-live-complete-head span:nth-child(7),
                .ccfv-live-complete-head span:nth-child(8),

                .ccfv-live-complete-row > span:nth-child(5),
                .ccfv-live-complete-row > span:nth-child(6),
                .ccfv-live-complete-row > span:nth-child(7),
                .ccfv-live-complete-row > span:nth-child(8) {

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
       TOPO REAL
       ===================================================== */

    function renderFeature() {

        const container =
            document.querySelector(
                "#ranking-feature-player"
            );


        if (
            !container
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


        const leader =
            players[0] ||
            null;


        if (
            !leader
        ) {

            container.innerHTML = `

                <div
                    class="
                        ccfv-live-feature
                    "
                >

                    <div
                        class="
                            ccfv-live-feature__photo-wrap
                        "
                    >

                        <div
                            class="
                                ccfv-live-feature__photo-placeholder
                            "
                        >
                            CCFV
                        </div>

                    </div>


                    <div
                        class="
                            ccfv-live-feature__content
                        "
                    >

                        <span
                            class="
                                ccfv-live-feature__eyebrow
                            "
                        >
                            CCFV // OFFICIAL LEADER
                        </span>


                        <span
                            class="
                                ccfv-live-feature__position
                            "
                        >
                            #01 · AGUARDANDO
                        </span>


                        <h2
                            class="
                                ccfv-live-feature__name
                            "
                        >
                            NENHUM LÍDER
                        </h2>


                        <div
                            class="
                                ccfv-live-feature__rank
                            "
                        >
                            O RANKING AINDA ESTÁ VAZIO.
                        </div>

                    </div>

                </div>

            `;

            return;

        }


        const rank =
            getRank(
                leader.elo
            );


        const stats =
            getStats(
                leader
            );


        const photo =
            leader.photo_url ||
            leader.photo ||
            "";


        const instagram =
            leader.instagram
                ? `@${String(
                    leader.instagram
                ).replace(
                    /^@/,
                    ""
                )}`
                : "SEM INSTAGRAM";


        const initials =
            String(
                leader.name ||
                "CCFV"
            )
                .trim()
                .slice(
                    0,
                    2
                )
                .toUpperCase();


        const photoHTML =
            photo
                ? `
                    <img
                        class="
                            ccfv-live-feature__photo
                        "
                        src="${escapeHTML(
                            photo
                        )}"
                        alt="${escapeHTML(
                            leader.name
                        )}"
                    >
                `
                : `
                    <div
                        class="
                            ccfv-live-feature__photo-placeholder
                        "
                    >
                        ${escapeHTML(
                            initials
                        )}
                    </div>
                `;


        container.innerHTML = `

            <div
                class="
                    ccfv-live-feature
                "
            >

                <div
                    class="
                        ccfv-live-feature__photo-wrap
                    "
                >

                    ${photoHTML}

                </div>


                <div
                    class="
                        ccfv-live-feature__content
                    "
                >

                    <span
                        class="
                            ccfv-live-feature__eyebrow
                        "
                    >
                        CCFV // OFFICIAL LEADER
                    </span>


                    <span
                        class="
                            ccfv-live-feature__position
                        "
                    >
                        #01 · ${escapeHTML(
                            rank.name
                        )}
                    </span>


                    <h2
                        class="
                            ccfv-live-feature__name
                        "
                    >
                        ${escapeHTML(
                            leader.name
                        )}
                    </h2>


                    <div
                        class="
                            ccfv-live-feature__instagram
                        "
                    >
                        ${escapeHTML(
                            instagram
                        )}
                    </div>


                    <div
                        class="
                            ccfv-live-feature__rank
                        "
                    >
                        ${escapeHTML(
                            leader.platform ||
                            "PLATAFORMA"
                        )}
                        ·
                        ${escapeHTML(
                            rank.name
                        )}
                    </div>


                    <div
                        class="
                            ccfv-live-feature__stats
                        "
                    >

                        <div
                            class="
                                ccfv-live-feature__stat
                            "
                        >

                            <span>
                                ELO
                            </span>

                            <strong>
                                ${Number(
                                    leader.elo ||
                                    0
                                )}
                            </strong>

                        </div>


                        <div
                            class="
                                ccfv-live-feature__stat
                            "
                        >

                            <span>
                                JOGOS
                            </span>

                            <strong>
                                ${stats.games}
                            </strong>

                        </div>


                        <div
                            class="
                                ccfv-live-feature__stat
                            "
                        >

                            <span>
                                V
                            </span>

                            <strong>
                                ${stats.wins}
                            </strong>

                        </div>


                        <div
                            class="
                                ccfv-live-feature__stat
                            "
                        >

                            <span>
                                E
                            </span>

                            <strong>
                                ${stats.draws}
                            </strong>

                        </div>


                        <div
                            class="
                                ccfv-live-feature__stat
                            "
                        >

                            <span>
                                D
                            </span>

                            <strong>
                                ${stats.losses}
                            </strong>

                        </div>


                        <div
                            class="
                                ccfv-live-feature__stat
                            "
                        >

                            <span>
                                WIN
                            </span>

                            <strong>
                                ${String(
                                    stats.winRate
                                ).padStart(
                                    2,
                                    "0"
                                )}%
                            </strong>

                        </div>

                    </div>

                </div>

            </div>

        `;

    }


    /* =====================================================
       PLAYER CARDS
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


        const rankKeys = [

            "beginner",

            "amateur",

            "professional",

            "legend"

        ];


        rankKeys.forEach(
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
                            getRank(
                                item.elo
                            ).key ===
                            rankKey
                    );


                const photoFrame =
                    card.querySelector(
                        ".ccfv-player-card-preview__photo-frame"
                    );


                const identity =
                    card.querySelector(
                        ".ccfv-player-card-preview__identity"
                    );


                if (
                    !photoFrame ||
                    !identity
                ) {

                    return;

                }


                /*
                 * FOTO EXISTENTE
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


                /*
                 * FOTO REAL
                 */

                const photo =
                    player?.photo_url ||
                    player?.photo ||
                    "";


                if (
                    photo
                ) {

                    const img =
                        document.createElement(
                            "img"
                        );


                    img.className =
                        "ccfv-player-card-preview__player-photo";


                    img.src =
                        photo;


                    img.alt =
                        player?.name ||
                        "Jogador";


                    img.loading =
                        "lazy";


                    photoFrame.appendChild(
                        img
                    );

                }


                /*
                 * IDENTIDADE
                 */

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


                const rank =
                    getRank(
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
                 * METRICAS
                 */

                const metricBoxes =
                    card.querySelectorAll(
                        ".ccfv-player-card-preview__metrics > div"
                    );


                if (
                    metricBoxes.length >=
                    3
                ) {

                    const stats =
                        getStats(
                            player
                        );


                    const eloElement =
                        metricBoxes[0]
                            .querySelector(
                                "strong"
                            );


                    const posElement =
                        metricBoxes[1]
                            .querySelector(
                                "strong"
                            );


                    const winElement =
                        metricBoxes[2]
                            .querySelector(
                                "strong"
                            );


                    if (
                        eloElement
                    ) {

                        eloElement.textContent =
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
                        posElement
                    ) {

                        posElement.textContent =
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
                        winElement
                    ) {

                        winElement.textContent =
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
                 * CLASSE OCUPADO
                 */

                card.classList.toggle(
                    "ccfv-player-card-preview--occupied",
                    Boolean(
                        player
                    )
                );


                card.classList.toggle(
                    "ccfv-player-card-preview--empty",
                    !player
                );


                [
                    ".ccfv-player-card-preview__photo-mark",

                    ".ccfv-player-card-preview__silhouette",

                    ".ccfv-player-card-preview__target"

                ]
                    .forEach(
                        selector => {

                            card.querySelectorAll(
                                selector
                            )
                                .forEach(
                                    element => {

                                        element.style.display =
                                            player &&
                                            photo
                                                ? "none"
                                                : "";

                                    }
                                );

                        }
                    );

            }
        );

    }


    /* =====================================================
       ENCONTRAR BLOCO DO RANKING COMPLETO
       ===================================================== */

    function getCompleteContainer() {

        const direct =
            document.querySelector(
                "[data-ranking-list]"
            );


        if (
            direct
        ) {

            return {

                list:
                    direct,

                empty:
                    document.querySelector(
                        "[data-ranking-empty]"
                    )

            };

        }


        /*
         * Estrutura antiga do site:
         * encontra o bloco visual que
         * contém "NENHUM COMPETIDOR".
         */

        const candidates =
            Array.from(
                document.querySelectorAll(
                    "div, section, article"
                )
            )
                .filter(
                    element =>
                        (
                            element.textContent ||
                            ""
                        )
                            .toUpperCase()
                            .includes(
                                "NENHUM COMPETIDOR CADASTRADO"
                            )
                )
                .filter(
                    element =>
                        element.children.length >
                        0
                );


        if (
            !candidates.length
        ) {

            return null;

        }


        /*
         * Usa o candidato menor que
         * realmente representa o estado vazio.
         */

        const empty =
            candidates.sort(
                (
                    a,
                    b
                ) =>
                    a.textContent.length -
                    b.textContent.length
            )[0];


        const parent =
            empty.parentElement;


        if (
            !parent
        ) {

            return null;

        }


        let list =
            parent.querySelector(
                ".ccfv-live-complete-generated"
            );


        if (
            !list
        ) {

            list =
                document.createElement(
                    "div"
                );


            list.className =
                "ccfv-live-complete-generated";


            empty.insertAdjacentElement(
                "afterend",
                list
            );

        }


        empty.style.display =
            "none";


        return {

            list,

            empty

        };

    }


    /* =====================================================
       RANKING COMPLETO
       ===================================================== */

    function renderCompleteRanking() {

        const container =
            getCompleteContainer();


        if (
            !container ||
            !container.list
        ) {

            return;

        }


        const players =
            getPlayers()
                .filter(
                    player => {

                        const matchesPlatform =
                            currentPlatform ===
                            "all"
                                ? true
                                : normalize(
                                    player.platform
                                ) ===
                                    normalize(
                                        currentPlatform
                                    );


                        const term =
                            normalize(
                                currentSearch
                            );


                        const name =
                            normalize(
                                player.name
                            );


                        const instagram =
                            normalize(
                                player.instagram
                            );


                        const matchesSearch =
                            !term ||
                            name.includes(
                                term
                            ) ||
                            instagram.includes(
                                term
                            );


                        return (
                            matchesPlatform &&
                            matchesSearch
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


        if (
            !players.length
        ) {

            container.list.innerHTML = `

                <div
                    class="
                        ccfv-live-complete-empty
                    "
                >
                    NENHUM COMPETIDOR ENCONTRADO.
                </div>

            `;

            return;

        }


        const head = `

            <div
                class="
                    ccfv-live-complete-head
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
                    NÍVEL
                </span>

            </div>

        `;


        const rows =
            players
                .map(
                    (
                        player,
                        index
                    ) => {

                        const stats =
                            getStats(
                                player
                            );


                        const rank =
                            getRank(
                                player.elo
                            );


                        const photo =
                            player.photo_url ||
                            player.photo ||
                            "";


                        const initials =
                            String(
                                player.name ||
                                "CCFV"
                            )
                                .trim()
                                .slice(
                                    0,
                                    2
                                )
                                .toUpperCase();


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


                        return `

                            <div
                                class="
                                    ccfv-live-complete-row
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
                                        ccfv-live-complete-player
                                    "
                                >

                                    <div
                                        class="
                                            ccfv-live-complete-photo
                                        "
                                    >

                                        ${photoHTML}

                                    </div>


                                    <div
                                        class="
                                            ccfv-live-complete-info
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


                                <span>
                                    ${escapeHTML(
                                        player.platform ||
                                        "—"
                                    )}
                                </span>


                                <span
                                    class="
                                        ccfv-live-complete-elo
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
                                        ccfv-live-complete-win
                                    "
                                >
                                    ${stats.wins}
                                </span>


                                <span>
                                    ${stats.draws}
                                </span>


                                <span
                                    class="
                                        ccfv-live-complete-loss
                                    "
                                >
                                    ${stats.losses}
                                </span>


                                <span
                                    class="
                                        ccfv-live-complete-rank
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


        container.list.innerHTML =
            `
                <div
                    class="
                        ccfv-live-complete-ranking
                    "
                >

                    ${head}

                    ${rows}

                </div>
            `;

    }


    /* =====================================================
       BUSCA
       ===================================================== */

    function bindSearch() {

        const inputs =
            document.querySelectorAll(
                'input[placeholder*="Nome do jogador" i], input[placeholder*="Nome ou Instagram" i]'
            );


        inputs.forEach(
            input => {

                if (
                    input.dataset.ccfvLiveSearch ===
                    "true"
                ) {

                    return;

                }


                input.dataset.ccfvLiveSearch =
                    "true";


                input.addEventListener(
                    "input",
                    () => {

                        currentSearch =
                            input.value ||
                            "";


                        renderCompleteRanking();

                    }
                );

            }
        );

    }


    /* =====================================================
       FILTROS
       ===================================================== */

    function bindFilters() {

        document
            .querySelectorAll(
                "[data-platform]"
            )
            .forEach(
                button => {

                    if (
                        button.dataset.ccfvFinalFilter ===
                        "true"
                    ) {

                        return;

                    }


                    button.dataset.ccfvFinalFilter =
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

                                        item.classList.toggle(
                                            "is-active",
                                            (
                                                item.dataset.platform ||
                                                "all"
                                            ) ===
                                                currentPlatform
                                        );

                                    }
                                );


                            renderCompleteRanking();

                        }
                    );

                }
            );

    }


    /* =====================================================
       VER RANKING COMPLETO
       ===================================================== */

    function bindCompleteButton() {

        const elements =
            Array.from(
                document.querySelectorAll(
                    "a, button"
                )
            );


        elements.forEach(
            element => {

                const text =
                    (
                        element.textContent ||
                        ""
                    )
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim()
                        .toUpperCase();


                if (
                    !text.includes(
                        "VER RANKING COMPLETO"
                    )
                ) {

                    return;

                }


                if (
                    element.dataset.ccfvCompleteBound ===
                    "true"
                ) {

                    return;

                }


                element.dataset.ccfvCompleteBound =
                    "true";


                element.addEventListener(
                    "click",
                    () => {

                        window.setTimeout(
                            () => {

                                const target =
                                    Array.from(
                                        document.querySelectorAll(
                                            "h1, h2, h3, section, div"
                                        )
                                    )
                                        .find(
                                            item =>
                                                (
                                                    item.textContent ||
                                                    ""
                                                )
                                                    .replace(
                                                        /\s+/g,
                                                        " "
                                                    )
                                                    .toUpperCase()
                                                    .includes(
                                                        "RANKING COMPLETO"
                                                    )
                                        );


                                if (
                                    target
                                ) {

                                    target.scrollIntoView(
                                        {
                                            behavior:
                                                "smooth",

                                            block:
                                                "start"

                                        }
                                    );

                                }

                                else {

                                    const href =
                                        element.getAttribute(
                                            "href"
                                        );


                                    if (
                                        href &&
                                        href !==
                                        "#"
                                    ) {

                                        window.location.href =
                                            href;

                                    }

                                }

                            },
                            100
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       UPDATE
       ===================================================== */

    function update() {

        injectStyles();

        renderFeature();

        syncPlayerCards();

        renderCompleteRanking();

        bindSearch();

        bindFilters();

        bindCompleteButton();

    }


    /* =====================================================
       OBSERVER
       ===================================================== */

    function observeDom() {

        if (
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
                            update,
                            100
                        );

                }
            );


        observer.observe(
            document.body,
            {
                childList:
                    true,

                subtree:
                    true

            }
        );

    }


    /* =====================================================
       REALTIME
       ===================================================== */

    function bindLive() {

        window.addEventListener(
            "ccfv:live-update",
            () => {

                update();

            }
        );

    }


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        update();

        observeDom();

        bindLive();


        /*
         * O ranking.js renderiza algumas
         * partes depois do carregamento.
         * Fazemos pequenas verificações
         * de segurança.
         */

        let attempts =
            0;


        const timer =
            window.setInterval(
                () => {

                    update();

                    attempts++;


                    if (
                        attempts >=
                        24
                    ) {

                        window.clearInterval(
                            timer
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