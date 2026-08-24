/* =========================================================
   CCFV ADMIN
   PLAYER MANAGEMENT
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STORAGE
       ===================================================== */

    const PLAYER_STORAGE_KEY =
        "ccfv_players";


    const MATCH_STORAGE_KEY =
        "ccfv_matches";


    /* =====================================================
       ELO
       ===================================================== */

    const RANK_CONFIG = {

        beginner: {
            key: "beginner",
            name: "INICIANTE",
            min: 0,
            max: 999,
            color: "#8d9a95"
        },

        amateur: {
            key: "amateur",
            name: "AMADOR",
            min: 1000,
            max: 1999,
            color: "#69a8ff"
        },

        professional: {
            key: "professional",
            name: "PROFISSIONAL",
            min: 2000,
            max: 2999,
            color: "#43df91"
        },

        legend: {
            key: "legend",
            name: "LENDA",
            min: 3000,
            max: Infinity,
            color: "#ffc252"
        }

    };


    /* =====================================================
       STATE
       ===================================================== */

    let players =
        loadPlayers();


    let activePlatformFilter =
        "all";


    let editingPlayerId =
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

        form:
            document.querySelector(
                "#player-form"
            ),

        closeModalButtons:
            document.querySelectorAll(
                "[data-close-player-modal]"
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
       UTIL
       ===================================================== */

    function escapeHTML(value) {

        return String(value)

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
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (!words.length) {

            return "--";

        }


        if (
            words.length === 1
        ) {

            return words[0]
                .slice(0, 2)
                .toUpperCase();

        }


        return (
            words[0][0] +
            words[1][0]
        ).toUpperCase();

    }


    /* =====================================================
       STORAGE
       ===================================================== */

    function loadPlayers() {

        try {

            const raw =
                localStorage.getItem(
                    PLAYER_STORAGE_KEY
                );


            if (!raw) {

                return [];

            }


            const parsed =
                JSON.parse(
                    raw
                );


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // LOAD PLAYERS",
                error
            );


            return [];

        }

    }


    function savePlayers() {

        localStorage.setItem(
            PLAYER_STORAGE_KEY,
            JSON.stringify(
                players
            )
        );

    }


    function loadMatchesCount() {

        try {

            const raw =
                localStorage.getItem(
                    MATCH_STORAGE_KEY
                );


            if (!raw) {

                return 0;

            }


            const parsed =
                JSON.parse(
                    raw
                );


            return Array.isArray(
                parsed
            )
                ? parsed.length
                : 0;

        }

        catch {

            return 0;

        }

    }


    /* =====================================================
       RANK
       ===================================================== */

    function getRank(
        elo
    ) {

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
       PLAYER ID
       ===================================================== */

    function generatePlayerId() {

        let id =
            1;


        while (
            players.some(
                player =>
                    String(
                        player.id
                    ) ===
                    String(
                        id
                    )
            )
        ) {

            id++;

        }


        return String(
            id
        ).padStart(
            3,
            "0"
        );

    }


    /* =====================================================
       SECTION NAVIGATION
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


        if (
            dom.sidebar
        ) {

            dom.sidebar.classList.remove(
                "is-open"
            );

        }

    }


    /* =====================================================
       OPEN NEW PLAYER
       ===================================================== */

    function openNewPlayer() {

        editingPlayerId =
            null;


        dom.modalTitle.textContent =
            "NOVO JOGADOR.";


        dom.form.reset();


        dom.playerId.value =
            "";


        dom.playerElo.value =
            "0";


        dom.playerWins.value =
            "0";


        dom.playerDraws.value =
            "0";


        dom.playerLosses.value =
            "0";


        dom.playerTitles.value =
            "0";


        dom.playerPlatform.value =
            "PC";


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


        setTimeout(
            () => {

                dom.playerName.focus();

            },
            80
        );

    }


    /* =====================================================
       OPEN EDIT
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


        if (!player) {

            return;

        }


        editingPlayerId =
            player.id;


        dom.modalTitle.textContent =
            "EDITAR JOGADOR.";


        dom.playerId.value =
            player.id;


        dom.playerName.value =
            player.name ||
            "";


        dom.playerInstagram.value =
            player.instagram ||
            "";


        dom.playerPlatform.value =
            player.platform ||
            "PC";


        dom.playerElo.value =
            Number(
                player.elo ||
                0
            );


        dom.playerWins.value =
            Number(
                player.wins ||
                0
            );


        dom.playerDraws.value =
            Number(
                player.draws ||
                0
            );


        dom.playerLosses.value =
            Number(
                player.losses ||
                0
            );


        dom.playerTitles.value =
            Number(
                player.titles ||
                0
            );


        dom.playerPhoto.value =
            player.photo ||
            "";


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
       CLOSE MODAL
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
       PREVIEW
       ===================================================== */

    function updateRankPreview() {

        const elo =
            Number(
                dom.playerElo.value
            ) || 0;


        const rank =
            getRank(
                elo
            );


        dom.playerRankPreview.textContent =
            rank.name;


        dom.playerRankPreview.style.color =
            rank.color;


        dom.playerEloPreview.textContent =
            String(
                elo
            );

    }


    /* =====================================================
       SAVE PLAYER
       ===================================================== */

    function savePlayerFromForm(
        event
    ) {

        event.preventDefault();


        const name =
            dom.playerName.value
                .trim();


        if (!name) {

            showToast(
                "DIGITE O NOME DO JOGADOR."
            );

            dom.playerName.focus();

            return;

        }


        const elo =
            Math.max(
                0,
                Number(
                    dom.playerElo.value
                ) || 0
            );


        const playerData = {

            id:
                editingPlayerId ||
                generatePlayerId(),

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

                elo,

            photo:

                dom.playerPhoto.value
                    .trim(),

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


        if (
            editingPlayerId
        ) {

            const index =
                players.findIndex(
                    player =>
                        String(
                            player.id
                        ) ===
                        String(
                            editingPlayerId
                        )
                );


            if (
                index !==
                -1
            ) {

                players[index] =
                    {
                        ...players[index],
                        ...playerData
                    };

            }

        }

        else {

            players.push(
                playerData
            );

        }


        savePlayers();


        renderPlayers();

        updateDashboardStats();


        closePlayerModal();


        showToast(
            editingPlayerId
                ? "JOGADOR ATUALIZADO."
                : "JOGADOR CADASTRADO."
        );

    }


    /* =====================================================
       FILTER
       ===================================================== */

    function getFilteredPlayers() {

        const search =
            dom.playerSearch.value
                .trim()
                .toLowerCase();


        return players.filter(
            player => {

                const platformOK =
                    activePlatformFilter ===
                    "all" ||

                    String(
                        player.platform ||
                        ""
                    )
                    .toUpperCase() ===
                    activePlatformFilter;


                const searchOK =
                    !search ||

                    String(
                        player.name ||
                        ""
                    )
                    .toLowerCase()
                    .includes(
                        search
                    ) ||

                    String(
                        player.instagram ||
                        ""
                    )
                    .toLowerCase()
                    .includes(
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
            ) =>
                Number(
                    b.elo ||
                    0
                ) -

                Number(
                    a.elo ||
                    0
                )
        );

    }


    /* =====================================================
       RENDER PLAYERS
       ===================================================== */

    function renderPlayers() {

        const filtered =
            getFilteredPlayers();


        dom.playerTable.innerHTML =
            "";


        if (
            !filtered.length
        ) {

            dom.playerEmpty.classList.add(
                "is-visible"
            );


            dom.playerTable.parentElement
                .classList.add(
                    "is-empty"
                );


            return;

        }


        dom.playerEmpty.classList.remove(
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
                            class="
                                admin-player
                            "
                        >

                            <div
                                class="
                                    admin-player__photo
                                "
                            >

                                ${
                                    player.photo

                                    ?

                                    `
                                        <img
                                            src="${escapeHTML(
                                                player.photo
                                            )}"
                                            alt="${escapeHTML(
                                                player.name
                                            )}"
                                        >
                                    `

                                    :

                                    getInitials(
                                        player.name
                                    )
                                }

                            </div>


                            <div
                                class="
                                    admin-player__name
                                "
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
                            class="
                                admin-elo
                            "
                        >

                            ${Number(
                                player.elo ||
                                0
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

                        <span
                            class="
                                admin-status
                            "
                        >

                            <i></i>

                            ATIVO

                        </span>

                    </td>


                    <td>

                        <div
                            class="
                                admin-actions
                            "
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
       EDIT / DELETE ACTIONS
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
                                button.dataset.editPlayer
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
                                button.dataset.deletePlayer
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       DELETE
       ===================================================== */

    function deletePlayer(
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


        if (!player) {

            return;

        }


        const confirmed =
            window.confirm(
                `Excluir o jogador "${player.name}"?`
            );


        if (!confirmed) {

            return;

        }


        const index =
            players.findIndex(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        id
                    )
            );


        if (
            index ===
            -1
        ) {

            return;

        }


        players.splice(
            index,
            1
        );


        savePlayers();


        renderPlayers();

        updateDashboardStats();


        showToast(
            "JOGADOR EXCLUÍDO."
        );

    }


    /* =====================================================
       DASHBOARD STATS
       ===================================================== */

    function updateDashboardStats() {

        if (
            dom.statPlayers
        ) {

            dom.statPlayers.textContent =
                String(
                    players.length
                )
                .padStart(
                    2,
                    "0"
                );

        }


        if (
            dom.statMatches
        ) {

            dom.statMatches.textContent =
                String(
                    loadMatchesCount()
                )
                .padStart(
                    2,
                    "0"
                );

        }

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

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
                2600
            );

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

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


        dom.form.addEventListener(
            "submit",
            savePlayerFromForm
        );


        dom.playerElo.addEventListener(
            "input",
            updateRankPreview
        );


        dom.modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    dom.modal
                ) {

                    closePlayerModal();

                }

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


    function bindPlayerSearch() {

        dom.playerSearch.addEventListener(
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
                            button.dataset.adminFilter;


                        renderPlayers();

                    }
                );

            }
        );

    }


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        bindNavigation();

        bindMobileMenu();

        bindPlayerModal();

        bindPlayerSearch();

        renderPlayers();

        updateDashboardStats();


        console.log(
            "%cCCFV // ADMIN",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        console.log(
            "Painel administrativo iniciado."
        );


        console.log(
            "Base atual: localStorage."
        );

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