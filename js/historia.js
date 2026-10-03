/* =========================================================
   CCFV // HISTÓRIA — LIVRO DOS CAMPEÕES
   Fonte oficial:
   1. ccfv_titles
   2. ccfv_champions_public_hall_v4
   ========================================================= */

(() => {
    "use strict";

    const state = {
        all: [],
        filter: "TODOS"
    };

    const $ = selector =>
        document.querySelector(selector);

    const esc = value =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const norm = value =>
        String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();

    function competitionKey(value) {

        const n =
            norm(value)
                .replaceAll(" ", "_");

        if (n.includes("CHAMPIONS")) {
            return "CHAMPIONS";
        }

        if (n.includes("NIGHT")) {
            return "NIGHT_CUP";
        }

        if (n.includes("BRASILEIR")) {
            return "BRASILEIRAO";
        }

        if (n.includes("LIBERTADOR")) {
            return "LIBERTADORES";
        }

        if (
            n.includes("MUNDO") ||
            n.includes("WORLD")
        ) {
            return "COPA_DO_MUNDO";
        }

        return n || "OUTRA";
    }

    function trophyPath(value) {

        const key =
            competitionKey(value);

        const paths = {

            BRASILEIRAO:
                "../assets/images/historia/trofeus/brasileirao.png",

            CHAMPIONS:
                "../assets/images/historia/trofeus/champions-league.png",

            NIGHT_CUP:
                "../assets/images/historia/trofeus/night-cup.png",

            LIBERTADORES:
                "../assets/images/historia/trofeus/libertadores.png",

            COPA_DO_MUNDO:
                "../assets/images/historia/trofeus/copa-do-mundo.png"

        };

        return (
            paths[key] ||
            paths.BRASILEIRAO
        );
    }

    function trophy(
        value,
        alt = "Troféu CCFV"
    ) {

        return `
            <img
                src="${esc(
                    trophyPath(value)
                )}"
                alt="${esc(alt)}"
                loading="lazy"
                decoding="async"
            >
        `;
    }


    /*
     * ========================================================
     * NORMALIZA UM TÍTULO
     * ========================================================
     */

    function normalizeTitle(item) {

        if (!item) {
            return null;
        }

        const competitionCode =
            item.competition_code ||
            item.competition ||
            item.code ||
            "";

        const competitionName =
            item.competition_name ||
            item.competition ||
            item.title ||
            "COMPETIÇÃO CCFV";

        const playerName =
            item.player_name ||
            item.participant_name ||
            item.name ||
            "CAMPEÃO";

        const playerId =
            item.player_id ||
            item.participant_id ||
            null;

        const season =
            item.season ||
            item.season_label ||
            item.season_number ||
            "TEMPORADA";

        const teamName =
            item.team_name ||
            item.club_name ||
            "CCFV";

        const clubName =
            item.club_name ||
            item.team_name ||
            "";

        const clubLogo =
            item.club_logo ||
            item.logo_path ||
            "";

        const awardedAt =
            item.awarded_at ||
            item.created_at ||
            null;

        const sourceId =
            item.source_id ||
            item.championship_id ||
            item.id ||
            null;

        return {

            ...item,

            competition_code:
                competitionCode,

            competition_name:
                competitionName,

            player_name:
                playerName,

            player_id:
                playerId,

            participant_id:
                item.participant_id ||
                playerId,

            season:
                season,

            team_name:
                teamName,

            club_name:
                clubName,

            club_logo:
                clubLogo,

            title:
                item.title ||
                "CAMPEÃO",

            awarded_at:
                awardedAt,

            source_id:
                sourceId
        };
    }


    /*
     * ========================================================
     * CHAVE PARA EVITAR DUPLICAÇÃO
     * ========================================================
     */

    function titleKey(item) {

        const x =
            normalizeTitle(item);

        if (!x) {
            return "";
        }

        return [

            x.player_id ||
            x.participant_id ||
            norm(x.player_name),

            competitionKey(
                x.competition_code ||
                x.competition_name
            ),

            norm(x.season)

        ].join("|");
    }


    /*
     * ========================================================
     * RENDER
     * ========================================================
     */

    function render() {

        const list =
            $("#history-list");

        if (!list) {
            return;
        }

        const rows =
            state.filter === "TODOS"

                ? state.all

                : state.all.filter(
                    item =>
                        competitionKey(
                            item.competition_code ||
                            item.competition_name
                        ) === state.filter
                );


        /*
         * CONTADORES
         */

        const total =
            $("#history-total");

        const players =
            $("#history-players");

        const competitions =
            $("#history-competitions");


        if (total) {

            total.textContent =
                String(rows.length);

        }


        if (players) {

            players.textContent =
                String(
                    new Set(
                        rows.map(
                            item =>
                                item.player_id ||
                                item.participant_id ||
                                item.player_name
                        )
                    ).size
                );

        }


        if (competitions) {

            competitions.textContent =
                String(
                    new Set(
                        rows.map(
                            item =>
                                competitionKey(
                                    item.competition_code ||
                                    item.competition_name
                                )
                        )
                    ).size
                );

        }


        /*
         * SEM TÍTULOS
         */

        if (!rows.length) {

            list.innerHTML = `
                <div
                    class="ccfv-history-empty"
                >
                    NENHUM TÍTULO REGISTRADO NESTE FILTRO.
                </div>
            `;

            return;
        }


        /*
         * LISTA DOS CAMPEÕES
         */

        list.innerHTML =
            rows
                .map(
                    item => {

                        const comp =
                            item.competition_name ||
                            item.title ||
                            "COMPETIÇÃO CCFV";

                        const player =
                            item.player_name ||
                            item.participant_name ||
                            "CAMPEÃO";

                        const season =
                            item.season ||
                            item.season_label ||
                            "TEMPORADA";

                        const team =
                            item.team_name ||
                            item.club_name ||
                            "CCFV";

                        return `

                            <article
                                class="ccfv-history-entry"
                            >

                                <div
                                    class="ccfv-history-entry__trophy"
                                >

                                    ${trophy(
                                        item.competition_code ||
                                        comp,
                                        `Troféu ${comp} CCFV`
                                    )}

                                </div>


                                <div>

                                    <div
                                        class="ccfv-history-entry__competition"
                                    >
                                        ${esc(comp)}
                                    </div>


                                    <div
                                        class="ccfv-history-entry__name"
                                    >
                                        ${esc(player)}
                                    </div>


                                    <div
                                        class="ccfv-history-entry__meta"
                                    >
                                        ${esc(team)}
                                        ·
                                        CAMPEÃO
                                    </div>

                                </div>


                                <div
                                    class="ccfv-history-entry__season"
                                >

                                    TEMPORADA

                                    <strong>
                                        ${esc(season)}
                                    </strong>

                                </div>

                            </article>

                        `;
                    }
                )
                .join("");
    }


    /*
     * ========================================================
     * CLIENTE SUPABASE
     * ========================================================
     */

    async function getClient() {

        if (
            window.CCFVAuth &&
            typeof window.CCFVAuth.getClient ===
                "function"
        ) {

            return window.CCFVAuth.getClient();

        }

        throw new Error(
            "Cliente CCFV indisponível."
        );
    }


    /*
     * ========================================================
     * CARREGAMENTO OFICIAL
     * ========================================================
     */

    async function load() {

        try {

            const client =
                await getClient();


            /*
             * ==================================================
             * 1. TABELA ccfv_titles
             * ==================================================
             */

            const titlesResult =
                await client
                    .from("ccfv_titles")
                    .select("*")
                    .order(
                        "awarded_at",
                        {
                            ascending: false
                        }
                    );


            let titles =
                [];


            if (
                !titlesResult.error &&
                Array.isArray(
                    titlesResult.data
                )
            ) {

                titles =
                    titlesResult.data
                        .map(normalizeTitle)
                        .filter(Boolean);

            }


            /*
             * ==================================================
             * 2. HALL OF FAME V4
             * ==================================================
             *
             * Mesmo que ccfv_titles funcione,
             * SEMPRE consultamos o Hall.
             */

            const hallResult =
                await client
                    .from(
                        "ccfv_champions_public_hall_v4"
                    )
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            let hall =
                [];


            if (
                !hallResult.error &&
                Array.isArray(
                    hallResult.data
                )
            ) {

                hall =
                    hallResult.data
                        .map(
                            item =>
                                normalizeTitle({
                                    ...item,

                                    competition_code:
                                        item.competition_code ||
                                        "CHAMPIONS",

                                    competition_name:
                                        item.competition_name ||
                                        "CHAMPIONS LEAGUE",

                                    player_name:
                                        item.participant_name ||
                                        item.player_name,

                                    season:
                                        item.season_label ||
                                        item.season,

                                    awarded_at:
                                        item.created_at
                                })
                        )
                        .filter(Boolean);

            }


            /*
             * ==================================================
             * 3. MERGE + DEDUPE
             * ==================================================
             */

            const merged =
                [
                    ...titles,
                    ...hall
                ];


            const unique =
                new Map();


            merged.forEach(item => {

                const k =
                    titleKey(item);

                if (!k) {
                    return;
                }

                /*
                 * ccfv_titles tem prioridade
                 * sobre o Hall caso os dois tragam
                 * o mesmo título.
                 */

                if (
                    !unique.has(k) ||
                    (
                        String(
                            item.competition_code ||
                            ""
                        ).toUpperCase() ===
                        "CHAMPIONS"
                    )
                ) {

                    unique.set(
                        k,
                        item
                    );

                }

            });


            state.all =
                Array
                    .from(
                        unique.values()
                    )
                    .sort(
                        (a, b) => {

                            const da =
                                a.awarded_at
                                    ? new Date(
                                        a.awarded_at
                                    ).getTime()
                                    : 0;

                            const db =
                                b.awarded_at
                                    ? new Date(
                                        b.awarded_at
                                    ).getTime()
                                    : 0;

                            return db - da;

                        }
                    );


            console.log(
                "CCFV // HISTÓRIA CARREGADA:",
                {
                    ccfv_titles:
                        titles.length,

                    hall:
                        hall.length,

                    total:
                        state.all.length
                }
            );


            render();

        } catch (error) {

            console.error(
                "CCFV // HISTORY:",
                error
            );


            const list =
                $("#history-list");

            if (list) {

                list.innerHTML = `
                    <div
                        class="ccfv-history-empty"
                    >
                        NÃO FOI POSSÍVEL CARREGAR O LIVRO DOS CAMPEÕES.
                    </div>
                `;

            }

        }
    }


    /*
     * ========================================================
     * FILTROS
     * ========================================================
     */

    function bindFilters() {

        document
            .querySelectorAll(
                "[data-filter]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            document
                                .querySelectorAll(
                                    "[data-filter]"
                                )
                                .forEach(
                                    item =>
                                        item.classList.remove(
                                            "is-active"
                                        )
                                );


                            button.classList.add(
                                "is-active"
                            );


                            state.filter =
                                button.dataset.filter ||
                                "TODOS";


                            render();

                        }
                    );

                }
            );
    }


    /*
     * ========================================================
     * AUTO REFRESH
     * ========================================================
     */

    function startAutoRefresh() {

        window.setInterval(
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    load();

                }

            },
            15000
        );

    }


    /*
     * ========================================================
     * INIT
     * ========================================================
     */

    async function init() {

        bindFilters();

        await load();

        startAutoRefresh();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();