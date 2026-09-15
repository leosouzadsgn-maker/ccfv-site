(() => {
    "use strict";

    const state = {
        client: null,
        user: null,
        championshipId: null,
        championship: {
            season_label: "SEASON 01",
            status: "DRAFT",
            max_participants: 32,
            total_clubs: 32
        },
        clubs: [],
        pots: [],
        groups: [],
        standings: [],
        matches: [],
        history: [],
        hall: []
    };

    const phaseLabel = {
        DRAFT: "DRAFT",
        REGISTRATIONS: "INSCRIÇÕES",
        CLUB_SELECTION: "ESCOLHA DE CLUBE",
        DRAW: "SORTEIO",
        GROUP_STAGE: "GRUPOS",
        ROUND_OF_16: "OITAVAS",
        QUARTERFINALS: "QUARTAS",
        SEMIFINALS: "SEMIFINAIS",
        FINAL: "FINAL",
        CLOSED: "ENCERRADA",
        ARCHIVED: "ARQUIVADA"
    };

    const esc = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    function showMessage(text, error = false) {
        const el = document.querySelector("#global-message");
        if (!el) return;
        el.hidden = false;
        el.textContent = text;
        el.classList.toggle("is-error", error);
    }

    async function getClient() {
        if (window.CCFVAuth?.getClient) {
            return window.CCFVAuth.getClient();
        }

        const start = Date.now();

        while (!window.CCFVAuth?.getClient) {
            if (Date.now() - start > 10000) {
                throw new Error("Supabase não está disponível.");
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return window.CCFVAuth.getClient();
    }

    async function loadPublicData() {
        /*
         * Todas as leituras públicas passam pelas views que já estão
         * liberadas. Assim o Admin não quebra por RLS de leitura.
         */
        const clubsResult = await state.client
            .from("championship_public_clubs")
            .select("*")
            .limit(100);

        if (clubsResult.error) {
            throw clubsResult.error;
        }

        state.clubs = clubsResult.data || [];

        if (!state.clubs.length) {
            state.championshipId = null;
            render();
            return;
        }

        state.championshipId =
            state.clubs[0].championship_id;

        const [standingsResult, matchesResult] =
            await Promise.all([
                state.client
                    .from("championship_public_standings")
                    .select("*")
                    .eq("championship_id", state.championshipId)
                    .order("group_code")
                    .order("position"),

                state.client
                    .from("championship_public_matches")
                    .select("*")
                    .eq("championship_id", state.championshipId)
                    .order("phase")
                    .order("match_number")
            ]);

        if (standingsResult.error) {
            console.warn("Standings:", standingsResult.error);
        }

        if (matchesResult.error) {
            console.warn("Matches:", matchesResult.error);
        }

        state.standings = standingsResult.data || [];
        state.matches = matchesResult.data || [];

        render();
    }

    function render() {
        const occupied = state.clubs.filter(
            item => item.participant_id
        ).length;

        const qualified = state.standings.filter(
            item => item.qualified
        ).length;

        const champion =
            state.matches.find(
                item =>
                    item.phase === "FINAL" &&
                    item.winner_registration_id
            );

        document.querySelector("#kpi-status").textContent =
            phaseLabel[state.championship.status] ||
            state.championship.status;

        document.querySelector("#kpi-participants").textContent =
            `${occupied} / 32`;

        document.querySelector("#kpi-clubs").textContent =
            `${occupied} / 32`;

        document.querySelector("#kpi-matches").textContent =
            String(state.matches.length);

        document.querySelector("#kpi-qualified").textContent =
            String(qualified);

        document.querySelector("#kpi-champion").textContent =
            champion?.winner_club_name ||
            "A DEFINIR";

        renderClubs();
        renderGroups();
        renderMatches();
        renderKnockout();
    }

    function renderClubs() {
        const tbody = document.querySelector("#clubs-table");
        if (!tbody) return;

        tbody.innerHTML =
            state.clubs
                .sort((a, b) =>
                    String(a.name || "").localeCompare(
                        String(b.name || ""),
                        "pt-BR"
                    )
                )
                .map(club => `
                    <tr>
                        <td>
                            <strong>${esc(club.name)}</strong>
                        </td>
                        <td>${esc(club.country || "—")}</td>
                        <td>
                            <strong>
                                ${esc(club.participant_name || "A DEFINIR")}
                            </strong>
                        </td>
                        <td>
                            <span class="status-pill">
                                ${esc(club.status || "AVAILABLE")}
                            </span>
                        </td>
                        <td>${esc(club.pot_number ?? "—")}</td>
                    </tr>
                `)
                .join("");
    }

    function renderGroups() {
        const el =
            document.querySelector("#admin-groups-grid");

        if (!el) return;

        const letters =
            ["A","B","C","D","E","F","G","H"];

        el.innerHTML =
            letters.map(code => {

                let rows =
                    state.standings
                        .filter(item =>
                            item.group_code === code
                        )
                        .sort(
                            (a,b) =>
                                Number(a.position || 99) -
                                Number(b.position || 99)
                        );

                if (!rows.length) {
                    rows = [1,2,3,4].map(position => ({
                        position,
                        club_name: "A DEFINIR",
                        logo_path: "",
                        points: 0
                    }));
                }

                return `
                    <article class="admin-group">

                        <header>
                            <div>
                                <span>GRUPO</span>
                                <h2>${code}</h2>
                            </div>
                        </header>

                        ${rows.map(row => `
                            <div class="admin-group-row">

                                <small>${esc(row.position)}</small>

                                ${
                                    row.logo_path
                                        ? `<img src="${esc(row.logo_path)}" alt="">`
                                        : `<span>—</span>`
                                }

                                <span>
                                    ${esc(row.club_name || "A DEFINIR")}
                                </span>

                                <small>
                                    ${esc(row.points ?? 0)} pts
                                </small>

                            </div>
                        `).join("")}

                    </article>
                `;
            }).join("");
    }

    function renderMatches() {
        const group =
            document.querySelector("#matches-admin-list");

        if (!group) return;

        const matches =
            state.matches.filter(
                item => item.phase === "GROUP_STAGE"
            );

        renderMatchList(group, matches);
    }

    function renderMatchList(container, matches) {

        if (!matches.length) {
            container.innerHTML = `
                <article class="admin-card">
                    <p class="admin-help">
                        Aguardando sorteio e geração dos jogos.
                    </p>
                </article>
            `;
            return;
        }

        container.innerHTML =
            matches.map(match => `
                <article class="admin-match">

                    <div class="admin-match__side">
                        ${
                            match.home_logo_path
                                ? `<img src="${esc(match.home_logo_path)}" alt="">`
                                : ""
                        }

                        <strong>
                            ${esc(match.home_club_name || "A DEFINIR")}
                        </strong>
                    </div>

                    <div class="admin-match__score">
                        <strong>
                            ${
                                ["VALIDATED","WO","ADMIN_DECISION"].includes(
                                    match.status
                                )
                                    ? `${esc(match.home_score)} × ${esc(match.away_score)}`
                                    : "VS"
                            }
                        </strong>

                        <span>
                            ${esc(phaseLabel[match.phase] || match.phase)}
                            #${esc(match.match_number)}
                        </span>
                    </div>

                    <div class="admin-match__side admin-match__side--away">

                        <strong>
                            ${esc(match.away_club_name || "A DEFINIR")}
                        </strong>

                        ${
                            match.away_logo_path
                                ? `<img src="${esc(match.away_logo_path)}" alt="">`
                                : ""
                        }

                    </div>

                    <div class="admin-match__controls">

                        ${
                            ["VALIDATED","WO","ADMIN_DECISION"].includes(
                                match.status
                            )
                                ? `<span class="status-pill">${esc(match.status)}</span>`
                                : `
                                    <input
                                        data-home="${esc(match.id)}"
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                    >

                                    <input
                                        data-away="${esc(match.id)}"
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                    >

                                    <button
                                        data-submit-result="${esc(match.id)}"
                                    >
                                        SALVAR
                                    </button>
                                `
                        }

                    </div>

                </article>
            `)
            .join("");
    }

    function renderKnockout() {
        const target =
            document.querySelector("#knockout-list");

        if (!target) return;

        const phases =
            [
                ["ROUND_OF_16", "OITAVAS", 8],
                ["QUARTERFINALS", "QUARTAS", 4],
                ["SEMIFINALS", "SEMIFINAIS", 2],
                ["FINAL", "FINAL", 1]
            ];

        target.innerHTML =
            phases.map(
                ([phase, label, size]) => {

                    let matches =
                        state.matches.filter(
                            item => item.phase === phase
                        );

                    if (!matches.length) {
                        matches =
                            Array.from(
                                { length: size },
                                (_, index) => ({
                                    id:
                                        null,

                                    match_number:
                                        index + 1,

                                    phase,

                                    status:
                                        "SCHEDULED",

                                    home_club_name:
                                        "A DEFINIR",

                                    away_club_name:
                                        "A DEFINIR",

                                    home_score:
                                        null,

                                    away_score:
                                        null
                                })
                            );
                    }

                    return `
                        <article class="admin-card">
                            <header>
                                <div>
                                    <span>CCFV // ${label}</span>
                                    <h2>${label}</h2>
                                </div>
                            </header>

                            ${matches.map(match => `
                                <div class="admin-match">

                                    <div class="admin-match__side">
                                        <strong>
                                            ${esc(match.home_club_name || "A DEFINIR")}
                                        </strong>
                                    </div>

                                    <div class="admin-match__score">
                                        <strong>
                                            ${
                                                match.status !== "SCHEDULED"
                                                    ? `${esc(match.home_score)} × ${esc(match.away_score)}`
                                                    : "VS"
                                            }
                                        </strong>
                                    </div>

                                    <div class="admin-match__side">
                                        <strong>
                                            ${esc(match.away_club_name || "A DEFINIR")}
                                        </strong>
                                    </div>

                                    <div class="admin-match__controls">
                                        ${
                                            match.id &&
                                            match.status === "SCHEDULED"
                                                ? `
                                                    <input
                                                        data-home="${esc(match.id)}"
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                    >

                                                    <input
                                                        data-away="${esc(match.id)}"
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                    >

                                                    <button
                                                        data-submit-result="${esc(match.id)}"
                                                    >
                                                        SALVAR
                                                    </button>
                                                  `
                                                : ""
                                        }
                                    </div>

                                </div>
                            `).join("")}
                        </article>
                    `;
                }
            ).join("");
    }

    async function callRpc(name, args) {
        if (!state.client) {
            throw new Error("Supabase não conectado.");
        }

        if (!state.championshipId) {
            throw new Error("Season 01 ainda não possui clubes carregados.");
        }

        showMessage(`Executando ${name}...`);

        const {
            data,
            error
        } = await state.client.rpc(name, args);

        if (error) {
            throw error;
        }

        showMessage(
            `${name} executado com sucesso.`
        );

        await refresh();

        return data;
    }

    async function saveSeason() {
        showMessage(
            "A configuração de temporada é controlada pelo banco/RPC nesta etapa."
        );
    }

    async function submitResult(button) {

        const id =
            button.dataset.submitResult;

        const home =
            Number(
                document.querySelector(
                    `input[data-home="${CSS.escape(id)}"]`
                )?.value
            );

        const away =
            Number(
                document.querySelector(
                    `input[data-away="${CSS.escape(id)}"]`
                )?.value
            );

        if (
            !Number.isInteger(home) ||
            !Number.isInteger(away) ||
            home < 0 ||
            away < 0
        ) {
            throw new Error("Informe um placar válido.");
        }

        await callRpc(
            "champions_submit_result",
            {
                p_match_id:
                    id,

                p_home_score:
                    home,

                p_away_score:
                    away,

                p_result_type:
                    "NORMAL"
            }
        );
    }

    async function refresh() {
        try {
            await loadPublicData();
        } catch (error) {
            console.error(
                "CCFV // Champions Admin refresh:",
                error
            );

            showMessage(
                error?.message ||
                "Não foi possível carregar os dados públicos da Champions.",
                true
            );

            /*
             * Mesmo com erro de leitura, mantemos as telas clicáveis
             * e os placeholders visíveis.
             */
            render();
        }
    }

    function bindTabs() {

        const links =
            document.querySelectorAll(
                "[data-tab]"
            );

        const panels =
            document.querySelectorAll(
                ".admin-tab"
            );

        function activate(tab) {

            links.forEach(
                link =>
                    link.classList.toggle(
                        "is-active",
                        link.dataset.tab === tab
                    )
            );

            panels.forEach(
                panel =>
                    panel.classList.toggle(
                        "is-visible",
                        panel.dataset.panel === tab
                    )
            );

            if (history.replaceState) {
                history.replaceState(
                    null,
                    "",
                    `#${tab}`
                );
            }
        }

        links.forEach(
            link => {

                link.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        activate(
                            link.dataset.tab
                        );

                    }
                );

            }
        );

        const initial =
            location.hash.replace("#", "");

        activate(
            links[0]?.dataset.tab === initial
                ? initial
                : (
                    links.length
                        ? (
                            document.querySelector(
                                `[data-tab="${CSS.escape(initial)}"]`
                            )
                                ? initial
                                : links[0].dataset.tab
                          )
                        : "dashboard"
                  )
        );
    }

    function bindActions() {

        document.querySelector("#btn-refresh")
            ?.addEventListener(
                "click",
                () =>
                    refresh().catch(
                        error =>
                            showMessage(
                                error?.message ||
                                String(error),
                                true
                            )
                    )
            );

        document.querySelector("#btn-save-season")
            ?.addEventListener(
                "click",
                () =>
                    saveSeason().catch(
                        error =>
                            showMessage(
                                error?.message ||
                                String(error),
                                true
                            )
                    )
            );

        document.body.addEventListener(
            "click",
            async event => {

                const action =
                    event.target.closest(
                        "[data-action]"
                    );

                const resultButton =
                    event.target.closest(
                        "[data-submit-result]"
                    );

                try {

                    if (resultButton) {
                        await submitResult(
                            resultButton
                        );
                        return;
                    }

                    if (!action) {
                        return;
                    }

                    const name =
                        action.dataset.action;

                    if (name === "prepare-pots") {
                        await callRpc(
                            "champions_prepare_pots",
                            {
                                p_championship_id:
                                    state.championshipId,

                                p_force:
                                    true
                            }
                        );
                    }

                    if (name === "draw-groups") {
                        await callRpc(
                            "champions_draw_groups",
                            {
                                p_championship_id:
                                    state.championshipId,

                                p_force:
                                    true
                            }
                        );
                    }

                    if (name === "generate-group-matches") {
                        await callRpc(
                            "champions_generate_group_matches",
                            {
                                p_championship_id:
                                    state.championshipId,

                                p_force:
                                    true
                            }
                        );
                    }

                } catch (error) {

                    console.error(
                        "CCFV // Champions Action:",
                        error
                    );

                    showMessage(
                        error?.message ||
                        String(error),
                        true
                    );

                }
            }
        );
    }

    async function boot() {

        bindTabs();
        bindActions();

        try {
            state.client = await getClient();

            const {
                data,
                error
            } = await state.client.auth.getUser();

            if (!error && data?.user) {
                state.user = data.user;
                document.querySelector(
                    "#admin-user-email"
                ).textContent =
                    data.user.email ||
                    "ADMIN";
            }
        } catch (error) {
            console.warn(
                "CCFV // Admin auth:",
                error
            );
        }

        /*
         * Mesmo que a leitura protegida da sessão falhe,
         * a interface continua funcionando.
         */
        await refresh();
    }

    window.addEventListener(
        "DOMContentLoaded",
        () => {
            boot().catch(
                error => {
                    console.error(error);
                    showMessage(
                        error?.message ||
                        "Falha ao carregar painel.",
                        true
                    );
                }
            );
        }
    );
})();
