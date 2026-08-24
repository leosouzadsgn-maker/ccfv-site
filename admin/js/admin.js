/* =========================================================
   CCFV ADMIN
   SUPABASE DATABASE
   PLAYER MANAGEMENT
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const PLAYERS_TABLE = "players";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient = null;

    let players = [];

    let activePlatformFilter = "all";

    let editingPlayerId = null;


    /* =====================================================
       CONFIGURAÇÃO DE ELO
       ===================================================== */

    const RANK_CONFIG = {

        beginner: {
            name: "INICIANTE",
            key: "beginner",
            min: 0,
            max: 999,
            color: "#8d9a95"
        },

        amateur: {
            name: "AMADOR",
            key: "amateur",
            min: 1000,
            max: 1999,
            color: "#69a8ff"
        },

        professional: {
            name: "PROFISSIONAL",
            key: "professional",
            min: 2000,
            max: 2999,
            color: "#43df91"
        },

        legend: {
            name: "LENDA",
            key: "legend",
            min: 3000,
            max: Infinity,
            color: "#ffc252"
        }

    };


    /* =====================================================
       DOM
       ===================================================== */

    const dom = {

        sidebar:
            document.querySelector("#admin-sidebar"),

        mobileMenu:
            document.querySelector("#admin-mobile-menu"),

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
            document.querySelector("#player-modal"),

        modalTitle:
            document.querySelector("#player-modal-title"),

        closeModalButtons:
            document.querySelectorAll(
                "[data-close-player-modal]"
            ),

        form:
            document.querySelector("#player-form"),

        newPlayerButton:
            document.querySelector("#new-player-button"),

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

        playerElo:
            document.querySelector(
                "#player-elo"
            ),

        playerWins:
            document.querySelector(
                "#player-wins"
            ),

        playerDraws:
            document.querySelector(
                "#player-draws"
            ),

        playerLosses:
            document.querySelector(
                "#player-losses"
            ),

        playerTitles:
            document.querySelector(
                "#player-titles"
            ),

        playerPhoto:
            document.querySelector(
                "#player-photo"
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
       UTILITÁRIOS
       ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")

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


    function getInitials(name) {

        const words =
            String(name || "")
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (!words.length) {

            return "--";

        }


        if (words.length === 1) {

            return words[0]
                .slice(0, 2)
                .toUpperCase();

        }


        return (
            words[0][0] +
            words[1][0]
        ).toUpperCase();

    }


    function formatNumber(value) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR"
        );

    }


    /* =====================================================
       RANK
       ===================================================== */

    function getRank(elo) {

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
                "Sistema de autenticação ainda não está disponível."
            );

        }


        supabaseClient =
            await window.CCFVAuth.getClient();


        if (
            !supabaseClient
        ) {

            throw new Error(
                "Não foi possível conectar ao Supabase."
            );

        }


        return supabaseClient;

    }


    /* =====================================================
       CÓDIGO CCFV
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
                )

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )

                .limit(1000);


        if (
            error
        ) {

            throw error;

        }


        let highest =
            0;


        (data || []).forEach(
            player => {

                const match =
                    String(
                        player.player_code || ""
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
       CARREGAR JOGADORES
       ===================================================== */

    async function loadPlayers() {

        try {

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
                        "*"
                    )

                    .order(
                        "elo",
                        {
                            ascending: false
                        }
                    );


            if (
                error
            ) {

                throw error;

            }


            players =
                Array.isArray(data)
                    ? data
                    : [];


            renderPlayers();

            updateDashboardStats();


            console.log(
                "CCFV // PLAYERS LOADED:",
                players.length
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // LOAD PLAYERS ERROR:",
                error
            );


            players = [];


            renderPlayers();

            updateDashboardStats();


            showToast(
                "ERRO AO CARREGAR JOGADORES."
            );

        }

    }


    /* =====================================================
       PEGAR JOGADORES FILTRADOS
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
       RENDER JOGADORES
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
            filtered.length === 0
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


                const rankClass =
                    rank.key;


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
                                admin-badge--${rankClass}
                            "
                        >

                            ${escapeHTML(
                                rank.name
                            )}

                        </span>

                    </td>


                    <td>

                        <span
                            class="admin-status"
                        >

                            <i></i>

                            ${player.status === "ACTIVE"
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


        /*
         * A tabela de partidas ainda não foi criada.
         * Por enquanto permanece 00.
         */

        if (
            dom.statMatches
        ) {

            dom.statMatches.textContent =
                "00";

        }

    }


    /* =====================================================
       NOVO JOGADOR
       ===================================================== */

    function openNewPlayer() {

        editingPlayerId =
            null;


        if (
            dom.modalTitle
        ) {

            dom.modalTitle.textContent =
                "NOVO JOGADOR.";

        }


        dom.form?.reset();


        if (
            dom.playerId
        ) {

            dom.playerId.value =
                "";

        }


        if (
            dom.playerPlatform
        ) {

            dom.playerPlatform.value =
                "PC";

        }


        if (
            dom.playerElo
        ) {

            dom.playerElo.value =
                "0";

        }


        if (
            dom.playerWins
        ) {

            dom.playerWins.value =
                "0";

        }


        if (
            dom.playerDraws
        ) {

            dom.playerDraws.value =
                "0";

        }


        if (
            dom.playerLosses
        ) {

            dom.playerLosses.value =
                "0";

        }


        if (
            dom.playerTitles
        ) {

            dom.playerTitles.value =
                "0";

        }


        updateRankPreview();


        dom.modal?.classList.add(
            "is-open"
        );


        dom.modal?.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    /* =====================================================
       EDITAR JOGADOR
       ===================================================== */

    function openEditPlayer(id) {

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


        if (
            dom.modalTitle
        ) {

            dom.modalTitle.textContent =
                "EDITAR JOGADOR.";

        }


        dom.playerId.value =
            player.id;


        dom.playerName.value =
            player.name || "";


        dom.playerInstagram.value =
            player.instagram || "";


        dom.playerPlatform.value =
            player.platform || "PC";


        dom.playerElo.value =
            Number(
                player.elo || 0
            );


        dom.playerWins.value =
            Number(
                player.wins || 0
            );


        dom.playerDraws.value =
            Number(
                player.draws || 0
            );


        dom.playerLosses.value =
            Number(
                player.losses || 0
            );


        dom.playerTitles.value =
            Number(
                player.titles || 0
            );


        dom.playerPhoto.value =
            player.photo_url || "";


        updateRankPreview();


        dom.modal?.classList.add(
            "is-open"
        );


        dom.modal?.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }


    /* =====================================================
       FECHAR MODAL
       ===================================================== */

    function closePlayerModal() {

        dom.modal?.classList.remove(
            "is-open"
        );


        dom.modal?.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";


        editingPlayerId =
            null;

    }


    /* =====================================================
       PREVIEW ELO
       ===================================================== */

    function updateRankPreview() {

        if (
            !dom.playerElo
        ) {

            return;

        }


        const elo =
            Number(
                dom.playerElo.value
            ) || 0;


        const rank =
            getRank(
                elo
            );


        if (
            dom.playerRankPreview
        ) {

            dom.playerRankPreview.textContent =
                rank.name;


            dom.playerRankPreview.style.color =
                rank.color;

        }


        if (
            dom.playerEloPreview
        ) {

            dom.playerEloPreview.textContent =
                formatNumber(
                    elo
                );

        }

    }


    /* =====================================================
       SALVAR JOGADOR NO SUPABASE
       ===================================================== */

    async function savePlayerFromForm(
        event
    ) {

        event.preventDefault();


        const name =
            dom.playerName.value.trim();


        if (
            !name
        ) {

            showToast(
                "DIGITE O NOME DO JOGADOR."
            );

            return;

        }


        const client =
            await getSupabase();


        const playerPayload = {

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

            elo:
                Math.max(
                    0,
                    Number(
                        dom.playerElo.value
                    ) || 0
                ),

            photo_url:
                dom.playerPhoto.value
                    .trim() ||
                null,

            wins:
                Math.max(
                    0,
                    Number(
                        dom.playerWins.value
                    ) || 0
                ),

            draws:
                Math.max(
                    0,
                    Number(
                        dom.playerDraws.value
                    ) || 0
                ),

            losses:
                Math.max(
                    0,
                    Number(
                        dom.playerLosses.value
                    ) || 0
                ),

            titles:
                Math.max(
                    0,
                    Number(
                        dom.playerTitles.value
                    ) || 0
                ),

            status:
                "ACTIVE"

        };


        try {

            /*
             * EDITAR
             */

            if (
                editingPlayerId
            ) {

                const {
                    error
                } =
                    await client

                        .from(
                            PLAYERS_TABLE
                        )

                        .update(
                            playerPayload
                        )

                        .eq(
                            "id",
                            editingPlayerId
                        );


                if (
                    error
                ) {

                    throw error;

                }


                showToast(
                    "JOGADOR ATUALIZADO."
                );

            }

            /*
             * NOVO
             */

            else {

                const playerCode =
                    await generatePlayerCode();


                const {
                    error
                } =
                    await client

                        .from(
                            PLAYERS_TABLE
                        )

                        .insert({

                            ...playerPayload,

                            player_code:
                                playerCode

                        });


                if (
                    error
                ) {

                    throw error;

                }


                showToast(
                    "JOGADOR CADASTRADO."
                );

            }


            closePlayerModal();


            await loadPlayers();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // SAVE PLAYER ERROR:",
                error
            );


            console.error(
                "MESSAGE:",
                error?.message
            );


            console.error(
                "DETAILS:",
                error?.details
            );


            showToast(
                "ERRO AO SALVAR JOGADOR."
            );

        }

    }


    /* =====================================================
       EXCLUIR JOGADOR
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


            showToast(
                "JOGADOR EXCLUÍDO."
            );


            await loadPlayers();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // DELETE PLAYER ERROR:",
                error
            );


            showToast(
                "ERRO AO EXCLUIR JOGADOR."
            );

        }

    }


    /* =====================================================
       AÇÕES DA TABELA
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


        dom.playerElo?.addEventListener(
            "input",
            updateRankPreview
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


        dom.playerFilterButtons.forEach(
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
                2800
            );

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        console.log(
            "%cCCFV // ADMIN DATABASE",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        bindNavigation();

        bindMobileMenu();

        bindPlayerModal();

        bindSearchAndFilters();

        updateRankPreview();


        try {

            await getSupabase();

            await loadPlayers();


            console.log(
                "CCFV // SUPABASE DATABASE CONNECTED"
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // DATABASE INIT ERROR:",
                error
            );


            showToast(
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