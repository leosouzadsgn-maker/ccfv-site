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
       CHAMPIONS LEAGUE
       ===================================================== */

    async function loadChampionsData() {
        try {
            const client = await getSupabase();

            const { data: season, error: seasonError } = await client
                .from(CHAMPIONSHIPS_TABLE)
                .select("id, code, name, season, status, max_participants")
                .eq("code", CHAMPIONS_CODE)
                .maybeSingle();

            if (seasonError) throw seasonError;

            championsSeason = season || null;
            championsClubs = [];
            championsRegistrations = [];

            if (!championsSeason) {
                refreshChampionsTeamOptions();
                return;
            }

            /*
             * IMPORTANT:
             * Não usamos relacionamento aninhado entre championship_clubs
             * e champions_clubs. O PostgREST pode falhar dependendo das
             * FKs/RLS do projeto. Carregamos as duas tabelas separadamente
             * e montamos o catálogo no navegador.
             */
            const [catalogResult, assignmentsResult, registrationsResult] = await Promise.all([
                client
                    .from("champions_clubs")
                    .select("id, name, short_name, slug, logo_path, country, sort_order")
                    .order("sort_order", { ascending: true }),
                client
                    .from(CHAMPIONS_CLUBS_TABLE)
                    .select("id, championship_id, club_id, status, participant_id, pot_number")
                    .eq("championship_id", championsSeason.id),
                client
                    .from(CHAMPIONS_REGISTRATIONS_TABLE)
                    .select("*")
                    .eq("championship_id", championsSeason.id)
            ]);

            if (catalogResult.error) throw catalogResult.error;
            if (assignmentsResult.error) throw assignmentsResult.error;
            if (registrationsResult.error) throw registrationsResult.error;

            const catalogById = new Map(
                (catalogResult.data || []).map(club => [String(club.id), club])
            );

            championsClubs = (assignmentsResult.data || [])
                .map(assignment => ({
                    ...assignment,
                    champions_clubs: catalogById.get(String(assignment.club_id)) || null
                }))
                .filter(item => item.champions_clubs);

            championsRegistrations = registrationsResult.data || [];

            refreshChampionsTeamOptions();

        } catch (error) {
            console.error("CCFV // CHAMPIONS LOAD ERROR:", error);

            championsSeason = null;
            championsClubs = [];
            championsRegistrations = [];
            refreshChampionsTeamOptions();

            /*
             * Não transformamos qualquer falha de uma view pública em
             * "0 clubes". O cadastro usa diretamente as tabelas oficiais.
             */
            if (dom.championsTeamStatus) {
                dom.championsTeamStatus.textContent =
                    error?.message || "Erro ao carregar clubes da Champions.";
            }
        }
    }

    function refreshChampionsTeamOptions() {

        if (!dom.championsTeam) {
            return;
        }

        const currentValue =
            String(
                dom.championsTeam.value || ""
            );

        dom.championsTeam.innerHTML = `
            <option value="">
                SELECIONE O CLUBE
            </option>
        `;

        if (!championsSeason) {

            dom.championsTeam.innerHTML = `
                <option value="">
                    CHAMPIONS NÃO CONFIGURADA
                </option>
            `;

            dom.championsTeam.disabled =
                true;

            if (dom.championsTeamStatus) {
                dom.championsTeamStatus.textContent =
                    "Season 01 não encontrada ou sem acesso ao banco.";
            }

            return;
        }

        const lockedStatuses = [
            "RESERVED",
            "CONFIRMED",
            "ELIMINATED"
        ];

        championsClubs
            .filter(club => {

                const status =
                    String(
                        club.status || "AVAILABLE"
                    ).toUpperCase();

                const isCurrent =
                    String(club.id) === currentValue;

                return (
                    (!club.participant_id || isCurrent) &&
                    (
                        !lockedStatuses.includes(status) ||
                        isCurrent
                    )
                );
            })
            .sort((a,b) => {

                const aOrder =
                    Number(
                        a.champions_clubs?.sort_order ?? 999
                    );

                const bOrder =
                    Number(
                        b.champions_clubs?.sort_order ?? 999
                    );

                if (aOrder !== bOrder) {
                    return aOrder - bOrder;
                }

                return String(
                    a.champions_clubs?.name || ""
                ).localeCompare(
                    String(
                        b.champions_clubs?.name || ""
                    ),
                    "pt-BR"
                );
            })
            .forEach(club => {

                const option =
                    document.createElement("option");

                option.value =
                    club.id;

                option.textContent =
                    club.champions_clubs?.name ||
                    "CLUBE";

                dom.championsTeam.appendChild(
                    option
                );
            });

        dom.championsTeam.value =
            currentValue;

        if (dom.championsTeamStatus) {

            const selected =
                championsClubs.find(
                    club =>
                        String(club.id) ===
                        String(
                            dom.championsTeam.value || ""
                        )
                );

            dom.championsTeamStatus.textContent =
                selected
                    ? `${championsClubs.length} clubes cadastrados • ${selected.champions_clubs?.name || "clube selecionado"}`
                    : `${championsClubs.length} clubes cadastrados na Season 01.`;
        }
    }


    function getChampionsRegistration(playerId) {

        if (!playerId) {
            return null;
        }

        return championsRegistrations.find(
            registration =>
                String(
                    registration.participant_id
                ) ===
                String(playerId)
        ) || null;
    }


    async function syncChampionsRegistration(
        client,
        playerId
    ) {

        if (!championsSeason) {
            return;
        }

        const selected =
            Boolean(
                dom.champions?.checked
            );

        const existing =
            getChampionsRegistration(
                playerId
            );

        const seasonStatus =
            String(
                championsSeason.status || ""
            ).toUpperCase();

        const lockedSeasonStatuses = [
            "GROUP_STAGE",
            "ROUND_OF_16",
            "QUARTERFINALS",
            "SEMIFINALS",
            "FINAL",
            "CLOSED",
            "ARCHIVED"
        ];

        if (
            lockedSeasonStatuses.includes(
                seasonStatus
            )
        ) {

            if (existing) {
                return;
            }

            if (selected) {
                throw new Error(
                    "A CHAMPIONS LEAGUE JÁ ESTÁ EM ANDAMENTO. NOVAS INSCRIÇÕES NÃO SÃO PERMITIDAS."
                );
            }

            return;
        }

        if (!selected) {

            if (existing) {

                await client
                    .from(CHAMPIONS_REGISTRATIONS_TABLE)
                    .delete()
                    .eq("id", existing.id)
                    .throwOnError();

                await client
                    .from(CHAMPIONS_CLUBS_TABLE)
                    .update({
                        participant_id: null,
                        status: "AVAILABLE",
                        pot_number: null,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        existing.selected_club_id
                    )
                    .eq(
                        "championship_id",
                        championsSeason.id
                    )
                    .throwOnError();
            }

            championsRegistrations =
                championsRegistrations.filter(
                    registration =>
                        String(
                            registration.participant_id
                        ) !== String(playerId)
                );

            refreshChampionsTeamOptions();

            return;
        }

        if (
            String(
                dom.playerPlatform?.value || ""
            ).toUpperCase() === "MOBILE"
        ) {
            throw new Error(
                "A CHAMPIONS LEAGUE É EXCLUSIVA PARA PC E CONSOLE."
            );
        }

        const selectedClubId =
            String(
                dom.championsTeam?.value || ""
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

        const anotherRegistration =
            championsRegistrations.find(
                registration =>
                    String(
                        registration.selected_club_id
                    ) === selectedClubId &&
                    String(
                        registration.participant_id
                    ) !== String(playerId)
            );

        if (anotherRegistration) {
            throw new Error(
                "ESTE CLUBE JÁ ESTÁ VINCULADO A OUTRO TREINADOR."
            );
        }

        if (!existing) {

            const confirmedCount =
                championsRegistrations.filter(
                    registration =>
                        String(
                            registration.status || ""
                        ).toUpperCase() === "CONFIRMED"
                ).length;

            if (
                confirmedCount >=
                Number(
                    championsSeason.max_participants || 32
                )
            ) {
                throw new Error(
                    "A CHAMPIONS LEAGUE JÁ ESTÁ COM AS 32 VAGAS PREENCHIDAS."
                );
            }
        }

        if (
            existing &&
            String(existing.selected_club_id) !==
            selectedClubId
        ) {

            await client
                .from(CHAMPIONS_CLUBS_TABLE)
                .update({
                    participant_id: null,
                    status: "AVAILABLE",
                    pot_number: null,
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    existing.selected_club_id
                )
                .eq(
                    "championship_id",
                    championsSeason.id
                )
                .throwOnError();

            await client
                .from(CHAMPIONS_REGISTRATIONS_TABLE)
                .update({
                    selected_club_id:
                        selectedClubId,
                    status:
                        "CONFIRMED",
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    existing.id
                )
                .throwOnError();
        }

        if (!existing) {

            await client
                .from(CHAMPIONS_REGISTRATIONS_TABLE)
                .insert({
                    championship_id:
                        championsSeason.id,
                    participant_id:
                        playerId,
                    selected_club_id:
                        selectedClubId,
                    status:
                        "CONFIRMED",
                    accepted_at:
                        new Date().toISOString()
                })
                .throwOnError();
        }

        await client
            .from(CHAMPIONS_CLUBS_TABLE)
            .update({
                participant_id:
                    playerId,
                status:
                    "CONFIRMED",
                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                selectedClubId
            )
            .eq(
                "championship_id",
                championsSeason.id
            )
            .throwOnError();

        const {
            data,
            error
        } =
            await client
                .from(CHAMPIONS_REGISTRATIONS_TABLE)
                .select("*")
                .eq(
                    "championship_id",
                    championsSeason.id
                );

        if (error) {
            throw error;
        }

        championsRegistrations =
            data || [];

        refreshChampionsTeamOptions();
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
                        club?.champions_clubs?.name ||
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