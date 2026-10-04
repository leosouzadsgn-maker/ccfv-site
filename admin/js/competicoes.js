/* =========================================================
   CCFV // CENTRAL DE COMPETIÇÕES
   Somente navegação + leitura de status.
   Nenhum motor competitivo é executado aqui.
   ========================================================= */

(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);

    const competitions = [
        {
            key: "BRASILEIRAO",
            name: "BRASILEIRÃO",
            code: "BR",
            description: "Motor oficial do Brasileirão já existente no painel principal.",
            href: "/admin/index.html?section=brasileirao",
            type: "active",
            source: "PAINEL PRINCIPAL"
        },
        {
            key: "CHAMPIONS",
            name: "CHAMPIONS LEAGUE",
            code: "CL",
            description: "Motor isolado da Champions League, com temporadas, grupos, mata-mata e fechamento oficial.",
            href: "/admin/champions.html",
            type: "active",
            source: "MOTOR PRÓPRIO"
        },
        {
            key: "NIGHT_CUP",
            name: "NIGHT CUP",
            code: "NC",
            description: "Motor oficial da Night Cup preservado no painel principal.",
            href: "/admin/index.html?section=night",
            type: "active",
            source: "PAINEL PRINCIPAL"
        },
        {
            key: "LIBERTADORES",
            name: "LIBERTADORES",
            code: "LIB",
            description: "Motor isolado da Libertadores, com temporada própria e operação independente.",
            href: "/admin/libertadores.html",
            type: "active",
            source: "MOTOR PRÓPRIO"
        },
        {
            key: "COPA_DO_MUNDO",
            name: "COPA DO MUNDO",
            code: "WC",
            description: "Competição prevista na arquitetura central. O motor operacional será implantado em etapa própria.",
            href: "#",
            type: "soon",
            source: "EM IMPLANTAÇÃO"
        },
        {
            key: "MOBILE",
            name: "ECOSSISTEMA MOBILE",
            code: "M",
            description: "Brasileirão Mobile e Arena Cup já existentes no módulo Mobile do painel principal.",
            href: "/admin/index.html?section=mobile",
            type: "active",
            source: "PAINEL PRINCIPAL"
        }
    ];

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function getClient() {
        if (!window.CCFVAuth?.getClient) {
            throw new Error("Cliente CCFV indisponível.");
        }
        return window.CCFVAuth.getClient();
    }

    async function readStatuses() {
        const client = await getClient();
        const result = {
            CHAMPIONS: null,
            LIBERTADORES: null
        };

        const [champions, libertadores] = await Promise.all([
            client
                .from("championships")
                .select("season_number,season_label,status")
                .like("code", "CCFV-CL-%")
                .order("season_number", { ascending: false })
                .limit(1),
            client
                .from("ccfv_libertadores_seasons")
                .select("season_number,season_label,status,phase")
                .order("season_number", { ascending: false })
                .limit(1)
        ]);

        if (!champions.error && champions.data?.[0]) {
            result.CHAMPIONS = champions.data[0];
        }

        if (!libertadores.error && libertadores.data?.[0]) {
            result.LIBERTADORES = libertadores.data[0];
        }

        return result;
    }

    function statusLabel(competition, statuses) {
        if (competition.type === "soon") {
            return "EM IMPLANTAÇÃO";
        }

        const row = statuses[competition.key];

        if (row?.season_label) {
            return row.season_label;
        }

        return competition.source;
    }

    function render(statuses = {}) {
        const grid = $("#competition-grid");
        if (!grid) return;

        grid.innerHTML = competitions.map(competition => {
            const isSoon = competition.type === "soon";
            const label = statusLabel(competition, statuses);
            const action = isSoon
                ? `<button type="button" disabled>EM BREVE</button>`
                : `<a href="${escapeHtml(competition.href)}">ABRIR PAINEL</a>`;

            return `
                <article class="ccfv-competition-card ${isSoon ? "is-soon" : ""}">
                    <div class="ccfv-competition-card__top">
                        <span class="ccfv-competition-card__badge">${isSoon ? "EM IMPLANTAÇÃO" : "PAINEL DISPONÍVEL"}</span>
                        <span class="ccfv-competition-card__code">${escapeHtml(competition.code)}</span>
                    </div>

                    <h3>${escapeHtml(competition.name)}</h3>
                    <p>${escapeHtml(competition.description)}</p>

                    <div class="ccfv-competition-card__meta">
                        <span>STATUS</span>
                        <strong>${escapeHtml(label)}</strong>
                    </div>

                    <div class="ccfv-competition-card__actions">
                        ${action}
                    </div>
                </article>
            `;
        }).join("");
    }

    async function load() {
        const user = $("#competition-admin-user");

        try {
            const client = await getClient();
            user.textContent = client?.auth ? "Sessão autenticada" : "Admin";

            const statuses = await readStatuses();
            render(statuses);
        } catch (error) {
            console.error("CCFV // CENTRAL DE COMPETIÇÕES:", error);
            if (user) user.textContent = "Sessão administrativa";
            render();
        }
    }

    $("#competition-refresh")?.addEventListener("click", load);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", load, { once: true });
    } else {
        load();
    }
})();
