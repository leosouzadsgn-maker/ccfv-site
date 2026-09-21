(() => {
    "use strict";

    const state = {
        client: null,
        championship: null,
        champion: null,
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
            .order("season_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (info.error) throw info.error;

        state.championship = info.data;

        if (!state.championship) {
            renderEmpty("Temporada da Champions ainda não cadastrada.");
            return;
        }

        const id = state.championship.id;

        const [clubs, standings, matches, champion] = await Promise.all([

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
                .order("match_number"),

            state.client
                .from("ccfv_champions_public_champion_v3")
                .select("*")
                .eq("championship_id", id)
                .maybeSingle()
        ]);

        if (clubs.error) {
            console.warn("CCFV Champions clubes:", clubs.error);
        }

        if (standings.error) {
            console.warn("CCFV Champions classificação:", standings.error);
        }

        if (matches.error) {
            console.warn("CCFV Champions partidas:", matches.error);
        }

        if (champion.error) {
            console.warn("CCFV Champions campeão:", champion.error);
        }

        state.champion = champion.data || null;

        /*
         * Fallback 1:
         * o campeão também existe no Hall/Histórico quando a temporada foi
         * encerrada corretamente.
         */
        if (!state.champion) {
            const fallback = await state.client
                .from("ccfv_champions_public_history_v2")
                .select("*")
                .eq("championship_id", id)
                .eq("final_position", 1)
                .maybeSingle();

            if (!fallback.error && fallback.data) {
                state.champion = fallback.data;
            }
        }

        /*
         * Fallback 2:
         * em caso de atraso do cache da view, tenta localizar o vencedor
         * pelo resultado da final já carregado.
         */
        state.clubs = clubs.data || [];
        state.standings = standings.data || [];
        state.matches = matches.data || [];

        if (!state.champion) {
            const finalMatch = state.matches.find(match =>
                match.phase === "FINAL" &&
                resultStatuses.includes(String(match.status || ""))
            );

            if (finalMatch) {
                const winnerRegistrationId = finalMatch.winner_registration_id;

                const winnerClub = state.clubs.find(club =>
                    String(club.championship_club_id) ===
                    String(
                        finalMatch.winner_club_id ||
                        finalMatch.home_club_id ||
                        ""
                    )
                );

                if (winnerRegistrationId || winnerClub) {
                    state.champion = {
                        participant_name:
                            finalMatch.winner_player_name ||
                            winnerClub?.participant_name ||
                            "",
                        photo_url:
                            finalMatch.winner_photo_url ||
                            winnerClub?.participant_photo_url ||
                            "",
                        club_id:
                            finalMatch.winner_club_id ||
                            winnerClub?.championship_club_id ||
                            null,
                        club_slug:
                            finalMatch.winner_club_slug ||
                            winnerClub?.slug ||
                            "",
                        club_name:
                            finalMatch.winner_club_name ||
                            winnerClub?.name ||
                            "",
                        logo_path:
                            finalMatch.winner_logo_path ||
                            winnerClub?.logo_path ||
                            ""
                    };
                }
            }
        }

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
        const groupCodes = ["A","B","C","D","E","F","G","H"];

        el.innerHTML = groupCodes.map(code => {

            const rows = state.standings
                .filter(item => item.group_code === code)
                .sort(
                    (a,b) =>
                        Number(a.position || 99) -
                        Number(b.position || 99)
                );

            const slots = Array.from(
                { length: 4 },
                (_, index) => rows[index] || null
            );

            return `
                <article class="ccfv-champions-group">

                    <header class="ccfv-champions-group__header">
                        <div class="ccfv-champions-group__title">
                            <span>GRUPO</span>
                            <strong>${esc(code)}</strong>
                        </div>

                        <div class="ccfv-champions-group__advance">
                            <span>CLASSIFICAÇÃO</span>
                            <strong>TOP 2</strong>
                        </div>
                    </header>

                    <div class="ccfv-champions-group__table-wrap">

                        <div class="ccfv-champions-group__thead">
                            <span>#</span>
                            <span>CLUBE</span>
                            <span title="Jogos">J</span>
                            <span title="Vitórias">V</span>
                            <span title="Empates">E</span>
                            <span title="Derrotas">D</span>
                            <span title="Gols Pró">GP</span>
                            <span title="Gols Contra">GC</span>
                            <span title="Saldo de Gols">SG</span>
                            <span title="Pontos">PTS</span>
                        </div>

                        ${slots.map((row, index) => {

                            if (!row) {
                                return `
                                    <div class="ccfv-champions-group__row ccfv-champions-group__row--empty">

                                        <span class="group-position">
                                            ${index + 1}
                                        </span>

                                        <div class="ccfv-champions-group__club">

                                            <span class="ccfv-champions-placeholder-logo"></span>

                                            <div>
                                                <strong>A DEFINIR</strong>
                                                <small>Aguardando sorteio</small>
                                            </div>

                                        </div>

                                        <span>—</span>
                                        <span>—</span>
                                        <span>—</span>
                                        <span>—</span>
                                        <span>—</span>
                                        <span>—</span>
                                        <span>—</span>
                                        <strong>—</strong>

                                    </div>
                                `;
                            }

                            const gd = Number(row.goal_difference || 0);

                            return `
                                <div class="ccfv-champions-group__row ${
                                    row.qualified ? "is-qualified" : ""
                                }">

                                    <span class="group-position">
                                        ${esc(row.position)}
                                    </span>

                                    <div class="ccfv-champions-group__club">

                                        ${logoMarkup(
                                            row.club_slug,
                                            row.logo_path,
                                            row.club_name
                                        )}

                                        <div>
                                            <strong>${esc(row.club_name)}</strong>
                                            <small>${esc(row.participant_name || "Treinador a definir")}</small>
                                        </div>

                                    </div>

                                    <span>${esc(row.played ?? 0)}</span>
                                    <span>${esc(row.wins ?? 0)}</span>
                                    <span>${esc(row.draws ?? 0)}</span>
                                    <span>${esc(row.losses ?? 0)}</span>
                                    <span>${esc(row.goals_for ?? 0)}</span>
                                    <span>${esc(row.goals_against ?? 0)}</span>

                                    <span class="goal-difference ${
                                        gd > 0
                                            ? "positive"
                                            : gd < 0
                                                ? "negative"
                                                : ""
                                    }">
                                        ${gd > 0 ? "+" : ""}
                                        ${esc(gd)}
                                    </span>

                                    <strong class="points">
                                        ${esc(row.points ?? 0)}
                                    </strong>

                                </div>
                            `;
                        }).join("")}

                    </div>

                    <footer class="ccfv-champions-group__legend">

                        <span><b>J</b> Jogos</span>
                        <span><b>V</b> Vitórias</span>
                        <span><b>E</b> Empates</span>
                        <span><b>D</b> Derrotas</span>
                        <span><b>GP</b> Gols pró</span>
                        <span><b>GC</b> Gols contra</span>
                        <span><b>SG</b> Saldo</span>
                        <span><b>PTS</b> Pontos</span>

                    </footer>

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
            )
            .sort((a,b) => {
                const phaseOrder = {
                    GROUP_STAGE: 1,
                    ROUND_OF_16: 2,
                    QUARTERFINALS: 3,
                    SEMIFINALS: 4,
                    FINAL: 5
                };

                return (
                    (phaseOrder[a.phase] || 99) -
                    (phaseOrder[b.phase] || 99)
                ) ||
                Number(a.round_number || 0) -
                Number(b.round_number || 0) ||
                Number(a.match_number || 0) -
                Number(b.match_number || 0)
            });

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

            const status = String(match.status || "").toUpperCase();

            const statusLabel = {
                VALIDATED: "RESULTADO OFICIAL",
                WO: "W.O.",
                ADMIN_DECISION: "DECISÃO ADMIN",
                SCHEDULED: "AGENDADA",
                IN_PROGRESS: "EM ANDAMENTO",
                PENDING_VALIDATION: "PENDENTE"
            }[status] || status || "A DEFINIR";

            const score = finished
                ? `${esc(match.home_score)} <i>×</i> ${esc(match.away_score)}`
                : `<span class="match-vs">VS</span>`;

            const when = match.scheduled_at
                ? formatDateTime(match.scheduled_at)
                : "HORÁRIO A DEFINIR";

            return `
                <article class="ccfv-champions-match">

                    <header class="ccfv-champions-match__header">

                        <div>
                            <span>${esc(
                                phaseLabel[match.phase] || match.phase
                            )}</span>
                            <strong>JOGO ${esc(match.match_number)}</strong>
                        </div>

                        <div class="ccfv-champions-match__status ${
                            finished ? "is-finished" : ""
                        }">
                            ${esc(statusLabel)}
                        </div>

                    </header>

                    <div class="ccfv-champions-match__body">

                        <div class="ccfv-champions-match__team ccfv-champions-match__team--home">

                            <div class="match-team-copy">
                                <strong>${esc(
                                    match.home_club_name || "A DEFINIR"
                                )}</strong>

                                <small>${esc(
                                    match.home_player_name ||
                                    "Treinador a definir"
                                )}</small>
                            </div>

                            ${logoMarkup(
                                match.home_club_slug,
                                match.home_logo_path,
                                match.home_club_name
                            )}

                        </div>

                        <div class="ccfv-champions-match__center">

                            <strong class="ccfv-match-score">
                                ${score}
                            </strong>

                            <span class="ccfv-match-date">
                                ${esc(when)}
                            </span>

                        </div>

                        <div class="ccfv-champions-match__team ccfv-champions-match__team--away">

                            ${logoMarkup(
                                match.away_club_slug,
                                match.away_logo_path,
                                match.away_club_name
                            )}

                            <div class="match-team-copy">
                                <strong>${esc(
                                    match.away_club_name || "A DEFINIR"
                                )}</strong>

                                <small>${esc(
                                    match.away_player_name ||
                                    "Treinador a definir"
                                )}</small>
                            </div>

                        </div>

                    </div>

                    <footer class="ccfv-champions-match__footer">

                        <span>
                            ${match.phase === "GROUP_STAGE"
                                ? "FASE DE GRUPOS • JOGO ÚNICO"
                                : "MATA-MATA • JOGO ÚNICO"}
                        </span>

                        ${
                            finished && match.penalties_played
                                ? `
                                    <strong>
                                        PÊNALTIS
                                        ${esc(match.home_penalties)}
                                        ×
                                        ${esc(match.away_penalties)}
                                    </strong>
                                  `
                                : ""
                        }

                    </footer>

                </article>
            `;
        }).join("");
    }


    function knockoutPlaceholder(label, number) {

        return `
            <div class="ccfv-bracket-match ccfv-bracket-match--empty">

                <div class="ccfv-bracket-line">

                    <span class="ccfv-bracket-placeholder-logo"></span>

                    <span>
                        <strong>A DEFINIR</strong>
                        <small>${esc(label)} ${number}</small>
                    </span>

                    <strong>—</strong>

                </div>

                <div class="ccfv-bracket-line">

                    <span class="ccfv-bracket-placeholder-logo"></span>

                    <span>
                        <strong>A DEFINIR</strong>
                        <small>${esc(label)} ${number}</small>
                    </span>

                    <strong>—</strong>

                </div>

            </div>
        `;
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

                    <span>
                        <strong>${esc(match.home_club_name || "A DEFINIR")}</strong>
                        <small>${esc(match.home_player_name || "")}</small>
                    </span>

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

                    <span>
                        <strong>${esc(match.away_club_name || "A DEFINIR")}</strong>
                        <small>${esc(match.away_player_name || "")}</small>
                    </span>

                    <strong>
                        ${finished ? esc(match.away_score) : "—"}
                    </strong>

                </div>

            </div>
        `;
    }


    function renderKnockout() {

        const structure = [
            {
                phase: "ROUND_OF_16",
                selector: "#knockout-r16",
                count: 8,
                label: "OITAVAS"
            },
            {
                phase: "QUARTERFINALS",
                selector: "#knockout-qf",
                count: 4,
                label: "QUARTAS"
            },
            {
                phase: "SEMIFINALS",
                selector: "#knockout-sf",
                count: 2,
                label: "SEMIS"
            },
            {
                phase: "FINAL",
                selector: "#knockout-final",
                count: 1,
                label: "FINAL"
            }
        ];

        structure.forEach(item => {

            const target = document.querySelector(item.selector);

            if (!target) return;

            const matches = state.matches
                .filter(match => match.phase === item.phase)
                .sort(
                    (a,b) =>
                        Number(a.match_number || 0) -
                        Number(b.match_number || 0)
                );

            /*
             * A chave física nunca desaparece.
             * Se o Admin ainda não gerou a fase, mostramos os confrontos
             * vazios. Quando os jogos existirem, eles substituem os slots.
             */

            target.innerHTML = Array.from(
                { length: item.count },
                (_, index) =>
                    matches[index]
                        ? bracketCard(matches[index])
                        : knockoutPlaceholder(
                            item.label,
                            index + 1
                        )
            ).join("");

        });
    }


    function renderChampion() {

        const champion = state.champion;
        const seasonLabel =
            state.championship?.season_label || "SEASON";

        const seasonTitle =
            document.querySelector("#season-champion-label");

        const championName =
            document.querySelector("#champion-name");

        const championClub =
            document.querySelector("#champion-club");

        const photo =
            document.querySelector("#champion-photo");

        const crest =
            document.querySelector("#champion-crest");

        const badge =
            document.querySelector("#champion-badge");

        const card =
            document.querySelector("#champions-champion-card");

        const isChampion = Boolean(
            champion?.club_name &&
            (
                champion?.participant_name ||
                champion?.final_position === 1
            )
        );

        if (seasonTitle) {
            seasonTitle.textContent =
                `CAMPEÃO DA ${seasonLabel}`;
        }

        if (badge) {
            badge.textContent =
                isChampion ? "🏆 CAMPEÃO" : "🏆 AGUARDANDO";
            badge.classList.toggle(
                "is-confirmed",
                isChampion
            );
        }

        if (championName) {
            championName.textContent =
                champion?.club_name || "A DEFINIR";
        }

        if (championClub) {
            championClub.textContent =
                isChampion
                    ? `${champion?.participant_name || "Treinador"} • ${seasonLabel}`
                    : "A grande taça ainda está em disputa.";
        }

        if (photo) {
            if (champion?.photo_url) {
                photo.src = champion.photo_url;
                photo.alt =
                    champion.participant_name || "Campeão";
                photo.style.display = "";
            } else {
                photo.removeAttribute("src");
                photo.alt = "";
                photo.style.display = isChampion ? "" : "none";
            }
        }

        if (crest) {
            const src = clubLogoSrc(
                champion?.club_slug,
                champion?.logo_path
            );

            if (src) {
                crest.src = src;
                crest.alt =
                    champion?.club_name || "Clube campeão";
                crest.style.display = "";
            } else {
                crest.removeAttribute("src");
                crest.alt = "";
                crest.style.display = "none";
            }
        }

        if (card) {
            card.classList.toggle("is-confirmed", isChampion);
        }
    }


    function clubLogoSrc(slug, logoPath = "") {
        const clean = String(slug || "").trim().toLowerCase();
        const stored = String(logoPath || "").trim();
        if (stored.startsWith("/assets/images/champions/clubs/")) return stored;
        if (stored.startsWith("assets/images/champions/clubs/")) return `/${stored}`;
        return clean ? `/assets/images/champions/clubs/${clean}.png` : "";
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
