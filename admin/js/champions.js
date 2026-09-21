(() => {
    "use strict";

    const state = {
        client: null,
        user: null,
        championshipId: null,
        championship: null,
        settings: null,
        clubs: [],
        registrations: [],
        pots: [],
        standings: [],
        matches: [],
        history: [],
        hall: [],
        audit: [],
        seasons: [],
        activeTab: "dashboard"
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

    function normalizeSlug(value) {
        return String(value || "")
            .trim()
            .toLowerCase();
    }

    function clubLogo(slug, logoPath = "") {
        const clean = normalizeSlug(slug);

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
                class="club-logo"
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

    function showMessage(message, error = false) {
        const el = document.querySelector("#global-message");
        if (!el) return;

        el.hidden = false;
        el.textContent = message;
        el.classList.toggle("is-error", error);

        clearTimeout(showMessage.timer);
        showMessage.timer = setTimeout(() => {
            el.hidden = true;
        }, 6500);
    }

    function phaseText(phase) {
        return phaseLabel[String(phase || "").toUpperCase()] || phase || "—";
    }

    function statusText(status) {
        const map = {
            SCHEDULED: "AGENDADA",
            IN_PROGRESS: "EM ANDAMENTO",
            PENDING_VALIDATION: "PENDENTE",
            VALIDATED: "FINALIZADA",
            WO: "W.O.",
            ADMIN_DECISION: "DECISÃO ADMIN",
            CANCELLED: "CANCELADA"
        };

        return map[String(status || "").toUpperCase()] || status || "—";
    }

    function formatDateTime(value) {
        if (!value) return "A DEFINIR";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "A DEFINIR";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(date);
    }

    function localDateTimeValue(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        const pad = number => String(number).padStart(2, "0");

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

    async function loadData() {

        if (!state.client) {
            state.client = await getClient();
        }

        const seasonsResult = await state.client
            .from("championship_public_info")
            .select("*")
            .order("season_number", { ascending: false });

        if (seasonsResult.error) throw seasonsResult.error;

        state.seasons = seasonsResult.data || [];

        state.championship = state.seasons[0] || null;
        state.championshipId = state.championship?.id || null;

        if (!state.championshipId) {
            throw new Error("Nenhuma temporada da Champions encontrada.");
        }

        const [
            clubsResult,
            registrationsResult,
            standingsResult,
            matchesResult,
            settingsResult,
            potsResult,
            historyResult,
            hallResult,
            auditResult
        ] = await Promise.all([

            state.client
                .from("championship_public_clubs")
                .select("*")
                .eq("championship_id", state.championshipId)
                .order("sort_order", { ascending: true }),

            state.client
                .from("championship_registrations")
                .select("id,participant_id,selected_club_id,status")
                .eq("championship_id", state.championshipId),

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
                .order("round_number")
                .order("match_number"),

            state.client
                .from("championship_settings")
                .select("*")
                .eq("championship_id", state.championshipId)
                .maybeSingle(),

            state.client
                .from("championship_pots")
                .select(`
                    id,
                    championship_id,
                    pot_number,
                    name,
                    championship_pot_members(
                        id,
                        seed_number,
                        registration_id
                    )
                `)
                .eq("championship_id", state.championshipId)
                .order("pot_number"),

            state.client
                .from("ccfv_champions_public_history_v2")
                .select("*")
                .order("season_number", { ascending: false })
                .order("final_position", { ascending: true, nullsFirst: false }),

            state.client
                .from("ccfv_champions_public_hall_v2")
                .select("*")
                .order("season_number", { ascending: false })
                .order("created_at", { ascending: false }),

            state.client
                .from("audit_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100)
        ]);

        if (clubsResult.error) throw clubsResult.error;
        if (registrationsResult.error) console.warn("Registrations:", registrationsResult.error);
        if (standingsResult.error) console.warn("Standings:", standingsResult.error);
        if (matchesResult.error) console.warn("Matches:", matchesResult.error);
        if (settingsResult.error) console.warn("Settings:", settingsResult.error);
        if (potsResult.error) console.warn("Pots:", potsResult.error);
        if (historyResult.error) console.warn("History:", historyResult.error);
        if (hallResult.error) console.warn("Hall:", hallResult.error);
        if (auditResult.error) console.warn("Audit:", auditResult.error);

        state.clubs = clubsResult.data || [];
        state.registrations = registrationsResult.data || [];
        state.standings = standingsResult.data || [];
        state.matches = matchesResult.data || [];
        state.settings = settingsResult.data || null;
        state.pots = potsResult.data || [];
        state.history = historyResult.data || [];
        state.hall = hallResult.data || [];
        state.audit = auditResult.data || [];

        renderAll();
    }

    function renderAll() {
        renderDashboard();
        renderSeason();
        renderClubs();
        renderPots();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderHistory();
        renderAudit();
    }

    function renderDashboard() {
        const c = state.championship || {};

        const occupied = state.clubs.filter(item => item.participant_id).length;
        const completed = state.matches.filter(item => resultStatuses.includes(String(item.status || ""))).length;
        const pending = state.matches.filter(item => !resultStatuses.includes(String(item.status || ""))).length;
        const qualified = state.standings.filter(item => item.qualified).length;

        const final = state.matches.find(item =>
            item.phase === "FINAL" &&
            resultStatuses.includes(String(item.status || ""))
        );

        document.querySelector("#kpi-status").textContent =
            phaseText(c.status);

        document.querySelector("#kpi-participants").textContent =
            `${occupied} / ${c.max_participants || 32}`;

        document.querySelector("#kpi-clubs").textContent =
            `${occupied} / ${c.total_clubs || 32}`;

        document.querySelector("#kpi-matches").textContent =
            `${completed} / ${state.matches.length || 48}`;

        document.querySelector("#kpi-pending").textContent =
            String(pending);

        document.querySelector("#kpi-champion").textContent =
            final?.winner_club_id
                ? (
                    state.clubs.find(
                        club => String(club.championship_club_id) === String(final.winner_club_id)
                    )?.name ||
                    final.winner_club_name ||
                    "DEFINIDO"
                )
                : "A DEFINIR";

        const next = [...state.matches]
            .filter(item => !resultStatuses.includes(String(item.status || "")))
            .sort((a,b) => {
                const da = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
                const db = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
                return da - db || Number(a.match_number || 0) - Number(b.match_number || 0);
            })
            .slice(0, 8);

        const holder = document.querySelector("#dashboard-next-matches");

        holder.innerHTML = next.length
            ? next.map(match => compactMatch(match)).join("")
            : `<div class="empty-state">Nenhum jogo pendente.</div>`;
    }

    function compactMatch(match) {
        return `
            <article class="compact-match">
                <div>
                    <span>${esc(phaseText(match.phase))} • #${esc(match.match_number)}</span>
                    <strong>${esc(match.home_club_name || "A DEFINIR")} × ${esc(match.away_club_name || "A DEFINIR")}</strong>
                </div>
                <div>
                    <span>${statusText(match.status)}</span>
                    <strong>${esc(formatDateTime(match.scheduled_at))}</strong>
                </div>
            </article>
        `;
    }

    function renderSeason() {
        const c = state.championship || {};
        const settings = state.settings || {};

        document.querySelector("#season-name").textContent = c.name || "—";
        document.querySelector("#season-label").textContent = c.season_label || "—";
        document.querySelector("#season-status").textContent = phaseText(c.status);
        document.querySelector("#season-start").textContent = c.start_date || "—";
        document.querySelector("#season-end").textContent = c.end_date || "—";

        document.querySelector("#season-settings").innerHTML = `
            <div><span>TIME</span><strong>${esc(settings.match_team_mode || "AUTHENTIC")}</strong></div>
            <div><span>DURAÇÃO</span><strong>${esc(settings.match_minutes || 10)} MIN</strong></div>
            <div><span>CONDIÇÃO</span><strong>${esc(settings.condition_mode || "NORMAL")}</strong></div>
            <div><span>EXTRA TIME</span><strong>${settings.extra_time_knockout ? "MATA-MATA" : "NÃO"}</strong></div>
            <div><span>PÊNALTIS</span><strong>${settings.penalties_knockout ? "MATA-MATA" : "NÃO"}</strong></div>
            <div><span>TIME REGISTRADO</span><strong>${settings.registered_club_required ? "OBRIGATÓRIO" : "NÃO"}</strong></div>
        `;

        const seasonList = document.querySelector("#season-list");

        if (seasonList) {
            seasonList.innerHTML = state.seasons.map(season => `
                <div class="season-item ${String(season.id) === String(state.championshipId) ? "is-current" : ""}">
                    <span>${esc(season.season_label)}</span>
                    <strong>${esc(phaseText(season.status))}</strong>
                </div>
            `).join("");
        }
    }

    function renderClubs() {
        const tbody = document.querySelector("#clubs-table");
        if (!tbody) return;

        const search = String(document.querySelector("#club-search")?.value || "").trim().toLowerCase();
        const status = String(document.querySelector("#club-status-filter")?.value || "").toUpperCase();

        const rows = state.clubs
            .filter(club => {
                const haystack = [
                    club.name,
                    club.participant_name,
                    club.country
                ].join(" ").toLowerCase();

                return (!search || haystack.includes(search)) &&
                    (!status || String(club.status || "").toUpperCase() === status);
            });

        tbody.innerHTML = rows.map(club => `
            <tr>
                <td>${logoMarkup(club.slug, club.logo_path, club.name)}</td>
                <td><strong>${esc(club.name)}</strong></td>
                <td>${esc(club.country || "—")}</td>
                <td>
                    <strong>${esc(club.participant_name || "A DEFINIR")}</strong>
                    <small class="table-sub">${esc(club.participant_platform || "")}</small>
                </td>
                <td>${esc(club.participant_platform || "—")}</td>
                <td><span class="status-pill status-${esc(String(club.status || "").toLowerCase())}">${esc(statusText(club.status))}</span></td>
                <td>${esc(club.pot_number ?? "—")}</td>
            </tr>
        `).join("") || `
            <tr><td colspan="7"><div class="empty-state">Nenhum clube encontrado.</div></td></tr>
        `;
    }

    function renderPots() {
        const holder = document.querySelector("#pots-grid");
        if (!holder) return;

        if (!state.pots.length) {
            holder.innerHTML = `<div class="empty-state">Potes ainda não preparados.</div>`;
            return;
        }

        holder.innerHTML = state.pots.map(pot => {

            const members = [...(pot.championship_pot_members || [])]
                .sort((a,b) => Number(a.seed_number || 99) - Number(b.seed_number || 99));

            return `
                <article class="pot-card">
                    <header>
                        <span>POTE ${esc(pot.pot_number)}</span>
                        <strong>${members.length}/8</strong>
                    </header>

                    <div class="pot-members">
                        ${members.map(member => {

                            const registration =
                                state.registrations.find(
                                    item =>
                                        String(item.id) ===
                                        String(member.registration_id)
                                ) || {};

                            const club = state.clubs.find(
                                item =>
                                    String(item.championship_club_id) ===
                                    String(registration.selected_club_id)
                            );

                            const participantName =
                                club?.participant_name ||
                                state.clubs.find(
                                    item =>
                                        String(item.participant_id) ===
                                        String(registration.participant_id)
                                )?.participant_name ||
                                "A DEFINIR";

                            return `
                                <div class="pot-member">
                                    ${logoMarkup(club?.slug, club?.logo_path, club?.name || "Clube")}
                                    <div>
                                        <strong>${esc(club?.name || "A DEFINIR")}</strong>
                                        <small>${esc(participantName)}</small>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderGroups() {
        const holder = document.querySelector("#admin-groups-grid");
        if (!holder) return;

        const groups = ["A","B","C","D","E","F","G","H"];

        holder.innerHTML = groups.map(code => {

            const rows = state.standings
                .filter(item => item.group_code === code)
                .sort((a,b) => Number(a.position || 99) - Number(b.position || 99));

            return `
                <article class="admin-group">

                    <header>
                        <div>
                            <span>GRUPO</span>
                            <h2>${code}</h2>
                        </div>

                        <span>TOP 2 AVANÇA</span>
                    </header>

                    <div class="group-table">
                        <div class="group-head">
                            <span>#</span><span>CLUBE</span><span>J</span><span>SG</span><span>PTS</span>
                        </div>

                        ${
                            rows.length
                                ? rows.map(row => `
                                    <div class="group-row ${row.qualified ? "is-qualified" : ""}">
                                        <span>${esc(row.position)}</span>
                                        <div class="group-club">
                                            ${logoMarkup(row.club_slug, row.logo_path, row.club_name)}
                                            <div>
                                                <strong>${esc(row.club_name)}</strong>
                                                <small>${esc(row.participant_name || "")}</small>
                                            </div>
                                        </div>
                                        <span>${esc(row.played)}</span>
                                        <span>${row.goal_difference > 0 ? "+" : ""}${esc(row.goal_difference)}</span>
                                        <strong>${esc(row.points)}</strong>
                                    </div>
                                `).join("")
                                : `
                                    <div class="empty-state">Aguardando sorteio.</div>
                                `
                        }

                    </div>

                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        const holder = document.querySelector("#matches-admin-list");
        if (!holder) return;

        const phase = String(document.querySelector("#match-phase-filter")?.value || "");
        const status = String(document.querySelector("#match-status-filter")?.value || "");
        const group = String(document.querySelector("#match-group-filter")?.value || "");

        let matches = [...state.matches];

        if (phase) {
            matches = matches.filter(match => match.phase === phase);
        }

        if (status) {
            matches = matches.filter(match => match.status === status);
        }

        if (group) {
            const groupIds = new Set(
                state.standings
                    .filter(row => row.group_code === group)
                    .map(row => String(row.group_id))
            );

            matches = matches.filter(match =>
                match.phase !== "GROUP_STAGE" ||
                groupIds.has(String(match.group_id))
            );
        }

        holder.innerHTML = matches.length
            ? matches.map(renderMatchCard).join("")
            : `<div class="empty-state">Nenhuma partida encontrada.</div>`;
    }

    function renderMatchCard(match) {
        const finished = resultStatuses.includes(String(match.status || ""));

        const schedule = localDateTimeValue(match.scheduled_at);

        return `
            <article class="admin-match">

                <div class="admin-match__meta">
                    <span>${esc(phaseText(match.phase))}</span>
                    <strong>#${esc(match.match_number)}</strong>
                    ${match.group_id ? `<small>GRUPO ${esc(groupCodeFromId(match.group_id))}</small>` : ""}
                </div>

                <div class="admin-match__team">
                    ${logoMarkup(match.home_club_slug, match.home_logo_path, match.home_club_name)}
                    <div>
                        <strong>${esc(match.home_club_name || "A DEFINIR")}</strong>
                        <small>${esc(match.home_player_name || "A DEFINIR")}</small>
                    </div>
                </div>

                <div class="admin-match__score">
                    ${
                        finished
                            ? `
                                <strong>${esc(match.home_score)} × ${esc(match.away_score)}</strong>
                                ${match.penalties_played ? `<small>PÊNALTIS ${esc(match.home_penalties)} × ${esc(match.away_penalties)}</small>` : ""}
                              `
                            : `<strong>VS</strong>`
                    }

                    <span>${esc(statusText(match.status))}</span>
                </div>

                <div class="admin-match__team admin-match__team--away">
                    <div>
                        <strong>${esc(match.away_club_name || "A DEFINIR")}</strong>
                        <small>${esc(match.away_player_name || "A DEFINIR")}</small>
                    </div>
                    ${logoMarkup(match.away_club_slug, match.away_logo_path, match.away_club_name)}
                </div>

                <div class="admin-match__operations">

                    <label>
                        <span>DATA/HORA</span>
                        <input
                            type="datetime-local"
                            value="${esc(schedule)}"
                            data-schedule-input="${esc(match.id)}"
                            ${finished ? "disabled" : ""}
                        >
                    </label>

                    <button
                        class="btn"
                        data-schedule="${esc(match.id)}"
                        ${finished ? "disabled" : ""}
                    >
                        AGENDAR
                    </button>

                    ${
                        finished
                            ? `
                                <a
                                    class="btn"
                                    href="${esc(match.evidence_url || "#")}"
                                    ${match.evidence_url ? 'target="_blank" rel="noopener"' : ""}
                                    ${match.evidence_url ? "" : 'aria-disabled="true"'}
                                >
                                    EVIDÊNCIA
                                </a>
                              `
                            : `
                                <button
                                    class="btn btn-primary"
                                    data-open-result="${esc(match.id)}"
                                >
                                    LANÇAR RESULTADO
                                </button>
                              `
                    }

                </div>

            </article>
        `;
    }

    function groupCodeFromId(groupId) {
        const row = state.standings.find(
            item => String(item.group_id) === String(groupId)
        );

        return row?.group_code || "—";
    }

    function renderKnockout() {
        const phases = [
            ["ROUND_OF_16", "OITAVAS", 8],
            ["QUARTERFINALS", "QUARTAS", 4],
            ["SEMIFINALS", "SEMIFINAIS", 2],
            ["FINAL", "FINAL", 1]
        ];

        for (const [phase, label, expected] of phases) {

            const matches = state.matches
                .filter(item => item.phase === phase)
                .sort((a,b) => Number(a.match_number || 0) - Number(b.match_number || 0));

            const done = matches.filter(
                item => resultStatuses.includes(String(item.status || ""))
            ).length;

            const idMap = {
                ROUND_OF_16: "#ko-r16",
                QUARTERFINALS: "#ko-qf",
                SEMIFINALS: "#ko-sf",
                FINAL: "#ko-final"
            };

            document.querySelector(idMap[phase]).textContent =
                `${done} / ${expected}`;

            const holder = document.querySelector("#knockout-list");

            if (!holder) continue;
        }

        const holder = document.querySelector("#knockout-list");

        holder.innerHTML = phases.map(([phase, label]) => {

            const matches = state.matches
                .filter(item => item.phase === phase)
                .sort((a,b) => Number(a.match_number || 0) - Number(b.match_number || 0));

            return `
                <article class="admin-card knockout-phase">
                    <header>
                        <div>
                            <span>CCFV // ${label}</span>
                            <h2>${label}</h2>
                        </div>

                        <button
                            class="btn"
                            data-action="phase-action"
                            data-phase="${phase}"
                        >
                            ${phase === "ROUND_OF_16" ? "GERAR OITAVAS" : "GERAR FASE"}
                        </button>
                    </header>

                    <div class="knockout-match-grid">
                        ${
                            matches.length
                                ? matches.map(renderKnockoutMatch).join("")
                                : `<div class="empty-state">Aguardando fase anterior.</div>`
                        }
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderKnockoutMatch(match) {
        const finished = resultStatuses.includes(String(match.status || ""));

        return `
            <article class="ko-match">

                <div class="ko-match__team">
                    ${logoMarkup(match.home_club_slug, match.home_logo_path, match.home_club_name)}
                    <strong>${esc(match.home_club_name || "A DEFINIR")}</strong>
                    ${match.home_player_name ? `<small>${esc(match.home_player_name)}</small>` : ""}
                    <b>${finished ? esc(match.home_score) : "—"}</b>
                </div>

                <div class="ko-match__center">
                    <span>${esc(match.bracket_slot || `#${match.match_number}`)}</span>
                    <small>${esc(statusText(match.status))}</small>
                </div>

                <div class="ko-match__team ko-match__team--away">
                    <b>${finished ? esc(match.away_score) : "—"}</b>
                    <strong>${esc(match.away_club_name || "A DEFINIR")}</strong>
                    ${match.away_player_name ? `<small>${esc(match.away_player_name)}</small>` : ""}
                    ${logoMarkup(match.away_club_slug, match.away_logo_path, match.away_club_name)}
                </div>

                <div class="ko-match__actions">
                    ${
                        finished
                            ? `<span class="status-pill">${esc(statusText(match.status))}</span>`
                            : match.id
                                ? `<button class="btn btn-primary" data-open-result="${esc(match.id)}">RESULTADO</button>`
                                : ""
                    }
                </div>

            </article>
        `;
    }

    function renderHistory() {
        const tbody = document.querySelector("#history-table");
        const hall = document.querySelector("#hall-list");

        if (tbody) {
            tbody.innerHTML = state.history.length
                ? state.history.map(item => `
                    <tr>
                        <td>${esc(item.final_position ?? "—")}</td>
                        <td>
                            <strong>${esc(item.participant_name || "—")}</strong>
                            <small class="table-sub">${esc(item.platform || "")}</small>
                        </td>
                        <td>
                            <div class="history-club">
                                ${logoMarkup(item.club_slug, item.logo_path, item.club_name)}
                                ${esc(item.club_name || "—")}
                            </div>
                        </td>
                        <td>${esc(phaseText(item.phase_reached))}</td>
                        <td>${esc(item.matches_played)}</td>
                        <td>${esc(item.wins)}</td>
                        <td>${esc(item.draws)}</td>
                        <td>${esc(item.losses)}</td>
                    </tr>
                `).join("")
                : `<tr><td colspan="8"><div class="empty-state">Nenhum histórico registrado.</div></td></tr>`;
        }

        if (hall) {
            hall.innerHTML = state.hall.length
                ? state.hall.map(item => `
                    <article class="hall-item">
                        ${logoMarkup(item.club_slug, item.logo_path, item.club_name)}
                        <div>
                            <span>${esc(item.season)}</span>
                            <strong>${esc(item.participant_name || "—")}</strong>
                            <small>${esc(item.club_name || "—")} • ${esc(item.title)}</small>
                        </div>
                    </article>
                `).join("")
                : `<div class="empty-state">Nenhum campeão registrado.</div>`;
        }
    }

    function renderAudit() {
        const tbody = document.querySelector("#audit-table");
        if (!tbody) return;

        tbody.innerHTML = state.audit.length
            ? state.audit.map(item => `
                <tr>
                    <td>${esc(formatDateTime(item.created_at))}</td>
                    <td><strong>${esc(item.action)}</strong></td>
                    <td>${esc(item.entity)}</td>
                    <td><code>${esc(item.entity_id || "—")}</code></td>
                    <td>${esc(item.justification || "—")}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="5"><div class="empty-state">Nenhum evento de auditoria encontrado.</div></td></tr>`;
    }

    async function rpc(name, args = {}) {
        if (!state.client) {
            state.client = await getClient();
        }

        showMessage(`Executando ${name}...`);

        const { data, error } = await state.client.rpc(name, args);

        if (error) {
            throw error;
        }

        await loadData();

        showMessage(`${name} concluído.`);
        return data;
    }

    async function scheduleMatch(matchId) {
        const input = document.querySelector(
            `[data-schedule-input="${CSS.escape(matchId)}"]`
        );

        if (!input?.value) {
            throw new Error("Informe a data e o horário da partida.");
        }

        const date = new Date(input.value);

        if (Number.isNaN(date.getTime())) {
            throw new Error("Data/horário inválido.");
        }

        await rpc("champions_schedule_match", {
            p_match_id: matchId,
            p_scheduled_at: date.toISOString()
        });
    }

    function openResult(matchId) {
        const match = state.matches.find(
            item => String(item.id) === String(matchId)
        );

        if (!match) {
            showMessage("Partida não encontrada.", true);
            return;
        }

        document.querySelector("#result-match-id").value = match.id;
        document.querySelector("#result-home-name").textContent = match.home_club_name || "A DEFINIR";
        document.querySelector("#result-away-name").textContent = match.away_club_name || "A DEFINIR";

        const homeLogo = document.querySelector("#result-home-logo");
        const awayLogo = document.querySelector("#result-away-logo");

        homeLogo.src = clubLogo(match.home_club_slug, match.home_logo_path);
        awayLogo.src = clubLogo(match.away_club_slug, match.away_logo_path);

        document.querySelector("#result-home-score").value = match.home_score ?? 0;
        document.querySelector("#result-away-score").value = match.away_score ?? 0;
        document.querySelector("#result-type").value = "NORMAL";
        document.querySelector("#result-winner-side").value = "";
        document.querySelector("#result-home-penalties").value = "";
        document.querySelector("#result-away-penalties").value = "";
        document.querySelector("#result-evidence-url").value = "";
        document.querySelector("#result-notes").value = "";

        document.querySelector("#result-modal-title").textContent =
            `${phaseText(match.phase)} • JOGO ${match.match_number}`;

        document.querySelector("#result-modal").hidden = false;
        document.body.classList.add("modal-open");
    }

    function closeResult() {
        document.querySelector("#result-modal").hidden = true;
        document.body.classList.remove("modal-open");
    }

    async function submitResult() {
        const id = document.querySelector("#result-match-id").value;

        const home = Number(document.querySelector("#result-home-score").value);
        const away = Number(document.querySelector("#result-away-score").value);

        if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
            throw new Error("Informe um placar válido.");
        }

        const type = document.querySelector("#result-type").value;
        const winnerSide = document.querySelector("#result-winner-side").value || null;

        const hpRaw = document.querySelector("#result-home-penalties").value;
        const apRaw = document.querySelector("#result-away-penalties").value;

        const evidence = document.querySelector("#result-evidence-url").value.trim() || null;
        const notes = document.querySelector("#result-notes").value.trim() || null;

        await rpc("champions_submit_result", {
            p_match_id: id,
            p_home_score: home,
            p_away_score: away,
            p_result_type: type,
            p_winner_side: winnerSide,
            p_home_penalties: hpRaw === "" ? null : Number(hpRaw),
            p_away_penalties: apRaw === "" ? null : Number(apRaw),
            p_evidence_url: evidence,
            p_evidence_note: notes,
            p_notes: notes
        });

        closeResult();
    }

    async function executeAction(name, extra = {}) {

        const actions = {
            "prepare-pots": [
                "champions_prepare_pots",
                { p_championship_id: state.championshipId, p_force: true }
            ],

            "draw-groups": [
                "champions_draw_groups",
                { p_championship_id: state.championshipId, p_force: true }
            ],

            "generate-group-matches": [
                "champions_generate_group_matches",
                { p_championship_id: state.championshipId, p_force: false }
            ],

            "recalculate": [
                "champions_recalculate_all_groups",
                { p_championship_id: state.championshipId }
            ],

            "generate-r16": [
                "champions_generate_round_of_16",
                { p_championship_id: state.championshipId, p_force: false }
            ],

            "generate-next": [
                "champions_generate_next_knockout_phase",
                {
                    p_championship_id: state.championshipId,
                    p_current_phase: state.championship?.status
                }
            ],

            "finish-season": [
                "champions_finish_season",
                { p_championship_id: state.championshipId }
            ]
        };

        if (!actions[name]) return;

        const [rpcName, args] = actions[name];

        if (name === "finish-season") {
            const confirmed = window.confirm(
                "ATENÇÃO: finalizar a temporada fecha a Champions e grava Ranking, Histórico e Hall da Fama. Continuar?"
            );

            if (!confirmed) return;
        }

        await rpc(rpcName, args);
    }

    async function createSeason() {

        const numberInput = document.querySelector("#new-season-number");
        const labelInput = document.querySelector("#new-season-label");

        const rawNumber = String(numberInput?.value || "").trim();
        const rawLabel = String(labelInput?.value || "").trim();

        let seasonNumber = null;

        if (rawNumber) {
            seasonNumber = Number(rawNumber);

            if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) {
                throw new Error("Número de temporada inválido.");
            }
        }

        const { data, error } = await state.client.rpc(
            "champions_create_season",
            {
                p_season_number: seasonNumber,
                p_season_label: rawLabel || null
            }
        );

        if (error) throw error;

        if (numberInput) numberInput.value = "";
        if (labelInput) labelInput.value = "";

        showMessage(
            `Nova temporada criada: ${data?.season_label || "OK"}.`
        );

        await loadData();
    }


    function activateTab(tab) {
        state.activeTab = tab;

        document.querySelectorAll("[data-tab]").forEach(link => {
            link.classList.toggle("is-active", link.dataset.tab === tab);
        });

        document.querySelectorAll(".admin-tab").forEach(panel => {
            panel.classList.toggle("is-visible", panel.dataset.panel === tab);
        });

        if (history.replaceState) {
            history.replaceState(null, "", `#${tab}`);
        }
    }

    function bindTabs() {
        document.querySelectorAll("[data-tab]").forEach(link => {
            link.addEventListener("click", event => {
                event.preventDefault();
                activateTab(link.dataset.tab);
            });
        });

        document.querySelectorAll("[data-go-tab]").forEach(button => {
            button.addEventListener("click", () => activateTab(button.dataset.goTab));
        });

        const hash = location.hash.replace("#", "");

        if (hash && document.querySelector(`[data-tab="${CSS.escape(hash)}"]`)) {
            activateTab(hash);
        } else {
            activateTab("dashboard");
        }
    }

    function bindFilters() {
        ["#club-search", "#club-status-filter"].forEach(selector => {
            document.querySelector(selector)?.addEventListener("input", renderClubs);
            document.querySelector(selector)?.addEventListener("change", renderClubs);
        });

        ["#match-phase-filter", "#match-status-filter", "#match-group-filter"].forEach(selector => {
            document.querySelector(selector)?.addEventListener("change", renderMatches);
        });
    }

    function bindEvents() {

        document.querySelector("#btn-refresh")?.addEventListener("click", () => {
            loadData().catch(error => showMessage(error.message || String(error), true));
        });

        document.body.addEventListener("click", async event => {

            const actionButton = event.target.closest("[data-action]");
            const scheduleButton = event.target.closest("[data-schedule]");
            const resultButton = event.target.closest("[data-open-result]");
            const closeButton = event.target.closest("[data-close-modal]");

            try {

                if (closeButton) {
                    closeResult();
                    return;
                }

                if (resultButton) {
                    openResult(resultButton.dataset.openResult);
                    return;
                }

                if (scheduleButton) {
                    await scheduleMatch(scheduleButton.dataset.schedule);
                    return;
                }

                if (actionButton) {

                    const name = actionButton.dataset.action;

                    if (name === "refresh-matches") {
                        renderMatches();
                        return;
                    }

                    if (name === "phase-action") {

                        const phase = actionButton.dataset.phase;

                        if (phase === "ROUND_OF_16") {
                            await executeAction("generate-r16");
                            return;
                        }

                        const previous = {
                            QUARTERFINALS: "ROUND_OF_16",
                            SEMIFINALS: "QUARTERFINALS",
                            FINAL: "SEMIFINALS"
                        }[phase];

                        if (previous) {
                            await rpc("champions_generate_next_knockout_phase", {
                                p_championship_id: state.championshipId,
                                p_current_phase: previous
                            });
                        }

                        return;
                    }

                    await executeAction(name);
                }

            } catch (error) {
                console.error(error);
                showMessage(error?.message || String(error), true);
            }
        });

        document.querySelector("#btn-submit-result")?.addEventListener("click", async () => {
            try {
                await submitResult();
            } catch (error) {
                showMessage(error?.message || String(error), true);
            }
        });

        document.querySelector("#btn-create-season")?.addEventListener("click", async () => {
            try {
                await createSeason();
            } catch (error) {
                showMessage(error?.message || String(error), true);
            }
        });

        document.querySelector("#result-type")?.addEventListener("change", event => {
            const knockout = ["ROUND_OF_16","QUARTERFINALS","SEMIFINALS","FINAL"].includes(
                state.matches.find(
                    item => String(item.id) === String(document.querySelector("#result-match-id").value)
                )?.phase
            );

            const winner = document.querySelector("#result-winner-side");
            winner.disabled = !knockout || event.target.value === "WO" && false;
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeResult();
            }
        });
    }

    async function boot() {

        bindTabs();
        bindFilters();
        bindEvents();

        try {
            state.client = await getClient();

            const { data, error } = await state.client.auth.getUser();

            if (error || !data?.user) {
                throw new Error("Sessão administrativa não encontrada.");
            }

            state.user = data.user;

            document.querySelector("#admin-user-email").textContent =
                data.user.email || "ADMIN";

        } catch (error) {
            showMessage(error?.message || String(error), true);
            return;
        }

        await loadData();
    }

    window.addEventListener("DOMContentLoaded", () => {
        boot().catch(error => {
            console.error(error);
            showMessage(error?.message || "Falha ao carregar painel.", true);
        });
    });

})();
