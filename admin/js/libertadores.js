
function renderMatches() {
    const matches = seasonMatches();
    const container = $("#matches-list");

    if (!container) return;

    const previousSearch = $("#matches-search")?.value || "";

    const groups = ["A","B","C","D","E","F","G","H"];

    const stages = [
        ["ROUND_OF_16", "OITAVAS"],
        ["QUARTERFINALS", "QUARTAS DE FINAL"],
        ["SEMIFINALS", "SEMIFINAIS"],
        ["FINAL", "GRANDE FINAL"]
    ];

    const completed = m =>
        resultStatuses.includes(String(m.status || "").toUpperCase());

    function renderMatch(m, label) {
        const home = m.home?.name || "Casa";
        const away = m.away?.name || "Fora";
        const finished = completed(m);

        const hasScore =
            m.home_score !== null &&
            m.home_score !== undefined &&
            m.away_score !== null &&
            m.away_score !== undefined;

        const score = hasScore
            ? `${m.home_score} × ${m.away_score}`
            : "VS";

        const searchText = [
            home,
            away,
            label,
            m.group_code || "",
            m.tie_code || ""
        ].join(" ");

        const date = m.scheduled_at
            ? new Date(m.scheduled_at).toLocaleString("pt-BR")
            : "Data a definir";

        return `
            <article
                class="lib-match-card"
                data-match-search="${esc(searchText)}"
            >
                <div class="lib-match-card__top">
                    <span>${esc(label)}</span>

                    <span class="lib-match-status ${finished ? "is-done" : "is-pending"}">
                        ${finished ? "CONCLUÍDO" : "PENDENTE"}
                    </span>
                </div>

                <div class="lib-match-card__teams">

                    <div class="lib-match-card__team">
                        ${logo(m.home?.logo_path, home)}
                        <strong>${esc(home)}</strong>
                    </div>

                    <div class="lib-match-card__score">
                        ${esc(score)}
                    </div>

                    <div class="lib-match-card__team is-away">
                        <strong>${esc(away)}</strong>
                        ${logo(m.away?.logo_path, away)}
                    </div>

                </div>

                <div class="lib-match-card__footer">
                    <span>${esc(date)}</span>

                    <button
                        type="button"
                        data-open-result="${esc(m.id)}"
                    >
                        ${finished ? "EDITAR RESULTADO" : "LANÇAR RESULTADO"}
                    </button>
                </div>
            </article>
        `;
    }

    // ==========================================
    // FASE DE GRUPOS — GRUPOS A ATÉ H
    // ==========================================

    const groupMatches = matches.filter(
        m => m.stage === "GROUP_STAGE"
    );

    const groupHTML = groupMatches.length
        ? groups.map(group => {
            const groupGames = groupMatches
                .filter(m => m.group_code === group)
                .sort((a,b) => Number(a.match_order) - Number(b.match_order));

            if (!groupGames.length) return "";

            const done = groupGames.filter(completed).length;

            function renderLeg(leg, title) {
                const games = groupGames.filter(
                    m => Number(m.leg) === leg
                );

                return `
                    <div class="lib-match-leg">
                        <div class="lib-match-leg__header">
                            <strong>${title}</strong>
                            <span>${games.length} PARTIDAS</span>
                        </div>

                        <div class="lib-match-leg__list">
                            ${games.map(m =>
                                renderMatch(m, `GRUPO ${group} · ${title}`)
                            ).join("")}
                        </div>
                    </div>
                `;
            }

            return `
                <section
                    class="lib-match-group"
                    data-match-section
                >
                    <header class="lib-match-group__header">
                        <div>
                            <span>CCFV // FASE DE GRUPOS</span>
                            <h3>GRUPO ${group}</h3>
                        </div>

                        <div class="lib-match-group__progress">
                            <strong>${done}/${groupGames.length}</strong>
                            <span>RESULTADOS</span>
                        </div>
                    </header>

                    <div class="lib-match-legs">
                        ${renderLeg(1, "IDA")}
                        ${renderLeg(2, "VOLTA")}
                    </div>
                </section>
            `;
        }).join("")
        : "";

    // ==========================================
    // MATA-MATA — OITAVAS ATÉ FINAL
    // ==========================================

    const knockoutHTML = stages.map(([stage, title]) => {
        const stageMatches = matches
            .filter(m => m.stage === stage)
            .sort((a,b) => Number(a.match_order) - Number(b.match_order));

        if (!stageMatches.length) return "";

        const done = stageMatches.filter(completed).length;

        return `
            <section
                class="lib-match-group lib-match-knockout"
                data-match-section
            >
                <header class="lib-match-group__header">
                    <div>
                        <span>CCFV // FASE ELIMINATÓRIA</span>
                        <h3>${title}</h3>
                    </div>

                    <div class="lib-match-group__progress">
                        <strong>${done}/${stageMatches.length}</strong>
                        <span>RESULTADOS</span>
                    </div>
                </header>

                <div class="lib-match-leg__list">
                    ${stageMatches.map(m =>
                        renderMatch(
                            m,
                            m.stage === "FINAL"
                                ? "FINAL · JOGO ÚNICO"
                                : `${title} · ${m.tie_code || ""} · ${Number(m.leg) === 2 ? "VOLTA" : "IDA"}`
                        ).replace(
                            'class="lib-match-card"',
                            'class="lib-match-card lib-match-card--knockout"'
                        )
                    ).join("")}
                </div>
            </section>
        `;
    }).join("");

    container.innerHTML = `
        <div class="lib-matches-toolbar">
            <div>
                <strong>AGENDA DE JOGOS</strong>
                <span>${matches.length} PARTIDAS CADASTRADAS</span>
            </div>

            <input
                id="matches-search"
                type="search"
                placeholder="Buscar clube ou confronto..."
                value="${esc(previousSearch)}"
            >
        </div>

        ${groupHTML}
        ${knockoutHTML}

        ${
            matches.length
                ? ""
                : `<div class="lib-empty-matches">
                    <strong>NENHUMA PARTIDA GERADA</strong>
                    <span>Os jogos aparecerão aqui após a geração da fase.</span>
                  </div>`
        }
    `;

    // ==========================================
    // BUSCA DINÂMICA
    // ==========================================

    const search = $("#matches-search");

    search?.addEventListener("input", () => {
        const query = search.value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

        container.querySelectorAll("[data-match-search]").forEach(card => {
            const text = card.dataset.matchSearch
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();

            card.hidden = !text.includes(query);
        });

        container.querySelectorAll("[data-match-section]").forEach(section => {
            const cards = [...section.querySelectorAll("[data-match-search]")];

            section.hidden = cards.length > 0 &&
                cards.every(card => card.hidden);
        });
    });
}
