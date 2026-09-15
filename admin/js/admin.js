/* =========================================================
   CCFV ADMIN
   PLAYER MANAGEMENT
   SUPABASE + COMPETITIONS + PHOTO UPLOAD
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const PLAYERS_TABLE =
        "players";

    const COMPETITIONS_TABLE =
        "player_competitions";

    const PHOTO_BUCKET =
        "player-photos";


    const CHAMPIONS_SEASON_ID =
        "362284ef-e410-45b8-890b-630f1130f9d2";

    const CHAMPIONS_CLUBS =
        [
        {
                "name": "Real Madrid",
                "slug": "real_madrid",
                "id": "97762f56-2f71-4391-9740-82bf271eecaf"
        },
        {
                "name": "Barcelona",
                "slug": "barcelona",
                "id": "32829574-ddcd-4767-b2d3-550941cda564"
        },
        {
                "name": "Atlético de Madrid",
                "slug": "atletico_madrid",
                "id": "b9a26deb-a555-4068-a13a-a6caf70309fe"
        },
        {
                "name": "Manchester City",
                "slug": "manchester_city",
                "id": "ea34bb12-79b4-462a-b6f0-acd8daaf3f59"
        },
        {
                "name": "Manchester United",
                "slug": "manchester_united",
                "id": "d0e5285b-5a8c-4143-919e-a892835f9e9e"
        },
        {
                "name": "Liverpool",
                "slug": "liverpool",
                "id": "d967a615-db1c-4ba6-9337-ad964bb087b9"
        },
        {
                "name": "Arsenal",
                "slug": "arsenal",
                "id": "3e84811c-f238-4b91-a244-f9bd64eccccf"
        },
        {
                "name": "Chelsea",
                "slug": "chelsea",
                "id": "f27adc91-8a5f-4374-9e2a-e0ff09535ffd"
        },
        {
                "name": "Inter de Milão",
                "slug": "inter_milao",
                "id": "cc7509a3-87b1-4a0d-9023-b8c115dac7fe"
        },
        {
                "name": "Milan",
                "slug": "milan",
                "id": "390242ea-a560-4eca-804c-672c6b73a608"
        },
        {
                "name": "Juventus",
                "slug": "juventus",
                "id": "09f4d9ee-9a55-45fb-95be-f01f3aee0e41"
        },
        {
                "name": "Napoli",
                "slug": "napoli",
                "id": "a5dde0fd-0d45-438a-b68e-c8aa342ca676"
        },
        {
                "name": "Roma",
                "slug": "roma",
                "id": "91a21c0d-1f21-4be4-8278-3043743cdae9"
        },
        {
                "name": "Lazio",
                "slug": "lazio",
                "id": "6b7fdf57-6045-4513-a70e-59c557674657"
        },
        {
                "name": "Paris Saint-Germain",
                "slug": "psg",
                "id": "5264fa12-513c-4ef9-9bd8-6d3be5e2c4fb"
        },
        {
                "name": "Olympique de Marseille",
                "slug": "marseille",
                "id": "a2632411-2914-4dfd-a3c9-5e0a1b55faf9"
        },
        {
                "name": "Monaco",
                "slug": "monaco",
                "id": "b048e2ae-2875-4949-8bd5-e254fbe0ebfb"
        },
        {
                "name": "Lyon",
                "slug": "lyon",
                "id": "ce8e010a-984c-4254-936e-b40fa9d4661d"
        },
        {
                "name": "Benfica",
                "slug": "benfica",
                "id": "7642971a-9300-44b0-87af-caf348d45cdc"
        },
        {
                "name": "Porto",
                "slug": "porto",
                "id": "451a3868-0f0c-4ba7-8e42-d64ead2d2dee"
        },
        {
                "name": "Sporting",
                "slug": "sporting",
                "id": "9d465afc-7846-4cbc-b551-11867896ea5d"
        },
        {
                "name": "Braga",
                "slug": "braga",
                "id": "2c12361c-5964-4014-99b6-a729ff690000"
        },
        {
                "name": "Ajax",
                "slug": "ajax",
                "id": "081f52ef-ad56-47a5-aa4d-939f891370e5"
        },
        {
                "name": "PSV",
                "slug": "psv",
                "id": "80cd91d5-a45c-4bba-8015-86adae7cc4b8"
        },
        {
                "name": "Feyenoord",
                "slug": "feyenoord",
                "id": "d6c8e32b-6e66-46aa-9efb-564bea78de8b"
        },
        {
                "name": "Galatasaray",
                "slug": "galatasaray",
                "id": "3453f1f4-2bcb-4241-8b3e-e184f6802963"
        },
        {
                "name": "Fenerbahçe",
                "slug": "fenerbahce",
                "id": "b6a1230a-60fa-484f-bf37-21e14405c5d7"
        },
        {
                "name": "Beşiktaş",
                "slug": "besiktas",
                "id": "9e3d9652-d476-43a9-bfb7-e99bba891294"
        },
        {
                "name": "Celtic",
                "slug": "celtic",
                "id": "fe555b7c-6fb5-474f-b58f-73a297be0c25"
        },
        {
                "name": "Rangers",
                "slug": "rangers",
                "id": "d3c0cfff-704f-461f-a7da-f65e0898eb0b"
        },
        {
                "name": "Club Brugge",
                "slug": "club_brugge",
                "id": "d1d61831-69ba-415c-a0e1-43379c1b8ac9"
        },
        {
                "name": "Anderlecht",
                "slug": "anderlecht",
                "id": "a0ff081f-15f7-4aac-96c5-e5b16388f451"
        }
];



    /* =====================================================
       BRASILEIRÃO
       ===================================================== */

    const BRASILEIRAO_TEAMS = [

        "ATHLETICO-PR",

        "ATLÉTICO-MG",

        "BAHIA",

        "BOTAFOGO",

        "BRAGANTINO",

        "CHAPECOENSE",

        "CORINTHIANS",

        "CORITIBA",

        "CRUZEIRO",

        "FLAMENGO",

        "FLUMINENSE",

        "GRÊMIO",

        "INTERNACIONAL",

        "MIRASSOL",

        "PALMEIRAS",

        "REMO",

        "SANTOS",

        "SÃO PAULO",

        "VASCO",

        "VITÓRIA"

    ];


    /* =====================================================
       RANKING
       ===================================================== */

    const RANK_CONFIG = {

        beginner: {

            name:
                "INICIANTE",

            key:
                "beginner",

            min:
                0,

            max:
                999,

            color:
                "#8d9a95"

        },

        amateur: {

            name:
                "AMADOR",

            key:
                "amateur",

            min:
                1000,

            max:
                1999,

            color:
                "#69a8ff"

        },

        professional: {

            name:
                "PROFISSIONAL",

            key:
                "professional",

            min:
                2000,

            max:
                2999,

            color:
                "#43df91"

        },

        legend: {

            name:
                "LENDA",

            key:
                "legend",

            min:
                3000,

            max:
                Infinity,

            color:
                "#ffc252"

        }

    };


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient =
        null;

    let players =
        [];

    let activePlatformFilter =
        "all";

    let editingPlayerId =
        null;

    let currentPhotoUrl =
        null;


    /* =====================================================
       DOM
       ===================================================== */

    const dom = {

        sidebar:
            document.querySelector(
                "#admin-sidebar"
            ),

        mobileMenu:
            document.querySelector(
                "#admin-mobile-menu"
            ),

        navItems:
            document.querySelectorAll(
                ".ccfv-admin-nav__item"
            ),

        sections:
            document.querySelectorAll(
                ".ccfv-admin-section"
            ),

        openSectionButtons:
            document.querySelectorAll(
                "[data-open-section]"
            ),

        modal:
            document.querySelector(
                "#player-modal"
            ),

        modalTitle:
            document.querySelector(
                "#player-modal-title"
            ),

        closeModalButtons:
            document.querySelectorAll(
                "[data-close-player-modal]"
            ),

        form:
            document.querySelector(
                "#player-form"
            ),

        newPlayerButton:
            document.querySelector(
                "#new-player-button"
            ),

        openNewPlayerButtons:
            document.querySelectorAll(
                "[data-open-new-player]"
            ),

        playerSearch:
            document.querySelector(
                "#admin-player-search"
            ),

        playerFilterButtons:
            document.querySelectorAll(
                "[data-admin-filter]"
            ),

        playerTable:
            document.querySelector(
                "#admin-players-table"
            ),

        playerEmpty:
            document.querySelector(
                "#admin-players-empty"
            ),

        statPlayers:
            document.querySelector(
                "#stat-players"
            ),

        statMatches:
            document.querySelector(
                "#stat-matches"
            ),

        playerId:
            document.querySelector(
                "#player-id"
            ),

        playerName:
            document.querySelector(
                "#player-name"
            ),

        playerInstagram:
            document.querySelector(
                "#player-instagram"
            ),

        playerPlatform:
            document.querySelector(
                "#player-platform"
            ),

        playerPhotoFile:
            document.querySelector(
                "#player-photo-file"
            ),

        playerPhotoPreview:
            document.querySelector(
                "#player-photo-preview"
            ),

        competitionBrasileirao:
            document.querySelector(
                "#competition-brasileirao"
            ),

        competitionBrasileiraoLabel:
            document.querySelector(
                "#competition-brasileirao-label"
            ),

        competitionNight:
            document.querySelector(
                "#competition-night"
            ),

        competitionNightLabel:
            document.querySelector(
                "#competition-night-label"
            ),

        brasileiraoConfig:
            document.querySelector(
                "#brasileirao-config"
            ),

        brasileiraoTeam:
            document.querySelector(
                "#brasileirao-team"
            ),

        nightConfig:
            document.querySelector(
                "#night-config"
            ),

        nightTeam:
            document.querySelector(
                "#night-team"
            ),

        playerRankPreview:
            document.querySelector(
                "#player-rank-preview"
            ),

        playerEloPreview:
            document.querySelector(
                "#player-elo-preview"
            ),

        toast:
            document.querySelector(
                "#admin-toast"
            )

    };


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


    function getInitials(
        name
    ) {

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


        if (
            !words.length
        ) {

            return "--";

        }


        if (
            words.length === 1
        ) {

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


    function getRank(
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


    function formatNumber(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR"
        );

    }


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
                "Sistema de autenticação não está disponível."
            );

        }


        supabaseClient =
            await window.CCFVAuth.getClient();


        return supabaseClient;

    }


    /* =====================================================
       PLAYER CODE
       ===================================================== */

    async function generatePlayerCode() {

        const client =
            await getSupabase();


        const {
            data,
            error
        } =
            await client

                .from(
                    PLAYERS_TABLE
                )

                .select(
                    "player_code"
                );


        if (
            error
        ) {

            throw error;

        }


        let highest =
            0;


        (
            data || []
        )
            .forEach(
                player => {

                    const match =
                        String(
                            player.player_code ||
                            ""
                        )
                            .match(
                                /CCFV-(\d+)/i
                            );


                    if (
                        match
                    ) {

                        highest =
                            Math.max(
                                highest,
                                Number(
                                    match[1]
                                )
                            );

                    }

                }
            );


        return (
            "CCFV-" +
            String(
                highest + 1
            ).padStart(
                3,
                "0"
            )
        );

    }


    /* =====================================================
       CARREGAR JOGADORES + COMPETIÇÕES
       ===================================================== */

    async function loadPlayers() {

        try {

            const client =
                await getSupabase();


            const playersResult =
                await client

                    .from(
                        PLAYERS_TABLE
                    )

                    .select(
                        "*"
                    )

                    .order(
                        "elo",
                        {
                            ascending:
                                false
                        }
                    );


            if (
                playersResult.error
            ) {

                throw playersResult.error;

            }


            const competitionsResult =
                await client

                    .from(
                        COMPETITIONS_TABLE
                    )

                    .select(
                        "*"
                    );


            if (
                competitionsResult.error
            ) {

                throw competitionsResult.error;

            }


            const competitions =
                competitionsResult.data ||
                [];


            players =
                (
                    playersResult.data ||
                    []
                )
                .map(
                    player => {

                        return {

                            ...player,

                            competitions:
                                competitions.filter(
                                    item =>
                                        String(
                                            item.player_id
                                        ) ===
                                        String(
                                            player.id
                                        )
                                )

                        };

                    }
                );


            renderPlayers();

            updateDashboardStats();


        }

        catch (
            error
        ) {

            console.error(
                "CCFV // LOAD PLAYERS ERROR:",
                error
            );


            players =
                [];


            renderPlayers();

            updateDashboardStats();


            showToast(
                "ERRO AO CARREGAR JOGADORES."
            );

        }

    }


    /* =====================================================
       FILTER
       ===================================================== */

    function getFilteredPlayers() {

        const search =
            String(
                dom.playerSearch?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        return players

            .filter(
                player => {

                    const platform =
                        String(
                            player.platform ||
                            ""
                        ).toUpperCase();


                    const platformOK =
                        activePlatformFilter ===
                            "all" ||

                        platform ===
                            activePlatformFilter;


                    const name =
                        String(
                            player.name ||
                            ""
                        )
                            .toLowerCase();


                    const instagram =
                        String(
                            player.instagram ||
                            ""
                        )
                            .toLowerCase();


                    const searchOK =
                        !search ||

                        name.includes(
                            search
                        ) ||

                        instagram.includes(
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
                ) => {

                    return (
                        Number(
                            b.elo || 0
                        ) -

                        Number(
                            a.elo || 0
                        )
                    );

                }
            );

    }


    /* =====================================================
       COMPETIÇÕES HTML
       ===================================================== */

    function competitionBadges(
        competitions
    ) {

        if (
            !competitions ||
            !competitions.length
        ) {

            return `
                <span
                    class="admin-badge"
                >
                    SEM COMPETIÇÃO
                </span>
            `;

        }


        return competitions

            .map(
                item => {

                    const name =
                        item.competition ===
                            "BRASILEIRAO"

                            ? "BRASILEIRÃO"

                            : "NIGHT CUP";


                    return `
                        <span
                            class="admin-badge"
                            style="margin-right:4px;"
                        >
                            ${escapeHTML(
                                name
                            )}
                        </span>
                    `;

                }
            )

            .join("");

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderPlayers() {

        if (
            !dom.playerTable
        ) {

            return;

        }


        const filtered =
            getFilteredPlayers();


        dom.playerTable.innerHTML =
            "";


        if (
            !filtered.length
        ) {

            dom.playerEmpty?.classList.add(
                "is-visible"
            );

            return;

        }


        dom.playerEmpty?.classList.remove(
            "is-visible"
        );


        filtered.forEach(
            (
                player,
                index
            ) => {

                const rank =
                    getRank(
                        player.elo
                    );


                const row =
                    document.createElement(
                        "tr"
                    );


                const photoHTML =
                    player.photo_url

                        ?

                        `
                            <img
                                src="${escapeHTML(
                                    player.photo_url
                                )}"
                                alt="${escapeHTML(
                                    player.name
                                )}"
                            >
                        `

                        :

                        escapeHTML(
                            getInitials(
                                player.name
                            )
                        );


                row.innerHTML = `

                    <td>

                        ${String(
                            index + 1
                        ).padStart(
                            2,
                            "0"
                        )}

                    </td>


                    <td>

                        <div
                            class="admin-player"
                        >

                            <div
                                class="admin-player__photo"
                            >

                                ${photoHTML}

                            </div>


                            <div
                                class="admin-player__name"
                            >

                                <strong>

                                    ${escapeHTML(
                                        player.name
                                    )}

                                </strong>


                                <small>

                                    @${escapeHTML(
                                        player.instagram ||
                                        ""
                                    )}

                                </small>

                            </div>

                        </div>

                    </td>


                    <td>

                        ${escapeHTML(
                            player.platform
                        )}

                    </td>


                    <td>

                        <span
                            class="admin-elo"
                        >

                            ${formatNumber(
                                player.elo
                            )}

                        </span>

                    </td>


                    <td>

                        <span
                            class="
                                admin-badge
                                admin-badge--${rank.key}
                            "
                        >

                            ${escapeHTML(
                                rank.name
                            )}

                        </span>

                    </td>


                    <td>

                        ${competitionBadges(
                            player.competitions
                        )}

                    </td>


                    <td>

                        <span
                            class="admin-status"
                        >

                            <i></i>

                            ${
                                player.status ===
                                "ACTIVE"
                                    ? "ATIVO"
                                    : "INATIVO"
                            }

                        </span>

                    </td>


                    <td>

                        <div
                            class="admin-actions"
                        >

                            <button
                                type="button"
                                data-edit-player="${escapeHTML(
                                    player.id
                                )}"
                            >
                                EDITAR
                            </button>


                            <button
                                type="button"
                                class="delete"
                                data-delete-player="${escapeHTML(
                                    player.id
                                )}"
                            >
                                EXCLUIR
                            </button>

                        </div>

                    </td>

                `;


                dom.playerTable.appendChild(
                    row
                );

            }
        );


        bindPlayerRowActions();

    }


    /* =====================================================
       DASHBOARD
       ===================================================== */

    function updateDashboardStats() {

        if (
            dom.statPlayers
        ) {

            dom.statPlayers.textContent =
                String(
                    players.length
                ).padStart(
                    2,
                    "0"
                );

        }


        if (
            dom.statMatches
        ) {

            dom.statMatches.textContent =
                "00";

        }

    }


    /* =====================================================
       FOTO PREVIEW
       ===================================================== */

    function resetPhotoPreview() {

        currentPhotoUrl =
            null;


        if (
            dom.playerPhotoPreview
        ) {

            dom.playerPhotoPreview.innerHTML =
                "FOTO";

        }


        if (
            dom.playerPhotoFile
        ) {

            dom.playerPhotoFile.value =
                "";

        }

    }


    function setPhotoPreview(
        file
    ) {

        if (
            !file ||
            !dom.playerPhotoPreview
        ) {

            return;

        }


        const url =
            URL.createObjectURL(
                file
            );


        dom.playerPhotoPreview.innerHTML = `

            <img
                src="${url}"
                alt="Prévia da foto"
            >

        `;

    }


    /* =====================================================
       UPLOAD FOTO
       ===================================================== */

    async function uploadPlayerPhoto(
        file,
        playerId
    ) {

        if (
            !file
        ) {

            return currentPhotoUrl;

        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            throw new Error(
                "Selecione uma imagem válida."
            );

        }


        const client =
            await getSupabase();


        const extension =
            (
                file.name
                    .split(".")
                    .pop() ||
                "jpg"
            )
                .toLowerCase();


        const fileName =
            `${Date.now()}-${crypto.randomUUID()}.${extension}`;


        const filePath =
            `${playerId}/${fileName}`;


        const {
            error:
                uploadError
        } =
            await client
                .storage
                .from(
                    PHOTO_BUCKET
                )
                .upload(
                    filePath,
                    file,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            file.type
                    }
                );


        if (
            uploadError
        ) {

            throw uploadError;

        }


        const {
            data
        } =
            client
                .storage
                .from(
                    PHOTO_BUCKET
                )
                .getPublicUrl(
                    filePath
                );


        return (
            data?.publicUrl ||
            null
        );

    }


    /* =====================================================
       COMPETIÇÃO UI
       ===================================================== */

    function updateChampionsUI() {

        const enabled =
            Boolean(
                dom.competitionChampions?.checked
            );

        if (
            dom.competitionChampionsLabel
        ) {

            dom.competitionChampionsLabel
                .classList.toggle(
                    "is-selected",
                    enabled
                );

        }

        if (
            dom.championsConfig
        ) {

            dom.championsConfig
                .classList.toggle(
                    "is-visible",
                    enabled
                );

        }

        if (
            dom.championsTeam
        ) {

            dom.championsTeam.disabled =
                !enabled;

        }

        if (
            dom.championsTeamStatus
        ) {

            const selected =
                CHAMPIONS_CLUBS.find(
                    club =>
                        String(
                            club.id
                        ) ===
                        String(
                            dom.championsTeam?.value ||
                            ""
                        )
                );

            dom.championsTeamStatus.textContent =
                selected
                    ? `Clube selecionado: ${selected.name}`
                    : "Os 32 clubes da Season 01 estão disponíveis.";

        }

    }


    function updateCompetitionUI() {

        const brasileirao =
            Boolean(
                dom.competitionBrasileirao?.checked
            );


        const night =
            Boolean(
                dom.competitionNight?.checked
            );


        updateChampionsUI();

        /*
         * Estado visual do BRASILEIRÃO.
         * Mantemos a classe original e também
         * aplicamos o estado diretamente no elemento
         * para não depender de outra regra CSS.
         */

        if (
            dom.competitionBrasileiraoLabel
        ) {

            dom.competitionBrasileiraoLabel
                .classList.toggle(
                    "is-selected",
                    brasileirao
                );

            dom.competitionBrasileiraoLabel
                .setAttribute(
                    "aria-checked",
                    brasileirao
                        ? "true"
                        : "false"
                );

            dom.competitionBrasileiraoLabel.style.borderColor =
                brasileirao
                    ? "rgba(67,223,145,.72)"
                    : "rgba(255,255,255,.07)";

            dom.competitionBrasileiraoLabel.style.background =
                brasileirao
                    ? "rgba(67,223,145,.10)"
                    : "rgba(255,255,255,.015)";

            dom.competitionBrasileiraoLabel.style.color =
                brasileirao
                    ? "#43df91"
                    : "rgba(255,255,255,.38)";

            dom.competitionBrasileiraoLabel.style.boxShadow =
                brasileirao
                    ? "0 0 0 1px rgba(67,223,145,.12), 0 10px 24px rgba(67,223,145,.06)"
                    : "none";

        }


        /*
         * Estado visual da NIGHT CUP.
         */

        if (
            dom.competitionNightLabel
        ) {

            dom.competitionNightLabel
                .classList.toggle(
                    "is-selected",
                    night
                );

            dom.competitionNightLabel
                .setAttribute(
                    "aria-checked",
                    night
                        ? "true"
                        : "false"
                );

            dom.competitionNightLabel.style.borderColor =
                night
                    ? "rgba(67,223,145,.72)"
                    : "rgba(255,255,255,.07)";

            dom.competitionNightLabel.style.background =
                night
                    ? "rgba(67,223,145,.10)"
                    : "rgba(255,255,255,.015)";

            dom.competitionNightLabel.style.color =
                night
                    ? "#43df91"
                    : "rgba(255,255,255,.38)";

            dom.competitionNightLabel.style.boxShadow =
                night
                    ? "0 0 0 1px rgba(67,223,145,.12), 0 10px 24px rgba(67,223,145,.06)"
                    : "none";

        }


        /*
         * Caixa de seleção do BRASILEIRÃO.
         */

        const brasileiraoBox =
            dom.competitionBrasileiraoLabel
                ?.querySelector(
                    ".ccfv-competition-check__box"
                );


        if (
            brasileiraoBox
        ) {

            brasileiraoBox.style.borderColor =
                brasileirao
                    ? "#43df91"
                    : "rgba(255,255,255,.16)";

            brasileiraoBox.style.background =
                brasileirao
                    ? "#43df91"
                    : "rgba(255,255,255,.02)";

            brasileiraoBox.style.color =
                brasileirao
                    ? "#031008"
                    : "transparent";

        }


        /*
         * Caixa de seleção da NIGHT CUP.
         */

        const nightBox =
            dom.competitionNightLabel
                ?.querySelector(
                    ".ccfv-competition-check__box"
                );


        if (
            nightBox
        ) {

            nightBox.style.borderColor =
                night
                    ? "#43df91"
                    : "rgba(255,255,255,.16)";

            nightBox.style.background =
                night
                    ? "#43df91"
                    : "rgba(255,255,255,.02)";

            nightBox.style.color =
                night
                    ? "#031008"
                    : "transparent";

        }


        /*
         * Mostra/esconde a configuração do Brasileirão.
         */

        dom.brasileiraoConfig
            ?.classList.toggle(
                "is-visible",
                brasileirao
            );


        if (
            dom.brasileiraoConfig
        ) {

            dom.brasileiraoConfig.style.display =
                brasileirao
                    ? "block"
                    : "none";

        }


        /*
         * Mostra/esconde a configuração da Night Cup.
         */

        dom.nightConfig
            ?.classList.toggle(
                "is-visible",
                night
            );


        if (
            dom.nightConfig
        ) {

            dom.nightConfig.style.display =
                night
                    ? "block"
                    : "none";

        }

    }


    /* =====================================================
       ABRIR NOVO
       ===================================================== */

    function openNewPlayer() {

        editingPlayerId =
            null;


        currentPhotoUrl =
            null;


        dom.modalTitle.textContent =
            "NOVO JOGADOR.";


        dom.form.reset();


        dom.playerPlatform.value =
            "PC";


        dom.competitionBrasileirao.checked =
            false;


        dom.competitionNight.checked =
            false;


        if (
            dom.competitionChampions
        ) {
            dom.competitionChampions.checked =
                false;
        }

        if (
            dom.championsTeam
        ) {
            dom.championsTeam.value =
                "";
        }


        dom.brasileiraoTeam.value =
            "";


        dom.nightTeam.value =
            "";


        resetPhotoPreview();


        updateCompetitionUI();

        updateRankPreview();


        dom.modal.classList.add(
            "is-open"
        );


        dom.modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    /* =====================================================
       EDITAR
       ===================================================== */

    function openEditPlayer(
        id
    ) {

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
            !player
        ) {

            return;

        }


        editingPlayerId =
            player.id;


        currentPhotoUrl =
            player.photo_url ||
            null;


        dom.modalTitle.textContent =
            "EDITAR JOGADOR.";


        dom.playerId.value =
            player.id;


        dom.playerName.value =
            player.name || "";


        dom.playerInstagram.value =
            player.instagram || "";


        dom.playerPlatform.value =
            player.platform || "PC";


        dom.competitionBrasileirao.checked =
            false;


        dom.competitionNight.checked =
            false;


        if (
            dom.competitionChampions
        ) {
            dom.competitionChampions.checked =
                false;
        }

        if (
            dom.championsTeam
        ) {
            dom.championsTeam.value =
                "";
        }


        dom.brasileiraoTeam.value =
            "";


        dom.nightTeam.value =
            "";


        (
            player.competitions ||
            []
        )
            .forEach(
                item => {

                    if (
                        item.competition ===
                        "BRASILEIRAO"
                    ) {

                        dom.competitionBrasileirao.checked =
                            true;


                        dom.brasileiraoTeam.value =
                            item.team_name || "";

                    }


                    if (
                        item.competition ===
                        "CHAMPIONS_LEAGUE"
                    ) {

                        if (
                            dom.competitionChampions
                        ) {
                            dom.competitionChampions.checked =
                                true;
                        }

                        const club =
                            CHAMPIONS_CLUBS.find(
                                itemClub =>
                                    String(
                                        itemClub.name
                                    ).toLowerCase() ===
                                    String(
                                        item.team_name ||
                                        ""
                                    ).toLowerCase()
                            );

                        if (
                            club &&
                            dom.championsTeam
                        ) {
                            dom.championsTeam.value =
                                club.id;
                        }

                    }


                    if (
                        item.competition ===
                        "NIGHT_CUP"
                    ) {

                        dom.competitionNight.checked =
                            true;


                        dom.nightTeam.value =
                            item.team_name || "";

                    }

                }
            );


        if (
            currentPhotoUrl
        ) {

            dom.playerPhotoPreview.innerHTML = `

                <img
                    src="${escapeHTML(
                        currentPhotoUrl
                    )}"
                    alt="${escapeHTML(
                        player.name
                    )}"
                >

            `;

        }

        else {

            resetPhotoPreview();

        }


        updateCompetitionUI();

        updateRankPreview();


        dom.modal.classList.add(
            "is-open"
        );


        dom.modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    /* =====================================================
       CLOSE
       ===================================================== */

    function closePlayerModal() {

        dom.modal.classList.remove(
            "is-open"
        );


        dom.modal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";


        editingPlayerId =
            null;

    }


    /* =====================================================
       ELO PREVIEW
       ===================================================== */

    function updateRankPreview() {

        if (
            !dom.playerRankPreview
        ) {

            return;

        }


        const rank =
            getRank(
                0
            );


        dom.playerRankPreview.textContent =
            rank.name;


        dom.playerRankPreview.style.color =
            rank.color;


        dom.playerEloPreview.textContent =
            "0";

    }


    /* =====================================================
       VALIDAR COMPETIÇÕES
       ===================================================== */

    function collectCompetitions() {

        const selected =
            [];


        if (
            dom.competitionBrasileirao.checked
        ) {

            const team =
                dom.brasileiraoTeam.value
                    .trim();


            if (
                !team
            ) {

                throw new Error(
                    "SELECIONE O CLUBE DO BRASILEIRÃO."
                );

            }


            selected.push({

                competition:
                    "BRASILEIRAO",

                team_name:
                    team

            });

        }


        if (
            dom.competitionNight.checked
        ) {

            const team =
                dom.nightTeam.value
                    .trim();


            if (
                !team
            ) {

                throw new Error(
                    "INFORME O TIME DA NIGHT CUP."
                );

            }


            selected.push({

                competition:
                    "NIGHT_CUP",

                team_name:
                    team

            });

        }


        if (
            dom.competitionChampions?.checked
        ) {

            const clubId =
                String(
                    dom.championsTeam?.value ||
                    ""
                );

            const club =
                CHAMPIONS_CLUBS.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        clubId
                );

            if (
                !club
            ) {

                throw new Error(
                    "SELECIONE O CLUBE DA CHAMPIONS LEAGUE."
                );

            }

            selected.push({

                competition:
                    "CHAMPIONS_LEAGUE",

                team_name:
                    club.name

            });

        }


        if (
            selected.length === 0
        ) {

            throw new Error(
                "SELECIONE PELO MENOS UMA COMPETIÇÃO."
            );

        }


        return selected;

    }


    /* =====================================================
       SALVAR
       ===================================================== */

    async function savePlayerFromForm(
        event
    ) {

        event.preventDefault();


        const name =
            dom.playerName.value
                .trim();


        if (
            !name
        ) {

            showToast(
                "DIGITE O NOME DO JOGADOR."
            );

            return;

        }


        let competitions;


        try {

            competitions =
                collectCompetitions();

        }

        catch (
            error
        ) {

            showToast(
                error.message
            );

            return;

        }


        try {

            const client =
                await getSupabase();


            /*
             * ID
             *
             * Criamos o UUID agora para poder
             * organizar a foto no Storage.
             */

            const playerId =
                editingPlayerId ||
                crypto.randomUUID();


            /*
             * Foto
             */

            const selectedPhoto =
                dom.playerPhotoFile?.files?.[0] ||
                null;


            let photoUrl =
                currentPhotoUrl;


            if (
                selectedPhoto
            ) {

                showToast(
                    "ENVIANDO FOTO..."
                );


                photoUrl =
                    await uploadPlayerPhoto(
                        selectedPhoto,
                        playerId
                    );

            }


            /*
             * Dados iniciais
             *
             * O jogador começa SEMPRE com
             * Elo e estatísticas zerados.
             */

            const playerPayload = {

                id:
                    playerId,

                player_code:
                    editingPlayerId

                        ?

                        (
                            players.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        editingPlayerId
                                    )
                            )?.player_code ||
                            null
                        )

                        :

                        await generatePlayerCode(),

                name:
                    name,

                instagram:
                    dom.playerInstagram.value
                        .trim()
                        .replace(
                            /^@/,
                            ""
                        ),

                platform:
                    dom.playerPlatform.value,

                photo_url:
                    photoUrl || null,

                elo:
                    0,

                wins:
                    0,

                draws:
                    0,

                losses:
                    0,

                titles:
                    0,

                status:
                    "ACTIVE"

            };


            /*
             * NOVO
             */

            if (
                !editingPlayerId
            ) {

                const {
                    error
                } =
                    await client

                        .from(
                            PLAYERS_TABLE
                        )

                        .insert(
                            playerPayload
                        );


                if (
                    error
                ) {

                    throw error;

                }

            }


            /*
             * EDITAR
             */

            else {

                const {
                    error
                } =
                    await client

                        .from(
                            PLAYERS_TABLE
                        )

                        .update({

                            name:
                                playerPayload.name,

                            instagram:
                                playerPayload.instagram,

                            platform:
                                playerPayload.platform,

                            photo_url:
                                playerPayload.photo_url

                        })

                        .eq(
                            "id",
                            editingPlayerId
                        );


                if (
                    error
                ) {

                    throw error;

                }

            }


            /*
             * CHAMPIONS LEAGUE
             */
            if (
                dom.competitionChampions?.checked
            ) {

                const championsClubId =
                    String(
                        dom.championsTeam?.value ||
                        ""
                    );

                const {
                    error:
                        championsError
                } =
                    await client.rpc(
                        "champions_register_player",
                        {
                            p_championship_id:
                                CHAMPIONS_SEASON_ID,

                            p_participant_id:
                                playerId,

                            p_championship_club_id:
                                championsClubId
                        }
                    );

                if (
                    championsError
                ) {

                    throw championsError;

                }

            }


            /*
             * ATUALIZAR COMPETIÇÕES
             */

            const {
                error:
                    deleteCompetitionError
            } =
                await client

                    .from(
                        COMPETITIONS_TABLE
                    )

                    .delete()

                    .eq(
                        "player_id",
                        playerId
                    );


            if (
                deleteCompetitionError
            ) {

                throw deleteCompetitionError;

            }


            const competitionRows =
                competitions.map(
                    item => {

                        return {

                            player_id:
                                playerId,

                            competition:
                                item.competition,

                            team_name:
                                item.team_name

                        };

                    }
                );


            const {
                error:
                    competitionInsertError
            } =
                await client

                    .from(
                        COMPETITIONS_TABLE
                    )

                    .insert(
                        competitionRows
                    );


            if (
                competitionInsertError
            ) {

                throw competitionInsertError;

            }


            closePlayerModal();


            await loadPlayers();


            showToast(
                editingPlayerId
                    ? "JOGADOR ATUALIZADO."
                    : "JOGADOR CADASTRADO."
            );


        }

        catch (
            error
        ) {

            console.error(
                "CCFV // SAVE ERROR:",
                error
            );


            console.error(
                "CCFV // MESSAGE:",
                error?.message
            );


            console.error(
                "CCFV // DETAILS:",
                error?.details
            );


            showToast(
                error?.message ||
                "ERRO AO SALVAR JOGADOR."
            );

        }

    }


    /* =====================================================
       EXCLUIR
       ===================================================== */

    async function deletePlayer(
        id
    ) {

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
            !player
        ) {

            return;

        }


        const confirmed =
            window.confirm(
                `Excluir o jogador "${player.name}"?`
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            const client =
                await getSupabase();


            /*
             * As competições serão excluídas
             * automaticamente pelo ON DELETE CASCADE.
             */

            const {
                error
            } =
                await client

                    .from(
                        PLAYERS_TABLE
                    )

                    .delete()

                    .eq(
                        "id",
                        id
                    );


            if (
                error
            ) {

                throw error;

            }


            await loadPlayers();


            showToast(
                "JOGADOR EXCLUÍDO."
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // DELETE ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO EXCLUIR JOGADOR."
            );

        }

    }


    /* =====================================================
       TABLE ACTIONS
       ===================================================== */

    function bindPlayerRowActions() {

        document

            .querySelectorAll(
                "[data-edit-player]"
            )

            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            openEditPlayer(
                                button.dataset
                                    .editPlayer
                            );

                        }
                    );

                }
            );


        document

            .querySelectorAll(
                "[data-delete-player]"
            )

            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            deletePlayer(
                                button.dataset
                                    .deletePlayer
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       NAVEGAÇÃO
       ===================================================== */

    function openSection(
        sectionName
    ) {

        dom.navItems.forEach(
            item => {

                item.classList.toggle(
                    "is-active",
                    item.dataset.section ===
                        sectionName
                );

            }
        );


        dom.sections.forEach(
            section => {

                section.classList.toggle(
                    "is-active",
                    section.id ===
                        `section-${sectionName}`
                );

            }
        );


        dom.sidebar?.classList.remove(
            "is-open"
        );

    }


    function bindNavigation() {

        dom.navItems.forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        openSection(
                            item.dataset.section
                        );

                    }
                );

            }
        );


        dom.openSectionButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openSection(
                            button.dataset.openSection
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       MOBILE
       ===================================================== */

    function bindMobileMenu() {

        dom.mobileMenu?.addEventListener(
            "click",
            () => {

                dom.sidebar.classList.toggle(
                    "is-open"
                );

            }
        );

    }


    /* =====================================================
       MODAL
       ===================================================== */

    function bindPlayerModal() {

        dom.newPlayerButton?.addEventListener(
            "click",
            openNewPlayer
        );


        dom.openNewPlayerButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    openNewPlayer
                );

            }
        );


        dom.closeModalButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    closePlayerModal
                );

            }
        );


        dom.form?.addEventListener(
            "submit",
            savePlayerFromForm
        );


        dom.playerPhotoFile?.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];


                if (
                    file
                ) {

                    setPhotoPreview(
                        file
                    );

                }

            }
        );


        dom.competitionBrasileirao
            ?.addEventListener(
                "change",
                updateCompetitionUI
            );


        dom.competitionNight
            ?.addEventListener(
                "change",
                updateCompetitionUI
            );


        dom.competitionChampions
            ?.addEventListener(
                "change",
                updateChampionsUI
            );


        dom.competitionChampionsLabel
            ?.addEventListener(
                "click",
                () => {

                    window.setTimeout(
                        updateChampionsUI,
                        0
                    );

                }
            );


        dom.competitionBrasileiraoLabel
            ?.addEventListener(
                "click",
                () => {

                    window.setTimeout(
                        updateCompetitionUI,
                        0
                    );

                }
            );


        dom.competitionNightLabel
            ?.addEventListener(
                "click",
                () => {

                    window.setTimeout(
                        updateCompetitionUI,
                        0
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

                    closePlayerModal();

                }

            }
        );

    }


    /* =====================================================
       BUSCA / FILTROS
       ===================================================== */

    function bindSearchAndFilters() {

        dom.playerSearch?.addEventListener(
            "input",
            renderPlayers
        );


        dom.playerFilterButtons
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            dom.playerFilterButtons
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


                            activePlatformFilter =
                                button.dataset
                                    .adminFilter ||
                                "all";


                            renderPlayers();

                        }
                    );

                }
            );

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

        if (
            !dom.toast
        ) {

            return;

        }


        dom.toast.textContent =
            message;


        dom.toast.classList.add(
            "is-visible"
        );


        clearTimeout(
            dom.toast._timer
        );


        dom.toast._timer =
            setTimeout(
                () => {

                    dom.toast.classList.remove(
                        "is-visible"
                    );

                },
                3200
            );

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        console.log(
            "%cCCFV // PLAYER MANAGEMENT",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        bindNavigation();

        bindMobileMenu();

        bindPlayerModal();

        bindSearchAndFilters();

        updateCompetitionUI();

        updateRankPreview();


        try {

            await getSupabase();

            await loadPlayers();


            console.log(
                "CCFV // PLAYER DATABASE ONLINE"
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // INIT ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CONECTAR AO BANCO."
            );

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

    }

    else {

        init();

    }

})();