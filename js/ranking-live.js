/* =========================================================
   CCFV // PUBLIC RANKING LIVE SYNC
   Liga o Ranking público ao mesmo ccfv_ranking usado pelo Admin.
   Não altera o layout do Ranking público.
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const RANKING_VIEW =
        "ccfv_ranking";

    const AUTH_SCRIPT =
        "/admin/js/auth.js";

    const REFRESH_INTERVAL =
        30000;


    /* =====================================================
       ESTADO
       ===================================================== */

    let client = null;

    let loading =
        false;

    let authLoading =
        false;


    /* =====================================================
       LOG
       ===================================================== */

    function log(
        ...args
    ) {

        console.log(
            "%cCCFV // LIVE RANKING",
            "color:#43df91;font-weight:900;",
            ...args
        );

    }


    function logError(
        ...args
    ) {

        console.error(
            "CCFV // LIVE RANKING:",
            ...args
        );

    }


    /* =====================================================
       ESCAPE
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
       RANK
       ===================================================== */

    function getRankLabel(
        elo
    ) {

        const value =
            Math.max(
                0,
                Number(
                    elo || 0
                )
            );


        if (
            value >=
            3000
        ) {

            return "LENDA";

        }


        if (
            value >=
            2000
        ) {

            return "PROFISSIONAL";

        }


        if (
            value >=
            1000
        ) {

            return "AMADOR";

        }


        return "INICIANTE";

    }


    /* =====================================================
       CARREGAR AUTH DO ADMIN
       ===================================================== */

    function loadScript(
        src
    ) {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const existing =
                    document.querySelector(
                        `script[data-ccfv-live-src="${src}"]`
                    );


                if (
                    existing
                ) {

                    if (
                        existing.dataset.loaded ===
                        "true"
                    ) {

                        resolve();

                        return;

                    }


                    existing.addEventListener(
                        "load",
                        resolve,
                        {
                            once:
                                true
                        }
                    );


                    existing.addEventListener(
                        "error",
                        reject,
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
                    src;

                script.defer =
                    true;

                script.dataset.ccfvLiveSrc =
                    src;


                script.addEventListener(
                    "load",
                    () => {

                        script.dataset.loaded =
                            "true";

                        resolve();

                    },
                    {
                        once:
                            true
                    }
                );


                script.addEventListener(
                    "error",
                    () => {

                        reject(
                            new Error(
                                `Falha ao carregar ${src}.`
                            )
                        );

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


    async function ensureAuth() {

        if (
            window.CCFVAuth &&
            typeof
                window.CCFVAuth.getClient ===
                "function"
        ) {

            return;

        }


        if (
            authLoading
        ) {

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
                    8000
                ) {

                    throw new Error(
                        "Tempo excedido aguardando CCFVAuth."
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

            return;

        }


        authLoading =
            true;


        try {

            await loadScript(
                AUTH_SCRIPT
            );


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
                    8000
                ) {

                    throw new Error(
                        "CCFVAuth não ficou disponível."
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

        }

        finally {

            authLoading =
                false;

        }

    }


    /* =====================================================
       CLIENT
       ===================================================== */

    async function getClient() {

        if (
            client
        ) {

            return client;

        }


        await ensureAuth();


        client =
            await
                window.CCFVAuth
                    .getClient();


        if (
            !client
        ) {

            throw new Error(
                "Cliente Supabase não foi criado."
            );

        }


        return client;

    }


    /* =====================================================
       NORMALIZAR JOGADOR
       ===================================================== */

    function normalizePlayer(
        player
    ) {

        const elo =
            Math.max(
                0,
                Number(
                    player?.elo ||
                    0
                )
            );


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


        const matches =
            Number(
                player?.matches ??
                (
                    wins +
                    draws +
                    losses
                )
            );


        return {

            ...player,

            id:
                player?.id ||
                null,

            name:
                player?.name ||
                "COMPETIDOR",

            instagram:
                player?.instagram ||
                "",

            platform:
                player?.platform ||
                "PC",

            photo:
                player?.photo ||
                player?.photo_url ||
                "",

            photo_url:
                player?.photo_url ||
                player?.photo ||
                "",

            elo,

            wins,

            draws,

            losses,

            titles:
                Number(
                    player?.titles ||
                    0
                ),

            matches,

            ranking_position:
                Number(
                    player?.ranking_position ||
                    0
                ),

            rank_label:
                player?.rank_label ||
                getRankLabel(
                    elo
                )

        };

    }


    /* =====================================================
       APLICAR DADOS AO RANKING PÚBLICO
       ===================================================== */

    function applyRanking(
        rows
    ) {

        if (
            !window.CCFVRanking
        ) {

            throw new Error(
                "CCFVRanking não está disponível."
            );

        }


        if (
            !Array.isArray(
                window.CCFVRanking.players
            )
        ) {

            throw new Error(
                "A lista pública de jogadores não está disponível."
            );

        }


        const normalized =
            rows
                .map(
                    normalizePlayer
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


        const target =
            window.CCFVRanking.players;


        /*
         * IMPORTANTE:
         * Não substituímos a referência do array.
         * Limpamos e preenchemos o mesmo array
         * que o Ranking público já utiliza.
         */
        target.splice(
            0,
            target.length,
            ...normalized
        );


        if (
            typeof
                window.CCFVRanking.refresh ===
                "function"
        ) {

            window.CCFVRanking.refresh();

        }


        return normalized;

    }


    /* =====================================================
       CARREGAR RANKING OFICIAL
       ===================================================== */

    async function refresh() {

        if (
            loading
        ) {

            return;

        }


        loading =
            true;


        try {

            const supabase =
                await getClient();


            const {
                data,
                error
            } =
                await supabase
                    .from(
                        RANKING_VIEW
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


            const rows =
                Array.isArray(
                    data
                )
                    ? data
                    : [];


            const normalized =
                applyRanking(
                    rows
                );


            log(
                `${normalized.length} jogador(es) carregado(s) do Supabase.`
            );


            if (
                normalized.length
            ) {

                log(
                    "Líder:",
                    normalized[0]?.name,
                    "| ELO:",
                    normalized[0]?.elo
                );

            }

        }

        catch (
            error
        ) {

            logError(
                error
            );

        }

        finally {

            loading =
                false;

        }

    }


    /* =====================================================
       ESPERAR RANKING PÚBLICO
       ===================================================== */

    async function waitForRanking() {

        const started =
            Date.now();


        while (
            !window.CCFVRanking
        ) {

            if (
                Date.now() -
                started >
                10000
            ) {

                throw new Error(
                    "CCFVRanking público não ficou disponível."
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

    }


    /* =====================================================
       ATUALIZAÇÃO AUTOMÁTICA
       ===================================================== */

    function startAutoRefresh() {

        window.setInterval(
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    refresh();

                }

            },
            REFRESH_INTERVAL
        );

    }


    /* =====================================================
       API
       ===================================================== */

    window.CCFVRankingLive = {

        refresh

    };


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        try {

            await waitForRanking();

            await refresh();

            startAutoRefresh();

        }

        catch (
            error
        ) {

            logError(
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