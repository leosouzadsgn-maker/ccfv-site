/* =========================================================
   CCFV // COMPETITION GUARD
   ADMIN — JOGADORES / COMPETIÇÕES / CLUBES

   Responsabilidades:
   - Abrir o modal de novo jogador com segurança.
   - Garantir seleção visual do Brasileirão/Night Cup.
   - Mostrar/ocultar configurações das competições.
   - Consultar player_competitions.
   - Bloquear clubes do Brasileirão já ocupados.
   - Permitir que um jogador editado mantenha o próprio clube.
   - Funcionar mesmo que o bind do admin.js falhe.
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const BRASILEIRAO =
        "BRASILEIRAO";

    const NIGHT_CUP =
        "NIGHT_CUP";

    const REFRESH_INTERVAL =
        15000;


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient =
        null;

    let occupiedTeams =
        new Set();

    let refreshTimer =
        null;


    /* =====================================================
       DOM
       ===================================================== */

    function dom() {

        return {

            modal:
                document.querySelector(
                    "#player-modal"
                ),

            modalTitle:
                document.querySelector(
                    "#player-modal-title"
                ),

            modalCloseButtons:
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

            form:
                document.querySelector(
                    "#player-form"
                ),

            playerId:
                document.querySelector(
                    "#player-id"
                ),

            playerPlatform:
                document.querySelector(
                    "#player-platform"
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

            photoPreview:
                document.querySelector(
                    "#player-photo-preview"
                )

        };

    }


    /* =====================================================
       NORMALIZAÇÃO
       ===================================================== */

    function normalize(
        value
    ) {

        return String(
            value ?? ""
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
            window.CCFVAuth &&
            typeof
                window.CCFVAuth.getClient ===
            "function"
        ) {

            try {

                supabaseClient =
                    await
                        window.CCFVAuth
                            .getClient();

                return supabaseClient;

            }
            catch (
                error
            ) {

                console.warn(
                    "CCFV // AUTH:",
                    error
                );

            }

        }


        const start =
            Date.now();


        while (
            Date.now() -
            start <
            10000
        ) {

            if (
                window.CCFVAuth &&
                typeof
                    window.CCFVAuth.getClient ===
                "function"
            ) {

                try {

                    supabaseClient =
                        await
                            window.CCFVAuth
                                .getClient();

                    return supabaseClient;

                }
                catch (
                    error
                ) {

                    console.warn(
                        "CCFV // AUTH:",
                        error
                    );

                    return null;

                }

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

        }


        return null;

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function toast(
        message
    ) {

        const element =
            document.querySelector(
                "#admin-toast"
            );


        if (
            !element
        ) {

            console.warn(
                "CCFV //",
                message
            );

            return;

        }


        element.textContent =
            message;


        element.classList.add(
            "is-visible"
        );


        clearTimeout(
            element._ccfvTimer
        );


        element._ccfvTimer =
            setTimeout(
                () => {

                    element.classList.remove(
                        "is-visible"
                    );

                },
                3000
            );

    }


    /* =====================================================
       ABRIR MODAL — CAMADA DE SEGURANÇA
       ===================================================== */

    function openPlayerModal() {

        const d =
            dom();


        if (
            !d.modal
        ) {

            console.error(
                "CCFV // MODAL #player-modal NÃO ENCONTRADO."
            );

            return;

        }


        /*
         * Reset básico.
         *
         * O admin.js também faz esse trabalho,
         * mas esta camada garante que o modal abra
         * mesmo quando o bind original falhar.
         */

        if (
            d.form
        ) {

            try {

                d.form.reset();

            }
            catch (
                error
            ) {

                console.warn(
                    "CCFV // FORM RESET:",
                    error
                );

            }

        }


        if (
            d.playerId
        ) {

            d.playerId.value =
                "";

        }


        if (
            d.playerPlatform
        ) {

            d.playerPlatform.value =
                "PC";

        }


        if (
            d.competitionBrasileirao
        ) {

            d.competitionBrasileirao.checked =
                false;

        }


        if (
            d.competitionNight
        ) {

            d.competitionNight.checked =
                false;

        }


        if (
            d.brasileiraoTeam
        ) {

            d.brasileiraoTeam.value =
                "";

        }


        if (
            d.nightTeam
        ) {

            d.nightTeam.value =
                "";

        }


        if (
            d.modalTitle
        ) {

            d.modalTitle.textContent =
                "NOVO JOGADOR.";

        }


        if (
            d.photoPreview
        ) {

            d.photoPreview.innerHTML =
                "FOTO";

        }


        /*
         * Atualiza seleção visual.
         */

        refreshCompetitionUI();


        /*
         * Abre pelo sistema oficial.
         */

        d.modal.classList.add(
            "is-open"
        );


        d.modal.setAttribute(
            "aria-hidden",
            "false"
        );


        /*
         * Garantia visual:
         * caso alguma regra de CSS esteja impedindo
         * a abertura, estas propriedades inline
         * garantem a visibilidade.
         */

        d.modal.style.display =
            "flex";

        d.modal.style.visibility =
            "visible";

        d.modal.style.opacity =
            "1";

        d.modal.style.pointerEvents =
            "auto";


        document.body.style.overflow =
            "hidden";


        /*
         * Recarrega disponibilidade dos clubes
         * somente depois que o modal está aberto.
         */

        loadOccupiedTeams();


        /*
         * Foco no primeiro campo.
         */

        setTimeout(
            () => {

                const name =
                    document.querySelector(
                        "#player-name"
                    );


                if (
                    name
                ) {

                    name.focus();

                }

            },
            50
        );

    }


    /* =====================================================
       FECHAR MODAL
       ===================================================== */

    function closePlayerModal() {

        const d =
            dom();


        if (
            !d.modal
        ) {

            return;

        }


        d.modal.classList.remove(
            "is-open"
        );


        d.modal.setAttribute(
            "aria-hidden",
            "true"
        );


        d.modal.style.display =
            "";

        d.modal.style.visibility =
            "";

        d.modal.style.opacity =
            "";

        d.modal.style.pointerEvents =
            "";


        document.body.style.overflow =
            "";

    }


    /* =====================================================
       SELEÇÃO DAS COMPETIÇÕES
       ===================================================== */

    function refreshCompetitionUI() {

        const d =
            dom();


        const brasileirao =
            Boolean(
                d.competitionBrasileirao &&
                d.competitionBrasileirao.checked
            );


        const night =
            Boolean(
                d.competitionNight &&
                d.competitionNight.checked
            );


        if (
            d.competitionBrasileiraoLabel
        ) {

            d.competitionBrasileiraoLabel
                .classList
                .toggle(
                    "is-selected",
                    brasileirao
                );

            d.competitionBrasileiraoLabel
                .setAttribute(
                    "aria-checked",
                    brasileirao
                        ? "true"
                        : "false"
                );

        }


        if (
            d.competitionNightLabel
        ) {

            d.competitionNightLabel
                .classList
                .toggle(
                    "is-selected",
                    night
                );

            d.competitionNightLabel
                .setAttribute(
                    "aria-checked",
                    night
                        ? "true"
                        : "false"
                );

        }


        if (
            d.brasileiraoConfig
        ) {

            d.brasileiraoConfig
                .classList
                .toggle(
                    "is-visible",
                    brasileirao
                );

            d.brasileiraoConfig.style.display =
                brasileirao
                    ? ""
                    : "none";

        }


        if (
            d.nightConfig
        ) {

            d.nightConfig
                .classList
                .toggle(
                    "is-visible",
                    night
                );

            d.nightConfig.style.display =
                night
                    ? ""
                    : "none";

        }

    }


    /* =====================================================
       CARREGAR CLUBES OCUPADOS
       ===================================================== */

    async function loadOccupiedTeams() {

        const client =
            await getSupabase();


        if (
            !client
        ) {

            return;

        }


        try {

            const result =
                await client
                    .from(
                        "player_competitions"
                    )
                    .select(
                        "player_id,competition,team_name"
                    )
                    .eq(
                        "competition",
                        BRASILEIRAO
                    );


            if (
                result.error
            ) {

                throw result.error;

            }


            const currentPlayerId =
                document.querySelector(
                    "#player-id"
                )?.value ||
                "";


            occupiedTeams =
                new Set(
                    (
                        result.data ||
                        []
                    )
                        .filter(
                            row =>
                                String(
                                    row.player_id
                                ) !==
                                String(
                                    currentPlayerId
                                )
                        )
                        .map(
                            row =>
                                normalize(
                                    row.team_name
                                )
                        )
                        .filter(
                            Boolean
                        )
                );


            refreshTeamOptions();

        }
        catch (
            error
        ) {

            console.error(
                "CCFV // CLUBES:",
                error
            );

        }

    }


    /* =====================================================
       ATUALIZAR OPTIONS DO BRASILEIRÃO
       ===================================================== */

    function refreshTeamOptions() {

        const d =
            dom();


        const select =
            d.brasileiraoTeam;


        if (
            !select
        ) {

            return;

        }


        const currentValue =
            normalize(
                select.value
            );


        Array.from(
            select.options
        )
            .forEach(
                option => {

                    const value =
                        normalize(
                            option.value ||
                            option.textContent
                        );


                    /*
                     * Placeholder.
                     */

                    if (
                        !value ||
                        value.includes(
                            "SELECIONE"
                        )
                    ) {

                        option.disabled =
                            false;

                        option.removeAttribute(
                            "data-team-occupied"
                        );

                        return;

                    }


                    const occupied =
                        occupiedTeams.has(
                            value
                        );


                    const currentlySelected =
                        value ===
                        currentValue;


                    /*
                     * Se o clube está ocupado e não
                     * é o valor atual do jogador,
                     * fica bloqueado.
                     */

                    const disabled =
                        occupied &&
                        !currentlySelected;


                    option.disabled =
                        disabled;


                    option.dataset.teamOccupied =
                        disabled
                            ? "true"
                            : "false";


                    option.title =
                        disabled
                            ? "Clube já ocupado"
                            : "";

                }
            );


        /*
         * Classe visual.
         */

        select.classList.toggle(
            "is-valid",
            Boolean(
                select.value
            )
        );

    }


    /* =====================================================
       ALTERAÇÃO DE CLUBE
       ===================================================== */

    function handleTeamChange() {

        const d =
            dom();


        if (
            !d.brasileiraoTeam
        ) {

            return;

        }


        const value =
            normalize(
                d.brasileiraoTeam.value
            );


        if (
            value &&
            occupiedTeams.has(
                value
            )
        ) {

            d.brasileiraoTeam.value =
                "";

            toast(
                "ESSE CLUBE JÁ ESTÁ OCUPADO NO BRASILEIRÃO."
            );

        }


        refreshTeamOptions();

    }


    /* =====================================================
       BIND COMPETIÇÕES
       ===================================================== */

    function bindCompetitionInputs() {

        const d =
            dom();


        if (
            d.competitionBrasileirao &&
            d.competitionBrasileirao.dataset.ccfvBound !==
                "true"
        ) {

            d.competitionBrasileirao.dataset.ccfvBound =
                "true";


            d.competitionBrasileirao.addEventListener(
                "change",
                () => {

                    refreshCompetitionUI();

                    refreshTeamOptions();

                }
            );

        }


        if (
            d.competitionNight &&
            d.competitionNight.dataset.ccfvBound !==
                "true"
        ) {

            d.competitionNight.dataset.ccfvBound =
                "true";


            d.competitionNight.addEventListener(
                "change",
                refreshCompetitionUI
            );

        }


        if (
            d.brasileiraoTeam &&
            d.brasileiraoTeam.dataset.ccfvBound !==
                "true"
        ) {

            d.brasileiraoTeam.dataset.ccfvBound =
                "true";


            d.brasileiraoTeam.addEventListener(
                "change",
                handleTeamChange
            );

        }


        if (
            d.modalCloseButtons
        ) {

            d.modalCloseButtons
                .forEach(
                    button => {

                        if (
                            button.dataset.ccfvBound ===
                                "true"
                        ) {

                            return;

                        }


                        button.dataset.ccfvBound =
                            "true";


                        button.addEventListener(
                            "click",
                            closePlayerModal
                        );

                    }
                );

        }

    }


    /* =====================================================
       CLICK DE NOVO JOGADOR
       ===================================================== */

    function bindNewPlayerButtons() {

        const d =
            dom();


        /*
         * Botão principal.
         */

        if (
            d.newPlayerButton
        ) {

            d.newPlayerButton
                .dataset
                .ccfvGuardBound =
                "true";


            if (
                !d.newPlayerButton
                    .dataset
                    .ccfvClickBound
            ) {

                d.newPlayerButton
                    .dataset
                    .ccfvClickBound =
                    "true";


                d.newPlayerButton.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        openPlayerModal();

                    }
                );

            }

        }


        /*
         * Botão da tela vazia.
         */

        d.openNewPlayerButtons
            .forEach(
                button => {

                    if (
                        button.dataset
                            .ccfvClickBound
                    ) {

                        return;

                    }


                    button.dataset
                        .ccfvClickBound =
                        "true";


                    button.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            openPlayerModal();

                        }
                    );

                }
            );

    }


    /* =====================================================
       DELEGAÇÃO DE CLICK
       ===================================================== */

    function bindDocumentFallback() {

        if (
            document.body.dataset
                .ccfvModalFallback ===
            "true"
        ) {

            return;

        }


        document.body.dataset
            .ccfvModalFallback =
            "true";


        document.addEventListener(
            "click",
            event => {

                const target =
                    event.target instanceof
                    Element
                        ? event.target
                        : null;


                if (
                    !target
                ) {

                    return;

                }


                const newButton =
                    target.closest(
                        "#new-player-button, [data-open-new-player]"
                    );


                if (
                    newButton
                ) {

                    event.preventDefault();

                    openPlayerModal();

                    return;

                }


                const closeButton =
                    target.closest(
                        "[data-close-player-modal]"
                    );


                if (
                    closeButton
                ) {

                    event.preventDefault();

                    closePlayerModal();

                }

            }
        );

    }


    /* =====================================================
       TECLA ESC
       ===================================================== */

    function bindEscape() {

        if (
            document.body.dataset
                .ccfvEscapeBound ===
            "true"
        ) {

            return;

        }


        document.body.dataset
            .ccfvEscapeBound =
            "true";


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
       MUTATION OBSERVER
       ===================================================== */

    function observeDynamicDOM() {

        const observer =
            new MutationObserver(
                () => {

                    bindNewPlayerButtons();

                    bindCompetitionInputs();

                    refreshCompetitionUI();

                }
            );


        observer.observe(
            document.body,
            {
                childList:
                    true,

                subtree:
                    true

            }
        );

    }


    /* =====================================================
       REFRESH AUTOMÁTICO
       ===================================================== */

    function startRefresh() {

        clearInterval(
            refreshTimer
        );


        refreshTimer =
            setInterval(
                () => {

                    loadOccupiedTeams();

                },
                REFRESH_INTERVAL
            );

    }


    /* =====================================================
       API
       ===================================================== */

    window.CCFVCompetitionGuard = {

        refresh:
            async () => {

                await
                    loadOccupiedTeams();

                refreshCompetitionUI();

            },

        openPlayer:
            openPlayerModal,

        closePlayer:
            closePlayerModal,

        getOccupiedTeams:
            () =>
                Array.from(
                    occupiedTeams
                )

    };


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        bindNewPlayerButtons();

        bindCompetitionInputs();

        bindDocumentFallback();

        bindEscape();

        refreshCompetitionUI();

        observeDynamicDOM();

        startRefresh();

        /*
         * Primeiro abre/funciona a interface.
         * Banco vem depois.
         */

        await loadOccupiedTeams();

        bindNewPlayerButtons();

        bindCompetitionInputs();

        refreshCompetitionUI();

        refreshTeamOptions();

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