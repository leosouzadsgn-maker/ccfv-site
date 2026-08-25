/* =========================================================
   CCFV // OFFICIAL RANKING
   RANKING AUTOMÁTICO
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient = null;

    let ranking = [];

    let searchTerm = "";

    let rankFilter = "ALL";


    /* =====================================================
       DOM
       ===================================================== */

    const dom = {

        section:
            document.querySelector(
                "#section-ranking"
            ),

        table:
            document.querySelector(
                "#ranking-table"
            ),

        empty:
            document.querySelector(
                "#ranking-empty"
            ),

        search:
            document.querySelector(
                "#ranking-search"
            ),

        refresh:
            document.querySelector(
                "#ranking-refresh"
            ),

        total:
            document.querySelector(
                "#ranking-total"
            )

    };


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
            !window.CCFVAuth ||
            typeof window.CCFVAuth.getClient !==
                "function"
        ) {

            throw new Error(
                "Sistema de autenticação não disponível."
            );

        }


        supabaseClient =
            await window.CCFVAuth.getClient();


        return supabaseClient;

    }


    /* =====================================================
       SECURITY
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


    /* =====================================================
       RANK LABEL
       ===================================================== */

    function getRankClass(
        rank
    ) {

        const normalized =
            String(
                rank || ""
            )
            .toUpperCase();


        if (
            normalized ===
            "LENDA"
        ) {

            return "rank-legend";

        }


        if (
            normalized ===
            "PROFISSIONAL"
        ) {

            return "rank-professional";

        }


        if (
            normalized ===
            "AMADOR"
        ) {

            return "rank-amateur";

        }


        return "rank-beginner";

    }


    /* =====================================================
       CARREGAR RANKING
       ===================================================== */

    async function loadRanking() {

        const client =
            await getSupabase();


        const {
            data,
            error
        } =
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
            error
        ) {

            throw error;

        }


        ranking =
            Array.isArray(data)
                ? data
                : [];


        renderRanking();

        updateTotal();

    }


    /* =====================================================
       FILTRAR
       ===================================================== */

    function getFilteredRanking() {

        return ranking.filter(
            player => {

                const name =
                    String(
                        player.name || ""
                    )
                    .toLowerCase();


                const instagram =
                    String(
                        player.instagram || ""
                    )
                    .toLowerCase();


                const matchesSearch =
                    !searchTerm ||
                    name.includes(
                        searchTerm
                    ) ||
                    instagram.includes(
                        searchTerm
                    );


                const playerRank =
                    String(
                        player.rank_label ||
                        "INICIANTE"
                    )
                    .toUpperCase();


                const matchesRank =
                    rankFilter ===
                    "ALL"

                    ||

                    playerRank ===
                    rankFilter;


                return (
                    matchesSearch &&
                    matchesRank
                );

            }
        );

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderRanking() {

        if (
            !dom.table
        ) {

            return;

        }


        const filtered =
            getFilteredRanking();


        dom.table.innerHTML =
            "";


        if (
            filtered.length ===
            0
        ) {

            dom.empty
                ?.classList
                .add(
                    "is-visible"
                );

            return;

        }


        dom.empty
            ?.classList
            .remove(
                "is-visible"
            );


        filtered.forEach(
            player => {

                dom.table.appendChild(
                    createRow(
                        player
                    )
                );

            }
        );

    }


    /* =====================================================
       CRIAR LINHA
       ===================================================== */

    function createRow(
        player
    ) {

        const row =
            document.createElement(
                "div"
            );


        const position =
            Number(
                player.ranking_position ||
                0
            );


        const elo =
            Number(
                player.elo || 0
            );


        const wins =
            Number(
                player.wins || 0
            );


        const draws =
            Number(
                player.draws || 0
            );


        const losses =
            Number(
                player.losses || 0
            );


        const titles =
            Number(
                player.titles || 0
            );


        const matches =
            Number(
                player.matches || 0
            );


        const rankLabel =
            String(
                player.rank_label ||
                "INICIANTE"
            );


        row.className =
            "ccfv-ranking-row";


        if (
            position === 1
        ) {

            row.classList.add(
                "is-first"
            );

        }

        else if (
            position === 2
        ) {

            row.classList.add(
                "is-second"
            );

        }

        else if (
            position === 3
        ) {

            row.classList.add(
                "is-third"
            );

        }


        const photo =
            player.photo_url
                ? `
                    <img
                        src="${escapeHTML(
                            player.photo_url
                        )}"
                        alt=""
                    >
                  `
                : `
                    <span>
                        ${escapeHTML(
                            String(
                                player.name ||
                                "?"
                            )
                            .slice(
                                0,
                                2
                            )
                            .toUpperCase()
                        )}
                    </span>
                  `;


        row.innerHTML = `

            <div
                class="
                    ccfv-ranking-position
                "
            >
                ${String(
                    position
                ).padStart(
                    2,
                    "0"
                )}
            </div>


            <div
                class="
                    ccfv-ranking-player
                "
            >

                <div
                    class="
                        ccfv-ranking-player__photo
                    "
                >
                    ${photo}
                </div>


                <div
                    class="
                        ccfv-ranking-player__info
                    "
                >

                    <strong>
                        ${escapeHTML(
                            player.name
                        )}
                    </strong>

                    <small>
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
                                : "SEM INSTAGRAM"
                        }
                    </small>

                </div>

            </div>


            <div
                class="
                    ccfv-ranking-elo
                "
            >
                ${elo}
            </div>


            <div>
                ${matches}
            </div>


            <div
                class="
                    ccfv-ranking-positive
                "
            >
                ${wins}
            </div>


            <div>
                ${draws}
            </div>


            <div
                class="
                    ccfv-ranking-negative
                "
            >
                ${losses}
            </div>


            <div
                class="
                    ccfv-ranking-title
                "
            >
                ${titles}
            </div>


            <div>

                <span
                    class="
                        ccfv-ranking-badge
                        ${getRankClass(
                            rankLabel
                        )}
                    "
                >
                    ${escapeHTML(
                        rankLabel
                    )}
                </span>

            </div>

        `;


        return row;

    }


    /* =====================================================
       TOTAL
       ===================================================== */

    function updateTotal() {

        if (
            dom.total
        ) {

            dom.total.textContent =
                `${ranking.length} JOGADORES`;

        }

    }


    /* =====================================================
       BUSCA
       ===================================================== */

    function handleSearch(
        event
    ) {

        searchTerm =
            String(
                event.target.value ||
                ""
            )
            .trim()
            .toLowerCase();


        renderRanking();

    }


    /* =====================================================
       FILTRO
       ===================================================== */

    function handleFilter(
        event
    ) {

        const button =
            event.currentTarget;


        rankFilter =
            String(
                button.dataset.rankFilter ||
                "ALL"
            )
            .toUpperCase();


        document
            .querySelectorAll(
                "[data-rank-filter]"
            )
            .forEach(
                item => {

                    item.classList.remove(
                        "is-active"
                    );

                }
            );


        button.classList.add(
            "is-active"
        );


        renderRanking();

    }


    /* =====================================================
       ATUALIZAR
       ===================================================== */

    async function refresh() {

        try {

            if (
                dom.refresh
            ) {

                dom.refresh.disabled =
                    true;

                dom.refresh.textContent =
                    "ATUALIZANDO...";

            }


            await loadRanking();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // RANKING:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CARREGAR RANKING."
            );

        }

        finally {

            if (
                dom.refresh
            ) {

                dom.refresh.disabled =
                    false;

                dom.refresh.textContent =
                    "ATUALIZAR";

            }

        }

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

        const toast =
            document.querySelector(
                "#admin-toast"
            );


        if (
            !toast
        ) {

            return;

        }


        toast.textContent =
            message;


        toast.classList.add(
            "is-visible"
        );


        clearTimeout(
            toast._rankingTimer
        );


        toast._rankingTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "is-visible"
                    );

                },
                3500
            );

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        dom.search?.addEventListener(
            "input",
            handleSearch
        );


        dom.refresh?.addEventListener(
            "click",
            refresh
        );


        document
            .querySelectorAll(
                "[data-rank-filter]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        handleFilter
                    );

                }
            );

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        if (
            !dom.section
        ) {

            return;

        }


        bindEvents();


        try {

            await loadRanking();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // RANKING INIT:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CARREGAR RANKING."
            );

        }

    }


    /* =====================================================
       START
       ===================================================== */

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