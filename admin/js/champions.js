(() => {
    "use strict";

    const state = {
        client: null,
        user: null,
        championship: null,
        clubs: [],
        players: [],
        registrations: [],
        pots: [],
        potMembers: [],
        groups: [],
        standings: [],
        matches: [],
        history: [],
        hall: []
    };

    const phaseLabel = {
        DRAFT:"DRAFT", REGISTRATIONS:"INSCRIÇÕES", CLUB_SELECTION:"ESCOLHA DE CLUBE",
        DRAW:"SORTEIO", GROUP_STAGE:"GRUPOS", ROUND_OF_16:"OITAVAS",
        QUARTERFINALS:"QUARTAS", SEMIFINALS:"SEMIFINAIS", FINAL:"FINAL",
        CLOSED:"ENCERRADA", ARCHIVED:"ARQUIVADA"
    };

    const esc = value => String(value ?? "")
        .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
        .replaceAll('"',"&quot;").replaceAll("'","&#039;");

    async function getClient() {
        if (window.CCFVAuth?.getClient) return window.CCFVAuth.getClient();

        const started = Date.now();
        while (!window.CCFVAuth?.getClient) {
            if (Date.now() - started > 10000) throw new Error("Supabase não está disponível.");
            await new Promise(resolve => setTimeout(resolve,100));
        }
        return window.CCFVAuth.getClient();
    }

    function msg(text, error = false) {
        const el = document.querySelector("#global-message");
        el.hidden = false;
        el.textContent = text;
        el.classList.toggle("is-error", error);
    }

    async function boot() {
        state.client = await getClient();

        const { data, error } = await state.client.auth.getUser();
        if (error) throw error;
        state.user = data?.user || null;

        if (!state.user) {
            msg("Sessão administrativa não encontrada. Faça login no painel CCFV.", true);
            return;
        }

        document.querySelector("#admin-user-email").textContent = state.user.email || "ADMIN";

        await refresh();
    }

    async function refresh() {
        const c = await state.client.from("championships").select("*").eq("code","CCFV-CL-S01").maybeSingle();
        if (c.error) throw c.error;
        state.championship = c.data;
        if (!state.championship) {
            msg("CCFV-CL-S01 não encontrada no banco.", true);
            return;
        }

        const id = state.championship.id;
        const [clubs, players, regs, pots, potMembers, groups, standings, matches, history, hall] = await Promise.all([
            state.client.from("championship_clubs").select("*, champions_clubs(*)").eq("championship_id",id),
            state.client.from("players").select("*").order("name"),
            state.client.from("championship_registrations").select("*, players:participant_id(id,name,platform,status), championship_clubs:selected_club_id(id,club_id,participant_id,status, champions_clubs:club_id(id,name,short_name,logo_path,country))").eq("championship_id",id),
            state.client.from("championship_pots").select("*").eq("championship_id",id).order("pot_number"),
            state.client.from("championship_pot_members").select("*"),
            state.client.from("championship_groups").select("*").eq("championship_id",id).order("display_order"),
            state.client.from("championship_public_standings").select("*").eq("championship_id",id).order("group_code").order("position"),
            state.client.from("championship_public_matches").select("*").eq("championship_id",id).order("phase").order("match_number"),
            state.client.from("championship_history").select("*, players:participant_id(name), champions_clubs:club_id(name)").eq("championship_id",id),
            state.client.from("ccfv_hall_of_fame").select("*, players:participant_id(name), champions_clubs:club_id(name)").eq("championship_id",id)
        ]);

        for (const result of [clubs,players,regs,pots,potMembers,groups,standings,matches,history,hall]) {
            if (result.error) throw result.error;
        }

        state.clubs = clubs.data || [];
        state.players = players.data || [];
        state.registrations = regs.data || [];
        state.pots = pots.data || [];
        state.potMembers = potMembers.data || [];
        state.groups = groups.data || [];
        state.standings = standings.data || [];
        state.matches = matches.data || [];
        state.history = history.data || [];
        state.hall = hall.data || [];

        render();
    }

    function render() {
        const c = state.championship;
        const occupied = state.registrations.filter(r => r.status === "CONFIRMED").length;
        const qualified = state.standings.filter(r => r.qualified).length;
        const clubOccupied = state.clubs.filter(r => r.participant_id).length;
        const champ = state.hall.find(item => item.title === "CAMPEÃO");

        document.querySelector("#kpi-status").textContent = phaseLabel[c.status] || c.status;
        document.querySelector("#kpi-participants").textContent = `${occupied} / ${c.max_participants || 32}`;
        document.querySelector("#kpi-clubs").textContent = `${clubOccupied} / ${c.total_clubs || 32}`;
        document.querySelector("#kpi-matches").textContent = String(state.matches.length);
        document.querySelector("#kpi-qualified").textContent = String(qualified);
        document.querySelector("#kpi-champion").textContent = champ?.players?.name || "A DEFINIR";

        document.querySelector("#season-name").value = c.name || "";
        document.querySelector("#season-label").value = c.season_label || "";
        document.querySelector("#season-status").value = c.status || "DRAFT";
        document.querySelector("#season-start").value = c.start_date || "";
        document.querySelector("#season-end").value = c.end_date || "";
        document.querySelector("#season-limit").value = c.max_participants || 32;

        renderClubs();
        renderPlayers();
        renderRegistrations();
        renderPots();
        renderGroups();
        renderMatches();
        renderKnockout();
        renderHistory();
        renderHall();
    }

    function renderClubs() {
        const el = document.querySelector("#clubs-table");
        el.innerHTML = state.clubs.map(row => `
            <tr>
                <td><strong>${esc(row.champions_clubs?.name || "Clube")}</strong></td>
                <td>${esc(row.champions_clubs?.country || "—")}</td>
                <td><span class="status-pill">${esc(row.status)}</span></td>
                <td>${esc(state.players.find(p => String(p.id) === String(row.participant_id))?.name || "—")}</td>
                <td>${esc(row.pot_number ?? "—")}</td>
            </tr>
        `).join("");
    }

    function renderPlayers() {
        const playerSelect = document.querySelector("#player-select");
        const assigned = new Set(state.registrations.map(r => String(r.participant_id)));
        const players = state.players.filter(p =>
            ["PC","CONSOLE"].includes(String(p.platform || "").toUpperCase()) &&
            String(p.status || "ACTIVE").toUpperCase() === "ACTIVE" &&
            !assigned.has(String(p.id))
        );

        playerSelect.innerHTML = `<option value="">Selecione...</option>` +
            players.map(p => `<option value="${esc(p.id)}">${esc(p.name)} — ${esc(p.platform)}</option>`).join("");

        const selected = document.querySelector("#player-club-select");
        selected.innerHTML = `<option value="">Selecione...</option>` +
            state.clubs
                .filter(c => !["RESERVED","CONFIRMED","ELIMINATED"].includes(String(c.status || "").toUpperCase()) && !c.participant_id)
                .map(c => `<option value="${esc(c.id)}">${esc(c.champions_clubs?.name || "Clube")}</option>`)
                .join("");
    }

    function renderRegistrations() {
        const el = document.querySelector("#registrations-table");
        const confirmed = state.registrations.filter(r => r.status === "CONFIRMED").length;
        document.querySelector("#registration-counter").textContent = `${confirmed} / 32`;

        el.innerHTML = state.registrations.map(r => `
            <tr>
                <td><strong>${esc(r.players?.name || r.participant_id)}</strong></td>
                <td>${esc(r.players?.platform || "—")}</td>
                <td>${esc(r.championship_clubs?.champions_clubs?.name || "—")}</td>
                <td><span class="status-pill">${esc(r.status)}</span></td>
            </tr>
        `).join("");
    }

    function renderPots() {
        const el = document.querySelector("#pots-preview");
        if (!state.pots.length) {
            el.innerHTML = "";
            return;
        }
        el.innerHTML = state.pots.map(pot => {
            const count = state.potMembers.filter(pm => pm.pot_id === pot.id).length;
            return `<div class="pot-box"><strong>${count}</strong><span>${esc(pot.name)}</span></div>`;
        }).join("");
    }

    function renderGroups() {
        const el = document.querySelector("#admin-groups-grid");
        if (!state.groups.length) {
            el.innerHTML = `<article class="admin-card"><p class="admin-help">Grupos ainda não sorteados.</p></article>`;
            return;
        }

        el.innerHTML = [...new Set(state.groups.map(g => g.group_code))].sort().map(code => {
            const rows = state.standings.filter(s => s.group_code === code).sort((a,b)=>Number(a.position||99)-Number(b.position||99));
            return `
                <article class="admin-group">
                    <header><div><span>GRUPO</span><h2>${esc(code)}</h2></div></header>
                    ${rows.map(r => `
                        <div class="admin-group-row">
                            <small>${esc(r.position)}</small>
                            <img src="${esc(r.logo_path || "")}" alt="">
                            <span>${esc(r.club_name)}</span>
                            <small>${esc(r.points)} pts</small>
                        </div>
                    `).join("")}
                </article>
            `;
        }).join("");
    }

    function renderMatches() {
        renderMatchList("#matches-admin-list", state.matches.filter(m => m.phase === "GROUP_STAGE"));
        renderMatchList("#knockout-list", state.matches.filter(m => m.phase !== "GROUP_STAGE"));
    }

    function renderMatchList(selector, matches) {
        const el = document.querySelector(selector);
        if (!matches.length) {
            el.innerHTML = `<article class="admin-card"><p class="admin-help">Nenhuma partida para exibir.</p></article>`;
            return;
        }

        el.innerHTML = matches.map(match => {
            const finished = ["VALIDATED","WO","ADMIN_DECISION"].includes(String(match.status || ""));
            return `
                <article class="admin-match">
                    <div class="admin-match__side">
                        <img src="${esc(match.home_logo_path || "")}" alt="">
                        <strong>${esc(match.home_club_name || "A DEFINIR")}</strong>
                    </div>
                    <div class="admin-match__score">
                        <strong>${finished ? `${esc(match.home_score)} × ${esc(match.away_score)}` : "VS"}</strong>
                        <span>${esc(phaseLabel[match.phase] || match.phase)} #${esc(match.match_number)}</span>
                    </div>
                    <div class="admin-match__side admin-match__side--away">
                        <strong>${esc(match.away_club_name || "A DEFINIR")}</strong>
                        <img src="${esc(match.away_logo_path || "")}" alt="">
                    </div>
                    <div class="admin-match__controls">
                        ${finished
                            ? `<span class="status-pill">${esc(match.status)}</span>`
                            : `
                                <input data-home="${esc(match.id)}" type="number" min="0" placeholder="0">
                                <input data-away="${esc(match.id)}" type="number" min="0" placeholder="0">
                                <button data-submit-result="${esc(match.id)}">Salvar</button>
                              `}
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderKnockout() {
        const count = phase => state.matches.filter(m => m.phase === phase).length;
        const r16 = state.matches.filter(m => m.phase === "ROUND_OF_16");
        const qf = state.matches.filter(m => m.phase === "QUARTERFINALS");
        const sf = state.matches.filter(m => m.phase === "SEMIFINALS");
        const fin = state.matches.filter(m => m.phase === "FINAL");
        document.querySelector("#ko-r16").textContent = `${r16.filter(m => m.status !== "SCHEDULED").length} / ${r16.length || 8}`;
        document.querySelector("#ko-qf").textContent = `${qf.filter(m => m.status !== "SCHEDULED").length} / ${qf.length || 4}`;
        document.querySelector("#ko-sf").textContent = `${sf.filter(m => m.status !== "SCHEDULED").length} / ${sf.length || 2}`;
        document.querySelector("#ko-final").textContent = `${fin.filter(m => m.status !== "SCHEDULED").length} / ${fin.length || 1}`;
    }

    function renderHistory() {
        const el = document.querySelector("#history-table");
        el.innerHTML = state.history.map(row => `
            <tr>
                <td>${esc(row.players?.name || "—")}</td>
                <td>${esc(row.champions_clubs?.name || "—")}</td>
                <td>${esc(phaseLabel[row.phase_reached] || row.phase_reached || "—")}</td>
                <td>${esc(row.matches_played ?? 0)}</td>
                <td>${esc(row.wins ?? 0)}</td>
            </tr>
        `).join("");
    }

    function renderHall() {
        const el = document.querySelector("#hall-list");
        el.innerHTML = state.hall.length
            ? state.hall.map(row => `<div class="hall-item"><strong>${esc(row.players?.name || "Campeão")}</strong><span>${esc(row.champions_clubs?.name || "Clube")} — ${esc(row.season)}</span></div>`).join("")
            : `<p class="admin-help">Nenhum campeão registrado ainda.</p>`;
    }

    async function rpc(name, args) {
        msg(`Executando ${name}...`);
        const { data, error } = await state.client.rpc(name, args);
        if (error) throw error;
        msg(`${name}: ${JSON.stringify(data)}`);
        await refresh();
        return data;
    }

    async function saveSeason() {
        const update = {
            name: document.querySelector("#season-name").value.trim(),
            season_label: document.querySelector("#season-label").value.trim(),
            status: document.querySelector("#season-status").value,
            start_date: document.querySelector("#season-start").value || null,
            end_date: document.querySelector("#season-end").value || null,
            max_participants: Number(document.querySelector("#season-limit").value) || 32
        };

        const { error } = await state.client
            .from("championships")
            .update(update)
            .eq("id", state.championship.id);

        if (error) throw error;
        msg("Temporada salva.");
        await refresh();
    }

    async function registerPlayer() {
        const playerId = document.querySelector("#player-select").value;
        const clubId = document.querySelector("#player-club-select").value;
        if (!playerId || !clubId) throw new Error("Selecione jogador e clube.");

        await state.client.from("championship_registrations").insert({
            championship_id: state.championship.id,
            participant_id: playerId,
            selected_club_id: clubId,
            status: "CONFIRMED",
            accepted_at: new Date().toISOString()
        }).throwOnError();

        await state.client.from("championship_clubs")
            .update({ participant_id: playerId, status: "CONFIRMED" })
            .eq("id", clubId)
            .eq("championship_id", state.championship.id)
            .throwOnError();

        msg("Participante confirmado na Champions.");
        await refresh();
    }

    async function submitResult(button) {
        const id = button.dataset.submitResult;
        const h = document.querySelector(`input[data-home="${CSS.escape(id)}"]`);
        const a = document.querySelector(`input[data-away="${CSS.escape(id)}"]`);
        const home = Number(h?.value);
        const away = Number(a?.value);
        if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
            throw new Error("Informe um placar válido.");
        }

        await rpc("champions_submit_result", {
            p_match_id: id,
            p_home_score: home,
            p_away_score: away,
            p_result_type: "NORMAL"
        });
    }

    function bindTabs() {
        document.querySelectorAll("[data-tab]").forEach(link => {
            link.addEventListener("click", event => {
                event.preventDefault();
                const tab = link.dataset.tab;
                document.querySelectorAll("[data-tab]").forEach(item => item.classList.toggle("is-active", item === link));
                document.querySelectorAll(".admin-tab").forEach(panel => panel.classList.toggle("is-visible", panel.dataset.panel === tab));
                history.replaceState(null, "", `#${tab}`);
            });
        });

        const hash = location.hash.replace("#","");
        if (hash && document.querySelector(`[data-tab="${CSS.escape(hash)}"]`)) {
            document.querySelector(`[data-tab="${CSS.escape(hash)}"]`).click();
        }
    }

    function bindActions() {
        document.querySelector("#btn-refresh").addEventListener("click", () => refresh().catch(e => msg(e.message || e, true)));
        document.querySelector("#btn-save-season").addEventListener("click", () => saveSeason().catch(e => msg(e.message || e, true)));
        document.querySelector("#btn-register-player").addEventListener("click", () => registerPlayer().catch(e => msg(e.message || e, true)));

        document.body.addEventListener("click", async event => {
            const actionEl = event.target.closest("[data-action]");
            const resultButton = event.target.closest("[data-submit-result]");

            try {
                if (resultButton) {
                    await submitResult(resultButton);
                    return;
                }

                if (!actionEl) return;
                const action = actionEl.dataset.action;

                if (action === "prepare-pots") {
                    await rpc("champions_prepare_pots", { p_championship_id: state.championship.id, p_force: true });
                } else if (action === "draw-groups") {
                    await rpc("champions_draw_groups", { p_championship_id: state.championship.id, p_force: true });
                } else if (action === "generate-group-matches") {
                    await rpc("champions_generate_group_matches", { p_championship_id: state.championship.id, p_force: true });
                }
            } catch (e) {
                console.error(e);
                msg(e?.message || String(e), true);
            }
        });
    }

    window.addEventListener("DOMContentLoaded", () => {
        bindTabs();
        bindActions();
        boot().catch(error => {
            console.error("CCFV Champions Admin:", error);
            msg(error?.message || "Falha ao carregar painel.", true);
        });
    });
})();
