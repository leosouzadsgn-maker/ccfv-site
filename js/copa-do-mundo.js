(() => {

    "use strict";

    /* =====================================================

       CCFV // COPA DO MUNDO

       PÁGINA PÚBLICA

       MODELO VISUAL: CHAMPIONS

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

    const PHASES = [

        {

            key: "ROUND_OF_16",

            label: "OITAVAS",

            count: 8

        },

        {

            key: "QUARTERFINALS",

            label: "QUARTAS",

            count: 4

        },

        {

            key: "SEMIFINALS",

            label: "SEMIFINAIS",

            count: 2

        },

        {

            key: "FINAL",

            label: "FINAL",

            count: 1

        }

    ];

    const PHASE_LABEL = {

        REGISTRATIONS: "INSCRIÇÕES",

        DRAW: "SORTEIO",

        GROUP_STAGE: "FASE DE GRUPOS",

        ROUND_OF_16: "OITAVAS",

        QUARTERFINALS: "QUARTAS",

        SEMIFINALS: "SEMIFINAIS",

        FINAL: "FINAL",

        FINISHED: "ENCERRADA",

        CLOSED: "ENCERRADA"

    };

    const state = {

        client: null,

        season: null,

        teams: [],

        matches: [],

        standings: []

    };

    const $ = selector =>

        document.querySelector(selector);

    /* =====================================================

       HTML ESCAPE

       ===================================================== */

    function esc(value) {

        return String(value ?? "")

            .replaceAll("&", "&amp;")

            .replaceAll("<", "&lt;")

            .replaceAll(">", "&gt;")

            .replaceAll('"', "&quot;")

            .replaceAll("'", "&#039;");

    }

    /* =====================================================

       CLIENT

       ===================================================== */

    async function getClient() {

        if (

            state.client

        ) {

            return state.client;

        }

        if (

            window.CCFVAuth &&

            typeof window.CCFVAuth.getClient === "function"

        ) {

            state.client =

                await window.CCFVAuth.getClient();

            return state.client;

        }

        throw new Error(

            "CCFVAuth não está disponível."

        );

    }

    /* =====================================================

       INIT FALLBACK

       ===================================================== */

    function fallbackTeam(

        index

    ) {

        const number =

            String(

                index + 1

            ).padStart(

                2,

                "0"

            );

        return {

            id:

                `placeholder-${number}`,

            season_id:

                state.season?.id ||

                null,

            slot:

                index + 1,

            name:

                `SELEÇÃO ${number}`,

            slug:

                `selecao-${number}`,

            confederation:

                "A DEFINIR",

            pot:

                "—",

            logo_path:

                null,

            group_code:

                null,

            group_position:

                null,

            participant_id:

                null,

            participant_name:

                null,

            participant_photo_url:

                null,

            status:

                "AVAILABLE"

        };

    }

    function fallbackTeams() {

        return Array

            .from(

                {

                    length: 32

                },

                (

                    _,

                    index

                ) =>

                    fallbackTeam(index)

            );

    }

    function visibleTeams() {

        if (

            state.teams.length

        ) {

            return state.teams;

        }

        return fallbackTeams();

    }

    /* =====================================================

       LOGO

       ===================================================== */

    function initials(

        name

    ) {

        return String(

            name ||

            "CC"

        )

            .normalize("NFD")

            .replace(

                /[\u0300-\u036f]/g,

                ""

            )

            .split(/\s+/)

            .filter(Boolean)

            .slice(

                0,

                2

            )

            .map(

                word =>

                    word[0]

            )

            .join("")

            .toUpperCase() || "CC";

    }

   function teamLogo(team) {

    const normalizeName = (value) =>

        String(value || "")

            .normalize("NFD")

            .replace(/[\u0300-\u036f]/g, "")

            .toLowerCase()

            .replace(/[^a-z0-9]+/g, " ")

            .trim();

    // Nomes correspondentes aos arquivos da pasta de bandeiras.

    const FLAG_FILES = {

        "alemanha": "Alemanha",

        "argentina": "Argentina",

        "australia": "Australia",

        "belgica": "Belgica",

        "brasil": "Brasil",

        "cabo verde": "Cabo-verde",

        "camaroes": "Camaroes",

        "canada": "Canada",

        "chile": "Chile",

        "colombia": "Colombia",

        "coreia do sul": "Coreia-do-sul",

        "croacia": "Croacia",

        "dinamarca": "Dinamarca",

        "equador": "Equador",

        "espanha": "Espanha",

        "estados unidos": "Estados-unidos",

        "estados unidos b": "Estados-unidos",

        "franca": "Franca",

        "holanda": "Holanda",

        "inglaterra": "Inglaterra",

        "ira": "Ira",

        "italia": "Italia",

        "japao": "Japao",

        "marrocos": "Marrocos",

        "mexico": "Mexico",

        "nigeria": "Nigeria",

        "paraguai": "Paraguai",

        "peru": "Peru",

        "portugal": "Portugal",

        "senegal": "Senegal",

        "suica": "Suica",

        "uruguai": "Uruguai",

        "arabia saudita": "Arabia-saudita"

    };

    const name = String(team?.name || "Seleção");

    const key = normalizeName(name);

    const filename = FLAG_FILES[key];

    const sources = [];

    // Prioriza as bandeiras locais da pasta do projeto.

    if (filename) {

        const extensions = [

            "png", "webp", "jpg", "jpeg", "svg",

            "PNG", "WEBP", "JPG", "JPEG", "SVG"

        ];

        extensions.forEach((extension) => {

            sources.push(

                `/assets/images/copa-do-mundo/${filename}.${extension}`

            );

        });

    }

    // Mantém o logo cadastrado no banco como alternativa.

    const savedLogo = String(team?.logo_path || "").trim();

    if (savedLogo && !sources.includes(savedLogo)) {

        sources.push(savedLogo);

    }

    // Sem bandeira cadastrada: mantém o fallback de iniciais.

    if (!sources.length) {

        return `

            <span class="ccfv-wc-fallback-logo">

                ${esc(initials(name))}

            </span>

        `;

    }

    return `

        <img

            class="ccfv-champions-club__logo ccfv-wc-logo"

            src="${esc(sources[0])}"

            data-ccfv-flag-sources="${esc(JSON.stringify(sources))}"

            data-ccfv-flag-index="0"

            alt="${esc(name)}"

            loading="lazy"

            onerror="

                try {

                    const sources = JSON.parse(

                        this.dataset.ccfvFlagSources || '[]'

                    );

                    const nextIndex =

                        Number(this.dataset.ccfvFlagIndex || 0) + 1;

                    if (nextIndex < sources.length) {

                        this.dataset.ccfvFlagIndex = String(nextIndex);

                        this.src = sources[nextIndex];

                    } else {

                        this.style.display = 'none';

                        this.nextElementSibling.style.display = 'grid';

                    }

                } catch (error) {

                    this.style.display = 'none';

                    this.nextElementSibling.style.display = 'grid';

                }

            "

        >

        <span

            class="ccfv-wc-fallback-logo ccfv-wc-fallback-logo--hidden"

            style="display:none"

        >

            ${esc(initials(name))}

        </span>

    `;

}

    /* =====================================================

       PLAYER

       ===================================================== */

    function playerMarkup(

        team

    ) {

        if (

            !team?.participant_name

        ) {

            return `

                <span>

                    AGUARDANDO INSCRIÇÃO

                </span>

            `;

        }

        return `

            ${

                team.participant_photo_url

                    ? `

                        <img

                            src="${esc(

                                team.participant_photo_url

                            )}"

                            alt="${esc(

                                team.participant_name

                            )}"

                            loading="lazy"

                        >

                    `

                    : ""

            }

            <span>

                ${esc(

                    team.participant_name

                )}

            </span>

        `;

    }

    /* =====================================================

       SEASON

       ===================================================== */

    function phaseText(

        value

    ) {

        return (

            PHASE_LABEL[

                String(

                    value ||

                    ""

                ).toUpperCase()

            ] ||

            String(

                value ||

                "INSCRIÇÕES"

            )

        );

    }

    function renderSeason() {

        const teams =

            visibleTeams();

        const occupied =

            teams.filter(

                team =>

                    team.participant_id

            ).length;

        const participants =

            new Set(

                teams

                    .map(

                        team =>

                            team.participant_id

                    )

                    .filter(Boolean)

            ).size;

        const label =

            state.season?.season_label ||

            "SEASON 01";

        const status =

            state.season?.status ||

            state.season?.phase ||

            "REGISTRATIONS";

        const seasonLabel =

            $(

                "#wc-season-label"

            );

        const seasonStatus =

            $(

                "#wc-season-status"

            );

        const participantsEl =

            $(

                "#wc-participants"

            );

        const teamsOccupiedEl =

            $(

                "#wc-teams-occupied"

            );

        const phaseEl =

            $(

                "#wc-phase"

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

                phaseText(status);

        }

        if (

            participantsEl

        ) {

            participantsEl.textContent =

                `${participants} / 32`;

        }

        if (

            teamsOccupiedEl

        ) {

            teamsOccupiedEl.textContent =

                `${occupied} / 32`;

        }

        if (

            phaseEl

        ) {

            phaseEl.textContent =

                phaseText(

                    state.season?.phase ||

                    state.season?.status ||

                    "REGISTRATIONS"

                );

        }

    }

    /* =====================================================

       STATS

       ===================================================== */

    function renderStats() {

        const registered =

            state.teams.filter(

                team =>

                    team.participant_id

            ).length;

        const finishedMatches =

            state.matches.filter(

                match =>

                    DONE.has(

                        String(

                            match.status ||

                            ""

                        ).toUpperCase()

                    )

            ).length;

        const element =

            document.querySelector(

                "#wc-stats"

            );

        if (

            !element

        ) {

            return;

        }

        element.innerHTML = [

            [

                "SEASON",

                state.season?.season_label ||

                    "SEASON 01"

            ],

            [

                "SELEÇÕES",

                "32"

            ],

            [

                "GRUPOS",

                "8"

            ],

            [

                "PARTIDAS",

                finishedMatches

            ]

        ]

            .map(

                ([label, value]) => `

                    <div

                        class="ccfv-champions-stat"

                    >

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

       TEAM CARDS

       ===================================================== */

    function renderTeams() {

        const element =

            $(

                "#wc-teams"

            );

        if (

            !element

        ) {

            return;

        }

        element.innerHTML =

            visibleTeams()

                .slice(

                    0,

                    32

                )

                .map(

                    team => `

                        <article

                            class="

                                ccfv-champions-club

                                ccfv-wc-team-card

                            "

                        >

                            <div

                                class="

                                    ccfv-wc-team-card__top

                                "

                            >

                                <div

                                    class="

                                        ccfv-wc-team-logo-wrap

                                    "

                                >

                                    ${teamLogo(

                                        team

                                    )}

                                </div>

                                <div

                                    class="

                                        ccfv-wc-team-card__copy

                                    "

                                >

                                    <strong>

                                        ${esc(

                                            team.name

                                        )}

                                    </strong>

                                    <span>

                                        ${esc(

                                            team.confederation ||

                                            "CONFEDERAÇÃO"

                                        )}

                                        · POTE

                                        ${esc(

                                            team.pot ||

                                            "—"

                                        )}

                                    </span>

                                </div>

                                <small

                                    class="

                                        ccfv-wc-team-card__slot

                                    "

                                >

                                    #

                                    ${String(

                                        team.slot ||

                                        0

                                    ).padStart(

                                        2,

                                        "0"

                                    )}

                                </small>

                            </div>

                            <div

                                class="

                                    ccfv-wc-team-card__player

                                    ${

                                        team.participant_id

                                            ? "is-registered"

                                            : ""

                                    }

                                "

                            >

                                ${playerMarkup(

                                    team

                                )}

                            </div>

                        </article>

                    `

                )

                .join("");

    }

    /* =====================================================

       GROUP DATA

       ===================================================== */

    function groupRows(

        group

    ) {

        const standings =

            state.standings

                .filter(

                    row =>

                        String(

                            row.season_id

                        ) ===

                        String(

                            state.season?.id

                        ) &&

                        row.group_code ===

                        group

                )

                .sort(

                    (

                        a,

                        b

                    ) =>

                        Number(

                            a.position ||

                            99

                        )

                        -

                        Number(

                            b.position ||

                            99

                        )

                );

        if (

            standings.length

        ) {

            return standings.slice(

                0,

                4

            );

        }

        const assigned =

            state.teams

                .filter(

                    team =>

                        String(

                            team.season_id

                        ) ===

                        String(

                            state.season?.id

                        ) &&

                        team.group_code ===

                        group

                )

                .sort(

                    (

                        a,

                        b

                    ) =>

                        Number(

                            a.group_position ||

                            99

                        )

                        -

                        Number(

                            b.group_position ||

                            99

                        )

                );

        return assigned.map(

            (

                team,

                index

            ) => ({

                ...team,

                position:

                    team.group_position ||

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

    /* =====================================================

       GROUP ROW

       ===================================================== */

    function renderGroupRow(row, index) {
    if (!row) {
        return `
            <div class="ccfv-champions-group__row ccfv-wc-empty-row">
                <span class="group-position">${index + 1}</span>
                <div class="ccfv-champions-group__club">
                    <span class="ccfv-champions-group__placeholder-logo">—</span>
                    <div>
                        <strong>A DEFINIR</strong>
                        <small>Aguardando sorteio</small>
                    </div>
                </div>
                <span>—</span><span>—</span><span>—</span><span>—</span>
                <span>—</span><span>—</span><span>—</span>
                <strong class="points">—</strong>
            </div>
        `;
    }

    const goalDifference = Number(
        row.goal_difference ??
        (Number(row.goals_for || 0) - Number(row.goals_against || 0))
    );

    return `
        <div class="ccfv-champions-group__row ${row.qualified ? "is-qualified" : ""}">
            <span class="group-position">${esc(row.position ?? index + 1)}</span>

            <div class="ccfv-champions-group__club ccfv-wc-group-selection">
                ${teamLogo({ name: row.name || "Seleção", slug: row.slug, logo_path: row.logo_path })}
                <div class="ccfv-wc-group-selection__text">
                    <strong>${esc(row.name || "A DEFINIR")}</strong>
                    <small>${esc(row.participant_name || "Treinador a definir")}</small>
                </div>
            </div>

            <span>${esc(row.played ?? 0)}</span>
            <span>${esc(row.wins ?? 0)}</span>
            <span>${esc(row.draws ?? 0)}</span>
            <span>${esc(row.losses ?? 0)}</span>
            <span>${esc(row.goals_for ?? 0)}</span>
            <span>${esc(row.goals_against ?? 0)}</span>
            <span class="goal-difference ${goalDifference > 0 ? "positive" : goalDifference < 0 ? "negative" : ""}">
                ${goalDifference > 0 ? "+" : ""}${esc(goalDifference)}
            </span>
            <strong class="points">${esc(row.points ?? 0)}</strong>
        </div>
    `;
}


    /* =====================================================

       GROUPS

       ===================================================== */

    function renderGroups() {

        const element =

            $(

                "#wc-groups"

            );

        if (

            !element

        ) {

            return;

        }

        element.innerHTML =

            GROUPS

                .map(

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

                                (

                                    _,

                                    index

                                ) =>

                                    rows[index] ||

                                    null

                            );

                        return `

                            <article

                                class="

                                    ccfv-champions-group

                                    ccfv-wc-group-card

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

                                            SELEÇÃO

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

                                    ${slots.map(

                                        (

                                            row,

                                            index

                                        ) =>

                                            renderGroupRow(

                                                row,

                                                index

                                            )

                                    ).join("")}

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

       MATCH

       ===================================================== */

    function matchCard(

        match,

        emptyLabel = "A DEFINIR"

    ) {

        const finished =

            DONE.has(

                String(

                    match?.status ||

                    ""

                ).toUpperCase()

            );

        const homeName =

            match?.home_name ||

            emptyLabel;

        const awayName =

            match?.away_name ||

            emptyLabel;

        return `

            <article

                class="

                    ccfv-wc-match-card

                "

            >

                <div

                    class="

                        ccfv-wc-match-card__meta

                    "

                >

                    <span>

                        ${esc(

                            PHASE_LABEL[

                                match?.stage

                            ] ||

                            "PARTIDA"

                        )}

                        ${

                            match?.group_code

                                ? ` · GRUPO ${esc(

                                    match.group_code

                                )}`

                                : ""

                        }

                    </span>

                    <strong

                        class="

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

                                : "AGUARDANDO"

                        }

                    </strong>

                </div>

                <div

                    class="

                        ccfv-wc-match-card__teams

                    "

                >

                    <div

                        class="

                            ccfv-wc-match-card__team

                        "

                    >

                        <div

                            class="

                                ccfv-wc-match-logo

                            "

                        >

                            ${teamLogo({

                                name:

                                    match?.home_name,

                                logo_path:

                                    match?.home_logo_path

                            })}

                        </div>

                        <div>

                            <strong>

                                ${esc(

                                    homeName

                                )}

                            </strong>

                            <small>

                                ${esc(

                                    match?.home_player_name ||

                                    "Treinador a definir"

                                )}

                            </small>

                        </div>

                    </div>

                    <div

                        class="

                            ccfv-wc-match-card__score

                        "

                    >

                        <strong>

                            ${

                                finished

                                    ? `${esc(

                                        match.home_score ??

                                        0

                                    )} × ${esc(

                                        match.away_score ??

                                        0

                                    )}`

                                    : "— × —"

                            }

                        </strong>

                        <span>

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

                            ccfv-wc-match-card__team

                            ccfv-wc-match-card__team--away

                        "

                    >

                        <div>

                            <strong>

                                ${esc(

                                    awayName

                                )}

                            </strong>

                            <small>

                                ${esc(

                                    match?.away_player_name ||

                                    "Treinador a definir"

                                )}

                            </small>

                        </div>

                        <div

                            class="

                                ccfv-wc-match-logo

                            "

                        >

                            ${teamLogo({

                                name:

                                    match?.away_name,

                                logo_path:

                                    match?.away_logo_path

                            })}

                        </div>

                    </div>

                </div>

                ${

                    finished &&

                    match.home_penalties != null

                        ? `

                            <footer>

                                PÊNALTIS

                                ${esc(

                                    match.home_penalties

                                )}

                                ×

                                ${esc(

                                    match.away_penalties

                                )}

                            </footer>

                          `

                        : ""

                }

            </article>

        `;

    }

    /* =====================================================

       MATCHES

       ===================================================== */

    function renderMatches() {

        const element =

            $(

                "#wc-matches"

            );

        if (

            !element

        ) {

            return;

        }

        const matches =

            state.matches

                .slice()

                .sort(

                    (

                        a,

                        b

                    ) =>

                        Number(

                            a.match_order ||

                            0

                        )

                        -

                        Number(

                            b.match_order ||

                            0

                        )

                );

        element.innerHTML =

            matches.length

                ? matches

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

                            ccfv-wc-empty

                        "

                    >

                        Nenhuma partida gerada ainda.

                    </div>

                `;

    }

    /* =====================================================

       BRACKET PLACEHOLDER

       ===================================================== */

    function bracketMatch(

        label,

        number

    ) {

        return `

            <article

                class="

                    ccfv-wc-bracket-match

                "

            >

                <small>

                    ${esc(

                        label

                    )} ${number}

                </small>

                <div>

                    <span>

                        <i></i>

                        A DEFINIR

                    </span>

                    <strong>

                        —

                    </strong>

                </div>

                <div>

                    <span>

                        <i></i>

                        A DEFINIR

                    </span>

                    <strong>

                        —

                    </strong>

                </div>

            </article>

        `;

    }

    
function bracketRealMatch(match) {
    const finished = DONE.has(
        String(match?.status || "").toUpperCase()
    );

    const homeName = match?.home_name || "A DEFINIR";
    const awayName = match?.away_name || "A DEFINIR";

    const homeScore = finished
        ? esc(match?.home_score ?? 0)
        : "—";

    const awayScore = finished
        ? esc(match?.away_score ?? 0)
        : "—";

    return `
        <article class="ccfv-wc-bracket-match">
            <small>${esc(match?.tie_code || "CONFRONTO")}</small>

            <div class="ccfv-wc-bracket-match__team-row">
                <span class="ccfv-wc-bracket-team">
                    ${teamLogo({
                        name: homeName,
                        logo_path: match?.home_logo_path
                    })}
                    <span class="ccfv-wc-bracket-team__name">
                        ${esc(homeName)}
                    </span>
                </span>
                <strong>${homeScore}</strong>
            </div>

            <div class="ccfv-wc-bracket-match__team-row">
                <span class="ccfv-wc-bracket-team">
                    ${teamLogo({
                        name: awayName,
                        logo_path: match?.away_logo_path
                    })}
                    <span class="ccfv-wc-bracket-team__name">
                        ${esc(awayName)}
                    </span>
                </span>
                <strong>${awayScore}</strong>
            </div>
        </article>
    `;
}


    /* =====================================================

       KNOCKOUT

       ===================================================== */

    function renderKnockout() {

        const element =

            $(

                "#wc-knockout"

            );

        if (

            !element

        ) {

            return;

        }

        element.innerHTML = "";

        PHASES.forEach(

            phase => {

                const matches =

                    state.matches

                        .filter(

                            match =>

                                match.stage ===

                                phase.key

                        )

                        .sort(

                            (

                                a,

                                b

                            ) =>

                                Number(

                                    a.match_order ||

                                    0

                                )

                                -

                                Number(

                                    b.match_order ||

                                    0

                                )

                        );

                const cards =

                    Array.from(

                        {

                            length:

                                phase.count

                        },

                        (

                            _,

                            index

                        ) =>

                            matches[index]

                                ? bracketRealMatch(

                                    matches[index]

                                )

                                : bracketMatch(

                                    phase.label,

                                    index + 1

                                )

                    ).join("");

                const section =

                    document.createElement(

                        "section"

                    );

                section.className =

                    "ccfv-wc-bracket-phase";

                section.innerHTML = `

                    <header>

                        <div>

                            <span>

                                CCFV // FASE

                            </span>

                            <strong>

                                ${esc(

                                    phase.label

                                )}

                            </strong>

                        </div>

                        <small>

                            ${

                                phase.key ===

                                "ROUND_OF_16"

                                    ? "8 CONFRONTOS"

                                    : phase.key ===

                                      "QUARTERFINALS"

                                        ? "4 CONFRONTOS"

                                        : phase.key ===

                                          "SEMIFINALS"

                                            ? "2 CONFRONTOS"

                                            : "GRANDE DECISÃO"

                            }

                        </small>

                    </header>

                    <div

                        class="

                            ccfv-wc-bracket-phase__grid

                            ccfv-wc-bracket-phase__grid--${phase.count}

                        "

                    >

                        ${cards}

                    </div>

                `;

                element.appendChild(

                    section

                );

            }

        );

    }

    /* =====================================================

       CHAMPION

       ===================================================== */

    

function renderChampion() {
    const element = $("#wc-champion");
    if (!element) return;

    const officialChampion = state.teams.find(
        team => String(team.status || "").toUpperCase() === "CHAMPION"
    );

    const finalMatch = state.matches
        .filter(match =>
            String(match.stage || "").toUpperCase() === "FINAL" &&
            DONE.has(String(match.status || "").toUpperCase())
        )
        .sort((a, b) =>
            Number(b.match_order || 0) - Number(a.match_order || 0)
        )[0];

    let finalWinner = null;

    if (finalMatch?.winner_team_id) {
        finalWinner = state.teams.find(
            team => String(team.id) === String(finalMatch.winner_team_id)
        ) || null;
    }

    if (!finalWinner && finalMatch) {
        const homeScore = Number(finalMatch.home_score);
        const awayScore = Number(finalMatch.away_score);
        let winningName = null;

        if (homeScore > awayScore) {
            winningName = finalMatch.home_name;
        } else if (awayScore > homeScore) {
            winningName = finalMatch.away_name;
        } else if (
            finalMatch.home_penalties != null &&
            finalMatch.away_penalties != null &&
            Number(finalMatch.home_penalties) !==
                Number(finalMatch.away_penalties)
        ) {
            winningName =
                Number(finalMatch.home_penalties) >
                Number(finalMatch.away_penalties)
                    ? finalMatch.home_name
                    : finalMatch.away_name;
        }

        if (winningName) {
            finalWinner = state.teams.find(
                team => String(team.name) === String(winningName)
            ) || null;
        }
    }

    const champion = officialChampion || finalWinner;

    if (!champion) {
        element.innerHTML = `
            <div class="ccfv-wc-champion-inner">
                <span>CCFV // HALL DA FAMA</span>
                <div class="ccfv-wc-champion-badge">🏆 AGUARDANDO</div>
                <h2>A DEFINIR.</h2>
                <p>A grande taça ainda está em disputa.</p>
            </div>
        `;
        return;
    }

    const isOfficial = Boolean(officialChampion);
    const participantName = champion.participant_name || champion.name;
    const teamName = champion.name || "Seleção";
    const seasonLabel = state.season?.season_label || "SEASON";

    element.innerHTML = `
        <div class="ccfv-wc-champion-inner is-confirmed">

            <span>
                ${isOfficial
                    ? "🏆 CAMPEÃO DO MUNDO CCFV"
                    : "CCFV // VENCEDOR DA FINAL"}
            </span>

            <div class="ccfv-wc-champion-badge ${
                isOfficial ? "is-official" : "is-provisional"
            }">
                ${isOfficial
                    ? "🏆 CAMPEÃO OFICIAL"
                    : "🏆 AGUARDANDO FINALIZAÇÃO OFICIAL"}
            </div>

            <div class="ccfv-wc-champion-visual">

                ${
                    champion.participant_photo_url
                        ? `
                            <img
                                src="${esc(champion.participant_photo_url)}"
                                alt="Foto de ${esc(participantName)}"
                                class="ccfv-wc-champion-photo"
                                loading="lazy"
                            >
                        `
                        : `
                            <div class="ccfv-wc-champion-photo-fallback">
                                ${esc(initials(participantName))}
                            </div>
                        `
                }

                <div class="ccfv-wc-champion-flag">
                    ${teamLogo(champion)}
                </div>

            </div>

            <h2>${esc(participantName)}</h2>

            <p class="ccfv-wc-champion-team-name">
                ${esc(teamName)}
            </p>

            <p>${esc(seasonLabel)}</p>

        </div>
    `;
}



    /* =====================================================

       RENDER

       ===================================================== */

    function render() {

        renderSeason();

        renderStats();

        renderTeams();

        renderGroups();

        renderMatches();

        renderKnockout();

        renderChampion();

    }

    /* =====================================================

       LOAD

       ===================================================== */

    async function load() {

        const supabase =

            await getClient();

        const seasonResult =

            await supabase

                .from(

                    "ccfv_world_cup_public_seasons"

                )

                .select("*")

                .order(

                    "season_number",

                    {

                        ascending: false

                    }

                )

                .limit(

                    1

                )

                .maybeSingle();

        if (

            seasonResult.error

        ) {

            throw seasonResult.error;

        }

        state.season =

            seasonResult.data ||

            null;

        /*

         * SEM TEMPORADA:

         * mantém estrutura visual

         */

        if (

            !state.season

        ) {

            state.teams = [];

            state.matches = [];

            state.standings = [];

            render();

            return;

        }

        const [

            teamResult,

            matchResult,

            standingsResult

        ] = await Promise.all([

            supabase

                .from(

                    "ccfv_world_cup_public_teams"

                )

                .select("*")

                .eq(

                    "season_id",

                    state.season.id

                )

                .order(

                    "slot"

                ),

            supabase

                .from(

                    "ccfv_world_cup_public_matches"

                )

                .select("*")

                .eq(

                    "season_id",

                    state.season.id

                )

                .order(

                    "match_order"

                ),

            supabase

                .from(

                    "ccfv_world_cup_public_standings"

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

        state.teams =

            teamResult.error

                ? []

                : (

                    teamResult.data ||

                    []

                );

        state.matches =

            matchResult.error

                ? []

                : (

                    matchResult.data ||

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

       BOOT

       ===================================================== */

    async function boot() {

        /*

         * Renderização inicial:

         * nunca deixa a página vazia.

         */

        state.season = null;

        state.teams = [];

        state.matches = [];

        state.standings = [];

        render();

        try {

            await load();

        } catch (

            error

        ) {

            console.error(

                "CCFV // WORLD CUP:",

                error

            );

            /*

             * Mesmo com erro no banco,

             * mantém:

             *

             * 32 seleções

             * grupos A-H

             * chave completa

             */

            state.teams = [];

            state.matches = [];

            state.standings = [];

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

                load().catch(

                    error =>

                        console.warn(

                            "CCFV // WORLD CUP LIVE:",

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
