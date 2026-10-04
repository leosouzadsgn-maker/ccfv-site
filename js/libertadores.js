/* =========================================================
   CCFV // LIBERTADORES — PÁGINA PÚBLICA
   MODELO VISUAL: CHAMPIONS LEAGUE
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const GROUPS = [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H"
    ];


    const DONE = new Set([
        "VALIDATED",
        "WO",
        "ADMIN_DECISION"
    ]);


    /* =====================================================
       32 CLUBES OFICIAIS
       FALLBACK VISUAL
       ===================================================== */

    const FALLBACK_CLUBS = [

        ["Flamengo", "flamengo", "Brasil", 1],

        ["Palmeiras", "palmeiras", "Brasil", 1],

        ["Boca Juniors", "boca-juniors", "Argentina", 1],

        ["Peñarol", "penarol", "Uruguai", 1],

        ["Nacional", "nacional", "Uruguai", 1],

        ["LDU Quito", "ldu-quito", "Equador", 1],

        ["Fluminense", "fluminense", "Brasil", 1],

        [
            "Independiente del Valle",
            "independiente-del-valle",
            "Equador",
            1
        ],


        ["Lanús", "lanus", "Argentina", 2],

        ["Libertad", "libertad", "Paraguai", 2],

        [
            "Estudiantes de La Plata",
            "estudiantes",
            "Argentina",
            2
        ],

        [
            "Cerro Porteño",
            "cerro-porteno",
            "Paraguai",
            2
        ],

        ["Corinthians", "corinthians", "Brasil", 2],

        ["Bolívar", "bolivar", "Bolívia", 2],

        ["Cruzeiro", "cruzeiro", "Brasil", 2],

        [
            "Universitario",
            "universitario",
            "Peru",
            2
        ],


        ["Junior", "junior", "Colômbia", 3],

        [
            "Universidad Católica",
            "universidad-catolica",
            "Chile",
            3
        ],

        [
            "Rosario Central",
            "rosario-central",
            "Argentina",
            3
        ],

        ["Santa Fe", "santa-fe", "Colômbia", 3],

        [
            "Always Ready",
            "always-ready",
            "Bolívia",
            3
        ],

        [
            "Coquimbo Unido",
            "coquimbo-unido",
            "Chile",
            3
        ],

        [
            "Deportivo La Guaira",
            "deportivo-la-guaira",
            "Venezuela",
            3
        ],

        ["Cusco", "cusco", "Peru", 3],


        [
            "Universidad Central",
            "universidad-central",
            "Venezuela",
            4
        ],

        ["Platense", "platense", "Argentina", 4],

        [
            "Independiente Rivadavia",
            "independiente-rivadavia",
            "Argentina",
            4
        ],

        ["Mirassol", "mirassol", "Brasil", 4],

        [
            "Independiente Medellín",
            "independiente-medellin",
            "Colômbia",
            4
        ],

        [
            "Deportes Tolima",
            "deportes-tolima",
            "Colômbia",
            4
        ],

        [
            "Sporting Cristal",
            "sporting-cristal",
            "Peru",
            4
        ],

        [
            "Barcelona",
            "barcelona",
            "Equador",
            4
        ]

    ];


    /* =====================================================
       ESTADO
       ===================================================== */

    const state = {

        client: null,

        season: null,

        clubs: [],

        matches: [],

        standings: []

    };


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = selector =>
        document.querySelector(selector);


    function esc(value) {

        return String(value ?? "")

            .replaceAll("&", "&amp;")

            .replaceAll("<", "&lt;")

            .replaceAll(">", "&gt;")

            .replaceAll('"', "&quot;")

            .replaceAll("'", "&#039;");

    }


    function initials(name) {

        return String(name || "CC")

            .normalize("NFD")

            .replace(
                /[\u0300-\u036f]/g,
                ""
            )

            .split(/\s+/)

            .filter(Boolean)

            .slice(0, 2)

            .map(word => word[0])

            .join("")

            .toUpperCase() || "CC";

    }


    /* =====================================================
       LOGOS
       ===================================================== */

    function logoPath(club = {}) {

        const stored =
            String(
                club.logo_path || ""
            ).trim();


        if (stored) {

            if (
                stored.startsWith("http://") ||
                stored.startsWith("https://") ||
                stored.startsWith("/")
            ) {

                return stored;

            }

            return `/${stored.replace(/^\/+/, "")}`;

        }


        const slug =
            String(
                club.slug || ""
            ).trim()
            .toLowerCase();


        if (!slug) {

            return "";

        }


        return (
            `/assets/images/champions/clubs/${slug}.png`
        );

    }


    function logoMarkup(
        club = {},
        className = "ccfv-champions-club-logo"
    ) {

        const src =
            logoPath(club);


        if (!src) {

            return `

                <span
                    class="ccfv-champions-placeholder-logo"
                >
                    ${esc(
                        initials(
                            club.name
                        )
                    )}
                </span>

            `;

        }


        return `

            <img

                class="${esc(className)}"

                src="${esc(src)}"

                alt="${esc(
                    club.name ||
                    "Clube"
                )}"

                loading="lazy"

                onerror="
                    this.replaceWith(
                        Object.assign(
                            document.createElement('span'),
                            {
                                className:
                                    'ccfv-champions-placeholder-logo',
                                textContent:
                                    '${esc(
                                        initials(
                                            club.name
                                        )
                                    )}'
                            }
                        )
                    )
                "

            >

        `;

    }


    /* =====================================================
       FASES
       ===================================================== */

    function phaseLabel(value) {

        const labels = {

            REGISTRATION:
                "INSCRIÇÕES",

            REGISTRATIONS:
                "INSCRIÇÕES",

            DRAFT:
                "DRAFT",

            DRAW:
                "SORTEIO",

            GROUP_STAGE:
                "FASE DE GRUPOS",

            ROUND_OF_16:
                "OITAVAS",

            QUARTERFINALS:
                "QUARTAS",

            SEMIFINALS:
                "SEMIFINAIS",

            FINAL:
                "FINAL",

            CLOSED:
                "ENCERRADA",

            ARCHIVED:
                "ARQUIVADA"

        };


        return (
            labels[
                String(
                    value || ""
                ).toUpperCase()
            ] ||
            String(
                value ||
                "A DEFINIR"
            )
        );

    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    async function getClient() {

        if (
            state.client
        ) {

            return state.client;

        }


        if (
            window.CCFVAuth?.getClient
        ) {

            state.client =
                await window.CCFVAuth.getClient();

            return state.client;

        }


        const started =
            Date.now();


        while (
            !window.CCFVAuth?.getClient
        ) {

            if (
                Date.now() -
                started >
                10000
            ) {

                throw new Error(
                    "Supabase não está disponível."
                );

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

        }


        state.client =
            await window.CCFVAuth.getClient();


        return state.client;

    }


    /* =====================================================
       FALLBACK
       ===================================================== */

    function fallbackClubs() {

        return FALLBACK_CLUBS.map(
            (club, index) => ({

                slot:
                    index + 1,

                name:
                    club[0],

                slug:
                    club[1],

                country:
                    club[2],

                pot:
                    club[3],

                logo_path:
                    null,

                participant_id:
                    null,

                participant_name:
                    null,

                participant_photo_url:
                    null,

                group_code:
                    null,

                group_position:
                    null,

                status:
                    "AVAILABLE",

                season_id:
                    state.season?.id ||
                    null

            })
        );

    }


    function visibleClubs() {

        const databaseClubs =
            Array.isArray(
                state.clubs
            )
                ? state.clubs
                : [];


        /*
         * Sem dados ainda:
         * mostra os 32 imediatamente.
         */

        if (
            !databaseClubs.length
        ) {

            return fallbackClubs();

        }


        /*
         * Une os dados do banco com
         * o catálogo oficial.
         */

        const bySlug =
            new Map();


        databaseClubs.forEach(
            club => {

                bySlug.set(
                    String(
                        club.slug ||
                        ""
                    ).toLowerCase(),
                    club
                );

            }
        );


        return fallbackClubs().map(
            fallback => {

                const real =
                    bySlug.get(
                        fallback.slug.toLowerCase()
                    );


                return real

                    ? {
                        ...fallback,
                        ...real
                    }

                    : fallback;

            }
        );

    }


    /* =====================================================
       LOAD
       ===================================================== */

    async function load() {

        const client =
            await getClient();


        /*
         * TEMPORADA
         */

        const seasonResult =
            await client

                .from(
                    "ccfv_libertadores_public_seasons"
                )

                .select("*")

                .order(
                    "season_number",
                    {
                        ascending: false
                    }
                )

                .limit(1)

                .maybeSingle();


        if (
            seasonResult.error
        ) {

            console.warn(
                "CCFV // LIBERTADORES SEASON:",
                seasonResult.error
            );

            state.season =
                null;

        } else {

            state.season =
                seasonResult.data ||
                null;

        }


        /*
         * Sem temporada ainda:
         * mantém a estrutura visual.
         */

        if (
            !state.season
        ) {

            state.clubs = [];

            state.matches = [];

            state.standings = [];

            render();

            return;

        }


        /*
         * DADOS DA TEMPORADA
         */

        const [
            clubsResult,
            matchesResult,
            standingsResult
        ] = await Promise.all([


            client

                .from(
                    "ccfv_libertadores_public_clubs"
                )

                .select("*")

                .eq(
                    "season_id",
                    state.season.id
                )

                .order(
                    "slot"
                ),


            client

                .from(
                    "ccfv_libertadores_public_matches"
                )

                .select("*")

                .eq(
                    "season_id",
                    state.season.id
                )

                .order(
                    "match_order"
                ),


            client

                .from(
                    "ccfv_libertadores_public_standings"
                )

                .select("*")

                .eq(
                    "season_id",
                    state.season.id
                )

                .order(
                    "group_code"
                )

                .order(
                    "position"
                )

        ]);


        state.clubs =

            clubsResult.error

                ? []

                : (
                    clubsResult.data ||
                    []
                );


        state.matches =

            matchesResult.error

                ? []

                : (
                    matchesResult.data ||
                    []
                );


        state.standings =

            standingsResult.error

                ? []

                : (
                    standingsResult.data ||
                    []
                );


        render();

    }


    /* =====================================================
       RENDER GERAL
       ===================================================== */

    function render() {

        renderSeason();

        renderStats();

        renderClubs();

        renderGroups();

        renderMatches();

        renderKnockout();

        renderChampion();

    }


    /* =====================================================
       SEASON
       ===================================================== */

    function renderSeason() {

        const season =
            state.season;


        const label =
            season?.season_label ||
            "SEASON 01";


        const status =
            phaseLabel(
                season?.status ||
                season?.phase ||
                "REGISTRATIONS"
            );


        const clubs =
            visibleClubs();


        const occupied =
            clubs.filter(
                club =>
                    club.participant_id
            ).length;


        const participants =
            new Set(

                clubs

                    .map(
                        club =>
                            club.participant_id
                    )

                    .filter(Boolean)

            ).size;


        const seasonLabel =
            document.querySelector(
                "#libertadores-season-label"
            );


        const seasonStatus =
            document.querySelector(
                "#libertadores-season-status"
            );


        const participantsEl =
            document.querySelector(
                "#libertadores-participants"
            );


        const occupiedEl =
            document.querySelector(
                "#libertadores-clubs-occupied"
            );


        const phaseEl =
            document.querySelector(
                "#libertadores-phase"
            );


        if (
            seasonLabel
        ) {

            seasonLabel.textContent =
                label;

        }


        if (
            seasonStatus
        ) {

            seasonStatus.textContent =
                status;

        }


        if (
            participantsEl
        ) {

            participantsEl.textContent =
                `${participants} / 32`;

        }


        if (
            occupiedEl
        ) {

            occupiedEl.textContent =
                `${occupied} / 32`;

        }


        if (
            phaseEl
        ) {

            phaseEl.textContent =
                phaseLabel(
                    season?.phase ||
                    season?.status ||
                    "REGISTRATIONS"
                );

        }

    }


    /* =====================================================
       STATS
       ===================================================== */

    function renderStats() {

        const el =
            document.querySelector(
                "#lib-stats"
            );


        if (!el) {

            return;

        }


        const finished =
            state.matches.filter(
                match =>
                    DONE.has(
                        String(
                            match.status ||
                            ""
                        ).toUpperCase()
                    )
            ).length;


        el.innerHTML = [

            [
                "SEASON",
                state.season?.season_label ||
                    "SEASON 01"
            ],

            [
                "CLUBES",
                "32"
            ],

            [
                "GRUPOS",
                "8"
            ],

            [
                "PARTIDAS",
                `${finished}/125`
            ]

        ]

            .map(
                ([label, value]) => `

                    <div class="ccfv-lib-stat">

                        <strong>
                            ${esc(value)}
                        </strong>

                        <span>
                            ${esc(label)}
                        </span>

                    </div>

                `
            )

            .join("");

    }


    /* =====================================================
       CLUBES
       ===================================================== */

    function renderClubs() {

        const el =
            document.querySelector(
                "#public-clubs"
            );


        if (!el) {

            return;

        }


        const clubs =
            visibleClubs();


        el.innerHTML =

            clubs.map(
                club => `

                    <article
                        class="
                            ccfv-champions-club
                            ccfv-lib-club
                        "
                    >


                        ${logoMarkup(
                            club,
                            "ccfv-champions-club__logo"
                        )}


                        <div
                            class="
                                ccfv-champions-club__name
                            "
                        >

                            <strong>
                                ${esc(
                                    club.name
                                )}
                            </strong>

                            <span>
                                ${esc(
                                    club.country ||
                                    "AMÉRICA DO SUL"
                                )}

                                · POTE

                                ${esc(
                                    club.pot ||
                                    "—"
                                )}
                            </span>

                        </div>


                        <span
                            class="
                                ccfv-champions-club__status
                            "
                        >

                            ${
                                club.participant_id

                                    ? esc(
                                        club.participant_name ||
                                        "OCUPADO"
                                    )

                                    : "DISPONÍVEL"
                            }

                        </span>


                        <div
                            class="
                                ccfv-lib-club__player
                            "
                        >


                            ${
                                club.participant_photo_url

                                    ? `

                                        <img

                                            src="${esc(
                                                club.participant_photo_url
                                            )}"

                                            alt="${esc(
                                                club.participant_name ||
                                                "Jogador"
                                            )}"

                                            loading="lazy"

                                        >

                                      `

                                    : ""

                            }


                            <span>

                                ${
                                    club.participant_id

                                        ? `JOGADOR:
                                           ${esc(
                                               club.participant_name ||
                                               "OCUPADO"
                                           )}`

                                        : "AGUARDANDO INSCRIÇÃO"

                                }

                            </span>


                        </div>


                    </article>

                `
            )

            .join("");

    }


    /* =====================================================
       GRUPOS
       ===================================================== */

    function groupRows(code) {

        const standings =
            state.standings

                .filter(
                    row =>
                        String(
                            row.group_code ||
                            ""
                        ) === code
                )

                .sort(
                    (a, b) =>
                        Number(
                            a.position ||
                            99
                        ) -
                        Number(
                            b.position ||
                            99
                        )
                );


        /*
         * Se já existem standings:
         * usa os dados reais.
         */

        if (
            standings.length
        ) {

            return standings.slice(
                0,
                4
            );

        }


        /*
         * Caso contrário,
         * mostra equipes já sorteadas.
         */

        return visibleClubs()

            .filter(
                club =>
                    String(
                        club.group_code ||
                        ""
                    ) === code
            )

            .sort(
                (a, b) =>
                    Number(
                        a.group_position ||
                        99
                    ) -
                    Number(
                        b.group_position ||
                        99
                    )
            )

            .slice(
                0,
                4
            )

            .map(
                (club, index) => ({

                    ...club,

                    position:
                        club.group_position ||
                        index + 1,

                    played: 0,

                    wins: 0,

                    draws: 0,

                    losses: 0,

                    goals_for: 0,

                    goals_against: 0,

                    goal_difference: 0,

                    points: 0,

                    qualified: false

                })
            );

    }


    function groupRow(
        row,
        index
    ) {

        /*
         * VAGA VAZIA
         */

        if (!row) {

            return `

                <div
                    class="
                        ccfv-champions-group__row
                        ccfv-champions-group__row--empty
                    "
                >

                    <span class="group-position">
                        ${index + 1}
                    </span>


                    <div
                        class="
                            ccfv-champions-group__club
                        "
                    >

                        <span
                            class="
                                ccfv-champions-placeholder-logo
                            "
                        >
                        </span>


                        <div>

                            <strong>
                                A DEFINIR
                            </strong>

                            <small>
                                Aguardando sorteio
                            </small>

                        </div>

                    </div>


                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>


                    <strong>
                        —
                    </strong>

                </div>

            `;

        }


        const gd =
            Number(

                row.goal_difference ??

                (
                    (
                        row.goals_for ||
                        0
                    )
                    -
                    (
                        row.goals_against ||
                        0
                    )
                )

            );


        return `

            <div
                class="
                    ccfv-champions-group__row
                    ${
                        row.qualified
                            ? "is-qualified"
                            : ""
                    }
                "
            >


                <span class="group-position">

                    ${esc(
                        row.position ??
                        index + 1
                    )}

                </span>


                <div
                    class="
                        ccfv-champions-group__club
                    "
                >

                    ${logoMarkup(
                        row,
                        "ccfv-champions-group__logo"
                    )}


                    <div>

                        <strong>
                            ${esc(
                                row.name ||
                                "A DEFINIR"
                            )}
                        </strong>


                        <small>

                            ${
                                row.participant_photo_url

                                    ? `

                                        <img

                                            class="
                                                ccfv-lib-group-player-photo
                                            "

                                            src="${esc(
                                                row.participant_photo_url
                                            )}"

                                            alt="${esc(
                                                row.participant_name ||
                                                "Jogador"
                                            )}"

                                            loading="lazy"

                                        >

                                    `

                                    : ""

                            }


                            ${esc(
                                row.participant_name ||
                                "Treinador a definir"
                            )}

                        </small>

                    </div>

                </div>


                <span>
                    ${esc(
                        row.played ??
                        0
                    )}
                </span>


                <span>
                    ${esc(
                        row.wins ??
                        0
                    )}
                </span>


                <span>
                    ${esc(
                        row.draws ??
                        0
                    )}
                </span>


                <span>
                    ${esc(
                        row.losses ??
                        0
                    )}
                </span>


                <span>
                    ${esc(
                        row.goals_for ??
                        0
                    )}
                </span>


                <span>
                    ${esc(
                        row.goals_against ??
                        0
                    )}
                </span>


                <span>
                    ${
                        gd > 0
                            ? "+"
                            : ""
                    }

                    ${esc(gd)}

                </span>


                <strong class="points">

                    ${esc(
                        row.points ??
                        0
                    )}

                </strong>


            </div>

        `;

    }


    function renderGroups() {

        const el =
            document.querySelector(
                "#public-groups"
            );


        if (!el) {

            return;

        }


        el.innerHTML =

            GROUPS.map(
                group => {

                    const rows =
                        groupRows(
                            group
                        );


                    const slots =
                        Array.from(
                            {
                                length: 4
                            },
                            (_, index) =>
                                rows[index] ||
                                null
                        );


                    return `

                        <article
                            class="
                                ccfv-champions-group
                            "
                        >


                            <header
                                class="
                                    ccfv-champions-group__header
                                "
                            >

                                <div
                                    class="
                                        ccfv-champions-group__title
                                    "
                                >

                                    <span>
                                        GRUPO
                                    </span>

                                    <strong>
                                        ${group}
                                    </strong>

                                </div>


                                <div
                                    class="
                                        ccfv-champions-group__advance
                                    "
                                >

                                    <span>
                                        CLASSIFICAÇÃO
                                    </span>

                                    <strong>
                                        TOP 2
                                    </strong>

                                </div>

                            </header>


                            <div
                                class="
                                    ccfv-champions-group__table-wrap
                                "
                            >


                                <div
                                    class="
                                        ccfv-champions-group__thead
                                    "
                                >

                                    <span>
                                        #
                                    </span>

                                    <span>
                                        CLUBE
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
                                        GP
                                    </span>

                                    <span>
                                        GC
                                    </span>

                                    <span>
                                        SG
                                    </span>

                                    <span>
                                        PTS
                                    </span>

                                </div>


                                ${slots
                                    .map(
                                        (
                                            row,
                                            index
                                        ) =>
                                            groupRow(
                                                row,
                                                index
                                            )
                                    )
                                    .join("")}


                            </div>


                            <footer
                                class="
                                    ccfv-champions-group__legend
                                "
                            >

                                <span>
                                    <b>J</b>
                                    Jogos
                                </span>

                                <span>
                                    <b>V</b>
                                    Vitórias
                                </span>

                                <span>
                                    <b>E</b>
                                    Empates
                                </span>

                                <span>
                                    <b>D</b>
                                    Derrotas
                                </span>

                                <span>
                                    <b>GP</b>
                                    Gols pró
                                </span>

                                <span>
                                    <b>GC</b>
                                    Gols contra
                                </span>

                                <span>
                                    <b>SG</b>
                                    Saldo
                                </span>

                                <span>
                                    <b>PTS</b>
                                    Pontos
                                </span>

                            </footer>


                        </article>

                    `;

                }
            )

            .join("");

    }


    /* =====================================================
       PARTIDA
       ===================================================== */

    function matchCard(
        match,
        fallbackStage = "FASE"
    ) {

        const finished =
            DONE.has(
                String(
                    match?.status ||
                    ""
                ).toUpperCase()
            );


        const home = {

            name:
                match?.home_name ||
                "A DEFINIR",

            slug:
                match?.home_slug ||
                "",

            logo_path:
                match?.home_logo_path ||
                ""

        };


        const away = {

            name:
                match?.away_name ||
                "A DEFINIR",

            slug:
                match?.away_slug ||
                "",

            logo_path:
                match?.away_logo_path ||
                ""

        };


        return `

            <article
                class="
                    ccfv-champions-match
                "
            >


                <header
                    class="
                        ccfv-champions-match__header
                    "
                >

                    <div>

                        <span>
                            ${esc(
                                phaseLabel(
                                    match?.stage ||
                                    fallbackStage
                                )
                            )}
                        </span>


                        <strong>

                            ${
                                match?.group_code

                                    ? `GRUPO
                                       ${esc(
                                           match.group_code
                                       )}
                                       · `
                                    : ""

                            }


                            ${
                                match?.leg === 2
                                    ? "VOLTA"
                                    : "JOGO"
                            }

                        </strong>

                    </div>


                    <div
                        class="
                            ccfv-champions-match__status
                            ${
                                finished
                                    ? "is-finished"
                                    : ""
                            }
                        "
                    >

                        ${
                            finished
                                ? "RESULTADO OFICIAL"
                                : "PENDENTE"
                        }

                    </div>

                </header>


                <div
                    class="
                        ccfv-champions-match__body
                    "
                >


                    <div
                        class="
                            ccfv-champions-match__team
                            ccfv-champions-match__team--home
                        "
                    >

                        <div
                            class="
                                match-team-copy
                            "
                        >

                            <strong>
                                ${esc(
                                    home.name
                                )}
                            </strong>

                            <small>
                                ${esc(
                                    match?.home_player_name ||
                                    "Treinador a definir"
                                )}
                            </small>

                        </div>


                        ${logoMarkup(
                            home,
                            "champions-match-logo"
                        )}

                    </div>


                    <div
                        class="
                            ccfv-champions-match__center
                        "
                    >

                        <strong
                            class="
                                ccfv-match-score
                            "
                        >

                            ${
                                finished

                                    ? `${esc(
                                        match?.home_score ??
                                        0
                                    )}
                                    ×
                                    ${esc(
                                        match?.away_score ??
                                        0
                                    )}`

                                    : "VS"

                            }

                        </strong>


                        <span
                            class="
                                ccfv-match-date
                            "
                        >

                            ${
                                match?.scheduled_at

                                    ? esc(
                                        new Date(
                                            match.scheduled_at
                                        ).toLocaleString(
                                            "pt-BR"
                                        )
                                    )

                                    : "HORÁRIO A DEFINIR"

                            }

                        </span>

                    </div>


                    <div
                        class="
                            ccfv-champions-match__team
                            ccfv-champions-match__team--away
                        "
                    >

                        ${logoMarkup(
                            away,
                            "champions-match-logo"
                        )}


                        <div
                            class="
                                match-team-copy
                            "
                        >

                            <strong>
                                ${esc(
                                    away.name
                                )}
                            </strong>

                            <small>
                                ${esc(
                                    match?.away_player_name ||
                                    "Treinador a definir"
                                )}
                            </small>

                        </div>

                    </div>


                </div>


                <footer
                    class="
                        ccfv-champions-match__footer
                    "
                >

                    <span>

                        ${
                            match?.stage ===
                            "GROUP_STAGE"

                                ? "FASE DE GRUPOS · IDA + VOLTA"

                                : "MATA-MATA"
                        }

                    </span>


                    ${
                        finished &&
                        match?.home_penalties != null

                            ? `

                                <strong>
                                    PÊNALTIS
                                    ${esc(
                                        match.home_penalties
                                    )}
                                    ×
                                    ${esc(
                                        match.away_penalties
                                    )}
                                </strong>

                              `

                            : ""

                    }

                </footer>


            </article>

        `;

    }


    /* =====================================================
       PARTIDAS
       ===================================================== */

    function renderMatches() {

        const el =
            document.querySelector(
                "#public-matches"
            );


        if (!el) {

            return;

        }


        const ordered =
            [...state.matches]

                .sort(
                    (a, b) => {

                        const order = {

                            GROUP_STAGE: 1,

                            ROUND_OF_16: 2,

                            QUARTERFINALS: 3,

                            SEMIFINALS: 4,

                            FINAL: 5

                        };


                        return

                            (
                                order[a.stage] ||
                                99
                            ) -

                            (
                                order[b.stage] ||
                                99
                            )

                            ||

                            Number(
                                a.round_number ||
                                0
                            )

                            -

                            Number(
                                b.round_number ||
                                0
                            )

                            ||

                            Number(
                                a.match_order ||
                                a.match_number ||
                                0
                            )

                            -

                            Number(
                                b.match_order ||
                                b.match_number ||
                                0
                            );

                    }
                );


        el.innerHTML =

            ordered.length

                ? ordered
                    .map(
                        match =>
                            matchCard(
                                match
                            )
                    )
                    .join("")

                : `

                    <div
                        class="
                            ccfv-lib-empty
                        "
                    >
                        Nenhuma partida cadastrada ainda.
                    </div>

                `;

    }


    /* =====================================================
       PLACEHOLDER DO MATA-MATA
       ===================================================== */

    function knockoutPlaceholder(
        label,
        number
    ) {

        return `

            <div
                class="
                    ccfv-bracket-match
                "
            >

                <div
                    class="
                        ccfv-bracket-line
                    "
                >

                    <span
                        class="
                            ccfv-bracket-placeholder-logo
                        "
                    ></span>

                    <span>
                        ${esc(
                            label
                        )}
                        ${number}
                    </span>

                    <strong>
                        —
                    </strong>

                </div>


                <div
                    class="
                        ccfv-bracket-line
                    "
                >

                    <span
                        class="
                            ccfv-bracket-placeholder-logo
                        "
                    ></span>

                    <span>
                        ${esc(
                            label
                        )}
                        ${number}
                    </span>

                    <strong>
                        —
                    </strong>

                </div>

            </div>

        `;

    }


    /* =====================================================
       MATCH DO BRACKET
       ===================================================== */

    function bracketCard(
        match
    ) {

        const finished =
            DONE.has(
                String(
                    match?.status ||
                    ""
                ).toUpperCase()
            );


        return `

            <div
                class="
                    ccfv-bracket-match
                "
            >

                <div
                    class="
                        ccfv-bracket-line
                    "
                >

                    ${logoMarkup(
                        {
                            name:
                                match?.home_name,

                            slug:
                                match?.home_slug,

                            logo_path:
                                match?.home_logo_path
                        },

                        "ccfv-bracket-logo"
                    )}


                    <span>

                        ${esc(
                            match?.home_name ||
                            "A DEFINIR"
                        )}

                    </span>


                    <strong>

                        ${
                            finished
                                ? esc(
                                    match?.home_score ??
                                    0
                                )
                                : "—"
                        }

                    </strong>

                </div>


                <div
                    class="
                        ccfv-bracket-line
                    "
                >

                    ${logoMarkup(
                        {
                            name:
                                match?.away_name,

                            slug:
                                match?.away_slug,

                            logo_path:
                                match?.away_logo_path
                        },

                        "ccfv-bracket-logo"
                    )}


                    <span>

                        ${esc(
                            match?.away_name ||
                            "A DEFINIR"
                        )}

                    </span>


                    <strong>

                        ${
                            finished
                                ? esc(
                                    match?.away_score ??
                                    0
                                )
                                : "—"
                        }

                    </strong>

                </div>

            </div>

        `;

    }


    /* =====================================================
       ROUND
       ===================================================== */

    function renderRound(
        phase,
        count,
        label
    ) {

        const matches =
            state.matches

                .filter(
                    match =>
                        String(
                            match.stage ||
                            ""
                        ) === phase
                )

                .sort(
                    (a, b) =>
                        Number(
                            a.match_number ||
                            a.match_order ||
                            0
                        ) -

                        Number(
                            b.match_number ||
                            b.match_order ||
                            0
                        )
                );


        const content =

            Array
                .from(
                    {
                        length:
                            count
                    },
                    (_, index) =>

                        matches[index]

                            ? bracketCard(
                                matches[index]
                            )

                            : knockoutPlaceholder(
                                label,
                                index + 1
                            )
                )

                .join("");


        return `

            <div
                class="
                    ccfv-champions-round
                "
            >

                <header>

                    <span>

                        ${
                            phase ===
                            "ROUND_OF_16"

                                ? "8 CONFRONTOS"

                                : phase ===
                                  "QUARTERFINALS"

                                    ? "4 AVANÇAM"

                                    : phase ===
                                      "SEMIFINALS"

                                        ? "2 AVANÇAM"

                                        : "GRANDE DECISÃO"

                        }

                    </span>


                    <strong>
                        ${esc(label)}
                    </strong>

                </header>


                ${content}

            </div>

        `;

    }


    /* =====================================================
       MATA-MATA
       ===================================================== */

    function renderKnockout() {

        const el =
            document.querySelector(
                "#public-knockout"
            );


        if (!el) {

            return;

        }


        const finalMatches =
            state.matches

                .filter(
                    match =>
                        String(
                            match.stage ||
                            ""
                        ) === "FINAL"
                )

                .slice(
                    0,
                    1
                );


        el.innerHTML = `

            ${renderRound(
                "ROUND_OF_16",
                8,
                "OITAVAS"
            )}


            ${renderRound(
                "QUARTERFINALS",
                4,
                "QUARTAS"
            )}


            ${renderRound(
                "SEMIFINALS",
                2,
                "SEMIFINAIS"
            )}


            <div
                class="
                    ccfv-champions-round
                    ccfv-champions-round--final
                "
            >

                <header>

                    <span>
                        GRANDE DECISÃO
                    </span>

                    <strong>
                        FINAL
                    </strong>

                </header>


                ${
                    finalMatches.length

                        ? bracketCard(
                            finalMatches[0]
                          )

                        : knockoutPlaceholder(
                            "FINAL",
                            1
                          )
                }

            </div>

        `;

    }


    /* =====================================================
       CAMPEÃO
       ===================================================== */

    function renderChampion() {

        const el =
            document.querySelector(
                "#public-champion"
            );


        if (!el) {

            return;

        }


        const champion =
            visibleClubs().find(
                club =>
                    String(
                        club.status ||
                        ""
                    ).toUpperCase() ===
                    "CHAMPION"
            );


        if (!champion) {

            el.innerHTML = `

                <div
                    class="
                        ccfv-lib-champion-copy
                    "
                >

                    <span>
                        CCFV // HALL DA FAMA
                    </span>


                    <div
                        class="
                            champions-champion-badge
                        "
                    >

                        🏆 AGUARDANDO

                    </div>


                    <strong>
                        CAMPEÃO DA LIBERTADORES
                    </strong>


                    <h2>
                        A DEFINIR
                    </h2>


                    <p>
                        A grande taça ainda está em disputa.
                    </p>

                </div>

            `;

            return;

        }


        el.innerHTML = `

            <div
                class="
                    ccfv-lib-champion-copy
                "
            >

                <span>
                    CCFV // HALL DA FAMA
                </span>


                <div
                    class="
                        champions-champion-badge
                        is-confirmed
                    "
                >

                    🏆 CAMPEÃO

                </div>


                <strong>
                    CAMPEÃO DA LIBERTADORES
                </strong>


                ${
                    champion.participant_photo_url

                        ? `

                            <img

                                src="${esc(
                                    champion.participant_photo_url
                                )}"

                                alt="${esc(
                                    champion.participant_name ||
                                    "Campeão"
                                )}"

                                loading="lazy"

                            >

                          `

                        : logoMarkup(
                            champion,
                            "ccfv-lib-public-logo"
                        )

                }


                <h2>

                    ${esc(
                        champion.participant_name ||
                        champion.name
                    )}

                </h2>


                <p>

                    ${esc(
                        champion.name
                    )}

                    ·

                    ${esc(
                        state.season?.season_label ||
                        "SEASON"
                    )}

                </p>

            </div>

        `;

    }


    /* =====================================================
       BOOT
       ===================================================== */

    async function boot() {

        /*
         * PRIMEIRO:
         * renderiza imediatamente a estrutura.
         *
         * Assim a página já mostra:
         * 32 clubes
         * grupos A-H
         * chave completa
         */

        state.season = null;

        state.clubs = [];

        state.matches = [];

        state.standings = [];


        render();


        /*
         * DEPOIS:
         * busca os dados reais.
         */

        try {

            await load();

        } catch (
            error
        ) {

            console.error(
                "CCFV // LIBERTADORES:",
                error
            );


            /*
             * Mesmo que o Supabase falhe,
             * mantém tudo visível.
             */

            render();

        }


        /*
         * Atualização automática.
         */

        window.setInterval(
            () => {

                if (
                    document.visibilityState !==
                    "visible"
                ) {

                    return;

                }


                load()

                    .catch(
                        error =>

                            console.warn(
                                "CCFV // LIBERTADORES LIVE:",
                                error
                            )
                    );

            },

            15000
        );

    }


    /* =====================================================
       INIT
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once: true
            }
        );

    } else {

        boot();

    }


})();