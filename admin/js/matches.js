/* =========================================================
   CCFV // MATCH ENGINE
   ADMIN PARTIDAS
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const MATCHES_TABLE =
        "matches";

    const COMPETITIONS_TABLE =
        "player_competitions";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient =
        null;

    let players =
        [];

    let playerCompetitions =
        [];

    let matches =
        [];


    /* =====================================================
       DOM
       ===================================================== */

    const dom = {

        competition:
            document.querySelector(
                "#match-competition"
            ),

        stage:
            document.querySelector(
                "#match-stage"
            ),

        homePlayer:
            document.querySelector(
                "#match-home-player"
            ),

        awayPlayer:
            document.querySelector(
                "#match-away-player"
            ),

        homeTeam:
            document.querySelector(
                "#match-home-team"
            ),

        awayTeam:
            document.querySelector(
                "#match-away-team"
            ),

        homeScore:
            document.querySelector(
                "#match-home-score"
            ),

        awayScore:
            document.querySelector(
                "#match-away-score"
            ),

        playedAt:
            document.querySelector(
                "#match-played-at"
            ),

        form:
            document.querySelector(
                "#match-form"
            ),

        submit:
            document.querySelector(
                "#match-submit"
            ),

        list:
            document.querySelector(
                "#admin-matches-list"
            ),

        empty:
            document.querySelector(
                "#admin-matches-empty"
            ),

        toast:
            document.querySelector(
                "#admin-toast"
            ),

        homeElo:
            document.querySelector(
                "#match-home-elo"
            ),

        awayElo:
            document.querySelector(
                "#match-away-elo"
            )

    };


    /* =====================================================
       UTILS
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


    function formatNumber(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "pt-BR"
        );

    }


    function formatDate(
        value
    ) {

        if (
            !value
        ) {

            return "DATA NÃO DEFINIDA";

        }


        return new Date(
            value
        ).toLocaleString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
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
                "AUTH ainda não está disponível."
            );

        }


        supabaseClient =
            await window.CCFVAuth.getClient();


        return supabaseClient;

    }


    /* =====================================================
       CARREGAR DADOS
       ===================================================== */

    async function loadPlayers() {

        const client =
            await getSupabase();


        const result =
            await client

                .from(
                    "players"
                )

                .select(
                    "*"
                )

                .eq(
                    "status",
                    "ACTIVE"
                )

                .order(
                    "name",
                    {
                        ascending:
                            true
                    }
                );


        if (
            result.error
        ) {

            throw result.error;

        }


        players =
            result.data || [];

    }


    async function loadPlayerCompetitions() {

        const client =
            await getSupabase();


        const result =
            await client

                .from(
                    COMPETITIONS_TABLE
                )

                .select(
                    "*"
                );


        if (
            result.error
        ) {

            throw result.error;

        }


        playerCompetitions =
            result.data || [];

    }


    async function loadMatches() {

        const client =
            await getSupabase();


        const result =
            await client

                .from(
                    MATCHES_TABLE
                )

                .select(`
                    id,
                    competition,
                    stage,
                    round_number,
                    home_player_id,
                    away_player_id,
                    home_team,
                    away_team,
                    home_score,
                    away_score,
                    status,
                    played_at,
                    created_at
                `)

                .order(
                    "played_at",
                    {
                        ascending:
                            false
                    }
                )

                .limit(
                    50
                );


        if (
            result.error
        ) {

            throw result.error;

        }


        matches =
            result.data || [];

    }


    /* =====================================================
       JOGADORES POR COMPETIÇÃO
       ===================================================== */

    function getCompetitionPlayers(
        competition
    ) {

        return players.filter(
            player => {

                return playerCompetitions.some(
                    item => {

                        return (
                            String(
                                item.player_id
                            ) ===
                            String(
                                player.id
                            )

                            &&

                            item.competition ===
                            competition
                        );

                    }
                );

            }
        );

    }


    function getPlayerCompetition(
        playerId,
        competition
    ) {

        return playerCompetitions.find(
            item => {

                return (

                    String(
                        item.player_id
                    ) ===
                    String(
                        playerId
                    )

                    &&

                    item.competition ===
                    competition

                );

            }
        );

    }


    /* =====================================================
       SELECT JOGADORES
       ===================================================== */

    function populatePlayerSelects() {

        const competition =
            dom.competition.value;


        const eligible =
            getCompetitionPlayers(
                competition
            );


        const currentHome =
            dom.homePlayer.value;


        const currentAway =
            dom.awayPlayer.value;


        dom.homePlayer.innerHTML =
            `
                <option value="">
                    Selecione o jogador
                </option>
            `;


        dom.awayPlayer.innerHTML =
            `
                <option value="">
                    Selecione o jogador
                </option>
            `;


        eligible.forEach(
            player => {

                const optionHome =
                    document.createElement(
                        "option"
                    );


                optionHome.value =
                    player.id;


                optionHome.textContent =
                    `${player.name} — ${formatNumber(player.elo)} ELO`;


                dom.homePlayer.appendChild(
                    optionHome
                );


                const optionAway =
                    document.createElement(
                        "option"
                    );


                optionAway.value =
                    player.id;


                optionAway.textContent =
                    `${player.name} — ${formatNumber(player.elo)} ELO`;


                dom.awayPlayer.appendChild(
                    optionAway
                );

            }
        );


        if (
            eligible.some(
                player =>
                    String(
                        player.id
                    ) ===
                    String(
                        currentHome
                    )
            )
        ) {

            dom.homePlayer.value =
                currentHome;

        }


        if (
            eligible.some(
                player =>
                    String(
                        player.id
                    ) ===
                    String(
                        currentAway
                    )
            )
        ) {

            dom.awayPlayer.value =
                currentAway;

        }


        updatePlayerSide(
            "home"
        );


        updatePlayerSide(
            "away"
        );

    }


    /* =====================================================
       ESTÁGIOS
       ===================================================== */

    function populateStages() {

        const competition =
            dom.competition.value;


        dom.stage.innerHTML =
            "";


        if (
            competition ===
            "BRASILEIRAO"
        ) {

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
                    `RODADA_${String(round).padStart(2,"0")}`;


                option.dataset.round =
                    String(
                        round
                    );


                option.textContent =
                    `RODADA ${String(round).padStart(2,"0")}`;


                dom.stage.appendChild(
                    option
                );

            }

        }

        else {

            const stages = [

                {
                    value: "QUARTAS_01",
                    label: "QUARTAS — QF01",
                    round: 1
                },

                {
                    value: "QUARTAS_02",
                    label: "QUARTAS — QF02",
                    round: 2
                },

                {
                    value: "QUARTAS_03",
                    label: "QUARTAS — QF03",
                    round: 3
                },

                {
                    value: "QUARTAS_04",
                    label: "QUARTAS — QF04",
                    round: 4
                },

                {
                    value: "SEMIFINAL_01",
                    label: "SEMIFINAL — SF01",
                    round: 1
                },

                {
                    value: "SEMIFINAL_02",
                    label: "SEMIFINAL — SF02",
                    round: 2
                },

                {
                    value: "FINAL",
                    label: "FINAL",
                    round: 1
                }

            ];


            stages.forEach(
                item => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        item.value;


                    option.dataset.round =
                        String(
                            item.round
                        );


                    option.textContent =
                        item.label;


                    dom.stage.appendChild(
                        option
                    );

                }
            );

        }

    }


    /* =====================================================
       ELO + TIME
       ===================================================== */

    function updatePlayerSide(
        side
    ) {

        const competition =
            dom.competition.value;


        const select =
            side === "home"

                ? dom.homePlayer

                : dom.awayPlayer;


        const teamElement =
            side === "home"

                ? dom.homeTeam

                : dom.awayTeam;


        const eloElement =
            side === "home"

                ? dom.homeElo

                : dom.awayElo;


        const player =
            players.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        select.value
                    )
            );


        if (
            !player
        ) {

            teamElement.textContent =
                "TIME A DEFINIR";


            eloElement.textContent =
                "ELO —";


            return;

        }


        const participation =
            getPlayerCompetition(
                player.id,
                competition
            );


        teamElement.textContent =
            participation?.team_name ||
            "TIME NÃO DEFINIDO";


        eloElement.textContent =
            `${formatNumber(player.elo)} ELO`;

    }


    /* =====================================================
       RESULTADO VISUAL
       ===================================================== */

    function getResultText(
        match
    ) {

        if (
            match.home_score >
            match.away_score
        ) {

            return "VITÓRIA CASA";

        }


        if (
            match.home_score <
            match.away_score
        ) {

            return "VITÓRIA FORA";

        }


        return "EMPATE";

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderMatches() {

        if (
            !dom.list
        ) {

            return;

        }


        dom.list.innerHTML =
            "";


        if (
            !matches.length
        ) {

            dom.empty?.classList.add(
                "is-visible"
            );

            return;

        }


        dom.empty?.classList.remove(
            "is-visible"
        );


        matches.forEach(
            match => {

                const homePlayer =
                    players.find(
                        player =>
                            String(
                                player.id
                            ) ===
                            String(
                                match.home_player_id
                            )
                    );


                const awayPlayer =
                    players.find(
                        player =>
                            String(
                                player.id
                            ) ===
                            String(
                                match.away_player_id
                            )
                    );


                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "ccfv-match-admin-card";


                card.innerHTML = `

                    <div
                        class="ccfv-match-admin-card__top"
                    >

                        <span>

                            ${
                                match.competition ===
                                "BRASILEIRAO"

                                    ? "BRASILEIRÃO CCFV"

                                    : "NIGHT CUP"
                            }

                        </span>


                        <small>

                            ${escapeHTML(
                                match.stage
                            )}

                        </small>

                    </div>


                    <div
                        class="ccfv-match-admin-card__teams"
                    >

                        <div>

                            <strong>

                                ${escapeHTML(
                                    match.home_team
                                )}

                            </strong>

                            <span>

                                ${escapeHTML(
                                    homePlayer?.name ||
                                    "Jogador"
                                )}

                            </span>

                        </div>


                        <div
                            class="ccfv-match-admin-card__score"
                        >

                            <b>
                                ${match.home_score}
                            </b>

                            <span>
                                ×
                            </span>

                            <b>
                                ${match.away_score}
                            </b>

                        </div>


                        <div>

                            <strong>

                                ${escapeHTML(
                                    match.away_team
                                )}

                            </strong>

                            <span>

                                ${escapeHTML(
                                    awayPlayer?.name ||
                                    "Jogador"
                                )}

                            </span>

                        </div>

                    </div>


                    <div
                        class="ccfv-match-admin-card__bottom"
                    >

                        <span>

                            ${escapeHTML(
                                getResultText(
                                    match
                                )
                            )}

                        </span>


                        <small>

                            ${formatDate(
                                match.played_at
                            )}

                        </small>

                    </div>

                `;


                dom.list.appendChild(
                    card
                );

            }
        );

    }


    /* =====================================================
       RESET FORM
       ===================================================== */

    function resetForm() {

        dom.form.reset();


        populateStages();

        populatePlayerSelects();


        dom.homeTeam.textContent =
            "TIME A DEFINIR";


        dom.awayTeam.textContent =
            "TIME A DEFINIR";


        dom.homeElo.textContent =
            "ELO —";


        dom.awayElo.textContent =
            "ELO —";


        if (
            dom.playedAt
        ) {

            const now =
                new Date();


            now.setMinutes(
                now.getMinutes() -
                now.getTimezoneOffset()
            );


            dom.playedAt.value =
                now
                    .toISOString()
                    .slice(
                        0,
                        16
                    );

        }

    }


    /* =====================================================
       SUBMIT RESULTADO
       ===================================================== */

    async function registerMatch(
        event
    ) {

        event.preventDefault();


        const competition =
            dom.competition.value;


        const stage =
            dom.stage.value;


        const stageOption =
            dom.stage.selectedOptions[0];


        const roundNumber =
            Number(
                stageOption?.dataset?.round ||
                1
            );


        const homePlayerId =
            dom.homePlayer.value;


        const awayPlayerId =
            dom.awayPlayer.value;


        const homePlayer =
            players.find(
                player =>
                    String(
                        player.id
                    ) ===
                    String(
                        homePlayerId
                    )
            );


        const awayPlayer =
            players.find(
                player =>
                    String(
                        player.id
                    ) ===
                    String(
                        awayPlayerId
                    )
            );


        if (
            !homePlayer ||
            !awayPlayer
        ) {

            showToast(
                "SELECIONE OS DOIS JOGADORES."
            );

            return;

        }


        if (
            homePlayer.id ===
            awayPlayer.id
        ) {

            showToast(
                "UM JOGADOR NÃO PODE ENFRENTAR ELE MESMO."
            );

            return;

        }


        const homeParticipation =
            getPlayerCompetition(
                homePlayer.id,
                competition
            );


        const awayParticipation =
            getPlayerCompetition(
                awayPlayer.id,
                competition
            );


        if (
            !homeParticipation ||
            !awayParticipation
        ) {

            showToast(
                "UM DOS JOGADORES NÃO ESTÁ INSCRITO NESSA COMPETIÇÃO."
            );

            return;

        }


        const homeScore =
            Math.max(
                0,
                Number(
                    dom.homeScore.value
                )
            );


        const awayScore =
            Math.max(
                0,
                Number(
                    dom.awayScore.value
                )
            );


        try {

            const client =
                await getSupabase();


            dom.submit.disabled =
                true;


            dom.submit.textContent =
                "REGISTRANDO...";


            const {
                data,
                error
            } =
                await client.rpc(
                    "register_ccfv_match",
                    {

                        p_competition:
                            competition,

                        p_stage:
                            stage,

                        p_round_number:
                            roundNumber,

                        p_home_player_id:
                            homePlayer.id,

                        p_away_player_id:
                            awayPlayer.id,

                        p_home_team:
                            homeParticipation.team_name,

                        p_away_team:
                            awayParticipation.team_name,

                        p_home_score:
                            homeScore,

                        p_away_score:
                            awayScore,

                        p_played_at:
                            dom.playedAt.value
                                ? new Date(
                                    dom.playedAt.value
                                ).toISOString()

                                : new Date().toISOString()

                    }
                );


            if (
                error
            ) {

                throw error;

            }


            console.log(
                "CCFV // MATCH RESULT:",
                data
            );


            const homeDelta =
                Number(
                    data?.home_elo_change ||
                    0
                );


            const awayDelta =
                Number(
                    data?.away_elo_change ||
                    0
                );


            showToast(
                `PARTIDA REGISTRADA — ELO ${homeDelta >= 0 ? "+" : ""}${homeDelta} / ${awayDelta >= 0 ? "+" : ""}${awayDelta}`
            );


            resetForm();


            await reloadData();


        }

        catch (
            error
        ) {

            console.error(
                "CCFV // MATCH ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO REGISTRAR PARTIDA."
            );

        }


        finally {

            dom.submit.disabled =
                false;


            dom.submit.textContent =
                "REGISTRAR RESULTADO";

        }

    }


    /* =====================================================
       RELOAD
       ===================================================== */

    async function reloadData() {

        await loadPlayers();

        await loadPlayerCompetitions();

        await loadMatches();


        populatePlayerSelects();

        renderMatches();

    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        dom.competition?.addEventListener(
            "change",
            () => {

                populateStages();

                populatePlayerSelects();

            }
        );


        dom.homePlayer?.addEventListener(
            "change",
            () => {

                updatePlayerSide(
                    "home"
                );

            }
        );


        dom.awayPlayer?.addEventListener(
            "change",
            () => {

                updatePlayerSide(
                    "away"
                );

            }
        );


        dom.form?.addEventListener(
            "submit",
            registerMatch
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
                3500
            );

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        if (
            !dom.form
        ) {

            return;

        }


        bindEvents();


        try {

            await reloadData();


            resetForm();


            console.log(
                "CCFV // MATCH ENGINE ONLINE"
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // MATCH ENGINE ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CARREGAR O MOTOR DE PARTIDAS."
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