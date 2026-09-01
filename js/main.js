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
       DOCUMENT READY
       ===================================================== */

    const init = () => {

        document.documentElement.classList.add(
            "ccfv-ready"
        );


        /*
         * Marca que o JavaScript principal
         * foi carregado corretamente.
         */
        document.body.classList.add(
            "ccfv-app-ready"
        );


        /*
         * Atualiza informações básicas da página
         * caso existam elementos correspondentes.
         */
        const seasonElements =
            document.querySelectorAll(
                "[data-ccfv-season]"
            );


        seasonElements.forEach((element) => {

            element.textContent =
                CCFV.season;

        });


        const platformElements =
            document.querySelectorAll(
                "[data-ccfv-platform]"
            );


        platformElements.forEach((element) => {

            element.textContent =
                CCFV.platform;

        });


        /*
         * Marca a aplicação como inicializada.
         */
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