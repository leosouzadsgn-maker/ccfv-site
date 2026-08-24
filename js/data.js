/* =========================================================
   CCFV — DATA ENGINE
   PARTE 02 — CCFV EM NÚMEROS
   ========================================================= */

(() => {
    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const CONFIG = {
        duration: 1800,
        startDelay: 180,
        threshold: 0.35
    };


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const section =
        document.querySelector(".ccfv-data");

    if (!section) {
        return;
    }


    const counters =
        section.querySelectorAll(
            "[data-counter]"
        );

    if (!counters.length) {
        return;
    }


    /* =====================================================
       ESTADO
       ===================================================== */

    let started = false;


    /* =====================================================
       FORMATADOR
       ===================================================== */

    const formatNumber = (value) => {

        return new Intl.NumberFormat(
            "pt-BR"
        ).format(value);

    };


    /* =====================================================
       EASING
       ===================================================== */

    const easeOut = (progress) => {

        return 1 -
            Math.pow(
                1 - progress,
                4
            );
    };


    /* =====================================================
       ANIMAÇÃO DO CONTADOR
       ===================================================== */

    const animateCounter = (
        element,
        index
    ) => {

        const target =
            Number(
                element.dataset.counter
            );


        if (
            Number.isNaN(target)
        ) {
            return;
        }


        const duration =
            Number(
                element.dataset.duration
            ) ||
            CONFIG.duration;


        const delay =
            Number(
                element.dataset.delay
            ) ||
            (
                CONFIG.startDelay *
                index
            );


        setTimeout(() => {

            const startTime =
                performance.now();


            const update = (
                currentTime
            ) => {

                const elapsed =
                    currentTime -
                    startTime;


                const progress =
                    Math.min(
                        elapsed /
                        duration,
                        1
                    );


                const eased =
                    easeOut(
                        progress
                    );


                const currentValue =
                    Math.floor(
                        target *
                        eased
                    );


                element.textContent =
                    formatNumber(
                        currentValue
                    );


                if (
                    progress < 1
                ) {

                    requestAnimationFrame(
                        update
                    );

                } else {

                    element.textContent =
                        formatNumber(
                            target
                        );

                }

            };


            requestAnimationFrame(
                update
            );

        }, delay);
    };


    /* =====================================================
       INICIAR CONTADORES
       ===================================================== */

    const startCounters = () => {

        if (started) {
            return;
        }

        started = true;


        counters.forEach(
            (counter, index) => {

                animateCounter(
                    counter,
                    index
                );

            }
        );
    };


    /* =====================================================
       OBSERVER
       ===================================================== */

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(
                    (entry) => {

                        if (
                            entry.isIntersecting
                        ) {

                            startCounters();

                            observer.disconnect();

                        }

                    }
                );

            },
            {
                threshold:
                    CONFIG.threshold
            }
        );


    observer.observe(
        section
    );


    /* =====================================================
       FALLBACK
       ===================================================== */

    /*
     * Caso o navegador não consiga observar
     * a seção corretamente, garantimos que
     * os números apareçam.
     */

    window.addEventListener(
        "load",
        () => {

            const rect =
                section.getBoundingClientRect();


            if (
                rect.top <
                window.innerHeight
            ) {

                startCounters();

            }

        },
        {
            once: true
        }
    );

})();