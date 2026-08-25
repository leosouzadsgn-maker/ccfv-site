/* =========================================================
   CCFV // NIGHT CUP ADMIN
   NIGHT CUP #01
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient = null;

    let players = [];

    let competitions = [];

    let cup = null;

    let participants = [];

    let matches = [];


    const PLAYER_SLOT_COUNT = 8;


    /* =====================================================
       DOM
       ===================================================== */

    const dom = {

        section:
            document.querySelector(
                "#section-night"
            ),

        playerGrid:
            document.querySelector(
                "#night-player-grid"
            ),

        setupMessage:
            document.querySelector(
                "#night-setup-message"
            ),

        create:
            document.querySelector(
                "#night-create"
            ),

        reset:
            document.querySelector(
                "#night-reset"
            ),

        status:
            document.querySelector(
                "#night-cup-status"
            ),

        quarterfinals:
            document.querySelector(
                "#night-quarterfinals"
            ),

        semifinals:
            document.querySelector(
                "#night-semifinals"
            ),

        final:
            document.querySelector(
                "#night-final"
            ),

        champion:
            document.querySelector(
                "#night-champion"
            ),

        championName:
            document.querySelector(
                "#night-champion-name"
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
       UTILITÁRIOS
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


    function playerMap() {

        const map =
            new Map();


        players.forEach(
            player => {

                map.set(
                    player.id,
                    player
                );

            }
        );


        return map;

    }


    function getPlayer(
        playerId
    ) {

        return playerMap().get(
            playerId
        ) || null;

    }


    function getPlayerCompetition(
        playerId
    ) {

        return competitions.find(
            item =>
                item.player_id ===
                playerId
        ) || null;

    }


    function getPlayerTeam(
        playerId
    ) {

        const competition =
            getPlayerCompetition(
                playerId
            );


        return (
            competition?.team_name ||
            "TIME NÃO DEFINIDO"
        );

    }


    function stageLabel(
        stage
    ) {

        const labels = {

            QUARTERFINAL:
                "QUARTAS DE FINAL",

            SEMIFINAL:
                "SEMIFINAL",

            FINAL:
                "FINAL"

        };


        return (
            labels[stage] ||
            stage
        );

    }


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
            toast._nightTimer
        );


        toast._nightTimer =
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
       CARREGAR JOGADORES INSCRITOS NA NIGHT CUP
       ===================================================== */

    async function loadPlayers() {

        const client =
            await getSupabase();


        const {
            data: playerData,
            error: playerError
        } =
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
                    ascending: true
                }
            );


        if (
            playerError
        ) {

            throw playerError;

        }


        const {
            data: competitionData,
            error: competitionError
        } =
            await client

            .from(
                "player_competitions"
            )

            .select(
                "*"
            )

            .eq(
                "competition",
                "NIGHT_CUP"
            );


        if (
            competitionError
        ) {

            throw competitionError;

        }


        const competitionMap =
            new Map();


        (competitionData || [])
            .forEach(
                item => {

                    competitionMap.set(
                        item.player_id,
                        item
                    );

                }
            );


        players =
            (playerData || [])
                .filter(
                    player =>
                        competitionMap.has(
                            player.id
                        )
                );


        competitions =
            competitionData || [];


        renderPlayerSelectors();

    }


    /* =====================================================
       SELECTORS DOS 8 PARTICIPANTES
       ===================================================== */

    function renderPlayerSelectors() {

        if (
            !dom.playerGrid
        ) {

            return;

        }


        dom.playerGrid.innerHTML =
            "";


        for (
            let index = 1;
            index <= PLAYER_SLOT_COUNT;
            index++
        ) {

            const wrapper =
                document.createElement(
                    "label"
                );


            wrapper.className =
                "ccfv-night-player";


            wrapper.innerHTML = `

                <span>
                    SEED ${String(
                        index
                    ).padStart(
                        2,
                        "0"
                    )}
                </span>


                <select
                    data-night-slot="${index}"
                >

                    <option value="">
                        Selecione o jogador
                    </option>

                </select>


                <small
                    data-night-slot-info="${index}"
                >
                    Nenhum jogador selecionado.
                </small>

            `;


            const select =
                wrapper.querySelector(
                    "select"
                );


            players.forEach(
                player => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        player.id;


                    option.textContent =
                        player.name;


                    select.appendChild(
                        option
                    );

                }
            );


            select.addEventListener(
                "change",
                () => {

                    updatePlayerSlot(
                        index
                    );

                    validateSelection();

                }
            );


            dom.playerGrid.appendChild(
                wrapper
            );

        }


        validateSelection();

    }


    /* =====================================================
       INFO DO SLOT
       ===================================================== */

    function updatePlayerSlot(
        slot
    ) {

        const select =
            dom.playerGrid?.querySelector(
                `[data-night-slot="${slot}"]`
            );


        const info =
            dom.playerGrid?.querySelector(
                `[data-night-slot-info="${slot}"]`
            );


        if (
            !select ||
            !info
        ) {

            return;

        }


        const player =
            getPlayer(
                select.value
            );


        if (
            !player
        ) {

            info.textContent =
                "Nenhum jogador selecionado.";

            return;

        }


        const team =
            getPlayerTeam(
                player.id
            );


        const elo =
            Number(
                player.elo ?? 0
            );


        info.textContent =
            `${team} • ELO ${elo}`;

    }


    /* =====================================================
       PEGAR OS 8 SELECIONADOS
       ===================================================== */

    function getSelectedPlayers() {

        const selects =
            [
                ...dom.playerGrid.querySelectorAll(
                    "select[data-night-slot]"
                )
            ];


        return selects.map(
            select =>
                select.value
        );

    }


    /* =====================================================
       VALIDAR SELEÇÃO
       ===================================================== */

    function validateSelection() {

        if (
            !dom.playerGrid
        ) {

            return false;

        }


        const selected =
            getSelectedPlayers();


        const filled =
            selected.filter(
                Boolean
            );


        const unique =
            new Set(
                filled
            );


        const complete =
            filled.length ===
            PLAYER_SLOT_COUNT;


        const noDuplicates =
            unique.size ===
            filled.length;


        if (
            dom.create
        ) {

            dom.create.disabled =
                !complete ||
                !noDuplicates;

        }


        if (
            dom.setupMessage
        ) {

            if (
                !complete
            ) {

                dom.setupMessage.textContent =
                    `Selecione os 8 participantes. ${filled.length}/8 preenchidos.`;

            }

            else if (
                !noDuplicates
            ) {

                dom.setupMessage.textContent =
                    "Não é permitido repetir jogador.";

            }

            else {

                dom.setupMessage.textContent =
                    "Chave pronta para ser criada.";

            }

        }


        return (
            complete &&
            noDuplicates
        );

    }


    /* =====================================================
       CRIAR CHAVE
       ===================================================== */

    async function createBracket() {

        if (
            !validateSelection()
        ) {

            return;

        }


        const selected =
            getSelectedPlayers();


        try {

            setButtonLoading(
                dom.create,
                true,
                "CRIANDO..."
            );


            const client =
                await getSupabase();


            const {
                error
            } =
                await client.rpc(
                    "initialize_night_cup",
                    {

                        p_player_01:
                            selected[0],

                        p_player_02:
                            selected[1],

                        p_player_03:
                            selected[2],

                        p_player_04:
                            selected[3],

                        p_player_05:
                            selected[4],

                        p_player_06:
                            selected[5],

                        p_player_07:
                            selected[6],

                        p_player_08:
                            selected[7]

                    }
                );


            if (
                error
            ) {

                throw error;

            }


            showToast(
                "NIGHT CUP CRIADA COM SUCESSO."
            );


            await loadCup();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // NIGHT CUP CREATE:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CRIAR NIGHT CUP."
            );

        }

        finally {

            setButtonLoading(
                dom.create,
                false,
                "CRIAR CHAVE"
            );

        }

    }


    /* =====================================================
       RESET
       ===================================================== */

    async function resetCup() {

        const confirmed =
            window.confirm(
                "Tem certeza que deseja resetar a Night Cup #01? A chave atual será apagada."
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            setButtonLoading(
                dom.reset,
                true,
                "RESETANDO..."
            );


            const client =
                await getSupabase();


            const {
                error
            } =
                await client.rpc(
                    "reset_night_cup"
                );


            if (
                error
            ) {

                throw error;

            }


            showToast(
                "NIGHT CUP RESETADA."
            );


            matches = [];

            participants = [];

            clearBracket();


            await loadCup();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // NIGHT CUP RESET:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO RESETAR COPA."
            );

        }

        finally {

            setButtonLoading(
                dom.reset,
                false,
                "RESETAR COPA"
            );

        }

    }


    /* =====================================================
       CARREGAR CUP
       ===================================================== */

    async function loadCup() {

        const client =
            await getSupabase();


        const {
            data,
            error
        } =
            await client

            .from(
                "night_cup"
            )

            .select(
                "*"
            )

            .eq(
                "name",
                "NIGHT CUP #01"
            )

            .maybeSingle();


        if (
            error
        ) {

            throw error;

        }


        cup =
            data || null;


        if (
            cup
        ) {

            const {
                data: participantData,
                error:
                    participantError
            } =
                await client

                .from(
                    "night_cup_participants"
                )

                .select(
                    "*"
                )

                .eq(
                    "cup_id",
                    cup.id
                )

                .order(
                    "seed",
                    {
                        ascending: true
                    }
                );


            if (
                participantError
            ) {

                throw participantError;

            }


            participants =
                participantData || [];


            const {
                data: matchData,
                error:
                    matchError
            } =
                await client

                .from(
                    "night_cup_matches"
                )

                .select(
                    "*"
                )

                .eq(
                    "cup_id",
                    cup.id
                )

                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


            if (
                matchError
            ) {

                throw matchError;

            }


            matches =
                matchData || [];

        }

        else {

            participants = [];

            matches = [];

        }


        renderCupStatus();

        renderBracket();

        renderChampion();

        preselectParticipants();

    }


    /* =====================================================
       PRESELECIONAR PARTICIPANTES
       ===================================================== */

    function preselectParticipants() {

        if (
            participants.length === 0
        ) {

            return;

        }


        const ordered =
            [...participants]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.seed -
                        b.seed
                );


        ordered.forEach(
            participant => {

                const select =
                    dom.playerGrid?.querySelector(
                        `[data-night-slot="${participant.seed}"]`
                    );


                if (
                    !select
                ) {

                    return;

                }


                select.value =
                    participant.player_id;


                updatePlayerSlot(
                    participant.seed
                );

            }
        );


        validateSelection();

    }


    /* =====================================================
       STATUS
       ===================================================== */

    function renderCupStatus() {

        if (
            !dom.status
        ) {

            return;

        }


        dom.status.textContent =
            cup?.status ||
            "SETUP";

    }


    /* =====================================================
       MATCH FINDER
       ===================================================== */

    function findMatch(
        stage,
        number
    ) {

        return matches.find(
            item =>

                item.stage === stage &&

                Number(
                    item.match_number
                ) === number

        ) || null;

    }


    /* =====================================================
       NOME
       ===================================================== */

    function matchPlayerName(
        playerId
    ) {

        if (
            !playerId
        ) {

            return "AGUARDANDO";

        }


        const player =
            getPlayer(
                playerId
            );


        return (
            player?.name ||
            "JOGADOR"
        );

    }


    /* =====================================================
       TIME
       ===================================================== */

    function matchPlayerTeam(
        playerId,
        fallback
    ) {

        if (
            !playerId
        ) {

            return "Aguardando vencedor";

        }


        return (
            fallback ||
            getPlayerTeam(
                playerId
            )
        );

    }


    /* =====================================================
       RENDER BRACKET
       ===================================================== */

    function renderBracket() {

        renderQuarterfinals();

        renderSemifinals();

        renderFinal();

    }


    /* =====================================================
       QUARTAS
       ===================================================== */

    function renderQuarterfinals() {

        if (
            !dom.quarterfinals
        ) {

            return;

        }


        dom.quarterfinals.innerHTML =
            "";


        for (
            let i = 1;
            i <= 4;
            i++
        ) {

            const match =
                findMatch(
                    "QUARTERFINAL",
                    i
                );


            dom.quarterfinals.appendChild(
                buildMatchCard(
                    match,
                    "QF" +
                    String(i).padStart(
                        2,
                        "0"
                    )
                )
            );

        }

    }


    /* =====================================================
       SEMIFINAIS
       ===================================================== */

    function renderSemifinals() {

        if (
            !dom.semifinals
        ) {

            return;

        }


        dom.semifinals.innerHTML =
            "";


        for (
            let i = 1;
            i <= 2;
            i++
        ) {

            const match =
                findMatch(
                    "SEMIFINAL",
                    i
                );


            dom.semifinals.appendChild(
                buildMatchCard(
                    match,
                    "SF" +
                    String(i).padStart(
                        2,
                        "0"
                    )
                )
            );

        }

    }


    /* =====================================================
       FINAL
       ===================================================== */

    function renderFinal() {

        if (
            !dom.final
        ) {

            return;

        }


        dom.final.innerHTML =
            "";


        const match =
            findMatch(
                "FINAL",
                1
            );


        dom.final.appendChild(
            buildMatchCard(
                match,
                "FINAL",
                true
            )
        );

    }


    /* =====================================================
       BUILD CARD
       ===================================================== */

    function buildMatchCard(
        match,
        code,
        isFinal = false
    ) {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "ccfv-night-game";


        if (
            isFinal
        ) {

            card.classList.add(
                "is-final"
            );

        }


        if (
            !match
        ) {

            card.innerHTML = `

                <div
                    class="
                        ccfv-night-game__top
                    "
                >

                    <span>
                        ${code}
                    </span>

                    <small>
                        ${isFinal
                            ? "FINAL"
                            : "AGUARDANDO"
                        }
                    </small>

                </div>


                <div
                    class="
                        ccfv-night-teams
                    "
                >

                    <div
                        class="
                            ccfv-night-team
                        "
                    >

                        <strong>
                            AGUARDANDO
                        </strong>

                        <small>
                            ${isFinal
                                ? "VENCEDOR SF01"
                                : "PARTICIPANTE"
                            }
                        </small>

                    </div>


                    <div
                        class="
                            ccfv-night-score
                        "
                    >

                        <strong>
                            —
                        </strong>

                    </div>


                    <div
                        class="
                            ccfv-night-team
                        "
                    >

                        <strong>
                            AGUARDANDO
                        </strong>

                        <small>
                            ${isFinal
                                ? "VENCEDOR SF02"
                                : "PARTICIPANTE"
                            }
                        </small>

                    </div>

                </div>


                <div
                    class="
                        ccfv-night-waiting
                    "
                >
                    AGUARDANDO DEFINIÇÃO
                </div>

            `;


            return card;

        }


        const homeName =
            matchPlayerName(
                match.home_player_id
            );


        const awayName =
            matchPlayerName(
                match.away_player_id
            );


        const homeTeam =
            match.home_player_id

                ? (
                    match.home_team ||
                    getPlayerTeam(
                        match.home_player_id
                    )
                )

                : "Aguardando vencedor";


        const awayTeam =
            match.away_player_id

                ? (
                    match.away_team ||
                    getPlayerTeam(
                        match.away_player_id
                    )
                )

                : "Aguardando vencedor";


        const finished =
            match.status ===
            "FINAL";


        const homeScore =
            finished
                ? Number(
                    match.home_score ?? 0
                )
                : "—";


        const awayScore =
            finished
                ? Number(
                    match.away_score ?? 0
                )
                : "—";


        card.innerHTML = `

            <div
                class="
                    ccfv-night-game__top
                "
            >

                <span>
                    ${code}
                </span>

                <small>
                    ${finished
                        ? "FINALIZADA"
                        : "PRONTA"
                    }
                </small>

            </div>


            <div
                class="
                    ccfv-night-teams
                "
            >

                <div
                    class="
                        ccfv-night-team
                    "
                >

                    <strong>
                        ${escapeHTML(
                            homeName
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            homeTeam
                        )}
                    </small>

                </div>


                <div
                    class="
                        ccfv-night-score
                    "
                >

                    <strong>
                        ${homeScore}
                    </strong>

                    <span>
                        x
                    </span>

                    <strong>
                        ${awayScore}
                    </strong>

                </div>


                <div
                    class="
                        ccfv-night-team
                    "
                >

                    <strong>
                        ${escapeHTML(
                            awayName
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            awayTeam
                        )}
                    </small>

                </div>

            </div>


            <div
                class="
                    ccfv-night-game__bottom
                "
            >

                <span>
                    ${stageLabel(
                        match.stage
                    )}
                </span>

                <strong>
                    ${
                        finished
                            ? "RESULTADO REGISTRADO"
                            : "REGISTRAR RESULTADO"
                    }
                </strong>

            </div>

        `;


        if (
            !finished &&
            match.status === "READY" &&
            match.home_player_id &&
            match.away_player_id
        ) {

            const form =
                document.createElement(
                    "form"
                );


            form.className =
                "ccfv-night-score-form";


            form.innerHTML = `

                <input
                    type="number"
                    min="0"
                    max="99"
                    inputmode="numeric"
                    placeholder="CASA"
                    aria-label="Placar da casa"
                    required
                >


                <input
                    type="number"
                    min="0"
                    max="99"
                    inputmode="numeric"
                    placeholder="FORA"
                    aria-label="Placar de fora"
                    required
                >


                <button
                    type="submit"
                >
                    REGISTRAR
                </button>

            `;


            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    registerMatchResult(
                        match,
                        form
                    );

                }
            );


            card.appendChild(
                form
            );

        }


        if (
            finished
        ) {

            const winner =
                getPlayer(
                    match.winner_player_id
                );


            if (
                winner
            ) {

                const winnerBox =
                    document.createElement(
                        "div"
                    );


                winnerBox.className =
                    "ccfv-night-waiting";


                winnerBox.innerHTML =
                    `VENCEDOR: <strong style="color:#43df91">${escapeHTML(
                        winner.name
                    )}</strong>`;


                card.appendChild(
                    winnerBox
                );

            }

        }


        return card;

    }


    /* =====================================================
       REGISTRAR RESULTADO
       ===================================================== */

    async function registerMatchResult(
        match,
        form
    ) {

        const inputs =
            form.querySelectorAll(
                "input"
            );


        const homeScore =
            Number(
                inputs[0].value
            );


        const awayScore =
            Number(
                inputs[1].value
            );


        if (
            !Number.isInteger(
                homeScore
            ) ||
            !Number.isInteger(
                awayScore
            )
        ) {

            showToast(
                "PLACAR INVÁLIDO."
            );

            return;

        }


        if (
            homeScore ===
            awayScore
        ) {

            showToast(
                "A NIGHT CUP NÃO ACEITA EMPATE."
            );

            return;

        }


        const button =
            form.querySelector(
                "button"
            );


        try {

            setButtonLoading(
                button,
                true,
                "SALVANDO..."
            );


            const client =
                await getSupabase();


            const {
                error
            } =
                await client.rpc(
                    "register_night_cup_match",
                    {

                        p_night_match_id:
                            match.id,

                        p_home_score:
                            homeScore,

                        p_away_score:
                            awayScore,

                        p_played_at:
                            new Date().toISOString()

                    }
                );


            if (
                error
            ) {

                throw error;

            }


            showToast(
                "RESULTADO REGISTRADO."
            );


            await loadPlayers();

            await loadCup();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // NIGHT CUP RESULT:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO REGISTRAR RESULTADO."
            );

        }

        finally {

            setButtonLoading(
                button,
                false,
                "REGISTRAR"
            );

        }

    }


    /* =====================================================
       CAMPEÃO
       ===================================================== */

    function renderChampion() {

        if (
            !dom.champion ||
            !dom.championName
        ) {

            return;

        }


        if (
            !cup ||
            !cup.champion_player_id
        ) {

            dom.champion.classList.remove(
                "is-visible"
            );

            dom.championName.textContent =
                "—";

            return;

        }


        const champion =
            getPlayer(
                cup.champion_player_id
            );


        if (
            !champion
        ) {

            return;

        }


        dom.championName.textContent =
            champion.name;


        dom.champion.classList.add(
            "is-visible"
        );

    }


    /* =====================================================
       LIMPAR CHAVE
       ===================================================== */

    function clearBracket() {

        if (
            dom.quarterfinals
        ) {

            dom.quarterfinals.innerHTML =
                "";

        }


        if (
            dom.semifinals
        ) {

            dom.semifinals.innerHTML =
                "";

        }


        if (
            dom.final
        ) {

            dom.final.innerHTML =
                "";

        }


        if (
            dom.champion
        ) {

            dom.champion.classList.remove(
                "is-visible"
            );

        }

    }


    /* =====================================================
       BOTÃO
       ===================================================== */

    function setButtonLoading(
        button,
        loading,
        text
    ) {

        if (
            !button
        ) {

            return;

        }


        if (
            loading
        ) {

            button.disabled =
                true;

            button.dataset.originalText =
                button.textContent;

            button.textContent =
                text;

        }

        else {

            button.disabled =
                false;

            button.textContent =
                text ||
                button.dataset.originalText ||
                "";

        }

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        dom.create?.addEventListener(
            "click",
            createBracket
        );


        dom.reset?.addEventListener(
            "click",
            resetCup
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


        bindEvents();


        try {

            await loadPlayers();

            await loadCup();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // NIGHT CUP INIT:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CARREGAR NIGHT CUP."
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