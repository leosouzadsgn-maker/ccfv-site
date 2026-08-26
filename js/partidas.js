/* =========================================================
   CCFV — MATCH CENTER
   SISTEMA OFICIAL DE PARTIDAS
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       ESTADO
       ===================================================== */

    const state = {

        competition: "all",

        status: "all"

    };


    /* =====================================================
       CLUBES
       ===================================================== */

    const teams = [

        {
            id: 1,
            name: "PALMEIRAS",
            crest: "../assets/images/clubs/palmeiras.png"
        },

        {
            id: 2,
            name: "FLAMENGO",
            crest: "../assets/images/clubs/flamengo.png"
        },

        {
            id: 3,
            name: "ATHLETICO-PR",
            crest: "../assets/images/clubs/athletico-pr.png"
        },

        {
            id: 4,
            name: "FLUMINENSE",
            crest: "../assets/images/clubs/fluminense.png"
        },

        {
            id: 5,
            name: "CRUZEIRO",
            crest: "../assets/images/clubs/cruzeiro.png"
        },

        {
            id: 6,
            name: "BAHIA",
            crest: "../assets/images/clubs/bahia.png"
        },

        {
            id: 7,
            name: "CORINTHIANS",
            crest: "../assets/images/clubs/corinthians.png"
        },

        {
            id: 8,
            name: "BRAGANTINO",
            crest: "../assets/images/clubs/bragantino.png"
        },

        {
            id: 9,
            name: "BOTAFOGO",
            crest: "../assets/images/clubs/botafogo.png"
        },

        {
            id: 10,
            name: "CORITIBA",
            crest: "../assets/images/clubs/coritiba.png"
        },

        {
            id: 11,
            name: "ATLÉTICO-MG",
            crest: "../assets/images/clubs/atletico-mg.png"
        },

        {
            id: 12,
            name: "SÃO PAULO",
            crest: "../assets/images/clubs/sao-paulo.png"
        },

        {
            id: 13,
            name: "VITÓRIA",
            crest: "../assets/images/clubs/vitoria.png"
        },

        {
            id: 14,
            name: "GRÊMIO",
            crest: "../assets/images/clubs/gremio.png"
        },

        {
            id: 15,
            name: "MIRASSOL",
            crest: "../assets/images/clubs/mirassol.png"
        },

        {
            id: 16,
            name: "INTERNACIONAL",
            crest: "../assets/images/clubs/internacional.png"
        },

        {
            id: 17,
            name: "SANTOS",
            crest: "../assets/images/clubs/santos.png"
        },

        {
            id: 18,
            name: "VASCO",
            crest: "../assets/images/clubs/vasco.png"
        },

        {
            id: 19,
            name: "REMO",
            crest: "../assets/images/clubs/remo.png"
        },

        {
            id: 20,
            name: "CHAPECOENSE",
            crest: "../assets/images/clubs/chapecoense.png"
        }

    ];


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function getTeam(id) {

        return teams.find(
            team => team.id === id
        );

    }


    function escapeHTML(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function pad(value) {

        return String(value)
            .padStart(2, "0");

    }


    function crestHTML(team) {

        if (!team) {

            return "?";

        }


        if (!team.crest) {

            return "?";

        }


        return `

            <img
                src="${escapeHTML(team.crest)}"
                alt="${escapeHTML(team.name)}"
            >

        `;

    }


    /* =====================================================
       GERA A RODADA 01 DO BRASILEIRÃO
       ===================================================== */

    function generateBrasileiraoRoundOne() {

        const fixtures = [

            [1, 20],

            [2, 19],

            [3, 18],

            [4, 17],

            [5, 16],

            [6, 15],

            [7, 14],

            [8, 13],

            [9, 12],

            [10, 11]

        ];


        return fixtures.map(
            (
                pair,
                index
            ) => {

                const home =
                    getTeam(pair[0]);

                const away =
                    getTeam(pair[1]);


                return {

                    id:
                        `br-${index + 1}`,

                    competition:
                        "brasileirao",

                    competitionName:
                        "BRASILEIRÃO CCFV",

                    stage:
                        "RODADA 01",

                    status:
                        "upcoming",

                    home,

                    away,

                    score:
                        null,

                    date:
                        "DATA A DEFINIR",

                    time:
                        "HORÁRIO A DEFINIR"

                };

            }
        );

    }


    /* =====================================================
       NIGHT CUP
       ===================================================== */

    function generateNightCup() {

        return [

            {
                id: "night-1",

                competition: "night",

                competitionName:
                    "NIGHT CUP",

                stage:
                    "QUARTAS 01",

                status:
                    "upcoming",

                home: {
                    name: "A DEFINIR",
                    crest: null
                },

                away: {
                    name: "A DEFINIR",
                    crest: null
                },

                score: null,

                date:
                    "DATA A DEFINIR",

                time:
                    "HORÁRIO A DEFINIR"

            },

            {
                id: "night-2",

                competition: "night",

                competitionName:
                    "NIGHT CUP",

                stage:
                    "QUARTAS 02",

                status:
                    "upcoming",

                home: {
                    name: "A DEFINIR",
                    crest: null
                },

                away: {
                    name: "A DEFINIR",
                    crest: null
                },

                score: null,

                date:
                    "DATA A DEFINIR",

                time:
                    "HORÁRIO A DEFINIR"

            },

            {
                id: "night-3",

                competition: "night",

                competitionName:
                    "NIGHT CUP",

                stage:
                    "QUARTAS 03",

                status:
                    "upcoming",

                home: {
                    name: "A DEFINIR",
                    crest: null
                },

                away: {
                    name: "A DEFINIR",
                    crest: null
                },

                score: null,

                date:
                    "DATA A DEFINIR",

                time:
                    "HORÁRIO A DEFINIR"

            },

            {
                id: "night-4",

                competition: "night",

                competitionName:
                    "NIGHT CUP",

                stage:
                    "QUARTAS 04",

                status:
                    "upcoming",

                home: {
                    name: "A DEFINIR",
                    crest: null
                },

                away: {
                    name: "A DEFINIR",
                    crest: null
                },

                score: null,

                date:
                    "DATA A DEFINIR",

                time:
                    "HORÁRIO A DEFINIR"

            }

        ];

    }


    /* =====================================================
       BASE DE PARTIDAS
       ===================================================== */

    let partidas = [

        ...generateBrasileiraoRoundOne(),

        ...generateNightCup()

    ];


    /* =====================================================
       DADOS AO VIVO — ADMIN -> SUPABASE -> MATCH CENTER
       ===================================================== */

    function normalize(value) {

        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();

    }


    function liveStatus(value) {

        const status = normalize(value);

        if (
            status === "FINAL" ||
            status === "FINALIZADA" ||
            status === "FINALIZADO" ||
            status === "FINISHED" ||
            status === "COMPLETED" ||
            status === "CONCLUIDA" ||
            status === "ENCERRADA"
        ) {

            return "finished";

        }

        if (
            status === "CANCELLED" ||
            status === "CANCELED"
        ) {

            return "cancelled";

        }

        return "upcoming";

    }


    function formatLiveDate(value) {

        if (!value) {

            return "DATA A DEFINIR";

        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {

            return "DATA A DEFINIR";

        }

        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });

    }


    function formatLiveTime(value) {

        if (!value) {

            return "HORÁRIO A DEFINIR";

        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {

            return "HORÁRIO A DEFINIR";

        }

        return date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

    }


    function teamFromLive(value, fallbackCrest = null) {

        const raw = String(value ?? "").trim();

        const numeric = Number(value);
        const byId = Number.isFinite(numeric)
            ? getTeam(numeric)
            : null;

        const byName = teams.find(
            team => normalize(team.name) === normalize(raw)
        );

        const team = byId || byName;

        if (team) {

            return team;

        }

        return {
            id: raw,
            name: raw || "A DEFINIR",
            crest: fallbackCrest
        };

    }


    function liveMatchToView(match, competition) {

        const source = match || {};
        const status = liveStatus(source.status);
        const playedAt = source.played_at || source.created_at || null;
        const home = teamFromLive(source.home_team);
        const away = teamFromLive(source.away_team);

        const homeScore = Number(source.home_score);
        const awayScore = Number(source.away_score);

        return {

            id: `live-${competition}-${source.id}`,
            sourceId: source.id,
            competition,
            competitionName: competition === "brasileirao"
                ? "BRASILEIRÃO CCFV"
                : "NIGHT CUP",
            stage: source.stage || (competition === "brasileirao"
                ? `RODADA ${String(source.round_number || 1).padStart(2, "0")}`
                : "NIGHT CUP"),
            status,
            home,
            away,
            score: status === "finished"
                ? {
                    home: Number.isFinite(homeScore) ? homeScore : 0,
                    away: Number.isFinite(awayScore) ? awayScore : 0
                }
                : null,
            date: formatLiveDate(playedAt),
            time: formatLiveTime(playedAt),
            playedAt: playedAt || ""

        };

    }


    function loadLivePartidas() {

        const live = window.CCFVLive;

        if (!live) {

            return false;

        }

        const matches = Array.isArray(live.matches)
            ? live.matches
            : [];

        const nightMatches = Array.isArray(live.nightMatches)
            ? live.nightMatches
            : [];

        const mappedMatches = matches
            .filter(match => normalize(match.competition) === "BRASILEIRAO")
            .map(match => liveMatchToView(match, "brasileirao"));

        const mappedNight = nightMatches
            .map(match => liveMatchToView(match, "night"));

        const all = [
            ...mappedMatches,
            ...mappedNight
        ];

        if (!all.length) {

            return false;

        }

        all.sort((a, b) => {

            const aTime = a.playedAt ? new Date(a.playedAt).getTime() : 0;
            const bTime = b.playedAt ? new Date(b.playedAt).getTime() : 0;

            return bTime - aTime;

        });

        partidas = all;

        return true;

    }


    function refreshFromLive() {

        const changed = loadLivePartidas();

        if (!changed) {

            return;

        }

        updateCounters();
        updateFilterButtons();
        renderNextMatch();
        renderMatches();
        renderResults();

    }


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const elements = {

        list:
            document.querySelector(
                "#ccfv-partidas-list"
            ),

        results:
            document.querySelector(
                "#ccfv-partidas-results"
            ),

        feature:
            document.querySelector(
                ".ccfv-next-match-card"
            ),

        headingStatus:
            document.querySelector(
                ".ccfv-partidas-heading-status"
            ),

        filters:
            document.querySelectorAll(
                ".ccfv-partidas-filter"
            ),

        competitionCounter:
            document.querySelector(
                ".ccfv-partidas-hero__stats > div:nth-child(1) strong"
            ),

        upcomingCounter:
            document.querySelector(
                ".ccfv-partidas-hero__stats > div:nth-child(2) strong"
            ),

        finishedCounter:
            document.querySelector(
                ".ccfv-partidas-hero__stats > div:nth-child(3) strong"
            )

    };


    /* =====================================================
       CONTADORES
       ===================================================== */

    function updateCounters() {

        const competitions =
            new Set(
                partidas.map(
                    match =>
                        match.competition
                )
            );


        const upcoming =
            partidas.filter(
                match =>
                    match.status ===
                    "upcoming"
            ).length;


        const finished =
            partidas.filter(
                match =>
                    match.status ===
                    "finished"
            ).length;


        if (
            elements.competitionCounter
        ) {

            elements.competitionCounter.textContent =
                pad(
                    competitions.size
                );

        }


        if (
            elements.upcomingCounter
        ) {

            elements.upcomingCounter.textContent =
                pad(
                    upcoming
                );

        }


        if (
            elements.finishedCounter
        ) {

            elements.finishedCounter.textContent =
                pad(
                    finished
                );

        }

    }


    /* =====================================================
       PRÓXIMA PARTIDA
       ===================================================== */

    function getNextMatch() {

        return partidas.find(
            match =>
                match.status ===
                "upcoming"
        );

    }


    function renderNextMatch() {

        if (!elements.feature) {

            return;

        }


        const match =
            getNextMatch();


        if (!match) {

            return;

        }


        elements.feature.innerHTML = `

            <div
                class="ccfv-next-match-card__competition"
            >

                <span>
                    ${escapeHTML(
                        match.competitionName
                    )}
                </span>

                <small>
                    ${escapeHTML(
                        match.stage
                    )}
                </small>

            </div>


            <div
                class="ccfv-next-match-card__teams"
            >

                <div
                    class="ccfv-next-team"
                >

                    <div
                        class="ccfv-next-team__crest"
                    >

                        ${crestHTML(
                            match.home
                        )}

                    </div>

                    <strong>
                        ${escapeHTML(
                            match.home.name
                        )}
                    </strong>

                    <span>
                        CASA
                    </span>

                </div>


                <div
                    class="ccfv-next-match-card__vs"
                >

                    <span>
                        VS
                    </span>

                    <small>
                        ${escapeHTML(
                            match.date
                        )}
                    </small>

                </div>


                <div
                    class="ccfv-next-team"
                >

                    <div
                        class="ccfv-next-team__crest"
                    >

                        ${crestHTML(
                            match.away
                        )}

                    </div>

                    <strong>
                        ${escapeHTML(
                            match.away.name
                        )}
                    </strong>

                    <span>
                        FORA
                    </span>

                </div>

            </div>


            <div
                class="ccfv-next-match-card__bottom"
            >

                <span>
                    HORÁRIO
                </span>

                <strong>
                    ${escapeHTML(
                        match.time
                    )}
                </strong>

            </div>

        `;

    }


    /* =====================================================
       FILTRO
       ===================================================== */

    function getFilteredMatches() {

        return partidas.filter(
            match => {

                const competitionOK =
                    state.competition ===
                    "all" ||
                    match.competition ===
                    state.competition;


                const statusOK =
                    state.status ===
                    "all" ||
                    match.status ===
                    state.status;


                return (
                    competitionOK &&
                    statusOK
                );

            }
        );

    }


    /* =====================================================
       BOTÕES DOS FILTROS
       ===================================================== */

    function updateFilterButtons() {

        elements.filters.forEach(
            button => {

                const competition =
                    button.dataset.filter;


                const status =
                    button.dataset.status;


                let active =
                    false;


                if (
                    competition
                ) {

                    active =
                        state.competition ===
                        competition;

                }


                if (
                    status
                ) {

                    active =
                        state.status ===
                        status;

                }


                button.classList.toggle(
                    "is-active",
                    active
                );

            }
        );

    }


    /* =====================================================
       RENDER DA LISTA
       ===================================================== */

    function renderMatches() {

        if (!elements.list) {

            return;

        }


        const filtered =
            getFilteredMatches();


        if (!filtered.length) {

            elements.list.innerHTML = `

                <div
                    class="ccfv-partidas-empty"
                >

                    <span>
                        00
                    </span>

                    <div>

                        <strong>
                            Nenhuma partida encontrada.
                        </strong>

                        <small>
                            Não há confrontos para
                            os filtros selecionados.
                        </small>

                    </div>

                </div>

            `;

            return;

        }


        elements.list.innerHTML =
            filtered
                .map(
                    match =>
                        renderMatchCard(
                            match
                        )
                )
                .join("");

    }


    /* =====================================================
       CARD DE PARTIDA
       ===================================================== */

    function renderMatchCard(
        match
    ) {

        const finished =
            match.status ===
            "finished";


        const score =
            finished &&
            match.score
                ? `${match.score.home} — ${match.score.away}`
                : "VS";


        const scoreBottom =
            finished
                ? "FINAL"
                : match.time;


        return `

            <article
                class="ccfv-match-center-card"
                data-id="${escapeHTML(
                    match.id
                )}"
            >

                <div
                    class="ccfv-match-center-card__meta"
                >

                    <span>
                        ${escapeHTML(
                            match.competitionName
                        )}
                    </span>

                    <small>
                        ${escapeHTML(
                            match.stage
                        )}
                    </small>

                </div>


                <div
                    class="ccfv-match-center-card__team"
                >

                    <span
                        class="ccfv-match-center-card__crest"
                    >
                        ${crestHTML(
                            match.home
                        )}
                    </span>

                    <strong>
                        ${escapeHTML(
                            match.home.name
                        )}
                    </strong>

                </div>


                <div
                    class="ccfv-match-center-card__score"
                >

                    <strong>
                        ${score}
                    </strong>

                    <span>
                        ${escapeHTML(
                            scoreBottom
                        )}
                    </span>

                </div>


                <div
                    class="
                        ccfv-match-center-card__team
                        ccfv-match-center-card__team--away
                    "
                >

                    <strong>
                        ${escapeHTML(
                            match.away.name
                        )}
                    </strong>

                    <span
                        class="ccfv-match-center-card__crest"
                    >
                        ${crestHTML(
                            match.away
                        )}
                    </span>

                </div>


                <div
                    class="ccfv-match-center-card__status"
                >

                    <span>
                        ${
                            finished
                                ? "FINALIZADA"
                                : "PRÓXIMA"
                        }
                    </span>

                    <small>
                        ${escapeHTML(
                            match.date
                        )}
                    </small>

                </div>

            </article>

        `;

    }


    /* =====================================================
       RESULTADOS
       ===================================================== */

    function renderResults() {

        if (!elements.results) {

            return;

        }


        const results =
            partidas.filter(
                match =>
                    match.status ===
                    "finished"
            );


        if (!results.length) {

            elements.results.innerHTML = `

                <div
                    class="ccfv-partidas-empty"
                >

                    <span>
                        00
                    </span>

                    <div>

                        <strong>
                            Nenhuma partida finalizada.
                        </strong>

                        <small>
                            Os resultados aparecerão
                            aqui após o início oficial
                            das competições.
                        </small>

                    </div>

                </div>

            `;

            return;

        }


        elements.results.innerHTML =
            results
                .map(
                    match =>
                        renderMatchCard(
                            match
                        )
                )
                .join("");

    }


    /* =====================================================
       CLIQUE NOS FILTROS
       ===================================================== */

    function bindFilters() {

        elements.filters.forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        if (
                            button.dataset.filter
                        ) {

                            state.competition =
                                button.dataset.filter;

                        }


                        if (
                            button.dataset.status
                        ) {

                            state.status =
                                button.dataset.status;

                        }


                        updateFilterButtons();

                        renderMatches();

                    }
                );

            }
        );

    }


    /* =====================================================
       SINCRONIZAÇÃO COM O LIVE ENGINE
       ===================================================== */

    function bindLiveUpdates() {

        window.addEventListener(
            "ccfv:live-update",
            () => {
                refreshFromLive();
            }
        );

        window.setTimeout(
            refreshFromLive,
            250
        );

    }


    /* =====================================================
       API
       ===================================================== */

    window.CCFVPartidas = {

        getAll:
            () => [
                ...partidas
            ],

        getFiltered:
            () => [
                ...getFilteredMatches()
            ],

        refresh:
            () => {

                updateCounters();

                updateFilterButtons();

                renderNextMatch();

                renderMatches();

                renderResults();

            }

    };


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    function init() {

        updateCounters();

        bindFilters();

        updateFilterButtons();

        renderNextMatch();

        renderMatches();

        renderResults();

        bindLiveUpdates();


        console.log(
            "%cCCFV // MATCH CENTER",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        console.log(
            `${partidas.length} partidas carregadas.`
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