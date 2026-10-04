(() => {
    "use strict";

    const CCFV = {
        name: "CCFV",
        season: "Season 01",
        platform: "PC + Console"
    };

    const links = [
        ["INÍCIO", "/index.html", "home"],
        ["COMPETIÇÕES", "/index.html#competicoes", "competicoes"],
        ["BRASILEIRÃO", "/pages/brasileirao.html", "brasileirao"],
        ["CHAMPIONS LEAGUE", "/pages/champions.html", "champions"],
        ["LIBERTADORES", "/pages/libertadores.html", "libertadores"],
        ["NIGHT CUP", "/pages/night.html", "night"],
        ["MOBILE", "/pages/mobile.html", "mobile"],
        ["COPA DO MUNDO", "/pages/copa-do-mundo.html", "copa-do-mundo"],
        ["RANKING", "/pages/ranking.html", "ranking"],
        ["HISTÓRIA", "/pages/historia.html", "historia"]
    ];

    function currentPage() {
        const path = window.location.pathname.toLowerCase();

        if (path === "/" || path.endsWith("/index.html")) return "home";
        if (path.includes("brasileirao")) return "brasileirao";
        if (path.includes("champions")) return "champions";
        if (path.includes("libertadores")) return "libertadores";
        if (path.includes("night")) return "night";
        if (path.includes("copa-do-mundo")) return "copa-do-mundo";
        if (path.includes("mobile")) return "mobile";
        if (path.includes("ranking")) return "ranking";
        if (path.includes("historia")) return "historia";
        if (path.includes("competicoes")) return "competicoes";

        return "home";
    }

    function loadSideMenuCSS() {
        const href = "/css/header-side-menu.css";

        if (document.querySelector(`link[href="${href}"]`)) return;

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }

    function initSideMenu() {
        loadSideMenuCSS();

        if (document.querySelector(".ccfv-side-menu")) return;

        const header = document.querySelector("#site-header");
        const button = document.querySelector(".ccfv-header__menu");
        const page = currentPage();

        const menu = document.createElement("aside");
        menu.className = "ccfv-side-menu";
        menu.setAttribute("aria-label", "Menu principal CCFV");

        const universe = links.slice(0, 2);
        const competitions = links.slice(2, 8);
        const system = links.slice(8);

        const renderLinks = items => items.map(([label, href, key]) => `
            <a href="${href}" class="${page === key ? "is-active" : ""}">
                <span class="ccfv-side-menu__dot"></span>
                <span>${label}</span>
            </a>
        `).join("");

        menu.innerHTML = `
            <div class="ccfv-side-menu__brand">
                <img src="/assets/images/logo/ccfv-logo.png" alt="CCFV">
                <div>
                    <strong>CCFV</strong>
                    <span>CONFEDERAÇÃO COLISEU</span>
                </div>
            </div>

            <div class="ccfv-side-menu__label">UNIVERSO</div>
            <nav class="ccfv-side-menu__nav">
                ${renderLinks(universe)}
            </nav>

            <div class="ccfv-side-menu__label">COMPETIÇÕES</div>
            <nav class="ccfv-side-menu__nav">
                ${renderLinks(competitions)}
            </nav>

            <div class="ccfv-side-menu__label">SISTEMA</div>
            <nav class="ccfv-side-menu__nav">
                ${renderLinks(system)}
                <a href="/admin/competicoes.html">
                    <span class="ccfv-side-menu__dot ccfv-side-menu__dot--gold"></span>
                    <span>ÁREA ADMINISTRATIVA</span>
                </a>
            </nav>

            <div class="ccfv-side-menu__footer">
                <small>SEASON 01 • PC + CONSOLE • MOBILE</small>
                <span>CCFV // SISTEMA ONLINE</span>
            </div>
        `;

        document.body.appendChild(menu);

        const overlay = document.createElement("div");
        overlay.className = "ccfv-side-menu__overlay";
        document.body.appendChild(overlay);

        const close = () => {
            menu.classList.remove("is-open");
            overlay.classList.remove("is-open");
            document.body.classList.remove("ccfv-side-open");
            button?.setAttribute("aria-expanded", "false");
        };

        const open = () => {
            menu.classList.add("is-open");
            overlay.classList.add("is-open");
            document.body.classList.add("ccfv-side-open");
            button?.setAttribute("aria-expanded", "true");
        };

        button?.addEventListener("click", event => {
            event.preventDefault();
            menu.classList.contains("is-open") ? close() : open();
        });

        overlay.addEventListener("click", close);
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") close();
        });

        menu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", close);
        });

        if (header) {
            header.setAttribute("data-ccfv-sidebar-ready", "true");
        }
    }

    function init() {
        document.documentElement.classList.add("ccfv-ready");
        document.body.classList.add("ccfv-app-ready");

        initSideMenu();

        document.querySelectorAll("[data-ccfv-season]").forEach(element => {
            element.textContent = CCFV.season;
        });

        document.querySelectorAll("[data-ccfv-platform]").forEach(element => {
            element.textContent = CCFV.platform;
        });

        document.dispatchEvent(new CustomEvent("ccfv:ready", {
            detail: CCFV
        }));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
