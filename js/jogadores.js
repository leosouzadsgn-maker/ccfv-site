/* =========================================================
   CCFV — PLAYER DIRECTORY

   FUNÇÕES:

   • Ranking de jogadores
   • Busca
   • Filtro PC / Console
   • Player Card
   • Compartilhar
   • Copiar link
   • BAIXAR EXATAMENTE O CARD QUE ESTÁ NA TELA

   DADOS:

   Nenhum jogador fictício.

   Os jogadores serão inseridos futuramente
   pelo painel administrativo da CCFV.
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO DOS NÍVEIS
       ===================================================== */

    const RANK_CONFIG = {

        beginner: {

            key:
                "beginner",

            name:
                "INICIANTE",

            min:
                0,

            max:
                999,

            color:
                "#8d9a95"

        },


        amateur: {

            key:
                "amateur",

            name:
                "AMADOR",

            min:
                1000,

            max:
                1999,

            color:
                "#69a8ff"

        },


        professional: {

            key:
                "professional",

            name:
                "PROFISSIONAL",

            min:
                2000,

            max:
                2999,

            color:
                "#43df91"

        },


        legend: {

            key:
                "legend",

            name:
                "LENDA",

            min:
                3000,

            max:
                Infinity,

            color:
                "#ffc252"

        }

    };


    /* =====================================================
       JOGADORES
       =====================================================

       VAZIO DE PROPÓSITO.

       O ADMIN VAI ALIMENTAR ESTA ESTRUTURA
       COM OS JOGADORES REAIS DA CCFV.
       ===================================================== */

    const players = [];


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const elements = {

        count:
            document.querySelector(
                "#players-count"
            ),

        search:
            document.querySelector(
                "#players-search"
            ),

        list:
            document.querySelector(
                "#players-list"
            ),

        filters:
            document.querySelectorAll(
                "[data-filter]"
            ),

        viewer:
            document.querySelector(
                "#player-card-viewer"
            ),

        viewerCard:
            document.querySelector(
                "#player-card"
            ),

        share:
            document.querySelector(
                "#share-card"
            ),

        download:
            document.querySelector(
                "#download-card"
            ),

        copyLink:
            document.querySelector(
                "#copy-card-link"
            ),

        closeButtons:
            document.querySelectorAll(
                "[data-close-card]"
            )

    };


    /* =====================================================
       ESTADO
       ===================================================== */

    let activeFilter =
        "all";


    let currentPlayer =
        null;


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function escapeHTML(
        value
    ) {

        return String(value)

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


    function getInitials(
        name
    ) {

        const words =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (
            !words.length
        ) {

            return "--";

        }


        if (
            words.length === 1
        ) {

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
       AVISO
       ===================================================== */

    function showNotice(
        message
    ) {

        let notice =
            document.querySelector(
                ".ccfv-jogadores-notice"
            );


        if (
            !notice
        ) {

            notice =
                document.createElement(
                    "div"
                );


            notice.className =
                "ccfv-jogadores-notice";


            Object.assign(
                notice.style,
                {

                    position:
                        "fixed",

                    left:
                        "50%",

                    bottom:
                        "25px",

                    transform:
                        "translateX(-50%)",

                    zIndex:
                        "100000",

                    padding:
                        "13px 18px",

                    border:
                        "1px solid rgba(67,223,145,.3)",

                    borderRadius:
                        "10px",

                    background:
                        "rgba(2,7,5,.97)",

                    color:
                        "#43df91",

                    fontFamily:
                        "Inter, sans-serif",

                    fontSize:
                        "10px",

                    fontWeight:
                        "900",

                    letterSpacing:
                        ".05em",

                    boxShadow:
                        "0 20px 60px rgba(0,0,0,.45)",

                    opacity:
                        "0",

                    pointerEvents:
                        "none",

                    transition:
                        "opacity .25s ease"

                }
            );


            document.body.appendChild(
                notice
            );

        }


        notice.textContent =
            message;


        notice.style.opacity =
            "1";


        clearTimeout(
            notice._timer
        );


        notice._timer =
            setTimeout(
                () => {

                    notice.style.opacity =
                        "0";

                },
                2800
            );

    }


    /* =====================================================
       ELO → INSÍGNIA
       ===================================================== */

    function getRank(
        elo
    ) {

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
       INSÍGNIAS
       ===================================================== */

    function renderBadge(
        rank
    ) {


        /* =========================
           LENDA
           ========================= */

        if (
            rank.key ===
            "legend"
        ) {

            return `

                <svg
                    class="
                        ccfv-player-badge
                        ccfv-player-badge--legend
                    "
                    viewBox="0 0 220 260"
                    aria-label="Lenda"
                >

                    <defs>

                        <linearGradient
                            id="badgeLegendGold"
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
                                offset="25%"
                                stop-color="#ffd86b"
                            />

                            <stop
                                offset="55%"
                                stop-color="#ffc252"
                            />

                            <stop
                                offset="78%"
                                stop-color="#a56c10"
                            />

                            <stop
                                offset="100%"
                                stop-color="#fff1a0"
                            />

                        </linearGradient>

                    </defs>


                    <polygon
                        points="
                            110,5
                            145,27
                            190,28
                            214,68
                            193,180
                            110,250
                            27,180
                            6,68
                            30,28
                            75,27
                        "
                        fill="#080a08"
                        stroke="#ffc252"
                        stroke-width="5"
                    />


                    <polygon
                        points="
                            110,20
                            140,40
                            181,40
                            198,70
                            179,171
                            110,231
                            41,171
                            22,70
                            39,40
                            80,40
                        "
                        fill="#11120e"
                        stroke="url(#badgeLegendGold)"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="104"
                        r="53"
                        fill="rgba(255,194,82,.03)"
                        stroke="#ffc252"
                        stroke-width="2"
                    />


                    <path
                        d="
                            M75 78
                            L89 89
                            L110 61
                            L131 89
                            L145 78
                            L143 108
                            L110 128
                            L77 108
                            Z
                        "
                        fill="url(#badgeLegendGold)"
                    />


                    <path
                        d="
                            M62 133
                            Q110 171
                            158 133
                            L148 165
                            Q110 191
                            72 165
                            Z
                        "
                        fill="none"
                        stroke="#ffc252"
                        stroke-width="5"
                    />


                    <text
                        x="110"
                        y="212"
                        text-anchor="middle"
                        fill="#fff5c5"
                        stroke="#71490a"
                        stroke-width="2"
                        paint-order="stroke"
                        font-size="17"
                        font-weight="900"
                        letter-spacing="2.5"
                    >
                        LENDA
                    </text>

                </svg>

            `;

        }


        /* =========================
           PROFISSIONAL
           ========================= */

        if (
            rank.key ===
            "professional"
        ) {

            return `

                <svg
                    class="
                        ccfv-player-badge
                        ccfv-player-badge--professional
                    "
                    viewBox="0 0 220 260"
                    aria-label="Profissional"
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
                            110,27
                            146,47
                            180,78
                            170,168
                            110,224
                            50,168
                            40,78
                            74,47
                        "
                        fill="none"
                        stroke="#a1ffd4"
                        stroke-width="3"
                    />


                    <circle
                        cx="110"
                        cy="105"
                        r="49"
                        fill="rgba(67,223,145,.04)"
                        stroke="#43df91"
                        stroke-width="2"
                    />


                    <path
                        d="
                            M110 61
                            L124 89
                            L153 93
                            L132 113
                            L138 145
                            L110 129
                            L82 145
                            L88 113
                            L67 93
                            L96 89
                            Z
                        "
                        fill="#43df91"
                    />


                    <text
                        x="110"
                        y="212"
                        text-anchor="middle"
                        fill="#c9ffe3"
                        stroke="#086b43"
                        stroke-width="1.3"
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


        /* =========================
           AMADOR
           ========================= */

        if (
            rank.key ===
            "amateur"
        ) {

            return `

                <svg
                    class="
                        ccfv-player-badge
                        ccfv-player-badge--amateur
                    "
                    viewBox="0 0 220 260"
                    aria-label="Amador"
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
                        fill="rgba(105,168,255,.04)"
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


        /* =========================
           INICIANTE
           ========================= */

        return `

            <svg
                class="
                    ccfv-player-badge
                    ccfv-player-badge--beginner
                "
                viewBox="0 0 220 260"
                aria-label="Iniciante"
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
                    y="211"
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
       FILTRO
       ===================================================== */

    function getFilteredPlayers() {

        const search =
            elements.search?.value
                .trim()
                .toLowerCase() ||
            "";


        return players

            .filter(
                player => {

                    const platformOK =
                        activeFilter ===
                        "all" ||

                        String(
                            player.platform ||
                            ""
                        )
                        .toUpperCase() ===
                        activeFilter;


                    const searchOK =
                        !search ||

                        String(
                            player.name ||
                            ""
                        )
                        .toLowerCase()
                        .includes(
                            search
                        );


                    return (
                        platformOK &&
                        searchOK
                    );

                }
            )

            .sort(
                (
                    a,
                    b
                ) =>

                    Number(
                        b.elo ||
                        0
                    )
                    -
                    Number(
                        a.elo ||
                        0
                    )

            );

    }


    /* =====================================================
       RENDER JOGADORES
       ===================================================== */

    function renderPlayers() {

        const filtered =
            getFilteredPlayers();


        if (
            elements.count
        ) {

            elements.count.textContent =
                String(
                    players.length
                )
                .padStart(
                    2,
                    "0"
                );

        }


        if (
            !filtered.length
        ) {

            elements.list.innerHTML = `

                <div
                    class="ccfv-jogadores-empty"
                >

                    <div
                        class="ccfv-jogadores-empty__icon"
                    >
                        CCFV
                    </div>


                    <strong>
                        NENHUM COMPETIDOR CADASTRADO.
                    </strong>


                    <span>
                        Os jogadores oficiais aparecerão
                        aqui assim que forem cadastrados
                        pela administração da CCFV.
                    </span>

                </div>

            `;

            return;

        }


        elements.list.innerHTML =

            filtered

                .map(
                    (
                        player,
                        index
                    ) => {

                        const rank =
                            getRank(
                                player.elo
                            );


                        return `

                            <article
                                class="
                                    ccfv-player-row
                                    ccfv-player-row--${rank.key}
                                "
                            >

                                <span
                                    class="
                                        ccfv-player-row__position
                                    "
                                >

                                    ${String(
                                        index + 1
                                    )
                                    .padStart(
                                        2,
                                        "0"
                                    )}

                                </span>


                                <div
                                    class="
                                        ccfv-player-row__identity
                                    "
                                >

                                    <div
                                        class="
                                            ccfv-player-row__photo
                                        "
                                    >

                                        ${
                                            player.photo

                                            ?

                                            `
                                                <img
                                                    src="${escapeHTML(
                                                        player.photo
                                                    )}"
                                                    alt="${escapeHTML(
                                                        player.name
                                                    )}"
                                                >
                                            `

                                            :

                                            getInitials(
                                                player.name
                                            )
                                        }

                                    </div>


                                    <div
                                        class="
                                            ccfv-player-row__name
                                        "
                                    >

                                        <strong>
                                            ${escapeHTML(
                                                player.name
                                            )}
                                        </strong>


                                        <span>

                                            @${escapeHTML(
                                                String(
                                                    player.instagram
                                                )
                                                .replace(
                                                    /^@/,
                                                    ""
                                                )
                                            )}

                                            ·

                                            ${escapeHTML(
                                                rank.name
                                            )}

                                        </span>

                                    </div>

                                </div>


                                <span
                                    class="
                                        ccfv-player-row__platform
                                    "
                                >

                                    ${escapeHTML(
                                        player.platform
                                    )}

                                </span>


                                <span
                                    class="
                                        ccfv-player-row__elo
                                    "
                                >

                                    ${Number(
                                        player.elo
                                    )}

                                    ELO

                                </span>


                                <div
                                    class="
                                        ccfv-player-row__actions
                                    "
                                >

                                    <button
                                        type="button"
                                        class="
                                            ccfv-player-row__button
                                            ccfv-player-row__button--primary
                                        "
                                        data-player-card="${escapeHTML(
                                            player.id
                                        )}"
                                    >

                                        VER MEU CARD

                                    </button>

                                </div>

                            </article>

                        `;

                    }
                )

                .join("");


        bindCardButtons();

    }


    /* =====================================================
       CARD
       ===================================================== */

    function renderPlayerCard(
        player
    ) {

        const rank =
            getRank(
                player.elo
            );


        return `

            <article
                class="
                    ccfv-real-card
                    ccfv-real-card--${rank.key}
                "
                id="ccfv-download-card"
            >

                <div
                    class="
                        ccfv-real-card__grid
                    "
                ></div>


                <div
                    class="
                        ccfv-real-card__top
                    "
                >

                    <span
                        class="
                            ccfv-real-card__code
                        "
                    >

                        CCFV //
                        PLAYER
                        #${escapeHTML(
                            player.id
                        )}

                    </span>


                    <span
                        class="
                            ccfv-real-card__level
                        "
                    >

                        ${escapeHTML(
                            rank.name
                        )}

                    </span>

                </div>


                <div
                    class="
                        ccfv-real-card__photo
                    "
                >

                    ${
                        player.photo

                        ?

                        `
                            <img
                                src="${escapeHTML(
                                    player.photo
                                )}"
                                alt="${escapeHTML(
                                    player.name
                                )}"
                            >
                        `

                        :

                        `
                            <span
                                class="
                                    ccfv-real-card__photo-placeholder
                                "
                            >

                                ${getInitials(
                                    player.name
                                )}

                            </span>
                        `
                    }

                </div>


                <div
                    class="
                        ccfv-real-card__badge
                    "
                >

                    ${renderBadge(
                        rank
                    )}

                </div>


                <div
                    class="
                        ccfv-real-card__identity
                    "
                >

                    <span>
                        ${escapeHTML(
                            rank.name
                        )}
                    </span>


                    <strong>
                        ${escapeHTML(
                            player.name
                        )}
                    </strong>


                    <small>
                        @${escapeHTML(
                            String(
                                player.instagram
                            )
                            .replace(
                                /^@/,
                                ""
                            )
                        )}
                    </small>

                </div>


                <div
                    class="
                        ccfv-real-card__stats
                    "
                >

                    <div>

                        <span>
                            ELO
                        </span>

                        <strong>
                            ${Number(
                                player.elo
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            V
                        </span>

                        <strong>
                            ${Number(
                                player.wins ||
                                0
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            E
                        </span>

                        <strong>
                            ${Number(
                                player.draws ||
                                0
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            D
                        </span>

                        <strong>
                            ${Number(
                                player.losses ||
                                0
                            )}
                        </strong>

                    </div>

                </div>


                <span
                    class="
                        ccfv-real-card__instagram
                    "
                >

                    @${escapeHTML(
                        String(
                            player.instagram
                        )
                        .replace(
                            /^@/,
                            ""
                        )
                    )}

                </span>


                <span
                    class="
                        ccfv-real-card__logo
                    "
                >

                    CCFV

                </span>

            </article>

        `;

    }


    /* =====================================================
       ABRIR CARD
       ===================================================== */

    function openCard(
        player
    ) {

        currentPlayer =
            player;


        elements.viewerCard.innerHTML =
            renderPlayerCard(
                player
            );


        elements.viewer.classList.add(
            "is-open"
        );


        elements.viewer.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";


        history.replaceState(
            null,
            "",
            `${window.location.pathname}?id=${encodeURIComponent(
                player.id
            )}`
        );

    }


    /* =====================================================
       FECHAR CARD
       ===================================================== */

    function closeCard() {

        elements.viewer.classList.remove(
            "is-open"
        );


        elements.viewer.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";


        history.replaceState(
            null,
            "",
            window.location.pathname
        );


        currentPlayer =
            null;

    }


    /* =====================================================
       BOTÕES DOS CARDS
       ===================================================== */

    function bindCardButtons() {

        document
            .querySelectorAll(
                "[data-player-card]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const player =
                                players.find(
                                    item =>

                                        String(
                                            item.id
                                        ) ===

                                        String(
                                            button.dataset.playerCard
                                        )
                                );


                            if (
                                player
                            ) {

                                openCard(
                                    player
                                );

                            }

                        }
                    );

                }
            );

    }


    /* =====================================================
       COPIAR TEXTO
       ===================================================== */

    async function copyText(
        text
    ) {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard.writeText(
                text
            );

            return;

        }


        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            text;


        textarea.style.position =
            "fixed";


        textarea.style.left =
            "-9999px";


        document.body.appendChild(
            textarea
        );


        textarea.focus();

        textarea.select();


        document.execCommand(
            "copy"
        );


        textarea.remove();

    }


    /* =====================================================
       COMPARTILHAR
       ===================================================== */

    async function shareCard() {

        if (
            !currentPlayer
        ) {

            return;

        }


        const card =
            document.querySelector(
                "#ccfv-download-card"
            );


        if (
            !card
        ) {

            return;

        }


        try {

            await document.fonts.ready;


            const dataUrl =
                await window.htmlToImage.toPng(
                    card,
                    {

                        pixelRatio:
                            3,

                        cacheBust:
                            true,

                        backgroundColor:
                            "transparent"

                    }
                );


            const response =
                await fetch(
                    dataUrl
                );


            const blob =
                await response.blob();


            const safeName =
                String(
                    currentPlayer.name
                )
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .replace(
                    /[^a-zA-Z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                )
                .toLowerCase();


            const file =
                new File(
                    [
                        blob
                    ],
                    `ccfv-card-${
                        safeName ||
                        "jogador"
                    }.png`,
                    {
                        type:
                            "image/png"
                    }
                );


            if (
                navigator.share &&
                navigator.canShare &&
                navigator.canShare({
                    files:
                        [
                            file
                        ]
                })
            ) {

                await navigator.share({

                    title:
                        `CCFV — ${currentPlayer.name}`,

                    text:
                        `Meu Player Card oficial da CCFV — ${currentPlayer.name}`,

                    files:
                        [
                            file
                        ]

                });


                return;

            }


            const url =
                `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(
                    currentPlayer.id
                )}`;


            await copyText(
                url
            );


            showNotice(
                "LINK DO CARD COPIADO."
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // SHARE ERROR:",
                error
            );


            if (
                error?.name ===
                "AbortError"
            ) {

                return;

            }


            showNotice(
                "NÃO FOI POSSÍVEL COMPARTILHAR O CARD."
            );

        }

    }


    /* =====================================================
       COPIAR LINK
       ===================================================== */

    async function copyCardLink() {

        if (
            !currentPlayer
        ) {

            return;

        }


        const url =
            `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(
                currentPlayer.id
            )}`;


        try {

            await copyText(
                url
            );


            showNotice(
                "LINK DO CARD COPIADO."
            );

        }

        catch {

            window.prompt(
                "Copie o link:",
                url
            );

        }

    }


    /* =====================================================
       BAIXAR CARD
       ===================================================== */

    async function downloadCard() {

        if (
            !currentPlayer
        ) {

            return;

        }


        const card =
            document.querySelector(
                "#ccfv-download-card"
            );


        if (
            !card
        ) {

            showNotice(
                "CARD NÃO ENCONTRADO."
            );

            return;

        }


        if (
            typeof window.htmlToImage !==
            "object" &&
            typeof window.htmlToImage !==
            "function"
        ) {

            showNotice(
                "O MOTOR DE EXPORTAÇÃO NÃO CARREGOU."
            );

            return;

        }


        const button =
            elements.download;


        const originalText =
            button.textContent;


        button.disabled =
            true;


        button.textContent =
            "GERANDO PNG...";


        try {

            await document.fonts.ready;


            const dataUrl =
                await window.htmlToImage.toPng(
                    card,
                    {

                        pixelRatio:
                            3,

                        cacheBust:
                            true,

                        backgroundColor:
                            "transparent",

                        skipFonts:
                            false,

                        style:
                        {

                            transform:
                                "none"

                        }

                    }
                );


            if (
                !dataUrl ||
                !dataUrl.startsWith(
                    "data:image/png"
                )
            ) {

                throw new Error(
                    "PNG inválido."
                );

            }


            const response =
                await fetch(
                    dataUrl
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    "Falha no PNG."
                );

            }


            const blob =
                await response.blob();


            if (
                !blob ||
                blob.size <= 0
            ) {

                throw new Error(
                    "Arquivo vazio."
                );

            }


            const url =
                URL.createObjectURL(
                    blob
                );


            const safeName =
                String(
                    currentPlayer.name
                )
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .replace(
                    /[^a-zA-Z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                )
                .toLowerCase();


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                `ccfv-card-${
                    safeName ||
                    "jogador"
                }.png`;


            link.style.display =
                "none";


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            setTimeout(
                () => {

                    URL.revokeObjectURL(
                        url
                    );

                },
                4000
            );


            showNotice(
                "CARD BAIXADO COM SUCESSO."
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // ERRO AO BAIXAR CARD",
                error
            );


            showNotice(
                "ERRO AO EXPORTAR O CARD."
            );

        }

        finally {

            button.disabled =
                false;


            button.textContent =
                originalText;

        }

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
                            item => {

                                item.classList.remove(
                                    "is-active"
                                );

                            }
                        );


                        button.classList.add(
                            "is-active"
                        );


                        activeFilter =
                            button.dataset.filter;


                        renderPlayers();

                    }
                );

            }
        );

    }


    /* =====================================================
       BUSCA
       ===================================================== */

    function bindSearch() {

        if (
            !elements.search
        ) {

            return;

        }


        elements.search.addEventListener(
            "input",
            renderPlayers
        );

    }


    /* =====================================================
       FECHAR
       ===================================================== */

    function bindClose() {

        elements.closeButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    closeCard
                );

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeCard();

                }

            }
        );

    }


    /* =====================================================
       URL
       ===================================================== */

    function openFromURL() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const id =
            params.get(
                "id"
            );


        if (
            !id
        ) {

            return;

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

            openCard(
                player
            );

        }

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        if (
            elements.share
        ) {

            elements.share.addEventListener(
                "click",
                shareCard
            );

        }


        if (
            elements.download
        ) {

            elements.download.addEventListener(
                "click",
                downloadCard
            );

        }


        if (
            elements.copyLink
        ) {

            elements.copyLink.addEventListener(
                "click",
                copyCardLink
            );

        }

    }


    /* =====================================================
       API PÚBLICA
       ===================================================== */

    window.CCFVPlayers = {

        players,

        openCard,

        getRank

    };


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    function init() {

        renderPlayers();

        bindFilters();

        bindSearch();

        bindClose();

        bindEvents();

        openFromURL();


        console.log(
            "%cCCFV // PLAYER DIRECTORY",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        console.log(
            "Nenhum jogador fictício carregado."
        );


        console.log(
            "Sistema pronto para receber dados do Admin."
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