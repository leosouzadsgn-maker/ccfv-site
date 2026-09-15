(() => {
    "use strict";

    const esc = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const phaseLabels = {
        DRAFT: "INSCRIÇÕES",
        REGISTRATIONS: "INSCRIÇÕES",
        DRAW: "SORTEIO",
        GROUP_STAGE: "FASE DE GRUPOS",
        ROUND_OF_16: "OITAVAS",
        QUARTERFINALS: "QUARTAS",
        SEMIFINALS: "SEMIFINAIS",
        FINAL: "FINAL",
        CLOSED: "ENCERRADA",
        ARCHIVED: "ARQUIVADA"
    };

    function setText(selector, value) {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    }

    function renderGroupSlots() {
        document.querySelectorAll(".champions-group-card").forEach(card => {
            for (let i = 1; i <= 4; i++) {
                const row = card.querySelector(`[data-slot$="-${i}"]`);
                if (!row) continue;

                row.classList.remove("is-filled", "is-qualified");

                const name = row.querySelector(".champions-slot-name");
                const logo = row.querySelector(".champions-slot-logo");

                if (name) name.textContent = "A DEFINIR";
                if (logo) logo.textContent = "—";

                const spans = row.querySelectorAll(":scope > span");
                if (spans[2]) spans[2].textContent = "0";
                if (spans[3]) spans[3].textContent = "0";
                if (spans[4]) spans[4].textContent = "0";
                if (spans[5]) spans[5].textContent = "0";

                const strong = row.querySelector(":scope > strong");
                if (strong) strong.textContent = "0";
            }
        });
    }

    function renderStandings(rows) {
        (rows || []).forEach(item => {
            const group = String(item.group_code || "").toUpperCase();
            const pos = Number(item.position || 0);

            if (!group || !pos) return;

            const row =
                document.querySelector(
                    `[data-slot="${CSS.escape(group + "-" + pos)}"]`
                );

            if (!row) return;

            const name = row.querySelector(".champions-slot-name");
            const logo = row.querySelector(".champions-slot-logo");

            if (name) {
                name.textContent =
                    item.club_name ||
                    item.name ||
                    "A DEFINIR";
            }

            if (logo) {
                if (item.logo_path) {
                    logo.innerHTML = `
                        <img
                            src="${esc(item.logo_path)}"
                            alt=""
                            style="width:24px;height:24px;object-fit:contain"
                        >
                    `;
                } else {
                    logo.textContent = "—";
                }
            }

            if (item.club_name) {
                row.classList.add("is-filled");
            }

            if (item.qualified) {
                row.classList.add("is-qualified");
            }

            const spans = row.querySelectorAll(":scope > span");
            if (spans[2]) spans[2].textContent = item.played ?? 0;
            if (spans[3]) spans[3].textContent = item.wins ?? 0;
            if (spans[4]) spans[4].textContent = item.draws ?? 0;
            if (spans[5]) spans[5].textContent = item.losses ?? 0;

            const strong = row.querySelector(":scope > strong");
            if (strong) strong.textContent = item.points ?? 0;
        });
    }

    function renderClubStatus(rows) {
        (rows || []).forEach(item => {
            const slug = item.slug || "";
            const card =
                document.querySelector(
                    `[data-club-slug="${CSS.escape(slug)}"]`
                );

            if (!card) return;

            const status = card.querySelector(".club-catalog-status");
            if (status) {
                status.textContent =
                    item.participant_name ||
                    (
                        String(item.status || "AVAILABLE")
                            .toUpperCase() === "AVAILABLE"
                            ? "DISPONÍVEL"
                            : item.status
                    );
            }

            const img = card.querySelector("img");
            if (img && item.logo_path) {
                img.src = item.logo_path;
            }
        });
    }

    async function load() {
        renderGroupSlots();

        let client = null;

        try {
            if (window.CCFVAuth?.getClient) {
                client = window.CCFVAuth.getClient();
            }
        } catch {
            client = null;
        }

        if (!client) {
            setText("#season-label", "SEASON 01");
            setText("#season-status", "INSCRIÇÕES");
            setText("#season-phase", "A DEFINIR");
            setText("#season-participants", "0 / 32");
            setText("#season-occupied", "0 / 32");
            return;
        }

        try {
            /*
             * Não consultamos a tabela championships diretamente.
             * A view pública já possui championship_id e os clubes.
             */
            const clubsResult =
                await client
                    .from("championship_public_clubs")
                    .select("*")
                    .order("name");

            if (clubsResult.error) {
                console.warn(
                    "Champions public clubs:",
                    clubsResult.error
                );
                return;
            }

            const clubs =
                clubsResult.data || [];

            if (!clubs.length) {
                setText("#season-label", "SEASON 01");
                setText("#season-status", "INSCRIÇÕES");
                return;
            }

            const occupied =
                clubs.filter(
                    club => club.participant_id
                ).length;

            setText(
                "#season-participants",
                `${occupied} / 32`
            );

            setText(
                "#season-occupied",
                `${occupied} / 32`
            );

            setText(
                "#season-label",
                "SEASON 01"
            );

            setText(
                "#season-status",
                "INSCRIÇÕES"
            );

            setText(
                "#season-phase",
                "AGUARDANDO SORTEIO"
            );

            renderClubStatus(clubs);

            const id =
                clubs[0].championship_id;

            const standingsResult =
                await client
                    .from("championship_public_standings")
                    .select("*")
                    .eq("championship_id", id)
                    .order("group_code")
                    .order("position");

            if (
                !standingsResult.error &&
                standingsResult.data
            ) {
                renderStandings(
                    standingsResult.data
                );
            }

            const matchesResult =
                await client
                    .from("championship_public_matches")
                    .select("*")
                    .eq("championship_id", id)
                    .order("match_number");

            if (
                !matchesResult.error &&
                matchesResult.data?.length
            ) {
                const groupMatches =
                    matchesResult.data.filter(
                        match =>
                            match.phase === "GROUP_STAGE"
                    );

                const slate =
                    document.querySelector(
                        "#group-matches-placeholder"
                    );

                if (slate && groupMatches.length) {
                    slate.innerHTML = `
                        <span>CCFV // MATCHDAY</span>
                        <strong>${groupMatches.length} JOGOS GERADOS</strong>
                        <small>O calendário oficial da Season 01 já está disponível.</small>
                    `;
                }
            }

        } catch (error) {
            console.warn(
                "CCFV Champions:",
                error
            );
        }
    }

    window.addEventListener(
        "DOMContentLoaded",
        load
    );

})();
