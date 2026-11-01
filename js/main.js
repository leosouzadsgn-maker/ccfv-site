
(() => {

    "use strict";

    const CCFV = {
        name: "CCFV",
        season: "Season 01",
        platform: "PC + Console"
    };

    // =====================================================
    // NAVEGAÇÃO PRINCIPAL
    // =====================================================

    const links = [
        ["INÍCIO", "/index.html", "home"],
        ["COMPETIÇÕES", "/index.html#competicoes", "competicoes"],
        ["LIGA CCFV", "/liga/index.html", "liga"],
        ["BRASILEIRÃO", "/pages/brasileirao.html", "brasileirao"],
        ["CHAMPIONS LEAGUE", "/pages/champions.html", "champions"],
        ["LIBERTADORES", "/pages/libertadores.html", "libertadores"],
        ["NIGHT CUP", "/pages/night.html", "night"],
        ["NIGHT CUP CO-OP", "/pages/night-cup-coop.html", "night-coop"],
        ["COPA DO MUNDO", "/pages/copa-do-mundo.html", "copa-do-mundo"],
        ["RANKING", "/pages/ranking.html", "ranking"],
        ["HISTÓRIA", "/pages/historia.html", "historia"]
    ];


    // =====================================================
    // IDENTIFICA A PÁGINA ATUAL
    // =====================================================

    function currentPage() {

        const p = window.location.pathname;

        if (p === "/liga" || p.startsWith("/liga/")) {
            return "liga";
        }

        if (p.includes("brasileirao")) return "brasileirao";
        if (p.includes("champions")) return "champions";
        if (p.includes("libertadores")) return "libertadores";
        if (p.includes("night-cup-coop")) return "night-coop";
        if (p.includes("night")) return "night";
        if (p.includes("copa-do-mundo")) return "copa-do-mundo";

        // Diretório de jogadores pertence ao Ranking
        if (p.includes("jogadores")) return "ranking";

        if (p.includes("ranking")) return "ranking";
        if (p.includes("historia")) return "historia";
        if (p.includes("competicoes")) return "competicoes";

        return "home";
    }


    // =====================================================
    // CARREGA CSS DO MENU LATERAL
    // =====================================================

    function loadSideMenuCSS() {

        const existing = document.querySelector(
            'link[rel="stylesheet"][href*="header-side-menu.css"]'
        );

        if (existing) return;

        const link = document.createElement("link");

        link.rel = "stylesheet";
        link.href = "/css/header-side-menu.css";

        document.head.appendChild(link);
    }


    // =====================================================
    // MENU LATERAL
    // =====================================================

    function initSideMenu() {

        loadSideMenuCSS();

        const header = document.querySelector("#site-header");
        const button = document.querySelector(".ccfv-header__menu");

        if (
            !header ||
            !button ||
            document.querySelector(".ccfv-side-menu")
        ) {
            return;
        }

        const menu = document.createElement("aside");

        menu.className = "ccfv-side-menu";

        const page = currentPage();

        menu.innerHTML = `

            <!-- MARCA -->

            <div class="ccfv-side-menu__brand">

                <img
                    src="/assets/images/logo/ccfv-logo.png"
                    alt="CCFV"
                >

                <div>
                    <strong>CCFV</strong>
                    <span>CONFEDERAÇÃO COLISEU</span>
                </div>

            </div>


            <!-- NAVEGAÇÃO -->

            <div class="ccfv-side-menu__label">
                UNIVERSO CCFV
            </div>

            <nav
                class="ccfv-side-menu__nav"
                aria-label="Menu principal"
            >

                ${links.map(
                    ([label, href, key]) => `
                        <a
                            href="${href}"
                            class="${page === key ? "is-active" : ""}"
                        >
                            <span></span>
                            ${label}
                        </a>
                    `
                ).join("")}

            </nav>


            <!-- RODAPÉ DO MENU -->

            <div class="ccfv-side-menu__footer">

                <small>
                    SEASON 01 • PC + CONSOLE
                </small>


                <!-- ACESSO DIRETO AO LOGIN DA LIGA -->

                <a
                    class="ccfv-side-menu__liga"
                    href="/liga/login.html"
                >
                    PAINEL DA LIGA →
                </a>


                <!-- ACESSO ADMINISTRATIVO -->

                <a href="/admin/">
                    ÁREA ADMINISTRATIVA →
                </a>

            </div>

        `;

        document.body.appendChild(menu);


        // =================================================
        // OVERLAY
        // =================================================

        const overlay = document.createElement("div");

        overlay.className = "ccfv-side-menu__overlay";

        document.body.appendChild(overlay);


        // =================================================
        // FECHAR MENU
        // =================================================

        const close = () => {

            menu.classList.remove("is-open");
            overlay.classList.remove("is-open");

            document.body.classList.remove("ccfv-side-open");

            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-label", "Abrir menu");

        };


        // =================================================
        // ABRIR MENU
        // =================================================

        const open = () => {

            menu.classList.add("is-open");
            overlay.classList.add("is-open");

            document.body.classList.add("ccfv-side-open");

            button.setAttribute("aria-expanded", "true");
            button.setAttribute("aria-label", "Fechar menu");

        };


        // =================================================
        // EVENTO DO BOTÃO
        // =================================================

        button.addEventListener("click", event => {

            event.preventDefault();
            event.stopPropagation();

            menu.classList.contains("is-open")
                ? close()
                : open();

        });


        // Fechar clicando fora
        overlay.addEventListener("click", close);


        // Fechar com ESC
        document.addEventListener("keydown", event => {

            if (event.key === "Escape") {
                close();
            }

        });


        // Fechar depois de acessar uma página
        menu.querySelectorAll("a").forEach(link => {

            link.addEventListener("click", close);

        });

    }


    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    function init() {

        document.documentElement.classList.add("ccfv-ready");
        document.body.classList.add("ccfv-app-ready");

        initSideMenu();


        // Temporada
        document
            .querySelectorAll("[data-ccfv-season]")
            .forEach(element => {

                element.textContent = CCFV.season;

            });


        // Plataforma
        document
            .querySelectorAll("[data-ccfv-platform]")
            .forEach(element => {

                element.textContent = CCFV.platform;

            });


        // Evento global CCFV
        document.dispatchEvent(
            new CustomEvent(
                "ccfv:ready",
                {
                    detail: CCFV
                }
            )
        );

    }


    // =====================================================
    // DOM READY
    // =====================================================

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();

    }

})();
