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


    const CHAMPIONSHIPS_TABLE =
        "championships";

    const CHAMPIONS_CLUBS_TABLE =
        "championship_clubs";

    const CHAMPIONS_REGISTRATIONS_TABLE =
        "championship_registrations";

    const CHAMPIONS_CODE =
        "CCFV-CL-S01";

    const CHAMPIONS_SEASON_ID =
        "362284ef-e410-45b8-890b-630f1130f9d2";

    const CHAMPIONS_CLUB_CATALOG =
        [
        {
                "id": "97762f56-2f71-4391-9740-82bf271eecaf",
                "name": "Real Madrid",
                "slug": "real_madrid",
                "order": 1
        },
        {
                "id": "32829574-ddcd-4767-b2d3-550941cda564",
                "name": "Barcelona",
                "slug": "barcelona",
                "order": 2
        },
        {
                "id": "b9a26deb-a555-4068-a13a-a6caf70309fe",
                "name": "Atlético de Madrid",
                "slug": "atletico_madrid",
                "order": 3
        },
        {
                "id": "ea34bb12-79b4-462a-b6f0-acd8daaf3f59",
                "name": "Manchester City",
                "slug": "manchester_city",
                "order": 4
        },
        {
                "id": "d0e5285b-5a8c-4143-919e-a892835f9e9e",
                "name": "Manchester United",
                "slug": "manchester_united",
                "order": 5
        },
        {
                "id": "d967a615-db1c-4ba6-9337-ad964bb087b9",
                "name": "Liverpool",
                "slug": "liverpool",
                "order": 6
        },
        {
                "id": "3e84811c-f238-4b91-a244-f9bd64eccccf",
                "name": "Arsenal",
                "slug": "arsenal",
                "order": 7
        },
        {
                "id": "f27adc91-8a5f-4374-9e2a-e0ff09535ffd",
                "name": "Chelsea",
                "slug": "chelsea",
                "order": 8
        },
        {
                "id": "cc7509a3-87b1-4a0d-9023-b8c115dac7fe",
                "name": "Inter de Milão",
                "slug": "inter_milao",
                "order": 9
        },
        {
                "id": "390242ea-a560-4eca-804c-672c6b73a608",
                "name": "Milan",
                "slug": "milan",
                "order": 10
        },
        {
                "id": "09f4d9ee-9a55-45fb-95be-f01f3aee0e41",
                "name": "Juventus",
                "slug": "juventus",
                "order": 11
        },
        {
                "id": "a5dde0fd-0d45-438a-b68e-c8aa342ca676",
                "name": "Napoli",
                "slug": "napoli",
                "order": 12
        },
        {
                "id": "91a21c0d-1f21-4be4-8278-3043743cdae9",
                "name": "Roma",
                "slug": "roma",
                "order": 13
        },
        {
                "id": "6b7fdf57-6045-4513-a70e-59c557674657",
                "name": "Lazio",
                "slug": "lazio",
                "order": 14
        },
        {
                "id": "5264fa12-513c-4ef9-9bd8-6d3be5e2c4fb",
                "name": "Paris Saint-Germain",
                "slug": "psg",
                "order": 15
        },
        {
                "id": "a2632411-2914-4dfd-a3c9-5e0a1b55faf9",
                "name": "Olympique de Marseille",
                "slug": "marseille",
                "order": 16
        },
        {
                "id": "b048e2ae-2875-4949-8bd5-e254fbe0ebfb",
                "name": "Monaco",
                "slug": "monaco",
                "order": 17
        },
        {
                "id": "ce8e010a-984c-4254-936e-b40fa9d4661d",
                "name": "Lyon",
                "slug": "lyon",
                "order": 18
        },
        {
                "id": "7642971a-9300-44b0-87af-caf348d45cdc",
                "name": "Benfica",
                "slug": "benfica",
                "order": 19
        },
        {
                "id": "451a3868-0f0c-4ba7-8e42-d64ead2d2dee",
                "name": "Porto",
                "slug": "porto",
                "order": 20
        },
        {
                "id": "9d465afc-7846-4cbc-b551-11867896ea5d",
                "name": "Sporting",
                "slug": "sporting",
                "order": 21
        },
        {
                "id": "2c12361c-5964-4014-99b6-a729ff690000",
                "name": "Braga",
                "slug": "braga",
                "order": 22
        },
        {
                "id": "081f52ef-ad56-47a5-aa4d-939f891370e5",
                "name": "Ajax",
                "slug": "ajax",
                "order": 23
        },
        {
                "id": "80cd91d5-a45c-4bba-8015-86adae7cc4b8",
                "name": "PSV",
                "slug": "psv",
                "order": 24
        },
        {
                "id": "d6c8e32b-6e66-46aa-9efb-564bea78de8b",
                "name": "Feyenoord",
                "slug": "feyenoord",
                "order": 25
        },
        {
                "id": "3453f1f4-2bcb-4241-8b3e-e184f6802963",
                "name": "Galatasaray",
                "slug": "galatasaray",
                "order": 26
        },
        {
                "id": "b6a1230a-60fa-484f-bf37-21e14405c5d7",
                "name": "Fenerbahçe",
                "slug": "fenerbahce",
                "order": 27
        },
        {
                "id": "9e3d9652-d476-43a9-bfb7-e99bba891294",
                "name": "Beşiktaş",
                "slug": "besiktas",
                "order": 28
        },
        {
                "id": "fe555b7c-6fb5-474f-b58f-73a297be0c25",
                "name": "Celtic",
                "slug": "celtic",
                "order": 29
        },
        {
                "id": "d3c0cfff-704f-461f-a7da-f65e0898eb0b",
                "name": "Rangers",
                "slug": "rangers",
                "order": 30
        },
        {
                "id": "d1d61831-69ba-415c-a0e1-43379c1b8ac9",
                "name": "Club Brugge",
                "slug": "club_brugge",
                "order": 31
        },
        {
                "id": "a0ff081f-15f7-4aac-96c5-e5b16388f451",
                "name": "Anderlecht",
                "slug": "anderlecht",
                "order": 32
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

    let occupiedBrasileiraoTeams =
        new Set();

    let championsSeason =
        null;

    let championsClubs =
        [];

    let championsRegistrations =
        [];


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

        mobileNewPlayerButton:
            document.querySelector(
                "#mobile-new-player"
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

        competitionBrasileiraoMobile:
            document.querySelector(
                "#competition-brasileirao-mobile"
            ),

        competitionBrasileiraoMobileLabel:
            document.querySelector(
                "#competition-brasileirao-mobile-label"
            ),

        competitionArenaMobile:
            document.querySelector(
                "#competition-arena-mobile"
            ),

        competitionArenaMobileLabel:
            document.querySelector(
                "#competition-arena-mobile-label"
            ),

        brasileiraoMobileConfig:
            document.querySelector(
                "#brasileirao-mobile-config"
            ),

        brasileiraoMobileTeam:
            document.querySelector(
                "#brasileirao-mobile-team"
            ),

        arenaMobileConfig:
            document.querySelector(
                "#arena-mobile-config"
            ),

        arenaMobileTeam:
            document.querySelector(
                "#arena-mobile-team"
            ),

        nightTeam:
            document.querySelector(
                "#night-team"
            ),

        champions:
            document.querySelector(
                "#competition-champions"
            ),

        championsLabel:
            document.querySelector(
                "#competition-champions-label"
            ),

        championsConfig:
            document.querySelector(
                "#champions-config"
            ),

        championsTeam:
            document.querySelector(
                "#champions-team"
            ),

        championsTeamStatus:
            document.querySelector(
                "#champions-team-status"
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


    function normalizeTeamName(
        value
    ) {

        return String(
            value || ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toUpperCase();

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


            rebuildOccupiedBrasileiraoTeams(
                editingPlayerId
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


            occupiedBrasileiraoTeams =
                new Set();


            renderPlayers();

            updateDashboardStats();


            showToast(
                "ERRO AO CARREGAR JOGADORES."
            );

        }

    }


    /* =====================================================
       BRASILEIRÃO — CLUBES OCUPADOS
       ===================================================== */

    function rebuildOccupiedBrasileiraoTeams(
        exceptPlayerId = null
    ) {

        occupiedBrasileiraoTeams =
            new Set();


        players.forEach(
            player => {

                if (
                    exceptPlayerId &&
                    String(
                        player.id
                    ) ===
                    String(
                        exceptPlayerId
                    )
                ) {

                    return;

                }


                (
                    player.competitions ||
                    []
                )
                    .forEach(
                        competition => {

                            if (
                                String(
                                    competition.competition ||
                                        ""
                                ).toUpperCase() !==
                                "BRASILEIRAO"
                            ) {

                                return;

                            }


                            const team =
                                normalizeTeamName(
                                    competition.team_name
                                );


                            if (
                                team
                            ) {

                                occupiedBrasileiraoTeams
                                    .add(
                                        team
                                    );

                            }

                        }
                    );

            }
        );

    }


    function refreshBrasileiraoTeamOptions() {

        if (
            !dom.brasileiraoTeam
        ) {

            return;

        }


        rebuildOccupiedBrasileiraoTeams(
            editingPlayerId
        );


        Array.from(
            dom.brasileiraoTeam.options
        )
            .forEach(
                option => {

                    const team =
                        normalizeTeamName(
                            option.value
                        );


                    if (
                        !team
                    ) {

                        option.disabled =
                            false;

                        option.removeAttribute(
                            "data-team-occupied"
                        );

                        option.title =
                            "";

                        return;

                    }


                    const occupied =
                        occupiedBrasileiraoTeams
                            .has(
                                team
                            );


                    option.disabled =
                        occupied;


                    option.dataset.teamOccupied =
                        occupied
                            ? "true"
                            : "false";


                    option.title =
                        occupied
                            ? "Clube já escolhido por outro jogador."
                            : "";

                }
            );


        const selectedTeam =
            normalizeTeamName(
                dom.brasileiraoTeam.value
            );


        if (
            selectedTeam &&
            occupiedBrasileiraoTeams.has(
                selectedTeam
            )
        ) {

            dom.brasileiraoTeam.value =
                "";

        }

    }



    /* =====================================================
       CHAMPIONS LEAGUE — FONTE ÚNICA
       ===================================================== */

    function createDefaultChampionsSeason() {

        return {
            id:
                CHAMPIONS_SEASON_ID,

            code:
                CHAMPIONS_CODE,

            name:
                "CCFV Champions League",

            season:
                1,

            status:
                "REGISTRATIONS",

            max_participants:
                32

        };

    }


    async function loadChampionsData() {

        /*
         * Nunca mais dependemos da leitura de `championships`
         * para fazer o formulário funcionar.
         *
         * O catálogo dos 32 clubes já é conhecido e confirmado.
         * O banco é usado somente para ler ocupação e inscrições.
         */
        championsSeason =
            createDefaultChampionsSeason();

        championsClubs =
            CHAMPIONS_CLUB_CATALOG.map(
                club => ({
                    ...club,
                    participant_id:
                        null,

                    participant_name:
                        null,

                    status:
                        "AVAILABLE",

                    pot_number:
                        null

                })
            );

        championsRegistrations =
            [];

        try {

            const client =
                await getSupabase();

            /*
             * Lê a tabela de posições dos 32 clubes.
             * NÃO usa relacionamento PostgREST aninhado.
             */
            const {
                data:
                    clubRows,
                error:
                    clubError
            } =
                await client
                    .from(
                        CHAMPIONS_CLUBS_TABLE
                    )
                    .select(
                        "id,championship_id,club_id,status,participant_id,pot_number"
                    )
                    .eq(
                        "championship_id",
                        CHAMPIONS_SEASON_ID
                    );

            if (
                clubError
            ) {
                throw clubError;
            }

            const rowsById =
                new Map(
                    (
                        clubRows ||
                        []
                    ).map(
                        row => [
                            String(
                                row.id
                            ),
                            row
                        ]
                    )
                );

            /*
             * Junta os dados do banco ao catálogo oficial.
             */
            championsClubs =
                CHAMPIONS_CLUB_CATALOG.map(
                    club => {

                        const row =
                            rowsById.get(
                                String(
                                    club.id
                                )
                            );

                        return {
                            ...club,

                            participant_id:
                                row?.participant_id ||
                                null,

                            status:
                                String(
                                    row?.status ||
                                    "AVAILABLE"
                                ).toUpperCase(),

                            pot_number:
                                row?.pot_number ||
                                null

                        };

                    }
                );

            /*
             * Inscrições são independentes dos clubes.
             */
            const {
                data:
                    registrations,
                error:
                    registrationsError
            } =
                await client
                    .from(
                        CHAMPIONS_REGISTRATIONS_TABLE
                    )
                    .select(
                        "id,championship_id,participant_id,selected_club_id,status"
                    )
                    .eq(
                        "championship_id",
                        CHAMPIONS_SEASON_ID
                    );

            if (
                registrationsError
            ) {
                throw registrationsError;
            }

            championsRegistrations =
                registrations ||
                [];

            /*
             * Se a temporada real existir, usamos o status dela
             * somente como informação operacional. O ID continua fixo.
             */
            try {

                const {
                    data:
                        seasonRow,
                    error:
                        optionalSeasonError
                } =
                    await client
                        .from(
                            CHAMPIONSHIPS_TABLE
                        )
                        .select(
                            "id,code,name,season,status,max_participants"
                        )
                        .eq(
                            "id",
                            CHAMPIONS_SEASON_ID
                        )
                        .maybeSingle();

                if (
                    !optionalSeasonError &&
                    seasonRow
                ) {

                    championsSeason =
                        {
                            ...championsSeason,
                            ...seasonRow
                        };

                }

            }

            catch (
                optionalError
            ) {

                console.debug(
                    "CCFV // CHAMPIONS SEASON INFO:",
                    optionalError
                );

            }

        }

        catch (
            error
        ) {

            /*
             * O formulário continua funcionando com os 32 clubes.
             * O erro do banco não pode transformar o select em vazio.
             */
            console.warn(
                "CCFV // CHAMPIONS DATABASE:",
                error
            );

        }

        refreshChampionsTeamOptions();

    }


    function getChampionsRegistration(
        playerId
    ) {

        if (
            !playerId
        ) {

            return null;

        }

        return championsRegistrations.find(
            registration =>
                String(
                    registration.participant_id
                ) ===
                String(
                    playerId
                )
        ) ||
        null;

    }


    function refreshChampionsTeamOptions() {

        if (
            !dom.championsTeam
        ) {

            return;

        }

        const currentValue =
            String(
                dom.championsTeam.value ||
                ""
            );

        dom.championsTeam.innerHTML =
            `
                <option value="">
                    SELECIONE O CLUBE
                </option>
            `;

        const lockedStatuses = [
            "RESERVED",
            "CONFIRMED",
            "ELIMINATED"
        ];

        (
            championsClubs ||
            []
        )
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.order ||
                        999
                    ) -
                    Number(
                        b.order ||
                        999
                    )
            )
            .forEach(
                club => {

                    const status =
                        String(
                            club.status ||
                            "AVAILABLE"
                        ).toUpperCase();

                    const isCurrent =
                        String(
                            club.id
                        ) ===
                        currentValue;

                    const locked =
                        Boolean(
                            club.participant_id
                        ) ||
                        lockedStatuses.includes(
                            status
                        );

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        club.id;

                    option.textContent =
                        locked &&
                        !isCurrent
                            ? `${club.name} — OCUPADO`
                            : club.name;

                    option.disabled =
                        locked &&
                        !isCurrent;

                    dom.championsTeam
                        .appendChild(
                            option
                        );

                }
            );

        dom.championsTeam.value =
            currentValue;

        /*
         * IMPORTANTE:
         * mesmo com um erro de RLS, os 32 clubes existem no catálogo.
         */
        dom.championsTeam.disabled =
            false;

        if (
            dom.championsTeamStatus
        ) {

            const selected =
                championsClubs.find(
                    club =>
                        String(
                            club.id
                        ) ===
                        String(
                            currentValue
                        )
                );

            dom.championsTeamStatus.textContent =
                selected
                    ? `Clube selecionado: ${selected.name}`
                    : "32 clubes oficiais da Season 01 disponíveis.";

        }

    }


    async function syncChampionsRegistration(
        client,
        playerId
    ) {

        /*
         * Champions só é válida para PC e CONSOLE.
         */
        const platform =
            String(
                dom.playerPlatform?.value ||
                "PC"
            ).toUpperCase();

        const selected =
            Boolean(
                dom.champions?.checked
            );

        const existing =
            getChampionsRegistration(
                playerId
            );

        /*
         * INSCRIÇÃO NÃO MARCADA
         */
        if (
            !selected
        ) {

            if (
                existing
            ) {

                await client
                    .from(
                        CHAMPIONS_REGISTRATIONS_TABLE
                    )
                    .delete()
                    .eq(
                        "id",
                        existing.id
                    )
                    .throwOnError();

                await client
                    .from(
                        CHAMPIONS_CLUBS_TABLE
                    )
                    .update({
                        participant_id:
                            null,

                        status:
                            "AVAILABLE",

                        pot_number:
                            null,

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "id",
                        existing.selected_club_id
                    )
                    .eq(
                        "championship_id",
                        CHAMPIONS_SEASON_ID
                    )
                    .throwOnError();

            }

            championsRegistrations =
                championsRegistrations.filter(
                    item =>
                        String(
                            item.participant_id
                        ) !==
                        String(
                            playerId
                        )
                );

            championsClubs =
                championsClubs.map(
                    club =>
                        existing &&
                        String(
                            club.id
                        ) ===
                        String(
                            existing.selected_club_id
                        )
                            ? {
                                ...club,
                                participant_id:
                                    null,
                                status:
                                    "AVAILABLE"
                            }
                            : club
                );

            refreshChampionsTeamOptions();

            return;

        }

        if (
            platform ===
            "MOBILE"
        ) {

            throw new Error(
                "A CHAMPIONS LEAGUE É EXCLUSIVA PARA PC E CONSOLE."
            );

        }

        const selectedClubId =
            String(
                dom.championsTeam?.value ||
                ""
            );

        const selectedClub =
            (
                championsClubs ||
                []
            ).find(
                club =>
                    String(
                        club.id
                    ) ===
                    selectedClubId
            );

        if (
            !selectedClubId ||
            !selectedClub
        ) {

            throw new Error(
                "SELECIONE O CLUBE DA CHAMPIONS LEAGUE."
            );

        }

        /*
         * Não permitir dois treinadores no mesmo clube.
         */
        const anotherRegistration =
            championsRegistrations.find(
                registration =>
                    String(
                        registration.selected_club_id
                    ) ===
                    selectedClubId
                    &&
                    String(
                        registration.participant_id
                    ) !==
                    String(
                        playerId
                    )
            );

        if (
            anotherRegistration
        ) {

            throw new Error(
                "ESTE CLUBE JÁ ESTÁ VINCULADO A OUTRO TREINADOR."
            );

        }

        /*
         * Se outro registro ocupa o clube no banco,
         * também bloqueia.
         */
        if (
            selectedClub.participant_id &&
            String(
                selectedClub.participant_id
            ) !==
            String(
                playerId
            )
        ) {

            throw new Error(
                "ESTE CLUBE JÁ ESTÁ OCUPADO POR OUTRO TREINADOR."
            );

        }

        const now =
            new Date()
                .toISOString();

        /*
         * A inscrição é criada/atualizada com a chave única:
         * championship_id + participant_id.
         */
        const registrationPayload = {

            championship_id:
                CHAMPIONS_SEASON_ID,

            participant_id:
                playerId,

            priorities:
                [],

            selected_club_id:
                selectedClubId,

            status:
                "CONFIRMED",

            accepted_at:
                existing?.accepted_at ||
                now,

            updated_at:
                now

        };

        let savedRegistration;

        if (
            existing
        ) {

            const {
                data,
                error
            } =
                await client
                    .from(
                        CHAMPIONS_REGISTRATIONS_TABLE
                    )
                    .update(
                        {
                            selected_club_id:
                                selectedClubId,

                            status:
                                "CONFIRMED",

                            updated_at:
                                now
                        }
                    )
                    .eq(
                        "id",
                        existing.id
                    )
                    .select(
                        "id,championship_id,participant_id,selected_club_id,status"
                    )
                    .single();

            if (
                error
            ) {
                throw error;
            }

            savedRegistration =
                data;

            /*
             * Troca de clube: libera o antigo.
             */
            if (
                String(
                    existing.selected_club_id
                ) !==
                selectedClubId
            ) {

                await client
                    .from(
                        CHAMPIONS_CLUBS_TABLE
                    )
                    .update({
                        participant_id:
                            null,

                        status:
                            "AVAILABLE",

                        pot_number:
                            null,

                        updated_at:
                            now

                    })
                    .eq(
                        "id",
                        existing.selected_club_id
                    )
                    .eq(
                        "championship_id",
                        CHAMPIONS_SEASON_ID
                    )
                    .throwOnError();

            }

        }
        else {

            const {
                data,
                error
            } =
                await client
                    .from(
                        CHAMPIONS_REGISTRATIONS_TABLE
                    )
                    .insert(
                        registrationPayload
                    )
                    .select(
                        "id,championship_id,participant_id,selected_club_id,status"
                    )
                    .single();

            if (
                error
            ) {
                throw error;
            }

            savedRegistration =
                data;

        }

        /*
         * Agora marca o clube como CONFIRMED.
         */
        await client
            .from(
                CHAMPIONS_CLUBS_TABLE
            )
            .update({
                participant_id:
                    playerId,

                status:
                    "CONFIRMED",

                updated_at:
                    now

            })
            .eq(
                "id",
                selectedClubId
            )
            .eq(
                "championship_id",
                CHAMPIONS_SEASON_ID
            )
            .throwOnError();

        /*
         * Estado local imediatamente atualizado.
         */
        championsRegistrations =
            [
                ...championsRegistrations.filter(
                    item =>
                        String(
                            item.participant_id
                        ) !==
                        String(
                            playerId
                        )
                ),
                savedRegistration
            ];

        championsClubs =
            championsClubs.map(
                club => {

                    if (
                        existing &&
                        String(
                            club.id
                        ) ===
                        String(
                            existing.selected_club_id
                        )
                        &&
                        String(
                            existing.selected_club_id
                        ) !==
                        selectedClubId
                    ) {

                        return {
                            ...club,
                            participant_id:
                                null,
                            status:
                                "AVAILABLE"
                        };

                    }

                    if (
                        String(
                            club.id
                        ) ===
                        selectedClubId
                    ) {

                        return {
                            ...club,
                            participant_id:
                                playerId,
                            status:
                                "CONFIRMED"
                        };

                    }

                    return club;

                }
            );

        refreshChampionsTeamOptions();

    }


    function restoreChampionsForPlayer(
        player
    ) {

        if (
            !player
        ) {

            return;

        }

        const registration =
            getChampionsRegistration(
                player.id
            );

        const competition =
            (
                player.competitions ||
                []
            ).find(
                item =>
                    String(
                        item.competition ||
                        ""
                    ).toUpperCase() ===
                    "CHAMPIONS_LEAGUE"
            );

        const clubId =
            registration?.selected_club_id ||
            championsClubs.find(
                club =>
                    String(
                        club.name ||
                        ""
                    ).toLowerCase() ===
                    String(
                        competition?.team_name ||
                        ""
                    ).toLowerCase()
            )?.id ||
            "";

        if (
            clubId
        ) {

            if (
                dom.champions
            ) {
                dom.champions.checked =
                    true;
            }

            if (
                dom.championsTeam
            ) {

                dom.championsTeam.value =
                    String(
                        clubId
                    );

            }

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

                            ?

                            "BRASILEIRÃO"

                            :

                            "NIGHT CUP";


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

    function updateCompetitionUI() {

        const platform =
            String(
                dom.playerPlatform?.value ||
                "PC"
            ).toUpperCase();

        const isMobile =
            platform === "MOBILE";

        if (isMobile && dom.champions) {
            dom.champions.checked =
                false;
        }

        const pcBrazil =
            !isMobile &&
            Boolean(
                dom.competitionBrasileirao?.checked
            );

        const pcChampions =
            !isMobile &&
            Boolean(
                dom.champions?.checked
            );

        const pcNight =
            !isMobile &&
            Boolean(
                dom.competitionNight?.checked
            );

        const mobBrazil =
            isMobile &&
            Boolean(
                dom.competitionBrasileiraoMobile?.checked
            );

        const mobArena =
            isMobile &&
            Boolean(
                dom.competitionArenaMobile?.checked
            );

        [
            dom.competitionBrasileiraoLabel,
            dom.championsLabel,
            dom.competitionNightLabel
        ].forEach(label => {

            if (label) {
                label.style.display =
                    isMobile ? "none" : "";
            }

        });

        [
            dom.competitionBrasileiraoMobileLabel,
            dom.competitionArenaMobileLabel
        ].forEach(label => {

            if (label) {
                label.style.display =
                    isMobile ? "" : "none";
            }

        });

        if (isMobile) {

            if (dom.competitionBrasileirao) {
                dom.competitionBrasileirao.checked =
                    false;
            }

            if (dom.competitionNight) {
                dom.competitionNight.checked =
                    false;
            }

        } else {

            if (dom.competitionBrasileiraoMobile) {
                dom.competitionBrasileiraoMobile.checked =
                    false;
            }

            if (dom.competitionArenaMobile) {
                dom.competitionArenaMobile.checked =
                    false;
            }

        }

        [
            [dom.competitionBrasileiraoLabel, pcBrazil],
            [dom.championsLabel, pcChampions],
            [dom.competitionNightLabel, pcNight],
            [dom.competitionBrasileiraoMobileLabel, mobBrazil],
            [dom.competitionArenaMobileLabel, mobArena]
        ].forEach(
            ([label, selected]) => {

                if (!label) {
                    return;
                }

                label.classList.toggle(
                    "is-selected",
                    selected
                );

                label.setAttribute(
                    "aria-checked",
                    String(selected)
                );

            }
        );

        [
            [dom.brasileiraoConfig, pcBrazil],
            [dom.championsConfig, pcChampions],
            [dom.nightConfig, pcNight],
            [dom.brasileiraoMobileConfig, mobBrazil],
            [dom.arenaMobileConfig, mobArena]
        ].forEach(
            ([element, show]) => {

                if (!element) {
                    return;
                }

                element.classList.toggle(
                    "is-visible",
                    show
                );

                element.style.display =
                    show
                        ? "block"
                        : "none";

            }
        );

        if (dom.brasileiraoTeam) {
            dom.brasileiraoTeam.disabled =
                !pcBrazil;
        }

        if (dom.championsTeam) {
            dom.championsTeam.disabled =
                !pcChampions;
        }

        refreshBrasileiraoTeamOptions();
        refreshChampionsTeamOptions();
        refreshBrasileiraoMobileTeamOptions();
        updateCompetitionSummary();
    }

    function updateCompetitionSummary() {

        const summary =
            document.querySelector(
                "#player-competition-summary"
            );

        if (!summary) {
            return;
        }

        const platform =
            String(
                dom.playerPlatform?.value ||
                "PC"
            ).toUpperCase();

        const selected = [];

        if (platform !== "MOBILE") {

            if (dom.competitionBrasileirao?.checked) {

                selected.push(
                    `BRASILEIRÃO — ${
                        dom.brasileiraoTeam?.value ||
                        "A DEFINIR"
                    }`
                );
            }

            if (dom.champions?.checked) {

                const club =
                    championsClubs.find(
                        item =>
                            String(item.id) ===
                            String(
                                dom.championsTeam?.value ||
                                ""
                            )
                    );

                selected.push(
                    `CHAMPIONS LEAGUE — ${
                        club?.name ||
                        "A DEFINIR"
                    }`
                );
            }

            if (dom.competitionNight?.checked) {

                selected.push(
                    `NIGHT CUP — ${
                        dom.nightTeam?.value?.trim() ||
                        "A DEFINIR"
                    }`
                );
            }

        } else {

            if (dom.competitionBrasileiraoMobile?.checked) {

                selected.push(
                    `BRASILEIRÃO MOBILE — ${
                        dom.brasileiraoMobileTeam?.value ||
                        "A DEFINIR"
                    }`
                );
            }

            if (dom.competitionArenaMobile?.checked) {

                selected.push(
                    `ARENA CUP MOBILE — ${
                        dom.arenaMobileTeam?.value?.trim() ||
                        "A DEFINIR"
                    }`
                );
            }

        }

        summary.innerHTML =
            selected.length
                ? selected
                    .map(
                        item =>
                            `
                                <span
                                    class="ccfv-admin-competition-pill"
                                >
                                    ${escapeHTML(item)}
                                </span>
                            `
                    )
                    .join("")
                : `
                    <span
                        class="
                            ccfv-admin-competition-summary__empty
                        "
                    >
                        NENHUMA COMPETIÇÃO SELECIONADA.
                    </span>
                `;
    }

    function rebuildOccupiedBrasileiraoMobileTeams(exceptPlayerId = null) {
        const occupied = new Set();
        players.forEach(player => {
            if (exceptPlayerId && String(player.id) === String(exceptPlayerId)) return;
            (player.competitions || []).forEach(competition => {
                if (String(competition.competition || "").toUpperCase() !== "BRASILEIRAO_MOBILE") return;
                const team = normalizeTeamName(competition.team_name);
                if (team) occupied.add(team);
            });
        });
        return occupied;
    }

    function refreshBrasileiraoMobileTeamOptions() {
        if (!dom.brasileiraoMobileTeam) return;
        const occupied = rebuildOccupiedBrasileiraoMobileTeams(editingPlayerId);
        Array.from(dom.brasileiraoMobileTeam.options).forEach(option => {
            const team = normalizeTeamName(option.value);
            if (!team) {
                option.disabled = false;
                return;
            }
            const isOccupied = occupied.has(team);
            option.disabled = isOccupied;
            option.title = isOccupied ? "Clube já escolhido por outro jogador Mobile." : "";
        });
        const current = normalizeTeamName(dom.brasileiraoMobileTeam.value);
        if (current && occupied.has(current)) dom.brasileiraoMobileTeam.value = "";
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


        if (dom.champions) {
            dom.champions.checked =
                false;
        }

        if (dom.championsTeam) {
            dom.championsTeam.value =
                "";
        }


        dom.competitionBrasileiraoMobile.checked =
            false;


        dom.competitionArenaMobile.checked =
            false;


        dom.brasileiraoTeam.value =
            "";


        dom.nightTeam.value =
            "";


        dom.brasileiraoMobileTeam.value =
            "";


        dom.arenaMobileTeam.value =
            "";


        refreshChampionsTeamOptions();


        resetPhotoPreview();


        rebuildOccupiedBrasileiraoTeams();


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


    function openNewMobilePlayer() {

        openNewPlayer();

        dom.playerPlatform.value = "MOBILE";

        dom.competitionBrasileirao.checked = false;
        if (dom.champions) dom.champions.checked = false;
        dom.competitionNight.checked = false;
        dom.competitionBrasileiraoMobile.checked = false;
        dom.competitionArenaMobile.checked = false;

        dom.brasileiraoMobileTeam.value = "";
        dom.arenaMobileTeam.value = "";

        updateCompetitionUI();
        updateRankPreview();

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


        if (dom.champions) {
            dom.champions.checked =
                false;
        }

        if (dom.championsTeam) {
            dom.championsTeam.value =
                "";
        }


        dom.competitionBrasileiraoMobile.checked =
            false;


        dom.competitionArenaMobile.checked =
            false;


        dom.brasileiraoTeam.value =
            "";


        dom.nightTeam.value =
            "";


        dom.brasileiraoMobileTeam.value =
            "";


        dom.arenaMobileTeam.value =
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
                        "NIGHT_CUP"
                    ) {

                        dom.competitionNight.checked =
                            true;


                        dom.nightTeam.value =
                            item.team_name || "";

                    }


                    if (
                        item.competition ===
                        "BRASILEIRAO_MOBILE"
                    ) {

                        dom.competitionBrasileiraoMobile.checked =
                            true;

                        dom.brasileiraoMobileTeam.value =
                            item.team_name || "";

                    }


                    if (
                        item.competition ===
                        "ARENA_CUP" &&
                        String(player.platform || "").toUpperCase() === "MOBILE"
                    ) {

                        dom.competitionArenaMobile.checked =
                            true;

                        dom.arenaMobileTeam.value =
                            item.team_name || "";

                    }

                }
            );


        const championsRegistration =
            getChampionsRegistration(
                player.id
            );


        if (
            championsRegistration
        ) {

            if (dom.champions) {
                dom.champions.checked =
                    true;
            }

            if (dom.championsTeam) {
                dom.championsTeam.value =
                    championsRegistration.selected_club_id ||
                    "";
            }

        }


        restoreChampionsForPlayer(
            player
        );


        refreshChampionsTeamOptions();


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


        rebuildOccupiedBrasileiraoTeams(
            editingPlayerId
        );


        refreshChampionsTeamOptions();


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
            dom.playerPlatform?.value !== "MOBILE" &&
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


            rebuildOccupiedBrasileiraoTeams(
                editingPlayerId
            );


            if (
                occupiedBrasileiraoTeams.has(
                    normalizeTeamName(
                        team
                    )
                )
            ) {

                throw new Error(
                    "ESSE CLUBE JÁ FOI ESCOLHIDO POR OUTRO JOGADOR."
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
            dom.playerPlatform?.value !== "MOBILE" &&
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
            dom.playerPlatform?.value !== "MOBILE" &&
            dom.champions?.checked
        ) {

            const selectedClubId =
                String(
                    dom.championsTeam?.value ||
                    ""
                );

            if (!selectedClubId) {
                throw new Error(
                    "SELECIONE O CLUBE DA CHAMPIONS LEAGUE."
                );
            }

            const selectedClub =
                championsClubs.find(
                    club =>
                        String(club.id) ===
                        selectedClubId
                );

            if (!selectedClub) {
                throw new Error(
                    "CLUBE DA CHAMPIONS LEAGUE NÃO ENCONTRADO."
                );
            }

            const existing =
                editingPlayerId
                    ? getChampionsRegistration(
                        editingPlayerId
                    )
                    : null;

            const sameClub =
                existing &&
                String(
                    existing.selected_club_id
                ) ===
                selectedClubId;

            const another =
                championsRegistrations.find(
                    registration =>
                        String(
                            registration.selected_club_id
                        ) === selectedClubId &&
                        String(
                            registration.participant_id
                        ) !==
                        String(
                            editingPlayerId ||
                            ""
                        )
                );

            if (another) {
                throw new Error(
                    "ESTE CLUBE JÁ FOI ESCOLHIDO POR OUTRO TREINADOR."
                );
            }

            const status =
                String(
                    selectedClub.status ||
                    "AVAILABLE"
                ).toUpperCase();

            if (
                !sameClub &&
                (
                    selectedClub.participant_id ||
                    [
                        "RESERVED",
                        "CONFIRMED",
                        "ELIMINATED"
                    ].includes(status)
                )
            ) {
                throw new Error(
                    "ESTE CLUBE JÁ ESTÁ RESERVADO OU VINCULADO A OUTRO TREINADOR."
                );
            }

            selected.push({
                competition:
                    "CHAMPIONS_LEAGUE",

                team_name:
                    selectedClub
                        .champions_clubs
                        ?.name ||
                    "A DEFINIR"
            });

        }


        if (dom.playerPlatform?.value === "MOBILE") {

            // Competições PC/Console não são válidas para jogadores Mobile.
            if (dom.competitionBrasileiraoMobile?.checked) {
                const team = dom.brasileiraoMobileTeam.value.trim();
                if (!team) throw new Error("SELECIONE O CLUBE DO BRASILEIRÃO MOBILE.");
                const occupied = rebuildOccupiedBrasileiraoMobileTeams(editingPlayerId);
                if (occupied.has(normalizeTeamName(team))) {
                    throw new Error("ESSE CLUBE JÁ FOI ESCOLHIDO POR OUTRO JOGADOR MOBILE.");
                }
                selected.push({ competition: "BRASILEIRAO_MOBILE", team_name: team });
            }

            if (dom.competitionArenaMobile?.checked) {
                const team = dom.arenaMobileTeam.value.trim();
                if (!team) throw new Error("INFORME O NOME DA EQUIPE DA ARENA CUP MOBILE.");
                selected.push({ competition: "ARENA_CUP", team_name: team });
            }
        }

        if (
            selected.length === 0
        ) {

            const platform =
                dom.playerPlatform?.value ||
                "PC";

            if (
                platform !== "MOBILE"
            ) {

                throw new Error(
                    "SELECIONE PELO MENOS UMA COMPETIÇÃO."
                );

            }

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


            await syncChampionsRegistration(
                client,
                playerId
            );


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

        dom.mobileNewPlayerButton?.addEventListener(
            "click",
            openNewMobilePlayer
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


        dom.champions
            ?.addEventListener(
                "change",
                () => {

                    updateCompetitionUI();

                    if (
                        dom.champions.checked
                    ) {
                        refreshChampionsTeamOptions();
                    }

                }
            );


        dom.championsTeam
            ?.addEventListener(
                "change",
                updateCompetitionSummary
            );


        dom.playerPlatform
            ?.addEventListener(
                "change",
                () => {
                    // Ao trocar de plataforma, remove seleções incompatíveis.
                    if (dom.playerPlatform.value === "MOBILE") {
                        dom.competitionBrasileirao.checked = false;
                        dom.competitionNight.checked = false;
                    } else {
                        dom.competitionBrasileiraoMobile.checked = false;
                        dom.competitionArenaMobile.checked = false;
                    }
                    updateCompetitionUI();
                    refreshChampionsTeamOptions();
                    refreshBrasileiraoMobileTeamOptions();
                }
            );

        dom.competitionBrasileiraoMobile
            ?.addEventListener("change", updateCompetitionUI);

        dom.competitionArenaMobile
            ?.addEventListener("change", updateCompetitionUI);

        dom.brasileiraoMobileTeam
            ?.addEventListener("change", () => {
                refreshBrasileiraoMobileTeamOptions();
                updateCompetitionSummary();
            });

        dom.arenaMobileTeam
            ?.addEventListener("input", updateCompetitionSummary);

        dom.brasileiraoTeam
            ?.addEventListener("change", updateCompetitionSummary);

        dom.nightTeam
            ?.addEventListener("input", updateCompetitionSummary);


        /*
         * Clique no card inteiro.
         */

       

        /*
         * Troca de clube.
         */

        dom.brasileiraoTeam
            ?.addEventListener(
                "change",
                () => {

                    rebuildOccupiedBrasileiraoTeams(
                        editingPlayerId
                    );


                    const selectedTeam =
                        normalizeTeamName(
                            dom.brasileiraoTeam.value
                        );


                    if (
                        selectedTeam &&
                        occupiedBrasileiraoTeams.has(
                            selectedTeam
                        )
                    ) {

                        dom.brasileiraoTeam.value =
                            "";


                        showToast(
                            "ESSE CLUBE JÁ FOI ESCOLHIDO POR OUTRO JOGADOR."
                        );

                    }


                    refreshBrasileiraoTeamOptions();

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


        rebuildOccupiedBrasileiraoTeams();


        refreshChampionsTeamOptions();

        updateCompetitionUI();


        updateRankPreview();


        try {

            await getSupabase();


            await loadPlayers();

            await loadChampionsData();


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