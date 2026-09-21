(() => {
    "use strict";

    const state = {
        client: null,
        championship: null,
        clubs: [],
        standings: [],
        matches: []
    };

    const phaseLabel = {
        DRAFT: "DRAFT",
        REGISTRATIONS: "INSCRIÇÕES",
        CLUB_SELECTION: "ESCOLHA DE CLUBE",
        DRAW: "SORTEIO",
        GROUP_STAGE: "FASE DE GRUPOS",
        ROUND_OF_16: "OITAVAS",
        QUARTERFINALS: "QUARTAS",
        SEMIFINALS: "SEMIFINAIS",
        FINAL: "FINAL",
        CLOSED: "ENCERRADA",
        ARCHIVED: "ARQUIVADA"
    };

    const resultStatuses = ["VALIDATED", "WO", "ADMIN_DECISION"];

    const esc = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    function clubLogo(slug, logoPath = "") {
        const clean = String(slug || "").trim().toLowerCase();

        const fallback = clean
            ? `/assets/images/champions/clubs/${clean}.png`
            : "";

        const stored = String(logoPath || "").trim();

        if (stored.startsWith("/assets/images/champions/clubs/")) {
            return stored;
        }

        if (stored.startsWith("assets/images/champions/clubs/")) {
            return `/${stored}`;
        }

        return fallback;
    }

    function logoMarkup(slug, logoPath = "", alt = "") {
        const src = clubLogo(slug, logoPath);
        const fallback = clubLogo(slug, "");

        if (!src) return "";

        return `
            <img
                src="${esc(src)}"
                alt="${esc(alt)}"
                loading="lazy"
                data-fallback="${esc(fallback)}"
                onerror="
                    if (!this.dataset.fallbackUsed) {
                        this.dataset.fallbackUsed='1';
                        this.src=this.dataset.fallback;
                    } else {
                        this.style.visibility='hidden';
                    }
                "
            >
        `;
    }

    async function getClient() {
        if (window.CCFVAuth?.getClient) {
            return window.CCFVAuth.getClient();
        }

        const started = Date.now();

        while (!window.CCFVAuth?.getClient) {
            if (Date.now() - started > 10000) {
                throw new Error("Supabase não está disponível.");
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return window.CCFVAuth.getClient();
    }

    async function load() {

        state.client = state.client || await getClient();

        const info = await state.client
            .from("championship_public_info")
            .select("*")
            .eq("code", "CCFV-CL-S01")
            .maybeSingle();

        if (info.error) throw info.error;

        state.championship = info.data;

        if (!state.championship) {
            renderEmpty("Temporada da Champions ainda não cadastrada.");
            return;
        }

        const id = state.championship.id;

        const [clubs, standings, matches] = await Promise.all([

            state.client
                .from("championship_public_clubs")
                .select("*")
                .eq("championship_id", id)
                .order("sort_order", { ascending: true }),

            state.client
                .from("championship_public_standings")
                .select("*")
                .eq("championship_id", id)
                .order("group_code")
                .order("position"),

            state.client
                .from("championship_public_matches")
                .select("*")
                .eq("championship_id", id)
                .order("round_number")
                .order("match_number")
        ]);

        if (clubs.error) throw clubs.error;
        if (standings.error) throw standings.error;
        if (matches.error) throw matches.error;

        state.clubs = clubs.data || [];
        state.standings = standings.data || [];
        state.matches = matches.data || [];

        render();
    }

    function render() {

        const c = state.championship;

        document.querySelector("#champions-season-label").textContent =
            c.season_label || "SEASON 01";

        document.querySelector("#champions-season-status").textContent =
            phaseLabel[c.status] || c.status || "DRAFT";

        document.querySelector("#hero-phase").textContent =
            phaseLabel[c.status] || c.status || "DRAFT";

        const participants = new Set(
            state.clubs
                .map(item => item.participant_id)
                .filter(Boolean)
        ).size;

        const occupied = state.clubs.filter(
            item => item.participant_id
        ).length;

        document.querySelector("#hero-participants").textContent =
            `${participants} / ${c.max_participants || 32}`;

        document.querySelector("#hero-clubs").textContent =
            `${occupied} / ${c.total_clubs || 32}`;

        renderClubs();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderChampion();
    }

    function renderClubs() {

        const el = document.querySelector("#champions-clubs-grid");

        if (!state.clubs.length) {
            el.innerHTML = `<div class="ccfv-champions-empty">Nenhum clube cadastrado.</div>`;
            return;
        }

        el.innerHTML = state.clubs.map(club => `
            <article class="ccfv-champions-club">

                ${logoMarkup(
                    club.slug,
                    club.logo_path,
                    club.name
                )}

                <div class="ccfv-champions-club__name">
                    <strong>${esc(club.name)}</strong>
                    <span>${esc(club.country || "EUROPA")}</span>
                </div>

                <span class="ccfv-champions-club__status">
                    ${esc(
                        club.participant_id
                            ? club.participant_name || "OCUPADO"
                            : "DISPONÍVEL"
                    )}
                </span>

            </article>
        `).join("");
    }

    function renderGroups() {

        const el = document.querySelector("#champions-groups-grid");

        const groups = [...new Set(
            state.standings.map(item => item.group_code)
        )].sort();

        if (!groups.length) {
            el.innerHTML = `
                <div class="ccfv-champions-empty">
                    Os grupos ainda não foram sorteados.
                </div>
            `;
            return;
        }

        el.innerHTML = groups.map(code => {

            const rows = state.standings
                .filter(item => item.group_code === code)
                .sort(
                    (a,b) =>
                        Number(a.position || 99) -
                        Number(b.position || 99)
                );

            return `
                <article class="ccfv-champions-group">

                    <div class="ccfv-champions-group__head">
                        <strong>GRUPO ${esc(code)}</strong>
                        <span>TOP 2 AVANÇA</span>
                    </div>

                    <div class="ccfv-champions-group__table">

                        ${rows.map(row => `
                            <div class="ccfv-champions-group__row ${row.qualified ? "is-qualified" : ""}">

                                <span>${esc(row.position)}</span>

                                ${logoMarkup(
                                    row.club_slug,
                                    row.logo_path,
                                    row.club_name
                                )}

                                <span>
                                    ${esc(row.club_name)}
                                    <small>${esc(row.participant_name || "")}</small>
                                </span>

                                <small>${esc(row.points)} PTS</small>

                                <small>
                                    ${row.goal_difference > 0 ? "+" : ""}
                                    ${esc(row.goal_difference)}
                                </small>

                            </div>
                        `).join("")}

                    </div>

                </article>
            `;
        }).join("");
    }

    function renderMatches() {

        const el = document.querySelector("#champions-matches");

        const ordered = [...state.matches]
            .filter(match =>
                [
                    "GROUP_STAGE",
                    "ROUND_OF_16",
                    "QUARTERFINALS",
                    "SEMIFINALS",
                    "FINAL"
                ].includes(match.phase)
            );

        if (!ordered.length) {
            el.innerHTML = `
                <div class="ccfv-champions-empty">
                    Nenhuma partida cadastrada ainda.
                </div>
            `;
            return;
        }

        el.innerHTML = ordered.map(match => {

            const finished = resultStatuses.includes(
                String(match.status || "")
            );

            const score =
                finished
                    ? `${esc(match.home_score)} × ${esc(match.away_score)}`
                    : "VS";

            return `
                <article class="ccfv-champions-match">

                    <div class="ccfv-champions-match__side">

                        ${logoMarkup(
                            match.home_club_slug,
                            match.home_logo_path,
                            match.home_club_name
                        )}

                        <strong>
                            ${esc(match.home_club_name || "A DEFINIR")}
                        </strong>

                        <small>
                            ${esc(match.home_player_name || "A DEFINIR")}
                        </small>

                    </div>

                    <div class="ccfv-champions-match__score">

                        <strong>${score}</strong>

                        <span>
                            ${esc(
                                phaseLabel[match.phase] ||
                                match.phase
                            )}
                        </span>

                        ${
                            match.scheduled_at
                                ? `<small>${esc(formatDateTime(match.scheduled_at))}</small>`
                                : ""
                        }

                    </div>

                    <div class="ccfv-champions-match__side ccfv-champions-match__side--away">

                        <strong>
                            ${esc(match.away_club_name || "A DEFINIR")}
                        </strong>

                        <small>
                            ${esc(match.away_player_name || "A DEFINIR")}
                        </small>

                        ${logoMarkup(
                            match.away_club_slug,
                            match.away_logo_path,
                            match.away_club_name
                        )}

                    </div>

                </article>
            `;
        }).join("");
    }

    function bracketCard(match) {

        if (!match) return "";

        const finished = resultStatuses.includes(
            String(match.status || "")
        );

        return `
            <div class="ccfv-bracket-match">

                <div class="ccfv-bracket-line">

                    ${logoMarkup(
                        match.home_club_slug,
                        match.home_logo_path,
                        match.home_club_name
                    )}

                    <span>${esc(match.home_club_name || "A DEFINIR")}</span>

                    <strong>
                        ${finished ? esc(match.home_score) : "—"}
                    </strong>

                </div>

                <div class="ccfv-bracket-line">

                    ${logoMarkup(
                        match.away_club_slug,
                        match.away_logo_path,
                        match.away_club_name
                    )}

                    <span>${esc(match.away_club_name || "A DEFINIR")}</span>

                    <strong>
                        ${finished ? esc(match.away_score) : "—"}
                    </strong>

                </div>

            </div>
        `;
    }

    function renderKnockout() {

        const phases = {
            ROUND_OF_16: "#knockout-r16",
            QUARTERFINALS: "#knockout-qf",
            SEMIFINALS: "#knockout-sf",
            FINAL: "#knockout-final"
        };

        Object.entries(phases).forEach(([phase, selector]) => {

            const matches = state.matches.filter(
                match => match.phase === phase
            );

            const target = document.querySelector(selector);

            target.innerHTML = matches.length
                ? matches.map(bracketCard).join("")
                : `<div class="ccfv-champions-empty">Aguardando</div>`;
        });
    }

    function renderChampion() {

        const final = state.matches.find(
            match =>
                match.phase === "FINAL" &&
                resultStatuses.includes(
                    String(match.status || "")
                )
        );

        const championClub = final?.winner_club_id
            ? state.clubs.find(
                club =>
                    String(club.championship_club_id) ===
                    String(final.winner_club_id)
            )
            : null;

        const championName =
            championClub?.name ||
            final?.winner_club_name ||
            "A DEFINIR";

        document.querySelector("#season-champion").textContent =
            championName;

        document.querySelector("#champion-name").textContent =
            championName;

        document.querySelector("#champion-club").textContent =
            championClub
                ? `Representado por ${championClub.participant_name || "participante oficial"} — ${state.championship.season_label}`
                : "A grande taça ainda está em disputa.";
    }

    function formatDateTime(value) {

        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(date);
    }

    function renderEmpty(message) {
        document.querySelectorAll(".ccfv-champions-empty")
            .forEach(el => {
                el.textContent = message;
            });
    }

    window.addEventListener("DOMContentLoaded", async () => {

        try {
            await load();

            /*
             * A página pública acompanha o Admin automaticamente.
             * Não depende de editar HTML manualmente depois de um resultado.
             */
            window.setInterval(() => {
                load().catch(error =>
                    console.warn(
                        "CCFV Champions live refresh:",
                        error
                    )
                );
            }, 15000);

        } catch (error) {
            console.error("CCFV Champions:", error);
            renderEmpty(
                error?.message ||
                "Não foi possível carregar a Champions."
            );
        }

    });

})();
