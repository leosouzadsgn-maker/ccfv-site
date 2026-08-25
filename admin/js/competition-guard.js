/* =========================================================
   CCFV // COMPETITION GUARD
   BRASILEIRÃO + NIGHT CUP

   Regras:
   1. Checkbox selecionado fica visualmente marcado.
   2. Brasileirão: cada clube pode pertencer a apenas
      um jogador ativo.
   3. Ao escolher um clube, ele fica indisponível
      imediatamente nesta seleção.
   4. Clubes já ocupados no Supabase ficam desabilitados.
   5. Ao editar um jogador, o clube dele continua disponível
      para ele próprio.
   6. Alterações externas são recarregadas quando necessário.
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const COMPETITION_BR =
        "BRASILEIRAO";

    const COMPETITION_NIGHT =
        "NIGHT_CUP";

    const ACTIVE_STATUS =
        "ACTIVE";

    const POLL_INTERVAL =
        15000;


    /* =====================================================
       DOM
       ===================================================== */

    const getDOM = () => ({

        playerId:
            document.querySelector(
                "#player-id"
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
            )

    });


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient =
        null;

    let occupiedTeams =
        new Set();

    let loaded =
        false;

    let refreshTimer =
        null;

    let observer =
        null;


    /* =====================================================
       HELPERS
       ===================================================== */

    function normalize(
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


    function getCurrentPlayerId() {

        const dom =
            getDOM();


        return (
            dom.playerId?.value ||
            null
        );

    }


    function getToastFunction() {

        if (
            typeof window.showToast ===
            "function"
        ) {

            return window.showToast;

        }


        if (
            window.CCFVAdmin &&
            typeof
                window.CCFVAdmin.showToast ===
            "function"
        ) {

            return window.CCFVAdmin.showToast;

        }


        return (
            message => {

                console.warn(
                    "CCFV //",
                    message
                );

            }
        );

    }


    function notify(
        message
    ) {

        try {

            getToastFunction()(
                message
            );

        }
        catch (
            error
        ) {

            console.warn(
                "CCFV // TOAST:",
                error
            );

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


        /*
         * Primeiro tenta usar o Auth oficial.
         */

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
                    "CCFV // AUTH CLIENT ERROR:",
                    error
                );

            }

        }


        /*
         * Aguarda o auth carregar.
         */

        const started =
            Date.now();


        while (
            Date.now() -
            started <
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
                        "CCFV // AUTH CLIENT ERROR:",
                        error
                    );

                    break;

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
       BUSCAR CLUBES OCUPADOS
       ===================================================== */

    async function loadOccupiedTeams() {

        const client =
            await getSupabase();


        if (
            !client
        ) {

            console.warn(
                "CCFV // COMPETITION GUARD: Supabase não disponível."
            );

            return;

        }


        try {

            /*
             * Busca todas as inscrições do Brasileirão.
             */

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
                        COMPETITION_BR
                    );


            if (
                result.error
            ) {

                throw result.error;

            }


            const rows =
                result.data ||
                [];


            /*
             * Jogador que está sendo editado
             * pode manter o próprio clube.
             */

            const currentPlayerId =
                getCurrentPlayerId();


            occupiedTeams =
                new Set(
                    rows
                        .filter(
                            row =>
                                String(
                                    row.player_id
                                ) !==
                                String(
                                    currentPlayerId ||
                                    ""
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


            loaded =
                true;


            refreshTeamOptions();

        }
        catch (
            error
        ) {

            console.error(
                "CCFV // COMPETITION GUARD LOAD ERROR:",
                error
            );

        }

    }


    /* =====================================================
       ATUALIZAR ESTADO VISUAL DAS COMPETIÇÕES
       ===================================================== */

    function refreshCompetitionUI() {

        const dom =
            getDOM();


        /*
         * BRASILEIRÃO
         */

        if (
            dom.competitionBrasileirao &&
            dom.competitionBrasileiraoLabel
        ) {

            const selected =
                dom.competitionBrasileirao.checked;


            dom.competitionBrasileiraoLabel
                .classList
                .toggle(
                    "is-selected",
                    selected
                );


            dom.competitionBrasileiraoLabel
                .setAttribute(
                    "aria-checked",
                    selected
                        ? "true"
                        : "false"
                );

        }


        /*
         * NIGHT CUP
         */

        if (
            dom.competitionNight &&
            dom.competitionNightLabel
        ) {

            const selected =
                dom.competitionNight.checked;


            dom.competitionNightLabel
                .classList
                .toggle(
                    "is-selected",
                    selected
                );


            dom.competitionNightLabel
                .setAttribute(
                    "aria-checked",
                    selected
                        ? "true"
                        : "false"
                );

        }


        /*
         * Configuração do Brasileirão
         */

        if (
            dom.brasileiraoConfig
        ) {

            dom.brasileiraoConfig.style.display =
                dom.competitionBrasileirao?.checked
                    ? ""
                    : "none";

        }


        /*
         * Configuração da Night Cup
         */

        if (
            dom.nightConfig
        ) {

            dom.nightConfig.style.display =
                dom.competitionNight?.checked
                    ? ""
                    : "none";

        }

    }


    /* =====================================================
       CLUBES DO BRASILEIRÃO
       ===================================================== */

    function refreshTeamOptions() {

        const dom =
            getDOM();


        const select =
            dom.brasileiraoTeam;


        if (
            !select
        ) {

            return;

        }


        const currentValue =
            normalize(
                select.value
            );


        const currentPlayerId =
            getCurrentPlayerId();


        /*
         * Se houver jogador atualmente editado,
         * busca o clube dele para permitir manter.
         */

        let editingOwnTeam =
            "";


        if (
            currentPlayerId &&
            window.CCFVAdmin &&
            Array.isArray(
                window.CCFVAdmin.players
            )
        ) {

            const player =
                window.CCFVAdmin.players.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            currentPlayerId
                        )
                );


            if (
                player &&
                Array.isArray(
                    player.competitions
                )
            ) {

                const ownCompetition =
                    player.competitions.find(
                        item =>
                            item.competition ===
                            COMPETITION_BR
                    );


                editingOwnTeam =
                    normalize(
                        ownCompetition?.team_name
                    );

            }

        }


        /*
         * Caso o Admin não exponha players,
         * usamos somente o currentValue para
         * não bloquear o valor que já está selecionado.
         */

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
                     * Placeholder nunca é bloqueado.
                     */

                    if (
                        !value ||
                        !option.value &&
                        normalize(
                            option.textContent
                        ).includes(
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


                    const own =
                        value ===
                        editingOwnTeam;


                    const currentlySelected =
                        value ===
                        currentValue;


                    const shouldDisable =
                        loaded &&
                        occupied &&
                        !own &&
                        !currentlySelected;


                    option.disabled =
                        shouldDisable;


                    option.dataset.teamOccupied =
                        shouldDisable
                            ? "true"
                            : "false";

                    option.title =
                        shouldDisable
                            ? "Clube já ocupado"
                            : "";

                }
            );


        /*
         * Se o valor atual ficou ocupado
         * por outro jogador, limpa a seleção.
         */

        const selectedOption =
            select.options[
                select.selectedIndex
            ];


        if (
            selectedOption &&
            selectedOption.disabled
        ) {

            select.value =
                "";

            refreshCompetitionUI();

        }


        /*
         * Classe visual no select.
         */

        select.classList.toggle(
            "is-valid",
            Boolean(
                normalize(
                    select.value
                )
            )
        );


        /*
         * Texto auxiliar no select.
         */

        const parent =
            select.parentElement;


        if (
            parent
        ) {

            let helper =
                parent.querySelector(
                    ".ccfv-team-availability"
                );


            if (
                !helper
            ) {

                helper =
                    document.createElement(
                        "small"
                    );


                helper.className =
                    "ccfv-team-availability";


                helper.style.display =
                    "block";


                helper.style.marginTop =
                    "6px";


                helper.style.fontSize =
                    "11px";


                helper.style.fontWeight =
                    "700";


                helper.style.opacity =
                    ".65";


                parent.appendChild(
                    helper
                );

            }


            helper.textContent =
                loaded
                    ? "Clubes já ocupados ficam indisponíveis."
                    : "Verificando disponibilidade dos clubes...";

        }

    }


    /* =====================================================
       SELEÇÃO DO CLUBE
       ===================================================== */

    function bindTeamSelection() {

        const dom =
            getDOM();


        const select =
            dom.brasileiraoTeam;


        if (
            !select ||
            select.dataset.ccfvGuardBound ===
                "true"
        ) {

            return;

        }


        select.dataset.ccfvGuardBound =
            "true";


        select.addEventListener(
            "change",
            () => {

                const value =
                    normalize(
                        select.value
                    );


                if (
                    value &&
                    occupiedTeams.has(
                        value
                    )
                ) {

                    /*
                     * Não permite selecionar
                     * um clube já ocupado.
                     */

                    select.value =
                        "";

                    notify(
                        "ESSE CLUBE JÁ ESTÁ OCUPADO NO BRASILEIRÃO."
                    );

                    refreshTeamOptions();

                    return;

                }


                refreshTeamOptions();

            }
        );

    }


    /* =====================================================
       CHECKBOXES
       ===================================================== */

    function bindCompetition(
        checkbox
    ) {

        if (
            !checkbox ||
            checkbox.dataset.ccfvGuardBound ===
                "true"
        ) {

            return;

        }


        checkbox.dataset.ccfvGuardBound =
            "true";


        checkbox.addEventListener(
            "change",
            () => {

                refreshCompetitionUI();

                refreshTeamOptions();

            }
        );

    }


    function bindCompetitionUI() {

        const dom =
            getDOM();


        bindCompetition(
            dom.competitionBrasileirao
        );


        bindCompetition(
            dom.competitionNight
        );


        /*
         * Também permite clicar no card/label
         * inteiro, não somente na caixinha.
         */

        [
            dom.competitionBrasileiraoLabel,

            dom.competitionNightLabel

        ]
            .forEach(
                label => {

                    if (
                        !label ||
                        label.dataset.ccfvLabelBound ===
                            "true"
                    ) {

                        return;

                    }


                    label.dataset.ccfvLabelBound =
                        "true";


                    label.addEventListener(
                        "click",
                        event => {

                            /*
                             * Deixa o browser alterar
                             * o checkbox normalmente.
                             *
                             * Apenas espera o estado
                             * mudar e atualiza o visual.
                             */

                            setTimeout(
                                () => {

                                    refreshCompetitionUI();

                                    refreshTeamOptions();

                                },
                                0
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       LIMPAR MODAL
       ===================================================== */

    function handleModalReset() {

        const dom =
            getDOM();


        refreshCompetitionUI();

        refreshTeamOptions();


        /*
         * Quando o modal for aberto para
         * um novo jogador, consulta novamente
         * os clubes ocupados.
         */

        loadOccupiedTeams();

    }


    /* =====================================================
       OBSERVER
       ===================================================== */

    function observeModal() {

        if (
            observer
        ) {

            return;

        }


        const target =
            document.body;


        if (
            !target
        ) {

            return;

        }


        observer =
            new MutationObserver(
                () => {

                    bindCompetitionUI();

                    bindTeamSelection();

                    refreshCompetitionUI();

                }
            );


        observer.observe(
            target,
            {
                subtree:
                    true,

                childList:
                    true

            }
        );

    }


    /* =====================================================
       REFRESH PERIÓDICO
       ===================================================== */

    function startPolling() {

        if (
            refreshTimer
        ) {

            clearInterval(
                refreshTimer
            );

        }


        refreshTimer =
            setInterval(
                () => {

                    loadOccupiedTeams();

                },
                POLL_INTERVAL
            );

    }


    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.CCFVCompetitionGuard = {

        refresh:
            loadOccupiedTeams,

        refreshUI:
            () => {

                bindCompetitionUI();

                bindTeamSelection();

                refreshCompetitionUI();

                refreshTeamOptions();

            },

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

        bindCompetitionUI();

        bindTeamSelection();

        refreshCompetitionUI();

        observeModal();

        startPolling();

        await loadOccupiedTeams();

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