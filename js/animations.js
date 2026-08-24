/* =========================================================
   CCFV — GLOBAL ANIMATION ENGINE
   Confederação Coliseu de Futebol Virtual
   ========================================================= */

(() => {
    "use strict";


    /* =====================================================
       REDUCED MOTION
       ===================================================== */

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    /*
     * Se o visitante preferir reduzir animações,
     * não executamos o sistema de entrada.
     */
    if (prefersReducedMotion) {
        return;
    }


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const CONFIG = {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px"
    };


    /* =====================================================
       ELEMENTOS ANIMÁVEIS
       ===================================================== */

    const animatedElements =
        document.querySelectorAll(
            "[data-reveal]"
        );


    /*
     * Caso ainda não existam elementos com
     * data-reveal, não há nada para observar.
     */
    if (!animatedElements.length) {
        return;
    }


    /* =====================================================
       INTERSECTION OBSERVER
       ===================================================== */

    const observer =
        new IntersectionObserver(
            (entries, observerInstance) => {

                entries.forEach((entry) => {

                    if (!entry.isIntersecting) {
                        return;
                    }


                    const element =
                        entry.target;


                    /*
                     * Pequeno atraso opcional.
                     *
                     * Exemplo:
                     *
                     * data-reveal-delay="200"
                     */
                    const delay =
                        Number(
                            element.dataset.revealDelay || 0
                        );


                    if (delay > 0) {

                        element.style.setProperty(
                            "--reveal-delay",
                            `${delay}ms`
                        );

                    }


                    element.classList.add(
                        "is-visible"
                    );


                    /*
                     * Depois que o elemento apareceu,
                     * paramos de observá-lo.
                     */
                    observerInstance.unobserve(
                        element
                    );
                });

            },
            {
                threshold:
                    CONFIG.threshold,

                rootMargin:
                    CONFIG.rootMargin
            }
        );


    /* =====================================================
       REGISTRA OS ELEMENTOS
       ===================================================== */

    animatedElements.forEach((element) => {

        observer.observe(element);

    });


    /* =====================================================
       STAGGER
       ===================================================== */

    /*
     * Elementos dentro de um grupo podem usar:
     *
     * data-reveal-group
     *
     * para receber pequenos atrasos.
     */

    const revealGroups =
        document.querySelectorAll(
            "[data-reveal-group]"
        );


    revealGroups.forEach((group) => {

        const children =
            group.querySelectorAll(
                "[data-reveal]"
            );


        children.forEach(
            (child, index) => {

                const delay =
                    Number(
                        child.dataset.revealDelay
                        || index * 90
                    );


                child.dataset.revealDelay =
                    String(delay);

            }
        );

    });


    /* =====================================================
       CLEANUP
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            observer.disconnect();

        },
        {
            once: true
        }
    );

})();