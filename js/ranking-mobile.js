/* =========================================================
   CCFV // MOBILE RANKING
   MOTOR EXCLUSIVO DO MOBILE
   MESMA BASE DE DADOS DO CCFV
   FILTRO: PLATFORM = MOBILE

   IMPORTANTE:
   - NÃO importa ranking.js
   - NÃO altera ranking.js
   - NÃO altera window.CCFVRanking
   - NÃO utiliza elementos do ranking oficial
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
            description:
                "O início da caminhada competitiva."
        },

        amateur: {
            key: "amateur",
            name: "AMADOR",
            min: 1000,
            max: 1999,
            next: 2000,
            description:
                "Primeira grande conquista da CCFV."
        },

        professional: {
            key: "professional",
            name: "PROFISSIONAL",
            min: 2000,
            max: 2999,
            next: 3000,
            description:
                "O nível competitivo de alto rendimento."
        },

        legend: {
            key: "legend",
            name: "LENDA",
            min: 3000,
            max: Infinity,
            next: null,
            description:
                "A elite absoluta da CCFV."
        }

    };


    const RANKS = [
        RANK_CONFIG.beginner,
        RANK_CONFIG.amateur,
        RANK_CONFIG.professional,
        RANK_CONFIG.legend
    ];


    /* =====================================================
       ESTADO
       ===================================================== */

    let client = null;

    let ranking = [];

    let refreshTimer = null;


    /* =====================================================
       ELEMENTOS EXCLUSIVOS DO MOBILE
       ===================================================== */

    const elements = {

        playerCount:
            document.querySelector(
                "#mobile-ranking-count"
            ),

        heroLeader:
            document.querySelector(
                "#mobile-ranking-hero-leader"
            ),

        ranking:
            document.querySelector(
                "#mobile-ranking-list"
            ),

        levelGrid:
            document.querySelector(
                "#mobile-ranking-level-grid"
            )

    };


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function num(value) {

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : 0;

    }


    function escapeHTML(value) {

        return String(
            value ?? ""
        )
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function getInitials(name) {

        const words =
            String(name || "CC")
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (!words.length) {

            return "CC";

        }


        if (words.length === 1) {

            return String(
                words[0]
            )
                .slice(0, 2)
                .toUpperCase();

        }


        return (
            String(words[0][0]) +
            String(words[words.length - 1][0])
        ).toUpperCase();

    }


    function getPhoto(player) {

        return String(
            player?.photo ||
            player?.photo_url ||
            player?.avatar_url ||
            player?.image_url ||
            ""
        ).trim();

    }


    function getInstagram(player) {

        if (!player?.instagram) {

            return "SEM INSTAGRAM";

        }


        return (
            "@" +
            String(player.instagram)
                .replace(/^@/, "")
        );

    }


    function getGames(player) {

        const direct =
            Number(
                player?.matches_played ??
                player?.matches ??
                NaN
            );


        if (
            Number.isFinite(direct)
        ) {

            return direct;

        }


        return (
            Number(player?.wins || 0) +
            Number(player?.draws || 0) +
            Number(player?.losses || 0)
        );

    }


    function getWinRate(player) {

        const games =
            getGames(player);

        const wins =
            num(player?.wins);


        if (!games) {

            return 0;

        }


        return Math.round(
            (wins / games) * 100
        );

    }


    /* =====================================================
       ELO → RANK
       ===================================================== */

    function getRankByPoints(elo) {

        const value =
            Math.max(
                0,
                num(elo)
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
       BADGE
       Visual próprio do Mobile, mantendo a identidade
       das quatro categorias do Ranking Oficial.
       ===================================================== */

    function renderBadge(
        rank,
        size = "medium"
    ) {

        const label =
            rank.key === "professional"
                ? "PRO"
                : rank.name;


        return `

            <div
                class="
                    ccfv-mobile-rank-badge
                    ccfv-mobile-rank-badge--${escapeHTML(rank.key)}
                    ccfv-mobile-rank-badge--${escapeHTML(size)}
                "
                aria-label="${escapeHTML(rank.name)}"
            >

                <span>
                    ${escapeHTML(label)}
                </span>

            </div>

        `;

    }


    /* =====================================================
       CLIENT SUPABASE
       ===================================================== */

    async function getClient() {

        if (client) {

            return client;

        }


        if (
            window.CCFVAuth?.getClient
        ) {

            client =
                await window.CCFVAuth.getClient();

            return client;

        }


        let script =
            document.querySelector(
                'script[src*="/admin/js/auth.js"]'
            );


        if (!script) {

            script =
                document.createElement("script");

            script.src =
                "../admin/js/auth.js";

            script.defer =
                true;

            document.head.appendChild(
                script
            );

        }


        const started =
            Date.now();


        while (
            !window.CCFVAuth?.getClient
        ) {

            if (
                Date.now() - started >
                10000
            ) {

                throw new Error(
                    "Supabase não está disponível."
                );

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

        }


        client =
            await window.CCFVAuth.getClient();


        return client;

    }


    /* =====================================================
       NORMALIZAÇÃO
       ===================================================== */

    function normalizePlayer(row) {

        return {

            ...row,

            name:
                row?.name ||
                row?.player_name ||
                "JOGADOR",

            platform:
                row?.platform ||
                "—",

            elo:
                num(row?.elo),

            matches_played:
                num(
                    row?.matches_played ??
                    row?.matches ??
                    (
                        num(row?.wins) +
                        num(row?.draws) +
                        num(row?.losses)
                    )
                ),

            wins:
                num(row?.wins),

            draws:
                num(row?.draws),

            losses:
                num(row?.losses),

            titles:
                num(row?.titles)

        };

    }


    /* =====================================================
       CARREGA RANKING MOBILE
       ===================================================== */

    async function loadRanking() {

        const c =
            await getClient();


        const {
            data,
            error
        } =
            await c
                .from("ccfv_ranking")
                .select("*")
                .order(
                    "ranking_position",
                    {
                        ascending: true
                    }
                );


        if (error) {

            throw error;

        }


        ranking =
            (data || [])

                .map(
                    normalizePlayer
                )

                .filter(
                    player =>
                        String(
                            player.platform ||
                            ""
                        )
                            .trim()
                            .toUpperCase() ===
                        "MOBILE"
                )

                .sort(
                    (
                        first,
                        second
                    ) => {

                        const eloDifference =
                            num(second.elo) -
                            num(first.elo);


                        if (
                            eloDifference !== 0
                        ) {

                            return eloDifference;

                        }


                        const winsDifference =
                            num(second.wins) -
                            num(first.wins);


                        if (
                            winsDifference !== 0
                        ) {

                            return winsDifference;

                        }


                        return String(
                            first.name
                        ).localeCompare(
                            String(
                                second.name
                            ),
                            "pt-BR"
                        );

                    }
                )

                .map(
                    (
                        player,
                        index
                    ) => ({

                        ...player,

                        ranking_position:
                            index + 1

                    })
                );


        return ranking;

    }


    /* =====================================================
       HERO
       ===================================================== */

    function renderHero() {

        if (
            !elements.heroLeader
        ) {

            return;

        }


        const leader =
            ranking[0];


        if (!leader) {

            elements.heroLeader.innerHTML = `

                <article
                    class="
                        ccfv-ranking-hero__leader-card
                        ccfv-ranking-hero__leader-card--empty
                    "
                >

                    <div
                        class="
                            ccfv-ranking-hero__leader-content
                        "
                    >

                        <span>
                            CCFV // MOBILE // OFFICIAL LEADER
                        </span>

                        <div
                            class="
                                ccfv-ranking-hero__leader-position
                            "
                        >
                            #01 ABSOLUTO
                        </div>

                        <h2>
                            AGUARDANDO
                        </h2>

                        <small>
                            Nenhum jogador Mobile no ranking.
                        </small>

                    </div>

                </article>

            `;

            return;

        }


        const rank =
            getRankByPoints(
                leader.elo
            );


        const photo =
            getPhoto(leader);


        const photoHTML =
            photo

                ? `
                    <img
                        src="${escapeHTML(photo)}"
                        alt="${escapeHTML(leader.name)}"
                        loading="eager"
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


        elements.heroLeader.innerHTML = `

            <article
                class="
                    ccfv-ranking-hero__leader-card
                    ccfv-ranking-hero__leader-card--${escapeHTML(rank.key)}
                "
            >


                <div
                    class="
                        ccfv-ranking-hero__leader-photo
                    "
                >

                    ${photoHTML}

                </div>


                <div
                    class="
                        ccfv-ranking-hero__leader-badge
                    "
                >

                    ${renderBadge(
                        rank,
                        "medium"
                    )}

                </div>


                <div
                    class="
                        ccfv-ranking-hero__leader-content
                    "
                >

                    <span>
                        CCFV // MOBILE // OFFICIAL LEADER
                    </span>


                    <div
                        class="
                            ccfv-ranking-hero__leader-position
                        "
                    >
                        #01 ABSOLUTO
                    </div>


                    <h2>
                        ${escapeHTML(
                            leader.name
                        )}
                    </h2>


                    <small>
                        ${escapeHTML(
                            getInstagram(
                                leader
                            )
                        )}
                    </small>


                    <div
                        class="
                            ccfv-ranking-hero__leader-meta
                        "
                    >

                        <div>

                            <span>
                                ELO
                            </span>

                            <strong>
                                ${num(leader.elo)}
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
                                V
                            </span>

                            <strong>
                                ${num(
                                    leader.wins
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                TÍTULOS
                            </span>

                            <strong>
                                ${num(
                                    leader.titles
                                )}
                            </strong>

                        </div>

                    </div>

                </div>

            </article>

        `;

    }


    /* =====================================================
       CABEÇALHO DA TABELA
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
       SLOTS VAZIOS
       ===================================================== */

    function renderEmptyRanking() {

        const slots =
            Array.from(
                {
                    length: 10
                },
                (
                    _,
                    index
                ) => {

                    const position =
                        String(
                            index + 1
                        ).padStart(
                            2,
                            "0"
                        );


                    return `

                        <div
                            class="
                                ccfv-ranking-empty-slot
                            "
                        >

                            <span>
                                ${position}
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
                                        POSIÇÃO #${position}
                                    </small>

                                </div>

                            </div>


                            <span>
                                MOBILE
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


        return (
            renderRankingHeader() +
            slots
        );

    }


    /* =====================================================
       RANKING
       ===================================================== */

    function renderRanking() {

        if (
            !elements.ranking
        ) {

            return;

        }


        const top10 =
            ranking.slice(
                0,
                10
            );


        if (!top10.length) {

            elements.ranking.innerHTML =
                renderEmptyRanking();

            return;

        }


        elements.ranking.innerHTML =
            renderRankingHeader() +
            top10
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
                            getPhoto(
                                player
                            );


                        const photoHTML =
                            photo

                                ? `
                                    <img
                                        src="${escapeHTML(photo)}"
                                        alt="${escapeHTML(player.name)}"
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


                        const position =
                            index + 1;


                        return `

                            <article
                                class="
                                    ccfv-ranking-row
                                    ccfv-ranking-row--${escapeHTML(rank.key)}
                                    ${position === 1 ? "is-first" : ""}
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
                                            ${escapeHTML(
                                                getInstagram(
                                                    player
                                                )
                                            )}
                                        </span>

                                    </div>

                                </div>


                                <span
                                    class="
                                        ccfv-ranking-row__platform
                                    "
                                >
                                    MOBILE
                                </span>


                                <span
                                    class="
                                        ccfv-ranking-row__points
                                    "
                                >
                                    ${num(
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
       LÍDER DE CADA ELO
       ===================================================== */

    function getTopPlayerForRank(
        rank
    ) {

        return (
            ranking
                .filter(
                    player => {

                        const elo =
                            num(
                                player?.elo
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
                        num(second?.elo) -
                        num(first?.elo)
                )[0] ||
            null
        );

    }


    /* =====================================================
       MOVIMENTO DOS CARDS
       ===================================================== */

    function bindLevelCardMotion() {

        if (
            !elements.levelGrid
        ) {

            return;

        }


        elements.levelGrid
            .querySelectorAll(
                ".ccfv-ranking-level"
            )
            .forEach(
                card => {

                    card.addEventListener(
                        "pointermove",
                        event => {

                            const rect =
                                card.getBoundingClientRect();


                            const px =
                                (
                                    event.clientX -
                                    rect.left
                                ) /
                                rect.width;


                            const py =
                                (
                                    event.clientY -
                                    rect.top
                                ) /
                                rect.height;


                            const rx =
                                (
                                    0.5 -
                                    py
                                ) *
                                7;


                            const ry =
                                (
                                    px -
                                    0.5
                                ) *
                                10;


                            card.style.setProperty(
                                "--level-rx",
                                `${rx}deg`
                            );


                            card.style.setProperty(
                                "--level-ry",
                                `${ry}deg`
                            );


                            card.style.setProperty(
                                "--level-mx",
                                `${px * 100}%`
                            );


                            card.style.setProperty(
                                "--level-my",
                                `${py * 100}%`
                            );


                            card.classList.add(
                                "is-hovering"
                            );

                        }
                    );


                    card.addEventListener(
                        "pointerleave",
                        () => {

                            card.style.setProperty(
                                "--level-rx",
                                "0deg"
                            );


                            card.style.setProperty(
                                "--level-ry",
                                "0deg"
                            );


                            card.style.setProperty(
                                "--level-mx",
                                "50%"
                            );


                            card.style.setProperty(
                                "--level-my",
                                "50%"
                            );


                            card.classList.remove(
                                "is-hovering"
                            );

                        }
                    );

                }
            );

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


        elements.levelGrid.innerHTML =
            RANKS
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
                            topPlayer
                                ? getPhoto(
                                    topPlayer
                                )
                                : "";


                        const initials =
                            topPlayer
                                ? getInitials(
                                    topPlayer.name
                                )
                                : "--";


                        const photoHTML =
                            topPlayer

                                ? (
                                    photo

                                        ? `
                                            <img
                                                src="${escapeHTML(photo)}"
                                                alt="${escapeHTML(topPlayer.name)}"
                                                loading="lazy"
                                            >
                                        `

                                        : `
                                            <span>
                                                ${escapeHTML(
                                                    initials
                                                )}
                                            </span>
                                        `
                                )

                                : `
                                    <span>
                                        ?
                                    </span>
                                `;


                        return `

                            <article
                                class="
                                    ccfv-ranking-level
                                    ccfv-ranking-level--${escapeHTML(rank.key)}
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
                                        NÍVEL
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
                                        ${
                                            topPlayer
                                                ? "TOP 1 DO ELO"
                                                : "AGUARDANDO"
                                        }
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

                                    ${photoHTML}

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
                                    ${escapeHTML(
                                        range
                                    )}
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
                                                    ${num(
                                                        topPlayer.elo
                                                    )}
                                                    ELO
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
       CONTADORES
       ===================================================== */

    function renderCount() {

        if (
            !elements.playerCount
        ) {

            return;

        }


        elements.playerCount.textContent =
            String(
                ranking.length
            ).padStart(
                2,
                "0"
            );

    }


    /* =====================================================
       RENDER GERAL
       ===================================================== */

    function render() {

        renderCount();

        renderHero();

        renderRanking();

        renderLevels();

    }


    /* =====================================================
       REFRESH
       ===================================================== */

    async function refresh() {

        try {

            await loadRanking();

            render();

        }

        catch (error) {

            console.error(
                "CCFV // MOBILE RANKING:",
                error
            );

        }

    }


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    function start() {

        refresh();


        if (
            refreshTimer
        ) {

            clearInterval(
                refreshTimer
            );

        }


        refreshTimer =
            window.setInterval(
                () => {

                    if (
                        document.visibilityState ===
                        "visible"
                    ) {

                        refresh();

                    }

                },
                60000
            );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once: true
            }
        );

    }

    else {

        start();

    }


})();