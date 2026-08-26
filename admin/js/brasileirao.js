/* =========================================================
   CCFV // BRASILEIRÃO ADMIN
   CLASSIFICAÇÃO OFICIAL
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient = null;

    let standings = [];

    let selectedRound = 1;


    /* =====================================================
       DOM
       ===================================================== */

    const dom = {

        section:
            document.querySelector(
                "#section-brasileirao"
            ),

        table:
            document.querySelector(
                "#brasileirao-standings"
            ),

        empty:
            document.querySelector(
                "#brasileirao-empty"
            ),

        round:
            document.querySelector(
                "#brasileirao-round"
            ),

        refresh:
            document.querySelector(
                "#brasileirao-refresh"
            ),

        resetTest:
            document.querySelector(
                "#brasileirao-reset-test"
            ),

        roundLabel:
            document.querySelector(
                "#brasileirao-current-round"
            )

    };


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
                "Sistema de autenticação não disponível."
            );

        }


        supabaseClient =
            await window.CCFVAuth.getClient();


        return supabaseClient;

    }


    /* =====================================================
       HTML SECURITY
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


    /* =====================================================
       CARREGAR CLASSIFICAÇÃO
       ===================================================== */

    async function loadStandings() {

        const client =
            await getSupabase();


        const {
            data,
            error
        } =
            await client.rpc(
                "get_brasileirao_standings",
                {
                    p_round_number:
                        selectedRound
                }
            );


        if (
            error
        ) {

            throw error;

        }


        standings =
            Array.isArray(data)
                ? data
                : [];


        renderStandings();

        updateRoundLabel();

    }


    /* =====================================================
       RENDER CLASSIFICAÇÃO
       ===================================================== */

    function renderStandings() {

        if (
            !dom.table
        ) {

            return;

        }


        dom.table.innerHTML =
            "";


        if (
            standings.length === 0
        ) {

            dom.empty
                ?.classList
                .add(
                    "is-visible"
                );

            return;

        }


        dom.empty
            ?.classList
            .remove(
                "is-visible"
            );


        standings.forEach(
            team => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "ccfv-brasileirao-row";


                const position =
                    Number(
                        team.ranking_position ||
                        0
                    );


                if (
                    position === 1
                ) {

                    row.classList.add(
                        "is-first"
                    );

                }

                else if (
                    position <= 4
                ) {

                    row.classList.add(
                        "is-top"
                    );

                }

                else if (
                    position >= 17
                ) {

                    row.classList.add(
                        "is-bottom"
                    );

                }


                const games =
                    Number(
                        team.games || 0
                    );


                const wins =
                    Number(
                        team.wins || 0
                    );


                const draws =
                    Number(
                        team.draws || 0
                    );


                const losses =
                    Number(
                        team.losses || 0
                    );


                const goalsFor =
                    Number(
                        team.goals_for || 0
                    );


                const goalsAgainst =
                    Number(
                        team.goals_against || 0
                    );


                const goalDifference =
                    Number(
                        team.goal_difference || 0
                    );


                const points =
                    Number(
                        team.points || 0
                    );


                const goalDifferenceText =
                    goalDifference > 0

                        ? `+${goalDifference}`

                        : String(
                            goalDifference
                        );


                row.innerHTML = `

                    <span
                        class="
                            ccfv-brasileirao-row__pos
                        "
                    >
                        ${String(
                            position
                        ).padStart(
                            2,
                            "0"
                        )}
                    </span>


                    <div
                        class="
                            ccfv-brasileirao-row__club
                        "
                    >

                        <strong>
                            ${escapeHTML(
                                team.team
                            )}
                        </strong>

                    </div>


                    <span>
                        ${games}
                    </span>


                    <span
                        class="
                            ccfv-stat-positive
                        "
                    >
                        ${wins}
                    </span>


                    <span>
                        ${draws}
                    </span>


                    <span
                        class="
                            ccfv-stat-negative
                        "
                    >
                        ${losses}
                    </span>


                    <span>
                        ${goalsFor}
                    </span>


                    <span>
                        ${goalsAgainst}
                    </span>


                    <span
                        class="
                            ccfv-brasileirao-row__sg
                        "
                    >
                        ${goalDifferenceText}
                    </span>


                    <strong
                        class="
                            ccfv-brasileirao-row__pts
                        "
                    >
                        ${points}
                    </strong>

                `;


                dom.table.appendChild(
                    row
                );

            }
        );

    }


    /* =====================================================
       RODADAS
       ===================================================== */

    function buildRounds() {

        if (
            !dom.round
        ) {

            return;

        }


        dom.round.innerHTML =
            "";


        for (
            let round = 1;
            round <= 38;
            round++
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(
                    round
                );


            option.textContent =
                `RODADA ${String(
                    round
                ).padStart(
                    2,
                    "0"
                )}`;


            dom.round.appendChild(
                option
            );

        }


        dom.round.value =
            String(
                selectedRound
            );

    }


    /* =====================================================
       TEXTO DA RODADA
       ===================================================== */

    function updateRoundLabel() {

        if (
            !dom.roundLabel
        ) {

            return;

        }


        dom.roundLabel.textContent =
            `CLASSIFICAÇÃO APÓS A RODADA ${String(
                selectedRound
            ).padStart(
                2,
                "0"
            )}`;

    }


    /* =====================================================
       ALTERAR RODADA
       ===================================================== */

    async function changeRound() {

        selectedRound =
            Number(
                dom.round.value
            ) || 1;


        try {

            await loadStandings();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // BRASILEIRÃO ROUND ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CARREGAR A RODADA."
            );

        }

    }


    /* =====================================================
       ATUALIZAR
       ===================================================== */

    async function refresh() {

        try {

            if (
                dom.refresh
            ) {

                dom.refresh.disabled =
                    true;

                dom.refresh.textContent =
                    "ATUALIZANDO...";

            }


            await loadStandings();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // BRASILEIRÃO REFRESH ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO ATUALIZAR."
            );

        }

        finally {

            if (
                dom.refresh
            ) {

                dom.refresh.disabled =
                    false;

                dom.refresh.textContent =
                    "ATUALIZAR";

            }

        }

    }


    /* =====================================================
       RESET DE TESTE
       ===================================================== */

    async function resetBrazilTest() {

        if (
            !window.confirm(
                "Isso vai apagar somente as partidas do Brasileirão e voltar para a Rodada 01. A Night Cup não será alterada. Continuar?"
            )
        ) {

            return;

        }

        try {

            const client =
                await getSupabase();

            if (dom.resetTest) {
                dom.resetTest.disabled = true;
                dom.resetTest.textContent = "RESETANDO...";
            }

            const { data, error } =
                await client.rpc(
                    "reset_ccfv_brasileirao"
                );

            if (error) {
                throw error;
            }

            selectedRound = 1;
            buildRounds();
            await loadStandings();

            const count = Number(data || 0);

            showToast(
                count > 0
                    ? `${count} partida(s) do Brasileirão removida(s). Rodada 01 restaurada.`
                    : "Brasileirão já estava zerado. Rodada 01 restaurada."
            );

        }

        catch (error) {

            console.error(
                "CCFV // BRASILEIRÃO RESET ERROR:",
                error
            );

            showToast(
                error?.message ||
                "ERRO AO RESETAR O BRASILEIRÃO."
            );

        }

        finally {

            if (dom.resetTest) {
                dom.resetTest.disabled = false;
                dom.resetTest.textContent = "RESETAR TESTE";
            }

        }

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

        const toast =
            document.querySelector(
                "#admin-toast"
            );


        if (
            !toast
        ) {

            return;

        }


        toast.textContent =
            message;


        toast.classList.add(
            "is-visible"
        );


        clearTimeout(
            toast._timer
        );


        toast._timer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "is-visible"
                    );

                },
                3500
            );

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        dom.round?.addEventListener(
            "change",
            changeRound
        );


        dom.refresh?.addEventListener(
            "click",
            refresh
        );

        dom.resetTest?.addEventListener(
            "click",
            resetBrazilTest
        );

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        if (
            !dom.section
        ) {

            return;

        }


        buildRounds();

        bindEvents();

        updateRoundLabel();


        try {

            await loadStandings();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // BRASILEIRÃO INIT ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CARREGAR BRASILEIRÃO."
            );

        }

    }


    /* =====================================================
       START
       ===================================================== */

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