(() => {
    "use strict";

    const SUPABASE_TIMEOUT = 6500;
    let client = null;

    const esc = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    async function getClient() {
        if (window.CCFVAuth?.getClient) return window.CCFVAuth.getClient();

        const start = Date.now();
        while (!window.CCFVAuth?.getClient) {
            if (Date.now() - start > SUPABASE_TIMEOUT) return null;
            await new Promise(r => setTimeout(r, 80));
        }

        try {
            return window.CCFVAuth.getClient();
        } catch {
            return null;
        }
    }

    function slugify(text) {
        return String(text || "")
            .normalize("NFD")
            .replace(/[^\w\s-]/g, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");
    }

    function renderFilledClubs(data) {
        const cards = document.querySelectorAll("[data-club-slug]");
        if (!cards.length || !Array.isArray(data)) return;

        data.forEach(club => {
            const name = club.name || club.club_name || "";
            if (!name) return;

            const slug = club.slug || slugify(name);
            const card = document.querySelector(`[data-club-slug="${CSS.escape(slug)}"]`);
            if (!card) return;

            const img = card.querySelector("img");
            const status = card.querySelector(".club-catalog-status");

            if (img && club.logo_path) img.src = club.logo_path;
            if (status) {
                status.textContent = club.participant_name
                    ? club.participant_name
                    : (club.status || "DISPONÍVEL");
            }
        });
    }

    function setGroupRow(row, item) {
        if (!row || !item) return;

        const logo = row.querySelector(".champions-slot-logo");
        const name = row.querySelector(".champions-slot-name");

        if (name) name.textContent = item.club_name || item.name || "A DEFINIR";

        if (logo) {
            if (item.logo_path) {
                logo.innerHTML = `<img src="${esc(item.logo_path)}" alt="" style="width:24px;height:24px;object-fit:contain">`;
            } else {
                logo.textContent = "—";
            }
        }

        if (item.club_name || item.name) {
            row.classList.add("is-filled");
        }

        if (item.qualified) {
            row.classList.add("is-qualified");
        }

        const cells = row.querySelectorAll(":scope > span, :scope > strong");
        if (cells[2]) cells[2].textContent = item.played ?? 0;
        if (cells[3]) cells[3].textContent = item.wins ?? 0;
        if (cells[4]) cells[4].textContent = item.draws ?? 0;
        if (cells[5]) cells[5].textContent = item.losses ?? 0;
        if (cells[6]) cells[6].textContent = item.points ?? 0;
    }

    function renderStandings(rows) {
        if (!Array.isArray(rows)) return;

        rows.forEach(item => {
            const group = String(item.group_code || "").toUpperCase();
            const position = Number(item.position || 0);
            if (!group || !position) return;

            const row = document.querySelector(
                `[data-slot="${CSS.escape(group + "-" + position)}"]`
            );

            if (row) setGroupRow(row, item);
        });
    }

    function renderMatches(matches) {
        const placeholder = document.querySelector("#group-matches-placeholder");
        if (!placeholder || !Array.isArray(matches)) return;

        const groupMatches = matches.filter(m => m.phase === "GROUP_STAGE");

        if (!groupMatches.length) return;

        placeholder.innerHTML = `
            <span>CCFV // MATCHDAY</span>
            <strong>${groupMatches.length} JOGOS GERADOS</strong>
            <small>O calendário oficial da Season 01 já foi criado pelo sistema.</small>
        `;
    }

    async function load() {
        client = await getClient();

        if (!client) {
            // A página já está pronta com placeholders.
            return;
        }

        try {
            const { data: championship, error: championshipError } = await client
                .from("championships")
                .select("*")
                .eq("code", "CCFV-CL-S01")
                .maybeSingle();

            if (championshipError || !championship) {
                return;
            }

            document.querySelector("#season-label").textContent =
                championship.season_label || "SEASON 01";

            document.querySelector("#season-status").textContent =
                championship.status || "DRAFT";

            document.querySelector("#season-phase").textContent =
                championship.status || "DRAFT";

            const id = championship.id;

            const [clubs, standings, matches] = await Promise.all([
                client.from("championship_public_clubs")
                    .select("*")
                    .eq("championship_id", id),

                client.from("championship_public_standings")
                    .select("*")
                    .eq("championship_id", id)
                    .order("group_code")
                    .order("position"),

                client.from("championship_public_matches")
                    .select("*")
                    .eq("championship_id", id)
                    .order("phase")
                    .order("match_number")
            ]);

            if (!clubs.error && Array.isArray(clubs.data)) {
                const occupied = clubs.data.filter(item =>
                    item.participant_id
                ).length;

                document.querySelector("#season-occupied").textContent =
                    `${occupied} / ${championship.total_clubs || 32}`;

                renderFilledClubs(clubs.data);
            }

            if (!standings.error) {
                const participants = new Set(
                    (standings.data || [])
                        .map(item => item.participant_id)
                        .filter(Boolean)
                ).size;

                document.querySelector("#season-participants").textContent =
                    `${participants} / ${championship.max_participants || 32}`;

                renderStandings(standings.data || []);
            }

            if (!matches.error) {
                renderMatches(matches.data || []);
            }
        } catch (error) {
            // Nunca desmonta a página. Os placeholders continuam visíveis.
            console.warn("CCFV Champions:", error);
        }
    }

    window.addEventListener("DOMContentLoaded", load);
})();
