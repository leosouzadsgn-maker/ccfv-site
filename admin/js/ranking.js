/* =========================================================
   CCFV // RANKING ADMIN
   RANKING AUTOMÁTICO
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient = null;

    let ranking = [];

    let searchTerm = "";

    let rankFilter = "ALL";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const RANKS = {

        INICIANTE: {
            label: "INICIANTE",
            min: 0,
            className: "ccfv-rank--beginner"
        },

        AMADOR: {
            label: "AMADOR",
            min: 1000,
            className: "ccfv-rank--amateur"
        },

        PROFISSIONAL: {
            label: "PROFISSIONAL",
            min: 2000,
            className: "ccfv-rank--professional"
        },

        LENDA: {
            label: "LENDA",
            min: 3000,
            className: "ccfv-rank--legend"
        }

    };


    /* =====================================================
       DOM
       ===================================================== */

    const section =
        document.querySelector(
            "#section-ranking"
        );


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
       SEGURANÇA HTML
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
       RANK
       ===================================================== */

    function normalizeRank(
        value
    ) {

        const rank =
            String(
                value ||
                "INICIANTE"
            )
            .trim()
            .toUpperCase();


        if (
            RANKS[rank]
        ) {

            return RANKS[rank];

        }


        return RANKS.INICIANTE;

    }


    /* =====================================================
       INJETAR INTERFACE
       ===================================================== */

    function buildInterface() {

        if (
            !section
        ) {

            return;

        }


        section.innerHTML = `

            <style>

                #section-ranking
                .ccfv-ranking-screen {

                    display:
                        flex;

                    flex-direction:
                        column;

                    gap:
                        18px;

                }


                #section-ranking
                .ccfv-ranking-hero {

                    display:
                        flex;

                    align-items:
                        flex-end;

                    justify-content:
                        space-between;

                    gap:
                        20px;

                    flex-wrap:
                        wrap;

                }


                #section-ranking
                .ccfv-ranking-hero__text {

                    min-width:
                        260px;

                }


                #section-ranking
                .ccfv-ranking-hero__eyebrow {

                    display:
                        block;

                    margin-bottom:
                        8px;

                    color:
                        #43df91;

                    font-size:
                        6px;

                    font-weight:
                        950;

                    letter-spacing:
                        .14em;

                }


                #section-ranking
                .ccfv-ranking-hero h1 {

                    margin:
                        0;

                    color:
                        #ffffff;

                    font-size:
                        clamp(
                            28px,
                            4vw,
                            46px
                        );

                    line-height:
                        .95;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-hero h1 strong {

                    color:
                        #43df91;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-hero p {

                    max-width:
                        600px;

                    margin:
                        12px 0 0;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .22
                        );

                    font-size:
                        8px;

                    line-height:
                        1.6;

                }


                #section-ranking
                .ccfv-ranking-hero__actions {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        8px;

                    flex-wrap:
                        wrap;

                }


                #section-ranking
                .ccfv-ranking-button {

                    min-height:
                        40px;

                    padding:
                        0 13px;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .08
                        );

                    border-radius:
                        9px;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .5
                        );

                    background:
                        rgba(
                            255,
                            255,
                            255,
                            .02
                        );

                    font-size:
                        6px;

                    font-weight:
                        950;

                    letter-spacing:
                        .08em;

                }


                #section-ranking
                .ccfv-ranking-button:hover {

                    color:
                        #ffffff;

                    border-color:
                        rgba(
                            67,
                            223,
                            145,
                            .22
                        );

                }


                #section-ranking
                .ccfv-ranking-button--primary {

                    color:
                        #031008;

                    border-color:
                        #43df91;

                    background:
                        #43df91;

                }


                #section-ranking
                .ccfv-ranking-stats {

                    display:
                        grid;

                    grid-template-columns:
                        repeat(
                            4,
                            minmax(
                                0,
                                1fr
                            )
                        );

                    gap:
                        10px;

                }


                #section-ranking
                .ccfv-ranking-stat {

                    min-height:
                        92px;

                    padding:
                        15px;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .06
                        );

                    border-radius:
                        13px;

                    background:
                        rgba(
                            255,
                            255,
                            255,
                            .012
                        );

                }


                #section-ranking
                .ccfv-ranking-stat span {

                    display:
                        block;

                    margin-bottom:
                        8px;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .18
                        );

                    font-size:
                        5px;

                    font-weight:
                        950;

                    letter-spacing:
                        .1em;

                }


                #section-ranking
                .ccfv-ranking-stat strong {

                    display:
                        block;

                    color:
                        #43df91;

                    font-size:
                        22px;

                    line-height:
                        1;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-stat small {

                    display:
                        block;

                    margin-top:
                        7px;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .14
                        );

                    font-size:
                        5px;

                }


                #section-ranking
                .ccfv-ranking-controls {

                    display:
                        flex;

                    align-items:
                        flex-end;

                    justify-content:
                        space-between;

                    gap:
                        12px;

                    flex-wrap:
                        wrap;

                }


                #section-ranking
                .ccfv-ranking-search {

                    display:
                        flex;

                    flex-direction:
                        column;

                    gap:
                        7px;

                    min-width:
                        min(
                            360px,
                            100%
                        );

                    flex:
                        1;

                }


                #section-ranking
                .ccfv-ranking-search span {

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .2
                        );

                    font-size:
                        5px;

                    font-weight:
                        950;

                    letter-spacing:
                        .12em;

                }


                #section-ranking
                .ccfv-ranking-search input {

                    width:
                        100%;

                    height:
                        42px;

                    padding:
                        0 12px;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .08
                        );

                    border-radius:
                        9px;

                    outline:
                        none;

                    color:
                        #ffffff;

                    background:
                        #07100b;

                    font-size:
                        7px;

                    font-weight:
                        800;

                }


                #section-ranking
                .ccfv-ranking-search input:focus {

                    border-color:
                        rgba(
                            67,
                            223,
                            145,
                            .4
                        );

                    box-shadow:
                        0 0 0 3px
                        rgba(
                            67,
                            223,
                            145,
                            .05
                        );

                }


                #section-ranking
                .ccfv-ranking-filters {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        6px;

                    flex-wrap:
                        wrap;

                }


                #section-ranking
                .ccfv-ranking-filter {

                    min-height:
                        36px;

                    padding:
                        0 10px;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .07
                        );

                    border-radius:
                        8px;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .28
                        );

                    background:
                        rgba(
                            255,
                            255,
                            255,
                            .015
                        );

                    font-size:
                        5px;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-filter.is-active {

                    color:
                        #031008;

                    border-color:
                        #43df91;

                    background:
                        #43df91;

                }


                #section-ranking
                .ccfv-ranking-panel {

                    overflow:
                        hidden;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .06
                        );

                    border-radius:
                        14px;

                    background:
                        rgba(
                            255,
                            255,
                            255,
                            .01
                        );

                }


                #section-ranking
                .ccfv-ranking-panel__head,
                #section-ranking
                .ccfv-ranking-row {

                    display:
                        grid;

                    grid-template-columns:

                        56px
                        minmax(
                            230px,
                            1fr
                        )
                        90px
                        55px
                        55px
                        55px
                        55px
                        65px
                        125px;

                    align-items:
                        center;

                    gap:
                        4px;

                    min-height:
                        58px;

                    padding:
                        0 16px;

                }


                #section-ranking
                .ccfv-ranking-panel__head {

                    min-height:
                        44px;

                    border-bottom:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .05
                        );

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .16
                        );

                    font-size:
                        5px;

                    font-weight:
                        950;

                    letter-spacing:
                        .08em;

                }


                #section-ranking
                .ccfv-ranking-row {

                    border-bottom:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .035
                        );

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .34
                        );

                    font-size:
                        7px;

                }


                #section-ranking
                .ccfv-ranking-row:last-child {

                    border-bottom:
                        0;

                }


                #section-ranking
                .ccfv-ranking-row:hover {

                    background:
                        rgba(
                            67,
                            223,
                            145,
                            .02
                        );

                }


                #section-ranking
                .ccfv-ranking-row.is-first {

                    background:
                        linear-gradient(
                            90deg,
                            rgba(
                                67,
                                223,
                                145,
                                .06
                            ),
                            transparent
                        );

                }


                #section-ranking
                .ccfv-ranking-pos {

                    color:
                        rgba(
                            67,
                            223,
                            145,
                            .65
                        );

                    font-size:
                        9px;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-row.is-first
                .ccfv-ranking-pos {

                    color:
                        #43df91;

                }


                #section-ranking
                .ccfv-ranking-player {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        10px;

                    min-width:
                        0;

                }


                #section-ranking
                .ccfv-ranking-photo {

                    width:
                        38px;

                    height:
                        38px;

                    flex:
                        0 0 38px;

                    overflow:
                        hidden;

                    display:
                        grid;

                    place-items:
                        center;

                    border:
                        1px solid
                        rgba(
                            67,
                            223,
                            145,
                            .12
                        );

                    border-radius:
                        9px;

                    color:
                        rgba(
                            67,
                            223,
                            145,
                            .6
                        );

                    background:
                        rgba(
                            67,
                            223,
                            145,
                            .025
                        );

                    font-size:
                        6px;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-photo img {

                    width:
                        100%;

                    height:
                        100%;

                    object-fit:
                        cover;

                }


                #section-ranking
                .ccfv-ranking-player__info {

                    display:
                        flex;

                    flex-direction:
                        column;

                    gap:
                        3px;

                    min-width:
                        0;

                }


                #section-ranking
                .ccfv-ranking-player__info strong {

                    overflow:
                        hidden;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .8
                        );

                    font-size:
                        7px;

                    font-weight:
                        950;

                    white-space:
                        nowrap;

                    text-overflow:
                        ellipsis;

                }


                #section-ranking
                .ccfv-ranking-player__info small {

                    overflow:
                        hidden;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .15
                        );

                    font-size:
                        5px;

                    white-space:
                        nowrap;

                    text-overflow:
                        ellipsis;

                }


                #section-ranking
                .ccfv-ranking-elo {

                    color:
                        #43df91;

                    font-size:
                        10px;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-win {

                    color:
                        rgba(
                            67,
                            223,
                            145,
                            .72
                        );

                    font-weight:
                        900;

                }


                #section-ranking
                .ccfv-ranking-loss {

                    color:
                        rgba(
                            255,
                            110,
                            110,
                            .6
                        );

                    font-weight:
                        900;

                }


                #section-ranking
                .ccfv-ranking-title {

                    color:
                        #ffc252;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-rank {

                    display:
                        inline-flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    min-height:
                        22px;

                    padding:
                        0 8px;

                    border:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .08
                        );

                    border-radius:
                        999px;

                    font-size:
                        5px;

                    font-weight:
                        950;

                    white-space:
                        nowrap;

                }


                #section-ranking
                .ccfv-rank--beginner {

                    color:
                        #8d9a95;

                    border-color:
                        rgba(
                            141,
                            154,
                            149,
                            .18
                        );

                }


                #section-ranking
                .ccfv-rank--amateur {

                    color:
                        #69a8ff;

                    border-color:
                        rgba(
                            105,
                            168,
                            255,
                            .2
                        );

                }


                #section-ranking
                .ccfv-rank--professional {

                    color:
                        #43df91;

                    border-color:
                        rgba(
                            67,
                            223,
                            145,
                            .22
                        );

                }


                #section-ranking
                .ccfv-rank--legend {

                    color:
                        #ffc252;

                    border-color:
                        rgba(
                            255,
                            194,
                            82,
                            .25
                        );

                }


                #section-ranking
                .ccfv-ranking-empty {

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    flex-direction:
                        column;

                    gap:
                        8px;

                    min-height:
                        240px;

                    padding:
                        30px;

                    text-align:
                        center;

                }


                #section-ranking
                .ccfv-ranking-empty strong {

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .58
                        );

                    font-size:
                        8px;

                    font-weight:
                        950;

                }


                #section-ranking
                .ccfv-ranking-empty span {

                    max-width:
                        420px;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .16
                        );

                    font-size:
                        6px;

                    line-height:
                        1.5;

                }


                #section-ranking
                .ccfv-ranking-points {

                    margin-top:
                        2px;

                    color:
                        rgba(
                            255,
                            255,
                            255,
                            .12
                        );

                    font-size:
                        5px;

                }


                @media (
                    max-width: 900px
                ) {

                    #section-ranking
                    .ccfv-ranking-stats {

                        grid-template-columns:
                            repeat(
                                2,
                                minmax(
                                    0,
                                    1fr
                                )
                            );

                    }


                    #section-ranking
                    .ccfv-ranking-panel {

                        overflow-x:
                            auto;

                    }


                    #section-ranking
                    .ccfv-ranking-panel__head,
                    #section-ranking
                    .ccfv-ranking-row {

                        width:
                            850px;

                    }

                }


                @media (
                    max-width: 600px
                ) {

                    #section-ranking
                    .ccfv-ranking-stats {

                        grid-template-columns:
                            1fr;

                    }

                }

            </style>


            <div
                class="
                    ccfv-ranking-screen
                "
            >


                <div
                    class="
                        ccfv-ranking-hero
                    "
                >

                    <div
                        class="
                            ccfv-ranking-hero__text
                        "
                    >

                        <span
                            class="
                                ccfv-ranking-hero__eyebrow
                            "
                        >
                            CCFV // OFFICIAL RANKING
                        </span>


                        <h1>

                            RANKING

                            <strong>
                                OFICIAL.
                            </strong>

                        </h1>


                        <p>
                            A classificação é atualizada
                            automaticamente a cada resultado
                            registrado na CCFV.
                        </p>

                    </div>


                    <div
                        class="
                            ccfv-ranking-hero__actions
                        "
                    >

                        <button
                            type="button"
                            class="
                                ccfv-ranking-button
                                ccfv-ranking-button--primary
                            "
                            data-ranking-refresh
                        >
                            ATUALIZAR RANKING
                        </button>

                    </div>

                </div>



                <div
                    class="
                        ccfv-ranking-stats
                    "
                >

                    <div
                        class="
                            ccfv-ranking-stat
                        "
                    >

                        <span>
                            JOGADORES
                        </span>

                        <strong
                            data-ranking-total
                        >
                            0
                        </strong>

                        <small>
                            jogadores ativos
                        </small>

                    </div>


                    <div
                        class="
                            ccfv-ranking-stat
                        "
                    >

                        <span>
                            LÍDER
                        </span>

                        <strong
                            data-ranking-leader
                        >
                            —
                        </strong>

                        <small>
                            primeiro colocado
                        </small>

                    </div>


                    <div
                        class="
                            ccfv-ranking-stat
                        "
                    >

                        <span>
                            MAIOR ELO
                        </span>

                        <strong
                            data-ranking-top-elo
                        >
                            0
                        </strong>

                        <small>
                            pontuação atual
                        </small>

                    </div>


                    <div
                        class="
                            ccfv-ranking-stat
                        "
                    >

                        <span>
                            TÍTULOS
                        </span>

                        <strong
                            data-ranking-titles
                        >
                            0
                        </strong>

                        <small>
                            títulos conquistados
                        </small>

                    </div>

                </div>



                <div
                    class="
                        ccfv-ranking-controls
                    "
                >

                    <label
                        class="
                            ccfv-ranking-search
                        "
                    >

                        <span>
                            BUSCAR JOGADOR
                        </span>

                        <input
                            type="search"
                            placeholder="Nome ou Instagram..."
                            data-ranking-search
                            autocomplete="off"
                        >

                    </label>


                    <div
                        class="
                            ccfv-ranking-filters
                        "
                    >

                        <button
                            type="button"
                            class="
                                ccfv-ranking-filter
                                is-active
                            "
                            data-rank-filter="ALL"
                        >
                            TODOS
                        </button>


                        <button
                            type="button"
                            class="
                                ccfv-ranking-filter
                            "
                            data-rank-filter="INICIANTE"
                        >
                            INICIANTE
                        </button>


                        <button
                            type="button"
                            class="
                                ccfv-ranking-filter
                            "
                            data-rank-filter="AMADOR"
                        >
                            AMADOR
                        </button>


                        <button
                            type="button"
                            class="
                                ccfv-ranking-filter
                            "
                            data-rank-filter="PROFISSIONAL"
                        >
                            PROFISSIONAL
                        </button>


                        <button
                            type="button"
                            class="
                                ccfv-ranking-filter
                            "
                            data-rank-filter="LENDA"
                        >
                            LENDA
                        </button>

                    </div>

                </div>



                <div
                    class="
                        ccfv-ranking-panel
                    "
                >

                    <div
                        class="
                            ccfv-ranking-panel__head
                        "
                    >

                        <span>
                            POS
                        </span>

                        <span>
                            JOGADOR
                        </span>

                        <span>
                            ELO
                        </span>

                        <span>
                            J
                        </span>

                        <span>
                            V
                        </span>

                        <span>
                            E
                        </span>

                        <span>
                            D
                        </span>

                        <span>
                            TÍT.
                        </span>

                        <span>
                            NÍVEL
                        </span>

                    </div>


                    <div
                        data-ranking-list
                    ></div>


                    <div
                        class="
                            ccfv-ranking-empty
                        "
                        data-ranking-empty
                        hidden
                    >

                        <strong>
                            NENHUM JOGADOR NO RANKING.
                        </strong>

                        <span>
                            Assim que os primeiros
                            jogadores estiverem ativos,
                            eles aparecerão aqui
                            automaticamente.
                        </span>

                    </div>

                </div>

            </div>

        `;

    }


    /* =====================================================
       CARREGAR RANKING
       ===================================================== */

    async function loadRanking() {

        const client =
            await getSupabase();


        const {
            data,
            error
        } =
            await client

            .from(
                "ccfv_ranking"
            )

            .select(
                "*"
            )

            .order(
                "ranking_position",
                {
                    ascending: true
                }
            );


        if (
            error
        ) {

            throw error;

        }


        ranking =
            Array.isArray(
                data
            )
                ? data
                : [];


        updateStats();

        renderRanking();

    }


    /* =====================================================
       ESTATÍSTICAS
       ===================================================== */

    function updateStats() {

        const total =
            ranking.length;


        const leader =
            ranking[0] || null;


        const topElo =
            leader
                ? Number(
                    leader.elo || 0
                )
                : 0;


        const totalTitles =
            ranking.reduce(
                (
                    total,
                    player
                ) =>
                    total +
                    Number(
                        player.titles || 0
                    ),
                0
            );


        const totalElement =
            section.querySelector(
                "[data-ranking-total]"
            );


        const leaderElement =
            section.querySelector(
                "[data-ranking-leader]"
            );


        const topEloElement =
            section.querySelector(
                "[data-ranking-top-elo]"
            );


        const titlesElement =
            section.querySelector(
                "[data-ranking-titles]"
            );


        if (
            totalElement
        ) {

            totalElement.textContent =
                total;

        }


        if (
            leaderElement
        ) {

            leaderElement.textContent =
                leader
                    ? leader.name
                    : "—";

        }


        if (
            topEloElement
        ) {

            topEloElement.textContent =
                topElo;

        }


        if (
            titlesElement
        ) {

            titlesElement.textContent =
                totalTitles;

        }

    }


    /* =====================================================
       FILTRAR
       ===================================================== */

    function getFilteredRanking() {

        return ranking.filter(
            player => {

                const playerName =
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


                const matchesSearch =

                    !searchTerm

                    ||

                    playerName.includes(
                        searchTerm
                    )

                    ||

                    instagram.includes(
                        searchTerm
                    );


                const rankLabel =
                    String(
                        player.rank_label ||
                        "INICIANTE"
                    )
                    .toUpperCase();


                const matchesRank =

                    rankFilter ===
                    "ALL"

                    ||

                    rankLabel ===
                    rankFilter;


                return (
                    matchesSearch &&
                    matchesRank
                );

            }
        );

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderRanking() {

        const list =
            section.querySelector(
                "[data-ranking-list]"
            );


        const empty =
            section.querySelector(
                "[data-ranking-empty]"
            );


        if (
            !list
        ) {

            return;

        }


        const filtered =
            getFilteredRanking();


        list.innerHTML =
            "";


        if (
            empty
        ) {

            empty.hidden =
                filtered.length >
                0;

        }


        filtered.forEach(
            player => {

                list.appendChild(
                    createPlayerRow(
                        player
                    )
                );

            }
        );

    }


    /* =====================================================
       LINHA
       ===================================================== */

    function createPlayerRow(
        player
    ) {

        const row =
            document.createElement(
                "div"
            );


        const position =
            Number(
                player.ranking_position ||
                0
            );


        const elo =
            Math.max(
                0,
                Number(
                    player.elo ||
                    0
                )
            );


        const games =
            Number(
                player.matches ||
                0
            );


        const wins =
            Number(
                player.wins ||
                0
            );


        const draws =
            Number(
                player.draws ||
                0
            );


        const losses =
            Number(
                player.losses ||
                0
            );


        const titles =
            Number(
                player.titles ||
                0
            );


        const rank =
            normalizeRank(
                player.rank_label
            );


        const first =
            player.name
                ? String(
                    player.name
                )
                .trim()
                .slice(
                    0,
                    2
                )
                .toUpperCase()
                : "??";


        const photo =
            player.photo_url
                ? `

                    <img
                        src="${escapeHTML(
                            player.photo_url
                        )}"
                        alt=""
                        loading="lazy"
                    >

                `
                : `

                    <span>
                        ${escapeHTML(
                            first
                        )}
                    </span>

                `;


        row.className =
            "ccfv-ranking-row";


        if (
            position === 1
        ) {

            row.classList.add(
                "is-first"
            );

        }


        row.innerHTML = `

            <div
                class="
                    ccfv-ranking-pos
                "
            >

                ${String(
                    position
                ).padStart(
                    2,
                    "0"
                )}

            </div>


            <div
                class="
                    ccfv-ranking-player
                "
            >

                <div
                    class="
                        ccfv-ranking-photo
                    "
                >

                    ${photo}

                </div>


                <div
                    class="
                        ccfv-ranking-player__info
                    "
                >

                    <strong>
                        ${escapeHTML(
                            player.name
                        )}
                    </strong>


                    <small>
                        ${
                            player.instagram
                                ? `@${escapeHTML(
                                    String(
                                        player.instagram
                                    )
                                    .replace(
                                        /^@/,
                                        ""
                                    )
                                )}`
                                : "SEM INSTAGRAM"
                        }
                    </small>

                </div>

            </div>


            <div
                class="
                    ccfv-ranking-elo
                "
            >
                ${elo}
            </div>


            <div>
                ${games}
            </div>


            <div
                class="
                    ccfv-ranking-win
                "
            >
                ${wins}
            </div>


            <div>
                ${draws}
            </div>


            <div
                class="
                    ccfv-ranking-loss
                "
            >
                ${losses}
            </div>


            <div
                class="
                    ccfv-ranking-title
                "
            >
                ${titles}
            </div>


            <div>

                <span
                    class="
                        ccfv-rank
                        ${rank.className}
                    "
                >
                    ${rank.label}
                </span>


                <div
                    class="
                        ccfv-ranking-points
                    "
                >
                    ${elo} PTS
                </div>

            </div>

        `;


        return row;

    }


    /* =====================================================
       BUSCA
       ===================================================== */

    function handleSearch(
        event
    ) {

        searchTerm =
            String(
                event.target.value ||
                ""
            )
            .trim()
            .toLowerCase();


        renderRanking();

    }


    /* =====================================================
       FILTRO
       ===================================================== */

    function handleRankFilter(
        event
    ) {

        const button =
            event.currentTarget;


        rankFilter =
            String(
                button.dataset.rankFilter ||
                "ALL"
            )
            .toUpperCase();


        section
            .querySelectorAll(
                "[data-rank-filter]"
            )
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


        renderRanking();

    }


    /* =====================================================
       ATUALIZAR
       ===================================================== */

    async function refresh() {

        const button =
            section.querySelector(
                "[data-ranking-refresh]"
            );


        try {

            if (
                button
            ) {

                button.disabled =
                    true;

                button.textContent =
                    "ATUALIZANDO...";

            }


            await loadRanking();

            showToast(
                "RANKING ATUALIZADO."
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // RANKING ERROR:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO ATUALIZAR RANKING."
            );

        }

        finally {

            if (
                button
            ) {

                button.disabled =
                    false;

                button.textContent =
                    "ATUALIZAR RANKING";

            }

        }

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message
    ) {

        let toast =
            document.querySelector(
                "#ccfv-ranking-toast"
            );


        if (
            !toast
        ) {

            toast =
                document.createElement(
                    "div"
                );


            toast.id =
                "ccfv-ranking-toast";


            toast.style.position =
                "fixed";


            toast.style.right =
                "22px";


            toast.style.bottom =
                "22px";


            toast.style.zIndex =
                "99999";


            toast.style.maxWidth =
                "380px";


            toast.style.padding =
                "13px 16px";


            toast.style.border =
                "1px solid rgba(67,223,145,.24)";


            toast.style.borderRadius =
                "10px";


            toast.style.color =
                "#43df91";


            toast.style.background =
                "rgba(3,10,7,.96)";


            toast.style.boxShadow =
                "0 20px 50px rgba(0,0,0,.45)";


            toast.style.fontSize =
                "7px";


            toast.style.fontWeight =
                "950";


            toast.style.opacity =
                "0";


            toast.style.pointerEvents =
                "none";


            toast.style.transition =
                ".25s ease";


            document.body.appendChild(
                toast
            );

        }


        toast.textContent =
            message;


        toast.style.opacity =
            "1";


        clearTimeout(
            toast._timer
        );


        toast._timer =
            setTimeout(
                () => {

                    toast.style.opacity =
                        "0";

                },
                3500
            );

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {

        const search =
            section.querySelector(
                "[data-ranking-search]"
            );


        search?.addEventListener(
            "input",
            handleSearch
        );


        const refreshButton =
            section.querySelector(
                "[data-ranking-refresh]"
            );


        refreshButton?.addEventListener(
            "click",
            refresh
        );


        section
            .querySelectorAll(
                "[data-rank-filter]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        handleRankFilter
                    );

                }
            );

    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        if (
            !section
        ) {

            return;

        }


        buildInterface();

        bindEvents();


        try {

            await loadRanking();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // RANKING INIT:",
                error
            );


            showToast(
                error?.message ||
                "ERRO AO CARREGAR RANKING."
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