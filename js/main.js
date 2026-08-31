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

    const SUPABASE_URL = "https://hfiwndvshzorikfzkiiw.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_VykAaaP_0PfIW_n4HYHbTA_VlvrkjMu";

    async function loadSeasonSettings() {
        if (window.CCFV_PUBLIC_SETTINGS?.season_name) {
            CCFV.season = window.CCFV_PUBLIC_SETTINGS.season_name;
            return window.CCFV_PUBLIC_SETTINGS;
        }

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/ccfv_settings?id=eq.1&select=season_number,season_name,season_status,current_round,total_rounds,start_date,end_date,is_active`,
                {
                    headers: {
                        apikey: SUPABASE_ANON_KEY,
                        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    cache: "no-store"
                }
            );

            if (!response.ok) return null;
            const rows = await response.json();
            const settings = rows?.[0] || null;
            if (!settings) return null;

            window.CCFV_PUBLIC_SETTINGS = settings;
            CCFV.season = settings.season_name || CCFV.season;
            return settings;
        } catch (error) {
            console.warn("CCFV // season settings unavailable", error);
            return null;
        }
    }

    /* =====================================================
       DOCUMENT READY
       ===================================================== */

    const init = async () => {

        await loadSeasonSettings();

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