/* =========================================================
   CCFV // COMPETITION GUARD
   BRASILEIRÃO + NIGHT CUP
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const COMPETITIONS_TABLE =
        "player_competitions";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient =
        null;

    let refreshingTeams =
        false;


    /* =====================================================
       DOM
       ===================================================== */

    const dom = {

        modal:
            document.querySelector(
                "#player-modal"
            ),

        form:
            document.querySelector(
                "#player-form"
            ),

        playerId:
            document.querySelector(
                "#player-id"
            ),

        brazilCheckbox:
            document.querySelector(
                "#competition-brasileirao"
            ),

        brazilLabel:
            document.querySelector(
                "#competition-brasileirao-label"
            ),

        brazilConfig:
            document.querySelector(
                "#brasileirao-config"
            ),

        brazilTeam:
            document.querySelector(
                "#brasileirao-team"
            ),

        nightCheckbox:
            document.querySelector(
                "#competition-night"
            ),

        nightLabel:
            document.querySelector(
                "#competition-night-label"
            ),

        nightConfig:
            document.querySelector(
                "#night-config"
            ),

        nightTeam:
            document.querySelector(
                "#night-team"
            ),

        toast:
            document.querySelector(
                "#admin-toast"
            )

    };


    /* =====================================================
       AUTH / SUPABASE
       ===================================================== */

    async function getSupabase() {

        if (
            supabaseClient
        ) {

            return supabaseClient;

        }


        if (
            !window.CCFVAuth ||
            typeof
                window.CCFVAuth.getClient !==
                "function"
        ) {

            throw new Error(
                "Sistema de autenticação não disponível."
            );

        }


        supabaseClient =
            await
                window.CCFVAuth
                    .getClient();


        return supabaseClient;

    }


    /* =====================================================
       NORMALIZAÇÃO
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


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

        if (
            !dom.toast
        ) {

            window.alert(
                message
            );

            return;

        }


        dom.toast.textContent =
            message;


        dom.toast.classList.add(
            "is-visible"
        );


        clearTimeout(
            dom.toast._ccfvGuardTimer
        );


        dom.toast._ccfvGuardTimer =
            setTimeout(
                () => {

                    dom.toast.classList.remove(
                        "is-visible"
                    );

                },
                3500
            );

    }


    /* =====================================================
       ATUALIZAR VISUAL DAS COMPETIÇÕES
       ===================================================== */

    function syncCompetitionVisual() {

        const brazilChecked =
            Boolean(
                dom.brazilCheckbox?.checked
            );


        const nightChecked =
            Boolean(
                dom.nightCheckbox?.checked
            );


        dom.brazilLabel?.classList.toggle(
            "is-selected",
            brazilChecked
        );


        dom.nightLabel?.classList.toggle(
            "is-selected",
            nightChecked
        );


        dom.brazilConfig?.classList.toggle(
            "is-visible",
            brazilChecked
        );


        dom.nightConfig?.classList.toggle(
            "is-visible",
            nightChecked
        );

    }


    /* =====================================================
       COMPETIÇÃO AUTOMÁTICA PELO CLUBE
       ===================================================== */

    function bindTeamAutoSelect() {

        dom.brazilTeam?.addEventListener(
            "change",
            () => {

                if (
                    dom.brazilTeam.value
                ) {

                    dom.brazilCheckbox.checked =
                        true;

                }

                syncCompetitionVisual();

                refreshBrazilTeams();

            }
        );


        dom.nightTeam?.addEventListener(
            "change",
            () => {

                if (
                    dom.nightTeam.value
                ) {

                    dom.nightCheckbox.checked =
                        true;

                }

                syncCompetitionVisual();

            }
        );


        dom.brazilCheckbox?.addEventListener(
            "change",
            syncCompetitionVisual
        );


        dom.nightCheckbox?.addEventListener(
            "change",
            syncCompetitionVisual
        );

    }


    /* =====================================================
       OBTER CLUBES OCUPADOS
       ===================================================== */

    async function getOccupiedBrazilianTeams() {

        const client =
            await getSupabase();


        const {
            data,
            error
        } =
            await client
                .from(
                    COMPETITIONS_TABLE
                )
                .select(
                    "player_id,team_name"
                )
                .eq(
                    "competition",
                    "BRASILEIRAO"
                );


        if (
            error
        ) {

            throw error;

        }


        return (
            data || []
        )
            .filter(
                row =>
                    row.team_name
            )
            .map(
                row => ({

                    playerId:
                        String(
                            row.player_id
                        ),

                    team:
                        normalize(
                            row.team_name
                        )

                })
            );

    }


    /* =====================================================
       DESABILITAR CLUBES JÁ OCUPADOS
       ===================================================== */

    async function refreshBrazilTeams() {

        if (
            refreshingTeams ||
            !dom.brazilTeam
        ) {

            return;

        }


        refreshingTeams =
            true;


        try {

            const occupied =
                await
                    getOccupiedBrazilianTeams();


            const currentPlayerId =
                String(
                    dom.playerId?.value ||
                    ""
                );


            const occupiedMap =
                new Map();


            occupied.forEach(
                item => {

                    occupiedMap.set(
                        item.team,
                        item.playerId
                    );

                }
            );


            Array.from(
                dom.brazilTeam.options
            )
                .forEach(
                    option => {

                        if (
                            !option.value
                        ) {

                            return;

                        }


                        const team =
                            normalize(
                                option.value ||
                                option.textContent
                            );


                        const ownerId =
                            occupiedMap.get(
                                team
                            );


                        const occupiedByOther =
                            Boolean(
                                ownerId &&
                                ownerId !==
                                currentPlayerId
                            );


                        option.disabled =
                            occupiedByOther;


                        if (
                            !option.dataset.ccfvOriginalText
                        ) {

                            option.dataset.ccfvOriginalText =
                                option.textContent;

                        }


                        if (
                            occupiedByOther
                        ) {

                            option.textContent =
                                `${option.dataset.ccfvOriginalText} — OCUPADO`;

                        }

                        else {

                            option.textContent =
                                option.dataset.ccfvOriginalText;

                        }

                    }
                );


            /*
             * Se o valor atual foi ocupado por outro jogador,
             * limpamos a seleção para impedir inconsistência.
             */

            const currentOption =
                dom.brazilTeam.selectedOptions?.[0];


            if (
                currentOption &&
                currentOption.disabled
            ) {

                dom.brazilTeam.value =
                    "";

                dom.brazilCheckbox.checked =
                    false;

                syncCompetitionVisual();

            }

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // TEAM GUARD ERROR:",
                error
            );

        }

        finally {

            refreshingTeams =
                false;

        }

    }


    /* =====================================================
       VALIDAR ANTES DO SALVAMENTO
       ===================================================== */

    async function validateBrazilTeam() {

        if (
            !dom.brazilCheckbox?.checked
        ) {

            return true;

        }


        const team =
            normalize(
                dom.brazilTeam?.value
            );


        if (
            !team
        ) {

            showToast(
                "SELECIONE O CLUBE DO BRASILEIRÃO."
            );

            return false;

        }


        const occupied =
            await
                getOccupiedBrazilianTeams();


        const currentPlayerId =
            String(
                dom.playerId?.value ||
                ""
            );


        const owner =
            occupied.find(
                item =>
                    item.team ===
                    team
            );


        if (
            owner &&
            owner.playerId !==
            currentPlayerId
        ) {

            showToast(
                "ESTE CLUBE JÁ ESTÁ OCUPADO POR OUTRO JOGADOR."
            );

            return false;

        }


        return true;

    }


    /* =====================================================
       BLOQUEAR SUBMIT INVÁLIDO
       ===================================================== */

    function bindFormGuard() {

        dom.form?.addEventListener(
            "submit",
            async event => {

                /*
                 * Capture phase já não é necessário aqui;
                 * esse listener é usado somente para fechar
                 * a última brecha de validação.
                 */

                const valid =
                    await validateBrazilTeam();


                if (
                    !valid
                ) {

                    event.preventDefault();

                    event.stopImmediatePropagation();

                }

            },
            true
        );

    }


    /* =====================================================
       OBSERVAR ABERTURA DO MODAL
       ===================================================== */

    function observeModal() {

        if (
            !dom.modal
        ) {

            return;

        }


        const observer =
            new MutationObserver(
                mutations => {

                    const opened =
                        mutations.some(
                            mutation =>
                                mutation.attributeName ===
                                "class"
                        );


                    if (
                        !opened
                    ) {

                        return;

                    }


                    if (
                        dom.modal.classList.contains(
                            "is-open"
                        )
                    ) {

                        window.setTimeout(
                            () => {

                                syncCompetitionVisual();

                                refreshBrazilTeams();

                            },
                            50
                        );

                    }

                }
            );


        observer.observe(
            dom.modal,
            {
                attributes:
                    true
            }
        );

    }


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        syncCompetitionVisual();

        bindTeamAutoSelect();

        bindFormGuard();

        observeModal();

        window.setTimeout(
            refreshBrazilTeams,
            250
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
                once:
                    true
            }
        );

    }

    else {

        init();

    }

})();