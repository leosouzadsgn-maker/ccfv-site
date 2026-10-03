/* =========================================================
   CCFV // HISTÓRIA — LIVRO OFICIAL DOS CAMPEÕES
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

    function trophy(value, alt) {

        return `
            <img
                src="${esc(
                    trophyPath(value)
                )}"
                alt="${esc(
                    alt || "Troféu CCFV"
                )}"
                loading="lazy"
                decoding="async"
            >
        `;
    }


    /* =========================================================
       NORMALIZAÇÃO
       ========================================================= */

    function normalizeTitle(item) {

        if (!item) {
            return null;
        }

        const playerId =
            item.player_id ||
            item.participant_id ||
            null;

        const playerName =
            item.player_name ||
            item.participant_name ||
            item.name ||
            "CAMPEÃO";

        const competitionCode =
            item.competition_code ||
            (
                item.competition_name
                    ? competitionKey(
                        item.competition_name
                    )
                    : "OUTRA"
            );

        const competitionName =
            item.competition_name ||
            (
                competitionCode === "CHAMPIONS"
                    ? "CHAMPIONS LEAGUE"
                    : "COMPETIÇÃO CCFV"
            );

        const season =
            item.season ||
            item.season_label ||
            (
                item.season_number
                    ? `SEASON ${String(
                        item.season_number
                    ).padStart(2, "0")}`
                    : "TEMPORADA"
            );

        const teamName =
            item.team_name ||
            item.club_name ||
            "CCFV";

        return {

            ...item,

            player_id: playerId,

            participant_id:
                item.participant_id ||
                playerId,

            player_name:
                playerName,

            participant_name:
                item.participant_name ||
                playerName,

            competition_code:
                competitionCode,

            competition_name:
                competitionName,

            season:
                season,

            team_name:
                teamName,

            club_name:
                item.club_name ||
                teamName,

            club_logo:
                item.club_logo ||
                item.logo_path ||
                "",

            title:
                item.title ||
                "CAMPEÃO",

            awarded_at:
                item.awarded_at ||
                item.created_at ||
                null
        };
    }


    function titleKey(item) {

        const player =
            item.player_id ||
            item.participant_id ||
            norm(item.player_name);

        const competition =
            competitionKey(
                item.competition_code ||
                item.competition_name
            );

        const season =
            norm(
                item.season ||
                item.season_label ||
                ""
            );

        return [
            player,
            competition,
            season
        ].join("|");
    }


    /* =========================================================
       RENDER
       ========================================================= */

    function render() {

        const list =
            $("#history-list");

        if (!list) {
            return;
        }

        const filtered =
            state.filter === "TODOS"

                ? state.all

                : state.all.filter(
                    item =>
                        competitionKey(
                            item.competition_code ||
                            item.competition_name
                        ) ===
                        state.filter
                );


        const total =
            $("#history-total");

        const players =
            $("#history-players");

        const competitions =
            $("#history-competitions");


        if (total) {

            total.textContent =
                String(
                    filtered.length
                );

        }


        if (players) {

            players.textContent =
                String(
                    new Set(
                        filtered.map(
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
                        filtered.map(
                            item =>
                                competitionKey(
                                    item.competition_code ||
                                    item.competition_name
                                )
                        )
                    ).size
                );

        }


        if (!filtered.length) {

            list.innerHTML = `
                <div
                    class="ccfv-history-empty"
                >
                    NENHUM TÍTULO REGISTRADO NESTE FILTRO.
                </div>
            `;

            return;
        }


        list.innerHTML =
            filtered
                .map(item => {

                    const competition =
                        item.competition_name ||
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
                                    competition,
                                    `Troféu ${competition} CCFV`
                                )}
                            </div>

                            <div>

                                <div
                                    class="ccfv-history-entry__competition"
                                >
                                    ${esc(
                                        competition
                                    )}
                                </div>

                                <div
                                    class="ccfv-history-entry__name"
                                >
                                    ${esc(
                                        player
                                    )}
                                </div>

                                <div
                                    class="ccfv-history-entry__meta"
                                >
                                    ${esc(
                                        team
                                    )}
                                    ·
                                    CAMPEÃO
                                </div>

                            </div>

                            <div
                                class="ccfv-history-entry__season"
                            >
                                TEMPORADA

                                <strong>
                                    ${esc(
                                        season
                                    )}
                                </strong>
                            </div>

                        </article>
                    `;

                })
                .join("");
    }


    /* =========================================================
       SUPABASE
       ========================================================= */

    async function getClient() {

        if (
            window.CCFVAuth &&
            typeof window.CCFVAuth.getClient ===
                "function"
        ) {

            return await window.CCFVAuth.getClient();

        }

        throw new Error(
            "Cliente CCFV indisponível."
        );
    }


    /* =========================================================
       CARREGAMENTO
       ========================================================= */

    async function load() {

        try {

            const client =
                await getClient();


            /*
             * =================================================
             * FONTE PRINCIPAL
             * ccfv_titles
             * =================================================
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


            let titles = [];


            if (
                !titlesResult.error &&
                Array.isArray(
                    titlesResult.data
                )
            ) {

                titles =
                    titlesResult.data
                        .map(
                            normalizeTitle
                        )
                        .filter(Boolean);

            }


            /*
             * =================================================
             * BUSCA DOS NOMES DOS JOGADORES
             * =================================================
             */

            const playersResult =
                await client
                    .from("players")
                    .select(
                        "id,name,photo_url,team_name"
                    );


            const playersMap =
                new Map();


            if (
                !playersResult.error &&
                Array.isArray(
                    playersResult.data
                )
            ) {

                playersResult.data.forEach(
                    player => {

                        playersMap.set(
                            String(player.id),
                            player
                        );

                    }
                );

            }


            /*
             * Completa informações que eventualmente
             * não vieram em ccfv_titles.
             */

            titles =
                titles.map(item => {

                    const player =
                        playersMap.get(
                            String(
                                item.player_id ||
                                item.participant_id ||
                                ""
                            )
                        );


                    return normalizeTitle({

                        ...item,

                        player_name:
                            item.player_name ||
                            player?.name,

                        participant_name:
                            item.participant_name ||
                            player?.name,

                        team_name:
                            item.team_name ||
                            player?.team_name ||
                            item.club_name

                    });

                });


            /*
             * =================================================
             * HALL OF FAME
             * =================================================
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


            let hall = [];


            if (
                !hallResult.error &&
                Array.isArray(
                    hallResult.data
                )
            ) {

                hall =
                    hallResult.data
                        .map(item =>
                            normalizeTitle({

                                ...item,

                                competition_code:
                                    item.competition_code ||
                                    "CHAMPIONS",

                                competition_name:
                                    item.competition_name ||
                                    "CHAMPIONS LEAGUE",

                                player_name:
                                    item.participant_name,

                                participant_name:
                                    item.participant_name,

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
             * =================================================
             * HISTÓRICO DA CHAMPIONS
             * =================================================
             *
             * Fallback adicional.
             */

            const historyResult =
                await client
                    .from(
                        "championship_history"
                    )
                    .select("*")
                    .eq(
                        "final_position",
                        1
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            let history = [];


            if (
                !historyResult.error &&
                Array.isArray(
                    historyResult.data
                )
            ) {

                history =
                    historyResult.data
                        .map(item => {

                            const player =
                                playersMap.get(
                                    String(
                                        item.participant_id ||
                                        ""
                                    )
                                );


                            return normalizeTitle({

                                ...item,

                                competition_code:
                                    "CHAMPIONS",

                                competition_name:
                                    "CHAMPIONS LEAGUE",

                                player_id:
                                    item.participant_id,

                                participant_id:
                                    item.participant_id,

                                player_name:
                                    player?.name ||
                                    item.participant_name,

                                participant_name:
                                    player?.name ||
                                    item.participant_name,

                                team_name:
                                    item.club_name ||
                                    player?.team_name,

                                club_name:
                                    item.club_name,

                                season:
                                    item.season_label ||
                                    item.season ||
                                    "SEASON 01",

                                awarded_at:
                                    item.created_at

                            });

                        })
                        .filter(Boolean);

            }


            /*
             * =================================================
             * MERGE
             * =================================================
             *
             * Todos os títulos permanecem.
             * Apenas duplicações do mesmo:
             *
             * jogador + competição + temporada
             *
             * são removidas.
             */

            const map =
                new Map();


            [
                ...titles,
                ...hall,
                ...history
            ]
                .forEach(item => {

                    const normalized =
                        normalizeTitle(item);

                    if (!normalized) {
                        return;
                    }

                    const key =
                        titleKey(
                            normalized
                        );

                    if (!key) {
                        return;
                    }

                    if (
                        !map.has(key)
                    ) {

                        map.set(
                            key,
                            normalized
                        );

                    }

                });


            state.all =
                Array
                    .from(
                        map.values()
                    )
                    .sort(
                        (a, b) => {

                            const dateA =
                                a.awarded_at
                                    ? new Date(
                                        a.awarded_at
                                    ).getTime()
                                    : 0;

                            const dateB =
                                b.awarded_at
                                    ? new Date(
                                        b.awarded_at
                                    ).getTime()
                                    : 0;

                            return (
                                dateB -
                                dateA
                            );

                        }
                    );


            console.log(
                "CCFV // HISTÓRIA OFICIAL",
                {
                    titles:
                        titles.length,

                    hall:
                        hall.length,

                    championshipHistory:
                        history.length,

                    total:
                        state.all.length
                }
            );


            render();

        } catch (error) {

            console.error(
                "CCFV // HISTORY ERROR:",
                error
            );

            const list =
                $("#history-list");

            if (list) {

                list.innerHTML = `
                    <div
                        class="ccfv-history-empty"
                    >
                        ERRO AO CARREGAR O LIVRO DOS CAMPEÕES.
                    </div>
                `;

            }

        }
    }


    /* =========================================================
       FILTROS
       ========================================================= */

    function bindFilters() {

        document
            .querySelectorAll(
                "[data-filter]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                "[data-filter]"
                            )
                            .forEach(item =>
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

            });
    }


    /* =========================================================
       INIT
       ========================================================= */

    async function init() {

        bindFilters();

        await load();


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