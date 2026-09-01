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

    let occupiedBrasileiraoMobileTeams =
        new Set();


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

        seasonNumber:
            document.querySelector("#season-number"),

        seasonName:
            document.querySelector("#season-name"),

        seasonStatus:
            document.querySelector("#season-status"),

        seasonCurrentRound:
            document.querySelector("#season-current-round"),

        seasonTotalRounds:
            document.querySelector("#season-total-rounds"),

        seasonStartDate:
            document.querySelector("#season-start-date"),

        seasonEndDate:
            document.querySelector("#season-end-date"),

        seasonIsActive:
            document.querySelector("#season-is-active"),

        seasonPreviewName:
            document.querySelector("#season-preview-name"),

        seasonPreviewStatus:
            document.querySelector("#season-preview-status"),

        seasonPreviewRound:
            document.querySelector("#season-preview-round"),

        saveSeasonSettings:
            document.querySelector("#save-season-settings"),

        seasonSettingsFeedback:
            document.querySelector("#season-settings-feedback"),

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

        mobilePlayerCompetitions:
            document.querySelector(
                "#mobile-player-competitions"
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


    const MOBILE_BRASILEIRAO_COMPETITION = "BRASILEIRAO_MOBILE";
    const ARENA_CUP_MOBILE_COMPETITION = "ARENA_CUP_MOBILE";

    function rebuildOccupiedBrasileiraoMobileTeams(exceptPlayerId = null) {
        occupiedBrasileiraoMobileTeams = new Set();
        players.forEach((player) => {
            if (exceptPlayerId && String(player.id) === String(exceptPlayerId)) return;
            (player.competitions || []).forEach((competition) => {
                if (String(competition.competition || "").toUpperCase() !== MOBILE_BRASILEIRAO_COMPETITION) return;
                const team = normalizeTeamName(competition.team_name);
                if (team) occupiedBrasileiraoMobileTeams.add(team);
            });
        });
    }

    function refreshBrasileiraoMobileTeamOptions() {
        const select = dom.brasileiraoMobileTeam;
        if (!select) return;

        rebuildOccupiedBrasileiraoMobileTeams(editingPlayerId);

        const current = normalizeTeamName(select.value);
        const availableTeams = BRASILEIRAO_TEAMS.filter((team) => {
            const normalized = normalizeTeamName(team);
            return !occupiedBrasileiraoMobileTeams.has(normalized) || normalized === current;
        });

        select.innerHTML = '<option value="">Selecione o clube</option>' +
            availableTeams
                .map((team) => `<option value="${escapeHTML(team)}">${escapeHTML(team)}</option>`)
                .join("");

        if (current && availableTeams.some((team) => normalizeTeamName(team) === current)) {
            select.value = availableTeams.find((team) => normalizeTeamName(team) === current) || "";
        } else {
            select.value = "";
        }
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
       CONFIGURAÇÃO GLOBAL DA SEASON
       ===================================================== */

    const formatSeasonNumber = (value) =>
        String(Math.max(1, Number(value || 1))).padStart(2, "0");

    function updateSeasonPreview() {
        const number = Math.max(1, Number(dom.seasonNumber?.value || 1));
        const name = (dom.seasonName?.value || `SEASON ${formatSeasonNumber(number)}`).trim();
        const status = dom.seasonStatus?.value || "PREPARANDO";
        const round = Math.max(1, Number(dom.seasonCurrentRound?.value || 1));
        const total = Math.max(round, Number(dom.seasonTotalRounds?.value || 38));

        if (dom.seasonPreviewName) dom.seasonPreviewName.textContent = name;
        if (dom.seasonPreviewStatus) dom.seasonPreviewStatus.textContent = status;
        if (dom.seasonPreviewRound) dom.seasonPreviewRound.textContent = `${formatSeasonNumber(round)} / ${formatSeasonNumber(total)}`;
    }

    async function loadSeasonSettings() {
        const client = await getSupabase();
        const { data, error } = await client
            .rpc("get_ccfv_settings");

        if (error) throw error;
        const row = data?.[0] || data;
        if (!row) return;

        if (dom.seasonNumber) dom.seasonNumber.value = row.season_number ?? 1;
        if (dom.seasonName) dom.seasonName.value = row.season_name || `SEASON ${formatSeasonNumber(row.season_number || 1)}`;
        if (dom.seasonStatus) dom.seasonStatus.value = row.season_status || "PREPARANDO";
        if (dom.seasonCurrentRound) dom.seasonCurrentRound.value = row.current_round ?? 1;
        if (dom.seasonTotalRounds) dom.seasonTotalRounds.value = row.total_rounds ?? 38;
        if (dom.seasonStartDate) dom.seasonStartDate.value = row.start_date || "";
        if (dom.seasonEndDate) dom.seasonEndDate.value = row.end_date || "";
        if (dom.seasonIsActive) dom.seasonIsActive.checked = row.is_active !== false;

        updateSeasonPreview();
    }

    async function saveSeasonSettings() {
        const client = await getSupabase();
        const seasonNumber = Math.max(1, Number(dom.seasonNumber?.value || 1));
        const totalRounds = Math.max(1, Number(dom.seasonTotalRounds?.value || 38));
        const currentRound = Math.min(totalRounds, Math.max(1, Number(dom.seasonCurrentRound?.value || 1)));
        const seasonName = (dom.seasonName?.value || `SEASON ${formatSeasonNumber(seasonNumber)}`).trim();

        if (dom.saveSeasonSettings) dom.saveSeasonSettings.disabled = true;
        if (dom.seasonSettingsFeedback) dom.seasonSettingsFeedback.textContent = "SALVANDO...";

        try {
            const { error } = await client.rpc("save_ccfv_settings", {
                p_season_number: seasonNumber,
                p_season_name: seasonName,
                p_season_status: dom.seasonStatus?.value || "PREPARANDO",
                p_current_round: currentRound,
                p_total_rounds: totalRounds,
                p_start_date: dom.seasonStartDate?.value || null,
                p_end_date: dom.seasonEndDate?.value || null,
                p_is_active: dom.seasonIsActive?.checked !== false
            });

            if (error) throw error;
            if (dom.seasonCurrentRound) dom.seasonCurrentRound.value = currentRound;
            updateSeasonPreview();
            if (dom.seasonSettingsFeedback) dom.seasonSettingsFeedback.textContent = "CONFIGURAÇÃO SALVA.";
            showToast("Season atualizada com sucesso.");
        } catch (error) {
            console.error("CCFV // SEASON SETTINGS ERROR:", error);
            if (dom.seasonSettingsFeedback) dom.seasonSettingsFeedback.textContent = error?.message || "ERRO AO SALVAR.";
            showToast(error?.message || "ERRO AO SALVAR CONFIGURAÇÃO.");
        } finally {
            if (dom.saveSeasonSettings) dom.saveSeasonSettings.disabled = false;
        }
    }

    function bindSeasonSettings() {
        [
            dom.seasonNumber, dom.seasonName, dom.seasonStatus,
            dom.seasonCurrentRound, dom.seasonTotalRounds
        ].forEach((element) => {
            element?.addEventListener("input", updateSeasonPreview);
            element?.addEventListener("change", updateSeasonPreview);
        });

        dom.saveSeasonSettings?.addEventListener("click", saveSeasonSettings);
        updateSeasonPreview();
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
            rebuildOccupiedBrasileiraoMobileTeams(editingPlayerId);


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

                            const competitionName = String(competition.competition || "").toUpperCase();

                            if (competitionName === MOBILE_BRASILEIRAO_COMPETITION) {
                                const mobileTeam = normalizeTeamName(competition.team_name);
                                if (mobileTeam) occupiedBrasileiraoMobileTeams.add(mobileTeam);
                                return;
                            }

                            if (competitionName !== "BRASILEIRAO") {
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
        const isMobile = String(dom.playerPlatform?.value || "PC").toUpperCase() === "MOBILE";
        const brasileirao = Boolean(dom.competitionBrasileirao?.checked) && !isMobile;
        const night = Boolean(dom.competitionNight?.checked) && !isMobile;
        const brasileiraoMobile = Boolean(dom.competitionBrasileiraoMobile?.checked) && isMobile;
        const arenaMobile = Boolean(dom.competitionArenaMobile?.checked) && isMobile;

        if (isMobile) {
            if (dom.competitionBrasileirao) dom.competitionBrasileirao.checked = false;
            if (dom.competitionNight) dom.competitionNight.checked = false;
        } else {
            if (dom.competitionBrasileiraoMobile) dom.competitionBrasileiraoMobile.checked = false;
            if (dom.competitionArenaMobile) dom.competitionArenaMobile.checked = false;
        }

        dom.competitionBrasileiraoLabel?.classList.toggle("is-selected", brasileirao);
        dom.competitionNightLabel?.classList.toggle("is-selected", night);
        dom.competitionBrasileiraoMobileLabel?.classList.toggle("is-selected", brasileiraoMobile);
        dom.competitionArenaMobileLabel?.classList.toggle("is-selected", arenaMobile);

        dom.competitionBrasileiraoLabel?.setAttribute("aria-checked", brasileirao ? "true" : "false");
        dom.competitionNightLabel?.setAttribute("aria-checked", night ? "true" : "false");
        dom.competitionBrasileiraoMobileLabel?.setAttribute("aria-checked", brasileiraoMobile ? "true" : "false");
        dom.competitionArenaMobileLabel?.setAttribute("aria-checked", arenaMobile ? "true" : "false");

        if (dom.mobilePlayerCompetitions) dom.mobilePlayerCompetitions.style.display = isMobile ? "grid" : "none";
        if (dom.brasileiraoConfig) { dom.brasileiraoConfig.classList.toggle("is-visible", brasileirao); dom.brasileiraoConfig.style.display = brasileirao ? "block" : "none"; }
        if (dom.nightConfig) { dom.nightConfig.classList.toggle("is-visible", night); dom.nightConfig.style.display = night ? "block" : "none"; }
        if (dom.brasileiraoMobileConfig) { dom.brasileiraoMobileConfig.classList.toggle("is-visible", brasileiraoMobile); dom.brasileiraoMobileConfig.style.display = brasileiraoMobile ? "block" : "none"; }

        refreshBrasileiraoTeamOptions();
        refreshBrasileiraoMobileTeamOptions();
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
        if (dom.competitionBrasileiraoMobile) dom.competitionBrasileiraoMobile.checked = false;
        if (dom.competitionArenaMobile) dom.competitionArenaMobile.checked = false;


        dom.brasileiraoTeam.value =
            "";


        dom.nightTeam.value =
            "";
        if (dom.brasileiraoMobileTeam) dom.brasileiraoMobileTeam.value = "";


        resetPhotoPreview();


        rebuildOccupiedBrasileiraoTeams();
        rebuildOccupiedBrasileiraoMobileTeams();


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

        dom.playerPlatform.value =
            "MOBILE";

        dom.competitionBrasileirao.checked =
            false;

        dom.competitionNight.checked =
            false;

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
        if (dom.competitionBrasileiraoMobile) dom.competitionBrasileiraoMobile.checked = false;
        if (dom.competitionArenaMobile) dom.competitionArenaMobile.checked = false;


        dom.brasileiraoTeam.value =
            "";


        dom.nightTeam.value =
            "";
        if (dom.brasileiraoMobileTeam) dom.brasileiraoMobileTeam.value = "";


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

                    if (item.competition === MOBILE_BRASILEIRAO_COMPETITION) {
                        if (dom.competitionBrasileiraoMobile) dom.competitionBrasileiraoMobile.checked = true;
                        if (dom.brasileiraoMobileTeam) dom.brasileiraoMobileTeam.value = item.team_name || "";
                    }

                    if (item.competition === ARENA_CUP_MOBILE_COMPETITION) {
                        if (dom.competitionArenaMobile) dom.competitionArenaMobile.checked = true;
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


        rebuildOccupiedBrasileiraoTeams(
            editingPlayerId
        );


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
        const selected = [];
        const isMobile = String(dom.playerPlatform?.value || "PC").toUpperCase() === "MOBILE";

        if (isMobile) {
            if (dom.competitionBrasileiraoMobile?.checked) {
                const team = dom.brasileiraoMobileTeam?.value?.trim() || "";
                if (!team) throw new Error("SELECIONE O CLUBE DO BRASILEIRÃO MOBILE.");
                rebuildOccupiedBrasileiraoMobileTeams(editingPlayerId);
                if (occupiedBrasileiraoMobileTeams.has(normalizeTeamName(team))) {
                    throw new Error("ESSE CLUBE JÁ FOI ESCOLHIDO POR OUTRO JOGADOR MOBILE.");
                }
                selected.push({ competition: MOBILE_BRASILEIRAO_COMPETITION, team_name: team });
            }

            if (dom.competitionArenaMobile?.checked) {
                selected.push({ competition: ARENA_CUP_MOBILE_COMPETITION, team_name: "" });
            }
        } else {
            if (dom.competitionBrasileirao.checked) {
                const team = dom.brasileiraoTeam.value.trim();
                if (!team) throw new Error("SELECIONE O CLUBE DO BRASILEIRÃO.");
                rebuildOccupiedBrasileiraoTeams(editingPlayerId);
                if (occupiedBrasileiraoTeams.has(normalizeTeamName(team))) throw new Error("ESSE CLUBE JÁ FOI ESCOLHIDO POR OUTRO JOGADOR.");
                selected.push({ competition: "BRASILEIRAO", team_name: team });
            }

            if (dom.competitionNight.checked) {
                const team = dom.nightTeam.value.trim();
                if (!team) throw new Error("INFORME O TIME DA NIGHT CUP.");
                selected.push({ competition: "NIGHT_CUP", team_name: team });
            }
        }

        if (selected.length === 0 && !isMobile) throw new Error("SELECIONE PELO MENOS UMA COMPETIÇÃO.");
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


        dom.playerPlatform?.addEventListener("change", () => {
            updateCompetitionUI();
        });

        dom.competitionBrasileiraoMobile?.addEventListener("change", updateCompetitionUI);
        dom.competitionArenaMobile?.addEventListener("change", updateCompetitionUI);

        dom.brasileiraoMobileTeam?.addEventListener("change", () => {
            const selectedTeam = normalizeTeamName(dom.brasileiraoMobileTeam.value);
            rebuildOccupiedBrasileiraoMobileTeams(editingPlayerId);
            if (selectedTeam && occupiedBrasileiraoMobileTeams.has(selectedTeam)) {
                dom.brasileiraoMobileTeam.value = "";
                showToast("ESSE CLUBE JÁ FOI ESCOLHIDO POR OUTRO JOGADOR MOBILE.");
            }
            refreshBrasileiraoMobileTeamOptions();
        });

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

        bindSeasonSettings();


        rebuildOccupiedBrasileiraoTeams();


        updateCompetitionUI();


        updateRankPreview();


        try {

            await getSupabase();

            try {
                await loadSeasonSettings();
            } catch (seasonError) {
                console.warn("CCFV // SEASON SETTINGS UNAVAILABLE:", seasonError);
            }


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