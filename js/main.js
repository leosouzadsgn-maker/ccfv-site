/* =========================================================
   CCFV — MAIN
   Confederação Coliseu de Futebol Virtual
   ========================================================= */

(() => {
    "use strict";


    /* =====================================================
       CONFIGURAÇÃO GLOBAL
       ===================================================== */

    const CCFV = {
        name: "CCFV",
        season: "Season 01",
        platform: "PC + Console"
    };


    /* =====================================================
       MENU MOBILE
       ===================================================== */

    const initMobileMenu = () => {

        const header =
            document.querySelector("#site-header");

        const button =
            document.querySelector(".ccfv-header__menu");

        const nav =
            document.querySelector(".ccfv-header__nav");


        if (!header || !button || !nav) {
            return;
        }


        /* Evita registrar o evento duas vezes */
        if (button.dataset.menuBound === "true") {
            return;
        }


        button.dataset.menuBound = "true";


        const closeMenu = () => {

            button.setAttribute(
                "aria-expanded",
                "false"
            );

            button.setAttribute(
                "aria-label",
                "Abrir menu"
            );

            nav.classList.remove(
                "is-mobile-open"
            );

            header.classList.remove(
                "is-menu-open"
            );

            document.body.classList.remove(
                "ccfv-mobile-menu-open"
            );
        };


        const openMenu = () => {

            button.setAttribute(
                "aria-expanded",
                "true"
            );

            button.setAttribute(
                "aria-label",
                "Fechar menu"
            );

            nav.classList.add(
                "is-mobile-open"
            );

            header.classList.add(
                "is-menu-open"
            );

            document.body.classList.add(
                "ccfv-mobile-menu-open"
            );
        };


        button.addEventListener(
            "click",
            (event) => {

                event.preventDefault();
                event.stopPropagation();


                const isOpen =
                    button.getAttribute(
                        "aria-expanded"
                    ) === "true";


                if (isOpen) {
                    closeMenu();
                } else {
                    openMenu();
                }

            }
        );


        /* Fecha ao clicar em qualquer link */
        nav.querySelectorAll("a").forEach(
            (link) => {

                link.addEventListener(
                    "click",
                    () => {
                        closeMenu();
                    }
                );

            }
        );


        /* Fecha ao tocar fora do menu */
        document.addEventListener(
            "click",
            (event) => {

                const isOpen =
                    button.getAttribute(
                        "aria-expanded"
                    ) === "true";


                if (!isOpen) {
                    return;
                }


                const clickedInsideHeader =
                    header.contains(
                        event.target
                    );


                if (!clickedInsideHeader) {
                    closeMenu();
                }

            }
        );


        /* Fecha com ESC */
        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Escape"
                ) {
                    closeMenu();
                }

            }
        );


        /* Se voltar para desktop, fecha */
        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 900
                ) {
                    closeMenu();
                }

            }
        );

    };


    /* =====================================================
       DOCUMENT READY
       ===================================================== */

    const init = () => {

        document.documentElement.classList.add(
            "ccfv-ready"
        );


        document.body.classList.add(
            "ccfv-app-ready"
        );


        /* =================================================
           MENU
           ================================================= */

        initMobileMenu();


        /* =================================================
           TEMPORADA
           ================================================= */

        const seasonElements =
            document.querySelectorAll(
                "[data-ccfv-season]"
            );


        seasonElements.forEach(
            (element) => {

                element.textContent =
                    CCFV.season;

            }
        );


        /* =================================================
           PLATAFORMA
           ================================================= */

        const platformElements =
            document.querySelectorAll(
                "[data-ccfv-platform]"
            );


        platformElements.forEach(
            (element) => {

                element.textContent =
                    CCFV.platform;

            }
        );


        /* =================================================
           READY
           ================================================= */

        document.dispatchEvent(
            new CustomEvent(
                "ccfv:ready",
                {
                    detail: CCFV
                }
            )
        );

    };


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();

    }

})();